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
