import { env } from "cloudflare:workers";

const JSON_CONTENT_TYPE="application/json";

export class RequestValidationError extends Error{
  status:number;
  constructor(message:string,status=400){super(message);this.name="RequestValidationError";this.status=status}
}

export function apiReply(body:unknown,status=200,extraHeaders:Record<string,string>={}){
  return Response.json(body,{status,headers:{"Cache-Control":"no-store","X-Content-Type-Options":"nosniff",...extraHeaders}});
}

export function rejectCrossSiteMutation(request:Request){
  const site=request.headers.get("sec-fetch-site")?.toLowerCase();
  if(site==="cross-site")return apiReply({error:"已拒绝跨站请求。"},403);
  const origin=request.headers.get("origin");
  if(!origin)return null;
  try{return new URL(origin).origin===new URL(request.url).origin?null:apiReply({error:"请求来源验证失败。"},403)}catch{return apiReply({error:"请求来源验证失败。"},403)}
}

export async function readJsonBody<T>(request:Request,maxBytes:number):Promise<T>{
  const contentType=request.headers.get("content-type")?.split(";",1)[0].trim().toLowerCase();
  if(contentType!==JSON_CONTENT_TYPE)throw new RequestValidationError("请求必须使用 application/json。",415);
  const declared=Number(request.headers.get("content-length")||0);
  if(Number.isFinite(declared)&&declared>maxBytes)throw new RequestValidationError("请求内容过大。",413);
  const text=await request.text();
  if(new TextEncoder().encode(text).byteLength>maxBytes)throw new RequestValidationError("请求内容过大。",413);
  try{return JSON.parse(text) as T}catch{throw new RequestValidationError("请求内容格式不正确。",400)}
}

function base64Url(bytes:Uint8Array){let binary="";for(const byte of bytes)binary+=String.fromCharCode(byte);return btoa(binary).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/g,"")}

export async function enforceRateLimit(userId:string,scope:string,limit:number,windowSeconds:number){
  const now=Math.floor(Date.now()/1000);const windowStart=Math.floor(now/windowSeconds)*windowSeconds;const expiresAt=windowStart+windowSeconds;
  const digest=new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(userId)));
  const bucket=`${scope}:${base64Url(digest.slice(0,18))}:${windowStart}`;
  const row=await env.DB.prepare(`INSERT INTO api_rate_limits (bucket, count, expires_at) VALUES (?, 1, ?) ON CONFLICT(bucket) DO UPDATE SET count = count + 1 RETURNING count`).bind(bucket,expiresAt).first<{count:number}>();
  if(digest[0]<4)await env.DB.prepare("DELETE FROM api_rate_limits WHERE expires_at < ?").bind(now-3600).run();
  const count=Number(row?.count||1);
  if(count>limit)return apiReply({error:"请求过于频繁，请稍后再试。",retryAfter:Math.max(1,expiresAt-now)},429,{"Retry-After":String(Math.max(1,expiresAt-now))});
  return null;
}

function isUnsafeIpv4(host:string){
  if(!/^\d{1,3}(?:\.\d{1,3}){3}$/.test(host))return false;
  const parts=host.split(".").map(Number);if(parts.some(part=>part<0||part>255))return true;
  const [a,b,c]=parts;
  return a===0||a===10||a===127||a>=224||(a===100&&b>=64&&b<=127)||(a===169&&b===254)||(a===172&&b>=16&&b<=31)||(a===192&&b===0)||(a===192&&b===168)||(a===198&&(b===18||b===19))||(a===198&&b===51&&c===100)||(a===203&&b===0&&c===113);
}

function isUnsafeIpv6(host:string){
  const value=host.replace(/^\[|\]$/g,"").toLowerCase();
  if(!value.includes(":"))return false;
  return value==="::"||value==="::1"||value.startsWith("fc")||value.startsWith("fd")||value.startsWith("ff")||/^fe[89ab]/.test(value)||value.startsWith("2001:db8")||value.startsWith("::ffff:");
}

export function isSafePublicHttps(value:string){
  try{
    const url=new URL(value);const host=url.hostname.toLowerCase().replace(/\.$/,"");
    if(url.protocol!=="https:"||url.username||url.password||(url.port&&url.port!=="443")||url.search||url.hash)return false;
    if(!host||host.length>253||host==="localhost"||host==="metadata"||host==="instance-data"||host.endsWith(".localhost")||host.endsWith(".local")||host.endsWith(".internal")||host==="metadata.google.internal")return false;
    if(isUnsafeIpv4(host)||isUnsafeIpv6(host))return false;
    if(!host.includes(".")&&!host.includes(":"))return false;
    return true;
  }catch{return false}
}

export function matchesTrustedProviderHost(value:string,officialBaseUrl:string){
  if(!isSafePublicHttps(value))return false;
  if(!officialBaseUrl)return true;
  try{return new URL(value).hostname.toLowerCase()===new URL(officialBaseUrl).hostname.toLowerCase()}catch{return false}
}

export function safeModelId(value:string,maxLength=180){return value.length>0&&value.length<=maxLength&&/^[a-zA-Z0-9][a-zA-Z0-9._:/-]*$/.test(value)}
