type WelcomeVisual = "story" | "workflow" | "render" | "pose";

export default function WelcomeModuleVisual({ type }: { type: WelcomeVisual }) {
  if (type === "story") return <div className="module-visual portal-preview story-preview" aria-hidden="true">
    <div className="preview-stage">
    <span className="preview-grid" />
    <div className="story-reel">
      <i className="story-frame frame-one"><b>01</b><span /><em>WIDE</em></i>
      <i className="story-frame frame-two"><b>02</b><span /><em>CLOSE</em></i>
      <i className="story-frame frame-three"><b>03</b><span /><em>MOVE</em></i>
      <i className="story-frame frame-four"><b>04</b><span /><em>TURN</em></i>
    </div>
    <span className="story-playhead" />
    <div className="preview-hud"><span><i /> NARRATIVE SEQUENCE</span><b>00:24:08</b></div>
    </div>
  </div>;

  if (type === "workflow") return <div className="module-visual portal-preview workflow-preview" aria-hidden="true">
    <div className="preview-stage">
    <span className="preview-grid" />
    <i className="graph-link link-one"><b /></i>
    <i className="graph-link link-two"><b /></i>
    <i className="graph-link link-three"><b /></i>
    <div className="graph-node node-input"><i /><span><b>LOAD</b><small>REFERENCE</small></span><em /></div>
    <div className="graph-node node-model"><i /><span><b>MODEL</b><small>DIFFUSION</small></span><em /><em /></div>
    <div className="graph-node node-output"><i /><span><b>OUTPUT</b><small>PREVIEW</small></span><em /></div>
    <div className="graph-minimap"><i /><i /><i /></div>
    <div className="preview-hud"><span><i /> GRAPH ONLINE</span><b>3 NODES · 3 LINKS</b></div>
    </div>
  </div>;

  if (type === "render") return <div className="module-visual portal-preview render-preview" aria-hidden="true">
    <div className="preview-stage">
    <span className="preview-grid" />
    <div className="render-layers"><i /><i /><i /></div>
    <div className="render-frame"><span className="render-sun" /><span className="render-horizon" /><span className="render-subject" /><b className="render-scan" /></div>
    <div className="render-aperture"><i /><i /><i /></div>
    <div className="render-meter"><i /><i /><i /><i /><i /></div>
    <div className="preview-hud"><span><i /> SYNTHESIS ACTIVE</span><b>1536 × 1024</b></div>
    </div>
  </div>;

  return <div className="module-visual portal-preview pose-preview" aria-hidden="true">
    <div className="preview-stage">
    <span className="preview-grid" />
    <div className="pose-orbit orbit-one" /><div className="pose-orbit orbit-two" />
    <div className="preview-rig">
      <i className="rig-head" /><i className="rig-joint joint-neck" />
      <span className="rig-bone bone-torso" /><span className="rig-bone bone-hips" />
      <span className="rig-bone bone-upper-arm left" /><span className="rig-bone bone-forearm left" />
      <span className="rig-bone bone-upper-arm right" /><span className="rig-bone bone-forearm right" />
      <span className="rig-bone bone-thigh left" /><span className="rig-bone bone-shin left" />
      <span className="rig-bone bone-thigh right" /><span className="rig-bone bone-shin right" />
      <i className="rig-joint joint-shoulder left" /><i className="rig-joint joint-shoulder right" />
      <i className="rig-joint joint-elbow left" /><i className="rig-joint joint-elbow right" />
      <i className="rig-joint joint-hand left" /><i className="rig-joint joint-hand right" />
      <i className="rig-joint joint-hip left" /><i className="rig-joint joint-hip right" />
      <i className="rig-joint joint-knee left" /><i className="rig-joint joint-knee right" />
      <i className="rig-joint joint-foot left" /><i className="rig-joint joint-foot right" />
    </div>
    <div className="pose-axis"><i>X</i><i>Y</i><i>Z</i></div>
    <div className="preview-hud"><span><i /> HUMAN RIG ACTIVE</span><b>14 JOINTS · IK</b></div>
    </div>
  </div>;
}
