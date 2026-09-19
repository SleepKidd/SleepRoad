'use strict';

const assert=require('assert');
const fs=require('fs');
const vm=require('vm');

const element=()=>({
  textContent:'',style:{},offsetWidth:1,
  classList:{add(){},remove(){},toggle(){}},
  addEventListener(){}
});

const context={
  console,Float32Array,Uint16Array,Uint8Array,DataView,Math,JSON,Number,atob,
  performance:{now:()=>0},setTimeout,clearTimeout,requestAnimationFrame(){},
  innerWidth:390,innerHeight:844,devicePixelRatio:2
};
context.window=context;
context.document={hidden:false,getElementById:()=>element(),addEventListener(){}};
context.localStorage={getItem(){return null;},setItem(){}};
vm.createContext(context);

for(const file of ['engine.js','assets/models/countmaster-character.js','systems-v4.js','level-director-v5.js','gameplay-v4.js','level-runtime-v5.js']){
  vm.runInContext(fs.readFileSync(file,'utf8'),context,{filename:file});
}

const systems=context.SleepRoadSystems;
const director=context.SleepRoadLevelDirector;
const mesh=context.CountMasterCharacter;
const game=context.SleepRoad3D.prototype;

assert.equal(mesh.sourceSha256,'c1143a8902be2a9433ecd50e9714c6a67b9292da2af3bc48052c15ddb4bb2518');
assert.equal(mesh.positions.length,1465*3);
assert.equal(mesh.normals.length,mesh.positions.length);
assert.equal(mesh.indices.length,2862*3);
assert(Math.max(...mesh.indices)<1465);
assert.equal(Object.values(mesh.parts).reduce((sum,part)=>sum+part.indices.length,0),mesh.indices.length);
for(const part of Object.values(mesh.parts)){
  assert(part.positions.length>0&&part.normals.length===part.positions.length);
  assert(part.indices.length>0&&Math.max(...part.indices)<part.positions.length/3);
}

const crowdDraws=[];
const crowdMeshes={cylinder:{name:'shadow'},characterParts:{}};
for(const name of Object.keys(mesh.parts))crowdMeshes.characterParts[name]={name};
const drawBatch=new systems.CrowdBatch({drawInstances(part,matrices,colors,count){
  assert.equal(matrices.length,count*16);assert.equal(colors.length,count*3);crowdDraws.push(part.name);
}},crowdMeshes);
drawBatch.draw(420,0,1.6,[.2,.5,1],2.5);
assert.deepEqual(crowdDraws,['shadow','head','body','leftArm','rightArm','leftLeg','rightLeg']);

assert.equal(systems.applyGateValue(12,{op:'mul',value:2}),24);
assert.equal(systems.applyGateValue(12,{op:'add',value:8}),20);
assert.equal(systems.applyGateValue(12,{op:'sub',value:20}),1);
assert.equal(systems.applyGateValue(13,{op:'div',value:2}),7);
assert.equal(systems.applyGateValue(800,{op:'mul',value:2}),999);

assert.equal(director.biomeForLevel(1).id,'meadow');
assert.equal(director.biomeForLevel(11).id,'desert');
assert.equal(director.biomeForLevel(21).id,'factory');
assert.equal(director.biomeForLevel(31).id,'city');
assert.equal(director.biomeForLevel(41).id,'neon');
assert(director.profileForLevel(100).intensity>1);

const generatedKinds=new Set(),collisionBatch=new systems.CrowdBatch({},{});
for(let level=1;level<=100;level++){
  const levelState=Object.assign(Object.create(game),{level,time:0,playerX:0,playerZ:1.6,playerCount:80,baseSpeed:9,objects:[]});
  game.generateLevel.call(levelState,level);
  assert(levelState.levelLength>360);
  assert(levelState.objects.length<420);
  assert(levelState.objects.every((item,index,list)=>index===0||list[index-1].distance<=item.distance));
  const finish=levelState.objects.filter(item=>item.type==='finish');
  assert.equal(finish.length,1);assert.equal(finish[0].distance,levelState.levelLength);
  const gates=levelState.objects.filter(item=>item.type==='gate');
  assert(gates.length>0);
  for(const gate of gates){
    for(const opt of [gate.left,gate.right])assert(['add','sub','mul','div'].includes(opt.op));
  }
  const bosses=levelState.objects.filter(item=>item.type==='enemy'&&item.boss);
  assert.equal(bosses.length,1);
  for(const obstacle of levelState.objects.filter(item=>item.type==='obstacle')){
    generatedKinds.add(obstacle.kind);
    const hits=game.obstacleHits.call(levelState,obstacle,collisionBatch.formation(80));
    assert(Number.isInteger(hits)&&hits>=0&&hits<=80);
  }
}
assert(generatedKinds.size>=19);
for(const kind of ['movingWall','fallingBlock','fireline','bladePair','slamGate','slalom','shockwave'])assert(generatedKinds.has(kind));

for(let count=1;count<=999;count+=7){
  const step=systems.finishStepForCount(count);
  const multiplier=systems.finishMultiplierForStep(step);
  const base=systems.finishBaseReward(count,1.24);
  const reward=systems.finishReward(count,multiplier,1.24);
  assert(step>=1&&step<=8);
  assert(multiplier>=1.35&&multiplier<=3.8);
  assert(reward>=base);
}
assert(systems.finishReward(80,2.4,1)>systems.finishReward(80,1.35,1));

const crowdBatch=new systems.CrowdBatch({},{});
const formation=crowdBatch.formation(120);
const edge=formation.reduce((current,member)=>Math.abs(member.x)>Math.abs(current.x)?member:current);
const pickupState=Object.assign(Object.create(game),{
  crowdBatch,playerCount:120,playerX:0,playerZ:1.6,magnetRadius:()=>.82
});
assert(Math.abs(edge.x)>.82);
assert(game.pickupTouchesCrowd.call(pickupState,{type:'moon',x:edge.x},1.6+edge.z,formation));
assert(!game.pickupTouchesCrowd.call(pickupState,{type:'moon',x:20},1.6,formation));

const collector=Object.assign(Object.create(game),{
  save:{moons:0},moonRemainder:0,collectedMoonCount:0,levelMoons:0,
  incomeScale:()=>1.12,persistSoon(){},audio:{coin(){}},updateMissionUI(){}
});
for(let i=0;i<9;i++)game.collectMoon.call(collector,{bonus:false});
assert.equal(collector.collectedMoonCount,9);
assert.equal(collector.levelMoons,10);
assert.equal(collector.save.moons,10);

const missionState=Object.assign(Object.create(game),{
  mission:{kind:'moon'},collectedMoonCount:7,levelMoons:999
});
assert.equal(game.missionProgress.call(missionState),7);
const completedTimed=Object.assign(Object.create(game),{
  mission:{kind:'moon',target:3,reward:10,title:'test'},
  collectedMoonCount:3,dodgedObstacles:0,playerCount:20,
  missionCompleted:false,missionTimerFrozen:false,missionCompletedAtTime:0,
  profile:{timed:true,noHit:false,title:'Timed test'},
  levelTimeRemaining:12,time:5
});
assert.equal(game.syncMissionCompletion.call(completedTimed),true);
assert.equal(completedTimed.missionCompleted,true);
assert.equal(completedTimed.missionTimerFrozen,true);
completedTimed.collectedMoonCount=0;
assert.equal(game.missionComplete.call(completedTimed),true,'completed mission must stay completed after being latched');

const timedUpdate=Object.assign(Object.create(game),{
  level:14,mission:{kind:'moon',target:1,reward:10,title:'test'},collectedMoonCount:1,dodgedObstacles:0,
  missionCompleted:false,missionTimerFrozen:false,missionCompletedAtTime:0,
  profile:director.profileForLevel(14),biome:director.profileForLevel(14).biome,
  levelTimeRemaining:20,time:2,state:'running',shake:0,flash:0,
  knockouts:[],magnetBoost:0,invulnTimer:0,jumpTimer:0,boostTimer:0,slowTimer:0,doubleTimer:0,doubleActive:false,bankedCrowd:0,tookDamage:false,challengeReward:0,
  playerCount:20,visualCount:20,playerX:0,targetX:0,playerZ:1.6,baseSpeed:9,speed:9,travel:0,levelLength:500,
  keys:new Set(),objects:[],crowdBatch:new systems.CrowdBatch({},{}),
  updateKnockouts(){},setCrowdCount(){},toast(){},fail(reason){this.failedReason=reason;this.state='failed';},
  audio:{bad(){},good(){},hit(){},tone(){}},updateMissionUI(){game.syncMissionCompletion.call(this);}
});
game.update.call(timedUpdate,1);
assert.equal(timedUpdate.levelTimeRemaining,20,'timer must freeze immediately when timed mission objective is complete');
assert.notEqual(timedUpdate.state,'failed');

console.log('PASS: model, shorter/harder Level Director, 19+ obstacle kinds, crowd pickup, income, timed mission latch/freeze, finish multiplier');
