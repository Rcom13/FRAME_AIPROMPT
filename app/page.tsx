"use client";

import { useMemo, useState } from "react";

type Shot = {
  id: number;
  time: string;
  shot: string;
  visual: string;
  camera: string;
  audio: string;
  prompt: string;
};

const genres = ["悬疑惊悚", "科幻未来", "治愈情感", "古风奇幻", "都市反转", "搞笑脑洞"];
const styles = ["电影写实", "日系动漫", "3D 动画", "赛博朋克", "水墨国风", "复古胶片"];
const platforms = ["抖音 / TikTok", "小红书", "B站", "YouTube Shorts", "横屏短片"];

const sampleShots: Shot[] = [
  { id: 1, time: "00:00–00:04", shot: "特写", visual: "雨夜，便利店的霓虹灯忽明忽暗。林夏手中的旧怀表突然倒转。", camera: "微距推进，浅景深，焦点从雨滴切到表盘", audio: "雨声骤停，秒针逆行声被放大", prompt: "cinematic close-up, an antique pocket watch running backwards in a young woman's hand, rainy neon convenience store, teal and amber lighting, shallow depth of field, 35mm film grain" },
  { id: 2, time: "00:04–00:09", shot: "中景", visual: "林夏抬头，玻璃倒影里出现了三年前失踪的哥哥。", camera: "缓慢横移，利用玻璃反射完成揭示", audio: "低频氛围渐入；林夏：哥？", prompt: "medium shot, shocked young Asian woman facing a glass window, mysterious male silhouette visible only in reflection, rainy night, suspense, cinematic composition" },
  { id: 3, time: "00:09–00:15", shot: "跟拍", visual: "她冲出门，街道却空无一人，所有钟表都停在 23:17。", camera: "手持跟拍转环绕，轻微晃动制造急迫感", audio: "急促脚步与心跳；城市环境声完全消失", prompt: "handheld tracking shot, lone woman running into an empty neon city street, every clock frozen at 23:17, rain suspended in mid-air, eerie cinematic realism" },
  { id: 4, time: "00:15–00:22", shot: "大全景", visual: "街道尽头，哥哥背对她站在一道白色裂缝前。", camera: "高位俯拍后快速推向人物，强中心构图", audio: "哥哥：这次，别再打开它。", prompt: "epic wide shot, lone man before a glowing white fracture in reality at the end of an empty street, woman in foreground, volumetric fog, high contrast sci-fi mystery" },
  { id: 5, time: "00:22–00:30", shot: "极特写", visual: "怀表“咔哒”弹开，表盖内刻着今天的日期。画面瞬间切黑。", camera: "极特写定格，闪白转黑", audio: "金属咔哒声；字幕：如果时间只允许你救一个人？", prompt: "extreme macro shot of an antique pocket watch opening, today's date engraved inside, dramatic rim light, ominous, cinematic ending frame, ultra detailed" },
];

export default function Home() {
  const [activeTab, setActiveTab] = useState<"story" | "shots">("story");
  const [idea, setIdea] = useState("一个女孩捡到能让时间倒流三分钟的怀表，却发现每使用一次，就会失去一段关于家人的记忆。");
  const [genre, setGenre] = useState(genres[0]);
  const [style, setStyle] = useState(styles[0]);
  const [platform, setPlatform] = useState(platforms[0]);
  const [duration, setDuration] = useState(30);
  const [shots, setShots] = useState<Shot[]>(sampleShots);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState("");

  const story = useMemo(() => ({
    title: "《倒数三分钟》",
    logline: `在${genre}的氛围中，一次看似能够挽回遗憾的机会，逼迫主人公在记忆与至亲之间作出选择。`,
    hook: "如果时间可以倒流三分钟，代价却是忘记你最爱的人，你会按下那枚怀表吗？",
    structure: [
      ["开场钩子", "怀表逆转，整个世界停在同一秒。熟悉的人只存在于倒影里。"],
      ["冲突升级", "主人公追逐失踪的亲人，同时发现每次倒流后，手机相册里都会少一张合照。"],
      ["高潮反转", "她终于明白，失踪的人一直在用自己的记忆，替她支付时间倒流的代价。"],
      ["余韵收束", "怀表再次开启。她看见今天的日期，也听见那句迟到了三年的警告。"],
    ]
  }), [genre]);

  function generate() {
    if (!idea.trim()) return;
    setGenerating(true);
    setTimeout(() => {
      const count = Math.max(4, Math.min(8, Math.round(duration / 6)));
      setShots(sampleShots.slice(0, count).map((s, i) => ({...s, id: i + 1, prompt: `${s.prompt}, ${style}, vertical composition, ${genre}, high visual consistency`})));
      setGenerating(false);
      setActiveTab("story");
    }, 850);
  }

  async function copy(text: string, label: string) {
    await navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(""), 1400);
  }

  function exportText() {
    const content = `${story.title}\n\n核心创意：${idea}\n一句话梗概：${story.logline}\n\n${shots.map(s => `镜头 ${s.id}｜${s.time}｜${s.shot}\n画面：${s.visual}\n运镜：${s.camera}\n声音：${s.audio}\n提示词：${s.prompt}`).join("\n\n")}`;
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "倒数三分钟-分镜脚本.txt"; a.click(); URL.revokeObjectURL(a.href);
  }

  return (
    <main>
      <header className="topbar">
        <div className="brand"><span className="brand-mark">帧</span><span>映构</span><em>STORY FORGE</em></div>
        <div className="top-actions"><button className="ghost">创作历史</button><button className="avatar">创</button></div>
      </header>

      <section className="workspace">
        <aside className="control-panel">
          <div className="eyebrow"><span></span> NEW PROJECT</div>
          <h1>把一个灵感<br/>变成一支影片。</h1>
          <p className="intro">从剧情结构到镜头提示词，为 AI 视频创作者打造的前期工作台。</p>

          <label className="field-label">01 / 核心创意</label>
          <div className="textarea-wrap">
            <textarea value={idea} onChange={e => setIdea(e.target.value)} maxLength={300} aria-label="核心创意" />
            <span>{idea.length}/300</span>
          </div>

          <div className="split-fields">
            <div><label className="field-label">02 / 题材</label><select value={genre} onChange={e => setGenre(e.target.value)}>{genres.map(x => <option key={x}>{x}</option>)}</select></div>
            <div><label className="field-label">03 / 视觉风格</label><select value={style} onChange={e => setStyle(e.target.value)}>{styles.map(x => <option key={x}>{x}</option>)}</select></div>
          </div>

          <label className="field-label">04 / 成片时长 <b>{duration} 秒</b></label>
          <input className="range" type="range" min="15" max="60" step="15" value={duration} onChange={e => setDuration(Number(e.target.value))} />
          <div className="ticks"><span>15s</span><span>30s</span><span>45s</span><span>60s</span></div>

          <label className="field-label">05 / 发布平台</label>
          <select value={platform} onChange={e => setPlatform(e.target.value)}>{platforms.map(x => <option key={x}>{x}</option>)}</select>

          <button className="generate" onClick={generate} disabled={generating || !idea.trim()}><span>{generating ? "正在构思…" : "生成剧情与分镜"}</span><b>↗</b></button>
          <p className="hint">无需登录 · 生成内容可自由编辑与导出</p>
        </aside>

        <section className="result-panel">
          <div className="result-head">
            <div className="tabs"><button className={activeTab === "story" ? "active" : ""} onClick={() => setActiveTab("story")}>剧情大纲</button><button className={activeTab === "shots" ? "active" : ""} onClick={() => setActiveTab("shots")}>分镜脚本 <small>{shots.length}</small></button></div>
            <button className="export" onClick={exportText}>↓ 导出脚本</button>
          </div>

          {activeTab === "story" ? <div className="story-view">
            <div className="story-hero"><div><span className="tag">{genre}</span><span className="tag">{duration} 秒</span><span className="tag">{platform}</span></div><h2>{story.title}</h2><p>{story.logline}</p></div>
            <div className="hook-card"><span>开场钩子 / HOOK</span><blockquote>“{story.hook}”</blockquote><button onClick={() => copy(story.hook, "hook")}>{copied === "hook" ? "已复制" : "复制"}</button></div>
            <div className="structure"><h3>叙事结构</h3>{story.structure.map((item, i) => <article key={item[0]}><b>0{i+1}</b><div><h4>{item[0]}</h4><p>{item[1]}</p></div><span>{["0–4s", "4–15s", "15–24s", "24–30s"][i]}</span></article>)}</div>
            <button className="to-shots" onClick={() => setActiveTab("shots")}>查看完整分镜脚本 <span>→</span></button>
          </div> : <div className="shots-view">
            <div className="shot-title"><div><span className="eyebrow">SHOT LIST</span><h2>{story.title} · 分镜脚本</h2></div><span>共 {shots.length} 镜 · {duration} 秒</span></div>
            {shots.map(shot => <article className="shot-card" key={shot.id}>
              <div className="shot-no"><span>SHOT</span><b>{String(shot.id).padStart(2,"0")}</b><em>{shot.time}</em></div>
              <div className="shot-content"><span className="shot-type">{shot.shot}</span><h3>{shot.visual}</h3><div className="shot-meta"><p><b>运镜</b>{shot.camera}</p><p><b>声音</b>{shot.audio}</p></div><div className="prompt"><span>AI VIDEO PROMPT</span><p>{shot.prompt}</p><button onClick={() => copy(shot.prompt, `shot${shot.id}`)}>{copied === `shot${shot.id}` ? "已复制" : "复制"}</button></div></div>
            </article>)}
          </div>}
        </section>
      </section>
    </main>
  );
}
