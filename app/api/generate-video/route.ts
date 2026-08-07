import { getChatGPTUser } from "../../chatgpt-auth";
import { maintenanceResponse } from "../../maintenance";
import { getStoredVideoGenerationConfig } from "../../../db/video-generation-config";
import { isTrustedVideoProviderUrl, videoGenerationProviderById, videoProviderSupportsWorkflow } from "../../video-generation-providers";
import type { VideoWorkflow } from "../../video-generation-providers";
import { apiReply, enforceRateLimit, isSafePublicHttps, readJsonBody, rejectCrossSiteMutation, RequestValidationError } from "../../api-security";

export const dynamic="force-dynamic";
type GenerateBody={prompt?:string;negativePrompt?:string;workflow?:VideoWorkflow;aspect?:string;duration?:number;startFrame?:string;endFrame?:string};
type TaskRef={provider:string;mode:string;id:string};
type DataImage={mediaType:string;data:string;dataUrl:string};
const reply=apiReply;

function dataImage(value=""):DataImage|null{const match=value.match(/^data:(image\/(?:jpeg|png|webp));base64,([a-zA-Z0-9+/=\r\n]+)$/);return match?{mediaType:match[1],data:match[2].replace(/\s/g,""),dataUrl:value}:null}
function imageBlob(image:DataImage){return new Blob([Uint8Array.from(atob(image.data),char=>char.charCodeAt(0))],{type:image.mediaType})}
function imageExtension(image:DataImage){return image.mediaType.includes("png")?"png":image.mediaType.includes("webp")?"webp":"jpg"}
function encodeTask(value:TaskRef){return btoa(JSON.stringify(value)).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/g,"")}
function decodeTask(value:string){try{if(!value||value.length>12000)return null;const normalized=value.replace(/-/g,"+").replace(/_/g,"/");const parsed=JSON.parse(atob(normalized+"=".repeat((4-normalized.length%4)%4)));return parsed&&typeof parsed.provider==="string"&&typeof parsed.mode==="string"&&typeof parsed.id==="string"?parsed as TaskRef:null}catch{return null}}
function providerMessage(payload:any,fallback:string){
  const value=payload?.error?.message||payload?.error||payload?.message||payload?.msg||payload?.ErrMsg||payload?.base_resp?.status_msg||payload?.failure_reason;
  if(typeof value!=="string"||!value.trim())return fallback;
  const message=value.trim();
  if(/insufficient\s*(balance|credit|quota)|balance\s*(is\s*)?insufficient|not\s*enough\s*(balance|credit)|余额不足|欠费/i.test(message))return"视频服务商账户余额不足。请先在服务商控制台充值，或切换到其他已配置的视频模型。";
  if(/invalid\s*(api[-_ ]?key|token)|unauthori[sz]ed|authentication\s*failed|access\s*denied|forbidden|鉴权失败|密钥无效/i.test(message))return"API Key 无效，或当前账号没有访问该视频模型的权限。请重新检查 API 配置。";
  if(/rate\s*limit|too\s*many\s*requests|频率|限流/i.test(message))return"视频服务商当前请求过于频繁，请稍后再试。";
  if(/model\s*(not\s*found|invalid|unsupported)|invalid\s*model|模型不存在|不支持.*模型/i.test(message))return"当前视频模型不可用。请在 API 配置中重新选择服务商支持的模型。";
  return message;
}
function ratio(value="16:9"){return value.match(/(21:9|16:9|9:16|4:3|3:4|1:1)/)?.[1]||"16:9"}
function runwayRatio(value:string){return{"16:9":"1280:720","9:16":"720:1280","1:1":"960:960","4:3":"1104:832","3:4":"832:1104","21:9":"1584:672"}[ratio(value)]||"1280:720"}
function openAiSize(value:string,pro=false){const portrait=ratio(value)==="9:16";return pro?(portrait?"1024x1792":"1792x1024"):(portrait?"720x1280":"1280x720")}
function nearest(value:number,allowed:number[]){return allowed.reduce((best,item)=>Math.abs(item-value)<Math.abs(best-value)?item:best,allowed[0])}
function safeRemoteHttps(value:unknown){
  if(typeof value!=="string"||!value.trim())return null;
  try{
    const url=new URL(value);if(url.hash)return null;
    const addressOnly=new URL(url.toString());addressOnly.search="";
    return isSafePublicHttps(addressOnly.toString())?url.toString():null;
  }catch{return null}
}
function publicVideo(value:unknown){return safeRemoteHttps(value)}
function veoVideoUri(data:any){
  const response=data?.response||{};const generated=response?.generateVideoResponse||response?.generate_video_response||{};
  const candidates=[
    generated?.generatedSamples?.[0]?.video?.uri,
    generated?.generatedSamples?.[0]?.video?.url,
    generated?.generated_samples?.[0]?.video?.uri,
    generated?.generatedVideos?.[0]?.video?.uri,
    response?.generatedVideos?.[0]?.video?.uri,
    response?.generated_videos?.[0]?.video?.uri,
    response?.video?.uri,
  ];
  for(const candidate of candidates){const output=safeRemoteHttps(candidate);if(output)return output}
  return null;
}
function veoMissingOutputMessage(data:any){
  const response=data?.response||{};const generated=response?.generateVideoResponse||response?.generate_video_response||{};
  const reasons=[...(Array.isArray(generated?.raiMediaFilteredReasons)?generated.raiMediaFilteredReasons:[]),...(Array.isArray(generated?.rai_media_filtered_reasons)?generated.rai_media_filtered_reasons:[])].filter((item):item is string=>typeof item==="string"&&Boolean(item.trim()));
  const filtered=Number(generated?.raiMediaFilteredCount||generated?.rai_media_filtered_count||0)>0||reasons.length>0;
  return filtered?`Veo 已完成任务，但生成结果被 Google 内容安全过滤${reasons.length?`：${reasons.join("；").slice(0,500)}`:"。请调整提示词后重试。"}`:"Veo 已完成任务，但响应中没有可下载的视频文件。";
}
function taskResponse(provider:{id:string;name:string},model:string,id:unknown,mode="generate"){if(typeof id!=="string"&&typeof id!=="number")return null;return reply({status:"pending",taskToken:encodeTask({provider:provider.id,mode,id:String(id)}),model,provider:provider.name})}
function requestHeaders(apiKey:string,kind:"bearer"|"token"|"api-key"="bearer"):Record<string,string>{if(kind==="api-key")return{"API-KEY":apiKey};if(kind==="token")return{Authorization:`Token ${apiKey}`};return{Authorization:`Bearer ${apiKey}`}}

async function klingJwt(accessKey:string,secretKey:string){
  const header={alg:"HS256",typ:"JWT"};const now=Math.floor(Date.now()/1000);const payload={iss:accessKey,exp:now+1800,nbf:now-5};
  const base64Url=(value:string)=>btoa(value).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/g,"");
  const encoded=`${base64Url(JSON.stringify(header))}.${base64Url(JSON.stringify(payload))}`;
  const key=await crypto.subtle.importKey("raw",new TextEncoder().encode(secretKey),{name:"HMAC",hash:"SHA-256"},false,["sign"]);
  const signature=new Uint8Array(await crypto.subtle.sign("HMAC",key,new TextEncoder().encode(encoded)));let binary="";for(const byte of signature)binary+=String.fromCharCode(byte);
  return`${encoded}.${base64Url(binary)}`;
}

async function pixverseUpload(baseUrl:string,apiKey:string,image:DataImage){
  const form=new FormData();form.append("image",imageBlob(image),`frame.${imageExtension(image)}`);
  const response=await fetch(`${baseUrl}/image/upload`,{method:"POST",headers:{...requestHeaders(apiKey,"api-key"),"Ai-trace-id":crypto.randomUUID()},body:form,signal:AbortSignal.timeout(30000)});
  const data=await response.json().catch(()=>({}));if(!response.ok||data?.ErrCode!==0)throw new Error(providerMessage(data,"PixVerse 图片上传失败。"));const id=data?.Resp?.img_id;if(typeof id!=="number"&&typeof id!=="string")throw new Error("PixVerse 没有返回图片编号。");return id;
}

async function googleVideoDownload(uri:string,apiKey:string){
  let current=uri;for(let redirects=0;redirects<=3;redirects++){
    const safeCurrent=safeRemoteHttps(current);if(!safeCurrent)throw new Error("不安全的视频下载地址。");current=safeCurrent;const parsed=new URL(current);const googleHost=parsed.hostname==="generativelanguage.googleapis.com"||parsed.hostname.endsWith(".googleapis.com");if(redirects===0&&!googleHost)throw new Error("无效的 Veo 下载地址。");
    const response=await fetch(current,{headers:googleHost?{"x-goog-api-key":apiKey}:{},redirect:"manual",signal:AbortSignal.timeout(120000)});if(response.status>=300&&response.status<400){const location=response.headers.get("location");if(!location)throw new Error("Veo 下载重定向无效。");current=new URL(location,current).toString();continue}return response;
  }throw new Error("Veo 下载重定向过多。");
}

export async function POST(request:Request){
  const user=await getChatGPTUser();const maintenance=maintenanceResponse(user);if(maintenance)return maintenance;if(!user)return reply({error:"请先登录后再生成视频。"},401);
  const crossSite=rejectCrossSiteMutation(request);if(crossSite)return crossSite;
  const limited=await enforceRateLimit(user.userId,"video-generation",12,600);if(limited)return limited;
  const config=await getStoredVideoGenerationConfig(user.userId);if(!config)return reply({error:"请先在 Profile 中配置视频生成引擎。"},400);
  let body:GenerateBody;try{body=await readJsonBody(request,24_000_000)}catch(error){return error instanceof RequestValidationError?reply({error:error.message},error.status):reply({error:"视频生成请求格式不正确。"},400)}
  const prompt=body.prompt?.trim()||"";const negativePrompt=body.negativePrompt?.trim()||"";if(!prompt||prompt.length>12000)return reply({error:"视频提示词为空或过长。"},400);
  const workflow:VideoWorkflow=body.workflow==="image-to-video"||body.workflow==="first-last-frame"?body.workflow:"text-to-video";
  const start=dataImage(body.startFrame);const end=dataImage(body.endFrame);if(workflow!=="text-to-video"&&!start)return reply({error:"图生视频需要首帧图片。"},400);if(workflow==="first-last-frame"&&!end)return reply({error:"首尾帧模式需要两张图片。"},400);
  if((body.startFrame?.length||0)+(body.endFrame?.length||0)>20_000_000)return reply({error:"首尾帧图片总体积过大。"},413);
  const provider=videoGenerationProviderById(config.providerId);if(!isTrustedVideoProviderUrl(config.apiBaseUrl,provider))return reply({error:"视频生成接口配置不安全。"},400);
  if(!videoProviderSupportsWorkflow(provider,config.model,workflow))return reply({error:`${config.model} 不支持当前生成方式，请切换模型或模式。`},400);
  const baseUrl=config.apiBaseUrl.replace(/\/+$/,"");const duration=Math.max(2,Math.min(15,Math.round(Number(body.duration)||5)));const aspect=ratio(body.aspect||"");
  try{
    if(provider.protocol==="runway-video"){
      const endpoint=workflow==="text-to-video"?"text_to_video":"image_to_video";const payload:Record<string,unknown>={model:config.model,promptText:prompt.slice(0,1000),ratio:runwayRatio(aspect),duration:nearest(duration,[5,10])};if(start)payload.promptImage=body.startFrame;
      const response=await fetch(`${baseUrl}/${endpoint}`,{method:"POST",headers:{...requestHeaders(config.apiKey),"X-Runway-Version":"2024-11-06","Content-Type":"application/json"},signal:AbortSignal.timeout(30000),body:JSON.stringify(payload)});const data=await response.json().catch(()=>({}));if(!response.ok)return reply({error:providerMessage(data,"Runway 视频任务创建失败。")},502);return taskResponse(provider,config.model,data?.id)||reply({error:"Runway 没有返回任务编号。"},502);
    }
    if(provider.protocol==="openai-video"){
      const form=new FormData();form.append("model",config.model);form.append("prompt",prompt);form.append("seconds",String(nearest(duration,[4,8,12])));form.append("size",openAiSize(aspect,config.model.includes("pro")));if(start)form.append("input_reference",imageBlob(start),`reference.${imageExtension(start)}`);
      const response=await fetch(`${baseUrl}/videos`,{method:"POST",headers:requestHeaders(config.apiKey),signal:AbortSignal.timeout(30000),body:form});const data=await response.json().catch(()=>({}));if(!response.ok)return reply({error:providerMessage(data,"Sora 视频任务创建失败。")},502);if(!data?.id)return reply({error:"Sora 没有返回任务编号。"},502);return reply({status:data.status==="completed"?"succeeded":"pending",taskToken:encodeTask({provider:provider.id,mode:"generate",id:String(data.id)}),videoUrl:data.status==="completed"?`/api/generate-video?download=${encodeURIComponent(String(data.id))}`:undefined,model:config.model,provider:provider.name});
    }
    if(provider.protocol==="gemini-veo"){
      const instance:Record<string,unknown>={prompt};if(start)instance.image={inlineData:{mimeType:start.mediaType,data:start.data}};if(end)instance.lastFrame={inlineData:{mimeType:end.mediaType,data:end.data}};
      const parameters:Record<string,unknown>={aspectRatio:aspect==="9:16"?"9:16":"16:9",durationSeconds:nearest(duration,[4,6,8])};if(negativePrompt)parameters.negativePrompt=negativePrompt.slice(0,1000);
      const response=await fetch(`${baseUrl}/models/${encodeURIComponent(config.model)}:predictLongRunning`,{method:"POST",headers:{"x-goog-api-key":config.apiKey,"Content-Type":"application/json"},signal:AbortSignal.timeout(30000),body:JSON.stringify({instances:[instance],parameters})});const data=await response.json().catch(()=>({}));if(!response.ok)return reply({error:providerMessage(data,"Veo 视频任务创建失败。")},502);return taskResponse(provider,config.model,data?.name)||reply({error:"Veo 没有返回任务编号。"},502);
    }
    if(provider.protocol==="kling-video"){
      if(!config.apiSecret)return reply({error:"可灵 Secret Key 尚未配置。"},400);const token=await klingJwt(config.apiKey,config.apiSecret);const endpoint=workflow==="text-to-video"?"text2video":"image2video";const payload:Record<string,unknown>={model_name:config.model,prompt,negative_prompt:negativePrompt,duration:String(nearest(duration,[5,10])),aspect_ratio:aspect};if(config.model.startsWith("kling-v2"))payload.mode="pro";if(start)payload.image=body.startFrame;if(end)payload.image_tail=body.endFrame;
      const response=await fetch(`${baseUrl}/v1/videos/${endpoint}`,{method:"POST",headers:{Authorization:`Bearer ${token}`,"Content-Type":"application/json"},signal:AbortSignal.timeout(30000),body:JSON.stringify(payload)});const data=await response.json().catch(()=>({}));if(!response.ok||data?.code&&data.code!==0)return reply({error:providerMessage(data,"可灵视频任务创建失败。")},502);return taskResponse(provider,config.model,data?.data?.task_id||data?.task_id,endpoint)||reply({error:"可灵没有返回任务编号。"},502);
    }
    if(provider.protocol==="byteplus-seedance"){
      const content:Array<Record<string,unknown>>=[{type:"text",text:prompt.slice(0,8000)}];if(start)content.push({type:"image_url",image_url:{url:start.dataUrl},role:"first_frame"});if(end)content.push({type:"image_url",image_url:{url:end.dataUrl},role:"last_frame"});const payload={model:config.model,content,resolution:"720p",ratio:aspect,duration,generate_audio:true,watermark:false};
      const response=await fetch(`${baseUrl}/contents/generations/tasks`,{method:"POST",headers:{...requestHeaders(config.apiKey),"Content-Type":"application/json"},signal:AbortSignal.timeout(30000),body:JSON.stringify(payload)});const data=await response.json().catch(()=>({}));if(!response.ok)return reply({error:providerMessage(data,"Seedance 视频任务创建失败。")},502);return taskResponse(provider,config.model,data?.id)||reply({error:"Seedance 没有返回任务编号。"},502);
    }
    if(provider.protocol==="minimax-video"){
      const payload:Record<string,unknown>={model:config.model,prompt:prompt.slice(0,2000),duration:nearest(duration,[6,10]),resolution:"768P",prompt_optimizer:false};if(start)payload.first_frame_image=start.dataUrl;if(end)payload.last_frame_image=end.dataUrl;
      const response=await fetch(`${baseUrl}/video_generation`,{method:"POST",headers:{...requestHeaders(config.apiKey),"Content-Type":"application/json"},signal:AbortSignal.timeout(30000),body:JSON.stringify(payload)});const data=await response.json().catch(()=>({}));if(!response.ok||data?.base_resp?.status_code&&data.base_resp.status_code!==0)return reply({error:providerMessage(data,"Hailuo 视频任务创建失败。")},502);return taskResponse(provider,config.model,data?.task_id)||reply({error:"Hailuo 没有返回任务编号。"},502);
    }
    if(provider.protocol==="vidu-video"){
      const endpoint=workflow==="text-to-video"?"text2video":workflow==="first-last-frame"?"start-end2video":"img2video";const payload:Record<string,unknown>={model:config.model,prompt:prompt.slice(0,5000),duration:Math.max(1,Math.min(16,duration)),resolution:"720p",seed:Math.floor(Math.random()*2147483647)};if(workflow==="text-to-video")payload.aspect_ratio=aspect;else payload.images=end?[start!.dataUrl,end.dataUrl]:[start!.dataUrl];if(config.model.startsWith("viduq3"))payload.audio=true;
      const response=await fetch(`${baseUrl}/${endpoint}`,{method:"POST",headers:{...requestHeaders(config.apiKey,"token"),"Content-Type":"application/json"},signal:AbortSignal.timeout(30000),body:JSON.stringify(payload)});const data=await response.json().catch(()=>({}));if(!response.ok)return reply({error:providerMessage(data,"Vidu 视频任务创建失败。")},502);return taskResponse(provider,config.model,data?.task_id)||reply({error:"Vidu 没有返回任务编号。"},502);
    }
    if(provider.protocol==="pixverse-video"){
      let firstId:string|number|undefined,lastId:string|number|undefined;if(start)firstId=await pixverseUpload(baseUrl,config.apiKey,start);if(end)lastId=await pixverseUpload(baseUrl,config.apiKey,end);const endpoint=workflow==="text-to-video"?"video/text/generate":workflow==="first-last-frame"?"video/transition/generate":"video/img/generate";const payload:Record<string,unknown>={model:config.model,prompt:prompt.slice(0,2048),duration:nearest(duration,[5,8]),quality:"720p",seed:Math.floor(Math.random()*2147483647)};if(workflow==="text-to-video")payload.aspect_ratio=aspect;if(workflow==="image-to-video")payload.img_id=firstId;if(workflow==="first-last-frame"){payload.first_frame_img=firstId;payload.last_frame_img=lastId}
      const response=await fetch(`${baseUrl}/${endpoint}`,{method:"POST",headers:{...requestHeaders(config.apiKey,"api-key"),"Ai-trace-id":crypto.randomUUID(),"Content-Type":"application/json"},signal:AbortSignal.timeout(30000),body:JSON.stringify(payload)});const data=await response.json().catch(()=>({}));if(!response.ok||data?.ErrCode!==0)return reply({error:providerMessage(data,"PixVerse 视频任务创建失败。")},502);return taskResponse(provider,config.model,data?.Resp?.video_id)||reply({error:"PixVerse 没有返回任务编号。"},502);
    }
    if(provider.protocol==="luma-video"){
      const video:Record<string,unknown>={duration:`${nearest(duration,[5,10])}s`,resolution:"720p"};if(start)video.start_frame={data:start.data,media_type:start.mediaType};if(end)video.end_frame={data:end.data,media_type:end.mediaType};const payload={type:"video",model:config.model,prompt,aspect_ratio:aspect,video};
      const response=await fetch(`${baseUrl}/generations`,{method:"POST",headers:{...requestHeaders(config.apiKey),"Content-Type":"application/json"},signal:AbortSignal.timeout(30000),body:JSON.stringify(payload)});const data=await response.json().catch(()=>({}));if(!response.ok)return reply({error:providerMessage(data,"Luma Ray 视频任务创建失败。")},502);return taskResponse(provider,config.model,data?.id)||reply({error:"Luma Ray 没有返回任务编号。"},502);
    }
    const input:Record<string,unknown>={prompt};const parameters:Record<string,unknown>={resolution:"720P",duration,prompt_extend:false,watermark:false};if(workflow==="text-to-video")parameters.ratio=aspect;else input.media=end?[{type:"first_frame",url:start!.dataUrl},{type:"last_frame",url:end.dataUrl}]:[{type:"first_frame",url:start!.dataUrl}];
    const response=await fetch(`${baseUrl}/services/aigc/video-generation/video-synthesis`,{method:"POST",headers:{...requestHeaders(config.apiKey),"X-DashScope-Async":"enable","Content-Type":"application/json"},signal:AbortSignal.timeout(30000),body:JSON.stringify({model:config.model,input,parameters})});const data=await response.json().catch(()=>({}));if(!response.ok)return reply({error:providerMessage(data,"Wan 视频任务创建失败。")},502);return taskResponse(provider,config.model,data?.output?.task_id)||reply({error:"Wan 没有返回任务编号。"},502);
  }catch(error){return reply({error:error instanceof Error&&error.name==="TimeoutError"?"视频服务响应超时，任务可能仍在排队。":error instanceof Error?error.message:"视频生成服务暂时无法连接。"},502)}
}

export async function GET(request:Request){
  const user=await getChatGPTUser();const maintenance=maintenanceResponse(user);if(maintenance)return maintenance;if(!user)return reply({error:"请先登录。"},401);
  const limited=await enforceRateLimit(user.userId,"video-generation-poll",360,600);if(limited)return limited;
  const config=await getStoredVideoGenerationConfig(user.userId);if(!config)return reply({error:"视频生成引擎尚未配置。"},400);
  const provider=videoGenerationProviderById(config.providerId);if(!isTrustedVideoProviderUrl(config.apiBaseUrl,provider))return reply({error:"视频生成接口配置不安全。"},400);const baseUrl=config.apiBaseUrl.replace(/\/+$/,"");const url=new URL(request.url);
  const download=url.searchParams.get("download");if(download&&provider.protocol==="openai-video"&&/^[a-zA-Z0-9_-]{8,120}$/.test(download))try{const response=await fetch(`${baseUrl}/videos/${encodeURIComponent(download)}/content`,{headers:requestHeaders(config.apiKey),signal:AbortSignal.timeout(120000)});if(!response.ok)return reply({error:"无法下载 Sora 视频。"},502);return new Response(response.body,{status:200,headers:{"Content-Type":response.headers.get("content-type")||"video/mp4","Cache-Control":"private, no-store","Content-Disposition":`inline; filename=\"FRAME-${download}.mp4\"`}})}catch{return reply({error:"视频下载失败。"},502)}
  const downloadTask=decodeTask(url.searchParams.get("downloadToken")||"");if(downloadTask&&downloadTask.provider===provider.id&&downloadTask.mode==="veo-download"&&provider.protocol==="gemini-veo")try{const response=await googleVideoDownload(downloadTask.id,config.apiKey);if(!response.ok)return reply({error:"无法下载 Veo 视频。"},502);return new Response(response.body,{status:200,headers:{"Content-Type":response.headers.get("content-type")||"video/mp4","Cache-Control":"private, no-store","Content-Disposition":"inline; filename=\"FRAME-veo.mp4\""}})}catch{return reply({error:"Veo 视频下载失败。"},502)}
  const task=decodeTask(url.searchParams.get("taskToken")||"");if(!task||task.provider!==provider.id||task.id.length>5000||task.id.includes(".."))return reply({error:"视频任务编号无效。"},400);
  try{
    if(provider.protocol==="runway-video"){
      const response=await fetch(`${baseUrl}/tasks/${encodeURIComponent(task.id)}`,{headers:{...requestHeaders(config.apiKey),"X-Runway-Version":"2024-11-06"},signal:AbortSignal.timeout(30000)});const data=await response.json().catch(()=>({}));if(!response.ok)return reply({error:providerMessage(data,"无法读取 Runway 任务。")},502);if(data.status==="FAILED"||data.status==="CANCELED")return reply({status:"failed",error:data.failure||data.failureCode||"Runway 视频生成失败。"});if(data.status!=="SUCCEEDED")return reply({status:"pending",progress:data.progress||null});const output=publicVideo(Array.isArray(data.output)?data.output[0]:data.output);return output?reply({status:"succeeded",videoUrl:output,model:config.model,provider:provider.name}):reply({status:"failed",error:"Runway 任务完成但没有返回安全的视频文件。"});
    }
    if(provider.protocol==="openai-video"){
      const response=await fetch(`${baseUrl}/videos/${encodeURIComponent(task.id)}`,{headers:requestHeaders(config.apiKey),signal:AbortSignal.timeout(30000)});const data=await response.json().catch(()=>({}));if(!response.ok)return reply({error:providerMessage(data,"无法读取 Sora 任务。")},502);if(data.status==="failed")return reply({status:"failed",error:data.error?.message||"Sora 视频生成失败。"});if(data.status!=="completed")return reply({status:"pending",progress:data.progress||null});return reply({status:"succeeded",videoUrl:`/api/generate-video?download=${encodeURIComponent(task.id)}`,model:config.model,provider:provider.name});
    }
    if(provider.protocol==="gemini-veo"){
      if(!/^[a-zA-Z0-9._/-]+$/.test(task.id))return reply({error:"Veo 任务编号无效。"},400);const response=await fetch(`${baseUrl}/${task.id.replace(/^\/+/,"")}`,{headers:{"x-goog-api-key":config.apiKey},signal:AbortSignal.timeout(30000)});const data=await response.json().catch(()=>({}));if(!response.ok)return reply({error:providerMessage(data,"无法读取 Veo 任务。")},502);if(!data.done)return reply({status:"pending"});if(data.error)return reply({status:"failed",error:providerMessage(data,"Veo 视频生成失败。")});const output=veoVideoUri(data);return output?reply({status:"succeeded",videoUrl:`/api/generate-video?downloadToken=${encodeURIComponent(encodeTask({provider:provider.id,mode:"veo-download",id:output}))}`,model:config.model,provider:provider.name}):reply({status:"failed",error:veoMissingOutputMessage(data)});
    }
    if(provider.protocol==="kling-video"){
      if(!config.apiSecret)return reply({error:"可灵 Secret Key 尚未配置。"},400);const token=await klingJwt(config.apiKey,config.apiSecret);const response=await fetch(`${baseUrl}/v1/videos/${task.mode}/${encodeURIComponent(task.id)}`,{headers:{Authorization:`Bearer ${token}`},signal:AbortSignal.timeout(30000)});const data=await response.json().catch(()=>({}));if(!response.ok||data?.code&&data.code!==0)return reply({error:providerMessage(data,"无法读取可灵任务。")},502);const status=data?.data?.task_status||data?.status;if(status==="failed")return reply({status:"failed",error:data?.data?.task_status_msg||"可灵视频生成失败。"});if(status!=="succeed")return reply({status:"pending"});const output=publicVideo(data?.data?.task_result?.videos?.[0]?.url);return output?reply({status:"succeeded",videoUrl:output,model:config.model,provider:provider.name}):reply({status:"failed",error:"可灵任务完成但没有返回视频文件。"});
    }
    if(provider.protocol==="byteplus-seedance"){
      const response=await fetch(`${baseUrl}/contents/generations/tasks/${encodeURIComponent(task.id)}`,{headers:requestHeaders(config.apiKey),signal:AbortSignal.timeout(30000)});const data=await response.json().catch(()=>({}));if(!response.ok)return reply({error:providerMessage(data,"无法读取 Seedance 任务。")},502);if(data.status==="failed"||data.status==="cancelled")return reply({status:"failed",error:providerMessage(data,"Seedance 视频生成失败。")});if(data.status!=="succeeded")return reply({status:"pending"});const output=publicVideo(data?.content?.video_url);return output?reply({status:"succeeded",videoUrl:output,model:config.model,provider:provider.name}):reply({status:"failed",error:"Seedance 任务完成但没有返回视频文件。"});
    }
    if(provider.protocol==="minimax-video"){
      const response=await fetch(`${baseUrl}/query/video_generation?task_id=${encodeURIComponent(task.id)}`,{headers:requestHeaders(config.apiKey),signal:AbortSignal.timeout(30000)});const data=await response.json().catch(()=>({}));if(!response.ok)return reply({error:providerMessage(data,"无法读取 Hailuo 任务。")},502);if(data.status==="Fail")return reply({status:"failed",error:providerMessage(data,"Hailuo 视频生成失败。")});if(data.status!=="Success")return reply({status:"pending"});const fileId=data.file_id;if(!fileId)return reply({status:"failed",error:"Hailuo 任务完成但没有返回文件编号。"});const fileResponse=await fetch(`${baseUrl}/files/retrieve?file_id=${encodeURIComponent(String(fileId))}`,{headers:requestHeaders(config.apiKey),signal:AbortSignal.timeout(30000)});const fileData=await fileResponse.json().catch(()=>({}));if(!fileResponse.ok)return reply({error:providerMessage(fileData,"无法读取 Hailuo 视频文件。")},502);const output=publicVideo(fileData?.file?.download_url);return output?reply({status:"succeeded",videoUrl:output,model:config.model,provider:provider.name}):reply({status:"failed",error:"Hailuo 没有返回安全的视频地址。"});
    }
    if(provider.protocol==="vidu-video"){
      const response=await fetch(`${baseUrl}/tasks/${encodeURIComponent(task.id)}/creations`,{headers:requestHeaders(config.apiKey,"token"),signal:AbortSignal.timeout(30000)});const data=await response.json().catch(()=>({}));if(!response.ok)return reply({error:providerMessage(data,"无法读取 Vidu 任务。")},502);if(data.state==="failed")return reply({status:"failed",error:providerMessage(data,data.err_code||"Vidu 视频生成失败。")});if(data.state!=="success")return reply({status:"pending"});const output=publicVideo(data?.creations?.[0]?.url);return output?reply({status:"succeeded",videoUrl:output,model:config.model,provider:provider.name}):reply({status:"failed",error:"Vidu 任务完成但没有返回视频文件。"});
    }
    if(provider.protocol==="pixverse-video"){
      const response=await fetch(`${baseUrl}/video/result/${encodeURIComponent(task.id)}`,{headers:{...requestHeaders(config.apiKey,"api-key"),"Ai-trace-id":crypto.randomUUID()},signal:AbortSignal.timeout(30000)});const data=await response.json().catch(()=>({}));if(!response.ok||data?.ErrCode!==0)return reply({error:providerMessage(data,"无法读取 PixVerse 任务。")},502);const status=Number(data?.Resp?.status);if(status===7||status===8)return reply({status:"failed",error:providerMessage(data,status===7?"PixVerse 内容审核未通过。":"PixVerse 视频生成失败。")});if(status!==1)return reply({status:"pending"});const output=publicVideo(data?.Resp?.url);return output?reply({status:"succeeded",videoUrl:output,model:config.model,provider:provider.name}):reply({status:"failed",error:"PixVerse 任务完成但没有返回视频文件。"});
    }
    if(provider.protocol==="luma-video"){
      const response=await fetch(`${baseUrl}/generations/${encodeURIComponent(task.id)}`,{headers:requestHeaders(config.apiKey),signal:AbortSignal.timeout(30000)});const data=await response.json().catch(()=>({}));if(!response.ok)return reply({error:providerMessage(data,"无法读取 Luma Ray 任务。")},502);if(data.state==="failed")return reply({status:"failed",error:providerMessage(data,"Luma Ray 视频生成失败。")});if(data.state!=="completed")return reply({status:"pending"});const output=publicVideo(Array.isArray(data.output)?data.output.find((item:any)=>item?.type==="video")?.url||data.output[0]?.url:null);return output?reply({status:"succeeded",videoUrl:output,model:config.model,provider:provider.name}):reply({status:"failed",error:"Luma Ray 任务完成但没有返回视频文件。"});
    }
    const response=await fetch(`${baseUrl}/tasks/${encodeURIComponent(task.id)}`,{headers:requestHeaders(config.apiKey),signal:AbortSignal.timeout(30000)});const data=await response.json().catch(()=>({}));if(!response.ok)return reply({error:providerMessage(data,"无法读取 Wan 任务。")},502);const status=data?.output?.task_status;if(status==="FAILED"||status==="CANCELED")return reply({status:"failed",error:providerMessage(data,"Wan 视频生成失败。")});if(status!=="SUCCEEDED")return reply({status:"pending"});const output=publicVideo(data?.output?.video_url);return output?reply({status:"succeeded",videoUrl:output,model:config.model,provider:provider.name}):reply({status:"failed",error:"Wan 任务完成但没有返回视频文件。"});
  }catch{return reply({error:"读取视频生成进度失败，请稍后重试。"},502)}
}
