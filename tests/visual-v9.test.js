'use strict';
const assert=require('assert');
const fs=require('fs');
const vm=require('vm');

global.window=global;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),lerp=(a,b,t)=>a+(b-a)*t;
const dummy=()=>({style:{setProperty(){}},classList:{add(){},remove(){},toggle(){},contains(){return false}},appendChild(){},querySelector(){return null},addEventListener(){},textContent:''});
const hud=dummy(),wallet=dummy(),sound=dummy();
global.document={querySelector:s=>s==='.hud-wallet'?wallet:null,createElement:()=>dummy()};
class CrowdBatch{
  metrics(){return{depth:4,cols:4}}
  formation(n){return Array.from({length:n},(_,i)=>({x:0,z:i*.4,index:i}))}
}
function Game(){}
for(const n of ['drawEnvironment','drawObstacle','render','spawnKnockouts','drawFinishScene'])Game.prototype[n]=function(){};
global.SleepRoadSystems={
  compose(){return new Float32Array(16)},
  COLORS:{white:[1,1,1],blue:[.2,.5,1],navy:[.08,.1,.2],gold:[1,.72,.09]},
  clamp,lerp,DEG:Math.PI/180,
  isGoodGate:o=>o.op==='add'||o.op==='mul',
  gateLabel:o=>o.op==='mul'?'×'+o.value:o.op==='add'?'+':o.op,
  UI:{hud,soundBtn:sound},
  CrowdBatch
};
global.Mini3D={multiply(){return new Float32Array(16)}};
const PRESETS={
 high:{id:'high',maxCrowd:420,characterDetail:160,propDetail:1,weatherDensity:1,finishCrowd:18},
 medium:{id:'medium',maxCrowd:310,characterDetail:96,propDetail:.72,weatherDensity:.66,finishCrowd:12},
 low:{id:'low',maxCrowd:220,characterDetail:48,propDetail:.42,weatherDensity:.36,finishCrowd:8}
};
global.SleepRoadQualityV6={PRESETS,preset:()=>PRESETS.high};
global.SleepRoad3D=Game;
global.SleepRoadAnimationV5={jumpArc:()=>({y:0})};

vm.runInThisContext(fs.readFileSync('visual-v9.js','utf8'),{filename:'visual-v9.js'});
const V=global.SleepRoadVisualV9;
assert(V);
assert(V.APPEARANCES.length>=8);
assert.equal(V.TORSO_STYLES.length,3);
assert.deepEqual(V.TORSO_STYLES.map(x=>x.id),['tee','hoodie','tank']);
assert.equal(V.BOSS_THEMES.length,5);
assert.deepEqual(Object.keys(V.WEATHER).sort(),['city','desert','factory','meadow','neon']);
assert.equal(V.WEATHER.meadow,'pollen');
assert.equal(V.WEATHER.city,'rain');
assert.equal(V.roadsideCullDistance,5.2);
assert.deepEqual(V.crowdOffset(17),V.crowdOffset(17));
const off=V.crowdOffset(17);assert(Math.abs(off.x)<=.071&&Math.abs(off.z)<=.051);
const vivid=[.08,.67,.91],soft=V.softenShirt(vivid);assert(Math.max(...soft)-Math.min(...soft)<Math.max(...vivid)-Math.min(...vivid));

const high=V.roadDetailCount({},20);
global.SleepRoadQualityV6.preset=()=>PRESETS.low;
const low=V.roadDetailCount({},20);
assert(high>low);

global.SleepRoadQualityV6.preset=()=>PRESETS.high;
const cs=V.cameraState({w:390,h:844,crowdBatch:new CrowdBatch(),visualCount:50,baseSpeed:10,speed:10,jumpTimer:0,__jumpAnimDuration:2.35,boostTimer:0,slowTimer:0});
assert.equal(cs.mobile,true);
assert(cs.pullback>=0&&cs.pullback<=11);

const qsrc=fs.readFileSync('quality-v6.js','utf8');
const esrc=fs.readFileSync('environment-v8.js','utf8');
assert(esrc.includes("far=z<-66||Math.abs(x)>25"));
const vsrc=fs.readFileSync('visual-v9.js','utf8');
for(const token of ['dangerPad','safePad','warningBeacon','nearDecals','massSway','groupHalfWidth'])assert(vsrc.includes(token));
for(const token of ["o.kind==='saw'","o.kind==='mines'","o.kind==='spikes'","o.kind==='hammer'","o.kind==='laser'","o.kind==='crusher'","o.kind==='movingWall'","drawBossArena","drawWeather","finishSpectator","drawGatePanel"])assert(vsrc.includes(token));
for(const token of ['characterDetail:160','propDetail:1','weatherDensity:1','finishCrowd:18','characterDetail:48'])assert(qsrc.includes(token));
const csrc=fs.readFileSync('visual-v9.css','utf8');
assert(csrc.includes('.toast{bottom:36%'));
for(const file of ['visual-v9.js','quality-v6.js'])assert.doesNotThrow(()=>new Function(fs.readFileSync(file,'utf8')));
console.log('PASS: visual v9.1 crowd spacing, torsos, shadows, obstacle readability, road detail and UI');
