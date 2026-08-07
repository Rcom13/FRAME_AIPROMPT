import { and, desc, eq } from "drizzle-orm";
import { getDb } from "./index";
import { modelServiceConnections } from "./schema";

export type ModelServiceKind="language"|"image"|"video";
export type ModelServiceInput={id?:string;kind:ModelServiceKind;label:string;providerId:string;apiBaseUrl:string;model:string;apiKey?:string;apiSecret?:string};

const encoder=new TextEncoder();
function bytesToBase64(bytes:Uint8Array){let binary="";for(const byte of bytes)binary+=String.fromCharCode(byte);return btoa(binary)}
function base64ToBytes(value:string){const binary=atob(value);return Uint8Array.from(binary,char=>char.charCodeAt(0))}
async function encryptionKey(){const secret=process.env.FRAME_KEY_ENCRYPTION_SECRET;if(!secret)throw new Error("FRAME_KEY_ENCRYPTION_SECRET is not configured");const material=base64ToBytes(secret);if(material.byteLength!==32)throw new Error("FRAME_KEY_ENCRYPTION_SECRET must decode to 32 bytes");return crypto.subtle.importKey("raw",material,{name:"AES-GCM"},false,["encrypt","decrypt"])}
async function encrypt(userId:string,id:string,label:string,value:string){const iv=crypto.getRandomValues(new Uint8Array(12));const cipher=await crypto.subtle.encrypt({name:"AES-GCM",iv,additionalData:encoder.encode(`service:${id}:${label}:${userId}`)},await encryptionKey(),encoder.encode(value));return{value:bytesToBase64(new Uint8Array(cipher)),iv:bytesToBase64(iv)}}
async function decrypt(userId:string,id:string,label:string,value:string,iv:string){const plain=await crypto.subtle.decrypt({name:"AES-GCM",iv:base64ToBytes(iv),additionalData:encoder.encode(`service:${id}:${label}:${userId}`)},await encryptionKey(),base64ToBytes(value));return new TextDecoder().decode(plain)}
function summary(row:typeof modelServiceConnections.$inferSelect){return{id:row.id,kind:row.kind as ModelServiceKind,label:row.label,providerId:row.providerId,apiBaseUrl:row.apiBaseUrl,model:row.modelId,hasApiKey:true,hasApiSecret:Boolean(row.encryptedApiSecret),updatedAt:row.updatedAt}}

export async function listModelServices(userId:string){const rows=await getDb().select().from(modelServiceConnections).where(eq(modelServiceConnections.userId,userId)).orderBy(desc(modelServiceConnections.updatedAt)).all();return rows.map(summary)}
export async function getModelService(userId:string,id:string){const row=await getDb().select().from(modelServiceConnections).where(and(eq(modelServiceConnections.userId,userId),eq(modelServiceConnections.id,id))).get();if(!row)return null;return{...summary(row),apiKey:await decrypt(userId,row.id,"key",row.encryptedApiKey,row.keyIv),apiSecret:row.encryptedApiSecret&&row.secretIv?await decrypt(userId,row.id,"secret",row.encryptedApiSecret,row.secretIv):""}}
export async function saveModelService(userId:string,input:ModelServiceInput){
  const id=input.id||crypto.randomUUID();const existing=input.id?await getDb().select().from(modelServiceConnections).where(and(eq(modelServiceConnections.userId,userId),eq(modelServiceConnections.id,id))).get():null;
  if(input.id&&!existing)throw new Error("CONNECTION_NOT_FOUND");
  let encryptedApiKey=existing?.encryptedApiKey,keyIv=existing?.keyIv,encryptedApiSecret=existing?.encryptedApiSecret||null,secretIv=existing?.secretIv||null;
  if(input.apiKey){const encrypted=await encrypt(userId,id,"key",input.apiKey);encryptedApiKey=encrypted.value;keyIv=encrypted.iv}else if(!existing||existing.providerId!==input.providerId||existing.apiBaseUrl!==input.apiBaseUrl)throw new Error("API_KEY_REQUIRED");
  if(input.apiSecret){const encrypted=await encrypt(userId,id,"secret",input.apiSecret);encryptedApiSecret=encrypted.value;secretIv=encrypted.iv}
  const now=new Date();await getDb().insert(modelServiceConnections).values({id,userId,kind:input.kind,label:input.label,providerId:input.providerId,apiBaseUrl:input.apiBaseUrl,modelId:input.model,encryptedApiKey:encryptedApiKey!,keyIv:keyIv!,encryptedApiSecret,secretIv,createdAt:existing?.createdAt||now,updatedAt:now}).onConflictDoUpdate({target:modelServiceConnections.id,set:{kind:input.kind,label:input.label,providerId:input.providerId,apiBaseUrl:input.apiBaseUrl,modelId:input.model,encryptedApiKey:encryptedApiKey!,keyIv:keyIv!,encryptedApiSecret,secretIv,updatedAt:now}}).run();
  const row=await getDb().select().from(modelServiceConnections).where(eq(modelServiceConnections.id,id)).get();return summary(row!);
}
export async function deleteModelService(userId:string,id:string){await getDb().delete(modelServiceConnections).where(and(eq(modelServiceConnections.userId,userId),eq(modelServiceConnections.id,id))).run()}
