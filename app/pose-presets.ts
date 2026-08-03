export const JOINT_NAMES=["head","neck","chest","pelvis","shoulderL","elbowL","wristL","shoulderR","elbowR","wristR","hipL","kneeL","ankleL","hipR","kneeR","ankleR"] as const;

export type JointName=typeof JOINT_NAMES[number];
export type Point=[number,number,number];
export type JointMap=Record<JointName,Point>;
export type PoseGender="female"|"male";
export type PoseCategory="standing"|"action"|"seated"|"stretch";
export type PosePresetBase="relaxed"|"contrapposto"|"handsHips"|"sprint"|"jump"|"guard"|"chair"|"crossLegged"|"leanForward"|"overhead"|"sideBend"|"lunge";
export type PosePreset="neutral"|`${PoseGender}-${PosePresetBase}`;

export type PosePresetDefinition={id:Exclude<PosePreset,"neutral">;gender:PoseGender;category:PoseCategory;labelKey:string;index:number};

export const neutralPose:JointMap={
  head:[0,2.85,0],neck:[0,2.25,0],chest:[0,1.55,0],pelvis:[0,.55,0],
  shoulderL:[-.72,2.02,0],elbowL:[-1.15,1.18,.05],wristL:[-1.25,.28,.12],
  shoulderR:[.72,2.02,0],elbowR:[1.15,1.18,.05],wristR:[1.25,.28,.12],
  hipL:[-.42,.48,0],kneeL:[-.48,-.78,.08],ankleL:[-.5,-2.05,.05],
  hipR:[.42,.48,0],kneeR:[.48,-.78,.08],ankleR:[.5,-2.05,.05],
};

const basePresets:Record<PosePresetBase,Partial<JointMap>>={
  relaxed:{head:[.04,2.84,.03],neck:[0,2.24,0],chest:[.03,1.54,.02],pelvis:[-.03,.54,0],elbowL:[-1.08,1.18,.12],wristL:[-1.15,.34,.18],elbowR:[1.12,1.25,-.03],wristR:[1.2,.4,.06],kneeL:[-.54,-.77,.11],ankleL:[-.58,-2.04,.07]},
  contrapposto:{head:[.13,2.82,.04],neck:[.05,2.22,.02],chest:[-.02,1.52,.03],pelvis:[.13,.52,0],shoulderL:[-.7,2.08,.02],shoulderR:[.76,1.96,-.02],elbowL:[-1.1,1.22,.16],wristL:[-1.04,.35,.22],elbowR:[1.1,1.12,.06],wristR:[1.23,.28,.12],hipL:[-.29,.5,.02],kneeL:[-.48,-.74,.2],ankleL:[-.7,-1.95,.16],hipR:[.55,.45,-.02],kneeR:[.52,-.83,-.05],ankleR:[.5,-2.06,-.02]},
  handsHips:{head:[0,2.86,.03],chest:[0,1.58,.04],shoulderL:[-.76,2.05,.03],elbowL:[-1.42,1.48,.15],wristL:[-.58,.62,.28],shoulderR:[.76,2.05,.03],elbowR:[1.42,1.48,.15],wristR:[.58,.62,.28],kneeL:[-.56,-.75,.05],ankleL:[-.68,-2.03,.03],kneeR:[.56,-.75,.05],ankleR:[.68,-2.03,.03]},
  sprint:{head:[-.1,2.82,.08],neck:[0,2.23,0],chest:[.08,1.5,.04],pelvis:[-.12,.52,0],shoulderL:[-.7,1.98,.1],elbowL:[-1.48,1.62,.25],wristL:[-1.82,.92,.35],shoulderR:[.78,2.02,-.05],elbowR:[1.2,1.12,-.5],wristR:[.62,.62,-.65],hipL:[-.45,.45,.06],kneeL:[-.95,-.55,.5],ankleL:[-1.42,-1.55,.6],hipR:[.38,.47,-.02],kneeR:[.64,-.82,-.32],ankleR:[.82,-2.02,-.12]},
  jump:{head:[0,3.18,.06],neck:[0,2.58,0],chest:[0,1.88,.02],pelvis:[0,.92,0],shoulderL:[-.72,2.38,.02],elbowL:[-1.12,2.95,.12],wristL:[-.7,3.62,.2],shoulderR:[.72,2.38,.02],elbowR:[1.12,2.95,.12],wristR:[.7,3.62,.2],hipL:[-.4,.85,0],kneeL:[-.9,-.05,.45],ankleL:[-1.2,-.95,.75],hipR:[.4,.85,0],kneeR:[.9,-.05,.45],ankleR:[1.2,-.95,.75]},
  guard:{head:[0,2.78,.12],neck:[0,2.2,.04],chest:[0,1.5,.08],pelvis:[0,.48,0],shoulderL:[-.74,1.98,.08],elbowL:[-1.18,1.65,.55],wristL:[-.62,1.55,.92],shoulderR:[.74,1.98,.08],elbowR:[1.18,1.65,.55],wristR:[.62,1.55,.92],hipL:[-.48,.42,.04],kneeL:[-.9,-.65,.38],ankleL:[-1.15,-1.82,.25],hipR:[.48,.42,.04],kneeR:[.9,-.65,.38],ankleR:[1.15,-1.82,.25]},
  chair:{head:[0,2.2,.08],neck:[0,1.68,0],chest:[0,1.02,0],pelvis:[0,.05,0],shoulderL:[-.68,1.48,0],elbowL:[-.92,.67,.42],wristL:[-.48,.1,.72],shoulderR:[.68,1.48,0],elbowR:[.92,.67,.42],wristR:[.48,.1,.72],hipL:[-.4,0,0],kneeL:[-.55,-.85,.95],ankleL:[-.58,-1.85,.88],hipR:[.4,0,0],kneeR:[.55,-.85,.95],ankleR:[.58,-1.85,.88]},
  crossLegged:{head:[0,2.12,.1],neck:[0,1.52,.04],chest:[0,.84,.06],pelvis:[0,-.12,0],shoulderL:[-.68,1.3,.04],elbowL:[-1.0,.56,.38],wristL:[-.48,.08,.78],shoulderR:[.68,1.3,.04],elbowR:[1.0,.56,.38],wristR:[.48,.08,.78],hipL:[-.42,-.18,0],kneeL:[-1.25,-.72,.58],ankleL:[.2,-1.05,.78],hipR:[.42,-.18,0],kneeR:[1.25,-.72,.58],ankleR:[-.2,-1.05,.78]},
  leanForward:{head:[0,1.92,.72],neck:[0,1.44,.4],chest:[0,.92,.18],pelvis:[0,.02,0],shoulderL:[-.67,1.3,.42],elbowL:[-.82,.45,.82],wristL:[-.53,-.45,.9],shoulderR:[.67,1.3,.42],elbowR:[.82,.45,.82],wristR:[.53,-.45,.9],hipL:[-.4,0,0],kneeL:[-.58,-.9,.92],ankleL:[-.62,-1.88,.84],hipR:[.4,0,0],kneeR:[.58,-.9,.92],ankleR:[.62,-1.88,.84]},
  overhead:{head:[.05,2.84,.04],neck:[0,2.24,0],chest:[0,1.54,0],pelvis:[0,.54,0],shoulderL:[-.7,2.04,0],elbowL:[-.95,2.78,.08],wristL:[-.55,3.5,.14],shoulderR:[.7,2.04,0],elbowR:[.95,2.78,.08],wristR:[.55,3.5,.14],kneeL:[-.5,-.76,.04],ankleL:[-.55,-2.04,.02],kneeR:[.5,-.76,.04],ankleR:[.55,-2.04,.02]},
  sideBend:{head:[-.34,2.72,.04],neck:[-.22,2.16,0],chest:[-.1,1.48,0],pelvis:[.08,.52,0],shoulderL:[-.85,1.9,0],elbowL:[-1.28,1.15,.1],wristL:[-1.25,.32,.12],shoulderR:[.52,2.06,0],elbowR:[.38,2.88,.08],wristR:[-.18,3.48,.16],hipL:[-.34,.47,0],kneeL:[-.48,-.78,.08],ankleL:[-.55,-2.04,.04],hipR:[.5,.47,0],kneeR:[.54,-.78,.08],ankleR:[.58,-2.04,.04]},
  lunge:{head:[.02,2.78,.08],neck:[0,2.2,.02],chest:[0,1.5,.04],pelvis:[0,.46,0],shoulderL:[-.72,1.98,.04],elbowL:[-1.38,2.0,.08],wristL:[-2.08,1.98,.1],shoulderR:[.72,1.98,.04],elbowR:[1.38,2.0,.08],wristR:[2.08,1.98,.1],hipL:[-.42,.4,.02],kneeL:[-1.12,-.35,.62],ankleL:[-1.5,-1.18,.52],hipR:[.42,.4,-.02],kneeR:[.62,-.86,-.38],ankleR:[.72,-2.02,-.22]},
};

const categories:Record<PoseCategory,PosePresetBase[]>={standing:["relaxed","contrapposto","handsHips"],action:["sprint","jump","guard"],seated:["chair","crossLegged","leanForward"],stretch:["overhead","sideBend","lunge"]};
const labelKeys:Record<PosePresetBase,string>={relaxed:"poseSubRelaxed",contrapposto:"poseSubContrapposto",handsHips:"poseSubHandsHips",sprint:"poseSubSprint",jump:"poseSubJump",guard:"poseSubGuard",chair:"poseSubChair",crossLegged:"poseSubCrossLegged",leanForward:"poseSubLeanForward",overhead:"poseSubOverhead",sideBend:"poseSubSideBend",lunge:"poseSubLunge"};

function genderizedPose(base:PosePresetBase,gender:PoseGender){
  const source={...neutralPose,...basePresets[base]} as JointMap;const upperScale=gender==="male"?1.08:.96;const lowerScale=gender==="male"?.96:1.06;
  return Object.fromEntries(JOINT_NAMES.map(name=>{const point=[...source[name]] as Point;const scale=name.includes("shoulder")||name.includes("elbow")||name.includes("wrist")?upperScale:name.includes("hip")||name.includes("knee")||name.includes("ankle")?lowerScale:1;point[0]*=scale;return[name,point]})) as JointMap;
}

export const POSE_PRESET_LIBRARY:PosePresetDefinition[]=(Object.entries(categories) as [PoseCategory,PosePresetBase[]][]).flatMap(([category,bases])=>["female","male"].flatMap(gender=>bases.map((base,index)=>({id:`${gender}-${base}` as Exclude<PosePreset,"neutral">,gender:gender as PoseGender,category,labelKey:labelKeys[base],index:index+1}))));

export const posePresets:Record<PosePreset,Partial<JointMap>>={neutral:neutralPose,...Object.fromEntries(POSE_PRESET_LIBRARY.map(item=>[item.id,genderizedPose(item.id.split("-")[1] as PosePresetBase,item.gender)]))} as Record<PosePreset,Partial<JointMap>>;
