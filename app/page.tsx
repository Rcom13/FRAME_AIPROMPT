"use client";

import { useState, type PointerEvent } from "react";

type Shot = { id:number; time:string; shot:string; visual:string; camera:string; audio:string; prompt:string };
type Story = { title:string; logline:string; hook:string; structure:[string,string][] };

const genres = ["悬疑惊悚", "科幻未来", "治愈情感", "古风奇幻", "都市反转", "搞笑脑洞"];
const styles = ["电影写实", "日系动漫", "3D 动画", "赛博朋克", "水墨国风", "复古胶片"];
const platforms = ["抖音 / TikTok", "小红书", "B站", "YouTube Shorts", "横屏短片"];
const sampleIdea = "一个女孩捡到能让时间倒流三分钟的怀表，却发现每使用一次，就会失去一段关于家人的记忆。";

const stylePrompts: Record<string,string> = {
  "电影写实":"cinematic photorealism, 35mm film, natural skin texture, dramatic lighting",
  "日系动漫":"Japanese anime film, expressive character acting, detailed background, soft cinematic light",
  "3D 动画":"stylized 3D animation, expressive features, global illumination, polished render",
  "赛博朋克":"cyberpunk cinema, neon reflections, deep shadows, volumetric atmosphere",
  "水墨国风":"Chinese ink wash aesthetic, poetic negative space, flowing brush texture, cinematic composition",
  "复古胶片":"vintage analog film, muted colors, halation, tactile grain, nostalgic lighting",
};

function subjectOf(text:string) {
  return text.trim().replace(/[。！？!?]/g, "").slice(0, 22) || "一个意外改变命运的人";
}

function titleOf(text:string) {
  const clean = text.replace(/[，。！？、,.!?\s]/g, "");
  const clues = ["时间", "记忆", "秘密", "最后", "消失", "重逢", "梦", "门", "信", "光"];
  const clue = clues.find(x => clean.includes(x));
  return `《${clue ? `最后的${clue}` : clean.slice(0, 7) || "未命名故事"}》`;
}

function buildStory(idea:string, genre:string): Story {
  const subject = subjectOf(idea);
  return {
    title: titleOf(idea),
    logline: `${subject}。在一场无法回头的选择中，主人公必须直面隐藏的代价，并在失去一切之前完成最后的决定。`,
    hook: `如果“${subject.slice(0, 15)}”并不是偶然，而是一场早已安排好的交换呢？`,
    structure: [
      ["开场钩子", `用一个反常瞬间直接呈现核心设定：${subject}。异常细节在前 3 秒被放大，引发观众疑问。`],
      ["冲突升级", `主人公尝试利用这个机会改变现状，却发现每前进一步都会触发新的代价，${genre}氛围持续加深。`],
      ["高潮反转", "此前被忽略的细节突然串联：真正需要被拯救的并不是表面上的目标，而是主人公自己。"],
      ["余韵收束", `主人公作出不可逆的选择。最后一个画面呼应“${subject.slice(0, 10)}”，留下开放式问题。`],
    ]
  };
}

function buildShots(idea:string, genre:string, style:string, duration:number): Shot[] {
  const count = Math.max(4, Math.min(8, Math.round(duration / 7)));
  const subject = subjectOf(idea);
  const visualBeats = [
    `一个极不寻常的细节首先出现，暗示“${subject}”。主人公还没有意识到危险。`,
    `主人公察觉异常，第一次尝试确认眼前发生的事，环境中的所有视线都被引向核心线索。`,
    `行动开始。主人公穿过熟悉却突然陌生的空间，代价以一个具体、可见的变化出现。`,
    `新的线索揭露：最信任的人隐瞒了关键信息，故事目标在此刻发生偏转。`,
    `主人公逼近真相，空间与情绪同时收紧，最初出现的细节再次出现但含义完全相反。`,
    `高潮选择到来。主人公伸手触碰核心物件，在得到与失去之间停顿一秒。`,
    `选择完成，世界恢复平静，但某个重要的人或事已被彻底改变。`,
    `以一个安静的极近景结束，留下与“${subject.slice(0, 10)}”有关的最后疑问。`,
  ];
  const cameras = ["极近景缓慢推进，浅景深锁定异常细节", "中景横移到快速推近，跟随人物视线揭示", "手持跟拍转环绕，轻微晃动增强紧迫感", "固定对称构图，随后突然变焦完成反转", "低机位跟随，利用前景遮挡连续转场", "大全景快速推至特写，在动作前短暂停顿", "高位缓慢拉远，让人物被环境吞没", "极特写定格，闪白后切黑" ];
  const audios = ["环境声突然抽离，只保留一个被放大的细节声", "低频氛围渐入；一句短促的疑问台词", "急促脚步、呼吸和逐渐加快的节拍", "音乐骤停；关键人物说出半句真相", "低频持续上升，远处传来熟悉的声音", "心跳声放大，动作发生时完全静音", "主题旋律以残缺版本回归", "一个清晰的物件声；片尾问题字幕出现" ];
  const shots = ["极特写","中景","跟拍","双人景","大全景","特写","远景","极特写"];
  const each = duration / count;
  return Array.from({length:count}, (_,i) => {
    const start = Math.round(i * each); const end = Math.round((i + 1) * each);
    return {
      id:i+1,
      time:`00:${String(start).padStart(2,"0")}–00:${String(end).padStart(2,"0")}`,
      shot:shots[i], visual:visualBeats[i], camera:cameras[i], audio:audios[i],
      prompt:`${stylePrompts[style]}, ${visualBeats[i].replace(/[“”。，]/g," ")}, ${genre}, ${i === 0 ? "macro detail" : "consistent protagonist and wardrobe"}, ${duration <= 60 ? "vertical 9:16 composition" : "cinematic composition"}, no text, high visual consistency`,
    };
  });
}

export default function Home() {
  const [activeTab, setActiveTab] = useState<"story"|"shots">("story");
  const [idea,setIdea] = useState(sampleIdea); const [genre,setGenre] = useState(genres[0]);
  const [style,setStyle] = useState(styles[0]); const [platform,setPlatform] = useState(platforms[0]);
  const [duration,setDuration] = useState(30); const [story,setStory] = useState(() => buildStory(sampleIdea,genres[0]));
  const [shots,setShots] = useState(() => buildShots(sampleIdea,genres[0],styles[0],30));
  const [generating,setGenerating] = useState(false); const [copied,setCopied] = useState("");
  const [notice,setNotice] = useState("示例内容"); const [version,setVersion] = useState(0);

  function generate(){
    if(!idea.trim()) return; setGenerating(true); setNotice("正在拆解创意…");
    setTimeout(() => {
      setStory(buildStory(idea,genre)); setShots(buildShots(idea,genre,style,duration));
      setVersion(v=>v+1); setGenerating(false); setNotice("已根据你的创意重新生成"); setActiveTab("story");
    },900);
  }
  async function copy(text:string,label:string){ await navigator.clipboard.writeText(text); setCopied(label); setTimeout(()=>setCopied(""),1400); }
  function exportText(){ const content=`${story.title}\n\n核心创意：${idea}\n一句话梗概：${story.logline}\n\n${shots.map(s=>`镜头 ${s.id}｜${s.time}｜${s.shot}\n画面：${s.visual}\n运镜：${s.camera}\n声音：${s.audio}\n提示词：${s.prompt}`).join("\n\n")}`; const blob=new Blob([content],{type:"text/plain;charset=utf-8"}); const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=`${story.title.replace(/[《》]/g,"")}-分镜脚本.txt`;a.click();URL.revokeObjectURL(a.href); }
  function trackLight(e:PointerEvent<HTMLElement>){ e.currentTarget.style.setProperty("--mx",`${e.clientX}px`); e.currentTarget.style.setProperty("--my",`${e.clientY}px`); }

  return <main onPointerMove={trackLight}>
    <div className="ambient ambient-one"/><div className="ambient ambient-two"/><div className="noise"/>
    <header className="topbar"><div className="brand" aria-label="FRAME AI Story Studio"><span className="brand-symbol"><b>F</b><i/></span><span className="brand-word">FRAME</span><em>AI STORY STUDIO</em></div><div className="top-actions"><button className="ghost">创作历史</button><button className="avatar">创</button></div></header>
    <section className="workspace">
      <aside className="control-panel">
        <div className="eyebrow"><span></span> NEW PROJECT</div><h1>把一个灵感<br/>变成一支影片。</h1><p className="intro">从剧情结构到镜头提示词，为 AI 视频创作者打造的前期工作台。</p>
        <label className="field-label">01 / 核心创意</label><div className="textarea-wrap"><textarea value={idea} onChange={e=>setIdea(e.target.value)} maxLength={300} aria-label="核心创意"/><span>{idea.length}/300</span></div>
        <div className="split-fields"><div><label className="field-label">02 / 题材</label><select value={genre} onChange={e=>setGenre(e.target.value)}>{genres.map(x=><option key={x}>{x}</option>)}</select></div><div><label className="field-label">03 / 视觉风格</label><select value={style} onChange={e=>setStyle(e.target.value)}>{styles.map(x=><option key={x}>{x}</option>)}</select></div></div>
        <label className="field-label">04 / 成片时长 <b>{duration} 秒</b></label><input className="range" type="range" min="15" max="60" step="15" value={duration} onChange={e=>setDuration(Number(e.target.value))}/><div className="ticks"><span>15s</span><span>30s</span><span>45s</span><span>60s</span></div>
        <label className="field-label">05 / 发布平台</label><select value={platform} onChange={e=>setPlatform(e.target.value)}>{platforms.map(x=><option key={x}>{x}</option>)}</select>
        <button className="generate" onClick={generate} disabled={generating||!idea.trim()}><span>{generating?"正在生成，请稍候…":"生成剧情与分镜"}</span><b>{generating?"···":"↗"}</b></button><p className="hint">无需登录 · 生成内容可自由编辑与导出</p>
      </aside>
      <section className={`result-panel ${generating?"is-generating":""}`} key={version} aria-busy={generating}>
        <div className="result-head"><div className="tabs"><button className={activeTab==="story"?"active":""} onClick={()=>setActiveTab("story")}>剧情大纲</button><button className={activeTab==="shots"?"active":""} onClick={()=>setActiveTab("shots")}>分镜脚本 <small>{shots.length}</small></button></div><div className="result-actions"><span className="result-notice">{notice}</span><button className="export" onClick={exportText}>↓ 导出脚本</button></div></div>
        {generating&&<div className="generating-mask"><i></i><b>{notice}</b><span>正在组织剧情节奏、镜头画面与提示词</span></div>}
        {activeTab==="story"?<div className="story-view"><div className="story-hero"><div><span className="tag">{genre}</span><span className="tag">{duration} 秒</span><span className="tag">{platform}</span></div><h2>{story.title}</h2><p>{story.logline}</p></div><div className="hook-card"><span>开场钩子 / HOOK</span><blockquote>“{story.hook}”</blockquote><button onClick={()=>copy(story.hook,"hook")}>{copied==="hook"?"已复制":"复制"}</button></div><div className="structure"><h3>叙事结构</h3>{story.structure.map((item,i)=><article key={item[0]}><b>0{i+1}</b><div><h4>{item[0]}</h4><p>{item[1]}</p></div><span>{`${Math.round(i*duration/4)}–${Math.round((i+1)*duration/4)}s`}</span></article>)}</div><button className="to-shots" onClick={()=>setActiveTab("shots")}>查看完整分镜脚本 <span>→</span></button></div>:
        <div className="shots-view"><div className="shot-title"><div><span className="eyebrow">SHOT LIST</span><h2>{story.title} · 分镜脚本</h2></div><span>共 {shots.length} 镜 · {duration} 秒</span></div>{shots.map(shot=><article className="shot-card" key={shot.id}><div className="shot-no"><span>SHOT</span><b>{String(shot.id).padStart(2,"0")}</b><em>{shot.time}</em></div><div className="shot-content"><span className="shot-type">{shot.shot}</span><h3>{shot.visual}</h3><div className="shot-meta"><p><b>运镜</b>{shot.camera}</p><p><b>声音</b>{shot.audio}</p></div><div className="prompt"><span>AI VIDEO PROMPT</span><p>{shot.prompt}</p><button onClick={()=>copy(shot.prompt,`shot${shot.id}`)}>{copied===`shot${shot.id}`?"已复制":"复制"}</button></div></div></article>)}</div>}
      </section>
    </section>
  </main>;
}
