'use strict';
const assert=require('assert');
const fs=require('fs');
const vm=require('vm');

const src=fs.readFileSync('experience-v12.js','utf8');
assert.doesNotThrow(()=>new Function(src));

class RNG{
  constructor(seed){this.s=(seed>>>0)||1;}
  next(){this.s=(Math.imul(this.s,1664525)+1013904223)>>>0;return this.s/4294967296;}
  range(a,b){return a+(b-a)*this.next();}
  int(a,b){return Math.floor(this.range(a,b+1));}
  pick(a){return a[Math.floor(this.next()*a.length)];}
}
function Game(){}
for(const n of ['startLevel','setCrowdCount','hitObstacle','updateBattle','showResult','beginFinish','updateFinish','update','drawEnvironment','drawCourse','drawFinishScene'])Game.prototype[n]=function(){};
const S={
  compose(){return new Float32Array(16)},
  COLORS:{white:[1,1,1],gold:[1,.72,.09],teal:[.16,.75,.67],red:[.93,.2,.25],blue:[.2,.55,.96]},
  clamp:(v,a,b)=>Math.max(a,Math.min(b,v)),
  lerp:(a,b,t)=>a+(b-a)*t,
  RNG,MAX_CROWD:999
};
const R={
  ACHIEVEMENTS:{},SKINS:[{id:'classic',unlock:1}],
  currentSkin:()=>({shirts:[[.2,.5,.9]]}),
  unlockedSkins:()=>[{id:'classic'}],
  unlockAchievement(){return true;}
};
const Q={
  PRESETS:{high:{id:'high',dpr:3},medium:{id:'medium',dpr:2.85},low:{id:'low',dpr:2.75}},
  preset:g=>Q.PRESETS[g?.q||'high'],
  ensure:g=>({avgFps:g?.fps||60})
};
global.SleepRoadSystems=S;
global.SleepRoadLevelDirector={};
global.SleepRoadProgressionV6=R;
global.SleepRoadQualityV6=Q;
global.SleepRoadExperienceV11={};
global.SleepRoadPolishV6={};
global.SleepRoad3D=Game;
global.document={getElementById:()=>({appendChild(){}}),createElement:()=>({className:'',innerHTML:'',classList:{add(){},remove(){}},querySelector:()=>({textContent:''})})};
global.localStorage={getItem(){return null},setItem(){}};
global.navigator={};

vm.runInThisContext(src,{filename:'experience-v12.js'});
const V=global.SleepRoadExperienceV12;
assert(V);

let rare=0;
for(let level=1;level<=10000;level++)if(V.rareEventFor(level))rare++;
const rareRate=rare/10000;
assert(rareRate>.33&&rareRate<.37,'rare event distribution should stay around 35%');
assert(src.includes(">=.35)return null"),'rare threshold must remain 35%');

assert.equal(V.comboCount(5),0);
assert.equal(V.comboCount(6),1);
assert.equal(V.comboCount(18),2);
assert.equal(V.comboCount(36),3);

const fake={
  level:24,levelLength:330,objects:[],profile:{intensity:1.1},q:'high',fps:60,
  makeObstacle(rng,d,diff,kind,opts){return{type:'obstacle',kind,distance:d,processed:false,...opts};}
};
V.installObstacleCombos(fake,0);
assert.equal(fake.objects.filter(o=>o.v12Combo).length,4,'level 24 should get two safe two-part combos');
V.installRoadEvents(fake);
assert(fake.objects.some(o=>o.type==='v12Event'));

for(const token of [
  'spawnDebris','debrisPool','updateDebris',
  'WEATHER_PHASES','spawnWeather','updateWeather',
  'collapseBridge','crossingTrain','blackoutTunnel','stormGate',
  'finishPhase','updateFinishSequence','drawFinishV12',
  'boss10','noHit5','crowd250','dodge20','allSkins','rare3',
  'v12Weather','v12Debris','budgetFor','achievementProgress','triggerRoadEvent','v12Triggered'
])assert(src.includes(token),token);

assert.deepEqual([Q.PRESETS.high.dpr,Q.PRESETS.medium.dpr,Q.PRESETS.low.dpr],[3,2.85,2.75],'v12 must preserve Retina DPR');

const index=fs.readFileSync('index.html','utf8');
assert(index.includes('experience-v12.css'));
assert(index.includes('experience-v12.js'));
assert(index.indexOf('experience-v12.js')>index.indexOf('experience-v11.js'));
assert(index.indexOf('experience-v12.js')<index.indexOf('boot-v4.js'));

const sw=fs.readFileSync('sw.js','utf8');
assert(sw.includes("const CACHE='sleep-road-v53';"));
assert(sw.includes("'./experience-v12.css'"));
assert(sw.includes("'./experience-v12.js'"));

assert(src.includes("navigator.vibrate?.(18)"));
assert(!src.includes("x=side*7.8,drop=.9+Math.abs(Math.sin(t*.68))*3.0"));
assert(!src.includes("x-side*2.8,drop,z-.4"));

assert(src.includes("window.SleepRoadExperienceV12={"));


assert(!src.includes("'craneDrop','blackoutTunnel'"),'craneDrop must not be generated as a road event');
assert(src.includes("if(o.kind==='craneDrop')return"),'legacy craneDrop events must be silently disabled');
assert(!src.includes("containerX=side*7.75"),'foreground crane container geometry must be removed');
assert(!src.includes("armCenter=x-side*1.55"),'foreground crane boom geometry must be removed');
console.log('PASS: Experience v12 combos, events, destruction, weather, finish, 35% rare runs, achievements and performance');
