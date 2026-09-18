'use strict';
const assert=require('assert');
const fs=require('fs');
const vm=require('vm');

global.window=global;
global.navigator={deviceMemory:8,hardwareConcurrency:8};
const storage={};
global.localStorage={getItem:k=>storage[k]||null,setItem:(k,v)=>storage[k]=String(v)};
const el=()=>({textContent:'',className:'',style:{setProperty(){}},classList:{add(){},remove(){},toggle(){}},appendChild(){},querySelector(){return el();},querySelectorAll(){return[];},addEventListener(){},dataset:{}});
global.document={getElementById:()=>el(),createElement:()=>el()};
global.performance={now:()=>0};
global.requestAnimationFrame=()=>1;
global.cancelAnimationFrame=()=>{};
global.devicePixelRatio=1;
global.setTimeout=()=>1;
global.clearTimeout=()=>{};

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),lerp=(a,b,t)=>a+(b-a)*t;
class AudioEngine{constructor(){this.enabled=false;}tone(){}}
class CrowdBatch{formation(){return[{x:0,z:0,index:0}]}metrics(){return{depth:1,cols:1}}draw(){return[]}}
function Game(){}
for(const name of ['refreshUI','startLevel','returnToMenu','collectMoon','setCrowdCount','applyGate','showResult','update','resize','collectJump','collectZone','collectPowerup','hitObstacle','tickActiveObstacle','spawnKnockouts','beginBattle','updateBattle','beginFinish','updateFinish','render','setCamera','drawMoon','drawObstacle','drawKnockouts'])Game.prototype[name]=function(){if(name==='hitObstacle')return{contact:false,damage:false};};
global.SleepRoadSystems={UI:{menu:el(),moonValue:el(),menuMoonValue:el(),crowdCount:el(),canvas:el()},COLORS:{gold:[1,.7,.1],teal:[.1,.8,.7],red:[1,.2,.2],white:[1,1,1]},clamp,lerp,DEG:Math.PI/180,compose(){return new Float32Array(16)},AudioEngine,CrowdBatch};
global.SleepRoadLevelDirector={BIOMES:[{id:'meadow',name:'GREEN ROAD'},{id:'desert',name:'DUST HIGHWAY'},{id:'factory',name:'IRON WORKS'},{id:'city',name:'NIGHT CITY'},{id:'neon',name:'NEON LAB'}],profileForLevel(level){return{level,chapter:Math.min(4,Math.floor((level-1)/10)),biome:this.BIOMES[Math.min(4,Math.floor((level-1)/10))],title:'TEST',bossLevel:level%10===0};}};
global.SleepRoad3D=Game;

for(const file of ['progression-v6.js','audio-v6.js','quality-v6.js','polish-v6.js'])vm.runInThisContext(fs.readFileSync(file,'utf8'),{filename:file});

const R=global.SleepRoadProgressionV6,Q=global.SleepRoadQualityV6,A=global.SleepRoadAudioV6,P=global.SleepRoadPolishV6;
assert(R&&Q&&A&&P);
assert.equal(R.milestoneReward(3),null);
assert.deepEqual(R.milestoneReward(5),{kind:'chest',amount:60,label:'СУНДУК'});
assert.deepEqual(R.milestoneReward(10),{kind:'chapter',amount:190,label:'НАГРАДА ГЛАВЫ'});
assert.equal(R.unlockedSkins(1).length,1);
assert.equal(R.unlockedSkins(11).length,2);
assert.equal(R.unlockedSkins(41).length,5);
assert.equal(Q.PRESETS.high.maxCrowd,420);
assert(Q.PRESETS.low.maxParticles<Q.PRESETS.high.maxParticles);
assert.equal(Object.keys(A.MUSIC).length,5);
assert.equal(P.CHAPTER_ATTACKS.length,5);
for(const attack of P.CHAPTER_ATTACKS)assert(attack.id&&attack.name&&attack.color.length===3);
for(const file of ['animation-v5.js','progression-v6.js','audio-v6.js','quality-v6.js','polish-v6.js'])assert.doesNotThrow(()=>new Function(fs.readFileSync(file,'utf8')));
console.log('PASS: v6 rewards, skins, quality, music, boss patterns and syntax');
