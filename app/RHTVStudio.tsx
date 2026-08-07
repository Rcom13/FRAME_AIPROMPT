"use client";

import { useMemo, useState, type CSSProperties } from "react";
import type { Locale } from "./i18n";

type Clip={id:string;title:string;caption:string;duration:number;color:string};
const colors=["#ff5a1f","#8056ff","#2f7eff","#1eb98a","#d24f8e"];
const initialClips:Clip[]=[
  {id:"opening",title:"开场",caption:"在画布上直接改文字、画面和节奏",duration:4,color:colors[0]},
  {id:"turn",title:"转折",caption:"把灵感拖进时间线，快速拼出第一版",duration:5,color:colors[1]},
  {id:"ending",title:"收束",caption:"预览整体节奏，再交给生成模型",duration:4,color:colors[3]},
];

const copy={
  "zh-CN":{eyebrow:"05 / PRIVATE WORKBENCH",title:"先剪出感觉，再处理复杂参数。",intro:"这是正在开发的轻量视频画布。它把镜头、文字与节奏放在同一处，不要求先理解复杂节点。",add:"添加镜头",preview:"预览",canvas:"直接编辑画布",inspector:"当前镜头",shot:"镜头名称",caption:"画面文字",duration:"时长",color:"主色",remove:"删除镜头",timeline:"时间线",private:"仅开发者可见",hint:"选择时间线中的镜头，在右侧调整内容。下一阶段会接入素材拖放、转场和真实视频导出。"},
  "zh-TW":{eyebrow:"05 / PRIVATE WORKBENCH",title:"先剪出感覺，再處理複雜參數。",intro:"這是開發中的輕量影片畫布，把鏡頭、文字與節奏放在一起，不需要先理解複雜節點。",add:"新增鏡頭",preview:"預覽",canvas:"直接編輯畫布",inspector:"目前鏡頭",shot:"鏡頭名稱",caption:"畫面文字",duration:"時長",color:"主色",remove:"刪除鏡頭",timeline:"時間軸",private:"僅開發者可見",hint:"選擇時間軸中的鏡頭，在右側調整內容。下一階段會接入素材拖放、轉場與影片輸出。"},
  ja:{eyebrow:"05 / PRIVATE WORKBENCH",title:"まず感覚で組み、細かな設定はあとから。",intro:"開発中の軽量ビデオキャンバスです。複雑なノードを覚える前に、ショット、文字、テンポを一つの画面で整えられます。",add:"ショット追加",preview:"プレビュー",canvas:"キャンバスを直接編集",inspector:"現在のショット",shot:"ショット名",caption:"画面テキスト",duration:"長さ",color:"キーカラー",remove:"削除",timeline:"タイムライン",private:"開発者のみ",hint:"タイムラインのショットを選び、右側で内容を調整します。次の段階で素材ドロップ、トランジション、動画出力を追加します。"},
  en:{eyebrow:"05 / PRIVATE WORKBENCH",title:"Cut for feeling before touching complex settings.",intro:"This lightweight video canvas keeps shots, copy, and pacing together, without asking creators to learn a node graph first.",add:"Add shot",preview:"Preview",canvas:"Edit directly on canvas",inspector:"Current shot",shot:"Shot name",caption:"On-screen copy",duration:"Duration",color:"Key color",remove:"Delete shot",timeline:"Timeline",private:"Developer only",hint:"Choose a shot on the timeline and shape it in the inspector. Media drops, transitions, and real export come next."},
} as const;

export default function RHTVStudio({locale}:{locale:Locale}){
  const c=copy[locale];const [clips,setClips]=useState(initialClips);const [selectedId,setSelectedId]=useState(initialClips[0].id);const [playing,setPlaying]=useState(false);
  const selected=clips.find(item=>item.id===selectedId)||clips[0];const total=useMemo(()=>clips.reduce((sum,item)=>sum+item.duration,0),[clips]);
  function update(patch:Partial<Clip>){setClips(items=>items.map(item=>item.id===selected.id?{...item,...patch}:item))}
  function addClip(){const id=crypto.randomUUID();const next={id,title:`Shot ${String(clips.length+1).padStart(2,"0")}`,caption:"点击右侧开始写这一镜",duration:4,color:colors[clips.length%colors.length]};setClips(items=>[...items,next]);setSelectedId(id)}
  function remove(){if(clips.length===1)return;const index=clips.findIndex(item=>item.id===selected.id);const next=clips.filter(item=>item.id!==selected.id);setClips(next);setSelectedId(next[Math.max(0,index-1)].id)}
  return <section className="rhtv-studio">
    <header className="rhtv-head"><div><span><i/> {c.eyebrow}</span><h1>{c.title}</h1><p>{c.intro}</p></div><div className="rhtv-head-actions"><em>{c.private}</em><button onClick={addClip}>＋ {c.add}</button><button className={playing?"active":""} onClick={()=>setPlaying(value=>!value)}>{playing?"Ⅱ":"▶"} {c.preview}</button></div></header>
    <div className="rhtv-layout">
      <aside className="rhtv-toolrail" aria-label="Canvas tools"><button className="active">↖<span>Select</span></button><button>T<span>Text</span></button><button>▧<span>Media</span></button><button>◇<span>Shape</span></button><button>♫<span>Audio</span></button></aside>
      <main className="rhtv-workbench"><div className="rhtv-canvas-label"><span>{c.canvas}</span><b>16:9 · 1920×1080</b></div><div className={`rhtv-artboard ${playing?"playing":""}`} style={{"--scene-color":selected.color} as CSSProperties}><div className="rhtv-scene-glow"/><div className="rhtv-scene-frame"><span>FRAME / {String(clips.indexOf(selected)+1).padStart(2,"0")}</span><h2 contentEditable suppressContentEditableWarning onBlur={event=>update({caption:event.currentTarget.textContent||""})}>{selected.caption}</h2><p>{selected.title} · {selected.duration}s</p></div><i className="rhtv-playhead"/></div><div className="rhtv-canvas-controls"><button>−</button><span>72%</span><button>＋</button><button>适合画布</button></div></main>
      <aside className="rhtv-inspector"><span>INSPECTOR</span><h2>{c.inspector}</h2><label><b>{c.shot}</b><input value={selected.title} onChange={event=>update({title:event.target.value})}/></label><label><b>{c.caption}</b><textarea value={selected.caption} onChange={event=>update({caption:event.target.value})}/></label><label><b>{c.duration}</b><div><input type="range" min="1" max="15" value={selected.duration} onChange={event=>update({duration:Number(event.target.value)})}/><em>{selected.duration}s</em></div></label><label><b>{c.color}</b><div className="rhtv-colors">{colors.map(color=><button key={color} className={selected.color===color?"active":""} style={{background:color}} onClick={()=>update({color})} aria-label={color}/>)}</div></label><button className="rhtv-remove" onClick={remove}>{c.remove}</button></aside>
    </div>
    <footer className="rhtv-timeline"><div><span>05 / {c.timeline}</span><b>{clips.length} CLIPS · {total}s</b></div><section><i className={playing?"moving":""}/>{clips.map((clip,index)=><button key={clip.id} className={selected.id===clip.id?"active":""} style={{"--clip-color":clip.color,"--clip-width":`${Math.max(110,clip.duration*30)}px`} as CSSProperties} onClick={()=>setSelectedId(clip.id)}><small>{String(index+1).padStart(2,"0")}</small><b>{clip.title}</b><span>{clip.duration}s</span></button>)}<button className="rhtv-add-clip" onClick={addClip}>＋</button></section><p>{c.hint}</p></footer>
  </section>
}
