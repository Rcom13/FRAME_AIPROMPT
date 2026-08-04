/** Cloudflare Worker entry point for the vinext-starter template. */
import { handleImageOptimization, DEFAULT_DEVICE_SIZES, DEFAULT_IMAGE_SIZES } from "vinext/server/image-optimization";
import handler from "vinext/server/app-router-entry";
import { getStoredComfyConfig, type ComfyAuthMode } from "../db/comfy-config";

interface Env {
  ASSETS: Fetcher;
  DB: D1Database;
  IMAGES: {
    input(stream: ReadableStream): {
      transform(options: Record<string, unknown>): {
        output(options: { format: string; quality: number }): Promise<{ response(): Response }>;
      };
    };
  };
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "style-src 'self' 'unsafe-inline'",
  "script-src 'self' 'unsafe-inline'",
  "connect-src 'self' https: wss:",
  "frame-src 'self'",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "upgrade-insecure-requests",
].join("; ");

const COMFY_CONTENT_SECURITY_POLICY = [
  "default-src 'self' data: blob: https: wss:",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'self'",
  "form-action 'self' https:",
  "img-src 'self' data: blob: https:",
  "media-src 'self' data: blob: https:",
  "font-src 'self' data: https:",
  "style-src 'self' 'unsafe-inline' https:",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' blob:",
  "connect-src 'self' https: wss:",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "upgrade-insecure-requests",
].join("; ");

function secureResponse(response: Response, url: URL) {
  const headers = new Headers(response.headers);
  const isComfyFrontend = url.pathname.startsWith("/comfy/");
  headers.set("Content-Security-Policy", isComfyFrontend ? COMFY_CONTENT_SECURITY_POLICY : CONTENT_SECURITY_POLICY);
  headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("X-Frame-Options", isComfyFrontend ? "SAMEORIGIN" : "DENY");
  headers.set("Referrer-Policy", "no-referrer");
  headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=(), clipboard-read=*, clipboard-write=*, fullscreen=*");
  headers.set("Cross-Origin-Opener-Policy", "same-origin");
  headers.set("X-Permitted-Cross-Domain-Policies", "none");
  if (url.pathname.startsWith("/api/") || headers.get("content-type")?.includes("text/html")) headers.set("Cache-Control", "no-store");
  else if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/assets/")) headers.set("Cache-Control", "public, max-age=31536000, immutable");
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

function upstreamAuthHeaders(authMode: ComfyAuthMode, apiKey: string) {
  if (authMode === "x-api-key") return { "X-API-Key": apiKey };
  if (authMode === "bearer") return { Authorization: `Bearer ${apiKey}` };
  return {};
}

function proxyHeaders(request: Request, authMode: ComfyAuthMode, apiKey: string) {
  const headers = new Headers(request.headers);
  for (const name of [
    "cookie", "host", "origin", "referer", "content-length", "authorization", "x-api-key",
    "oai-authenticated-user-id", "oai-authenticated-user-email", "oai-authenticated-user-full-name",
    "oai-authenticated-user-full-name-encoding", "cf-connecting-ip", "cf-ipcountry", "cf-ray",
    "x-forwarded-for", "x-forwarded-host", "x-forwarded-proto",
  ]) headers.delete(name);
  for (const [name, value] of Object.entries(upstreamAuthHeaders(authMode, apiKey))) headers.set(name, value);
  return headers;
}

async function injectCloudPromptKey(request: Request, apiKey: string) {
  const declared = Number(request.headers.get("content-length") || 0);
  if (declared > 8_388_608) return null;
  try {
    const body = await request.json() as Record<string, unknown>;
    const extra = body.extra_data && typeof body.extra_data === "object" ? body.extra_data as Record<string, unknown> : {};
    body.extra_data = { ...extra, api_key_comfy_org: apiKey };
    return JSON.stringify(body);
  } catch {
    return null;
  }
}

async function proxyComfyRequest(request: Request, userId: string, url: URL) {
  const config = await getStoredComfyConfig(userId);
  if (!config) return Response.json({ error: "ComfyUI backend is not configured" }, { status: 428 });
  const suffix = url.pathname.slice("/comfy".length);
  const upstream = new URL(`${config.baseUrl.replace(/\/+$/, "")}${suffix}${url.search}`);
  const isWebSocket = suffix === "/ws" && request.headers.get("upgrade")?.toLowerCase() === "websocket";
  if (isWebSocket && config.mode === "cloud" && config.apiKey) upstream.searchParams.set("token", config.apiKey);
  const headers = proxyHeaders(request, config.authMode, config.apiKey);
  let body: BodyInit | null | undefined = request.method === "GET" || request.method === "HEAD" ? undefined : request.body;
  if (config.mode === "cloud" && suffix === "/api/prompt" && request.method === "POST") {
    const injected = await injectCloudPromptKey(request, config.apiKey);
    if (!injected) return Response.json({ error: "Invalid or oversized workflow" }, { status: 400 });
    body = injected;
    headers.set("Content-Type", "application/json");
  }
  const response = await fetch(new Request(upstream, {
    method: request.method,
    headers,
    body,
    redirect: "manual",
  }));
  if (isWebSocket) return response;
  const responseHeaders = new Headers(response.headers);
  for (const name of ["set-cookie", "content-security-policy", "x-frame-options", "access-control-allow-origin", "access-control-allow-credentials"]) responseHeaders.delete(name);
  responseHeaders.set("Cache-Control", suffix.startsWith("/api/") || suffix.startsWith("/internal/") ? "no-store" : "private, max-age=300");
  responseHeaders.set("X-Content-Type-Options", "nosniff");
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers: responseHeaders });
}

// Image security config. SVG sources with .svg extension auto-skip the
// optimization endpoint on the client side (served directly, no proxy).
// To route SVGs through the optimizer (with security headers), set
// dangerouslyAllowSVG: true in next.config.js and uncomment below:
// const imageConfig: ImageConfig = { dangerouslyAllowSVG: true };

const worker = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    const isBundledComfyCoreExtension = url.pathname.startsWith("/comfy/extensions/core/");
    const isComfyBackendRequest =
      (!isBundledComfyCoreExtension && /^\/comfy\/(?:api|internal|extensions|templates)(?:\/|$)/.test(url.pathname)) ||
      url.pathname === "/comfy/ws";

    if (isComfyBackendRequest) {
      const userId = request.headers.get("oai-authenticated-user-id");
      if (!userId) return Response.json({ error: "Sign in to connect ComfyUI" }, { status: 401 });
      try {
        return await proxyComfyRequest(request, userId, url);
      } catch {
        return Response.json({ error: "ComfyUI backend is unreachable" }, { status: 502 });
      }
    }

    if (url.pathname === "/_vinext/image") {
      const allowedWidths = [...DEFAULT_DEVICE_SIZES, ...DEFAULT_IMAGE_SIZES];
      const response = await handleImageOptimization(request, {
        fetchAsset: (path) => env.ASSETS.fetch(new Request(new URL(path, request.url))),
        transformImage: async (body, { width, format, quality }) => {
          const result = await env.IMAGES.input(body).transform(width > 0 ? { width } : {}).output({ format, quality });
          return result.response();
        },
      }, allowedWidths);
      return secureResponse(response, url);
    }

    return secureResponse(await handler.fetch(request, env, ctx), url);
  },
};

export default worker;
