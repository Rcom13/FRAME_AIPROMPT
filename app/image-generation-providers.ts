export type ImageGenerationProtocol="openai-images"|"runway"|"gemini-images"|"bfl";

export type ImageGenerationProvider={
  id:string;
  name:string;
  short:string;
  baseUrl:string;
  protocol:ImageGenerationProtocol;
  logo:string;
  hint:string;
  models:Array<{id:string;name:string}>;
};

export const IMAGE_GENERATION_PROVIDERS:ImageGenerationProvider[]=[
  {id:"runway",name:"Runway Universal",short:"RW",baseUrl:"https://api.dev.runwayml.com/v1",protocol:"runway",logo:"https://runwayml.com/favicon.ico",hint:"一个接口使用 Runway、Seedream、Gemini 与 GPT Image",models:[
    {id:"seedream5_pro",name:"Seedream 5.0 Pro"},{id:"seedream5_lite",name:"Seedream 5.0 Lite"},{id:"gen4_image",name:"Runway Gen-4 Image"},{id:"gen4_image_turbo",name:"Runway Gen-4 Image Turbo"},{id:"gpt_image_2",name:"GPT Image 2"},{id:"gemini_image3.1_flash",name:"Gemini 3.1 Flash Image"},{id:"gemini_image3_pro",name:"Gemini 3 Pro Image"},
  ]},
  {id:"openai-image",name:"OpenAI Images",short:"OA",baseUrl:"https://api.openai.com/v1",protocol:"openai-images",logo:"https://openai.com/favicon.ico",hint:"GPT Image 官方生成与多图编辑接口",models:[{id:"gpt-image-2",name:"GPT Image 2"},{id:"gpt-image-1.5",name:"GPT Image 1.5"},{id:"gpt-image-1",name:"GPT Image 1"}]},
  {id:"gemini-image",name:"Gemini Image",short:"GE",baseUrl:"https://generativelanguage.googleapis.com/v1beta",protocol:"gemini-images",logo:"https://www.google.com/favicon.ico",hint:"Gemini 原生图片生成与多参考图编辑",models:[{id:"gemini-3.1-flash-image",name:"Gemini 3.1 Flash Image"},{id:"gemini-3-pro-image",name:"Gemini 3 Pro Image"},{id:"gemini-3.1-flash-lite-image",name:"Gemini 3.1 Flash Lite Image"}]},
  {id:"bfl",name:"Black Forest Labs",short:"BF",baseUrl:"https://api.bfl.ai/v1",protocol:"bfl",logo:"https://bfl.ai/favicon.ico",hint:"FLUX.2 文生图与多参考图编辑",models:[{id:"flux-2-pro-preview",name:"FLUX.2 Pro Preview"},{id:"flux-2-max",name:"FLUX.2 Max"},{id:"flux-2-flex",name:"FLUX.2 Flex"},{id:"flux-kontext-pro",name:"FLUX Kontext Pro"}]},
];

export const imageGenerationProviderById=(id?:string)=>IMAGE_GENERATION_PROVIDERS.find(item=>item.id===id)||IMAGE_GENERATION_PROVIDERS[0];

export function imagePromptFamily(modelId:string){
  const value=modelId.toLowerCase();
  if(value.includes("seedream"))return "Seedream";
  if(value.includes("flux"))return "Flux";
  if(value.includes("gemini"))return "Gemini Image";
  if(value.includes("gpt")||value.includes("image-1"))return "ChatGPT Image";
  if(value.includes("gen4")||value.includes("gen-4"))return "Runway Gen-4 Image";
  return "通用图片模型";
}

export function normalizeImageBaseUrl(value:string){return value.trim().replace(/\/+$/g,"")}
