"use client";
/* eslint-disable @next/next/no-img-element -- ComfyUI returns authenticated runtime blob URLs. */

import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent, type WheelEvent as ReactWheelEvent } from "react";
import type { Locale } from "./i18n";

type ComfyValue=string|number|boolean|null|ComfyValue[]|{[key:string]:ComfyValue};
type ComfyNode={class_type:string;inputs:Record<string,ComfyValue>;_meta?:{title?:string}};
type ComfyWorkflow=Record<string,ComfyNode>;
type Point={x:number;y:number};
type NodeDefinition={type:string;title:string;color:string;inputs:Record<string,ComfyValue>;connections:string[];outputs:string[]};
type ResultAsset={url:string;name:string;kind:"image"|"video"|"audio"};
type ConnectionSource={nodeId:string;output:number}|null;
type DragState={kind:"pan";pointerId:number;startX:number;startY:number;origin:Point}|{kind:"node";pointerId:number;nodeId:string;startX:number;startY:number;origin:Point}|null;

const NODE_WIDTH=238;
const NODE_LIBRARY:NodeDefinition[]=[
  {type:"CheckpointLoaderSimple",title:"Load Checkpoint",color:"violet",inputs:{ckpt_name:""},connections:[],outputs:["MODEL","CLIP","VAE"]},
  {type:"CLIPTextEncode",title:"CLIP Text Encode",color:"amber",inputs:{text:"",clip:null},connections:["clip"],outputs:["CONDITIONING"]},
  {type:"EmptyLatentImage",title:"Empty Latent Image",color:"rose",inputs:{width:1024,height:1024,batch_size:1},connections:[],outputs:["LATENT"]},
  {type:"KSampler",title:"KSampler",color:"orange",inputs:{seed:42,steps:24,cfg:7,sampler_name:"euler",scheduler:"normal",denoise:1,model:null,positive:null,negative:null,latent_image:null},connections:["model","positive","negative","latent_image"],outputs:["LATENT"]},
  {type:"VAEDecode",title:"VAE Decode",color:"blue",inputs:{samples:null,vae:null},connections:["samples","vae"],outputs:["IMAGE"]},
  {type:"VAEEncode",title:"VAE Encode",color:"blue",inputs:{pixels:null,vae:null},connections:["pixels","vae"],outputs:["LATENT"]},
  {type:"LoadImage",title:"Load Image",color:"green",inputs:{image:""},connections:[],outputs:["IMAGE","MASK"]},
  {type:"SaveImage",title:"Save Image",color:"blue",inputs:{filename_prefix:"FRAME",images:null},connections:["images"],outputs:[]},
  {type:"PreviewImage",title:"Preview Image",color:"blue",inputs:{images:null},connections:["images"],outputs:[]},
  {type:"ControlNetLoader",title:"Load ControlNet",color:"green",inputs:{control_net_name:""},connections:[],outputs:["CONTROL_NET"]},
];

const COPY:Record<Locale,Record<string,string>>={
  "zh-CN":{title:"把生成流程直接搭在画布上。",intro:"导入 ComfyUI API 工作流，拖动节点、编辑参数、连接端口，并发送到你自己的 ComfyUI 执行。这里不调用文字模型，不消耗语言模型 Token。",library:"节点库",connection:"执行连接",local:"自托管 ComfyUI",cloud:"Comfy Cloud",endpoint:"服务地址",token:"访问密钥（仅本次会话）",tokenHint:"密钥不会保存到本站账户或浏览器持久存储",connect:"测试连接",connecting:"正在连接…",connected:"连接成功",run:"加入队列",running:"工作流执行中…",cancel:"取消任务",import:"导入工作流",export:"导出 API JSON",reset:"新建工作流",fit:"适应画布",zoomIn:"放大",zoomOut:"缩小",open:"打开原始 ComfyUI",inspector:"节点检查器",selectNode:"选择一个节点以编辑输入参数",delete:"删除节点",duplicate:"复制节点",disconnect:"断开",connectFrom:"等待连接到输入端口",workflowReady:"工作流已就绪",workflowImported:"工作流已导入",workflowSaved:"工作流已导出",invalidWorkflow:"请选择由 ComfyUI“Save (API Format)”导出的 JSON 工作流",fileTooLarge:"工作流文件不能超过 2MB",emptyWorkflow:"画布中没有可以执行的节点",checkpointMissing:"请先在 Checkpoint 节点填写本机已有的模型文件名，或导入可执行工作流",endpointRequired:"请填写可从当前浏览器访问的 ComfyUI HTTPS 地址",cloudKeyRequired:"Comfy Cloud 需要 API Key",corsHint:"自托管服务需要 HTTPS，并允许此网站跨域访问；本机 8188 端口不能直接从线上服务器代理。",queued:"任务已加入 ComfyUI 队列",complete:"工作流执行完成",noOutput:"工作流完成，但没有发现可预览的媒体输出",failed:"ComfyUI 执行失败",storyInput:"已接收来自 01 的镜头提示词",results:"执行结果",emptyCanvas:"空画布",nodeCount:"{count} 个节点",apiFormat:"COMFYUI API FORMAT",unknownNode:"自定义节点"},
  "zh-TW":{title:"把生成流程直接搭在畫布上。",intro:"匯入 ComfyUI API 工作流，拖動節點、編輯參數、連接端口，並傳送到自己的 ComfyUI 執行。此處不呼叫文字模型，不消耗語言模型 Token。",library:"節點庫",connection:"執行連接",local:"自架 ComfyUI",cloud:"Comfy Cloud",endpoint:"服務位址",token:"存取密鑰（僅本次工作階段）",tokenHint:"密鑰不會儲存到本站帳戶或瀏覽器永久空間",connect:"測試連接",connecting:"正在連接…",connected:"連接成功",run:"加入佇列",running:"工作流執行中…",cancel:"取消任務",import:"匯入工作流",export:"匯出 API JSON",reset:"新增工作流",fit:"適應畫布",zoomIn:"放大",zoomOut:"縮小",open:"開啟原始 ComfyUI",inspector:"節點檢查器",selectNode:"選擇節點以編輯輸入參數",delete:"刪除節點",duplicate:"複製節點",disconnect:"斷開",connectFrom:"等待連接到輸入端口",workflowReady:"工作流已就緒",workflowImported:"工作流已匯入",workflowSaved:"工作流已匯出",invalidWorkflow:"請選擇由 ComfyUI「Save (API Format)」匯出的 JSON 工作流",fileTooLarge:"工作流檔案不能超過 2MB",emptyWorkflow:"畫布中沒有可執行節點",checkpointMissing:"請在 Checkpoint 節點填寫本機已有模型檔名，或匯入可執行工作流",endpointRequired:"請填寫目前瀏覽器可存取的 ComfyUI HTTPS 位址",cloudKeyRequired:"Comfy Cloud 需要 API Key",corsHint:"自架服務需要 HTTPS 並允許本站跨域存取；線上網站不能直接代理本機 8188 端口。",queued:"任務已加入 ComfyUI 佇列",complete:"工作流執行完成",noOutput:"工作流完成，但沒有找到可預覽的媒體輸出",failed:"ComfyUI 執行失敗",storyInput:"已接收來自 01 的鏡頭提示詞",results:"執行結果",emptyCanvas:"空白畫布",nodeCount:"{count} 個節點",apiFormat:"COMFYUI API FORMAT",unknownNode:"自訂節點"},
  ja:{title:"生成フローを、そのままキャンバスへ。",intro:"ComfyUI API ワークフローを読み込み、ノード移動、入力編集、接続、実行まで行えます。言語モデルは呼び出さないため、LLM トークンを消費しません。",library:"ノードライブラリ",connection:"実行接続",local:"セルフホスト ComfyUI",cloud:"Comfy Cloud",endpoint:"サービス URL",token:"アクセスキー（このセッションのみ）",tokenHint:"キーはサイトのアカウントや永続ストレージに保存されません",connect:"接続テスト",connecting:"接続中…",connected:"接続しました",run:"キューへ追加",running:"ワークフロー実行中…",cancel:"タスクをキャンセル",import:"ワークフロー読込",export:"API JSON 書出",reset:"新規ワークフロー",fit:"全体表示",zoomIn:"拡大",zoomOut:"縮小",open:"ComfyUI を開く",inspector:"ノードインスペクター",selectNode:"ノードを選択して入力値を編集",delete:"ノード削除",duplicate:"複製",disconnect:"切断",connectFrom:"入力ポートを選んで接続",workflowReady:"ワークフロー準備完了",workflowImported:"ワークフローを読み込みました",workflowSaved:"ワークフローを書き出しました",invalidWorkflow:"ComfyUI の「Save (API Format)」で書き出した JSON を選択してください",fileTooLarge:"ワークフローは 2MB 以下にしてください",emptyWorkflow:"実行できるノードがありません",checkpointMissing:"Checkpoint ノードにローカルのモデル名を入力するか、実行可能なワークフローを読み込んでください",endpointRequired:"ブラウザから接続できる ComfyUI HTTPS URL を入力してください",cloudKeyRequired:"Comfy Cloud API Key が必要です",corsHint:"セルフホストは HTTPS と CORS 許可が必要です。公開サイトからローカル 8188 番ポートを代理接続することはできません。",queued:"ComfyUI キューに追加しました",complete:"ワークフロー完了",noOutput:"完了しましたが、表示可能なメディア出力がありません",failed:"ComfyUI 実行に失敗しました",storyInput:"01 のショットプロンプトを受け取りました",results:"実行結果",emptyCanvas:"空のキャンバス",nodeCount:"{count} ノード",apiFormat:"COMFYUI API FORMAT",unknownNode:"カスタムノード"},
  en:{title:"Build the generation flow on the canvas.",intro:"Import a ComfyUI API workflow, move nodes, edit inputs, connect ports, and run it on your own ComfyUI. No language model is called here, so this workspace uses no LLM tokens.",library:"Node library",connection:"Execution connection",local:"Self-hosted ComfyUI",cloud:"Comfy Cloud",endpoint:"Service URL",token:"Access key (this session only)",tokenHint:"The key is never saved to your FRAME account or persistent browser storage",connect:"Test connection",connecting:"Connecting…",connected:"Connected",run:"Queue workflow",running:"Workflow is running…",cancel:"Cancel job",import:"Import workflow",export:"Export API JSON",reset:"New workflow",fit:"Fit canvas",zoomIn:"Zoom in",zoomOut:"Zoom out",open:"Open full ComfyUI",inspector:"Node inspector",selectNode:"Select a node to edit its inputs",delete:"Delete node",duplicate:"Duplicate",disconnect:"Disconnect",connectFrom:"Choose an input port to complete the connection",workflowReady:"Workflow ready",workflowImported:"Workflow imported",workflowSaved:"Workflow exported",invalidWorkflow:"Choose JSON exported with ComfyUI “Save (API Format)”",fileTooLarge:"Workflow files must be 2MB or smaller",emptyWorkflow:"There are no executable nodes on the canvas",checkpointMissing:"Enter a model installed on your ComfyUI in the Checkpoint node, or import a runnable workflow",endpointRequired:"Enter a ComfyUI HTTPS URL reachable from this browser",cloudKeyRequired:"Comfy Cloud requires an API Key",corsHint:"Self-hosted servers need HTTPS and must allow cross-origin access from this site. The hosted site cannot proxy your local port 8188.",queued:"Added to the ComfyUI queue",complete:"Workflow complete",noOutput:"The workflow completed without a previewable media output",failed:"ComfyUI execution failed",storyInput:"Received a shot prompt from 01",results:"Execution results",emptyCanvas:"Empty canvas",nodeCount:"{count} nodes",apiFormat:"COMFYUI API FORMAT",unknownNode:"Custom node"},
};

export function comfyModuleCopy(locale:Locale){
  return locale==="zh-CN"?{desc:"导入并编辑 ComfyUI 节点工作流，连接自己的 GPU 或 Comfy Cloud 直接执行。",enter:"进入工作流画布"}:locale==="zh-TW"?{desc:"匯入並編輯 ComfyUI 節點工作流，連接自己的 GPU 或 Comfy Cloud 直接執行。",enter:"進入工作流畫布"}:locale==="ja"?{desc:"ComfyUI ノードを編集し、自分の GPU または Comfy Cloud で直接実行します。",enter:"ワークフローを開く"}:{desc:"Import and edit ComfyUI node graphs, then run them on your GPU or Comfy Cloud.",enter:"Open workflow canvas"};
}

function definitionFor(type:string){return NODE_LIBRARY.find(item=>item.type===type)}
function isConnection(value:ComfyValue):value is [string|number,number]{return Array.isArray(value)&&value.length===2&&(typeof value[0]==="string"||typeof value[0]==="number")&&typeof value[1]==="number"}
function inputNames(node:ComfyNode){const defined=definitionFor(node.class_type)?.connections||[];return [...new Set([...defined,...Object.keys(node.inputs)])]}
function outputsFor(node:ComfyNode){return definitionFor(node.class_type)?.outputs||["OUTPUT"]}
function titleFor(node:ComfyNode){return node._meta?.title||definitionFor(node.class_type)?.title||node.class_type}
function colorFor(node:ComfyNode){return definitionFor(node.class_type)?.color||"neutral"}

function starterWorkflow(prompt=""):{workflow:ComfyWorkflow;positions:Record<string,Point>}{
  const workflow:ComfyWorkflow={
    "1":{class_type:"CheckpointLoaderSimple",inputs:{ckpt_name:""},_meta:{title:"Load Checkpoint"}},
    "2":{class_type:"CLIPTextEncode",inputs:{text:prompt||"cinematic portrait, precise lighting, coherent anatomy",clip:["1",1]},_meta:{title:"Positive Prompt"}},
    "3":{class_type:"CLIPTextEncode",inputs:{text:"low quality, deformed anatomy, text, watermark",clip:["1",1]},_meta:{title:"Negative Prompt"}},
    "4":{class_type:"EmptyLatentImage",inputs:{width:1024,height:1024,batch_size:1}},
    "5":{class_type:"KSampler",inputs:{seed:42,steps:24,cfg:7,sampler_name:"euler",scheduler:"normal",denoise:1,model:["1",0],positive:["2",0],negative:["3",0],latent_image:["4",0]}},
    "6":{class_type:"VAEDecode",inputs:{samples:["5",0],vae:["1",2]}},
    "7":{class_type:"SaveImage",inputs:{filename_prefix:"FRAME",images:["6",0]}},
  };
  const positions:Record<string,Point>={"1":{x:80,y:140},"2":{x:390,y:55},"3":{x:390,y:290},"4":{x:390,y:520},"5":{x:720,y:200},"6":{x:1030,y:220},"7":{x:1330,y:220}};
  return{workflow,positions};
}

function autoLayout(workflow:ComfyWorkflow){const positions:Record<string,Point>={};Object.keys(workflow).forEach((id,index)=>{positions[id]={x:70+(index%4)*300,y:70+Math.floor(index/4)*270}});return positions}

function normalizeWorkflow(raw:unknown):ComfyWorkflow{
  const wrapper=raw&&typeof raw==="object"&&!Array.isArray(raw)?raw as Record<string,unknown>:null;
  const candidate=wrapper?.prompt&&typeof wrapper.prompt==="object"?wrapper.prompt:wrapper;
  if(!candidate||Array.isArray(candidate)||Array.isArray((candidate as Record<string,unknown>).nodes))throw new Error("API_FORMAT_REQUIRED");
  const entries=Object.entries(candidate);
  if(!entries.length||entries.length>300)throw new Error("API_FORMAT_REQUIRED");
  const result:ComfyWorkflow=Object.create(null);
  for(const [id,value] of entries){
    if(["__proto__","prototype","constructor"].includes(id)||!value||typeof value!=="object"||Array.isArray(value))throw new Error("API_FORMAT_REQUIRED");
    const node=value as Record<string,unknown>;if(typeof node.class_type!=="string"||node.class_type.length>180||!node.inputs||typeof node.inputs!=="object"||Array.isArray(node.inputs))throw new Error("API_FORMAT_REQUIRED");
    const meta=node._meta&&typeof node._meta==="object"?node._meta as Record<string,unknown>:null;
    result[id]={class_type:node.class_type,inputs:structuredClone(node.inputs) as Record<string,ComfyValue>,_meta:typeof meta?.title==="string"?{title:meta.title.slice(0,180)}:undefined};
  }
  return result;
}

function nextNodeId(workflow:ComfyWorkflow){const numeric=Object.keys(workflow).map(Number).filter(Number.isFinite);return String((numeric.length?Math.max(...numeric):0)+1)}
function normalizePositions(raw:unknown,workflow:ComfyWorkflow){if(!raw||typeof raw!=="object"||Array.isArray(raw))return autoLayout(workflow);const fallback=autoLayout(workflow);for(const id of Object.keys(workflow)){const value=(raw as Record<string,unknown>)[id];if(!value||typeof value!=="object"||Array.isArray(value))continue;const point=value as Record<string,unknown>;if(Number.isFinite(point.x)&&Number.isFinite(point.y))fallback[id]={x:Math.max(-4000,Math.min(4000,Number(point.x))),y:Math.max(-4000,Math.min(4000,Number(point.y)))}}return fallback}
function replaceTemplate(value:string,count:number){return value.replace("{count}",String(count))}
function baseEndpoint(value:string){return value.trim().replace(/\/+$/,"")}
function validEndpoint(value:string,cloud:boolean){try{const url=new URL(value);return url.protocol==="https:"&&(cloud?url.hostname==="cloud.comfy.org":true)&&!url.username&&!url.password}catch{return false}}

function extractOutputFiles(outputs:unknown){
  const files:Array<{filename:string;subfolder:string;type:string;kind:"image"|"video"|"audio"}>=[];
  if(!outputs||typeof outputs!=="object")return files;
  for(const output of Object.values(outputs as Record<string,unknown>)){
    if(!output||typeof output!=="object")continue;
    const record=output as Record<string,unknown>;
    for(const [key,kind] of [["images","image"],["gifs","image"],["videos","video"],["audio","audio"]] as const){
      const list=record[key];if(!Array.isArray(list))continue;
      for(const item of list){if(item&&typeof item==="object"&&typeof (item as Record<string,unknown>).filename==="string")files.push({filename:String((item as Record<string,unknown>).filename),subfolder:String((item as Record<string,unknown>).subfolder||""),type:String((item as Record<string,unknown>).type||"output"),kind})}
    }
  }
  return files;
}

function ValueEditor({value,onChange}:{value:ComfyValue;onChange:(value:ComfyValue)=>void}){
  const [draft,setDraft]=useState(()=>typeof value==="object"&&value!==null?JSON.stringify(value):String(value??""));
  useEffect(()=>{let cancelled=false;queueMicrotask(()=>{if(!cancelled)setDraft(typeof value==="object"&&value!==null?JSON.stringify(value):String(value??""))});return()=>{cancelled=true}},[value]);
  if(typeof value==="boolean")return <button className={`comfy-bool ${value?"on":""}`} onClick={()=>onChange(!value)}><i/>{String(value)}</button>;
  if(typeof value==="number")return <input type="number" value={Number.isFinite(Number(draft))?draft:""} onChange={event=>{setDraft(event.target.value);const next=Number(event.target.value);if(Number.isFinite(next))onChange(next)}}/>;
  if(typeof value==="string"&&(value.length>44||value.includes("\n")))return <textarea value={draft} onChange={event=>{setDraft(event.target.value);onChange(event.target.value)}}/>;
  if(typeof value==="object"&&value!==null)return <textarea value={draft} onChange={event=>setDraft(event.target.value)} onBlur={()=>{try{onChange(JSON.parse(draft) as ComfyValue)}catch{setDraft(JSON.stringify(value))}}}/>;
  return <input value={draft} onChange={event=>{setDraft(event.target.value);onChange(event.target.value)}}/>;
}

export default function ComfyWorkflowStudio({locale,seedPrompt="",seedVersion=0,pipelineTitle=""}:{locale:Locale;seedPrompt?:string;seedVersion?:number;pipelineTitle?:string}){
  const text=COPY[locale];const initial=useMemo(()=>starterWorkflow(),[]);
  const [workflow,setWorkflow]=useState<ComfyWorkflow>(initial.workflow);const [positions,setPositions]=useState<Record<string,Point>>(initial.positions);const [selectedId,setSelectedId]=useState("2");
  const [pan,setPan]=useState<Point>({x:45,y:30});const [zoom,setZoom]=useState(.78);const [connectionSource,setConnectionSource]=useState<ConnectionSource>(null);const [restored,setRestored]=useState(false);
  const [serverMode,setServerMode]=useState<"local"|"cloud">("local");const [endpoint,setEndpoint]=useState("https://your-comfyui.example.com");const [token,setToken]=useState("");const [authMode,setAuthMode]=useState<"none"|"bearer"|"x-api-key">("none");const [showToken,setShowToken]=useState(false);
  const [status,setStatus]=useState(text.workflowReady);const [connected,setConnected]=useState(false);const [running,setRunning]=useState(false);const [promptId,setPromptId]=useState("");const [results,setResults]=useState<ResultAsset[]>([]);
  const canvasRef=useRef<HTMLDivElement>(null);const fileRef=useRef<HTMLInputElement>(null);const dragRef=useRef<DragState>(null);const runRef=useRef(0);const resultUrlsRef=useRef<string[]>([]);

  useEffect(()=>{let cancelled=false;queueMicrotask(()=>{if(cancelled)return;try{const saved=localStorage.getItem("frame-comfy-workflow-v1");const savedPositions=localStorage.getItem("frame-comfy-positions-v1");const savedMode=localStorage.getItem("frame-comfy-mode-v1");const savedEndpoint=localStorage.getItem("frame-comfy-endpoint-v1");if(saved){const next=normalizeWorkflow(JSON.parse(saved));setWorkflow(next);setPositions(normalizePositions(savedPositions?JSON.parse(savedPositions):null,next));setSelectedId(Object.keys(next)[0]||"")}if(savedMode==="cloud"||savedMode==="local")setServerMode(savedMode);if(savedEndpoint)setEndpoint(savedEndpoint)}catch{}finally{setRestored(true)}});return()=>{cancelled=true}},[]);
  useEffect(()=>{if(!restored)return;localStorage.setItem("frame-comfy-workflow-v1",JSON.stringify(workflow));localStorage.setItem("frame-comfy-positions-v1",JSON.stringify(positions))},[workflow,positions,restored]);
  useEffect(()=>{if(!restored)return;localStorage.setItem("frame-comfy-mode-v1",serverMode);localStorage.setItem("frame-comfy-endpoint-v1",endpoint)},[serverMode,endpoint,restored]);
  useEffect(()=>{if(!seedVersion||!seedPrompt.trim())return;let cancelled=false;queueMicrotask(()=>{if(cancelled)return;setWorkflow(current=>{const next=structuredClone(current);const target=Object.entries(next).find(([,node])=>node.class_type==="CLIPTextEncode"&&!/negative/i.test(node._meta?.title||""));if(target)target[1].inputs.text=seedPrompt.trim();else{const id=nextNodeId(next);next[id]={class_type:"CLIPTextEncode",inputs:{text:seedPrompt.trim(),clip:null},_meta:{title:"Story Prompt"}};setPositions(currentPositions=>({...currentPositions,[id]:{x:400,y:100}}));setSelectedId(id)}return next});setStatus(text.storyInput)});return()=>{cancelled=true}},[seedVersion,seedPrompt,text.storyInput]);
  useEffect(()=>()=>{for(const url of resultUrlsRef.current)URL.revokeObjectURL(url)},[]);
  useEffect(()=>{const onKey=(event:KeyboardEvent)=>{const target=event.target as HTMLElement|null;if(target?.matches("input,textarea,select,[contenteditable='true']"))return;if((event.key==="Delete"||event.key==="Backspace")&&selectedId){event.preventDefault();deleteNode(selectedId)}if(event.key==="Escape")setConnectionSource(null)};window.addEventListener("keydown",onKey);return()=>window.removeEventListener("keydown",onKey)});

  const selected=selectedId?workflow[selectedId]:undefined;
  const edges=useMemo(()=>Object.entries(workflow).flatMap(([targetId,node])=>inputNames(node).flatMap((name,inputIndex)=>{const value=node.inputs[name];return isConnection(value)&&workflow[String(value[0])]? [{sourceId:String(value[0]),output:value[1],targetId,inputName:name,inputIndex}]:[]})),[workflow]);

  function updateNode(id:string,mutate:(node:ComfyNode)=>void){setWorkflow(current=>{const next=structuredClone(current);if(next[id])mutate(next[id]);return next})}
  function addNode(definition:NodeDefinition){const id=nextNodeId(workflow);setWorkflow(current=>({...current,[id]:{class_type:definition.type,inputs:structuredClone(definition.inputs),_meta:{title:definition.title}}}));const rect=canvasRef.current?.getBoundingClientRect();setPositions(current=>({...current,[id]:{x:Math.max(40,((rect?.width||900)/2-pan.x)/zoom-120),y:Math.max(40,((rect?.height||600)/2-pan.y)/zoom-80)}}));setSelectedId(id);setStatus(`${definition.title} · ${text.workflowReady}`)}
  function deleteNode(id:string){setWorkflow(current=>{const next=structuredClone(current);delete next[id];for(const node of Object.values(next))for(const [name,value] of Object.entries(node.inputs))if(isConnection(value)&&String(value[0])===id)delete node.inputs[name];return next});setPositions(current=>{const next={...current};delete next[id];return next});setSelectedId(current=>current===id?"":current);setConnectionSource(current=>current?.nodeId===id?null:current)}
  function duplicateNode(id:string){const node=workflow[id];if(!node)return;const nextId=nextNodeId(workflow);setWorkflow(current=>({...current,[nextId]:structuredClone(node)}));const origin=positions[id]||{x:80,y:80};setPositions(current=>({...current,[nextId]:{x:origin.x+36,y:origin.y+42}}));setSelectedId(nextId)}
  function connectInput(targetId:string,inputName:string){if(!connectionSource){const existing=workflow[targetId]?.inputs[inputName];if(isConnection(existing))updateNode(targetId,node=>{delete node.inputs[inputName]});return}if(connectionSource.nodeId===targetId){setStatus(text.failed);return}updateNode(targetId,node=>{node.inputs[inputName]=[connectionSource.nodeId,connectionSource.output]});setConnectionSource(null);setSelectedId(targetId)}
  function onNodePointerDown(event:ReactPointerEvent<HTMLElement>,nodeId:string){if(event.button!==0)return;event.stopPropagation();setSelectedId(nodeId);canvasRef.current?.setPointerCapture(event.pointerId);dragRef.current={kind:"node",pointerId:event.pointerId,nodeId,startX:event.clientX,startY:event.clientY,origin:positions[nodeId]||{x:0,y:0}}}
  function onCanvasPointerDown(event:ReactPointerEvent<HTMLDivElement>){if(event.button!==0||((event.target as HTMLElement).closest("button,input,textarea,select,.comfy-node")))return;canvasRef.current?.setPointerCapture(event.pointerId);dragRef.current={kind:"pan",pointerId:event.pointerId,startX:event.clientX,startY:event.clientY,origin:pan};setSelectedId("")}
  function onCanvasPointerMove(event:ReactPointerEvent<HTMLDivElement>){const drag=dragRef.current;if(!drag||drag.pointerId!==event.pointerId)return;if(drag.kind==="pan")setPan({x:drag.origin.x+event.clientX-drag.startX,y:drag.origin.y+event.clientY-drag.startY});else setPositions(current=>({...current,[drag.nodeId]:{x:drag.origin.x+(event.clientX-drag.startX)/zoom,y:drag.origin.y+(event.clientY-drag.startY)/zoom}}))}
  function onCanvasPointerUp(event:ReactPointerEvent<HTMLDivElement>){if(dragRef.current?.pointerId===event.pointerId)dragRef.current=null;try{canvasRef.current?.releasePointerCapture(event.pointerId)}catch{}}
  function onWheel(event:ReactWheelEvent<HTMLDivElement>){event.preventDefault();setZoom(current=>Math.max(.32,Math.min(1.5,current*(event.deltaY>0?.9:1.1))))}
  function fitCanvas(){const values=Object.values(positions);if(!values.length){setPan({x:40,y:40});setZoom(1);return}const minX=Math.min(...values.map(point=>point.x));const maxX=Math.max(...values.map(point=>point.x+NODE_WIDTH));const minY=Math.min(...values.map(point=>point.y));const maxY=Math.max(...values.map(point=>point.y+220));const rect=canvasRef.current?.getBoundingClientRect();if(!rect)return;const nextZoom=Math.max(.32,Math.min(1,Math.min((rect.width-90)/(maxX-minX),(rect.height-90)/(maxY-minY))));setZoom(nextZoom);setPan({x:(rect.width-(minX+maxX)*nextZoom)/2,y:(rect.height-(minY+maxY)*nextZoom)/2})}
  function resetWorkflow(){const next=starterWorkflow(seedPrompt);setWorkflow(next.workflow);setPositions(next.positions);setSelectedId("2");setPan({x:45,y:30});setZoom(.78);setResults([]);setStatus(text.workflowReady)}
  async function importWorkflow(file:File){if(file.size>2*1024*1024){setStatus(text.fileTooLarge);return}try{const next=normalizeWorkflow(JSON.parse(await file.text()));setWorkflow(next);setPositions(autoLayout(next));setSelectedId(Object.keys(next)[0]||"");setResults([]);setPan({x:35,y:35});setZoom(.72);setStatus(`${file.name} · ${text.workflowImported}`);window.setTimeout(fitCanvas,0)}catch{setStatus(text.invalidWorkflow)}}
  function exportWorkflow(){const blob=new Blob([JSON.stringify(workflow,null,2)],{type:"application/json"});const url=URL.createObjectURL(blob);const anchor=document.createElement("a");anchor.href=url;anchor.download=`FRAME-ComfyUI-API-${new Date().toISOString().slice(0,10)}.json`;anchor.click();URL.revokeObjectURL(url);setStatus(text.workflowSaved)}
  function switchServerMode(mode:"local"|"cloud"){setServerMode(mode);setConnected(false);setToken("");if(mode==="cloud"){setEndpoint("https://cloud.comfy.org");setAuthMode("x-api-key")}else{setEndpoint(current=>current.includes("cloud.comfy.org")?"https://your-comfyui.example.com":current);setAuthMode("none")}}
  function requestHeaders(json=false){const headers:Record<string,string>={};if(json)headers["Content-Type"]="application/json";if(token.trim()){if(serverMode==="cloud"||authMode==="x-api-key")headers["X-API-Key"]=token.trim();else if(authMode==="bearer")headers.Authorization=`Bearer ${token.trim()}`}return headers}
  function apiUrl(path:string){const base=baseEndpoint(endpoint);return serverMode==="cloud"?`${base}/api${path}`:`${base}${path}`}
  function validateConnection(){if(!validEndpoint(baseEndpoint(endpoint),serverMode==="cloud")){setStatus(text.endpointRequired);return false}if(serverMode==="cloud"&&!token.trim()){setStatus(text.cloudKeyRequired);return false}return true}
  async function testConnection(){if(!validateConnection())return;setConnected(false);setStatus(text.connecting);try{const response=await fetch(apiUrl("/object_info"),{headers:requestHeaders(),signal:AbortSignal.timeout(15000)});if(!response.ok)throw new Error(`${response.status}`);setConnected(true);setStatus(text.connected)}catch(error){setStatus(`${text.failed} · ${error instanceof Error?error.message:"NETWORK"}`)}}
  async function loadResults(outputs:unknown){for(const url of resultUrlsRef.current)URL.revokeObjectURL(url);resultUrlsRef.current=[];const files=extractOutputFiles(outputs);const loaded:ResultAsset[]=[];for(const file of files.slice(0,16)){try{const params=new URLSearchParams({filename:file.filename,subfolder:file.subfolder,type:file.type});const response=await fetch(`${apiUrl("/view")}?${params}`,{headers:requestHeaders(),signal:AbortSignal.timeout(30000)});if(!response.ok)continue;const url=URL.createObjectURL(await response.blob());resultUrlsRef.current.push(url);loaded.push({url,name:file.filename,kind:file.kind})}catch{}}setResults(loaded);setStatus(loaded.length?text.complete:text.noOutput)}
  async function runWorkflow(){
    if(running||!validateConnection())return;
    if(!Object.keys(workflow).length){setStatus(text.emptyWorkflow);return}
    const blankCheckpoint=Object.values(workflow).find(node=>node.class_type==="CheckpointLoaderSimple"&&!String(node.inputs.ckpt_name||"").trim());
    if(blankCheckpoint){setStatus(text.checkpointMissing);return}
    const runId=++runRef.current;setRunning(true);setResults([]);setStatus(text.queued);
    try{
      const response=await fetch(apiUrl("/prompt"),{method:"POST",headers:requestHeaders(true),body:JSON.stringify({prompt:workflow,client_id:crypto.randomUUID()}),signal:AbortSignal.timeout(30000)});
      const queued=await response.json().catch(()=>({}));
      if(!response.ok||!queued.prompt_id)throw new Error(queued?.error?.message||queued?.error||JSON.stringify(queued?.node_errors||{})||`HTTP ${response.status}`);
      const id=String(queued.prompt_id);setPromptId(id);setStatus(`${text.queued} · ${id.slice(0,8)}`);
      for(let attempt=0;attempt<180&&runRef.current===runId;attempt++){
        await new Promise(resolve=>window.setTimeout(resolve,1600));
        const progress=await fetch(serverMode==="cloud"?apiUrl(`/jobs/${encodeURIComponent(id)}`):apiUrl(`/history/${encodeURIComponent(id)}`),{headers:requestHeaders(),cache:"no-store",signal:AbortSignal.timeout(30000)});
        const data=await progress.json().catch(()=>({}));
        if(!progress.ok)throw new Error(data?.message||data?.error||`HTTP ${progress.status}`);
        if(serverMode==="cloud"){
          if(data.status==="failed"||data.status==="error"||data.status==="cancelled")throw new Error(data?.execution_error?.exception_message||data?.error_message||data.status);
          if(data.status==="completed"){await loadResults(data.outputs);return}
        }else{
          const entry=data?.[id]||data;
          if(entry?.status?.status_str==="error")throw new Error(entry?.status?.messages?.at?.(-1)?.[1]?.exception_message||"EXECUTION_ERROR");
          if(entry?.outputs&&Object.keys(entry.outputs).length||entry?.status?.completed===true||entry?.status?.status_str==="success"){await loadResults(entry?.outputs||{});return}
        }
        setStatus(`${text.running} ${Math.min(99,Math.round((attempt+1)/1.8))}%`);
      }
      if(runRef.current===runId)throw new Error("TIMEOUT");
    }catch(error){if(runRef.current===runId)setStatus(`${text.failed} · ${error instanceof Error?error.message:"UNKNOWN"}`)}
    finally{if(runRef.current===runId){setRunning(false);setPromptId("")}}
  }
  async function cancelWorkflow(){const id=promptId;runRef.current++;setRunning(false);setPromptId("");setStatus(text.cancel);if(!id)return;try{await fetch(apiUrl("/queue"),{method:"POST",headers:requestHeaders(true),body:JSON.stringify({delete:[id]}),signal:AbortSignal.timeout(15000)})}catch{}}

  return <section className="comfy-studio">
    <aside className="comfy-sidebar">
      <span className="eyebrow"><span/> COMFY WORKFLOW STUDIO</span><h1>{text.title}</h1><p className="intro">{text.intro}</p>
      {pipelineTitle&&<div className="pipeline-banner comfy-pipeline"><i>01 → 02</i><span><b>{pipelineTitle}</b><small>{text.storyInput}</small></span><em>CLIP</em></div>}
      <section className="comfy-connect-card"><div className="comfy-section-title"><span>01</span><div><b>{text.connection}</b><small>{serverMode==="cloud"?text.cloud:text.local}</small></div></div><div className="comfy-mode-switch"><button className={serverMode==="local"?"active":""} onClick={()=>switchServerMode("local")}>{text.local}</button><button className={serverMode==="cloud"?"active":""} onClick={()=>switchServerMode("cloud")}>{text.cloud}</button></div><label><span>{text.endpoint}</span><input value={endpoint} onChange={event=>{setEndpoint(event.target.value);setConnected(false)}} disabled={serverMode==="cloud"}/></label>{serverMode==="local"&&<label><span>AUTH</span><select value={authMode} onChange={event=>setAuthMode(event.target.value as typeof authMode)}><option value="none">NONE</option><option value="bearer">BEARER TOKEN</option><option value="x-api-key">X-API-KEY</option></select></label>}{(serverMode==="cloud"||authMode!=="none")&&<label><span>{text.token}</span><div className="secret-input"><input type={showToken?"text":"password"} value={token} onChange={event=>setToken(event.target.value)} autoComplete="off"/><button onClick={()=>setShowToken(value=>!value)}>{showToken?"—":"••"}</button></div><small>{text.tokenHint}</small></label>}<div className="comfy-connect-actions"><button onClick={testConnection}>{connected?`● ${text.connected}`:text.connect}</button><button onClick={()=>window.open(baseEndpoint(endpoint),"_blank","noopener,noreferrer")}>{text.open} ↗</button></div><p>{text.corsHint}</p></section>
      <section className="comfy-library"><div className="comfy-section-title"><span>02</span><div><b>{text.library}</b><small>CORE NODES · {NODE_LIBRARY.length}</small></div></div><div>{NODE_LIBRARY.map(item=><button key={item.type} onClick={()=>addNode(item)}><i className={`node-color ${item.color}`}/><span><b>{item.title}</b><small>{item.type}</small></span><em>＋</em></button>)}</div></section>
    </aside>
    <main className="comfy-main">
      <header className="comfy-toolbar"><div><span>{text.apiFormat}</span><b>{replaceTemplate(text.nodeCount,Object.keys(workflow).length)}</b></div><div className="comfy-toolbar-actions"><input ref={fileRef} type="file" accept="application/json,.json" onChange={event=>{const file=event.target.files?.[0];if(file)void importWorkflow(file);event.currentTarget.value=""}}/><button onClick={()=>fileRef.current?.click()}>↥ {text.import}</button><button onClick={exportWorkflow}>↧ {text.export}</button><button onClick={resetWorkflow}>＋ {text.reset}</button><span/><button aria-label={text.zoomOut} onClick={()=>setZoom(value=>Math.max(.32,value-.1))}>−</button><b>{Math.round(zoom*100)}%</b><button aria-label={text.zoomIn} onClick={()=>setZoom(value=>Math.min(1.5,value+.1))}>＋</button><button onClick={fitCanvas}>⌗ {text.fit}</button></div></header>
      <section className="comfy-workbench">
        <div ref={canvasRef} className={`comfy-canvas ${connectionSource?"is-connecting":""}`} onPointerDown={onCanvasPointerDown} onPointerMove={onCanvasPointerMove} onPointerUp={onCanvasPointerUp} onPointerCancel={onCanvasPointerUp} onWheel={onWheel}>
          <div className="comfy-grid" style={{backgroundPosition:`${pan.x}px ${pan.y}px`,backgroundSize:`${28*zoom}px ${28*zoom}px`}}/>
          <div className="comfy-world" style={{transform:`translate(${pan.x}px,${pan.y}px) scale(${zoom})`}}>
            <svg className="comfy-edges" aria-hidden="true"><defs><filter id="edgeGlow"><feGaussianBlur stdDeviation="2" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>{edges.map(edge=>{const source=positions[edge.sourceId]||{x:0,y:0};const target=positions[edge.targetId]||{x:0,y:0};const x1=source.x+NODE_WIDTH;const y1=source.y+76+edge.output*27;const x2=target.x;const y2=target.y+76+edge.inputIndex*27;const bend=Math.max(70,Math.abs(x2-x1)*.42);return <path key={`${edge.targetId}-${edge.inputName}`} d={`M ${x1} ${y1} C ${x1+bend} ${y1}, ${x2-bend} ${y2}, ${x2} ${y2}`}/>})}</svg>
            {Object.entries(workflow).map(([id,node])=>{const position=positions[id]||{x:60,y:60};const names=inputNames(node);const outputs=outputsFor(node);return <article key={id} className={`comfy-node color-${colorFor(node)} ${selectedId===id?"selected":""}`} style={{left:position.x,top:position.y,width:NODE_WIDTH}} onClick={event=>{event.stopPropagation();setSelectedId(id)}}><header onPointerDown={event=>onNodePointerDown(event,id)}><i/><span><small>#{id} · {node.class_type}</small><b>{titleFor(node)}</b></span><em>⠿</em></header><div className="comfy-node-body"><div className="comfy-inputs">{names.map(name=>{const value=node.inputs[name];const linked=isConnection(value);return <button key={name} className={linked?"linked":""} onClick={event=>{event.stopPropagation();connectInput(id,name)}} title={linked?`${value[0]}:${value[1]}`:name}><i/><span>{name}</span><small>{linked?`${value[0]}:${value[1]}`:value===undefined||value===null?"—":String(value).slice(0,24)}</small></button>})}</div><div className="comfy-outputs">{outputs.map((output,index)=><button key={`${output}-${index}`} className={connectionSource?.nodeId===id&&connectionSource.output===index?"active":""} onClick={event=>{event.stopPropagation();setConnectionSource({nodeId:id,output:index})}}><span>{output}</span><i/></button>)}</div></div></article>})}
          </div>
          {!Object.keys(workflow).length&&<div className="comfy-empty"><i>◇</i><b>{text.emptyCanvas}</b><span>{text.library}</span></div>}
          {connectionSource&&<div className="comfy-connect-toast"><i/> #{connectionSource.nodeId}:{connectionSource.output} · {text.connectFrom}<button onClick={()=>setConnectionSource(null)}>×</button></div>}
        </div>
        <aside className="comfy-inspector"><header><span>03 / {text.inspector}</span>{selected&&<b>#{selectedId}</b>}</header>{selected?<><div className="comfy-inspector-title"><i className={`node-color ${colorFor(selected)}`}/><span><b>{titleFor(selected)}</b><small>{selected.class_type}</small></span></div><label><span>TITLE</span><input value={selected._meta?.title||""} placeholder={titleFor(selected)} onChange={event=>updateNode(selectedId,node=>{node._meta={...(node._meta||{}),title:event.target.value}})}/></label><div className="comfy-inspector-inputs">{inputNames(selected).map(name=>{const value=selected.inputs[name];return <label key={name}><span>{name}{isConnection(value)&&<button onClick={()=>updateNode(selectedId,node=>{delete node.inputs[name]})}>{text.disconnect}</button>}</span>{isConnection(value)?<div className="comfy-linked-value"><i/> #{value[0]} · OUTPUT {value[1]}</div>:<ValueEditor value={value??""} onChange={next=>updateNode(selectedId,node=>{node.inputs[name]=next})}/>}</label>})}</div><div className="comfy-inspector-actions"><button onClick={()=>duplicateNode(selectedId)}>⧉ {text.duplicate}</button><button className="danger" onClick={()=>deleteNode(selectedId)}>× {text.delete}</button></div></>:<div className="comfy-inspector-empty"><i>⌁</i><p>{text.selectNode}</p></div>}</aside>
      </section>
      <footer className="comfy-runbar"><div className={running?"running":connected?"connected":""}><i/><span><b>{status}</b><small>{running&&promptId?promptId:text.tokenHint}</small></span></div><div>{running?<button className="comfy-cancel" onClick={cancelWorkflow}>{text.cancel}</button>:<button className="comfy-run" onClick={runWorkflow}>▶ {text.run}</button>}</div></footer>
      {results.length>0&&<section className="comfy-results"><header><span>04 / {text.results}</span><b>{results.length}</b></header><div>{results.map((result,index)=><article key={result.url}>{result.kind==="image"?<img src={result.url} alt={result.name}/>:result.kind==="video"?<video src={result.url} controls/>:<audio src={result.url} controls/>}<span><b>{String(index+1).padStart(2,"0")}</b><small>{result.name}</small><a href={result.url} download={result.name}>↓</a></span></article>)}</div></section>}
    </main>
  </section>;
}
