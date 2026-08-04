import { getChatGPTUser } from "../../chatgpt-auth";
import { deleteStoredModelConfig, getStoredModelConfigSummary, saveStoredModelConfig } from "../../../db/model-config";
import { MODEL_PROVIDERS, normalizeBaseUrl, providerById } from "../../model-providers";
import { apiReply, enforceRateLimit, isSafePublicHttps, matchesTrustedProviderHost, readJsonBody, rejectCrossSiteMutation, RequestValidationError, safeModelId } from "../../api-security";

export const dynamic = "force-dynamic";

const reply=apiReply;

export async function GET(){
  const user=await getChatGPTUser();
  if(!user)return reply({error:"请先登录。"},401);
  const limited=await enforceRateLimit(user.userId,"model-config-read",120,3600);if(limited)return limited;
  const config=await getStoredModelConfigSummary(user.userId);
  return reply({config});
}

export async function POST(request:Request){
  const user=await getChatGPTUser();
  if(!user)return reply({error:"请先登录后再保存模型配置。"},401);
  const crossSite=rejectCrossSiteMutation(request);if(crossSite)return crossSite;
  const limited=await enforceRateLimit(user.userId,"model-config-write",20,3600);if(limited)return limited;
  let body:{providerId?:string;apiBaseUrl?:string;model?:string;apiKey?:string};
  try{body=await readJsonBody(request,32_768)}catch(error){return error instanceof RequestValidationError?reply({error:error.message},error.status):reply({error:"配置内容格式不正确。"},400)}
  const providerId=body.providerId?.trim()||"";
  if(!MODEL_PROVIDERS.some(item=>item.id===providerId))return reply({error:"不支持的模型服务商。"},400);
  const provider=providerById(providerId);
  const apiBaseUrl=normalizeBaseUrl(body.apiBaseUrl||provider.baseUrl);
  const model=body.model?.trim()||"";
  const apiKey=body.apiKey?.trim()||undefined;
  if(!providerId||!safeModelId(model))return reply({error:"请选择有效的服务商和生成模型。"},400);
  if(!isSafePublicHttps(apiBaseUrl)||!matchesTrustedProviderHost(apiBaseUrl,providerId==="custom"?"":provider.baseUrl))return reply({error:"接口地址必须是该服务商的安全公网 HTTPS 地址；自定义兼容接口请使用“兼容接口”。"},400);
  if(apiKey&&apiKey.length<12)return reply({error:"API Key 不完整。"},400);
  try{return reply({config:await saveStoredModelConfig(user.userId,{providerId,apiBaseUrl,model,apiKey})})}catch(error){
    if(error instanceof Error&&error.message==="API_KEY_REQUIRED")return reply({error:"更换服务商或接口地址时，需要重新填写对应的 API Key。"},400);
    return reply({error:"账户配置暂时无法保存，请稍后重试。"},500);
  }
}

export async function DELETE(request:Request){
  const user=await getChatGPTUser();
  if(!user)return reply({error:"请先登录。"},401);
  const crossSite=rejectCrossSiteMutation(request);if(crossSite)return crossSite;
  const limited=await enforceRateLimit(user.userId,"model-config-write",20,3600);if(limited)return limited;
  await deleteStoredModelConfig(user.userId);
  return reply({deleted:true});
}
