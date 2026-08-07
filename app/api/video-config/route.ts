import { getChatGPTUser } from "../../chatgpt-auth";
import { maintenanceResponse } from "../../maintenance";
import { deleteStoredVideoGenerationConfig, getStoredVideoGenerationConfigSummary, saveStoredVideoGenerationConfig } from "../../../db/video-generation-config";
import { VIDEO_GENERATION_PROVIDERS, isTrustedVideoProviderUrl, normalizeVideoBaseUrl, videoGenerationProviderById } from "../../video-generation-providers";
import { apiReply, enforceRateLimit, readJsonBody, rejectCrossSiteMutation, RequestValidationError, safeModelId } from "../../api-security";

export const dynamic="force-dynamic";
const reply=apiReply;

export async function GET(){
  const user=await getChatGPTUser();const maintenance=maintenanceResponse(user);if(maintenance)return maintenance;if(!user)return reply({error:"请先登录。"},401);
  const limited=await enforceRateLimit(user.userId,"video-config-read",120,3600);if(limited)return limited;
  return reply({config:await getStoredVideoGenerationConfigSummary(user.userId)});
}

export async function POST(request:Request){
  const user=await getChatGPTUser();const maintenance=maintenanceResponse(user);if(maintenance)return maintenance;if(!user)return reply({error:"请先登录后再保存视频引擎。"},401);
  const crossSite=rejectCrossSiteMutation(request);if(crossSite)return crossSite;
  const limited=await enforceRateLimit(user.userId,"video-config-write",20,3600);if(limited)return limited;
  let body:{providerId?:string;apiBaseUrl?:string;model?:string;apiKey?:string;apiSecret?:string};
  try{body=await readJsonBody(request,32_768)}catch(error){return error instanceof RequestValidationError?reply({error:error.message},error.status):reply({error:"配置内容格式不正确。"},400)}
  if(!VIDEO_GENERATION_PROVIDERS.some(item=>item.id===body.providerId))return reply({error:"不支持的视频服务商。"},400);
  const provider=videoGenerationProviderById(body.providerId);const apiBaseUrl=normalizeVideoBaseUrl(body.apiBaseUrl||provider.baseUrl);const model=body.model?.trim()||"";const apiKey=body.apiKey?.trim()||undefined;const apiSecret=body.apiSecret?.trim()||undefined;
  if(!safeModelId(model))return reply({error:"请选择有效的视频生成模型。"},400);
  if(!provider.models.some(item=>item.id===model))return reply({error:"请选择该服务商官方列表中的视频模型。"},400);
  if(!isTrustedVideoProviderUrl(apiBaseUrl,provider))return reply({error:"视频接口必须使用该服务商的官方安全 HTTPS 地址。"},400);
  if(apiKey&&apiKey.length<8)return reply({error:provider.auth==="access-secret"?"Access Key 不完整。":"视频生成 API Key 不完整。"},400);
  if(provider.auth==="access-secret"&&!apiSecret){const existing=await getStoredVideoGenerationConfigSummary(user.userId);if(!existing?.hasApiSecret||existing.providerId!==provider.id)return reply({error:"可灵官方接口还需要 Secret Key。"},400)}
  if(apiSecret&&apiSecret.length<8)return reply({error:"Secret Key 不完整。"},400);
  try{return reply({config:await saveStoredVideoGenerationConfig(user.userId,{providerId:provider.id,apiBaseUrl,model,apiKey,apiSecret})})}catch(error){
    if(error instanceof Error&&error.message==="API_KEY_REQUIRED")return reply({error:"更换视频服务商或接口地址时，需要重新填写对应密钥。"},400);
    return reply({error:"视频引擎配置暂时无法保存，请稍后重试。"},500);
  }
}

export async function DELETE(request:Request){
  const user=await getChatGPTUser();const maintenance=maintenanceResponse(user);if(maintenance)return maintenance;if(!user)return reply({error:"请先登录。"},401);
  const crossSite=rejectCrossSiteMutation(request);if(crossSite)return crossSite;
  const limited=await enforceRateLimit(user.userId,"video-config-write",20,3600);if(limited)return limited;
  await deleteStoredVideoGenerationConfig(user.userId);return reply({deleted:true});
}
