import { getChatGPTUser } from "../../chatgpt-auth";
import { maintenanceResponse } from "../../maintenance";
import { getStoredVideoGenerationConfig } from "../../../db/video-generation-config";
import { VIDEO_GENERATION_PROVIDERS, isTrustedVideoProviderUrl, normalizeVideoBaseUrl, videoGenerationProviderById } from "../../video-generation-providers";
import type { VideoGenerationModel } from "../../video-generation-providers";
import { apiReply, enforceRateLimit, readJsonBody, rejectCrossSiteMutation, RequestValidationError, safeModelId } from "../../api-security";

export const dynamic="force-dynamic";
const reply=apiReply;
const LIVE_DISCOVERY=new Set(["openai-video","gemini-veo","minimax-video"]);

function catalog(providerId:string){return videoGenerationProviderById(providerId).models.map(item=>({...item}))}
function normalizeModels(payload:any,providerId:string):VideoGenerationModel[]{
  const provider=videoGenerationProviderById(providerId);const raw=Array.isArray(payload?.data)?payload.data:Array.isArray(payload?.models)?payload.models:[];
  const discovered=raw.map((item:any)=>{const id=String(item?.id||item?.name||"").replace(/^models\//,"");const known=provider.models.find(model=>model.id===id);return{id,name:String(item?.display_name||item?.displayName||known?.name||id).replace(/^models\//,""),workflows:known?.workflows||provider.workflows,supported:Array.isArray(item?.supportedGenerationMethods)?item.supportedGenerationMethods:[]}})
    .filter(item=>safeModelId(item.id))
    .filter(item=>providerId==="gemini-veo"?/veo/i.test(item.id)&&(!item.supported.length||item.supported.includes("predictLongRunning")):providerId==="openai-video"?/^sora(?:-|$)/i.test(item.id):/hailuo|video/i.test(item.id));
  return discovered.slice(0,200).map(({id,name,workflows})=>({id,name,workflows}));
}

export async function POST(request:Request){
  const user=await getChatGPTUser();const maintenance=maintenanceResponse(user);if(maintenance)return maintenance;if(!user)return reply({error:"请先登录后再读取视频模型。"},401);
  const crossSite=rejectCrossSiteMutation(request);if(crossSite)return crossSite;
  const limited=await enforceRateLimit(user.userId,"video-model-discovery",30,3600);if(limited)return limited;
  let body:{providerId?:string;baseUrl?:string;apiKey?:string};
  try{body=await readJsonBody(request,32_768)}catch(error){return error instanceof RequestValidationError?reply({error:error.message},error.status):reply({error:"配置内容格式不正确。"},400)}
  if(!VIDEO_GENERATION_PROVIDERS.some(item=>item.id===body.providerId))return reply({error:"不支持的视频服务商。"},400);
  const provider=videoGenerationProviderById(body.providerId);const baseUrl=normalizeVideoBaseUrl(body.baseUrl||provider.baseUrl);
  if(!isTrustedVideoProviderUrl(baseUrl,provider))return reply({error:"视频接口必须使用该服务商的官方安全 HTTPS 地址。"},400);
  let apiKey=body.apiKey?.trim()||"";if(!apiKey){const stored=await getStoredVideoGenerationConfig(user.userId);if(stored&&stored.providerId===provider.id&&normalizeVideoBaseUrl(stored.apiBaseUrl)===baseUrl)apiKey=stored.apiKey}
  if(!apiKey||apiKey.length<8)return reply({error:"请输入完整的视频 API Key；更换服务商时需要使用对应密钥。"},400);
  if(!LIVE_DISCOVERY.has(provider.id))return reply({provider:{id:provider.id,name:provider.name},models:catalog(provider.id),source:"catalog",supportsAccountDiscovery:false,message:"该服务商未开放账户级视频模型列表接口；已载入官方模型目录，也可手动填写模型或 Endpoint ID。"});
  const headers:Record<string,string>={Accept:"application/json"};let url=`${baseUrl}/models`;
  if(provider.id==="gemini-veo"){headers["x-goog-api-key"]=apiKey;url+=url.includes("?")?"&pageSize=1000":"?pageSize=1000"}else headers.Authorization=`Bearer ${apiKey}`;
  let response:Response;try{response=await fetch(url,{headers,signal:AbortSignal.timeout(18000)})}catch{return reply({error:"无法连接该视频模型服务，请检查接口地址。"},502)}
  if(response.status===401||response.status===403)return reply({error:"API Key 验证失败，或当前账号没有读取视频模型的权限。"},401);
  if(!response.ok)return reply({provider:{id:provider.id,name:provider.name},models:catalog(provider.id),source:"catalog",supportsAccountDiscovery:true,message:`服务商未返回账户模型列表（HTTP ${response.status}）；已载入官方目录，可手动填写模型 ID。`});
  const payload=await response.json().catch(()=>null);const models=normalizeModels(payload,provider.id);
  if(!models.length)return reply({provider:{id:provider.id,name:provider.name},models:catalog(provider.id),source:"catalog",supportsAccountDiscovery:true,message:"密钥连接成功，但服务商未在模型列表中返回视频模型；已载入官方目录，可手动填写模型 ID。"});
  return reply({provider:{id:provider.id,name:provider.name},models,source:"account",supportsAccountDiscovery:true,message:`已从当前 API 读取 ${models.length} 个可用视频模型。`});
}
