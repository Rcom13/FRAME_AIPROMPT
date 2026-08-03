import { getChatGPTUser } from "../../chatgpt-auth";
import { detectProvider, MODEL_PROVIDERS, normalizeBaseUrl, providerById } from "../../model-providers";
import { getStoredModelConfig } from "../../../db/model-config";
import { outputLanguage, type Locale } from "../../i18n";
import { apiReply, enforceRateLimit, isSafePublicHttps, matchesTrustedProviderHost, readJsonBody, rejectCrossSiteMutation, RequestValidationError, safeModelId } from "../../api-security";

export const dynamic = "force-dynamic";

type UserProviderConfig = { providerId:string; baseUrl:string; apiKey:string; model:string };
type ReferenceImageInput = { data:string; name?:string; role?:string; note?:string };

type StoryRequest = {
  mode: "story";
  locale?: Locale;
  idea: string;
  genre: string;
  style: string;
  duration: number;
  platform: string;
  videoModel: string;
  lockCharacters: boolean;
  referenceNotes?: string;
  referenceImage?: string | null;
  providerConfig?: UserProviderConfig;
};

type ImagePromptRequest = {
  mode: "image-prompt";
  locale?: Locale;
  imageWorkflow?: "text-to-image" | "image-to-image" | "multi-reference";
  concept: string;
  purpose: string;
  style: string;
  aspect: string;
  imageModel: string;
  referenceNotes?: string;
  referenceImages?: ReferenceImageInput[];
  providerConfig?: UserProviderConfig;
};

type PoseEstimationRequest = {
  mode: "pose-estimation";
  locale?: Locale;
  referenceImage: string;
  providerConfig?: UserProviderConfig;
};

type IdeaMentorRequest = {
  mode: "idea-mentor";
  locale?: Locale;
  idea?: string;
  providerConfig?: UserProviderConfig;
};

const poseJointNames=["head","neck","chest","pelvis","shoulderL","elbowL","wristL","shoulderR","elbowR","wristR","hipL","kneeL","ankleL","hipR","kneeR","ankleR"] as const;

const storySchema = {
  type: "object",
  additionalProperties: false,
  required: ["visualAnalysis", "story", "shots"],
  properties: {
    visualAnalysis: { type: "string" },
    story: {
      type: "object",
      additionalProperties: false,
      required: ["title", "logline", "hook", "direction", "structure"],
      properties: {
        title: { type: "string" },
        logline: { type: "string" },
        hook: { type: "string" },
        direction: { type: "string" },
        structure: {
          type: "array",
          minItems: 4,
          maxItems: 5,
          items: {
            type: "object",
            additionalProperties: false,
            required: ["title", "description", "time"],
            properties: {
              title: { type: "string" },
              description: { type: "string" },
              time: { type: "string" },
            },
          },
        },
      },
    },
    shots: {
      type: "array",
      minItems: 5,
      maxItems: 12,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "time", "shot", "visual", "camera", "audio", "prompt"],
        properties: {
          id: { type: "integer" },
          time: { type: "string" },
          shot: { type: "string" },
          visual: { type: "string" },
          camera: { type: "string" },
          audio: { type: "string" },
          prompt: { type: "string" },
        },
      },
    },
  },
} as const;

const imagePromptSchema = {
  type: "object",
  additionalProperties: false,
  required: ["visualAnalysis", "prompt", "negativePrompt"],
  properties: {
    visualAnalysis: { type: "string" },
    prompt: { type: "string" },
    negativePrompt: { type: "string" },
  },
} as const;

const posePointSchema={
  type:"object",additionalProperties:false,required:["x","y","z"],
  properties:{x:{type:"number"},y:{type:"number"},z:{type:"number"}},
} as const;

const poseEstimationSchema={
  type:"object",additionalProperties:false,required:["summary","confidence","facing","joints"],
  properties:{
    summary:{type:"string"},confidence:{type:"number"},facing:{type:"string",enum:["front","back","left-profile","right-profile","three-quarter","unclear"]},
    joints:{type:"object",additionalProperties:false,required:poseJointNames,properties:Object.fromEntries(poseJointNames.map(name=>[name,posePointSchema]))},
  },
} as const;

const ideaMentorSchema={
  type:"object",additionalProperties:false,required:["hook","suggestion"],
  properties:{hook:{type:"string"},suggestion:{type:"string"}},
} as const;

const modelFormatGuide: Record<string, string> = {
  "Seedance 2.0": "使用自然、明确的中文分层描述：主体与身份锚点、连续动作、环境变化、景别与运镜、节奏、声音、角色/道具一致性。动作必须可执行，避免关键词堆砌。",
  "Veo 3.1": "按 cinematography + subject + action + context + style/ambiance 组织，并明确原生音频、环境声和必要对白。",
  "Kling 3.0": "使用适合多镜头/自定义多镜头的中文描述，写清时间段、主体动作、镜头运动、场景连续性、元素一致性与原生声音。",
  "Runway Gen-4.5": "使用简洁、正向的动态描述，聚焦镜头运动、主体动作、环境响应与风格；不要在主提示词中写负面提示或命令句。",
  "Sora 2": "使用连贯的电影化自然语言段落，清楚描述时间推进、物理运动、镜头、空间关系和同步声音。",
  "通用视频模型": "使用可迁移的结构化描述：主体、动作、环境、镜头、构图、光线、色彩、材质、声音、连续性和避免项。",
};

const imageModelFormatGuide:Record<string,string>={
  "ChatGPT Image":"使用连贯、明确的自然语言说明主体、空间关系、构图、光线、材质、文字内容与编辑边界；对参考图逐项说明保留和改变的元素。",
  "Midjourney":"先写最重要的主体与场景，再写构图、镜头、光线、色彩、材质和风格；保持视觉关键词密度但避免同义词堆砌，画幅由用户选择单独控制。",
  "Seedream":"使用清晰的中文自然语言分层描述主体、动作/状态、环境、景别、构图、光影、色彩、材质和细节；多参考图时明确每张图的职责与融合关系。",
  "Gemini Image":"使用连贯自然语言和分步骤的空间指令，明确主体关系、构图、相机、光影、文字与需要编辑的范围；多参考图逐张说明用途。",
  "Flux":"使用具体自然语言描述主体身份、姿态、空间位置、镜头视角、光线与真实材质；文字、手部、数量和布局要求必须准确且不含矛盾修饰。",
  "Runway Gen-4 Image":"使用直接、可执行的视觉描述，按主体、动作/状态、场景、构图、相机、光线、色彩与风格组织；参考图只承担用户指定的视觉职责。",
};

const storySystem = `你是一名资深电影编剧、导演和 AI 视频提示词设计师。你的任务不是填写模板，而是根据用户本次提交的核心创意与视觉参考，创作独一无二、可拍摄、可生成的视频方案。

硬性要求：
1. 核心创意决定人物、欲望、因果、冲突、转折和结局；不能只复述创意，也不能把用户句子机械地放进固定话术。
2. 若提供参考图片，先真实识别画面主体、人物特征、服装、场景、构图、镜头焦段感、光线方向、色彩、材质和氛围；剧情与每个镜头都必须实际使用其中最重要的视觉锚点。不要仅描述尺寸、明暗或平均颜色。
3. 题材决定叙事机制，视觉风格决定镜头、美术、光线与材质，两者必须同时可辨认。
4. 禁止复用“官方紧急通知”“系统突然规定”“所有线索都指向自己”等万能开场，除非它由本次创意自然产生。不要截取用户句子的前十几个字套入引号。
5. 每个镜头只承担一个清晰叙事动作，但镜头之间必须存在因果和视觉连续性；结尾必须回收前文建立的视觉或情节信息。
6. 每条视频提示词必须贴合用户选择的目标模型，包含这个镜头真正需要的主体、动作、空间、镜头与声音，不得复制同一套关键词。
7. 所有可见输出必须使用用户指定的输出语言；仅在目标模型习惯要求时保留必要的摄影或模型术语。
8. 只返回符合 JSON Schema 的结果。`;

const imagePromptSystem = `你是一名概念艺术总监和图片模型提示词设计师。请根据用户画面创意与视觉参考生成独特、可直接使用的图片提示词，不得套用固定句式。

硬性要求：
1. 文生图只从本次文字创意出发，不虚构或声称看到了参考图片。
2. 图生图必须先识别源图的主体身份、形态、构图、视角、光线、色彩、材质与氛围，再明确哪些视觉锚点保留、哪些按新创意改变。
3. 多参考图必须按参考图编号逐张独立分析，严格遵守每张图片标注的参考职责与补充要求；先提取各自可用信息，再融合为一个统一画面，禁止把多图笼统平均、混成同一来源或遗漏其中一张。
4. 当参考图互相冲突时，用户填写的职责和补充要求优先；没有说明时，主体身份优先于风格，明确构图优先于泛化氛围。
5. 提示词必须贴合目标图片模型的表达习惯，写清主体、动作/状态、环境、构图、镜头、光线、色彩、材质、细节层级及需要避免的内容，并尊重用途与画幅。
6. visualAnalysis 必须说明本次实际从哪些参考图提取了哪些元素；文生图模式则说明画面设计推导。
7. 只返回符合 JSON Schema 的结果。`;

const poseEstimationSystem=`你是一名人体动作分析师和 3D 角色绑定师。请从用户上传的单张图片中识别主要人物的全身动作，并输出可映射到 3D 骨骼的标准化关键点。

硬性要求：
1. 只分析画面中最主要、最完整的人物；忽略服装轮廓、道具和背景造成的假肢体线条。
2. L/R 始终表示人物自身的左侧与右侧，不是观看者的左右。
3. pelvis 必须作为坐标原点附近；坐标 x 向画面右侧增大，y 向上增大，z 朝向镜头增大。
4. 以 pelvis 到 head 的距离约等于 1 个单位进行归一化；脚踝通常位于 y=-1 左右。所有坐标保持在 -2 到 2 范围内。
5. 根据透视、遮挡和肢体交叠合理估算 z 深度；不要把所有关节机械地放在同一平面。
6. 即使某个关节被遮挡，也要根据上下游骨段、重心和人体比例补全可信位置；confidence 应反映整套动作的可靠程度，范围 0 到 1。
7. 肘与膝是决定弯曲方向的关键点，必须先沿肩—肘—腕、髋—膝—踝逐段检查，不能只估算手腕和脚踝。
8. 若人物不是全身、两处以上主要关节离开画面、多人严重重叠或主体无法确定，confidence 必须低于 0.48，不得用猜测伪装成高置信度结果。
9. summary 简短说明人物动作、重心和存在的不确定遮挡；使用用户指定语言。只返回符合 JSON Schema 的结果。`;

const ideaMentorSystem=`你是一个善于启发创作者、但不会代替创作者写作的思维导师。根据用户已有的核心创意，或在创意为空时从零提出一个新鲜方向。
要求：
1. hook 是一句可立即激发画面与冲突的灵感钩子，必须具体、短小、原创，不超过 60 个汉字或相当长度。
2. suggestion 用一到两句话指出可以继续追问的矛盾、人物选择或视觉机制，不写完整剧情，不使用固定模板。
3. 避免“主人公发现秘密”“意外卷入危机”等空泛句式；每次建议必须包含一个可视化细节和一个明确变化。
4. 只返回符合 JSON Schema 的结果。`;

const jsonResponse=apiReply;

function readOutputText(payload: any): string {
  if (typeof payload?.output_text === "string") return payload.output_text;
  for (const item of payload?.output ?? []) {
    for (const content of item?.content ?? []) {
      if (content?.type === "output_text" && typeof content.text === "string") return content.text;
    }
  }
  return "";
}

async function safetyIdentifier(userId: string) {
  const bytes = new TextEncoder().encode(userId);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return `frame_${Array.from(new Uint8Array(digest)).slice(0, 12).map(x => x.toString(16).padStart(2, "0")).join("")}`;
}

function inputContent(text: string, images: string[] = []) {
  const content: Array<Record<string, unknown>> = [{ type: "input_text", text }];
  for (const image of images) content.push({ type: "input_image", image_url: image, detail: "high" });
  return [{ role: "user", content }];
}

function cleanJson(text: string) {
  const stripped = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  const start = stripped.indexOf("{");
  const end = stripped.lastIndexOf("}");
  return start >= 0 && end > start ? stripped.slice(start, end + 1) : stripped;
}

function dataImage(value?: string | null) {
  const match = value?.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/s);
  return match ? { mediaType:match[1], data:match[2] } : null;
}

function apiError(status: number, providerName: string, code?: string) {
  if (status === 401 || status === 403) return `${providerName} API Key 验证失败，请在 Profile 中重新配置。`;
  if (status === 429) return `${providerName} 当前额度不足或请求过多，请检查余额与用量限制。`;
  if (status === 404 || code === "model_not_found") return `${providerName} 找不到所选模型，请重新读取模型列表。`;
  return `${providerName} 生成失败（${status}），请稍后重试或更换模型。`;
}

async function callModel(args:{
  providerId:string;baseUrl:string;apiKey:string;model:string;system:string;prompt:string;images?:string[];
  schema:any;schemaName:string;maxTokens:number;safetyId:string;
}) {
  const {providerId,baseUrl,apiKey,model,system,prompt,images=[],schema,schemaName,maxTokens,safetyId}=args;
  const detected=detectProvider(baseUrl,model,apiKey);
  const selected=providerById(providerId);
  const provider=detected.id==="custom"?selected:detected;
  const schemaPrompt=`${prompt}\n\n必须只输出一个合法 JSON 对象，不要使用 Markdown 代码块。JSON 必须满足以下结构：\n${JSON.stringify(schema)}`;
  const timeout=AbortSignal.timeout(120000);
  let response:Response;

  if(provider.protocol==="openai"){
    response=await fetch(`${baseUrl}/responses`,{method:"POST",headers:{Authorization:`Bearer ${apiKey}`,"Content-Type":"application/json"},signal:timeout,body:JSON.stringify({model,safety_identifier:safetyId,reasoning:{effort:"medium"},input:[{role:"developer",content:[{type:"input_text",text:system}]},...inputContent(prompt,images)],text:{verbosity:"medium",format:{type:"json_schema",name:schemaName,strict:true,schema}},max_output_tokens:maxTokens})});
    const payload=await response.json().catch(()=>({}));
    return {response,text:readOutputText(payload),provider};
  }

  if(provider.protocol==="anthropic"){
    const content:Array<Record<string,unknown>>=[{type:"text",text:schemaPrompt}];
    for(const image of images){const parsedImage=dataImage(image);if(parsedImage)content.push({type:"image",source:{type:"base64",media_type:parsedImage.mediaType,data:parsedImage.data}})}
    response=await fetch(`${baseUrl}/messages`,{method:"POST",headers:{"x-api-key":apiKey,"anthropic-version":"2023-06-01","Content-Type":"application/json"},signal:timeout,body:JSON.stringify({model,max_tokens:maxTokens,system,messages:[{role:"user",content}]})});
    const payload=await response.json().catch(()=>({}));
    const text=(payload?.content||[]).filter((x:any)=>x?.type==="text").map((x:any)=>x.text).join("\n");
    return {response,text,provider};
  }

  if(provider.protocol==="gemini"){
    const parts:Array<Record<string,unknown>>=[{text:`${system}\n\n${schemaPrompt}`}];
    for(const image of images){const parsedImage=dataImage(image);if(parsedImage)parts.push({inlineData:{mimeType:parsedImage.mediaType,data:parsedImage.data}})}
    response=await fetch(`${baseUrl}/models/${encodeURIComponent(model)}:generateContent`,{method:"POST",headers:{"x-goog-api-key":apiKey,"Content-Type":"application/json"},signal:timeout,body:JSON.stringify({contents:[{role:"user",parts}],generationConfig:{responseMimeType:"application/json",maxOutputTokens:maxTokens}})});
    const payload=await response.json().catch(()=>({}));
    const text=payload?.candidates?.[0]?.content?.parts?.map((x:any)=>x.text||"").join("")||"";
    return {response,text,provider};
  }

  const userContent:Array<Record<string,unknown>>=[{type:"text",text:schemaPrompt}];
  for(const image of images)userContent.push({type:"image_url",image_url:{url:image,detail:"high"}});
  const requestBody:any={model,messages:[{role:"system",content:system},{role:"user",content:userContent}],max_tokens:maxTokens,temperature:.7,response_format:{type:"json_object"}};
  response=await fetch(`${baseUrl}/chat/completions`,{method:"POST",headers:{Authorization:`Bearer ${apiKey}`,"Content-Type":"application/json","HTTP-Referer":"https://story-forge-cn.rjins.chatgpt.site","X-Title":"FRAME AI STORY STUDIO"},signal:timeout,body:JSON.stringify(requestBody)});
  if(!response.ok&&response.status===400){
    delete requestBody.response_format;
    response=await fetch(`${baseUrl}/chat/completions`,{method:"POST",headers:{Authorization:`Bearer ${apiKey}`,"Content-Type":"application/json","HTTP-Referer":"https://story-forge-cn.rjins.chatgpt.site","X-Title":"FRAME AI STORY STUDIO"},signal:AbortSignal.timeout(120000),body:JSON.stringify(requestBody)});
  }
  const payload=await response.json().catch(()=>({}));
  const text=typeof payload?.choices?.[0]?.message?.content==="string"?payload.choices[0].message.content:"";
  return {response,text,provider};
}

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return jsonResponse({ error: "请先使用 ChatGPT 登录后再生成。" }, 401);
  const crossSite=rejectCrossSiteMutation(request);if(crossSite)return crossSite;
  const limited=await enforceRateLimit(user.userId,"content-generation",30,600);if(limited)return limited;

  let body: StoryRequest | ImagePromptRequest | PoseEstimationRequest | IdeaMentorRequest;
  try {
    body = await readJsonBody(request,42_000_000);
  } catch(error) {
    return error instanceof RequestValidationError?jsonResponse({error:error.message},error.status):jsonResponse({ error: "请求内容格式不正确。" }, 400);
  }

  if (body.mode !== "story" && body.mode !== "image-prompt" && body.mode !== "pose-estimation" && body.mode !== "idea-mentor") {
    return jsonResponse({ error: "不支持的生成任务。" }, 400);
  }

  const userConfig=body.providerConfig;
  const storedConfig=userConfig?.apiKey?.trim()?null:await getStoredModelConfig(user.userId);
  const providerId=userConfig?.providerId||storedConfig?.providerId||"openai";
  if(!MODEL_PROVIDERS.some(item=>item.id===providerId))return jsonResponse({error:"不支持的模型服务商。"},400);
  const selectedProvider=providerById(providerId);
  const baseUrl=normalizeBaseUrl(userConfig?.baseUrl||storedConfig?.apiBaseUrl||selectedProvider.baseUrl);
  const storedMatches=storedConfig?.providerId===providerId&&storedConfig.apiBaseUrl===baseUrl;
  const apiKey=userConfig?.apiKey?.trim()||(storedMatches?storedConfig.apiKey:"")||process.env.OPENAI_API_KEY||"";
  const generationModel=userConfig?.model?.trim()||storedConfig?.model||process.env.OPENAI_MODEL||"gpt-5.6-terra";
  if(!apiKey)return jsonResponse({error:"请先在 Profile → AI 模型配置中添加 API Key。"},400);
  if(!safeModelId(generationModel))return jsonResponse({error:"请选择一个有效的生成模型。"},400);
  if(!isSafePublicHttps(baseUrl)||!matchesTrustedProviderHost(baseUrl,providerId==="custom"?"":selectedProvider.baseUrl))return jsonResponse({error:"模型接口必须使用该服务商的安全公网 HTTPS 地址；自定义接口请使用“兼容接口”。"},400);

  const isStory = body.mode === "story";
  const isPoseEstimation=body.mode==="pose-estimation";
  const isImagePrompt=body.mode==="image-prompt";
  const isIdeaMentor=body.mode==="idea-mentor";
  const imageWorkflow = isImagePrompt ? body.imageWorkflow === "image-to-image" || body.imageWorkflow === "multi-reference" ? body.imageWorkflow : "text-to-image" : null;
  const suppliedReferences:ReferenceImageInput[] = isStory
    ? body.referenceImage ? [{data:body.referenceImage,name:"story-reference",role:"source"}] : []
    : isPoseEstimation
      ? body.referenceImage ? [{data:body.referenceImage,name:"pose-reference",role:"pose"}] : []
      : isImagePrompt&&Array.isArray(body.referenceImages) ? body.referenceImages : [];
  const referenceInputs = isImagePrompt&&imageWorkflow === "text-to-image" ? [] : suppliedReferences;
  const images = referenceInputs.map(item=>item?.data).filter((value):value is string=>typeof value==="string");
  const maxReferences = isStory||isPoseEstimation ? 1 : 6;
  const perImageLimit = isStory ? 14_000_000 : 8_000_000;
  if(referenceInputs.length>maxReferences||images.length!==referenceInputs.length||images.some(image=>{const parsed=dataImage(image);return !parsed||!["image/jpeg","image/png","image/webp"].includes(parsed.mediaType)||!/^[a-zA-Z0-9+/=]+$/.test(parsed.data)||image.length>perImageLimit})||images.reduce((total,image)=>total+image.length,0)>36_000_000){
    return jsonResponse({error:"参考图片格式不正确、数量超限或文件过大。"},413);
  }
  if(isPoseEstimation&&images.length!==1)return jsonResponse({error:"动作识别需要上传一张人物参考图。"},400);
  if(isImagePrompt&&imageWorkflow==="image-to-image"&&images.length!==1)return jsonResponse({error:"图生图模式需要且只能上传一张源图。"},400);
  if(isImagePrompt&&imageWorkflow==="multi-reference"&&(images.length<2||images.length>6))return jsonResponse({error:"多参考图生图模式需要上传 2–6 张参考图。"},400);

  const locale:Locale=body.locale&&Object.hasOwn(outputLanguage,body.locale)?body.locale:"zh-CN";
  const languageRule=`本次输出语言：${outputLanguage[locale]}。标题、剧情、分析、镜头、声音与解释字段必须使用该语言；模型专用提示词也使用该语言为主，同时保留目标模型真正需要的英文摄影术语。`;
  if (isStory && (!body.idea?.trim() || body.idea.trim().length > 800)) {
    return jsonResponse({ error: "请提供有效的核心创意。" }, 400);
  }
  if (isImagePrompt && (!body.concept?.trim() || body.concept.trim().length > 1000)) {
    return jsonResponse({ error: "请提供有效的画面创意。" }, 400);
  }
  if(isIdeaMentor&&typeof body.idea==="string"&&body.idea.length>800)return jsonResponse({error:"核心创意内容过长。"},400);
  const boundedFields=isStory?[body.genre,body.style,body.platform,body.videoModel,body.referenceNotes||""]:isImagePrompt?[body.purpose,body.style,body.aspect,body.imageModel,body.referenceNotes||""]:[];
  if(boundedFields.some(value=>typeof value!=="string"||value.length>1000)||(isStory&&(!Number.isFinite(body.duration)||body.duration<5||body.duration>300)))return jsonResponse({error:"创作参数无效或过长。"},400);

  const referenceManifest = referenceInputs.map((item,index)=>{
    const name=typeof item.name==="string"?item.name.slice(0,120):`reference-${index+1}`;
    const role=typeof item.role==="string"?item.role.slice(0,40):"unspecified";
    const note=typeof item.note==="string"?item.note.trim().slice(0,500):"";
    return `参考图 ${index+1}｜文件：${name}｜职责：${role}｜用户要求：${note||"无"}`;
  }).join("\n");
  const workflowName=imageWorkflow==="image-to-image"?"图生图（单一源图重构）":imageWorkflow==="multi-reference"?"多参考图生图（逐图提取后融合）":"文生图（纯文字设计）";
  const prompt = isIdeaMentor
    ? `请为创作者提供一次简短的思维启发。\n\n当前核心创意：${body.idea?.trim()||"尚未填写，请从零给出一个不落俗套、具有明确画面与冲突的灵感钩子。"}\n\n不要扩写完整剧情；请留下可供创作者继续发挥的空间。`
    : isStory
    ? `请完成本次视频创作。\n\n核心创意：${body.idea.trim()}\n题材：${body.genre}\n视觉风格：${body.style}\n成片时长：${body.duration} 秒\n发布平台：${body.platform}\n目标视频模型：${body.videoModel}\n目标镜头数量：${body.duration <= 15 ? 5 : body.duration <= 30 ? 8 : body.duration <= 45 ? 10 : 12}\n角色一致性锁定：${body.lockCharacters ? "开启" : "关闭"}\n用户对参考图的补充：${body.referenceNotes?.trim() || "无"}\n参考图片：${images.length ? "已随请求提供，必须进行视觉理解并用于创作" : "未提供"}\n\n目标模型提示词规则：${modelFormatGuide[body.videoModel] || modelFormatGuide["通用视频模型"]}`
    : isPoseEstimation
      ? `请分析随请求提供的动作参考图，识别画面中最完整的主要人物并输出 16 个标准化人体关键点。\n\n图片数量：${images.length}\n坐标约定：pelvis 为原点附近；pelvis 到 head 约为 1；x 向画面右侧、y 向上、z 朝镜头；L/R 为人物自身左右。\n请逐段检查肩—肘—腕与髋—膝—踝的弯曲方向、重心、四肢朝向和遮挡推断；不满足全身清晰条件时必须降低 confidence。`
    : `请生成本次图片提示词。\n\n生成方式：${workflowName}\n画面创意：${body.concept.trim()}\n图片用途：${body.purpose}\n视觉风格：${body.style}\n画幅比例：${body.aspect}\n目标图片模型：${body.imageModel}\n全局融合要求：${body.referenceNotes?.trim().slice(0,800) || "无"}\n参考图片数量：${images.length}\n${referenceManifest||"没有参考图；必须完全根据文字创意进行画面设计。"}\n\n${imageWorkflow==="multi-reference"?"请按编号先逐图分析，再严格按照各自职责提取信息并融合；visualAnalysis 中必须逐一说明每张图贡献的元素以及冲突处理方式。":imageWorkflow==="image-to-image"?"请明确说明源图中被保留的视觉锚点，以及根据新创意被重构的部分。":"请勿声称看见或使用了任何参考图片。"}\n目标模型表达规则：${imageModelFormatGuide[body.imageModel]||"使用具体、连贯、可迁移的自然语言视觉描述，避免无关关键词堆砌。"}\nnegativePrompt 若该模型不建议使用负面提示，则返回说明性短句。`;

  const schema = isIdeaMentor ? ideaMentorSchema : isStory ? storySchema : isPoseEstimation ? poseEstimationSchema : imagePromptSchema;
  const name = isIdeaMentor ? "frame_idea_mentor" : isStory ? "frame_story_package" : isPoseEstimation ? "frame_pose_estimation" : "frame_image_prompt";

  let result:Awaited<ReturnType<typeof callModel>>;
  try{
    result=await callModel({providerId,baseUrl,apiKey,model:generationModel,system:`${isIdeaMentor?ideaMentorSystem:isStory?storySystem:isPoseEstimation?poseEstimationSystem:imagePromptSystem}\n\n${languageRule}`,prompt,images,schema,schemaName:name,maxTokens:isIdeaMentor?700:isStory?12000:isPoseEstimation?3000:4000,safetyId:await safetyIdentifier(user.userId)});
  }catch{
    return jsonResponse({error:`${selectedProvider.name} 连接超时或网络不可用，请稍后重试。`},502);
  }

  if(!result.response.ok)return jsonResponse({error:apiError(result.response.status,result.provider.name)},502);

  let parsed: any;
  try {
    parsed = JSON.parse(cleanJson(result.text));
  } catch {
    return jsonResponse({ error: `${result.provider.name} 已经响应，但未返回可解析的结构化内容；请更换支持 JSON 输出的模型。` }, 502);
  }

  if(isIdeaMentor)return jsonResponse({hook:typeof parsed.hook==="string"?parsed.hook.slice(0,240):"",suggestion:typeof parsed.suggestion==="string"?parsed.suggestion.slice(0,600):"",generatedBy:generationModel,provider:result.provider});

  if(isPoseEstimation){
    const pose:Record<string,[number,number,number]>={};
    for(const name of poseJointNames){const point=parsed?.joints?.[name];if(!point||![point.x,point.y,point.z].every(Number.isFinite))return jsonResponse({error:`${result.provider.name} 已识别图片，但人体关键点不完整；请换一张全身动作更清楚的图片。`},502);pose[name]=[point.x,point.y,point.z].map(value=>Math.max(-2,Math.min(2,value))) as [number,number,number]}
    return jsonResponse({pose,summary:typeof parsed.summary==="string"?parsed.summary.slice(0,500):"",confidence:Number.isFinite(parsed.confidence)?Math.max(0,Math.min(1,parsed.confidence)):0,facing:typeof parsed.facing==="string"?parsed.facing:"unclear",generatedBy:generationModel,provider:result.provider});
  }

  if (isStory) {
    return jsonResponse({
      visualAnalysis: parsed.visualAnalysis,
      story: {
        ...parsed.story,
        visualAnalysis: parsed.visualAnalysis,
        structure: parsed.story.structure.map((item: any) => [item.title, item.description]),
        structureTimes: parsed.story.structure.map((item: any) => item.time),
      },
      shots: parsed.shots,
      generatedBy: generationModel,
      provider: result.provider,
    });
  }

  return jsonResponse({ ...parsed, generatedBy: generationModel, provider: result.provider });
}
