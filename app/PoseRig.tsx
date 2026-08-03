"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { JOINT_NAMES, neutralPose, posePresets, type JointMap, type Point, type PoseGender, type PosePreset } from "./pose-presets";

export type PoseRigHandle={
  capture:()=>string;reset:()=>void;mirror:()=>void;applyPreset:(preset:PosePreset)=>void;
  applyJointMap:(pose:JointMap)=>void;setRealistic:(enabled:boolean)=>void;
  addPerson:(gender:PoseGender)=>void;removePerson:()=>void;selectPerson:(index:number)=>void;setBodyType:(gender:PoseGender)=>void;
};

type RigCharacter={
  gender:PoseGender;group:THREE.Group;joints:Record<string,THREE.Mesh>;bones:THREE.Mesh[];
  head:THREE.Mesh;torso:THREE.Mesh;pelvisBody:THREE.Mesh;hands:THREE.Mesh[];feet:THREE.Mesh[];
};

const bonePairs:[string,string][]=[
  ["head","neck"],["neck","chest"],["chest","pelvis"],
  ["neck","shoulderL"],["shoulderL","elbowL"],["elbowL","wristL"],
  ["neck","shoulderR"],["shoulderR","elbowR"],["elbowR","wristR"],
  ["pelvis","hipL"],["hipL","kneeL"],["kneeL","ankleL"],
  ["pelvis","hipR"],["hipR","kneeR"],["kneeR","ankleR"],
];
const parentByJoint:Record<string,string>={head:"neck",neck:"chest",chest:"pelvis",shoulderL:"neck",elbowL:"shoulderL",wristL:"elbowL",shoulderR:"neck",elbowR:"shoulderR",wristR:"elbowR",hipL:"pelvis",kneeL:"hipL",ankleL:"kneeL",hipR:"pelvis",kneeR:"hipR",ankleR:"kneeR"};
const childrenByJoint=Object.entries(parentByJoint).reduce<Record<string,string[]>>((result,[child,parent])=>{(result[parent]??=[]).push(child);return result},{});
const chainEnds:Record<string,[string,string,number]>={wristL:["shoulderL","elbowL",158],wristR:["shoulderR","elbowR",158],ankleL:["hipL","kneeL",152],ankleR:["hipR","kneeR",152]};
const middleJoints:Record<string,[string,number]>={elbowL:["wristL",158],elbowR:["wristR",158],kneeL:["ankleL",152],kneeR:["ankleR",152]};
const coneLimits:Record<string,number>={head:55,neck:42,chest:36};
const up=new THREE.Vector3(0,1,0);

function clonePose(pose:JointMap){return Object.fromEntries(Object.entries(pose).map(([key,value])=>[key,[...value] as Point])) as JointMap}
function restPose(gender:PoseGender){
  const result=clonePose(neutralPose);const shoulderScale=gender==="male"?1.12:.94;const hipScale=gender==="male"?.9:1.08;
  for(const name of JOINT_NAMES){if(/shoulder|elbow|wrist/.test(name))result[name][0]*=shoulderScale;if(/hip|knee|ankle/.test(name))result[name][0]*=hipScale}
  return result;
}

const PoseRig=forwardRef<PoseRigHandle,{ariaLabel:string;realistic:boolean;onPoseChange?:(pose:JointMap)=>void;onPeopleChange?:(people:PoseGender[],active:number)=>void}>(({ariaLabel,realistic,onPoseChange,onPeopleChange},ref)=>{
  const mountRef=useRef<HTMLDivElement>(null);const realisticRef=useRef(realistic);const onPoseChangeRef=useRef(onPoseChange);const onPeopleChangeRef=useRef(onPeopleChange);
  const apiRef=useRef<PoseRigHandle>({capture:()=>"",reset:()=>{},mirror:()=>{},applyPreset:()=>{},applyJointMap:()=>{},setRealistic:()=>{},addPerson:()=>{},removePerson:()=>{},selectPerson:()=>{},setBodyType:()=>{}});
  useEffect(()=>{realisticRef.current=realistic},[realistic]);useEffect(()=>{onPoseChangeRef.current=onPoseChange},[onPoseChange]);useEffect(()=>{onPeopleChangeRef.current=onPeopleChange},[onPeopleChange]);
  useImperativeHandle(ref,()=>({capture:()=>apiRef.current.capture(),reset:()=>apiRef.current.reset(),mirror:()=>apiRef.current.mirror(),applyPreset:value=>apiRef.current.applyPreset(value),applyJointMap:value=>apiRef.current.applyJointMap(value),setRealistic:value=>apiRef.current.setRealistic(value),addPerson:value=>apiRef.current.addPerson(value),removePerson:()=>apiRef.current.removePerson(),selectPerson:value=>apiRef.current.selectPerson(value),setBodyType:value=>apiRef.current.setBodyType(value)}),[]);

  useEffect(()=>{
    const mount=mountRef.current;if(!mount)return;
    const scene=new THREE.Scene();scene.background=new THREE.Color(0x10100f);scene.fog=new THREE.FogExp2(0x10100f,.038);
    const camera=new THREE.PerspectiveCamera(34,1,.1,100);camera.position.set(0,.7,10.6);
    const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true,powerPreference:"high-performance"});renderer.setPixelRatio(Math.min(window.devicePixelRatio,1.75));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;mount.appendChild(renderer.domElement);
    const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.target.set(0,.35,0);controls.minDistance=6;controls.maxDistance=19;controls.enablePan=false;
    scene.add(new THREE.HemisphereLight(0xffffff,0x30231e,2.5));const key=new THREE.DirectionalLight(0xfff4e9,4.2);key.position.set(4,7,5);key.castShadow=true;scene.add(key);const rim=new THREE.DirectionalLight(0xff6434,2.1);rim.position.set(-5,3,-4);scene.add(rim);
    const grid=new THREE.GridHelper(15,30,0x6b3b2d,0x262624);grid.position.y=-2.34;scene.add(grid);const floor=new THREE.Mesh(new THREE.CircleGeometry(5.4,80),new THREE.MeshStandardMaterial({color:0x171615,roughness:.85,metalness:.05}));floor.rotation.x=-Math.PI/2;floor.position.y=-2.35;floor.receiveShadow=true;scene.add(floor);

    const characters:RigCharacter[]=[];let activeIndex=0;
    const whiteMaterial=()=>new THREE.MeshStandardMaterial({color:0xf1eee8,roughness:.42,metalness:.05});
    const handleMaterial=()=>new THREE.MeshStandardMaterial({color:0xff6b35,emissive:0x46170b,roughness:.28,metalness:.25,transparent:true,opacity:.92});
    const setCylinder=(mesh:THREE.Mesh,a:THREE.Vector3,b:THREE.Vector3,radiusScale=1)=>{const delta=new THREE.Vector3().subVectors(b,a);mesh.position.copy(a).add(b).multiplyScalar(.5);mesh.scale.set(radiusScale,Math.max(.01,delta.length()),radiusScale);mesh.quaternion.setFromUnitVectors(up,delta.clone().normalize())};
    const activeRig=()=>characters[activeIndex];
    const notifyPeople=()=>onPeopleChangeRef.current?.(characters.map(item=>item.gender),activeIndex);
    const setActive=(index:number)=>{if(index<0||index>=characters.length)return;activeIndex=index;characters.forEach((rig,rigIndex)=>Object.values(rig.joints).forEach(mesh=>{const material=mesh.material as THREE.MeshStandardMaterial;material.color.set(rigIndex===index?0xff6b35:0xb6b2ad);material.opacity=rigIndex===index?.96:.36}));notifyPeople();reportPose()};
    const restFor=(rig:RigCharacter)=>restPose(rig.gender);
    const boneLength=(rig:RigCharacter,from:string,to:string)=>new THREE.Vector3(...restFor(rig)[to as keyof JointMap]).distanceTo(new THREE.Vector3(...restFor(rig)[from as keyof JointMap]));
    const reportPose=()=>{const rig=activeRig();if(!rig)return;onPoseChangeRef.current?.(Object.fromEntries(Object.entries(rig.joints).map(([name,mesh])=>[name,[mesh.position.x,mesh.position.y,mesh.position.z] as Point])) as JointMap)};
    const updateVisuals=(rig:RigCharacter)=>{
      rig.bones.forEach(mesh=>{const a=rig.joints[mesh.userData.from].position;const b=rig.joints[mesh.userData.to].position;setCylinder(mesh,a,b,1)});
      rig.head.position.copy(rig.joints.head.position).add(new THREE.Vector3(0,.05,0));rig.head.scale.set(rig.gender==="male"?1.02:.96,1.14,1);
      setCylinder(rig.torso,rig.joints.pelvis.position,rig.joints.neck.position,1);rig.torso.scale.x=rig.gender==="male"?1.08:.93;rig.torso.scale.z=rig.gender==="male"?1.02:.94;
      rig.pelvisBody.position.copy(rig.joints.pelvis.position).add(rig.joints.hipL.position).add(rig.joints.hipR.position).multiplyScalar(1/3);rig.pelvisBody.scale.set(rig.gender==="male"?.95:1.08,.62,.72);
      ["wristL","wristR"].forEach((name,index)=>rig.hands[index].position.copy(rig.joints[name].position));["ankleL","ankleR"].forEach((name,index)=>{rig.feet[index].position.copy(rig.joints[name].position).add(new THREE.Vector3(0,-.05,.13));rig.feet[index].rotation.x=-.08});
    };
    const layout=()=>{const spacing=2.65;characters.forEach((rig,index)=>rig.group.position.x=(index-(characters.length-1)/2)*spacing);camera.position.z=characters.length===1?10.6:12.2+characters.length*.8;controls.maxDistance=21;notifyPeople()};
    const createCharacter=(gender:PoseGender)=>{
      const group=new THREE.Group();scene.add(group);const joints:Record<string,THREE.Mesh>={};const pose=restPose(gender);
      for(const name of JOINT_NAMES){const mesh=new THREE.Mesh(new THREE.SphereGeometry(name==="head"?.115:.09,18,18),handleMaterial());mesh.position.set(...pose[name]);mesh.userData.joint=name;mesh.userData.rig=characters.length;mesh.renderOrder=4;group.add(mesh);joints[name]=mesh}
      const bones=bonePairs.map(([from,to])=>{const leg=/hip|knee|ankle/.test(from+to);const arm=/shoulder|elbow|wrist/.test(from+to);const radius=leg?.13:arm?.095:.12;const mesh=new THREE.Mesh(new THREE.CylinderGeometry(radius,radius*.92,1,18),whiteMaterial());mesh.userData.from=from;mesh.userData.to=to;mesh.castShadow=true;group.add(mesh);return mesh});
      const head=new THREE.Mesh(new THREE.SphereGeometry(.34,30,30),whiteMaterial());head.castShadow=true;group.add(head);
      const torso=new THREE.Mesh(new THREE.CylinderGeometry(.43,.32,1,24),whiteMaterial());torso.castShadow=true;group.add(torso);
      const pelvisBody=new THREE.Mesh(new THREE.SphereGeometry(.4,24,20),whiteMaterial());pelvisBody.castShadow=true;group.add(pelvisBody);
      const hands=[0,1].map(()=>{const mesh=new THREE.Mesh(new THREE.SphereGeometry(.13,18,18),whiteMaterial());mesh.scale.set(.72,1.18,.62);group.add(mesh);return mesh});
      const feet=[0,1].map(()=>{const mesh=new THREE.Mesh(new THREE.BoxGeometry(.22,.16,.5),whiteMaterial());group.add(mesh);return mesh});
      const rig={gender,group,joints,bones,head,torso,pelvisBody,hands,feet};characters.push(rig);updateVisuals(rig);layout();setActive(characters.length-1);return rig;
    };
    const preferredDirection=(rig:RigCharacter,name:string)=>{const rest=restFor(rig);const parent=parentByJoint[name];return new THREE.Vector3(...rest[name as keyof JointMap]).sub(new THREE.Vector3(...rest[parent as keyof JointMap])).normalize()};
    const limitDirection=(direction:THREE.Vector3,preferred:THREE.Vector3,maxDegrees:number)=>{const next=direction.clone().normalize(),base=preferred.clone().normalize(),max=THREE.MathUtils.degToRad(maxDegrees);if(base.angleTo(next)<=max)return next;let axis=base.clone().cross(next);if(axis.lengthSq()<1e-8)axis=base.clone().cross(Math.abs(base.y)<.9?new THREE.Vector3(0,1,0):new THREE.Vector3(1,0,0));return base.applyAxisAngle(axis.normalize(),max).normalize()};
    const project=(rig:RigCharacter,name:string,target:THREE.Vector3,limited=false)=>{const parent=parentByJoint[name],origin=rig.joints[parent].position;let direction=target.clone().sub(origin);if(direction.lengthSq()<1e-8)direction=preferredDirection(rig,name);if(limited&&coneLimits[name])direction=limitDirection(direction,preferredDirection(rig,name),coneLimits[name]);return origin.clone().add(direction.normalize().multiplyScalar(boneLength(rig,parent,name)))};
    const solveTwoBone=(rig:RigCharacter,rootName:string,middleName:string,endName:string,target:THREE.Vector3,maxBend:number,middleGuide?:THREE.Vector3)=>{const root=rig.joints[rootName].position,middle=rig.joints[middleName].position,upper=boneLength(rig,rootName,middleName),lower=boneLength(rig,middleName,endName);const axis=target.clone().sub(root);if(axis.lengthSq()<1e-8)axis.set(0,-1,0);axis.normalize();const minReach=Math.sqrt(Math.max(.0001,upper*upper+lower*lower+2*upper*lower*Math.cos(THREE.MathUtils.degToRad(maxBend))));const distance=THREE.MathUtils.clamp(target.distanceTo(root),minReach,upper+lower-.004);const end=root.clone().addScaledVector(axis,distance);let bend=(middleGuide||middle).clone().sub(root).addScaledVector(axis,-middle.clone().sub(root).dot(axis));if(bend.lengthSq()<1e-8){bend=axis.clone().cross(new THREE.Vector3(0,0,1));if(bend.lengthSq()<1e-8)bend=axis.clone().cross(new THREE.Vector3(0,1,0))}bend.normalize();const along=(upper*upper-lower*lower+distance*distance)/(2*distance),height=Math.sqrt(Math.max(0,upper*upper-along*along));rig.joints[middleName].position.copy(root).addScaledVector(axis,along).addScaledVector(bend,height);rig.joints[endName].position.copy(end)};
    const conformToTargets=(rig:RigCharacter,targets:Record<string,THREE.Vector3>)=>{rig.joints.pelvis.position.copy(targets.pelvis);for(const name of ["chest","neck","head","shoulderL","shoulderR","hipL","hipR"])rig.joints[name].position.copy(project(rig,name,targets[name],name==="chest"||name==="neck"||name==="head"));solveTwoBone(rig,"shoulderL","elbowL","wristL",targets.wristL,158,targets.elbowL);solveTwoBone(rig,"shoulderR","elbowR","wristR",targets.wristR,158,targets.elbowR);solveTwoBone(rig,"hipL","kneeL","ankleL",targets.ankleL,152,targets.kneeL);solveTwoBone(rig,"hipR","kneeR","ankleR",targets.ankleR,152,targets.kneeR);updateVisuals(rig);reportPose()};
    const currentTargets=(rig:RigCharacter)=>Object.fromEntries(Object.entries(rig.joints).map(([name,mesh])=>[name,mesh.position.clone()])) as Record<string,THREE.Vector3>;
    const applyPose=(rig:RigCharacter,preset:PosePreset)=>{const pose=restPose(rig.gender);Object.entries(posePresets[preset]).forEach(([name,point])=>{if(point)pose[name as keyof JointMap]=[...point] as Point});const targets=Object.fromEntries(Object.entries(pose).map(([name,point])=>[name,new THREE.Vector3(...point)]));conformToTargets(rig,targets)};
    const moveDescendants=(rig:RigCharacter,name:string,delta:THREE.Vector3)=>{for(const child of childrenByJoint[name]||[]){rig.joints[child].position.add(delta);moveDescendants(rig,child,delta)}};
    const realisticDrag=(rig:RigCharacter,name:string,target:THREE.Vector3)=>{if(name==="pelvis"){const next=new THREE.Vector3(THREE.MathUtils.clamp(target.x,-1.5,1.5),THREE.MathUtils.clamp(target.y,-.1,1.4),THREE.MathUtils.clamp(target.z,-1.3,1.3)),delta=next.clone().sub(rig.joints.pelvis.position);rig.joints.pelvis.position.add(delta);moveDescendants(rig,"pelvis",delta);return}const chain=chainEnds[name];if(chain){solveTwoBone(rig,chain[0],chain[1],name,target,chain[2]);return}const middle=middleJoints[name];if(middle){const previous=rig.joints[name].position.clone(),next=project(rig,name,target);rig.joints[name].position.copy(next);rig.joints[middle[0]].position.add(next.clone().sub(previous));return}const previous=rig.joints[name].position.clone(),next=project(rig,name,target,true);rig.joints[name].position.copy(next);moveDescendants(rig,name,next.clone().sub(previous))};
    const applyJointMap=(pose:JointMap)=>{const rig=activeRig();if(!rig||!JOINT_NAMES.every(name=>Array.isArray(pose[name])&&pose[name].length===3&&pose[name].every(Number.isFinite)))return;const source=Object.fromEntries(JOINT_NAMES.map(name=>[name,new THREE.Vector3(...pose[name])])) as Record<string,THREE.Vector3>;const ys=Object.values(source).map(point=>point.y),height=Math.max(...ys)-Math.min(...ys);if(height<.45)return;const scale=THREE.MathUtils.clamp(4.75/height,.75,4.4),pelvis=source.pelvis.clone();const targets=Object.fromEntries(JOINT_NAMES.map(name=>[name,source[name].clone().sub(pelvis).multiplyScalar(scale)])) as Record<string,THREE.Vector3>;const footY=Math.min(targets.ankleL.y,targets.ankleR.y);Object.values(targets).forEach(point=>point.y+=-2.05-footY);conformToTargets(rig,targets)};
    const mirror=()=>{const rig=activeRig();if(!rig)return;const snapshot=currentTargets(rig);for(const [name,mesh] of Object.entries(rig.joints)){const paired=name.endsWith("L")?`${name.slice(0,-1)}R`:name.endsWith("R")?`${name.slice(0,-1)}L`:name,source=snapshot[paired]||snapshot[name];mesh.position.set(-source.x,source.y,source.z)}conformToTargets(rig,currentTargets(rig))};
    const disposeGroup=(group:THREE.Group)=>{group.traverse(object=>{if(object instanceof THREE.Mesh){object.geometry.dispose();const materials=Array.isArray(object.material)?object.material:[object.material];materials.forEach(material=>material.dispose())}});scene.remove(group)};
    createCharacter("female");

    const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2(),dragPlane=new THREE.Plane(),hitPoint=new THREE.Vector3();let selected:THREE.Mesh|null=null,selectedRig:RigCharacter|null=null;
    const setPointer=(event:globalThis.PointerEvent)=>{const rect=renderer.domElement.getBoundingClientRect();pointer.x=((event.clientX-rect.left)/rect.width)*2-1;pointer.y=-((event.clientY-rect.top)/rect.height)*2+1;raycaster.setFromCamera(pointer,camera)};
    const onPointerDown=(event:globalThis.PointerEvent)=>{setPointer(event);const candidates=characters.flatMap(rig=>Object.values(rig.joints)),hit=raycaster.intersectObjects(candidates,false)[0];if(!hit)return;selected=hit.object as THREE.Mesh;const rigIndex=characters.findIndex(rig=>Object.values(rig.joints).includes(selected!));if(rigIndex<0)return;setActive(rigIndex);selectedRig=characters[rigIndex];controls.enabled=false;renderer.domElement.setPointerCapture(event.pointerId);const worldPoint=selected.getWorldPosition(new THREE.Vector3()),normal=camera.getWorldDirection(new THREE.Vector3());dragPlane.setFromNormalAndCoplanarPoint(normal,worldPoint);(selected.material as THREE.MeshStandardMaterial).emissive.set(0xff5a24);renderer.domElement.style.cursor="grabbing"};
    const onPointerMove=(event:globalThis.PointerEvent)=>{if(!selected||!selectedRig)return;setPointer(event);if(raycaster.ray.intersectPlane(dragPlane,hitPoint)){const local=selectedRig.group.worldToLocal(hitPoint.clone()),target=new THREE.Vector3(THREE.MathUtils.clamp(local.x,-3.2,3.2),THREE.MathUtils.clamp(local.y,-2.25,3.75),THREE.MathUtils.clamp(local.z,-2.3,2.3));if(realisticRef.current)realisticDrag(selectedRig,selected.userData.joint,target);else selected.position.copy(target);updateVisuals(selectedRig)}};
    const onPointerUp=(event:globalThis.PointerEvent)=>{if(!selected)return;(selected.material as THREE.MeshStandardMaterial).emissive.set(0x46170b);selected=null;selectedRig=null;controls.enabled=true;renderer.domElement.style.cursor="grab";if(renderer.domElement.hasPointerCapture(event.pointerId))renderer.domElement.releasePointerCapture(event.pointerId);reportPose()};
    renderer.domElement.addEventListener("pointerdown",onPointerDown);renderer.domElement.addEventListener("pointermove",onPointerMove);renderer.domElement.addEventListener("pointerup",onPointerUp);renderer.domElement.addEventListener("pointercancel",onPointerUp);renderer.domElement.style.touchAction="none";renderer.domElement.style.cursor="grab";
    const resize=()=>{const width=Math.max(1,mount.clientWidth),height=Math.max(1,mount.clientHeight);renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix()};resize();const observer=new ResizeObserver(resize);observer.observe(mount);
    let frame=0,stageVisible=true,pageVisible=document.visibilityState!=="hidden";const intersectionObserver=new IntersectionObserver(entries=>{stageVisible=entries[0]?.isIntersecting??true},{rootMargin:"100px"});intersectionObserver.observe(mount);const onVisibility=()=>{pageVisible=document.visibilityState!=="hidden"};document.addEventListener("visibilitychange",onVisibility);const animate=()=>{frame=requestAnimationFrame(animate);if(!stageVisible||!pageVisible)return;controls.update();renderer.render(scene,camera)};animate();
    apiRef.current={capture:()=>{renderer.render(scene,camera);return renderer.domElement.toDataURL("image/png")},reset:()=>{const rig=activeRig();if(rig)applyPose(rig,"neutral")},applyPreset:preset=>{const rig=activeRig();if(rig)applyPose(rig,preset)},applyJointMap,setRealistic:enabled=>{realisticRef.current=enabled;if(enabled){const rig=activeRig();if(rig)conformToTargets(rig,currentTargets(rig))}},mirror,addPerson:gender=>{if(characters.length<3)createCharacter(gender)},removePerson:()=>{if(characters.length<=1)return;disposeGroup(characters[activeIndex].group);characters.splice(activeIndex,1);characters.forEach((rig,index)=>Object.values(rig.joints).forEach(mesh=>mesh.userData.rig=index));activeIndex=Math.min(activeIndex,characters.length-1);layout();setActive(activeIndex)},selectPerson:setActive,setBodyType:gender=>{const rig=activeRig();if(!rig||rig.gender===gender)return;rig.gender=gender;applyPose(rig,"neutral");notifyPeople()}};
    return()=>{cancelAnimationFrame(frame);observer.disconnect();intersectionObserver.disconnect();document.removeEventListener("visibilitychange",onVisibility);renderer.domElement.removeEventListener("pointerdown",onPointerDown);renderer.domElement.removeEventListener("pointermove",onPointerMove);renderer.domElement.removeEventListener("pointerup",onPointerUp);renderer.domElement.removeEventListener("pointercancel",onPointerUp);controls.dispose();characters.forEach(rig=>disposeGroup(rig.group));renderer.dispose();renderer.domElement.remove()};
  },[]);
  return <div ref={mountRef} className="pose-rig-canvas" role="img" aria-label={ariaLabel}/>;
});

PoseRig.displayName="PoseRig";
export default PoseRig;
