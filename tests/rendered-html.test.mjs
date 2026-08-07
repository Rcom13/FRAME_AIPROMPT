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
  const [studio, visuals, css, layout] = await Promise.all([
    source("../app/Studio.tsx"),
    source("../app/WelcomeModuleVisual.tsx"),
    source("../app/globals.css"),
    source("../app/layout.tsx"),
  ]);

  assert.match(studio, /function IdeaField\(\)/);
  assert.match(studio, /<IdeaField\/>/);
  assert.doesNotMatch(studio, /labels\[locale\]\[index\]/);
  assert.doesNotMatch(studio, /<b>\{labels\[locale\]\[index\]\}<\/b>/);
  assert.doesNotMatch(studio, /<em>\{String\(index\+1\)\.padStart\(2,"0"\)\}<\/em>/);
  assert.match(css, /\.idea-field\{/);
  for (const mode of ["clean-backdrop", "orbital-backdrop", "neural-backdrop"]) {
    assert.match(studio, new RegExp(mode));
  }
  assert.match(css, /main\.backdrop-globe\{/);
  assert.match(css, /main\.backdrop-mind\{/);
  assert.match(css, /@keyframes worldOrbit/);
  assert.match(css, /@keyframes neuralSignal/);
  assert.match(css, /@keyframes thoughtTrace/);
  assert.match(visuals, /className="preview-stage"/);
  assert.match(css, /aspect-ratio:4\/1/);
  assert.match(css, /@container\(max-width:390px\)/);
  assert.match(css, /grid-template-columns:1fr;gap:14px/);
  assert.match(layout, /viewportFit:\s*"cover"/);
  assert.match(css, /@keyframes signalTravel/);
  for (const visual of ["story", "workflow", "render", "video"]) {
    assert.match(studio, new RegExp(`WelcomeModuleVisual type="${visual}"`));
  }
  assert.match(studio, /onPointerMove=\{moveModuleCard\}/);
  assert.match(visuals, /GRAPH ONLINE/);
  assert.match(visuals, /VIDEO ENGINE READY/);
  assert.match(css, /@keyframes graphPacket/);
  assert.match(css, /@keyframes rigBodyFloat/);
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

test("stores a dedicated encrypted video engine and runs asynchronous video tasks", async () => {
  const [studio, videoStudio, configRoute, generationRoute, storage, schema, migration, providers, css] = await Promise.all([
    source("../app/Studio.tsx"),
    source("../app/VideoStudio.tsx"),
    source("../app/api/video-config/route.ts"),
    source("../app/api/generate-video/route.ts"),
    source("../db/video-generation-config.ts"),
    source("../db/schema.ts"),
    source("../drizzle/0004_flimsy_rafael_vega.sql"),
    source("../app/video-generation-providers.ts"),
    source("../app/video-studio.css"),
  ]);

  assert.match(studio, /workspaceMode==="video"/);
  assert.match(studio, /function prepareStoryForVideo/);
  assert.match(studio, /fetch\("\/api\/video-config"/);
  assert.match(videoStudio, /fetch\("\/api\/generate-video"/);
  for (const workflow of ["text-to-video", "image-to-video", "first-last-frame"]) assert.match(videoStudio, new RegExp(`"${workflow}"`));
  assert.match(configRoute, /saveStoredVideoGenerationConfig/);
  assert.match(storage, /AES-GCM/);
  assert.match(storage, /video:\$\{label\}:\$\{userId\}/);
  assert.match(storage, /encryptSecret\(userId,"secret"/);
  assert.match(schema, /videoGenerationConfigs/);
  assert.match(migration, /CREATE TABLE `video_generation_configs`/);
  for (const protocol of ["runway-video", "openai-video", "gemini-veo", "kling-video"]) assert.match(providers, new RegExp(`protocol:"${protocol}"`));
  for (const brand of ["Runway", "OpenAI Sora", "Google Veo", "Kling AI"]) assert.match(providers, new RegExp(brand));
  assert.match(providers, /logo:/);
  for (const protocol of ["runway-video", "openai-video", "gemini-veo"]) assert.match(generationRoute, new RegExp(`provider\\.protocol==="${protocol}"`));
  assert.match(generationRoute, /klingJwt/);
  assert.match(generationRoute, /taskToken/);
  assert.match(css, /\.video-studio\{/);
  assert.match(css, /\.portal-video-preview\{/);
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
  assert.match(rig, /mannequinPalette/);
  assert.match(rig, /surfaceMaterial/);
  assert.match(rig, /hitTargets/);
  assert.match(rig, /paintJoint\(hit\.rig,hit\.joint,"hover"\)/);
  assert.match(rig, /bodyBasis/);
  assert.match(rig, /shoulderL:24/);
  assert.match(rig, /kneeL:132/);
  assert.match(rig, /chainSwingLimits/);
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
  for(const base of ["relaxed","contrapposto","handsHips","sprint","jump","guard","chair","crossLegged","leanForward","overhead","sideBend","lunge","supine","sideLying","prone"])assert.match(presets,new RegExp(`"${base}"`));
  for(const method of ["setView","setFacing","setDragAxis"])assert.match(rig,new RegExp(`${method}:`));
  assert.match(rig, /dragAxis==="z"/);
  assert.match(rig, /positions:Record<RigView/);
  assert.match(studio, /poseCategoryLying/);
  assert.match(studio, /changePoseView/);
  assert.match(studio, /changePoseFacing/);
  assert.match(studio, /changePoseDragAxis/);
  assert.match(presets, /\["female","male"\]/);
  assert.match(packageJson, /"three"/);
  assert.match(css, /\.pose-studio\{/);
  assert.match(css, /\.pose-rig-canvas/);
  assert.match(css, /\.pose-anatomy-mode\.enabled/);
  assert.match(css, /\.pose-photo-motion/);
  assert.match(css, /\.pose-subpreset-grid/);
  assert.match(css, /\.pose-people-manager/);
});

test("connects Story, official ComfyUI, Render, and Pose into a production pipeline", async () => {
  const [studio, comfy, connection, configRoute, comfyStore, worker, generate, css, comfyCss, sourceNotice, officialIndex] = await Promise.all([
    source("../app/Studio.tsx"),
    source("../app/ComfyWorkflowStudio.tsx"),
    source("../app/ComfyConnectionSettings.tsx"),
    source("../app/api/comfy-config/route.ts"),
    source("../db/comfy-config.ts"),
    source("../worker/index.ts"),
    source("../app/api/generate/route.ts"),
    source("../app/globals.css"),
    source("../app/comfy-workflow.css"),
    source("../public/comfy/SOURCE.md"),
    source("../public/comfy/index.html"),
  ]);

  assert.match(studio, /function prepareStoryForComfy/);
  assert.match(studio, /prepareStoryForComfy\(shot\)/);
  assert.match(studio, /ComfyWorkflowStudio/);
  assert.match(comfy, /starterWorkflow/);
  assert.match(comfy, /downloadStarterWorkflow/);
  assert.match(comfy, /src="\/comfy\/index\.html"/);
  assert.match(comfy, /<iframe/);
  assert.match(comfy, /allow-scripts allow-same-origin allow-forms allow-downloads/);
  assert.match(comfy, /COMFYUI FRONTEND v1\.50\.0/);
  assert.doesNotMatch(comfy, /normalizeUiWorkflow|onResizePointerDown|comfy-node-resize/);
  assert.doesNotMatch(comfy, /cloud\.comfy\.org.*iframe|src=\{.*cloud/i);
  assert.match(connection, /\/api\/comfy-config/);
  assert.match(connection, /COMFY_CONFIG_EVENT/);
  assert.match(configRoute, /testConnection/);
  assert.match(configRoute, /\/api\/object_info/);
  assert.match(comfyStore, /AES-GCM/);
  assert.match(comfyStore, /comfy_backend_configs|comfyBackendConfigs/);
  assert.match(worker, /proxyComfyRequest/);
  assert.match(worker, /injectCloudPromptKey/);
  assert.match(worker, /url\.pathname === "\/comfy\/ws"/);
  assert.match(sourceNotice, /ComfyUI_frontend\/tree\/v1\.50\.0/);
  assert.match(officialIndex, /id="vue-app"/);
  assert.match(officialIndex, /Loading ComfyUI/);
  assert.match(studio, /function renderPipelineImage/);
  assert.match(studio, /function sendPoseToRender/);
  assert.match(studio, /pipelineRenderPrompt\?renderPipelineImage\(\):generateImagePrompt\(true\)/);
  assert.match(generate, /reasoningEffort:isStory\|\|isPoseEstimation\?"medium":"low"/);
  assert.match(generate, /isPoseEstimation\?2500:2600/);
  assert.match(css, /\.pipeline-banner\{/);
  assert.match(css, /\.pose-navigation\{/);
  assert.match(comfyCss, /\.real-comfy-studio\{/);
  assert.match(comfyCss, /\.real-comfy-frame iframe\{/);
  assert.match(comfyCss, /\.real-comfy-bridge\{/);
  assert.match(comfyCss, /\.comfy-connection-settings\{/);
  assert.doesNotMatch(comfyCss, /\.comfy-node\{/);
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
    source("../app/api/video-config/route.ts"),
    source("../app/api/generate-video/route.ts"),
    source("../app/api/comfy-config/route.ts"),
  ]);

  for (const route of routes) {
    assert.match(route, /rejectCrossSiteMutation\(request\)/);
    assert.match(route, /enforceRateLimit\(user\.userId/);
    assert.match(route, /readJsonBody\(request,/);
  }

  const [security, auth] = await Promise.all([
    source("../app/api-security.ts"),
    source("../app/chatgpt-auth.ts"),
  ]);
  assert.match(security, /site&&site!=="same-origin"/);
  assert.doesNotMatch(security, /same-site/);
  assert.doesNotMatch(security, /site==="none"/);
  assert.doesNotMatch(auth, /FRAME_EDGE_TRUST_SECRET|x-frame-edge-secret/);
});

test("hardens provider URLs, API keys, remote downloads, and global responses", async () => {
  const [security, models, generate, generateImage, generateVideo, worker, schema, migration, comfyMigration, videoMigration] = await Promise.all([
    source("../app/api-security.ts"),
    source("../app/api/models/route.ts"),
    source("../app/api/generate/route.ts"),
    source("../app/api/generate-image/route.ts"),
    source("../app/api/generate-video/route.ts"),
    source("../worker/index.ts"),
    source("../db/schema.ts"),
    source("../drizzle/0002_friendly_molten_man.sql"),
    source("../drizzle/0003_absent_shiver_man.sql"),
    source("../drizzle/0004_flimsy_rafael_vega.sql"),
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
  assert.match(generateVideo, /isSafePublicHttps/);
  for (const header of ["Content-Security-Policy", "Strict-Transport-Security", "X-Frame-Options", "Permissions-Policy", "X-Content-Type-Options"]) {
    assert.match(worker, new RegExp(header));
  }
  assert.match(schema, /apiRateLimits/);
  assert.match(migration, /CREATE TABLE `api_rate_limits`/);
  assert.match(schema, /comfyBackendConfigs/);
  assert.match(comfyMigration, /CREATE TABLE `comfy_backend_configs`/);
  assert.match(schema, /videoGenerationConfigs/);
  assert.match(videoMigration, /CREATE TABLE `video_generation_configs`/);
});

test("adds keyboard and outside-click navigation, visible focus states, and background GPU throttling", async () => {
  const [studio, rig, css] = await Promise.all([
    source("../app/Studio.tsx"),
    source("../app/PoseRig.tsx"),
    source("../app/globals.css"),
  ]);

  assert.match(studio, /className="studio-switcher"/);
  assert.match(studio, /event\.altKey/);
  assert.match(studio, /event\.key==="Escape"/);
  assert.match(studio, /document\.addEventListener\("pointerdown",onPointerDown,true\)/);
  assert.match(studio, /closest\("\[data-topbar-popover\]"\)/);
  assert.match(studio, /className="popover-dismiss-layer"/);
  assert.match(studio, /aria-expanded=\{profileOpen\}/);
  assert.match(studio, /className="skip-link"/);
  assert.match(studio, /aria-live="polite"/);
  assert.match(css, /:focus-visible/);
  assert.match(css, /\.popover-dismiss-layer\{/);
  assert.match(rig, /IntersectionObserver/);
  assert.match(rig, /visibilitychange/);
});

test("gates external visitors and APIs behind a dedicated maintenance page", async () => {
  const [page, maintenance, maintenancePage, css, ...routes] = await Promise.all([
    source("../app/page.tsx"),
    source("../app/maintenance.ts"),
    source("../app/MaintenancePage.tsx"),
    source("../app/globals.css"),
    source("../app/api/models/route.ts"),
    source("../app/api/model-config/route.ts"),
    source("../app/api/image-config/route.ts"),
    source("../app/api/generate/route.ts"),
    source("../app/api/generate-image/route.ts"),
    source("../app/api/video-config/route.ts"),
    source("../app/api/generate-video/route.ts"),
    source("../app/api/comfy-config/route.ts"),
  ]);

  assert.match(page, /maintenanceModeEnabled\(\) && !isMaintenanceOwner\(account\)/);
  assert.match(page, /<MaintenancePage/);
  assert.match(maintenance, /SITE_MAINTENANCE_MODE/);
  assert.match(maintenance, /SITE_MAINTENANCE_OWNER_EMAILS/);
  assert.match(maintenance, /status: 503/);
  assert.match(maintenancePage, /SYSTEM MAINTENANCE/);
  assert.match(maintenancePage, /PUBLIC ACCESS/);
  assert.match(css, /\.maintenance-shell\{/);
  assert.match(css, /@keyframes maintenanceOrbit/);
  for (const route of routes) {
    assert.match(route, /maintenanceResponse/);
    assert.match(route, /if\(maintenance\)return maintenance/);
  }
});
