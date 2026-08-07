import { eq } from "drizzle-orm";
import { getDb } from "./index";
import { videoGenerationConfigs } from "./schema";

const encoder=new TextEncoder();
function bytesToBase64(bytes:Uint8Array){let binary="";for(const byte of bytes)binary+=String.fromCharCode(byte);return btoa(binary)}
function base64ToBytes(value:string){const binary=atob(value);return Uint8Array.from(binary,char=>char.charCodeAt(0))}

async function encryptionKey(){
  const secret=process.env.FRAME_KEY_ENCRYPTION_SECRET;if(!secret)throw new Error("FRAME_KEY_ENCRYPTION_SECRET is not configured");
  const material=base64ToBytes(secret);if(material.byteLength!==32)throw new Error("FRAME_KEY_ENCRYPTION_SECRET must decode to 32 bytes");
  return crypto.subtle.importKey("raw",material,{name:"AES-GCM"},false,["encrypt","decrypt"]);
}

async function encryptSecret(userId:string,label:string,value:string){
  const iv=crypto.getRandomValues(new Uint8Array(12));
  const cipher=await crypto.subtle.encrypt({name:"AES-GCM",iv,additionalData:encoder.encode(`video:${label}:${userId}`)},await encryptionKey(),encoder.encode(value));
  return{encrypted:bytesToBase64(new Uint8Array(cipher)),iv:bytesToBase64(iv)};
}

async function decryptSecret(userId:string,label:string,value:string,iv:string){
  const plain=await crypto.subtle.decrypt({name:"AES-GCM",iv:base64ToBytes(iv),additionalData:encoder.encode(`video:${label}:${userId}`)},await encryptionKey(),base64ToBytes(value));
  return new TextDecoder().decode(plain);
}

export async function getStoredVideoGenerationConfig(userId:string){
  const row=await getDb().select().from(videoGenerationConfigs).where(eq(videoGenerationConfigs.userId,userId)).get();if(!row)return null;
  return{providerId:row.providerId,apiBaseUrl:row.apiBaseUrl,model:row.modelId,apiKey:await decryptSecret(userId,"key",row.encryptedApiKey,row.keyIv),apiSecret:row.encryptedApiSecret&&row.secretIv?await decryptSecret(userId,"secret",row.encryptedApiSecret,row.secretIv):"",updatedAt:row.updatedAt};
}

export async function getStoredVideoGenerationConfigSummary(userId:string){
  const row=await getDb().select({providerId:videoGenerationConfigs.providerId,apiBaseUrl:videoGenerationConfigs.apiBaseUrl,model:videoGenerationConfigs.modelId,encryptedApiSecret:videoGenerationConfigs.encryptedApiSecret,updatedAt:videoGenerationConfigs.updatedAt}).from(videoGenerationConfigs).where(eq(videoGenerationConfigs.userId,userId)).get();
  return row?{providerId:row.providerId,apiBaseUrl:row.apiBaseUrl,model:row.model,updatedAt:row.updatedAt,hasApiKey:true,hasApiSecret:Boolean(row.encryptedApiSecret)}:null;
}

export async function saveStoredVideoGenerationConfig(userId:string,input:{providerId:string;apiBaseUrl:string;model:string;apiKey?:string;apiSecret?:string}){
  const existing=await getDb().select().from(videoGenerationConfigs).where(eq(videoGenerationConfigs.userId,userId)).get();
  let encryptedApiKey=existing?.encryptedApiKey,keyIv=existing?.keyIv,encryptedApiSecret=existing?.encryptedApiSecret||null,secretIv=existing?.secretIv||null;
  if(input.apiKey){const encrypted=await encryptSecret(userId,"key",input.apiKey);encryptedApiKey=encrypted.encrypted;keyIv=encrypted.iv}
  else if(!existing||existing.providerId!==input.providerId||existing.apiBaseUrl!==input.apiBaseUrl)throw new Error("API_KEY_REQUIRED");
  if(input.apiSecret){const encrypted=await encryptSecret(userId,"secret",input.apiSecret);encryptedApiSecret=encrypted.encrypted;secretIv=encrypted.iv}
  const now=new Date();
  await getDb().insert(videoGenerationConfigs).values({userId,providerId:input.providerId,apiBaseUrl:input.apiBaseUrl,modelId:input.model,encryptedApiKey:encryptedApiKey!,keyIv:keyIv!,encryptedApiSecret,secretIv,createdAt:existing?.createdAt||now,updatedAt:now}).onConflictDoUpdate({target:videoGenerationConfigs.userId,set:{providerId:input.providerId,apiBaseUrl:input.apiBaseUrl,modelId:input.model,encryptedApiKey:encryptedApiKey!,keyIv:keyIv!,encryptedApiSecret,secretIv,updatedAt:now}}).run();
  return getStoredVideoGenerationConfigSummary(userId);
}

export async function deleteStoredVideoGenerationConfig(userId:string){await getDb().delete(videoGenerationConfigs).where(eq(videoGenerationConfigs.userId,userId)).run()}
