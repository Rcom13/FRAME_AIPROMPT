import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

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
