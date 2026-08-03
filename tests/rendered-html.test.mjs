import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = path => readFile(new URL(path, import.meta.url), "utf8");

test("keeps model credentials in encrypted account storage", async () => {
  const [studio, route, storage, schema] = await Promise.all([
    source("../app/Studio.tsx"),
    source("../app/api/model-config/route.ts"),
    source("../db/model-config.ts"),
    source("../db/schema.ts"),
  ]);

  assert.doesNotMatch(studio, /sessionStorage\.setItem\s*\(/);
  assert.match(studio, /fetch\("\/api\/model-config"/);
  assert.match(studio, /translate\(activeLocale,"restored"\)/);
  assert.match(route, /export async function GET\(/);
  assert.match(route, /export async function POST\(/);
  assert.match(route, /export async function DELETE\(/);
  assert.match(storage, /AES-GCM/);
  assert.match(storage, /additionalData:encoder\.encode\(userId\)/);
  assert.match(schema, /userId:\s*text\("user_id"\)\.primaryKey\(\)/);
});

test("renders a divergent thought field on the welcome workspace", async () => {
  const [studio, css] = await Promise.all([
    source("../app/Studio.tsx"),
    source("../app/globals.css"),
  ]);

  assert.match(studio, /function IdeaField\(\{locale\}/);
  assert.match(studio, /<IdeaField locale=\{locale\}\/>/);
  assert.match(studio, /\["CHARACTER","CONFLICT","SHOT","RHYTHM","EMOTION","WORLD","MOTIF","SOUND","TURN"\]/);
  assert.match(css, /\.idea-field\{/);
  assert.match(css, /@keyframes thoughtTrace/);
  assert.match(css, /@keyframes signalTravel/);
  assert.match(css, /prefers-reduced-motion:reduce/);
});

test("supports four persistent UI languages and forwards output language", async () => {
  const [studio, i18n, generate] = await Promise.all([
    source("../app/Studio.tsx"),
    source("../app/i18n.ts"),
    source("../app/api/generate/route.ts"),
  ]);

  for (const locale of ["zh-CN", "zh-TW", "ja", "en"]) {
    assert.match(i18n, new RegExp(`id:\"${locale}\"`));
  }
  assert.match(studio, /localStorage\.setItem\("frame-locale",value\)/);
  assert.match(studio, /mode:\"story\",locale/);
  assert.match(studio, /mode:\"image-prompt\",locale/);
  assert.match(generate, /本次输出语言/);
  assert.match(generate, /outputLanguage\[locale\]/);
});

test("supports text, single-image, and multi-reference image prompt workflows", async () => {
  const [studio, i18n, generate, css] = await Promise.all([
    source("../app/Studio.tsx"),
    source("../app/i18n.ts"),
    source("../app/api/generate/route.ts"),
    source("../app/globals.css"),
  ]);

  for (const workflow of ["text-to-image", "image-to-image", "multi-reference"]) {
    assert.match(studio, new RegExp(`"${workflow}"`));
  }
  assert.match(studio, /multiple=\{imageWorkflow==="multi-reference"\}/);
  assert.match(studio, /referenceImages:references\.map/);
  assert.match(studio, /referenceRoleLabel\(locale,role\)/);
  assert.match(i18n, /workflowMultiDesc/);
  assert.match(generate, /for \(const image of images\)/);
  assert.match(generate, /多参考图生图模式需要上传 2–6 张参考图/);
  assert.match(generate, /逐张独立分析/);
  assert.match(css, /\.image-workflow-switch\{/);
  assert.match(css, /\.reference-grid\{/);
  assert.match(css, /\.canvas-reference-strip\{/);
});

test("stores a separate encrypted image engine and can render real images", async () => {
  const [studio, configRoute, generationRoute, storage, schema, migration, providers, css] = await Promise.all([
    source("../app/Studio.tsx"),
    source("../app/api/image-config/route.ts"),
    source("../app/api/generate-image/route.ts"),
    source("../db/image-generation-config.ts"),
    source("../db/schema.ts"),
    source("../drizzle/0001_abnormal_puma.sql"),
    source("../app/image-generation-providers.ts"),
    source("../app/globals.css"),
  ]);

  assert.match(studio, /directImageEnabled/);
  assert.match(studio, /fetch\("\/api\/generate-image"/);
  assert.match(studio, /downloadGeneratedImage/);
  assert.match(studio, /generated-artwork/);
  assert.match(configRoute, /saveStoredImageGenerationConfig/);
  assert.match(configRoute, /getChatGPTUser/);
  assert.match(storage, /AES-GCM/);
  assert.match(storage, /additionalData:encoder\.encode\(`image:\$\{userId\}`\)/);
  assert.match(schema, /imageGenerationConfigs/);
  assert.match(migration, /CREATE TABLE `image_generation_configs`/);
  for (const protocol of ["openai-images", "runway", "gemini-images", "bfl"]) {
    assert.match(providers, new RegExp(`protocol:\"${protocol}\"`));
  }
  assert.match(generationRoute, /\/images\/generations/);
  assert.match(generationRoute, /\/images\/edits/);
  assert.match(generationRoute, /\/interactions/);
  assert.match(generationRoute, /\/text_to_image/);
  assert.match(generationRoute, /pollToken/);
  assert.match(css, /\.direct-image-toggle\{/);
  assert.match(css, /\.image-render-mask\{/);
});
