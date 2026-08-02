import { eq } from "drizzle-orm";
import { getDb } from "./index";
import { modelConfigs } from "./schema";

const encoder = new TextEncoder();

function bytesToBase64(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function base64ToBytes(value: string) {
  const binary = atob(value);
  return Uint8Array.from(binary, char => char.charCodeAt(0));
}

async function encryptionKey() {
  const secret = process.env.FRAME_KEY_ENCRYPTION_SECRET;
  if (!secret) throw new Error("FRAME_KEY_ENCRYPTION_SECRET is not configured");
  const material = base64ToBytes(secret);
  if (material.byteLength !== 32) throw new Error("FRAME_KEY_ENCRYPTION_SECRET must decode to 32 bytes");
  return crypto.subtle.importKey("raw", material, { name:"AES-GCM" }, false, ["encrypt", "decrypt"]);
}

async function encryptApiKey(userId:string, apiKey:string) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = await crypto.subtle.encrypt(
    { name:"AES-GCM", iv, additionalData:encoder.encode(userId) },
    await encryptionKey(),
    encoder.encode(apiKey),
  );
  return { encryptedApiKey:bytesToBase64(new Uint8Array(cipher)), keyIv:bytesToBase64(iv) };
}

async function decryptApiKey(userId:string, encryptedApiKey:string, keyIv:string) {
  const plain = await crypto.subtle.decrypt(
    { name:"AES-GCM", iv:base64ToBytes(keyIv), additionalData:encoder.encode(userId) },
    await encryptionKey(),
    base64ToBytes(encryptedApiKey),
  );
  return new TextDecoder().decode(plain);
}

export async function getStoredModelConfig(userId:string) {
  const row = await getDb().select().from(modelConfigs).where(eq(modelConfigs.userId,userId)).get();
  if (!row) return null;
  return {
    providerId:row.providerId,
    apiBaseUrl:row.apiBaseUrl,
    model:row.modelId,
    apiKey:await decryptApiKey(userId,row.encryptedApiKey,row.keyIv),
    updatedAt:row.updatedAt,
  };
}

export async function getStoredModelConfigSummary(userId:string) {
  const row = await getDb().select({providerId:modelConfigs.providerId,apiBaseUrl:modelConfigs.apiBaseUrl,model:modelConfigs.modelId,updatedAt:modelConfigs.updatedAt}).from(modelConfigs).where(eq(modelConfigs.userId,userId)).get();
  return row ? { ...row, hasApiKey:true } : null;
}

export async function saveStoredModelConfig(userId:string, input:{providerId:string;apiBaseUrl:string;model:string;apiKey?:string}) {
  const existing = await getDb().select().from(modelConfigs).where(eq(modelConfigs.userId,userId)).get();
  let encryptedApiKey=existing?.encryptedApiKey;
  let keyIv=existing?.keyIv;

  if(input.apiKey){
    const encrypted=await encryptApiKey(userId,input.apiKey);
    encryptedApiKey=encrypted.encryptedApiKey;
    keyIv=encrypted.keyIv;
  }else if(!existing||existing.providerId!==input.providerId||existing.apiBaseUrl!==input.apiBaseUrl){
    throw new Error("API_KEY_REQUIRED");
  }

  const now=new Date();
  await getDb().insert(modelConfigs).values({userId,providerId:input.providerId,apiBaseUrl:input.apiBaseUrl,modelId:input.model,encryptedApiKey:encryptedApiKey!,keyIv:keyIv!,createdAt:existing?.createdAt||now,updatedAt:now}).onConflictDoUpdate({target:modelConfigs.userId,set:{providerId:input.providerId,apiBaseUrl:input.apiBaseUrl,modelId:input.model,encryptedApiKey:encryptedApiKey!,keyIv:keyIv!,updatedAt:now}}).run();
  return getStoredModelConfigSummary(userId);
}

export async function deleteStoredModelConfig(userId:string) {
  await getDb().delete(modelConfigs).where(eq(modelConfigs.userId,userId)).run();
}
