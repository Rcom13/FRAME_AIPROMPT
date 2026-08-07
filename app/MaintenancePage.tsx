import type { CSSProperties } from "react";

type MaintenancePageProps = {
  signedIn: boolean;
  signInPath: string;
  signOutPath: string;
};

const nodes = [
  ["14%", "25%", "-1.2s", "18deg"], ["29%", "67%", "-3.8s", "-32deg"], ["43%", "18%", "-5.1s", "66deg"],
  ["58%", "72%", "-2.4s", "-78deg"], ["72%", "31%", "-4.6s", "152deg"], ["88%", "61%", "-.7s", "204deg"],
] as const;

export default function MaintenancePage({ signedIn, signInPath, signOutPath }: MaintenancePageProps) {
  return <main className="maintenance-shell">
    <div className="maintenance-noise" aria-hidden="true" />
    <header className="maintenance-header">
      <div className="maintenance-brand"><b>F</b><span>FRAME</span><em>AI CREATIVE OS</em></div>
      <div className="maintenance-state"><i /> SYSTEM MAINTENANCE</div>
    </header>

    <section className="maintenance-content">
      <div className="maintenance-copy">
        <span className="maintenance-kicker"><i /> PRIVATE BUILD IN PROGRESS</span>
        <h1>创作系统正在<br/><em>重新构建。</em></h1>
        <p>FRAME 当前进入维护阶段。我们正在升级人物骨骼、生成工作流与跨模块协作体验，正式工作台暂时停止对外开放。</p>
        <div className="maintenance-progress" aria-label="维护进度">
          <div><span>CORE SYSTEM</span><b>STABLE</b></div>
          <div><span>POSE ENGINE</span><b>UPGRADING</b></div>
          <div><span>PUBLIC ACCESS</span><b>PAUSED</b></div>
        </div>
        <div className="maintenance-actions">
          <a href={signedIn ? signOutPath : signInPath}>{signedIn ? "切换维护者账号" : "维护人员登录"}<b>↗</b></a>
          <small>完成维护后，公共访问将重新开放。</small>
        </div>
      </div>

      <div className="maintenance-visual" aria-hidden="true">
        <div className="maintenance-orbit orbit-a" /><div className="maintenance-orbit orbit-b" /><div className="maintenance-orbit orbit-c" />
        <div className="maintenance-core"><i /><span>FRAME</span><b>04</b></div>
        {nodes.map(([left,top,delay,lineAngle],index)=><span className="maintenance-node" key={index} style={{left,top,"--delay":delay,"--line-angle":lineAngle} as CSSProperties}><i /></span>)}
        <div className="maintenance-readout"><span>REBUILD SEQUENCE</span><b>ACTIVE</b></div>
      </div>
    </section>

    <footer className="maintenance-footer"><span>FRAME / MAINTENANCE MODE</span><b>请稍后回来</b></footer>
  </main>;
}
