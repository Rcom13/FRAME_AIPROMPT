"use client";

import { useEffect, useState } from "react";
import type { Locale } from "./i18n";

const COMFY_CLOUD_URL = "https://cloud.comfy.org/";

const COPY = {
  "zh-CN": {
    title: "真正的 ComfyUI，直接进入工作区。",
    intro: "02 不再模拟节点。这里载入官方 ComfyUI 前端或你自己的完整 ComfyUI 页面，节点、模型、队列、历史、Manager 与扩展均由真实服务提供。",
    cloud: "Comfy Cloud",
    self: "自托管 / 本机",
    endpoint: "ComfyUI 页面地址",
    connect: "载入完整编辑器",
    open: "新窗口打开",
    reload: "重新载入",
    loaded: "真实 ComfyUI 编辑器已载入",
    loading: "正在载入官方 ComfyUI…",
    invalid: "请输入有效的 HTTPS 地址；本机仅允许 localhost 或 127.0.0.1。",
    localOnly: "浏览器会阻止 HTTPS 网站嵌入本机 HTTP 页面。请用新窗口打开本机 ComfyUI，完整功能不会受影响。",
    frameHelp: "如果登录页或画布没有出现，请先在新窗口完成登录，再点“重新载入”。",
    official: "官方完整前端",
    manager: "Manager 与自定义节点由所连接的 ComfyUI 服务提供",
    cloudHint: "无需在 FRAME 内配置 API Key；Comfy Cloud 登录与用量由 Comfy 官方页面处理。",
    selfHint: "推荐使用 HTTPS 的远程 ComfyUI。http://127.0.0.1:8188 可在新窗口正常使用。",
    bridge: "来自 01 STORY 的创作内容已就绪",
    copyPrompt: "复制镜头提示词",
    downloadWorkflow: "下载基础工作流",
    copied: "提示词已复制，可粘贴到 CLIP Text Encode 节点",
    downloaded: "基础工作流已下载，把 JSON 拖入 ComfyUI 画布即可",
    noPrompt: "尚未接收 01 STORY 内容",
    privacy: "FRAME 不读取 iframe 内的账号、工作流、模型或密钥。",
  },
  "zh-TW": {
    title: "真正的 ComfyUI，直接進入工作區。",
    intro: "02 不再模擬節點。這裡載入官方 ComfyUI 前端或你自己的完整 ComfyUI 頁面，節點、模型、佇列、歷史、Manager 與擴充均由真實服務提供。",
    cloud: "Comfy Cloud", self: "自架 / 本機", endpoint: "ComfyUI 頁面位址", connect: "載入完整編輯器", open: "新視窗開啟", reload: "重新載入", loaded: "真實 ComfyUI 編輯器已載入", loading: "正在載入官方 ComfyUI…", invalid: "請輸入有效的 HTTPS 位址；本機僅允許 localhost 或 127.0.0.1。", localOnly: "瀏覽器會阻止 HTTPS 網站嵌入本機 HTTP 頁面。請用新視窗開啟本機 ComfyUI，完整功能不受影響。", frameHelp: "若登入頁或畫布沒有出現，請先在新視窗完成登入，再按重新載入。", official: "官方完整前端", manager: "Manager 與自訂節點由所連接的 ComfyUI 服務提供", cloudHint: "不需在 FRAME 內設定 API Key；Comfy Cloud 登入與用量由官方頁面處理。", selfHint: "建議使用 HTTPS 遠端 ComfyUI。http://127.0.0.1:8188 可在新視窗正常使用。", bridge: "來自 01 STORY 的創作內容已就緒", copyPrompt: "複製鏡頭提示詞", downloadWorkflow: "下載基礎工作流", copied: "提示詞已複製，可貼入 CLIP Text Encode 節點", downloaded: "基礎工作流已下載，把 JSON 拖入 ComfyUI 畫布即可", noPrompt: "尚未接收 01 STORY 內容", privacy: "FRAME 不會讀取 iframe 內的帳號、工作流、模型或密鑰。",
  },
  ja: {
    title: "本物の ComfyUI ワークスペース。",
    intro: "02 はノードを模倣しません。公式 ComfyUI または自分の ComfyUI ページを読み込み、ノード、モデル、キュー、履歴、Manager、拡張機能をそのまま利用します。",
    cloud: "Comfy Cloud", self: "セルフホスト / ローカル", endpoint: "ComfyUI ページ URL", connect: "フルエディターを読込", open: "新しいウィンドウ", reload: "再読込", loaded: "ComfyUI エディターを読み込みました", loading: "公式 ComfyUI を読み込み中…", invalid: "有効な HTTPS URL を入力してください。ローカルは localhost / 127.0.0.1 のみ許可されます。", localOnly: "HTTPS ページ内にローカル HTTP は埋め込めません。新しいウィンドウでローカル ComfyUI を開いてください。", frameHelp: "ログインまたはキャンバスが表示されない場合は、新しいウィンドウでログインしてから再読込してください。", official: "公式フルフロントエンド", manager: "Manager とカスタムノードは接続先 ComfyUI が提供します", cloudHint: "FRAME に API Key は不要です。Cloud のログインと使用量は Comfy 公式ページで管理されます。", selfHint: "HTTPS のリモート ComfyUI を推奨します。http://127.0.0.1:8188 は新しいウィンドウで利用できます。", bridge: "01 STORY の内容を受け取りました", copyPrompt: "ショットプロンプトをコピー", downloadWorkflow: "基本ワークフローを保存", copied: "コピーしました。CLIP Text Encode に貼り付けてください", downloaded: "JSON を保存しました。ComfyUI キャンバスへドロップしてください", noPrompt: "01 STORY の内容はまだありません", privacy: "FRAME は iframe 内のアカウント、ワークフロー、モデル、キーを読み取りません。",
  },
  en: {
    title: "The real ComfyUI workspace, inside FRAME.",
    intro: "Module 02 no longer imitates nodes. It loads the official ComfyUI frontend or your own complete ComfyUI page, with real nodes, models, queue, history, Manager, and extensions.",
    cloud: "Comfy Cloud", self: "Self-hosted / local", endpoint: "ComfyUI page URL", connect: "Load full editor", open: "Open in new window", reload: "Reload", loaded: "Real ComfyUI editor loaded", loading: "Loading official ComfyUI…", invalid: "Enter a valid HTTPS URL. Local HTTP is limited to localhost or 127.0.0.1.", localOnly: "Browsers block local HTTP pages inside an HTTPS site. Open local ComfyUI in a new window for full functionality.", frameHelp: "If the login or canvas does not appear, sign in in a new window first, then reload.", official: "Official full frontend", manager: "Manager and custom nodes come from the connected ComfyUI service", cloudHint: "No API key is stored in FRAME. Comfy Cloud handles sign-in and usage in the official page.", selfHint: "A remote HTTPS ComfyUI is recommended. http://127.0.0.1:8188 works in a new window.", bridge: "Creative content from 01 STORY is ready", copyPrompt: "Copy shot prompt", downloadWorkflow: "Download starter workflow", copied: "Copied. Paste it into a CLIP Text Encode node", downloaded: "Starter JSON downloaded. Drop it onto the ComfyUI canvas", noPrompt: "No content received from 01 STORY", privacy: "FRAME cannot read accounts, workflows, models, or keys inside the iframe.",
  },
} satisfies Record<Locale, Record<string, string>>;

export function comfyModuleCopy(locale: Locale) {
  return locale === "zh-CN"
    ? { desc: "直接使用官方 ComfyUI 完整画布、节点、模型、Manager 与扩展。", enter: "进入真实 ComfyUI" }
    : locale === "zh-TW"
      ? { desc: "直接使用官方 ComfyUI 完整畫布、節點、模型、Manager 與擴充。", enter: "進入真正 ComfyUI" }
      : locale === "ja"
        ? { desc: "公式 ComfyUI のキャンバス、ノード、モデル、Manager、拡張をそのまま使用します。", enter: "ComfyUI を開く" }
        : { desc: "Use the official ComfyUI canvas, nodes, models, Manager, and extensions.", enter: "Open real ComfyUI" };
}

function isLocalHost(hostname: string) {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]" || hostname === "::1";
}

function safeEditorUrl(raw: string, frameHost = "") {
  const value = raw.trim();
  if (!value || value.length > 2048) return null;
  const withProtocol = /^[a-z][a-z\d+.-]*:/i.test(value) ? value : isLocalHost(value.split(":")[0]) ? `http://${value}` : `https://${value}`;
  try {
    const url = new URL(withProtocol);
    if (url.username || url.password || (url.protocol !== "https:" && !(url.protocol === "http:" && isLocalHost(url.hostname)))) return null;
    if (frameHost && url.hostname === frameHost) return null;
    url.hash = "";
    return url.toString();
  } catch {
    return null;
  }
}

function starterWorkflow(prompt: string) {
  const positive = prompt.trim() || "cinematic scene, coherent composition, precise lighting";
  return {
    id: crypto.randomUUID(), revision: 0, last_node_id: 7, last_link_id: 9,
    nodes: [
      { id: 1, type: "CheckpointLoaderSimple", pos: [40, 250], size: [315, 98], flags: {}, order: 0, mode: 0, inputs: [], outputs: [{ name: "MODEL", type: "MODEL", links: [3] }, { name: "CLIP", type: "CLIP", links: [1, 2] }, { name: "VAE", type: "VAE", links: [8] }], properties: { "Node name for S&R": "CheckpointLoaderSimple" }, widgets_values: [""] },
      { id: 2, type: "CLIPTextEncode", pos: [410, 80], size: [420, 200], flags: {}, order: 1, mode: 0, inputs: [{ name: "clip", type: "CLIP", link: 1 }], outputs: [{ name: "CONDITIONING", type: "CONDITIONING", links: [4] }], title: "FRAME · Positive Prompt", properties: { "Node name for S&R": "CLIPTextEncode" }, widgets_values: [positive] },
      { id: 3, type: "CLIPTextEncode", pos: [410, 330], size: [420, 180], flags: {}, order: 2, mode: 0, inputs: [{ name: "clip", type: "CLIP", link: 2 }], outputs: [{ name: "CONDITIONING", type: "CONDITIONING", links: [5] }], title: "Negative Prompt", properties: { "Node name for S&R": "CLIPTextEncode" }, widgets_values: ["low quality, deformed anatomy, text, watermark"] },
      { id: 4, type: "EmptyLatentImage", pos: [430, 580], size: [315, 106], flags: {}, order: 3, mode: 0, inputs: [], outputs: [{ name: "LATENT", type: "LATENT", links: [6] }], properties: { "Node name for S&R": "EmptyLatentImage" }, widgets_values: [1024, 1024, 1] },
      { id: 5, type: "KSampler", pos: [900, 230], size: [315, 262], flags: {}, order: 4, mode: 0, inputs: [{ name: "model", type: "MODEL", link: 3 }, { name: "positive", type: "CONDITIONING", link: 4 }, { name: "negative", type: "CONDITIONING", link: 5 }, { name: "latent_image", type: "LATENT", link: 6 }], outputs: [{ name: "LATENT", type: "LATENT", links: [7] }], properties: { "Node name for S&R": "KSampler" }, widgets_values: [42, "randomize", 24, 7, "euler", "normal", 1] },
      { id: 6, type: "VAEDecode", pos: [1280, 260], size: [210, 72], flags: {}, order: 5, mode: 0, inputs: [{ name: "samples", type: "LATENT", link: 7 }, { name: "vae", type: "VAE", link: 8 }], outputs: [{ name: "IMAGE", type: "IMAGE", links: [9] }], properties: { "Node name for S&R": "VAEDecode" }, widgets_values: [] },
      { id: 7, type: "SaveImage", pos: [1560, 240], size: [320, 120], flags: {}, order: 6, mode: 0, inputs: [{ name: "images", type: "IMAGE", link: 9 }], outputs: [], properties: { "Node name for S&R": "SaveImage" }, widgets_values: ["FRAME"] },
    ],
    links: [[1, 1, 1, 2, 0, "CLIP"], [2, 1, 1, 3, 0, "CLIP"], [3, 1, 0, 5, 0, "MODEL"], [4, 2, 0, 5, 1, "CONDITIONING"], [5, 3, 0, 5, 2, "CONDITIONING"], [6, 4, 0, 5, 3, "LATENT"], [7, 5, 0, 6, 0, "LATENT"], [8, 1, 2, 6, 1, "VAE"], [9, 6, 0, 7, 0, "IMAGE"]],
    groups: [], config: {}, extra: { ds: { scale: 0.78, offset: [70, 80] }, frontendVersion: "1.46.3" }, version: 0.4,
  };
}

export default function ComfyWorkflowStudio({ locale, seedPrompt = "", pipelineTitle = "" }: { locale: Locale; seedPrompt?: string; seedVersion?: number; pipelineTitle?: string }) {
  const text = COPY[locale];
  const [mode, setMode] = useState<"cloud" | "self">("cloud");
  const [endpoint, setEndpoint] = useState("http://127.0.0.1:8188");
  const [editorUrl, setEditorUrl] = useState(COMFY_CLOUD_URL);
  const [frameKey, setFrameKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [launchOnly, setLaunchOnly] = useState(false);
  const [status, setStatus] = useState(text.loading);

  const activePrompt = seedPrompt.trim();

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      try {
        const savedMode = localStorage.getItem("frame-comfy-real-mode");
        const savedEndpoint = localStorage.getItem("frame-comfy-real-endpoint");
        if (savedEndpoint) setEndpoint(savedEndpoint);
        if (savedMode === "self" && savedEndpoint) {
          const safe = safeEditorUrl(savedEndpoint, window.location.hostname);
          if (safe) {
            setMode("self");
            if (safe.startsWith("https:")) setEditorUrl(safe);
            else { setEditorUrl(""); setLaunchOnly(true); setLoading(false); setStatus(text.localOnly); }
          }
        }
      } catch {}
    });
    return () => { cancelled = true; };
  }, [text.localOnly]);

  function chooseMode(next: "cloud" | "self") {
    setMode(next);
    setLaunchOnly(false);
    if (next === "cloud") {
      setEditorUrl(COMFY_CLOUD_URL);
      setLoading(true);
      setStatus(text.loading);
      setFrameKey(value => value + 1);
    } else {
      setEditorUrl("");
      setLoading(false);
      setStatus(text.selfHint);
    }
    try { localStorage.setItem("frame-comfy-real-mode", next); } catch {}
  }

  function loadSelfHosted() {
    const safe = safeEditorUrl(endpoint, window.location.hostname);
    if (!safe) { setStatus(text.invalid); return; }
    try { localStorage.setItem("frame-comfy-real-mode", "self"); localStorage.setItem("frame-comfy-real-endpoint", safe); } catch {}
    setEndpoint(safe);
    if (safe.startsWith("http:")) {
      setEditorUrl(""); setLaunchOnly(true); setLoading(false); setStatus(text.localOnly); return;
    }
    setLaunchOnly(false); setEditorUrl(safe); setLoading(true); setStatus(text.loading); setFrameKey(value => value + 1);
  }

  function openEditor() {
    const target = mode === "cloud" ? COMFY_CLOUD_URL : safeEditorUrl(endpoint, window.location.hostname);
    if (!target) { setStatus(text.invalid); return; }
    window.open(target, "_blank", "noopener,noreferrer");
  }

  function reloadEditor() {
    if (!editorUrl) { openEditor(); return; }
    setLoading(true); setStatus(text.loading); setFrameKey(value => value + 1);
  }

  async function copyPrompt() {
    if (!activePrompt) { setStatus(text.noPrompt); return; }
    try { await navigator.clipboard.writeText(activePrompt); setStatus(text.copied); } catch { setStatus(activePrompt); }
  }

  function downloadStarterWorkflow() {
    const blob = new Blob([JSON.stringify(starterWorkflow(activePrompt), null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob); const anchor = document.createElement("a"); anchor.href = url; anchor.download = "FRAME-ComfyUI-Starter.json"; anchor.click(); URL.revokeObjectURL(url); setStatus(text.downloaded);
  }

  return <section className="real-comfy-studio">
    <header className="real-comfy-header">
      <div className="real-comfy-brand"><span className="eyebrow"><span /> COMFYUI / OFFICIAL FRONTEND</span><h1>{text.title}</h1><p>{text.intro}</p></div>
      <div className="real-comfy-mode" role="tablist"><button className={mode === "cloud" ? "active" : ""} onClick={() => chooseMode("cloud")}>{text.cloud}</button><button className={mode === "self" ? "active" : ""} onClick={() => chooseMode("self")}>{text.self}</button></div>
      {mode === "self" && <div className="real-comfy-endpoint"><label><span>{text.endpoint}</span><input value={endpoint} onChange={event => setEndpoint(event.target.value)} onKeyDown={event => { if (event.key === "Enter") loadSelfHosted(); }} /></label><button onClick={loadSelfHosted}>{text.connect}</button></div>}
      <div className="real-comfy-actions"><button onClick={reloadEditor}>↻ {text.reload}</button><button className="primary" onClick={openEditor}>{text.open} ↗</button></div>
    </header>

    <div className="real-comfy-meta"><span><i /> {text.official}</span><b>{text.manager}</b><small>{mode === "cloud" ? text.cloudHint : text.selfHint}</small></div>

    {activePrompt && <aside className="real-comfy-bridge"><div><small>01 → 02 · FRAME BRIDGE</small><b>{pipelineTitle || text.bridge}</b><p>{activePrompt}</p></div><button onClick={copyPrompt}>{text.copyPrompt}</button><button onClick={downloadStarterWorkflow}>{text.downloadWorkflow}</button></aside>}

    <div className={`real-comfy-frame ${launchOnly ? "launch-only" : ""}`}>
      {editorUrl ? <>
        {loading && <div className="real-comfy-loading"><i /><b>{text.loading}</b><span>{text.frameHelp}</span></div>}
        <iframe key={frameKey} src={editorUrl} title="ComfyUI Official Editor" sandbox="allow-scripts allow-same-origin allow-forms allow-downloads allow-popups allow-popups-to-escape-sandbox allow-modals allow-pointer-lock" allow="clipboard-read; clipboard-write; fullscreen; web-share" referrerPolicy="no-referrer" onLoad={() => { setLoading(false); setStatus(text.loaded); }} />
      </> : <div className="real-comfy-launch"><span>COMFYUI</span><h2>{text.localOnly}</h2><p>{text.selfHint}</p><button onClick={openEditor}>{text.open} ↗</button></div>}
    </div>

    <footer className="real-comfy-footer"><span aria-live="polite"><i /> {status}</span><small>{text.privacy}</small></footer>
  </section>;
}
