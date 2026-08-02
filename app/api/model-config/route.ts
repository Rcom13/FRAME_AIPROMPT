import { getChatGPTUser } from "../../chatgpt-auth";
import { deleteStoredModelConfig, getStoredModelConfigSummary, saveStoredModelConfig } from "../../../db/model-config";
import { normalizeBaseUrl, providerById } from "../../model-providers";

export const dynamic = "force-dynamic";

function reply(body:unknown,status=200){return Response.json(body,{status,headers:{"Cache-Control":"no-store"}})}

function safePublicHttps(value:string){
  try{const url=new URL(value);if(url.protocol!=="https:")return false;const host=url.hostname.toLowerCase();if(host==="localhost"||host.endsWith(".local")||host==="0.0.0.0"||host==="127.0.0.1"||host==="::1")return false;return !/^(10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.)/.test(host)}catch{return false}
}

export async function GET(){
  const user=await getChatGPTUser();
  if(!user)return reply({error:"请先登录。"},401);
  const config=await getStoredModelConfigSummary(user.userId);
  return reply({config});
}

export async function POST(request:Request){
  const user=await getChatGPTUser();
  if(!user)return reply({error:"请先登录后再保存模型配置。"},401);
  let body:{providerId?:string;apiBaseUrl?:string;model?:string;apiKey?:string};
  try{body=await request.json()}catch{return reply({error:"配置内容格式不正确。"},400)}
  const providerId=body.providerId?.trim()||"";
  const provider=providerById(providerId);
  const apiBaseUrl=normalizeBaseUrl(body.apiBaseUrl||provider.baseUrl);
  const model=body.model?.trim()||"";
  const apiKey=body.apiKey?.trim()||undefined;
  if(!providerId||!model)return reply({error:"请选择服务商和生成模型。"},400);
  if(!safePublicHttps(apiBaseUrl))return reply({error:"接口地址必须是安全的公网 HTTPS 地址。"},400);
  if(apiKey&&apiKey.length<12)return reply({error:"API Key 不完整。"},400);
  try{return reply({config:await saveStoredModelConfig(user.userId,{providerId,apiBaseUrl,model,apiKey})})}catch(error){
    if(error instanceof Error&&error.message==="API_KEY_REQUIRED")return reply({error:"更换服务商或接口地址时，需要重新填写对应的 API Key。"},400);
    return reply({error:"账户配置暂时无法保存，请稍后重试。"},500);
  }
}

export async function DELETE(){
  const user=await getChatGPTUser();
  if(!user)return reply({error:"请先登录。"},401);
  await deleteStoredModelConfig(user.userId);
  return reply({deleted:true});
}
