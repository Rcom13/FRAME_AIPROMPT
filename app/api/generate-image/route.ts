import { getChatGPTUser } from "../../chatgpt-auth";
import { maintenanceResponse } from "../../maintenance";
import { getStoredImageGenerationConfig } from "../../../db/image-generation-config";
import { imageGenerationProviderById } from "../../image-generation-providers";
import { apiReply, enforceRateLimit, isSafePublicHttps, matchesTrustedProviderHost, readJsonBody, rejectCrossSiteMutation, RequestValidationError } from "../../api-security";

export const dynamic="force-dynamic";

type Workflow="text-to-image"|"image-to-image"|"multi-reference";
type ReferenceInput={data:string;role?:string;note?:string};
type GenerateBody={prompt?:string;workflow?:Workflow;aspect?:string;references?:ReferenceInput[]};

const reply=apiReply;
function dataImage(value:string){const match=value.match(/^data:(image\/(?:jpeg|png|webp));base64,([a-zA-Z0-9+/=\r\n]+)$/s);return match?{mediaType:match[1],data:match[2]}:null}
function bytesToBase64(buffer:ArrayBuffer){const bytes=new Uint8Array(buffer);let binary="";for(let start=0;start<bytes.length;start+=8192)binary+=String.fromCharCode(...bytes.subarray(start,start+8192));return btoa(binary)}
function taskToken(value:string){return btoa(value).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/g,"")}
function readTaskToken(value:string){try{const normalized=value.replace(/-/g,"+").replace(/_/g,"/");return atob(normalized+"=".repeat((4-normalized.length%4)%4))}catch{return""}}

function aspectRatio(value="1:1"){const match=value.match(/(21:9|16:9|9:16|4:3|1:1)/);return match?.[1]||"1:1"}
function openAiSize(aspect:string){const ratio=aspectRatio(aspect);return ratio==="9:16"?"1024x1536":ratio==="1:1"?"1024x1024":"1536x1024"}
function runwayRatio(aspect:string){const ratio=aspectRatio(aspect);return{"16:9":"1920:1080","9:16":"1080:1920","1:1":"1080:1080","4:3":"1440:1080","21:9":"2112:912"}[ratio]||"1080:1080"}
function bflSize(aspect:string){const ratio=aspectRatio(aspect);return{"16:9":{width:1536,height:864},"9:16":{width:864,height:1536},"1:1":{width:1024,height:1024},"4:3":{width:1280,height:960},"21:9":{width:1792,height:768}}[ratio]||{width:1024,height:1024}}

async function remoteImageAsDataUrl(value:string){
  let current=value;let response:Response|null=null;
  for(let redirects=0;redirects<=3;redirects+=1){
    if(!isSafePublicHttps(current))throw new Error("IMAGE_URL_UNSAFE");
    response=await fetch(current,{redirect:"manual",signal:AbortSignal.timeout(30000)});
    if(response.status<300||response.status>=400)break;
    const location=response.headers.get("location");if(!location)throw new Error("IMAGE_REDIRECT_INVALID");
    current=new URL(location,current).toString();
  }
  if(!response||response.status>=300&&response.status<400)throw new Error("IMAGE_REDIRECT_LIMIT");
  if(!response.ok)throw new Error("IMAGE_DOWNLOAD_FAILED");
  const mediaType=(response.headers.get("content-type")||"image/png").split(";")[0];
  if(!["image/jpeg","image/png","image/webp"].includes(mediaType))throw new Error("IMAGE_FORMAT_INVALID");
  const declared=Number(response.headers.get("content-length")||0);if(Number.isFinite(declared)&&declared>20*1024*1024)throw new Error("IMAGE_TOO_LARGE");
  const buffer=await response.arrayBuffer();
  if(buffer.byteLength>20*1024*1024)throw new Error("IMAGE_TOO_LARGE");
  return`data:${mediaType};base64,${bytesToBase64(buffer)}`;
}

function providerMessage(payload:any,fallback:string){const value=payload?.error?.message||payload?.error||payload?.message;return typeof value==="string"?value:fallback}

async function completedImage(payload:any){
  const base64=payload?.data?.[0]?.b64_json||payload?.output_image?.data;
  if(typeof base64==="string"&&base64)return`data:${payload?.output_image?.mime_type||"image/png"};base64,${base64}`;
  for(const step of payload?.steps||[])for(const item of step?.content||[])if(item?.type==="image"&&item?.data)return`data:${item.mime_type||"image/png"};base64,${item.data}`;
  const url=payload?.data?.[0]?.url;
  return typeof url==="string"?remoteImageAsDataUrl(url):null;
}

export async function POST(request:Request){
  const user=await getChatGPTUser();const maintenance=maintenanceResponse(user);if(maintenance)return maintenance;if(!user)return reply({error:"请先登录后再生成图片。"},401);
  const crossSite=rejectCrossSiteMutation(request);if(crossSite)return crossSite;
  const limited=await enforceRateLimit(user.userId,"image-generation",20,600);if(limited)return limited;
  const config=await getStoredImageGenerationConfig(user.userId);if(!config)return reply({error:"请先在 Profile 中配置图片生成引擎。"},400);
  let body:GenerateBody;try{body=await readJsonBody(request,42_000_000)}catch(error){return error instanceof RequestValidationError?reply({error:error.message},error.status):reply({error:"图片生成请求格式不正确。"},400)}
  const prompt=body.prompt?.trim()||"";if(!prompt||prompt.length>12000)return reply({error:"图片提示词为空或过长。"},400);
  const workflow:Workflow=body.workflow==="image-to-image"||body.workflow==="multi-reference"?body.workflow:"text-to-image";
  const supplied=Array.isArray(body.references)?body.references:[];
  const references=workflow==="text-to-image"?[]:workflow==="image-to-image"?supplied.slice(0,1):supplied.slice(0,6);
  if(workflow==="image-to-image"&&references.length!==1)return reply({error:"图生图需要一张源图。"},400);
  if(workflow==="multi-reference"&&references.length<2)return reply({error:"多参考图生图至少需要两张参考图。"},400);
  if(references.some(item=>!dataImage(item.data)||item.data.length>8_000_000)||references.reduce((sum,item)=>sum+item.data.length,0)>36_000_000)return reply({error:"参考图格式不正确或总体积过大。"},413);
  const provider=imageGenerationProviderById(config.providerId);
  const baseUrl=config.apiBaseUrl.replace(/\/+$/,"");
  if(!matchesTrustedProviderHost(baseUrl,provider.baseUrl))return reply({error:"图片生成接口必须使用该服务商的官方安全 HTTPS 地址。"},400);

  try{
    if(provider.protocol==="openai-images"){
      let response:Response;
      if(!references.length){
        response=await fetch(`${baseUrl}/images/generations`,{method:"POST",headers:{Authorization:`Bearer ${config.apiKey}`,"Content-Type":"application/json"},signal:AbortSignal.timeout(120000),body:JSON.stringify({model:config.model,prompt,n:1,size:openAiSize(body.aspect),quality:"medium",output_format:"png"})});
      }else{
        const form=new FormData();form.append("model",config.model);form.append("prompt",prompt);form.append("size",openAiSize(body.aspect));form.append("quality","medium");form.append("output_format","png");
        references.forEach((item,index)=>{const parsed=dataImage(item.data)!;const bytes=Uint8Array.from(atob(parsed.data),char=>char.charCodeAt(0));form.append("image[]",new Blob([bytes],{type:parsed.mediaType}),`reference-${index+1}.${parsed.mediaType.includes("png")?"png":"jpg"}`)});
        response=await fetch(`${baseUrl}/images/edits`,{method:"POST",headers:{Authorization:`Bearer ${config.apiKey}`},signal:AbortSignal.timeout(120000),body:form});
      }
      const payload=await response.json().catch(()=>({}));if(!response.ok)return reply({error:providerMessage(payload,"OpenAI 图片生成失败。")},502);
      const imageUrl=await completedImage(payload);if(!imageUrl)return reply({error:"图片模型没有返回可显示的图片。"},502);
      return reply({status:"succeeded",imageUrl,model:config.model,provider:provider.name});
    }

    if(provider.protocol==="gemini-images"){
      const input:Array<Record<string,string>>=[{type:"text",text:prompt}];
      for(const item of references){const parsed=dataImage(item.data)!;input.push({type:"image",mime_type:parsed.mediaType,data:parsed.data})}
      const response=await fetch(`${baseUrl}/interactions`,{method:"POST",headers:{"x-goog-api-key":config.apiKey,"Content-Type":"application/json"},signal:AbortSignal.timeout(120000),body:JSON.stringify({model:config.model,input,response_format:{type:"image",aspect_ratio:aspectRatio(body.aspect),image_size:"2K"}})});
      const payload=await response.json().catch(()=>({}));if(!response.ok)return reply({error:providerMessage(payload,"Gemini 图片生成失败。")},502);
      const imageUrl=await completedImage(payload);if(!imageUrl)return reply({error:"Gemini 没有返回可显示的图片。"},502);
      return reply({status:"succeeded",imageUrl,model:config.model,provider:provider.name});
    }

    if(provider.protocol==="runway"){
      if(config.model.startsWith("gen4_image")&&references.length>3)return reply({error:"当前 Runway Gen-4 Image 最多支持 3 张参考图；请减少图片或换用 Seedream/Gemini/GPT Image。"},400);
      const referenceGuide=references.map((item,index)=>`@Ref${index+1} is the ${item.role||"visual"} reference${item.note?`: ${item.note}`:""}.`).join(" ");
      const maxPrompt=config.model.startsWith("gen4_image")?1000:5500;
      const response=await fetch(`${baseUrl}/text_to_image`,{method:"POST",headers:{Authorization:`Bearer ${config.apiKey}`,"X-Runway-Version":"2024-11-06","Content-Type":"application/json"},signal:AbortSignal.timeout(30000),body:JSON.stringify({model:config.model,promptText:`${prompt}\n${referenceGuide}`.slice(0,maxPrompt),ratio:runwayRatio(body.aspect),referenceImages:references.map((item,index)=>({uri:item.data,tag:`Ref${index+1}`})),outputCount:1})});
      const payload=await response.json().catch(()=>({}));if(!response.ok)return reply({error:providerMessage(payload,"Runway 图片任务创建失败。")},502);
      if(!payload?.id)return reply({error:"Runway 没有返回任务编号。"},502);
      return reply({status:"pending",taskId:String(payload.id),providerId:provider.id,model:config.model,provider:provider.name});
    }

    const dimensions=bflSize(body.aspect||"");const requestBody:Record<string,unknown>={prompt,...dimensions};
    references.forEach((item,index)=>{requestBody[index===0?"input_image":`input_image_${index+1}`]=item.data});
    const response=await fetch(`${baseUrl}/${encodeURIComponent(config.model)}`,{method:"POST",headers:{"x-key":config.apiKey,"Content-Type":"application/json",accept:"application/json"},signal:AbortSignal.timeout(30000),body:JSON.stringify(requestBody)});
    const payload=await response.json().catch(()=>({}));if(!response.ok)return reply({error:providerMessage(payload,"FLUX 图片任务创建失败。")},502);
    if(!payload?.polling_url)return reply({error:"FLUX 没有返回任务查询地址。"},502);
    return reply({status:"pending",pollToken:taskToken(String(payload.polling_url)),providerId:provider.id,model:config.model,provider:provider.name});
  }catch(error){return reply({error:error instanceof Error&&error.name==="TimeoutError"?"图片模型响应超时，请稍后查询或重试。":"图片生成服务暂时无法连接。"},502)}
}

export async function GET(request:Request){
  const user=await getChatGPTUser();const maintenance=maintenanceResponse(user);if(maintenance)return maintenance;if(!user)return reply({error:"请先登录。"},401);
  const limited=await enforceRateLimit(user.userId,"image-generation-poll",300,600);if(limited)return limited;
  const config=await getStoredImageGenerationConfig(user.userId);if(!config)return reply({error:"图片生成引擎尚未配置。"},400);
  const provider=imageGenerationProviderById(config.providerId);const url=new URL(request.url);
  if(!matchesTrustedProviderHost(config.apiBaseUrl,provider.baseUrl))return reply({error:"图片生成接口配置不安全。"},400);
  try{
    if(provider.protocol==="runway"){
      const taskId=url.searchParams.get("taskId")||"";if(!/^[a-zA-Z0-9_-]{8,100}$/.test(taskId))return reply({error:"图片任务编号无效。"},400);
      const response=await fetch(`${config.apiBaseUrl.replace(/\/+$/,"")}/tasks/${encodeURIComponent(taskId)}`,{headers:{Authorization:`Bearer ${config.apiKey}`,"X-Runway-Version":"2024-11-06"},signal:AbortSignal.timeout(30000)});
      const payload=await response.json().catch(()=>({}));if(!response.ok)return reply({error:providerMessage(payload,"无法读取 Runway 图片任务。")},502);
      if(payload?.status==="FAILED"||payload?.status==="CANCELED")return reply({status:"failed",error:payload?.failure||payload?.failureCode||"图片生成任务失败。"});
      if(payload?.status!=="SUCCEEDED")return reply({status:"pending"});
      const output=Array.isArray(payload.output)?payload.output[0]:payload.output;if(typeof output!=="string")return reply({status:"failed",error:"图片任务完成但没有返回文件。"});
      return reply({status:"succeeded",imageUrl:await remoteImageAsDataUrl(output),model:config.model,provider:provider.name});
    }
    if(provider.protocol==="bfl"){
      const pollingUrl=readTaskToken(url.searchParams.get("pollToken")||"");
      if(!isSafePublicHttps(pollingUrl)||!new URL(pollingUrl).hostname.toLowerCase().endsWith(".bfl.ai"))return reply({error:"FLUX 任务查询地址无效。"},400);
      const response=await fetch(pollingUrl,{headers:{"x-key":config.apiKey,accept:"application/json"},signal:AbortSignal.timeout(30000)});
      const payload=await response.json().catch(()=>({}));if(!response.ok)return reply({error:providerMessage(payload,"无法读取 FLUX 图片任务。")},502);
      if(payload?.status==="Error"||payload?.status==="Failed"||payload?.status==="Request Moderated")return reply({status:"failed",error:providerMessage(payload,"FLUX 图片生成失败。")});
      if(payload?.status!=="Ready")return reply({status:"pending"});
      const output=payload?.result?.sample;if(typeof output!=="string")return reply({status:"failed",error:"FLUX 任务完成但没有返回文件。"});
      return reply({status:"succeeded",imageUrl:await remoteImageAsDataUrl(output),model:config.model,provider:provider.name});
    }
    return reply({error:"当前图片引擎不需要异步查询。"},400);
  }catch{return reply({error:"读取图片生成进度失败，请稍后重试。"},502)}
}
