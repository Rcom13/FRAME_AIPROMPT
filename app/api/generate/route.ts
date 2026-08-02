import { getChatGPTUser } from "../../chatgpt-auth";
import { detectProvider, normalizeBaseUrl, providerById } from "../../model-providers";
import { getStoredModelConfig } from "../../../db/model-config";

export const dynamic = "force-dynamic";

type UserProviderConfig = { providerId:string; baseUrl:string; apiKey:string; model:string };

type StoryRequest = {
  mode: "story";
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
  concept: string;
  purpose: string;
  style: string;
  aspect: string;
  imageModel: string;
  referenceNotes?: string;
  referenceImage?: string | null;
  providerConfig?: UserProviderConfig;
};

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

const modelFormatGuide: Record<string, string> = {
  "Seedance 2.0": "使用自然、明确的中文分层描述：主体与身份锚点、连续动作、环境变化、景别与运镜、节奏、声音、角色/道具一致性。动作必须可执行，避免关键词堆砌。",
  "Veo 3.1": "按 cinematography + subject + action + context + style/ambiance 组织，并明确原生音频、环境声和必要对白。",
  "Kling 3.0": "使用适合多镜头/自定义多镜头的中文描述，写清时间段、主体动作、镜头运动、场景连续性、元素一致性与原生声音。",
  "Runway Gen-4.5": "使用简洁、正向的动态描述，聚焦镜头运动、主体动作、环境响应与风格；不要在主提示词中写负面提示或命令句。",
  "Sora 2": "使用连贯的电影化自然语言段落，清楚描述时间推进、物理运动、镜头、空间关系和同步声音。",
  "通用视频模型": "使用可迁移的结构化描述：主体、动作、环境、镜头、构图、光线、色彩、材质、声音、连续性和避免项。",
};

const storySystem = `你是一名资深电影编剧、导演和 AI 视频提示词设计师。你的任务不是填写模板，而是根据用户本次提交的核心创意与视觉参考，创作独一无二、可拍摄、可生成的视频方案。

硬性要求：
1. 核心创意决定人物、欲望、因果、冲突、转折和结局；不能只复述创意，也不能把用户句子机械地放进固定话术。
2. 若提供参考图片，先真实识别画面主体、人物特征、服装、场景、构图、镜头焦段感、光线方向、色彩、材质和氛围；剧情与每个镜头都必须实际使用其中最重要的视觉锚点。不要仅描述尺寸、明暗或平均颜色。
3. 题材决定叙事机制，视觉风格决定镜头、美术、光线与材质，两者必须同时可辨认。
4. 禁止复用“官方紧急通知”“系统突然规定”“所有线索都指向自己”等万能开场，除非它由本次创意自然产生。不要截取用户句子的前十几个字套入引号。
5. 每个镜头只承担一个清晰叙事动作，但镜头之间必须存在因果和视觉连续性；结尾必须回收前文建立的视觉或情节信息。
6. 每条视频提示词必须贴合用户选择的目标模型，包含这个镜头真正需要的主体、动作、空间、镜头与声音，不得复制同一套关键词。
7. 所有输出使用简体中文；仅在目标模型习惯要求时保留必要英文摄影术语。
8. 只返回符合 JSON Schema 的结果。`;

const imagePromptSystem = `你是一名概念艺术总监和图片模型提示词设计师。请根据用户画面创意与视觉参考生成独特、可直接使用的图片提示词，不得套用固定句式。

如果提供图片，必须先识别并说明画面主体、人物/物体特征、构图、视角、光线、色彩、材质与氛围，再将真正相关的视觉锚点融入提示词。尊重用户指定的用途、风格、画幅和目标图片模型。只返回符合 JSON Schema 的结果。`;

function jsonResponse(body: unknown, status = 200) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

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

function inputContent(text: string, image?: string | null) {
  const content: Array<Record<string, unknown>> = [{ type: "input_text", text }];
  if (image) content.push({ type: "input_image", image_url: image, detail: "high" });
  return [{ role: "user", content }];
}

function safePublicHttps(value: string) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return false;
    const host = url.hostname.toLowerCase();
    if (host === "localhost" || host.endsWith(".local") || host === "0.0.0.0" || host === "127.0.0.1" || host === "::1") return false;
    return !/^(10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.)/.test(host);
  } catch { return false; }
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
  providerId:string;baseUrl:string;apiKey:string;model:string;system:string;prompt:string;image?:string|null;
  schema:any;schemaName:string;maxTokens:number;safetyId:string;
}) {
  const {providerId,baseUrl,apiKey,model,system,prompt,image,schema,schemaName,maxTokens,safetyId}=args;
  const detected=detectProvider(baseUrl,model,apiKey);
  const selected=providerById(providerId);
  const provider=detected.id==="custom"?selected:detected;
  const schemaPrompt=`${prompt}\n\n必须只输出一个合法 JSON 对象，不要使用 Markdown 代码块。JSON 必须满足以下结构：\n${JSON.stringify(schema)}`;
  const timeout=AbortSignal.timeout(120000);
  let response:Response;

  if(provider.protocol==="openai"){
    response=await fetch(`${baseUrl}/responses`,{method:"POST",headers:{Authorization:`Bearer ${apiKey}`,"Content-Type":"application/json"},signal:timeout,body:JSON.stringify({model,safety_identifier:safetyId,reasoning:{effort:"medium"},input:[{role:"developer",content:[{type:"input_text",text:system}]},...inputContent(prompt,image)],text:{verbosity:"medium",format:{type:"json_schema",name:schemaName,strict:true,schema}},max_output_tokens:maxTokens})});
    const payload=await response.json().catch(()=>({}));
    return {response,text:readOutputText(payload),provider};
  }

  if(provider.protocol==="anthropic"){
    const content:Array<Record<string,unknown>>=[{type:"text",text:schemaPrompt}];
    const parsedImage=dataImage(image);
    if(parsedImage)content.push({type:"image",source:{type:"base64",media_type:parsedImage.mediaType,data:parsedImage.data}});
    response=await fetch(`${baseUrl}/messages`,{method:"POST",headers:{"x-api-key":apiKey,"anthropic-version":"2023-06-01","Content-Type":"application/json"},signal:timeout,body:JSON.stringify({model,max_tokens:maxTokens,system,messages:[{role:"user",content}]})});
    const payload=await response.json().catch(()=>({}));
    const text=(payload?.content||[]).filter((x:any)=>x?.type==="text").map((x:any)=>x.text).join("\n");
    return {response,text,provider};
  }

  if(provider.protocol==="gemini"){
    const parts:Array<Record<string,unknown>>=[{text:`${system}\n\n${schemaPrompt}`}];
    const parsedImage=dataImage(image);
    if(parsedImage)parts.push({inlineData:{mimeType:parsedImage.mediaType,data:parsedImage.data}});
    response=await fetch(`${baseUrl}/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,{method:"POST",headers:{"Content-Type":"application/json"},signal:timeout,body:JSON.stringify({contents:[{role:"user",parts}],generationConfig:{responseMimeType:"application/json",maxOutputTokens:maxTokens}})});
    const payload=await response.json().catch(()=>({}));
    const text=payload?.candidates?.[0]?.content?.parts?.map((x:any)=>x.text||"").join("")||"";
    return {response,text,provider};
  }

  const userContent:Array<Record<string,unknown>>=[{type:"text",text:schemaPrompt}];
  if(image)userContent.push({type:"image_url",image_url:{url:image,detail:"high"}});
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

  let body: StoryRequest | ImagePromptRequest;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: "请求内容格式不正确。" }, 400);
  }

  if (body.mode !== "story" && body.mode !== "image-prompt") {
    return jsonResponse({ error: "不支持的生成任务。" }, 400);
  }

  const userConfig=body.providerConfig;
  const storedConfig=userConfig?.apiKey?.trim()?null:await getStoredModelConfig(user.userId);
  const providerId=userConfig?.providerId||storedConfig?.providerId||"openai";
  const selectedProvider=providerById(providerId);
  const baseUrl=normalizeBaseUrl(userConfig?.baseUrl||storedConfig?.apiBaseUrl||selectedProvider.baseUrl);
  const storedMatches=storedConfig?.providerId===providerId&&storedConfig.apiBaseUrl===baseUrl;
  const apiKey=userConfig?.apiKey?.trim()||(storedMatches?storedConfig.apiKey:"")||process.env.OPENAI_API_KEY||"";
  const generationModel=userConfig?.model?.trim()||storedConfig?.model||process.env.OPENAI_MODEL||"gpt-5.6-terra";
  if(!apiKey)return jsonResponse({error:"请先在 Profile → AI 模型配置中添加 API Key。"},400);
  if(!generationModel)return jsonResponse({error:"请选择一个生成模型。"},400);
  if(!safePublicHttps(baseUrl))return jsonResponse({error:"模型接口必须使用安全的公网 HTTPS 地址。"},400);

  const image = body.referenceImage;
  if (image && (!image.startsWith("data:image/") || image.length > 14_000_000)) {
    return jsonResponse({ error: "参考图片格式不正确或文件过大。" }, 413);
  }

  const isStory = body.mode === "story";
  if (isStory && (!body.idea?.trim() || body.idea.trim().length > 800)) {
    return jsonResponse({ error: "请提供有效的核心创意。" }, 400);
  }
  if (!isStory && (!body.concept?.trim() || body.concept.trim().length > 1000)) {
    return jsonResponse({ error: "请提供有效的画面创意。" }, 400);
  }

  const prompt = isStory
    ? `请完成本次视频创作。\n\n核心创意：${body.idea.trim()}\n题材：${body.genre}\n视觉风格：${body.style}\n成片时长：${body.duration} 秒\n发布平台：${body.platform}\n目标视频模型：${body.videoModel}\n目标镜头数量：${body.duration <= 15 ? 5 : body.duration <= 30 ? 8 : body.duration <= 45 ? 10 : 12}\n角色一致性锁定：${body.lockCharacters ? "开启" : "关闭"}\n用户对参考图的补充：${body.referenceNotes?.trim() || "无"}\n参考图片：${image ? "已随请求提供，必须进行视觉理解并用于创作" : "未提供"}\n\n目标模型提示词规则：${modelFormatGuide[body.videoModel] || modelFormatGuide["通用视频模型"]}`
    : `请生成本次图片提示词。\n\n画面创意：${body.concept.trim()}\n图片用途：${body.purpose}\n视觉风格：${body.style}\n画幅比例：${body.aspect}\n目标图片模型：${body.imageModel}\n用户对参考图的补充：${body.referenceNotes?.trim() || "无"}\n参考图片：${image ? "已随请求提供，必须进行视觉理解并融入提示词" : "未提供"}\n\n提示词应遵循 ${body.imageModel} 的常用表达习惯。negativePrompt 若该模型不建议使用负面提示，则返回说明性短句。`;

  const schema = isStory ? storySchema : imagePromptSchema;
  const name = isStory ? "frame_story_package" : "frame_image_prompt";

  let result:Awaited<ReturnType<typeof callModel>>;
  try{
    result=await callModel({providerId,baseUrl,apiKey,model:generationModel,system:isStory?storySystem:imagePromptSystem,prompt,image,schema,schemaName:name,maxTokens:isStory?12000:4000,safetyId:await safetyIdentifier(user.userId)});
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
