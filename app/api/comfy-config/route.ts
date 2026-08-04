import { getChatGPTUser } from "../../chatgpt-auth";
import { maintenanceResponse } from "../../maintenance";
import {
  deleteStoredComfyConfig,
  getStoredComfyConfig,
  getStoredComfyConfigSummary,
  saveStoredComfyConfig,
  type ComfyAuthMode,
  type ComfyBackendMode,
} from "../../../db/comfy-config";
import {
  apiReply,
  enforceRateLimit,
  isSafePublicHttps,
  readJsonBody,
  rejectCrossSiteMutation,
  RequestValidationError,
} from "../../api-security";

export const dynamic = "force-dynamic";

const CLOUD_URL = "https://cloud.comfy.org";
const reply = apiReply;

function cleanBaseUrl(value: string) {
  return value.trim().replace(/\/+$/, "");
}

function authHeaders(authMode: ComfyAuthMode, apiKey: string) {
  if (authMode === "x-api-key") return { "X-API-Key": apiKey };
  if (authMode === "bearer") return { Authorization: `Bearer ${apiKey}` };
  return {};
}

async function testConnection(baseUrl: string, authMode: ComfyAuthMode, apiKey: string) {
  const response = await fetch(`${baseUrl}/api/object_info`, {
    headers: { Accept: "application/json", ...authHeaders(authMode, apiKey) },
    cache: "no-store",
    signal: AbortSignal.timeout(20_000),
  });
  await response.body?.cancel().catch(() => undefined);
  if (!response.ok) throw new Error(response.status === 401 || response.status === 403 ? "COMFY_AUTH_FAILED" : `COMFY_HTTP_${response.status}`);
}

export async function GET() {
  const user = await getChatGPTUser();
  const maintenance=maintenanceResponse(user);if(maintenance)return maintenance;
  if (!user) return reply({ error: "请先登录。" }, 401);
  const limited = await enforceRateLimit(user.userId, "comfy-config-read", 120, 3600);
  if (limited) return limited;
  return reply({ config: await getStoredComfyConfigSummary(user.userId) });
}

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  const maintenance=maintenanceResponse(user);if(maintenance)return maintenance;
  if (!user) return reply({ error: "请先登录后再配置 ComfyUI。" }, 401);
  const crossSite = rejectCrossSiteMutation(request);
  if (crossSite) return crossSite;
  const limited = await enforceRateLimit(user.userId, "comfy-config-write", 20, 3600);
  if (limited) return limited;
  let body: { mode?: string; baseUrl?: string; authMode?: string; apiKey?: string };
  try {
    body = await readJsonBody(request, 32_768);
  } catch (error) {
    return error instanceof RequestValidationError ? reply({ error: error.message }, error.status) : reply({ error: "配置内容格式不正确。" }, 400);
  }

  const mode = body.mode === "remote" ? "remote" : body.mode === "cloud" ? "cloud" : null;
  if (!mode) return reply({ error: "请选择有效的 ComfyUI 连接方式。" }, 400);
  const authMode: ComfyAuthMode = mode === "cloud" ? "x-api-key" : body.authMode === "bearer" || body.authMode === "x-api-key" || body.authMode === "none" ? body.authMode : "none";
  const baseUrl = mode === "cloud" ? CLOUD_URL : cleanBaseUrl(body.baseUrl || "");
  if (!isSafePublicHttps(baseUrl)) return reply({ error: "远程 ComfyUI 必须使用安全的公网 HTTPS 地址；本机版本请直接在新窗口打开。" }, 400);

  const incomingKey = body.apiKey?.trim();
  const existing = await getStoredComfyConfig(user.userId);
  const canReuse = existing && existing.mode === mode && existing.baseUrl === baseUrl && existing.authMode === authMode;
  const effectiveKey = incomingKey ?? (canReuse ? existing.apiKey : "");
  if (authMode !== "none" && effectiveKey.length < 8) return reply({ error: "请填写完整的 ComfyUI API Key。" }, 400);

  try {
    await testConnection(baseUrl, authMode, effectiveKey);
    const config = await saveStoredComfyConfig(user.userId, { mode: mode as ComfyBackendMode, baseUrl, authMode, apiKey: incomingKey });
    return reply({ config, tested: true });
  } catch (error) {
    if (error instanceof Error && error.message === "COMFY_AUTH_FAILED") return reply({ error: "ComfyUI 身份验证失败，请检查 API Key。" }, 401);
    if (error instanceof Error && error.message === "API_KEY_REQUIRED") return reply({ error: "更换连接地址时需要重新填写 API Key。" }, 400);
    if (error instanceof Error && error.message.startsWith("COMFY_HTTP_")) return reply({ error: `ComfyUI 服务返回 ${error.message.slice(11)}，请检查服务状态。` }, 502);
    return reply({ error: "无法连接到 ComfyUI，请确认地址、网络和 API Key。" }, 502);
  }
}

export async function DELETE(request: Request) {
  const user = await getChatGPTUser();
  const maintenance=maintenanceResponse(user);if(maintenance)return maintenance;
  if (!user) return reply({ error: "请先登录。" }, 401);
  const crossSite = rejectCrossSiteMutation(request);
  if (crossSite) return crossSite;
  const limited = await enforceRateLimit(user.userId, "comfy-config-write", 20, 3600);
  if (limited) return limited;
  await deleteStoredComfyConfig(user.userId);
  return reply({ deleted: true });
}
