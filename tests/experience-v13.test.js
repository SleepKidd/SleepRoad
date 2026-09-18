'use strict';
const assert=require('assert');
const fs=require('fs');
const vm=require('vm');

const src=fs.readFileSync('experience-v13.js','utf8');
const v12src=fs.readFileSync('experience-v12.js','utf8');
assert.doesNotThrow(()=>new Function(src));

class RNG{
  constructor(seed){this.s=(seed>>>0)||1;}
  next(){this.s=(Math.imul(this.s,1664525)+1013904223)>>>0;return this.s/4294967296;}
  range(a,b){return a+(b-a)*this.next();}
  int(a,b){return Math.floor(this.range(a,b+1));}
  pick(a){return a[Math.floor(this.next()*a.length)];}
}
class CrowdBatch{formation(n){return Array.from({length:n},(_,i)=>({x:i%3,z:Math.floor(i/3),index:i}))}metrics(){return{depth:4}}draw(){return[]}}
function Game(){}
for(const n of ['hitObstacle','applyGate','collectJump','beginBattle','updateBattle','drawEnemy','drawObstacle','startLevel','update','drawEnvironment','drawCourse','drawFinishScene','drawKnockouts','setCamera','render'])Game.prototype[n]=function(){};

const S={
  compose(){const a=new Float32Array(16);a[15]=1;return a;},
  COLORS:{white:[1,1,1],gold:[1,.72,.09],red:[.93,.2,.25],road:[.34,.37,.44],roadEdge:[.9,.92,.96],roadStripe:[.92,.92,.82]},
  clamp:(v,a,b)=>Math.max(a,Math.min(b,v)),
  lerp:(a,b,t)=>a+(b-a)*t,
  RNG,MAX_CROWD:999,
  isGoodGate:o=>o&&(['add','mul'].includes(o.op)),
  CrowdBatch
};
const Q={PRESETS:{high:{id:'high'},medium:{id:'medium'},low:{id:'low'}},preset:()=>Q.PRESETS.high};
const V11={BOSS_VARIANTS:[
  {main:[.2,.7,.44]},{main:[.76,.28,.12]},{main:[.43,.25,.14]},{main:[.1,.32,.58]},{main:[.46,.12,.55]}
]};
const V12={};
global.window=global;
global.SleepRoadSystems=S;
global.SleepRoadLevelDirector={};
global.SleepRoadProgressionV6={};
global.SleepRoadQualityV6=Q;
global.SleepRoadExperienceV11=V11;
global.SleepRoadExperienceV12=V12;
global.SleepRoad3D=Game;
global.navigator={};

vm.runInThisContext(src,{filename:'experience-v13.js'});
const V=global.SleepRoadExperienceV13;
assert(V);

assert.deepEqual(V.SETPIECES,['trainCrossing','collapseBridge','giantDoors','tunnelRun','industrialLift','rainChase']);
assert.deepEqual(V.V13_RARE_IDS,['doubleBoss','nightRun','noGates','moonStorm','giantObstacles','lowGravity']);

const regular={count:49,maxCount:100,majorBoss:false};
assert.equal(V.phaseFor(regular),2);
regular.count=24;
assert.equal(V.phaseFor(regular),2,'regular boss has no phase 3');
const major={count:24,maxCount:100,majorBoss:true};
assert.equal(V.phaseFor(major),3);
assert.equal(V.bossSpeed({v13Phase:1}),1);
assert.equal(V.bossSpeed({v13Phase:2}),1.12);
assert.equal(V.bossSpeed({v13Phase:3}),1.24);
assert(src.includes("oldBattle.call(this,dt);"),'boss rage must not accelerate player DPS simulation');
assert(!src.includes("oldBattle.call(this,e?.boss?dt*bossSpeed(e):dt)"));

const g={level:30,playerCount:160,v13:null};
const e={count:80,maxCount:100,majorBoss:false,v13Phase:1,v13LastAttack:'sweep'};
const atk=V.chooseBossAttack(g,e,2);
assert(['slam','stomp','punch'].includes(atk),'large crowd should bias heavy boss attacks');

const eg={level:28,v13:null};
const h1=V.elevationAt(eg,40),h2=V.elevationAt(eg,80);
assert(Number.isFinite(h1)&&Number.isFinite(h2)&&h1>.1&&h2>.1);
assert.notEqual(h1,h2,'road elevation should vary with course distance');

assert.equal(V.breakThreshold({}),150);
assert.equal(V.breakThreshold({v13Giant:true}),185);
assert(V.DESTRUCTIBLE.has('barrier'));
assert(V.DESTRUCTIBLE.has('poles'));

for(const token of [
  'nearestGatePressure','c.squeeze','c.stretch','c.shock',
  'startBossDeath','cracks:Array.from','drawDeath',
  'drawElevationRoad','withElevation','elevationAt',
  'drawSetpiece','trainCrossing','collapseBridge','giantDoors','tunnelRun','industrialLift','rainChase',
  'drawLivingWorld',
  'ПРОЛОМИЛИ ПРЕПЯТСТВИЕ',
  'drawFakeReflections','wetReflectionEnabled',
  "rare.id==='doubleBoss'","rare.id==='nightRun'","rare.id==='noGates'","rare.id==='moonStorm'","rare.id==='giantObstacles'","rare.id==='lowGravity'",
  'boss.distance-13',
  'BOSS PHASE 2','BOSS RAGE · PHASE 3'
])assert(src.includes(token),token);

for(const id of ['doubleBoss','nightRun','noGates','moonStorm','giantObstacles','lowGravity'])assert(v12src.includes("id:'"+id+"'"),id);
assert(v12src.includes(">=.35)return null"),'Rare Run total probability must stay at 35%');
let rareCount=0;for(let level=1;level<=10000;level++){const h=n=>{const x=Math.sin(n*83.173+29.411)*43758.5453123;return x-Math.floor(x);};if(h(level*47.119+3.7)<.35)rareCount++;}
const rareRate=rareCount/10000;assert(rareRate>.33&&rareRate<.37,'Rare Run v2 must remain around 35%');

const index=fs.readFileSync('index.html','utf8');
assert(index.includes('experience-v13.js'));
assert(index.indexOf('experience-v13.js')>index.indexOf('experience-v12.js'));
assert(index.indexOf('experience-v13.js')<index.indexOf('boot-v4.js'));

const audio=fs.readFileSync('audio-v6.js','utf8');
assert(audio.includes("bossPhase=1"));
assert(audio.includes("phase>=3?.48:phase>=2?.58:.72"));
assert(audio.includes("this.battleEnemy.v13Phase||1"));
const anim=fs.readFileSync('animation-v5.js','utf8');assert(anim.includes("cycle=o.v13Phase>=3?13:o.v13Phase>=2?15:18"));
const polish=fs.readFileSync('polish-v6.js','utf8');assert(polish.includes("cycle=e.v13Phase>=3?13:e.v13Phase>=2?15:18"));
const v11=fs.readFileSync('experience-v11.js','utf8');assert(v11.includes("attackCycle=e.v13Phase>=3?13:e.v13Phase>=2?15:18"));

const sw=fs.readFileSync('sw.js','utf8');
assert(sw.includes("const CACHE='sleep-road-v32';"));
assert(sw.includes("'./experience-v13.js'"));

console.log('PASS: Experience v13 boss AI/phases/death, crowd feel, elevation, setpieces, living world, destruction, reflections and Rare Run v2');
