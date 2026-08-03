import { getChatGPTUser } from "../../chatgpt-auth";
import { deleteStoredImageGenerationConfig, getStoredImageGenerationConfigSummary, saveStoredImageGenerationConfig } from "../../../db/image-generation-config";
import { imageGenerationProviderById, normalizeImageBaseUrl } from "../../image-generation-providers";

export const dynamic="force-dynamic";

function reply(body:unknown,status=200){return Response.json(body,{status,headers:{"Cache-Control":"no-store"}})}
function safePublicHttps(value:string){try{const url=new URL(value);if(url.protocol!=="https:")return false;const host=url.hostname.toLowerCase();if(host==="localhost"||host.endsWith(".local")||host==="0.0.0.0"||host==="127.0.0.1"||host==="::1")return false;return !/^(10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.)/.test(host)}catch{return false}}

export async function GET(){
  const user=await getChatGPTUser();if(!user)return reply({error:"请先登录。"},401);
  return reply({config:await getStoredImageGenerationConfigSummary(user.userId)});
}

export async function POST(request:Request){
  const user=await getChatGPTUser();if(!user)return reply({error:"请先登录后再保存图片引擎。"},401);
  let body:{providerId?:string;apiBaseUrl?:string;model?:string;apiKey?:string};
  try{body=await request.json()}catch{return reply({error:"配置内容格式不正确。"},400)}
  const provider=imageGenerationProviderById(body.providerId);
  const providerId=provider.id;
  const apiBaseUrl=normalizeImageBaseUrl(body.apiBaseUrl||provider.baseUrl);
  const model=body.model?.trim()||"";
  const apiKey=body.apiKey?.trim()||undefined;
  if(!model)return reply({error:"请选择图片生成模型。"},400);
  if(!safePublicHttps(apiBaseUrl))return reply({error:"图片接口必须使用安全的公网 HTTPS 地址。"},400);
  if(apiKey&&apiKey.length<12)return reply({error:"图片生成 API Key 不完整。"},400);
  try{return reply({config:await saveStoredImageGenerationConfig(user.userId,{providerId,apiBaseUrl,model,apiKey})})}catch(error){
    if(error instanceof Error&&error.message==="API_KEY_REQUIRED")return reply({error:"更换图片服务商或接口地址时，需要重新填写对应的 API Key。"},400);
    return reply({error:"图片引擎配置暂时无法保存，请稍后重试。"},500);
  }
}

export async function DELETE(){
  const user=await getChatGPTUser();if(!user)return reply({error:"请先登录。"},401);
  await deleteStoredImageGenerationConfig(user.userId);return reply({deleted:true});
}
