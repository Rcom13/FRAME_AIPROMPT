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
  assert.match(studio, /已从账户恢复加密模型配置/);
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

  assert.match(studio, /function IdeaField\(\)/);
  assert.match(studio, /<IdeaField\/>/);
  for (const label of ["角色", "冲突", "镜头", "节奏", "情绪", "世界", "意象", "声音", "转折"]) {
    assert.match(studio, new RegExp(`label:\"${label}\"`));
  }
  assert.match(css, /\.idea-field\{/);
  assert.match(css, /@keyframes thoughtTrace/);
  assert.match(css, /@keyframes signalTravel/);
  assert.match(css, /prefers-reduced-motion:reduce/);
});
