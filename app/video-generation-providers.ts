export type VideoWorkflow="text-to-video"|"image-to-video"|"first-last-frame";
export type VideoGenerationProtocol=
  |"runway-video"
  |"openai-video"
  |"gemini-veo"
  |"kling-video"
  |"byteplus-seedance"
  |"minimax-video"
  |"vidu-video"
  |"pixverse-video"
  |"luma-video"
  |"dashscope-wan";

export type VideoGenerationModel={id:string;name:string;workflows?:VideoWorkflow[]};
export type VideoGenerationProvider={
  id:string;
  name:string;
  short:string;
  baseUrl:string;
  protocol:VideoGenerationProtocol;
  logo:string;
  hint:string;
  docsUrl:string;
  auth:"api-key"|"access-secret";
  workflows:VideoWorkflow[];
  models:VideoGenerationModel[];
};

const ALL:VideoWorkflow[]=["text-to-video","image-to-video","first-last-frame"];
const TEXT_IMAGE:VideoWorkflow[]=["text-to-video","image-to-video"];

export const VIDEO_GENERATION_PROVIDERS:VideoGenerationProvider[]=[
  {id:"runway-video",name:"Runway",short:"RW",baseUrl:"https://api.dev.runwayml.com/v1",protocol:"runway-video",logo:"https://runwayml.com/favicon.ico",hint:"Runway 官方直连；仅列出 Runway 原生视频模型",docsUrl:"https://docs.dev.runwayml.com/api/",auth:"api-key",workflows:TEXT_IMAGE,models:[
    {id:"gen4.5",name:"Runway Gen-4.5"},{id:"gen4_turbo",name:"Runway Gen-4 Turbo"},
  ]},
  {id:"openai-video",name:"OpenAI Sora",short:"OA",baseUrl:"https://api.openai.com/v1",protocol:"openai-video",logo:"https://openai.com/favicon.ico",hint:"Sora 2 官方视频任务、进度与成片接口",docsUrl:"https://platform.openai.com/docs/api-reference/videos",auth:"api-key",workflows:TEXT_IMAGE,models:[
    {id:"sora-2",name:"Sora 2"},{id:"sora-2-pro",name:"Sora 2 Pro"},
  ]},
  {id:"gemini-veo",name:"Google Veo",short:"GV",baseUrl:"https://generativelanguage.googleapis.com/v1beta",protocol:"gemini-veo",logo:"https://www.google.com/favicon.ico",hint:"Google Gemini API 原生 Veo 3.1，支持首帧与首尾帧",docsUrl:"https://ai.google.dev/gemini-api/docs/veo",auth:"api-key",workflows:ALL,models:[
    {id:"veo-3.1-generate-preview",name:"Veo 3.1"},{id:"veo-3.1-fast-generate-preview",name:"Veo 3.1 Fast"},{id:"veo-3.1-lite-generate-preview",name:"Veo 3.1 Lite"},
  ]},
  {id:"kling-video",name:"Kling AI",short:"KL",baseUrl:"https://api-singapore.klingai.com",protocol:"kling-video",logo:"https://klingai.com/favicon.ico",hint:"可灵官方新系统；需要 Access Key + Secret Key",docsUrl:"https://app.klingai.com/global/dev/document-api/quickStart/productIntroduction/overview",auth:"access-secret",workflows:ALL,models:[
    {id:"kling-v3",name:"Kling 3.0"},{id:"kling-v3-omni",name:"Kling 3.0 Omni"},{id:"kling-video-o1",name:"Kling Video O1"},{id:"kling-v2-6",name:"Kling 2.6"},
  ]},
  {id:"byteplus-seedance",name:"Seedance / BytePlus",short:"SD",baseUrl:"https://ark.ap-southeast.bytepluses.com/api/v3",protocol:"byteplus-seedance",logo:"https://www.byteplus.com/favicon.ico",hint:"BytePlus ModelArk 官方 Seedance 2.0 系列直连",docsUrl:"https://docs.byteplus.com/en/docs/modelark/1520757",auth:"api-key",workflows:ALL,models:[
    {id:"dreamina-seedance-2-0-260128",name:"Seedance 2.0"},{id:"dreamina-seedance-2-0-fast-260128",name:"Seedance 2.0 Fast"},{id:"dreamina-seedance-2-0-mini-260615",name:"Seedance 2.0 Mini"},
  ]},
  {id:"minimax-video",name:"MiniMax Hailuo",short:"HL",baseUrl:"https://api.minimax.io/v1",protocol:"minimax-video",logo:"https://www.minimax.io/favicon.ico",hint:"MiniMax 官方 Hailuo 视频接口与文件下载",docsUrl:"https://platform.minimax.io/docs/guides/video-generation",auth:"api-key",workflows:ALL,models:[
    {id:"MiniMax-Hailuo-2.3",name:"Hailuo 2.3",workflows:TEXT_IMAGE},{id:"MiniMax-Hailuo-2.3-Fast",name:"Hailuo 2.3 Fast",workflows:["image-to-video"]},{id:"MiniMax-Hailuo-02",name:"Hailuo 02",workflows:ALL},
  ]},
  {id:"vidu-video",name:"Vidu",short:"VD",baseUrl:"https://api.vidu.com/ent/v2",protocol:"vidu-video",logo:"https://www.vidu.com/favicon.ico",hint:"Vidu Q3 官方直连，支持原生声画同步",docsUrl:"https://platform.vidu.com/docs/text-to-video",auth:"api-key",workflows:ALL,models:[
    {id:"viduq3-pro",name:"Vidu Q3 Pro",workflows:ALL},{id:"viduq3-turbo",name:"Vidu Q3 Turbo",workflows:ALL},{id:"viduq3-pro-fast",name:"Vidu Q3 Pro Fast",workflows:["image-to-video"]},
  ]},
  {id:"pixverse-video",name:"PixVerse",short:"PV",baseUrl:"https://app-api.pixverse.ai/openapi/v2",protocol:"pixverse-video",logo:"https://pixverse.ai/favicon.ico",hint:"PixVerse V6 / C1 官方生成、上传与任务查询",docsUrl:"https://docs.platform.pixverse.ai/how-does-the-api-work-882967m0",auth:"api-key",workflows:ALL,models:[
    {id:"v6",name:"PixVerse V6"},{id:"c1",name:"PixVerse C1"},
  ]},
  {id:"luma-video",name:"Luma Ray",short:"LU",baseUrl:"https://agents.lumalabs.ai/v1",protocol:"luma-video",logo:"https://lumalabs.ai/favicon.ico",hint:"Luma Agents 官方 Ray 3.2 视频接口",docsUrl:"https://docs.agents.lumalabs.ai/api/resources/generations/methods/create",auth:"api-key",workflows:ALL,models:[
    {id:"ray-3.2",name:"Luma Ray 3.2"},
  ]},
  {id:"dashscope-wan",name:"Alibaba Wan",short:"WN",baseUrl:"https://dashscope-intl.aliyuncs.com/api/v1",protocol:"dashscope-wan",logo:"https://www.alibabacloud.com/favicon.ico",hint:"阿里云 Model Studio 官方 Wan 2.7；可改为工作空间专属域名",docsUrl:"https://www.alibabacloud.com/help/en/model-studio/use-video-generation",auth:"api-key",workflows:ALL,models:[
    {id:"wan2.7-t2v-2026-06-12",name:"Wan 2.7 Text-to-Video",workflows:["text-to-video"]},{id:"wan2.7-i2v-2026-04-25",name:"Wan 2.7 Image-to-Video",workflows:["image-to-video","first-last-frame"]},
  ]},
];

export const videoGenerationProviderById=(id?:string)=>VIDEO_GENERATION_PROVIDERS.find(item=>item.id===id)||VIDEO_GENERATION_PROVIDERS[0];
export const normalizeVideoBaseUrl=(value:string)=>value.trim().replace(/\/+$/g,"");
export function videoProviderSupportsWorkflow(provider:VideoGenerationProvider,modelId:string,workflow:VideoWorkflow){
  const model=provider.models.find(item=>item.id===modelId);return(model?.workflows||provider.workflows).includes(workflow);
}

export function isTrustedVideoProviderUrl(value:string,provider:VideoGenerationProvider){
  try{
    const url=new URL(value);if(url.protocol!=="https:"||url.username||url.password||url.search||url.hash)return false;
    const host=url.hostname.toLowerCase();
    if(provider.id==="kling-video")return host==="api-singapore.klingai.com"||host==="api-beijing.klingai.com";
    if(provider.id==="byteplus-seedance")return host==="ark.ap-southeast.bytepluses.com"||host==="ark.eu-west.bytepluses.com";
    if(provider.id==="dashscope-wan")return host==="dashscope-intl.aliyuncs.com"||host==="dashscope.aliyuncs.com"||host==="dashscope-us.aliyuncs.com"||/^[a-z0-9-]+\.(?:ap-southeast-1|cn-beijing|eu-central-1)\.maas\.aliyuncs\.com$/.test(host);
    return host===new URL(provider.baseUrl).hostname.toLowerCase();
  }catch{return false}
}
