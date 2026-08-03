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
  assert.match(studio, /imageWorkflow==="text-to-image"&&<><label className="field-label">02 \/ \{t\("imageIdea"\)\}/);
  assert.match(studio, /concept=workflow==="text-to-image"\?imageConcept\.trim\(\):imageBriefNotes\.trim\(\)/);
  assert.match(studio, /imageWorkflow==="text-to-image"&&!imageConcept\.trim\(\)/);
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

  assert.match(studio, /workspaceMode==="generate"/);
  assert.match(studio, /generateImagePrompt\(true\)/);
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
  assert.match(css, /\.render-studio/);
  assert.match(css, /\.image-render-mask\{/);
});

test("provides a manipulable 3D pose rig and pose-guided image rendering", async () => {
  const [studio, rig, presets, generationRoute, css, packageJson] = await Promise.all([
    source("../app/Studio.tsx"),
    source("../app/PoseRig.tsx"),
    source("../app/pose-presets.ts"),
    source("../app/api/generate/route.ts"),
    source("../app/globals.css"),
    source("../package.json"),
  ]);

  assert.match(studio, /workspaceMode==="pose"/);
  assert.match(studio, /lazy\(\(\)=>import\("\.\/PoseRig"\)\)/);
  assert.match(studio, /poseRigRef\.current\?\.capture\(\)/);
  assert.match(studio, /role:"composition"/);
  assert.match(studio, /generatePoseImage/);
  assert.match(rig, /OrbitControls/);
  assert.match(rig, /intersectObjects/);
  assert.match(rig, /applyPreset/);
  assert.match(rig, /applyPreset:preset=>\{const rig=activeRig\(\);if\(rig\)applyPose\(rig,preset\)/);
  assert.doesNotMatch(rig, /^\s*applyPreset,\s*$/m);
  assert.match(rig, /capture:\(\)=>apiRef\.current\.capture\(\)/);
  assert.match(rig, /applyJointMap:value=>apiRef\.current\.applyJointMap\(value\)/);
  assert.match(rig, /setRealistic:value=>apiRef\.current\.setRealistic\(value\)/);
  assert.match(rig, /solveTwoBone/);
  assert.match(rig, /realisticDrag/);
  assert.match(rig, /boneLength\(rig,parent,name\)/);
  assert.match(rig, /maxBend/);
  assert.match(rig, /createCharacter/);
  assert.match(rig, /addPerson:gender/);
  assert.match(rig, /setBodyType:gender/);
  assert.match(rig, /whiteMaterial/);
  assert.match(rig, /conformToTargets/);
  assert.match(rig, /toDataURL\("image\/png"\)/);
  assert.match(studio, /class PoseErrorBoundary/);
  assert.match(studio, /role="switch" aria-checked=\{poseRealistic\}/);
  assert.match(studio, /function selectPosePreset/);
  assert.match(studio, /function mirrorCurrentPose/);
  assert.match(studio, /function resetCurrentPose/);
  assert.match(studio, /realistic=\{poseRealistic\}/);
  assert.match(studio, /mode:"pose-estimation"/);
  assert.match(studio, /estimatePoseFromImage/);
  assert.match(studio, /POSE_PRESET_LIBRARY\.filter/);
  assert.match(studio, /poseGender===gender/);
  assert.match(studio, /posePeople\.map/);
  assert.match(studio, /poseLowConfidence/);
  assert.match(generationRoute, /poseEstimationSchema/);
  assert.match(generationRoute, /mode !== "pose-estimation"/);
  assert.match(generationRoute, /人体关键点不完整/);
  for(const base of ["relaxed","contrapposto","handsHips","sprint","jump","guard","chair","crossLegged","leanForward","overhead","sideBend","lunge"])assert.match(presets,new RegExp(`"${base}"`));
  assert.match(presets, /\["female","male"\]/);
  assert.match(packageJson, /"three"/);
  assert.match(css, /\.pose-studio\{/);
  assert.match(css, /\.pose-rig-canvas/);
  assert.match(css, /\.pose-anatomy-mode\.enabled/);
  assert.match(css, /\.pose-photo-motion/);
  assert.match(css, /\.pose-subpreset-grid/);
  assert.match(css, /\.pose-people-manager/);
});

test("uses a model-backed idea mentor and removes local story templates", async () => {
  const [studio, generationRoute, css] = await Promise.all([
    source("../app/Studio.tsx"),
    source("../app/api/generate/route.ts"),
    source("../app/globals.css"),
  ]);
  assert.match(studio, /mode:"idea-mentor"/);
  assert.match(studio, /askIdeaMentor/);
  assert.match(studio, /switchWorkspace/);
  assert.doesNotMatch(studio, /genreProfiles|styleProfiles|buildStory|buildShots|const ideas/);
  assert.match(generationRoute, /ideaMentorSchema/);
  assert.match(generationRoute, /mode !== "idea-mentor"/);
  assert.match(css, /::view-transition-new\(studio-workspace\)/);
  assert.match(css, /\.mentor-suggestion/);
});

test("enforces request boundaries on every mutating account and generation API", async () => {
  const routes = await Promise.all([
    source("../app/api/model-config/route.ts"),
    source("../app/api/image-config/route.ts"),
    source("../app/api/models/route.ts"),
    source("../app/api/generate/route.ts"),
    source("../app/api/generate-image/route.ts"),
  ]);

  for (const route of routes) {
    assert.match(route, /rejectCrossSiteMutation\(request\)/);
    assert.match(route, /enforceRateLimit\(user\.userId/);
    assert.match(route, /readJsonBody\(request,/);
  }
});

test("hardens provider URLs, API keys, remote downloads, and global responses", async () => {
  const [security, models, generate, generateImage, worker, schema, migration] = await Promise.all([
    source("../app/api-security.ts"),
    source("../app/api/models/route.ts"),
    source("../app/api/generate/route.ts"),
    source("../app/api/generate-image/route.ts"),
    source("../worker/index.ts"),
    source("../db/schema.ts"),
    source("../drizzle/0002_friendly_molten_man.sql"),
  ]);

  for (const blocked of ["localhost", "metadata.google.internal", ".internal", "169&&b===254", "2001:db8"]) {
    assert.match(security, new RegExp(blocked.replaceAll(".", "\\.")));
  }
  assert.match(security, /url\.username\|\|url\.password/);
  assert.match(security, /new URL\(value\)\.hostname\.toLowerCase\(\)===new URL\(officialBaseUrl\)/);
  assert.match(models, /"x-goog-api-key"/);
  assert.match(generate, /"x-goog-api-key"/);
  assert.doesNotMatch(`${models}\n${generate}`, /\?key=\$\{/);
  assert.match(generateImage, /redirect:"manual"/);
  assert.match(generateImage, /redirects<=3/);
  for (const header of ["Content-Security-Policy", "Strict-Transport-Security", "X-Frame-Options", "Permissions-Policy", "X-Content-Type-Options"]) {
    assert.match(worker, new RegExp(header));
  }
  assert.match(schema, /apiRateLimits/);
  assert.match(migration, /CREATE TABLE `api_rate_limits`/);
});

test("adds keyboard navigation, visible focus states, and background GPU throttling", async () => {
  const [studio, rig, css] = await Promise.all([
    source("../app/Studio.tsx"),
    source("../app/PoseRig.tsx"),
    source("../app/globals.css"),
  ]);

  assert.match(studio, /className="studio-switcher"/);
  assert.match(studio, /event\.altKey/);
  assert.match(studio, /event\.key==="Escape"/);
  assert.match(studio, /className="skip-link"/);
  assert.match(studio, /aria-live="polite"/);
  assert.match(css, /:focus-visible/);
  assert.match(rig, /IntersectionObserver/);
  assert.match(rig, /visibilitychange/);
});
