export type VideoGenerationProtocol="runway-video"|"openai-video"|"gemini-veo"|"kling-video";

export type VideoGenerationProvider={
  id:string;
  name:string;
  short:string;
  baseUrl:string;
  protocol:VideoGenerationProtocol;
  logo:string;
  hint:string;
  auth:"api-key"|"access-secret";
  models:Array<{id:string;name:string}>;
};

export const VIDEO_GENERATION_PROVIDERS:VideoGenerationProvider[]=[
  {id:"runway-video",name:"Runway Universal Video",short:"RW",baseUrl:"https://api.dev.runwayml.com/v1",protocol:"runway-video",logo:"https://runwayml.com/favicon.ico",hint:"一个官方接口使用 Runway、Seedance、Veo 与 Gemini Omni Video",auth:"api-key",models:[
    {id:"gen4.5",name:"Runway Gen-4.5"},{id:"gen4_turbo",name:"Runway Gen-4 Turbo"},{id:"seedance2",name:"Seedance 2.0"},{id:"seedance2_fast",name:"Seedance 2.0 Fast"},{id:"seedance2_mini",name:"Seedance 2.0 Mini"},{id:"veo3.1",name:"Veo 3.1"},{id:"veo3.1_fast",name:"Veo 3.1 Fast"},{id:"gemini_omni_flash",name:"Gemini Omni Flash"},
  ]},
  {id:"openai-video",name:"OpenAI Sora",short:"OA",baseUrl:"https://api.openai.com/v1",protocol:"openai-video",logo:"https://openai.com/favicon.ico",hint:"Sora 2 官方视频任务、进度与成片接口",auth:"api-key",models:[{id:"sora-2",name:"Sora 2"},{id:"sora-2-pro",name:"Sora 2 Pro"}]},
  {id:"gemini-veo",name:"Google Veo",short:"GV",baseUrl:"https://generativelanguage.googleapis.com/v1beta",protocol:"gemini-veo",logo:"https://www.google.com/favicon.ico",hint:"Veo 3.1 原生视频、首尾帧与声音生成",auth:"api-key",models:[{id:"veo-3.1-generate-preview",name:"Veo 3.1"},{id:"veo-3.1-fast-generate-preview",name:"Veo 3.1 Fast"},{id:"veo-3.0-generate-001",name:"Veo 3"}]},
  {id:"kling-video",name:"Kling AI",short:"KL",baseUrl:"https://api-singapore.klingai.com",protocol:"kling-video",logo:"https://klingai.com/favicon.ico",hint:"可灵官方文生视频与图生视频；需要 Access Key + Secret Key",auth:"access-secret",models:[{id:"kling-v3",name:"Kling 3.0"},{id:"kling-v2-6",name:"Kling 2.6"},{id:"kling-v2-5-turbo",name:"Kling 2.5 Turbo"}]},
];

export const videoGenerationProviderById=(id?:string)=>VIDEO_GENERATION_PROVIDERS.find(item=>item.id===id)||VIDEO_GENERATION_PROVIDERS[0];
export const normalizeVideoBaseUrl=(value:string)=>value.trim().replace(/\/+$/g,"");

export function isTrustedVideoProviderUrl(value:string,provider:VideoGenerationProvider){
  try{
    const url=new URL(value);if(url.protocol!=="https:"||url.username||url.password||url.search||url.hash)return false;
    const host=url.hostname.toLowerCase();
    if(provider.id==="kling-video")return host==="api-singapore.klingai.com"||host==="api-beijing.klingai.com";
    return host===new URL(provider.baseUrl).hostname.toLowerCase();
  }catch{return false}
}
