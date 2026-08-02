export type ProviderProtocol = "openai" | "anthropic" | "gemini" | "openai-compatible";

export type ModelProvider = {
  id: string;
  name: string;
  company: string;
  short: string;
  baseUrl: string;
  protocol: ProviderProtocol;
  logo: string;
  hint: string;
};

export const MODEL_PROVIDERS: ModelProvider[] = [
  { id:"openrouter", name:"OpenRouter", company:"OpenRouter", short:"OR", baseUrl:"https://openrouter.ai/api/v1", protocol:"openai-compatible", logo:"https://openrouter.ai/favicon.ico", hint:"推荐 · 一个 Key 读取数百个闭源与开源模型" },
  { id:"openai", name:"OpenAI", company:"OpenAI", short:"OA", baseUrl:"https://api.openai.com/v1", protocol:"openai", logo:"https://openai.com/favicon.ico", hint:"GPT 系列与视觉理解模型" },
  { id:"anthropic", name:"Claude", company:"Anthropic", short:"CL", baseUrl:"https://api.anthropic.com/v1", protocol:"anthropic", logo:"https://www.anthropic.com/favicon.ico", hint:"Claude 系列，多模态长文本创作" },
  { id:"gemini", name:"Gemini", company:"Google", short:"GE", baseUrl:"https://generativelanguage.googleapis.com/v1beta", protocol:"gemini", logo:"https://www.google.com/favicon.ico", hint:"Gemini 系列与 Google 多模态模型" },
  { id:"deepseek", name:"DeepSeek", company:"DeepSeek", short:"DS", baseUrl:"https://api.deepseek.com/v1", protocol:"openai-compatible", logo:"https://www.deepseek.com/favicon.ico", hint:"DeepSeek Chat / Reasoner" },
  { id:"xai", name:"Grok", company:"xAI", short:"X", baseUrl:"https://api.x.ai/v1", protocol:"openai-compatible", logo:"https://x.ai/favicon.ico", hint:"Grok 文本与图像理解模型" },
  { id:"moonshot", name:"Kimi", company:"Moonshot AI", short:"KM", baseUrl:"https://api.moonshot.cn/v1", protocol:"openai-compatible", logo:"https://platform.moonshot.cn/favicon.ico", hint:"Kimi / Moonshot 长文本模型" },
  { id:"qwen", name:"通义千问", company:"阿里云", short:"QW", baseUrl:"https://dashscope.aliyuncs.com/compatible-mode/v1", protocol:"openai-compatible", logo:"https://www.aliyun.com/favicon.ico", hint:"Qwen 与视觉理解模型" },
  { id:"zhipu", name:"智谱 GLM", company:"智谱 AI", short:"GL", baseUrl:"https://open.bigmodel.cn/api/paas/v4", protocol:"openai-compatible", logo:"https://open.bigmodel.cn/favicon.ico", hint:"GLM 系列与视觉模型" },
  { id:"doubao", name:"豆包 / 方舟", company:"字节跳动", short:"DB", baseUrl:"https://ark.cn-beijing.volces.com/api/v3", protocol:"openai-compatible", logo:"https://www.volcengine.com/favicon.ico", hint:"豆包 Seed、视觉与方舟推理接入点" },
  { id:"mistral", name:"Mistral", company:"Mistral AI", short:"MI", baseUrl:"https://api.mistral.ai/v1", protocol:"openai-compatible", logo:"https://mistral.ai/favicon.ico", hint:"Mistral 与 Pixtral 多模态模型" },
  { id:"custom", name:"兼容接口", company:"Custom", short:"AI", baseUrl:"", protocol:"openai-compatible", logo:"", hint:"任何 HTTPS OpenAI-compatible API" },
];

export const providerById = (id?: string) => MODEL_PROVIDERS.find(x=>x.id===id) || MODEL_PROVIDERS[0];

export function detectProvider(baseUrl = "", modelId = "", apiKey = ""): ModelProvider {
  const haystack = `${baseUrl} ${modelId}`.toLowerCase();
  const matched = MODEL_PROVIDERS.find(provider => {
    if(provider.id === "custom") return false;
    try {
      const host = new URL(provider.baseUrl).hostname.replace(/^www\./, "");
      if(host && haystack.includes(host)) return true;
    } catch {}
    const signatures:Record<string,string[]> = {
      openrouter:["openrouter"],
      openai:["openai/", "gpt-", "o1-", "o3-", "o4-"],
      anthropic:["anthropic/", "claude-", "anthropic"],
      gemini:["google/", "gemini-", "generativelanguage.googleapis"],
      deepseek:["deepseek"], xai:["grok-", "api.x.ai"],
      moonshot:["moonshot-", "kimi-", "moonshot.cn"],
      qwen:["qwen", "dashscope"], zhipu:["glm-", "bigmodel.cn"],
      doubao:["doubao-", "ark.cn-", "volces.com"], mistral:["mistral", "pixtral"],
    };
    return (signatures[provider.id]||[]).some(token=>haystack.includes(token));
  });
  if(matched) return matched;
  if(apiKey.startsWith("sk-ant-")) return providerById("anthropic");
  if(apiKey.startsWith("sk-or-")) return providerById("openrouter");
  if(apiKey.startsWith("AIza")) return providerById("gemini");
  if(apiKey.startsWith("xai-")) return providerById("xai");
  return providerById("custom");
}

export function normalizeBaseUrl(value: string) {
  return value.trim().replace(/\/+$/, "");
}

export function detectModelBrand(modelId:string, fallbackProviderId:string){
  const detected=detectProvider("",modelId,"");
  return detected.id==="custom"?providerById(fallbackProviderId):detected;
}
