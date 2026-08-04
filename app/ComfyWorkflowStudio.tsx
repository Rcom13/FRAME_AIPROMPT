"use client";

import { useEffect, useState } from "react";
import ComfyConnectionSettings, { COMFY_CONFIG_EVENT, readComfyConfig, type ComfyConfigSummary } from "./ComfyConnectionSettings";
import type { Locale } from "./i18n";

const COPY = {
  "zh-CN": {
    title: "官方 ComfyUI，运行在 FRAME 内。",
    intro: "02 现在使用 GitHub 官方前端构建，不再嵌入 Comfy Cloud 登录页，也不再模拟节点。连接后端后，节点、模型、队列、历史和 Manager 都来自真实 ComfyUI。",
    official: "COMFYUI FRONTEND v1.50.0",
    source: "官方 GPL-3.0 源码构建",
    configured: "执行后端已验证",
    setupTitle: "先连接一个真正的 ComfyUI 后端",
    setupDesc: "画布属于前端；节点定义、模型和图片生成来自后端。配置 Comfy Cloud API 或公网 HTTPS ComfyUI 后即可进入完整编辑器。",
    configure: "连接设置",
    hideConfig: "收起设置",
    reload: "重载画布",
    fullscreen: "全屏编辑",
    loading: "正在启动官方 ComfyUI 前端…",
    connecting: "官方前端已启动，正在读取真实节点与模型",
    privacy: "密钥只在 FRAME 服务端解密并转发，不会交给画布脚本。",
    bridge: "来自 01 STORY 的内容已就绪",
    copyPrompt: "复制镜头提示词",
    downloadWorkflow: "下载可导入工作流",
    copied: "提示词已复制，可粘贴到 CLIP Text Encode 节点",
    downloaded: "工作流已下载，把 JSON 拖入官方画布即可",
    noPrompt: "尚未接收 01 STORY 内容",
    backendCloud: "COMFY CLOUD API",
    backendRemote: "REMOTE COMFYUI",
    license: "第三方许可与源码",
  },
  "zh-TW": {
    title: "官方 ComfyUI，運行於 FRAME 內。", intro: "02 現在使用 GitHub 官方前端建置，不再嵌入 Cloud 登入頁，也不再模擬節點。連接後端後，節點、模型、佇列、歷史與 Manager 均來自真實 ComfyUI。", official: "COMFYUI FRONTEND v1.50.0", source: "官方 GPL-3.0 原始碼建置", configured: "執行後端已驗證", setupTitle: "先連接真正的 ComfyUI 後端", setupDesc: "畫布屬於前端；節點、模型與生成來自後端。設定 Comfy Cloud API 或公開 HTTPS ComfyUI 後即可進入完整編輯器。", configure: "連線設定", hideConfig: "收起設定", reload: "重載畫布", fullscreen: "全螢幕編輯", loading: "正在啟動官方 ComfyUI 前端…", connecting: "官方前端已啟動，正在讀取真實節點與模型", privacy: "密鑰只在 FRAME 伺服器解密轉發，不會交給畫布腳本。", bridge: "來自 01 STORY 的內容已就緒", copyPrompt: "複製鏡頭提示詞", downloadWorkflow: "下載可匯入工作流", copied: "提示詞已複製，可貼入 CLIP Text Encode 節點", downloaded: "工作流已下載，把 JSON 拖入官方畫布即可", noPrompt: "尚未接收 01 STORY 內容", backendCloud: "COMFY CLOUD API", backendRemote: "REMOTE COMFYUI", license: "第三方授權與原始碼",
  },
  ja: {
    title: "公式 ComfyUI を FRAME 内で実行。", intro: "02 は GitHub の公式フロントエンドを同一オリジンで実行します。Cloud ログインの埋め込みや模擬ノードは使いません。接続後、ノード、モデル、キュー、履歴、Manager は実際の ComfyUI から読み込まれます。", official: "COMFYUI FRONTEND v1.50.0", source: "公式 GPL-3.0 ソースからビルド", configured: "実行バックエンド確認済み", setupTitle: "ComfyUI バックエンドを接続", setupDesc: "キャンバスはフロントエンド、ノードとモデルと生成はバックエンドです。Cloud API または公開 HTTPS ComfyUI を設定してください。", configure: "接続設定", hideConfig: "設定を閉じる", reload: "キャンバス再読込", fullscreen: "全画面編集", loading: "公式 ComfyUI を起動中…", connecting: "公式フロントエンドを起動し、ノードとモデルを読込中", privacy: "キーは FRAME サーバー内でのみ復号・転送され、キャンバスには渡りません。", bridge: "01 STORY の内容を受け取りました", copyPrompt: "プロンプトをコピー", downloadWorkflow: "ワークフローを保存", copied: "CLIP Text Encode に貼り付けられます", downloaded: "JSON を公式キャンバスへドロップしてください", noPrompt: "01 STORY の内容はまだありません", backendCloud: "COMFY CLOUD API", backendRemote: "REMOTE COMFYUI", license: "ライセンスとソース",
  },
  en: {
    title: "Official ComfyUI, running inside FRAME.", intro: "Module 02 now runs the GitHub-built official frontend same-origin. It no longer embeds the Cloud login or imitates nodes. Once connected, nodes, models, queue, history, and Manager come from a real ComfyUI backend.", official: "COMFYUI FRONTEND v1.50.0", source: "Built from the official GPL-3.0 source", configured: "Execution backend verified", setupTitle: "Connect a real ComfyUI backend first", setupDesc: "The canvas is the frontend; node definitions, models, and generation come from the backend. Configure the Cloud API or a public HTTPS ComfyUI to enter the full editor.", configure: "Connection settings", hideConfig: "Hide settings", reload: "Reload canvas", fullscreen: "Fullscreen editor", loading: "Starting the official ComfyUI frontend…", connecting: "Official frontend started; loading real nodes and models", privacy: "Secrets are decrypted and forwarded only on the FRAME server, never exposed to canvas scripts.", bridge: "Content from 01 STORY is ready", copyPrompt: "Copy shot prompt", downloadWorkflow: "Download importable workflow", copied: "Copied; paste into a CLIP Text Encode node", downloaded: "Workflow downloaded; drop the JSON onto the official canvas", noPrompt: "No content received from 01 STORY", backendCloud: "COMFY CLOUD API", backendRemote: "REMOTE COMFYUI", license: "Third-party license and source",
  },
} satisfies Record<Locale, Record<string, string>>;

export function comfyModuleCopy(locale: Locale) {
  return locale === "zh-CN"
    ? { desc: "内置 GitHub 官方 ComfyUI 前端，连接真实节点、模型、Manager 与执行队列。", enter: "进入官方 ComfyUI" }
    : locale === "zh-TW"
      ? { desc: "內置 GitHub 官方 ComfyUI 前端，連接真實節點、模型、Manager 與執行佇列。", enter: "進入官方 ComfyUI" }
      : locale === "ja"
        ? { desc: "GitHub 公式 ComfyUI を内蔵し、実際のノード、モデル、Manager、キューへ接続します。", enter: "公式 ComfyUI を開く" }
        : { desc: "Built-in GitHub official ComfyUI frontend connected to real nodes, models, Manager, and execution.", enter: "Open official ComfyUI" };
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
    groups: [], config: {}, extra: { ds: { scale: 0.78, offset: [70, 80] }, frontendVersion: "1.50.0" }, version: 0.4,
  };
}

export default function ComfyWorkflowStudio({ locale, seedPrompt = "", pipelineTitle = "" }: { locale: Locale; seedPrompt?: string; seedVersion?: number; pipelineTitle?: string }) {
  const text = COPY[locale];
  const [config, setConfig] = useState<ComfyConfigSummary | null>(null);
  const [checking, setChecking] = useState(true);
  const [showConfig, setShowConfig] = useState(false);
  const [frameKey, setFrameKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState(text.loading);
  const activePrompt = seedPrompt.trim();

  useEffect(() => {
    let cancelled = false;
    void readComfyConfig().then(saved => {
      if (!cancelled) {
        setConfig(saved);
        setShowConfig(!saved);
        setChecking(false);
        setStatus(saved ? text.connecting : text.setupTitle);
      }
    }).catch(error => {
      if (!cancelled) {
        setChecking(false);
        setShowConfig(true);
        setStatus(error instanceof Error ? error.message : text.setupTitle);
      }
    });
    const listener = (event: Event) => {
      const next = (event as CustomEvent<ComfyConfigSummary | null>).detail;
      setConfig(next);
      setShowConfig(!next);
      if (next) {
        setLoading(true);
        setFrameKey(value => value + 1);
        setStatus(text.connecting);
      }
    };
    window.addEventListener(COMFY_CONFIG_EVENT, listener);
    return () => {
      cancelled = true;
      window.removeEventListener(COMFY_CONFIG_EVENT, listener);
    };
  }, [text.connecting, text.setupTitle]);

  async function copyPrompt() {
    if (!activePrompt) { setStatus(text.noPrompt); return; }
    try { await navigator.clipboard.writeText(activePrompt); setStatus(text.copied); } catch { setStatus(activePrompt); }
  }

  function downloadStarterWorkflow() {
    const blob = new Blob([JSON.stringify(starterWorkflow(activePrompt), null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "FRAME-ComfyUI-Starter.json";
    anchor.click();
    URL.revokeObjectURL(url);
    setStatus(text.downloaded);
  }

  function reloadEditor() {
    setLoading(true);
    setStatus(text.loading);
    setFrameKey(value => value + 1);
  }

  return <section className="real-comfy-studio">
    <header className="real-comfy-header">
      <div className="real-comfy-brand"><span className="eyebrow"><span /> GITHUB / OFFICIAL FRONTEND</span><h1>{text.title}</h1><p>{text.intro}</p></div>
      <div className="real-comfy-build"><span><i />{text.official}</span><small>{text.source}</small></div>
      <div className="real-comfy-actions"><button onClick={() => setShowConfig(value => !value)}>{showConfig ? text.hideConfig : text.configure}</button>{config && <><button onClick={reloadEditor}>↻ {text.reload}</button><button className="primary" onClick={() => window.open("/comfy/index.html", "_blank", "noopener,noreferrer")}>{text.fullscreen} ↗</button></>}</div>
    </header>

    {showConfig && <div className="real-comfy-config-drawer"><ComfyConnectionSettings locale={locale} onConfig={setConfig} /></div>}

    {config && <div className="real-comfy-meta"><span><i /> {text.configured}</span><b>{config.mode === "cloud" ? text.backendCloud : text.backendRemote}</b><small>{config.baseUrl}</small></div>}

    {activePrompt && <aside className="real-comfy-bridge"><div><small>01 → 02 · FRAME BRIDGE</small><b>{pipelineTitle || text.bridge}</b><p>{activePrompt}</p></div><button onClick={copyPrompt}>{text.copyPrompt}</button><button onClick={downloadStarterWorkflow}>{text.downloadWorkflow}</button></aside>}

    {config ? <div className="real-comfy-frame">
      {loading && <div className="real-comfy-loading"><i /><b>{text.loading}</b><span>{text.connecting}</span></div>}
      <iframe key={frameKey} src="/comfy/index.html" title="FRAME ComfyUI Official Frontend" sandbox="allow-scripts allow-same-origin allow-forms allow-downloads allow-popups allow-popups-to-escape-sandbox allow-modals allow-pointer-lock" allow="clipboard-read; clipboard-write; fullscreen; web-share" onLoad={() => { setLoading(false); setStatus(text.connecting); }} />
    </div> : <div className="comfy-onboarding">
      <div className="comfy-onboarding-visual" aria-hidden="true"><span>COMFY</span><i /><i /><i /><b>⌁</b></div>
      <div><small>OFFICIAL CANVAS · REAL BACKEND</small><h2>{checking ? text.loading : text.setupTitle}</h2><p>{text.setupDesc}</p><button onClick={() => setShowConfig(true)}>{text.configure} <b>↗</b></button></div>
    </div>}

    <footer className="real-comfy-footer"><span aria-live="polite"><i /> {status}</span><small>{text.privacy} · <a href="/comfy/SOURCE.md" target="_blank">{text.license}</a></small></footer>
  </section>;
}
