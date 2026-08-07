import { getChatGPTUser } from "../../chatgpt-auth";
import { maintenanceResponse } from "../../maintenance";
import { getStoredVideoGenerationConfig } from "../../../db/video-generation-config";
import { isTrustedVideoProviderUrl, videoGenerationProviderById } from "../../video-generation-providers";
import { apiReply, enforceRateLimit, isSafePublicHttps, readJsonBody, rejectCrossSiteMutation, RequestValidationError } from "../../api-security";

export const dynamic="force-dynamic";
type Workflow="text-to-video"|"image-to-video"|"first-last-frame";
type GenerateBody={prompt?:string;negativePrompt?:string;workflow?:Workflow;aspect?:string;duration?:number;startFrame?:string;endFrame?:string};
type TaskRef={provider:string;mode:string;id:string};
const reply=apiReply;

function dataImage(value=""){const match=value.match(/^data:(image\/(?:jpeg|png|webp));base64,([a-zA-Z0-9+/=\r\n]+)$/s);return match?{mediaType:match[1],data:match[2]}:null}
function encodeTask(value:TaskRef){return btoa(JSON.stringify(value)).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/g,"")}
function decodeTask(value:string){try{const normalized=value.replace(/-/g,"+").replace(/_/g,"/");const parsed=JSON.parse(atob(normalized+"=".repeat((4-normalized.length%4)%4)));return parsed&&typeof parsed.provider==="string"&&typeof parsed.mode==="string"&&typeof parsed.id==="string"?parsed as TaskRef:null}catch{return null}}
function providerMessage(payload:any,fallback:string){const value=payload?.error?.message||payload?.error||payload?.message||payload?.msg;return typeof value==="string"?value:fallback}
function ratio(value="16:9"){return value.match(/(21:9|16:9|9:16|4:3|3:4|1:1)/)?.[1]||"16:9"}
function runwayRatio(value:string){return{"16:9":"1280:720","9:16":"720:1280","1:1":"960:960","4:3":"1104:832","3:4":"832:1104","21:9":"1584:672"}[ratio(value)]||"1280:720"}
function openAiSize(value:string,pro=false){const portrait=ratio(value)==="9:16";return pro?(portrait?"1024x1792":"1792x1024"):(portrait?"720x1280":"1280x720")}
function openAiSeconds(value:number){return String([4,8,12].reduce((best,item)=>Math.abs(item-value)<Math.abs(best-value)?item:best,4))}
function klingSeconds(value:number){return String(value>=8?10:5)}

async function klingJwt(accessKey:string,secretKey:string){
  const header={alg:"HS256",typ:"JWT"};const now=Math.floor(Date.now()/1000);const payload={iss:accessKey,exp:now+1800,nbf:now-5};
  const base64Url=(value:string)=>btoa(value).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/g,"");
  const encoded=`${base64Url(JSON.stringify(header))}.${base64Url(JSON.stringify(payload))}`;
  const key=await crypto.subtle.importKey("raw",new TextEncoder().encode(secretKey),{name:"HMAC",hash:"SHA-256"},false,["sign"]);
  const signature=new Uint8Array(await crypto.subtle.sign("HMAC",key,new TextEncoder().encode(encoded)));let binary="";for(const byte of signature)binary+=String.fromCharCode(byte);
  return`${encoded}.${base64Url(binary)}`;
}

export async function POST(request:Request){
  const user=await getChatGPTUser();const maintenance=maintenanceResponse(user);if(maintenance)return maintenance;if(!user)return reply({error:"请先登录后再生成视频。"},401);
  const crossSite=rejectCrossSiteMutation(request);if(crossSite)return crossSite;
  const limited=await enforceRateLimit(user.userId,"video-generation",12,600);if(limited)return limited;
  const config=await getStoredVideoGenerationConfig(user.userId);if(!config)return reply({error:"请先在 Profile 中配置视频生成引擎。"},400);
  let body:GenerateBody;try{body=await readJsonBody(request,24_000_000)}catch(error){return error instanceof RequestValidationError?reply({error:error.message},error.status):reply({error:"视频生成请求格式不正确。"},400)}
  const prompt=body.prompt?.trim()||"";const negativePrompt=body.negativePrompt?.trim()||"";if(!prompt||prompt.length>12000)return reply({error:"视频提示词为空或过长。"},400);
  const workflow:Workflow=body.workflow==="image-to-video"||body.workflow==="first-last-frame"?body.workflow:"text-to-video";
  const start=dataImage(body.startFrame);const end=dataImage(body.endFrame);if(workflow!=="text-to-video"&&!start)return reply({error:"图生视频需要首帧图片。"},400);if(workflow==="first-last-frame"&&!end)return reply({error:"首尾帧模式需要两张图片。"},400);
  if((body.startFrame?.length||0)+(body.endFrame?.length||0)>20_000_000)return reply({error:"首尾帧图片总体积过大。"},413);
  const provider=videoGenerationProviderById(config.providerId);if(!isTrustedVideoProviderUrl(config.apiBaseUrl,provider))return reply({error:"视频生成接口配置不安全。"},400);
  const baseUrl=config.apiBaseUrl.replace(/\/+$/,"");const duration=Math.max(2,Math.min(15,Math.round(Number(body.duration)||5)));
  try{
    if(provider.protocol==="runway-video"){
      const endpoint=workflow==="text-to-video"?"text_to_video":"image_to_video";const payload:Record<string,unknown>={model:config.model,promptText:prompt.slice(0,1000),ratio:runwayRatio(body.aspect||""),duration};
      if(start)payload.promptImage=workflow==="first-last-frame"&&end?[{uri:body.startFrame,position:"first"},{uri:body.endFrame,position:"last"}]:body.startFrame;
      if(negativePrompt&&(config.model.startsWith("veo3")||config.model.startsWith("seedance2")))payload.negativePrompt=negativePrompt.slice(0,1000);
      const response=await fetch(`${baseUrl}/${endpoint}`,{method:"POST",headers:{Authorization:`Bearer ${config.apiKey}`,"X-Runway-Version":"2024-11-06","Content-Type":"application/json"},signal:AbortSignal.timeout(30000),body:JSON.stringify(payload)});
      const data=await response.json().catch(()=>({}));if(!response.ok)return reply({error:providerMessage(data,"视频任务创建失败。")},502);if(!data?.id)return reply({error:"视频服务没有返回任务编号。"},502);
      return reply({status:"pending",taskToken:encodeTask({provider:provider.id,mode:end?"first-last":"generate",id:String(data.id)}),model:config.model,provider:provider.name});
    }
    if(provider.protocol==="openai-video"){
      const form=new FormData();form.append("model",config.model);form.append("prompt",prompt);form.append("seconds",openAiSeconds(duration));form.append("size",openAiSize(body.aspect||"",config.model.includes("pro")));
      if(start){const bytes=Uint8Array.from(atob(start.data),char=>char.charCodeAt(0));form.append("input_reference",new Blob([bytes],{type:start.mediaType}),`reference.${start.mediaType.includes("png")?"png":"jpg"}`)}
      const response=await fetch(`${baseUrl}/videos`,{method:"POST",headers:{Authorization:`Bearer ${config.apiKey}`},signal:AbortSignal.timeout(30000),body:form});const data=await response.json().catch(()=>({}));if(!response.ok)return reply({error:providerMessage(data,"Sora 视频任务创建失败。")},502);if(!data?.id)return reply({error:"Sora 没有返回任务编号。"},502);
      return reply({status:data.status==="completed"?"succeeded":"pending",taskToken:encodeTask({provider:provider.id,mode:"generate",id:String(data.id)}),videoUrl:data.status==="completed"?`/api/generate-video?download=${encodeURIComponent(String(data.id))}`:undefined,model:config.model,provider:provider.name});
    }
    if(provider.protocol==="gemini-veo"){
      const instance:Record<string,unknown>={prompt};if(start)instance.image={bytesBase64:start.data,mimeType:start.mediaType};
      const parameters:Record<string,unknown>={aspectRatio:ratio(body.aspect||"")==="9:16"?"9:16":"16:9",durationSeconds:duration>=8?8:4};if(negativePrompt)parameters.negativePrompt=negativePrompt;
      const response=await fetch(`${baseUrl}/models/${encodeURIComponent(config.model)}:predictLongRunning`,{method:"POST",headers:{"x-goog-api-key":config.apiKey,"Content-Type":"application/json"},signal:AbortSignal.timeout(30000),body:JSON.stringify({instances:[instance],parameters})});const data=await response.json().catch(()=>({}));if(!response.ok)return reply({error:providerMessage(data,"Veo 视频任务创建失败。")},502);if(!data?.name)return reply({error:"Veo 没有返回任务编号。"},502);
      return reply({status:"pending",taskToken:encodeTask({provider:provider.id,mode:"generate",id:String(data.name)}),model:config.model,provider:provider.name});
    }
    if(!config.apiSecret)return reply({error:"可灵 Secret Key 尚未配置。"},400);
    const token=await klingJwt(config.apiKey,config.apiSecret);const endpoint=workflow==="text-to-video"?"text2video":"image2video";const payload:Record<string,unknown>={model_name:config.model,prompt,negative_prompt:negativePrompt,duration:klingSeconds(duration),aspect_ratio:ratio(body.aspect||""),mode:"pro"};if(start)payload.image=body.startFrame;if(end)payload.image_tail=body.endFrame;
    const response=await fetch(`${baseUrl}/v1/videos/${endpoint}`,{method:"POST",headers:{Authorization:`Bearer ${token}`,"Content-Type":"application/json"},signal:AbortSignal.timeout(30000),body:JSON.stringify(payload)});const data=await response.json().catch(()=>({}));if(!response.ok||data?.code&&data.code!==0)return reply({error:providerMessage(data,"可灵视频任务创建失败。")},502);const taskId=data?.data?.task_id||data?.task_id;if(!taskId)return reply({error:"可灵没有返回任务编号。"},502);
    return reply({status:"pending",taskToken:encodeTask({provider:provider.id,mode:endpoint,id:String(taskId)}),model:config.model,provider:provider.name});
  }catch(error){return reply({error:error instanceof Error&&error.name==="TimeoutError"?"视频服务响应超时，任务可能仍在排队。":"视频生成服务暂时无法连接。"},502)}
}

export async function GET(request:Request){
  const user=await getChatGPTUser();const maintenance=maintenanceResponse(user);if(maintenance)return maintenance;if(!user)return reply({error:"请先登录。"},401);
  const limited=await enforceRateLimit(user.userId,"video-generation-poll",360,600);if(limited)return limited;
  const config=await getStoredVideoGenerationConfig(user.userId);if(!config)return reply({error:"视频生成引擎尚未配置。"},400);
  const provider=videoGenerationProviderById(config.providerId);if(!isTrustedVideoProviderUrl(config.apiBaseUrl,provider))return reply({error:"视频生成接口配置不安全。"},400);const baseUrl=config.apiBaseUrl.replace(/\/+$/,"");const url=new URL(request.url);
  const download=url.searchParams.get("download");if(download&&provider.protocol==="openai-video"&&/^[a-zA-Z0-9_-]{8,120}$/.test(download))try{const response=await fetch(`${baseUrl}/videos/${encodeURIComponent(download)}/content`,{headers:{Authorization:`Bearer ${config.apiKey}`},signal:AbortSignal.timeout(120000)});if(!response.ok)return reply({error:"无法下载 Sora 视频。"},502);return new Response(response.body,{status:200,headers:{"Content-Type":response.headers.get("content-type")||"video/mp4","Cache-Control":"private, no-store","Content-Disposition":`inline; filename=\"FRAME-${download}.mp4\"`}})}catch{return reply({error:"视频下载失败。"},502)}
  const task=decodeTask(url.searchParams.get("taskToken")||"");if(!task||task.provider!==provider.id||task.id.length>500)return reply({error:"视频任务编号无效。"},400);
  try{
    if(provider.protocol==="runway-video"){
      const response=await fetch(`${baseUrl}/tasks/${encodeURIComponent(task.id)}`,{headers:{Authorization:`Bearer ${config.apiKey}`,"X-Runway-Version":"2024-11-06"},signal:AbortSignal.timeout(30000)});const data=await response.json().catch(()=>({}));if(!response.ok)return reply({error:providerMessage(data,"无法读取视频任务。")},502);if(data.status==="FAILED"||data.status==="CANCELED")return reply({status:"failed",error:data.failure||data.failureCode||"视频生成失败。"});if(data.status!=="SUCCEEDED")return reply({status:"pending",progress:data.progress||null});const output=Array.isArray(data.output)?data.output[0]:data.output;if(typeof output!=="string"||!isSafePublicHttps(output))return reply({status:"failed",error:"任务完成但没有返回安全的视频文件。"});return reply({status:"succeeded",videoUrl:output,model:config.model,provider:provider.name});
    }
    if(provider.protocol==="openai-video"){
      const response=await fetch(`${baseUrl}/videos/${encodeURIComponent(task.id)}`,{headers:{Authorization:`Bearer ${config.apiKey}`},signal:AbortSignal.timeout(30000)});const data=await response.json().catch(()=>({}));if(!response.ok)return reply({error:providerMessage(data,"无法读取 Sora 任务。")},502);if(data.status==="failed")return reply({status:"failed",error:data.error?.message||"Sora 视频生成失败。"});if(data.status!=="completed")return reply({status:"pending",progress:data.progress||null});return reply({status:"succeeded",videoUrl:`/api/generate-video?download=${encodeURIComponent(task.id)}`,model:config.model,provider:provider.name});
    }
    if(provider.protocol==="gemini-veo"){
      const operationPath=task.id.replace(/^\/+/,"");const response=await fetch(`${baseUrl}/${operationPath}`,{headers:{"x-goog-api-key":config.apiKey},signal:AbortSignal.timeout(30000)});const data=await response.json().catch(()=>({}));if(!response.ok)return reply({error:providerMessage(data,"无法读取 Veo 任务。")},502);if(!data.done)return reply({status:"pending"});if(data.error)return reply({status:"failed",error:providerMessage(data,"Veo 视频生成失败。")});const output=data?.response?.generateVideoResponse?.generatedSamples?.[0]?.video?.uri||data?.response?.generatedVideos?.[0]?.video?.uri||data?.response?.generated_videos?.[0]?.video?.uri;if(typeof output!=="string"||!isSafePublicHttps(output))return reply({status:"failed",error:"Veo 任务完成但没有返回视频文件。"});return reply({status:"succeeded",videoUrl:output,model:config.model,provider:provider.name});
    }
    if(!config.apiSecret)return reply({error:"可灵 Secret Key 尚未配置。"},400);const token=await klingJwt(config.apiKey,config.apiSecret);const response=await fetch(`${baseUrl}/v1/videos/${task.mode}/${encodeURIComponent(task.id)}`,{headers:{Authorization:`Bearer ${token}`},signal:AbortSignal.timeout(30000)});const data=await response.json().catch(()=>({}));if(!response.ok||data?.code&&data.code!==0)return reply({error:providerMessage(data,"无法读取可灵任务。")},502);const status=data?.data?.task_status||data?.status;if(status==="failed")return reply({status:"failed",error:data?.data?.task_status_msg||"可灵视频生成失败。"});if(status!=="succeed")return reply({status:"pending"});const output=data?.data?.task_result?.videos?.[0]?.url;if(typeof output!=="string"||!isSafePublicHttps(output))return reply({status:"failed",error:"可灵任务完成但没有返回视频文件。"});return reply({status:"succeeded",videoUrl:output,model:config.model,provider:provider.name});
  }catch{return reply({error:"读取视频生成进度失败，请稍后重试。"},502)}
}
