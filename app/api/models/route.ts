import { getChatGPTUser } from "../../chatgpt-auth";
import { detectProvider, MODEL_PROVIDERS, normalizeBaseUrl, providerById } from "../../model-providers";
import { getStoredModelConfig } from "../../../db/model-config";
import { apiReply, enforceRateLimit, isSafePublicHttps, matchesTrustedProviderHost, readJsonBody, rejectCrossSiteMutation, RequestValidationError } from "../../api-security";

export const dynamic = "force-dynamic";

const reply=apiReply;

function modelOptions(payload: any, providerId: string) {
  const raw = providerId === "gemini" ? payload?.models : payload?.data ?? payload?.models;
  if (!Array.isArray(raw)) return [];
  return raw.map((item: any) => {
    const id = String(item?.id || item?.name || "").replace(/^models\//, "");
    const modalities = item?.architecture?.input_modalities || item?.input_modalities || [];
    const supported = item?.supportedGenerationMethods || [];
    return {
      id,
      name: String(item?.display_name || item?.displayName || item?.name || id).replace(/^models\//, ""),
      vision: Array.isArray(modalities) ? modalities.includes("image") : /vision|vl|pixtral|gemini|gpt-4o|gpt-5|claude-3|claude-4|grok-4/i.test(id),
      canGenerate: providerId !== "gemini" || !supported.length || supported.includes("generateContent"),
    };
  }).filter((item: any) => item.id && item.canGenerate).slice(0, 700);
}

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return reply({ error: "请先登录后再配置模型。" }, 401);
  const crossSite=rejectCrossSiteMutation(request);if(crossSite)return crossSite;
  const limited=await enforceRateLimit(user.userId,"model-discovery",30,3600);if(limited)return limited;

  let body: { providerId?: string; baseUrl?: string; apiKey?: string };
  try { body = await readJsonBody(request,32_768); } catch(error) { return error instanceof RequestValidationError?reply({error:error.message},error.status):reply({ error: "配置内容格式不正确。" }, 400); }

  if(!MODEL_PROVIDERS.some(item=>item.id===body.providerId))return reply({error:"不支持的模型服务商。"},400);

  const selected = providerById(body.providerId);
  const baseUrl = normalizeBaseUrl(body.baseUrl || selected.baseUrl);
  if (!isSafePublicHttps(baseUrl)||!matchesTrustedProviderHost(baseUrl,selected.id==="custom"?"":selected.baseUrl)) return reply({ error: "接口地址必须是该服务商的安全公网 HTTPS 地址；自定义接口请使用“兼容接口”。" }, 400);

  let apiKey = body.apiKey?.trim() || "";
  if (!apiKey) {
    const stored = await getStoredModelConfig(user.userId);
    if (stored && stored.providerId === selected.id && stored.apiBaseUrl === baseUrl) apiKey = stored.apiKey;
  }
  if (!apiKey || apiKey.length < 12) return reply({ error: "请输入完整的 API Key；更换服务商时需要使用对应密钥。" }, 400);

  const detected = body.providerId === "custom" ? detectProvider(baseUrl, "", apiKey) : detectProvider(baseUrl, "", apiKey).id === "custom" ? selected : detectProvider(baseUrl, "", apiKey);
  const provider = detected.id === "custom" ? selected : detected;
  const headers:Record<string,string> = { "Accept":"application/json" };
  let url = `${baseUrl}/models`;

  if (provider.protocol === "anthropic") {
    headers["x-api-key"] = apiKey;
    headers["anthropic-version"] = "2023-06-01";
  } else if (provider.protocol === "gemini") {
    url = `${baseUrl}/models`;
    headers["x-goog-api-key"] = apiKey;
  } else {
    headers.Authorization = `Bearer ${apiKey}`;
  }

  let response:Response;
  try {
    response = await fetch(url, { headers, signal: AbortSignal.timeout(18000) });
  } catch {
    return reply({ error: "无法连接这个模型服务，请检查接口地址。" }, 502);
  }

  if (!response.ok) {
    const message = response.status === 401 || response.status === 403
      ? "API Key 验证失败，请检查密钥和服务商。"
      : response.status === 404
        ? "该服务没有开放模型列表接口，可以切换到手动填写模型 ID。"
        : `读取模型失败（${response.status}），请稍后重试。`;
    return reply({ error: message, allowManual: response.status === 404 }, 502);
  }

  let payload:any;
  try { payload = await response.json(); } catch { return reply({ error: "模型服务返回了无法解析的数据。" }, 502); }
  const models = modelOptions(payload, provider.id);
  if (!models.length) return reply({ error: "密钥有效，但没有读取到可用于文本生成的模型；你可以手动填写模型 ID。", allowManual:true, provider }, 422);

  return reply({ provider, models, recognized:true });
}
