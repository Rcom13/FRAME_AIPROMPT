import { eq } from "drizzle-orm";
import { getDb } from "./index";
import { comfyBackendConfigs } from "./schema";

export type ComfyBackendMode = "cloud" | "remote";
export type ComfyAuthMode = "none" | "x-api-key" | "bearer";

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
  return crypto.subtle.importKey("raw", material, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}

async function encryptSecret(userId: string, value: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv, additionalData: encoder.encode(`comfy:${userId}`) },
    await encryptionKey(),
    encoder.encode(value),
  );
  return { encryptedApiKey: bytesToBase64(new Uint8Array(cipher)), keyIv: bytesToBase64(iv) };
}

async function decryptSecret(userId: string, encryptedApiKey: string, keyIv: string) {
  const plain = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: base64ToBytes(keyIv), additionalData: encoder.encode(`comfy:${userId}`) },
    await encryptionKey(),
    base64ToBytes(encryptedApiKey),
  );
  return new TextDecoder().decode(plain);
}

export async function getStoredComfyConfig(userId: string) {
  const row = await getDb().select().from(comfyBackendConfigs).where(eq(comfyBackendConfigs.userId, userId)).get();
  if (!row) return null;
  return {
    mode: row.mode as ComfyBackendMode,
    baseUrl: row.baseUrl,
    authMode: row.authMode as ComfyAuthMode,
    apiKey: await decryptSecret(userId, row.encryptedApiKey, row.keyIv),
    updatedAt: row.updatedAt,
  };
}

export async function getStoredComfyConfigSummary(userId: string) {
  const row = await getDb().select({
    mode: comfyBackendConfigs.mode,
    baseUrl: comfyBackendConfigs.baseUrl,
    authMode: comfyBackendConfigs.authMode,
    updatedAt: comfyBackendConfigs.updatedAt,
  }).from(comfyBackendConfigs).where(eq(comfyBackendConfigs.userId, userId)).get();
  return row ? { ...row, hasApiKey: row.authMode !== "none" } : null;
}

export async function saveStoredComfyConfig(userId: string, input: {
  mode: ComfyBackendMode;
  baseUrl: string;
  authMode: ComfyAuthMode;
  apiKey?: string;
}) {
  const existing = await getDb().select().from(comfyBackendConfigs).where(eq(comfyBackendConfigs.userId, userId)).get();
  const sameConnection = existing && existing.mode === input.mode && existing.baseUrl === input.baseUrl && existing.authMode === input.authMode;
  let encryptedApiKey = sameConnection ? existing.encryptedApiKey : undefined;
  let keyIv = sameConnection ? existing.keyIv : undefined;
  if (input.apiKey !== undefined) {
    const encrypted = await encryptSecret(userId, input.apiKey);
    encryptedApiKey = encrypted.encryptedApiKey;
    keyIv = encrypted.keyIv;
  } else if (input.authMode === "none") {
    const encrypted = await encryptSecret(userId, "");
    encryptedApiKey = encrypted.encryptedApiKey;
    keyIv = encrypted.keyIv;
  } else if (!encryptedApiKey || !keyIv) {
    throw new Error("API_KEY_REQUIRED");
  }

  const now = new Date();
  await getDb().insert(comfyBackendConfigs).values({
    userId,
    mode: input.mode,
    baseUrl: input.baseUrl,
    authMode: input.authMode,
    encryptedApiKey: encryptedApiKey!,
    keyIv: keyIv!,
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  }).onConflictDoUpdate({
    target: comfyBackendConfigs.userId,
    set: {
      mode: input.mode,
      baseUrl: input.baseUrl,
      authMode: input.authMode,
      encryptedApiKey: encryptedApiKey!,
      keyIv: keyIv!,
      updatedAt: now,
    },
  }).run();
  return getStoredComfyConfigSummary(userId);
}

export async function deleteStoredComfyConfig(userId: string) {
  await getDb().delete(comfyBackendConfigs).where(eq(comfyBackendConfigs.userId, userId)).run();
}
