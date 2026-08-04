"use client";

import { useEffect, useState } from "react";
import type { Locale } from "./i18n";

export type ComfyConfigSummary = {
  mode: "cloud" | "remote";
  baseUrl: string;
  authMode: "none" | "x-api-key" | "bearer";
  hasApiKey: boolean;
  updatedAt?: string;
};

export const COMFY_CONFIG_EVENT = "frame-comfy-config-changed";
const CLOUD_URL = "https://cloud.comfy.org";

const COPY = {
  "zh-CN": {
    title: "ComfyUI 执行后端",
    desc: "官方画布在 FRAME 同源运行；此处只配置负责节点、模型和执行队列的后端。",
    cloud: "Comfy Cloud API",
    remote: "远程 ComfyUI",
    cloudHint: "需要 Comfy Cloud Creator 或 Pro，以及从 platform.comfy.org 创建的 API Key。",
    remoteHint: "填写可公网访问的 HTTPS ComfyUI 地址。FRAME 会在服务端代理连接，不把密钥交给画布。",
    endpoint: "COMFYUI HTTPS 地址",
    auth: "身份验证",
    none: "不需要验证",
    apiKey: "X-API-Key",
    bearer: "Bearer Token",
    secret: "API KEY / TOKEN",
    saved: "账户中已加密保存",
    placeholder: "已保存；留空继续使用，输入即可替换",
    newPlaceholder: "粘贴 ComfyUI API Key",
    save: "测试连接并保存",
    saving: "正在验证真实节点接口…",
    connected: "连接已验证，官方画布可以读取节点和模型",
    missing: "尚未配置 ComfyUI 执行后端",
    failed: "连接失败",
    remove: "删除连接",
    removed: "ComfyUI 连接已删除",
    show: "显示",
    hide: "隐藏",
    local: "打开本机 8188",
    localHint: "本机服务不能从线上服务器代理，请直接打开本机 ComfyUI。",
  },
  "zh-TW": {
    title: "ComfyUI 執行後端", desc: "官方畫布在 FRAME 同源執行；此處只設定節點、模型與佇列後端。", cloud: "Comfy Cloud API", remote: "遠端 ComfyUI", cloudHint: "需要 Comfy Cloud Creator 或 Pro，以及 platform.comfy.org 建立的 API Key。", remoteHint: "填寫可公開存取的 HTTPS ComfyUI 位址。FRAME 會在伺服器代理連線，不把密鑰交給畫布。", endpoint: "COMFYUI HTTPS 位址", auth: "身分驗證", none: "不需驗證", apiKey: "X-API-Key", bearer: "Bearer Token", secret: "API KEY / TOKEN", saved: "帳戶中已加密儲存", placeholder: "已儲存；留空沿用，輸入即可替換", newPlaceholder: "貼上 ComfyUI API Key", save: "測試連線並儲存", saving: "正在驗證真實節點介面…", connected: "連線已驗證，官方畫布可讀取節點與模型", missing: "尚未設定 ComfyUI 執行後端", failed: "連線失敗", remove: "刪除連線", removed: "ComfyUI 連線已刪除", show: "顯示", hide: "隱藏", local: "開啟本機 8188", localHint: "本機服務無法從線上伺服器代理，請直接開啟本機 ComfyUI。",
  },
  ja: {
    title: "ComfyUI 実行バックエンド", desc: "公式キャンバスは FRAME と同一オリジンで動作します。ここではノード、モデル、キューのバックエンドを設定します。", cloud: "Comfy Cloud API", remote: "リモート ComfyUI", cloudHint: "Comfy Cloud Creator / Pro と platform.comfy.org の API Key が必要です。", remoteHint: "公開 HTTPS ComfyUI URL を入力します。キーはキャンバスに渡さず、FRAME サーバーが中継します。", endpoint: "COMFYUI HTTPS URL", auth: "認証", none: "認証なし", apiKey: "X-API-Key", bearer: "Bearer Token", secret: "API KEY / TOKEN", saved: "アカウントに暗号化保存済み", placeholder: "保存済み。空欄で継続、入力で更新", newPlaceholder: "ComfyUI API Key を貼り付け", save: "接続テストして保存", saving: "ノード API を確認中…", connected: "接続確認済み。公式キャンバスでノードとモデルを利用できます", missing: "ComfyUI バックエンドが未設定です", failed: "接続に失敗しました", remove: "接続を削除", removed: "ComfyUI 接続を削除しました", show: "表示", hide: "非表示", local: "ローカル 8188 を開く", localHint: "ローカルサービスは公開サーバーから中継できないため、直接開いてください。",
  },
  en: {
    title: "ComfyUI execution backend", desc: "The official canvas runs same-origin inside FRAME. Configure only the backend that provides nodes, models, and execution here.", cloud: "Comfy Cloud API", remote: "Remote ComfyUI", cloudHint: "Requires Comfy Cloud Creator or Pro and an API key created at platform.comfy.org.", remoteHint: "Enter a publicly reachable HTTPS ComfyUI URL. FRAME proxies it server-side and never gives the secret to the canvas.", endpoint: "COMFYUI HTTPS URL", auth: "Authentication", none: "No authentication", apiKey: "X-API-Key", bearer: "Bearer token", secret: "API KEY / TOKEN", saved: "Encrypted in your account", placeholder: "Saved; leave blank to keep or type to replace", newPlaceholder: "Paste a ComfyUI API key", save: "Test connection and save", saving: "Checking the real node API…", connected: "Connection verified; the official canvas can load nodes and models", missing: "No ComfyUI execution backend configured", failed: "Connection failed", remove: "Delete connection", removed: "ComfyUI connection deleted", show: "Show", hide: "Hide", local: "Open local 8188", localHint: "A local service cannot be proxied by the hosted site. Open local ComfyUI directly.",
  },
} satisfies Record<Locale, Record<string, string>>;

export async function readComfyConfig(): Promise<ComfyConfigSummary | null> {
  const response = await fetch("/api/comfy-config", { cache: "no-store" });
  const data = await response.json();
  if (!response.ok) throw new Error(data?.error || "Unable to read ComfyUI configuration");
  return data.config || null;
}

export default function ComfyConnectionSettings({
  locale,
  compact = false,
  onConfig,
}: {
  locale: Locale;
  compact?: boolean;
  onConfig?: (config: ComfyConfigSummary | null) => void;
}) {
  const text = COPY[locale];
  const [mode, setMode] = useState<"cloud" | "remote">("cloud");
  const [baseUrl, setBaseUrl] = useState(CLOUD_URL);
  const [authMode, setAuthMode] = useState<"none" | "x-api-key" | "bearer">("x-api-key");
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [config, setConfig] = useState<ComfyConfigSummary | null>(null);
  const [status, setStatus] = useState(text.missing);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void readComfyConfig().then(saved => {
      if (cancelled) return;
      setConfig(saved);
      if (saved) {
        setMode(saved.mode);
        setBaseUrl(saved.baseUrl);
        setAuthMode(saved.authMode);
        setStatus(text.connected);
      }
      onConfig?.(saved);
    }).catch(error => {
      if (!cancelled) setStatus(error instanceof Error ? error.message : text.failed);
    });
    return () => { cancelled = true; };
  }, [onConfig, text.connected, text.failed]);

  function chooseMode(next: "cloud" | "remote") {
    setMode(next);
    setBaseUrl(next === "cloud" ? CLOUD_URL : "");
    setAuthMode(next === "cloud" ? "x-api-key" : "none");
    setApiKey("");
    setStatus(next === "cloud" ? text.cloudHint : text.remoteHint);
  }

  async function save() {
    setSaving(true);
    setStatus(text.saving);
    try {
      const response = await fetch("/api/comfy-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, baseUrl, authMode, apiKey: apiKey.trim() || undefined }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || text.failed);
      setConfig(data.config);
      setApiKey("");
      setStatus(text.connected);
      onConfig?.(data.config);
      window.dispatchEvent(new CustomEvent(COMFY_CONFIG_EVENT, { detail: data.config }));
    } catch (error) {
      setStatus(error instanceof Error ? error.message : text.failed);
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    setSaving(true);
    try {
      const response = await fetch("/api/comfy-config", { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || text.failed);
      setConfig(null);
      setApiKey("");
      setStatus(text.removed);
      onConfig?.(null);
      window.dispatchEvent(new CustomEvent(COMFY_CONFIG_EVENT, { detail: null }));
    } catch (error) {
      setStatus(error instanceof Error ? error.message : text.failed);
    } finally {
      setSaving(false);
    }
  }

  const savedMatches = config?.mode === mode && config.baseUrl === baseUrl && config.authMode === authMode && config.hasApiKey;

  return <section className={`comfy-connection-settings ${compact ? "compact" : ""}`}>
    <header><div><small>COMFYUI / SECURE BACKEND</small><h3>{text.title}</h3><p>{text.desc}</p></div><span className={config ? "ready" : ""}><i />{config ? "READY" : "SETUP"}</span></header>
    <div className="comfy-connection-modes" role="tablist">
      <button className={mode === "cloud" ? "active" : ""} onClick={() => chooseMode("cloud")}><i>☁</i><span><b>{text.cloud}</b><small>CLOUD GPU · X-API-KEY</small></span></button>
      <button className={mode === "remote" ? "active" : ""} onClick={() => chooseMode("remote")}><i>⌁</i><span><b>{text.remote}</b><small>YOUR GPU · HTTPS</small></span></button>
    </div>
    <p className="comfy-connection-hint">{mode === "cloud" ? text.cloudHint : text.remoteHint}</p>
    {mode === "remote" && <div className="comfy-connection-row">
      <label><span>{text.endpoint}</span><input value={baseUrl} onChange={event => setBaseUrl(event.target.value)} placeholder="https://comfy.example.com" /></label>
      <label><span>{text.auth}</span><select value={authMode} onChange={event => setAuthMode(event.target.value as typeof authMode)}><option value="none">{text.none}</option><option value="x-api-key">{text.apiKey}</option><option value="bearer">{text.bearer}</option></select></label>
    </div>}
    {authMode !== "none" && <label className="comfy-secret-field"><span>{text.secret} {savedMatches && <b>{text.saved}</b>}</span><div><input type={showKey ? "text" : "password"} value={apiKey} onChange={event => setApiKey(event.target.value)} autoComplete="new-password" placeholder={savedMatches ? text.placeholder : text.newPlaceholder} /><button onClick={() => setShowKey(value => !value)}>{showKey ? text.hide : text.show}</button></div></label>}
    <footer><span className={config ? "ok" : ""} aria-live="polite"><i />{status}</span><div><a href="http://127.0.0.1:8188" target="_blank" rel="noreferrer" title={text.localHint}>{text.local} ↗</a>{config && <button className="remove" onClick={remove} disabled={saving}>{text.remove}</button>}<button className="save" onClick={save} disabled={saving}>{saving ? text.saving : text.save}<b>↗</b></button></div></footer>
  </section>;
}
