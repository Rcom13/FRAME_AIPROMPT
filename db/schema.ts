import { index, sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const modelConfigs = sqliteTable("model_configs", {
  userId: text("user_id").primaryKey(),
  providerId: text("provider_id").notNull(),
  apiBaseUrl: text("api_base_url").notNull(),
  modelId: text("model_id").notNull(),
  encryptedApiKey: text("encrypted_api_key").notNull(),
  keyIv: text("key_iv").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});

export const imageGenerationConfigs = sqliteTable("image_generation_configs", {
  userId: text("user_id").primaryKey(),
  providerId: text("provider_id").notNull(),
  apiBaseUrl: text("api_base_url").notNull(),
  modelId: text("model_id").notNull(),
  encryptedApiKey: text("encrypted_api_key").notNull(),
  keyIv: text("key_iv").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});

export const videoGenerationConfigs = sqliteTable("video_generation_configs", {
  userId: text("user_id").primaryKey(),
  providerId: text("provider_id").notNull(),
  apiBaseUrl: text("api_base_url").notNull(),
  modelId: text("model_id").notNull(),
  encryptedApiKey: text("encrypted_api_key").notNull(),
  keyIv: text("key_iv").notNull(),
  encryptedApiSecret: text("encrypted_api_secret"),
  secretIv: text("secret_iv"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});

export const comfyBackendConfigs = sqliteTable("comfy_backend_configs", {
  userId: text("user_id").primaryKey(),
  mode: text("mode").notNull(),
  baseUrl: text("base_url").notNull(),
  authMode: text("auth_mode").notNull(),
  encryptedApiKey: text("encrypted_api_key").notNull(),
  keyIv: text("key_iv").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});

export const apiRateLimits = sqliteTable("api_rate_limits", {
  bucket: text("bucket").primaryKey(),
  count: integer("count").notNull(),
  expiresAt: integer("expires_at").notNull(),
}, table=>[index("idx_api_rate_limits_expires_at").on(table.expiresAt)]);
