'use strict';
const assert=require('assert');
const fs=require('fs');
const vm=require('vm');

global.window=global;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),lerp=(a,b,t)=>a+(b-a)*t;
const dummy=()=>({style:{setProperty(){}},classList:{add(){},remove(){},toggle(){},contains(){return false}},appendChild(){},querySelector(){return null},addEventListener(){},textContent:''});
class CrowdBatch{metrics(){return{depth:4,cols:4,spacing:.6}} formation(n){return Array.from({length:n},(_,i)=>({x:0,z:i*.4,index:i}))}}
function Game(){}
for(const n of ['drawEnvironment','drawObstacle','render','spawnKnockouts','drawFinishScene'])Game.prototype[n]=function(){};

global.SleepRoadSystems={
  compose(){return new Float32Array(16)},
  COLORS:{white:[1,1,1],blue:[.2,.5,1],navy:[.08,.1,.2],gold:[1,.72,.09]},
  clamp,lerp,DEG:Math.PI/180,
  isGoodGate:o=>o.op==='add'||o.op==='mul',
  gateLabel:o=>o.op==='mul'?'×'+o.value:o.op==='add'?'+':o.op,
  UI:{hud:dummy(),soundBtn:dummy()},
  CrowdBatch
};
global.Mini3D={multiply(){return new Float32Array(16)}};
global.SleepRoadQualityV6={PRESETS:{high:{maxCrowd:420,characterDetail:200,propDetail:1,weatherDensity:1,finishCrowd:20}},preset:()=>({maxCrowd:420,characterDetail:200,propDetail:1,weatherDensity:1,finishCrowd:20})};
global.SleepRoad3D=Game;
global.SleepRoadAnimationV5={jumpArc:()=>({y:0})};
global.document={querySelector:()=>null,createElement:()=>dummy()};

vm.runInThisContext(fs.readFileSync('visual-v9.js','utf8'),{filename:'visual-v9.js'});
const V=global.SleepRoadVisualV9;
assert(V&&typeof V.bossStrikePose==='function');

const idle=V.bossStrikePose(.02,1);
const wind=V.bossStrikePose(.29,1);
const hit=V.bossStrikePose(.47,1);
const hold=V.bossStrikePose(.50,1);
const recover=V.bossStrikePose(.90,1);
assert(wind.armR>idle.armR,'right arm must wind back');
assert(hit.armR<-1.4,'right punch must extend strongly');
assert(hit.bodyLean>.25,'boss must lean into strike');
assert(hit.impact>.5,'impact phase must peak near strike');
assert(recover.armR>hit.armR,'arm must recover toward idle');

const left=V.bossStrikePose(.47,-1);
assert(left.armL<-1.4,'left punch must alternate');
assert(left.armR>-1,'guard arm must stay back');

const anim=fs.readFileSync('animation-v5.js','utf8');
for(const token of ['bossAttackActive:bossBattle','bossAttackPhase','bossAttackSide','cycle=18'])assert(anim.includes(token),token);

const polish=fs.readFileSync('polish-v6.js','utf8');
assert(polish.includes('tick%18===8'));
assert(!polish.includes('tick%3===0&&tick!==ensure(this).bossAttackTick'));

for(const file of ['animation-v5.js','polish-v6.js','visual-v9.js'])assert.doesNotThrow(()=>new Function(fs.readFileSync(file,'utf8')),file);
console.log('PASS: boss punch v10 windup, alternating strike, impact sync and recovery');
