'use strict';
const assert=require('assert'),fs=require('fs'),vm=require('vm');
const render=fs.readFileSync('render-levels-v5.js','utf8');
assert.doesNotThrow(()=>new Function(render));
for(const name of ['drawBladePair','drawSlamGate','drawSlalom','drawShockwave'])assert(render.includes('P.'+name+'=function'),name);
for(const kind of ['bladePair','slamGate','slalom','shockwave'])assert(render.includes("o.kind==='"+kind+"'"),kind);
const baseRender=fs.readFileSync('render-v4.js','utf8');
assert.doesNotThrow(()=>new Function(baseRender));
assert(baseRender.includes('spin=this.time*9.5'),'single saw visual spin should be faster');
assert(render.includes('spin=this.time*(i?10.2:-11.0)'),'blade pair visual spin should be faster');
assert(baseRender.includes('Recessed steel rail'),'single saw should use the mechanical steel visual');
assert(baseRender.includes('STEEL=[.58,.62,.67]'));
assert(render.includes('STEEL=[.58,.62,.67]'));

global.window=global;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
class RNG{constructor(seed){this.s=(seed>>>0)||1;}next(){this.s=(Math.imul(this.s,1664525)+1013904223)>>>0;return this.s/4294967296;}range(a,b){return a+(b-a)*this.next();}int(a,b){return Math.floor(this.range(a,b+1));}pick(a){return a[Math.floor(this.next()*a.length)];}}
class CrowdBatch{formation(){return[{x:0,z:0,index:0}]}}
const el=()=>({textContent:'',style:{},classList:{add(){},remove(){},toggle(){}}});
window.SleepRoadSystems={UI:{menuMissionText:el(),menuMissionReward:el(),missionHudText:el(),missionFill:el(),shieldHud:el(),progressFill:el(),moonValue:el(),hud:el(),result:el(),resultBanner:el(),resultKicker:el(),resultTitle:el(),resultCount:el(),resultMoons:el(),resultMultiplier:el(),resultReward:el(),resultMission:el(),nextBtn:el(),retryBtn:el()},MAX_CROWD:999,clamp,lerp:(a,b,t)=>a+(b-a)*t,TAU:Math.PI*2,RNG,CrowdBatch,applyGateValue:c=>c,finishStepForCount:()=>1,finishMultiplierForStep:()=>1,finishBaseReward:()=>1,finishReward:()=>1,gateLabel:()=>'+1'};
function Game(){}
for(const n of ['startLevel','returnToMenu','updateKnockouts','applyGate','collectMoon','spawnKnockouts','setCrowdCount','toast','persistSoon','flushSave','refreshUI'])Game.prototype[n]=function(){};
Game.prototype.missionProgress=()=>0;Game.prototype.missionComplete=()=>false;Game.prototype.startCount=()=>8;Game.prototype.objectZ=function(o){return-o.distance+(this.travel||0)};
window.SleepRoad3D=Game;
for(const file of ['level-director-v5.js','level-runtime-v5.js'])vm.runInThisContext(fs.readFileSync(file,'utf8'),{filename:file});
const P=Game.prototype,state=Object.assign(Object.create(P),{level:45,time:0,playerX:0,playerZ:1.6,playerCount:1,baseSpeed:11,objects:[]});
P.generateLevel.call(state,45);
const kinds=new Set(state.objects.filter(o=>o.type==='obstacle').map(o=>o.kind));
assert(kinds.size>=8);
for(const required of ['bladePair','slamGate'])assert([...window.SleepRoadLevelDirector.obstaclePool(state.profile)].includes(required));
const saw=P.makeObstacle.call(state,new RNG(5),20,1,'saw');
assert(saw.speed>=1.25&&saw.speed<=1.65*1.18,'single saw movement speed out of v27 range');
const samples={
  bladePair:P.makeObstacle.call(state,new RNG(1),20,1,'bladePair'),
  slamGate:P.makeObstacle.call(state,new RNG(2),20,1,'slamGate'),
  slalom:P.makeObstacle.call(state,new RNG(3),20,1,'slalom'),
  shockwave:P.makeObstacle.call(state,new RNG(4),20,1,'shockwave')
};
assert(samples.bladePair.speed>=1.35&&samples.bladePair.speed<=1.80*1.18,'blade pair movement speed out of v27 range');
for(const [kind,o] of Object.entries(samples)){assert.equal(o.kind,kind);let safe=false;for(const t of [0,.5,1,1.5,2.25,3.1]){state.time=t;for(const x of [-4,-3.1,-2,0,2,3.1,4]){state.playerX=x;if(P.obstacleHits.call(state,o,[{x:0,z:0,index:0}])===0){safe=true;break;}}if(safe)break;}assert(safe,'no sampled safe route for '+kind);}
console.log('PASS: v27 faster saws, mechanical obstacle visuals, collision safety and render hooks');
