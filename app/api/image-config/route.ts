import { getChatGPTUser } from "../../chatgpt-auth";
import { deleteStoredImageGenerationConfig, getStoredImageGenerationConfigSummary, saveStoredImageGenerationConfig } from "../../../db/image-generation-config";
import { IMAGE_GENERATION_PROVIDERS, imageGenerationProviderById, normalizeImageBaseUrl } from "../../image-generation-providers";
import { apiReply, enforceRateLimit, matchesTrustedProviderHost, readJsonBody, rejectCrossSiteMutation, RequestValidationError, safeModelId } from "../../api-security";

export const dynamic="force-dynamic";

const reply=apiReply;

export async function GET(){
  const user=await getChatGPTUser();if(!user)return reply({error:"请先登录。"},401);
  return reply({config:await getStoredImageGenerationConfigSummary(user.userId)});
}

export async function POST(request:Request){
  const user=await getChatGPTUser();if(!user)return reply({error:"请先登录后再保存图片引擎。"},401);
  const crossSite=rejectCrossSiteMutation(request);if(crossSite)return crossSite;
  const limited=await enforceRateLimit(user.userId,"image-config-write",20,3600);if(limited)return limited;
  let body:{providerId?:string;apiBaseUrl?:string;model?:string;apiKey?:string};
  try{body=await readJsonBody(request,32_768)}catch(error){return error instanceof RequestValidationError?reply({error:error.message},error.status):reply({error:"配置内容格式不正确。"},400)}
  if(!IMAGE_GENERATION_PROVIDERS.some(item=>item.id===body.providerId))return reply({error:"不支持的图片服务商。"},400);
  const provider=imageGenerationProviderById(body.providerId);
  const providerId=provider.id;
  const apiBaseUrl=normalizeImageBaseUrl(body.apiBaseUrl||provider.baseUrl);
  const model=body.model?.trim()||"";
  const apiKey=body.apiKey?.trim()||undefined;
  if(!safeModelId(model))return reply({error:"请选择有效的图片生成模型。"},400);
  if(!matchesTrustedProviderHost(apiBaseUrl,provider.baseUrl))return reply({error:"图片接口必须使用该服务商的官方安全 HTTPS 地址。"},400);
  if(apiKey&&apiKey.length<12)return reply({error:"图片生成 API Key 不完整。"},400);
  try{return reply({config:await saveStoredImageGenerationConfig(user.userId,{providerId,apiBaseUrl,model,apiKey})})}catch(error){
    if(error instanceof Error&&error.message==="API_KEY_REQUIRED")return reply({error:"更换图片服务商或接口地址时，需要重新填写对应的 API Key。"},400);
    return reply({error:"图片引擎配置暂时无法保存，请稍后重试。"},500);
  }
}

export async function DELETE(request:Request){
  const user=await getChatGPTUser();if(!user)return reply({error:"请先登录。"},401);
  const crossSite=rejectCrossSiteMutation(request);if(crossSite)return crossSite;
  const limited=await enforceRateLimit(user.userId,"image-config-write",20,3600);if(limited)return limited;
  await deleteStoredImageGenerationConfig(user.userId);return reply({deleted:true});
}
