"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

export type PosePreset="neutral"|"action"|"seated"|"reach";
export type PoseRigHandle={capture:()=>string;reset:()=>void;mirror:()=>void;applyPreset:(preset:PosePreset)=>void};

type Point=[number,number,number];
type JointMap=Record<string,Point>;

const neutralPose:JointMap={
  head:[0,2.85,0],neck:[0,2.25,0],chest:[0,1.55,0],pelvis:[0,.55,0],
  shoulderL:[-.72,2.02,0],elbowL:[-1.15,1.18,.05],wristL:[-1.25,.28,.12],
  shoulderR:[.72,2.02,0],elbowR:[1.15,1.18,.05],wristR:[1.25,.28,.12],
  hipL:[-.42,.48,0],kneeL:[-.48,-.78,.08],ankleL:[-.5,-2.05,.05],
  hipR:[.42,.48,0],kneeR:[.48,-.78,.08],ankleR:[.5,-2.05,.05],
};

const presets:Record<PosePreset,Partial<JointMap>>={
  neutral:{},
  action:{head:[-.1,2.82,.08],neck:[0,2.23,0],chest:[.08,1.5,.04],pelvis:[-.12,.52,0],shoulderL:[-.7,1.98,.1],elbowL:[-1.48,1.62,.25],wristL:[-1.82,.92,.35],shoulderR:[.78,2.02,-.05],elbowR:[1.2,1.12,-.5],wristR:[.62,.62,-.65],hipL:[-.45,.45,.06],kneeL:[-.95,-.55,.5],ankleL:[-1.42,-1.55,.6],hipR:[.38,.47,-.02],kneeR:[.64,-.82,-.32],ankleR:[.82,-2.02,-.12]},
  seated:{head:[0,2.2,.08],neck:[0,1.68,0],chest:[0,1.02,0],pelvis:[0,.05,0],shoulderL:[-.68,1.48,0],elbowL:[-.92,.67,.42],wristL:[-.48,.1,.72],shoulderR:[.68,1.48,0],elbowR:[.92,.67,.42],wristR:[.48,.1,.72],hipL:[-.4,0,0],kneeL:[-.55,-.85,.95],ankleL:[-.58,-1.85,.88],hipR:[.4,0,0],kneeR:[.55,-.85,.95],ankleR:[.58,-1.85,.88]},
  reach:{head:[.08,2.82,.05],neck:[0,2.22,0],chest:[0,1.52,0],pelvis:[-.08,.52,0],shoulderL:[-.7,2.01,0],elbowL:[-1.1,1.35,.25],wristL:[-.98,.55,.55],shoulderR:[.72,2.05,0],elbowR:[1.05,2.75,.12],wristR:[.82,3.55,.2],hipL:[-.43,.45,0],kneeL:[-.55,-.78,.1],ankleL:[-.62,-2.04,.05],hipR:[.38,.48,0],kneeR:[.72,-.72,-.18],ankleR:[.88,-1.96,-.12]},
};

const bonePairs:[string,string][]=[
  ["head","neck"],["neck","chest"],["chest","pelvis"],
  ["neck","shoulderL"],["shoulderL","elbowL"],["elbowL","wristL"],
  ["neck","shoulderR"],["shoulderR","elbowR"],["elbowR","wristR"],
  ["pelvis","hipL"],["hipL","kneeL"],["kneeL","ankleL"],
  ["pelvis","hipR"],["hipR","kneeR"],["kneeR","ankleR"],
];

function clonePose(pose:JointMap){return Object.fromEntries(Object.entries(pose).map(([key,value])=>[key,[...value] as Point])) as JointMap}

const PoseRig=forwardRef<PoseRigHandle,{ariaLabel:string;onPoseChange?:(pose:JointMap)=>void}>(({ariaLabel,onPoseChange},ref)=>{
  const mountRef=useRef<HTMLDivElement>(null);
  const apiRef=useRef<PoseRigHandle>({capture:()=>"",reset:()=>{},mirror:()=>{},applyPreset:()=>{}});
  useImperativeHandle(ref,()=>apiRef.current,[]);

  useEffect(()=>{
    const mount=mountRef.current;if(!mount)return;
    const scene=new THREE.Scene();
    scene.background=new THREE.Color(0x11110f);
    scene.fog=new THREE.FogExp2(0x11110f,.045);
    const camera=new THREE.PerspectiveCamera(36,1,.1,100);camera.position.set(0,1.1,9.8);
    const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));renderer.outputColorSpace=THREE.SRGBColorSpace;mount.appendChild(renderer.domElement);
    const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.target.set(0,.4,0);controls.minDistance=6;controls.maxDistance=15;controls.enablePan=false;
    const hemi=new THREE.HemisphereLight(0xffffff,0x35251d,2.2);scene.add(hemi);
    const key=new THREE.DirectionalLight(0xff6b35,3.5);key.position.set(4,6,5);scene.add(key);
    const rim=new THREE.DirectionalLight(0x5b79ff,1.5);rim.position.set(-4,2,-5);scene.add(rim);
    const grid=new THREE.GridHelper(12,24,0x5c3529,0x252522);grid.position.y=-2.32;scene.add(grid);
    const floor=new THREE.Mesh(new THREE.CircleGeometry(2.15,64),new THREE.MeshBasicMaterial({color:0xff5a24,transparent:true,opacity:.045,side:THREE.DoubleSide}));floor.rotation.x=-Math.PI/2;floor.position.y=-2.3;scene.add(floor);

    const positions=clonePose(neutralPose);
    const jointMeshes:Record<string,THREE.Mesh>={};
    const jointGeometry=new THREE.SphereGeometry(.105,20,20);
    const jointMaterial=new THREE.MeshStandardMaterial({color:0xf1eee8,emissive:0x3b2a22,metalness:.18,roughness:.38});
    const headGeometry=new THREE.SphereGeometry(.28,28,28);
    Object.entries(positions).forEach(([name,point])=>{const mesh=new THREE.Mesh(name==="head"?headGeometry:jointGeometry,jointMaterial.clone());mesh.position.set(...point);mesh.userData.joint=name;scene.add(mesh);jointMeshes[name]=mesh});
    const bones=bonePairs.map(([from,to])=>{const mesh=new THREE.Mesh(new THREE.CylinderGeometry(.042,.055,1,10),new THREE.MeshStandardMaterial({color:0xff6736,emissive:0x4b1708,metalness:.35,roughness:.28}));mesh.userData.from=from;mesh.userData.to=to;scene.add(mesh);return mesh});
    const up=new THREE.Vector3(0,1,0);
    const updateBones=()=>{bones.forEach(mesh=>{const a=jointMeshes[mesh.userData.from].position;const b=jointMeshes[mesh.userData.to].position;const delta=new THREE.Vector3().subVectors(b,a);mesh.position.copy(a).add(b).multiplyScalar(.5);mesh.scale.set(1,delta.length(),1);mesh.quaternion.setFromUnitVectors(up,delta.clone().normalize())})};
    const reportPose=()=>{const value=Object.fromEntries(Object.entries(jointMeshes).map(([name,mesh])=>[name,[mesh.position.x,mesh.position.y,mesh.position.z] as Point])) as JointMap;onPoseChange?.(value)};
    const applyPose=(preset:PosePreset)=>{const pose=clonePose(neutralPose);Object.entries(presets[preset]).forEach(([name,point])=>{if(point)pose[name]=[...point] as Point});Object.entries(pose).forEach(([name,point])=>jointMeshes[name].position.set(...point));updateBones();reportPose()};
    updateBones();

    const raycaster=new THREE.Raycaster();const pointer=new THREE.Vector2();const dragPlane=new THREE.Plane();const hitPoint=new THREE.Vector3();let selected:THREE.Mesh|null=null;
    const setPointer=(event:PointerEvent)=>{const rect=renderer.domElement.getBoundingClientRect();pointer.x=((event.clientX-rect.left)/rect.width)*2-1;pointer.y=-((event.clientY-rect.top)/rect.height)*2+1;raycaster.setFromCamera(pointer,camera)};
    const onPointerDown=(event:PointerEvent)=>{setPointer(event);const hit=raycaster.intersectObjects(Object.values(jointMeshes),false)[0];if(!hit)return;selected=hit.object as THREE.Mesh;controls.enabled=false;renderer.domElement.setPointerCapture(event.pointerId);const normal=camera.getWorldDirection(new THREE.Vector3());dragPlane.setFromNormalAndCoplanarPoint(normal,selected.position);(selected.material as THREE.MeshStandardMaterial).color.set(0xff6b35);renderer.domElement.style.cursor="grabbing"};
    const onPointerMove=(event:PointerEvent)=>{if(!selected)return;setPointer(event);if(raycaster.ray.intersectPlane(dragPlane,hitPoint)){selected.position.set(THREE.MathUtils.clamp(hitPoint.x,-3.1,3.1),THREE.MathUtils.clamp(hitPoint.y,-2.25,3.7),THREE.MathUtils.clamp(hitPoint.z,-2.2,2.2));updateBones()}};
    const onPointerUp=(event:PointerEvent)=>{if(!selected)return;(selected.material as THREE.MeshStandardMaterial).color.set(0xf1eee8);selected=null;controls.enabled=true;renderer.domElement.style.cursor="grab";if(renderer.domElement.hasPointerCapture(event.pointerId))renderer.domElement.releasePointerCapture(event.pointerId);reportPose()};
    renderer.domElement.addEventListener("pointerdown",onPointerDown);renderer.domElement.addEventListener("pointermove",onPointerMove);renderer.domElement.addEventListener("pointerup",onPointerUp);renderer.domElement.addEventListener("pointercancel",onPointerUp);renderer.domElement.style.touchAction="none";renderer.domElement.style.cursor="grab";

    const resize=()=>{const width=Math.max(1,mount.clientWidth);const height=Math.max(1,mount.clientHeight);renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix()};resize();const observer=new ResizeObserver(resize);observer.observe(mount);
    let frame=0;const animate=()=>{frame=requestAnimationFrame(animate);controls.update();renderer.render(scene,camera)};animate();
    apiRef.current={
      capture:()=>{renderer.render(scene,camera);return renderer.domElement.toDataURL("image/png")},
      reset:()=>applyPose("neutral"),
      applyPreset,
      mirror:()=>{const snapshot=Object.fromEntries(Object.entries(jointMeshes).map(([name,mesh])=>[name,mesh.position.clone()]));Object.entries(jointMeshes).forEach(([name,mesh])=>{const paired=name.endsWith("L")?`${name.slice(0,-1)}R`:name.endsWith("R")?`${name.slice(0,-1)}L`:name;const source=snapshot[paired]||snapshot[name];mesh.position.set(-source.x,source.y,source.z)});updateBones();reportPose()},
    };
    return()=>{cancelAnimationFrame(frame);observer.disconnect();renderer.domElement.removeEventListener("pointerdown",onPointerDown);renderer.domElement.removeEventListener("pointermove",onPointerMove);renderer.domElement.removeEventListener("pointerup",onPointerUp);renderer.domElement.removeEventListener("pointercancel",onPointerUp);controls.dispose();jointGeometry.dispose();headGeometry.dispose();bones.forEach(mesh=>{mesh.geometry.dispose();(mesh.material as THREE.Material).dispose()});Object.values(jointMeshes).forEach(mesh=>(mesh.material as THREE.Material).dispose());renderer.dispose();renderer.domElement.remove()};
  },[onPoseChange]);

  return <div ref={mountRef} className="pose-rig-canvas" role="img" aria-label={ariaLabel}/>;
});

PoseRig.displayName="PoseRig";
export default PoseRig;
