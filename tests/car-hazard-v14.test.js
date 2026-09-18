'use strict';
const assert=require('assert');
const fs=require('fs');
const vm=require('vm');

const src=fs.readFileSync('experience-v14.js','utf8');
const metaSrc=fs.readFileSync('assets/models/car-model-meta.js','utf8');
const dataSrc=fs.readFileSync('assets/models/car-model-data.js','utf8');
assert.doesNotThrow(()=>new Function(src));
assert.doesNotThrow(()=>new Function(metaSrc));
assert.doesNotThrow(()=>new Function(dataSrc));

global.window=global;
if(typeof global.atob!=='function')global.atob=s=>Buffer.from(s,'base64').toString('binary');
Object.defineProperty(global,'navigator',{value:{vibrate(){}},configurable:true});

function Game(){}
for(const n of ['startLevel','update','drawCourse'])Game.prototype[n]=function(){};
global.SleepRoad3D=Game;
global.SleepRoadSystems={
  compose(){return new Float32Array(16)},
  clamp:(v,a,b)=>Math.max(a,Math.min(b,v)),
  COLORS:{white:[1,1,1],gold:[1,.72,.09],red:[.9,.2,.2]}
};
global.SleepRoadExperienceV13={elevationAt(){return 0;}};

vm.runInThisContext(metaSrc,{filename:'car-model-meta.js'});
vm.runInThisContext(dataSrc,{filename:'car-model-data.js'});
vm.runInThisContext(src,{filename:'experience-v14.js'});
const V=global.SleepRoadCarHazardV14;
assert(V);

assert.equal(V.CAR_CHANCE,.5);
let cars=0;
for(let level=1;level<=10000;level++)if(V.carEventFor(level))cars++;
const rate=cars/10000;
assert(rate>.48&&rate<.52,'car event must stay around 50%');
assert.equal(V.MODEL_TRIANGLES,360);

assert(global.SleepRoadCarModelMeta);
assert.equal(global.SleepRoadCarModelMeta.source,'027.max');
assert.equal(global.SleepRoadCarModelMeta.sourceSha256,'543e5ef2b94bb1a6f9514fdfb45d92b9838d9f59583385804c3effbf1a541c64');
assert.deepEqual(global.SleepRoadCarModelMeta.bounds.min,[-.93,0,-2.09]);
assert.deepEqual(global.SleepRoadCarModelMeta.bounds.max,[.93,1.44,2.09]);
assert.equal(global.__SleepRoadCarChunks.length,6);
assert.equal(global.__SleepRoadCarChunks.reduce((n,c)=>n+c.tris,0),360);
assert.deepEqual(global.__SleepRoadCarChunks.map(c=>c.group),['body','dark','glass','metal','red','orange']);

const meshCalls=[];
const meshGame={
  renderer:{createMesh(data){meshCalls.push(data);return{data};}},
  v14:null
};
const gpu=V.buildCarMeshes(meshGame);
assert.equal(gpu.length,6);
assert.equal(meshCalls.length,6);
for(const m of meshCalls){
  assert(m.positions instanceof Float32Array);
  assert(m.normals instanceof Float32Array);
  assert(m.indices instanceof Uint16Array);
  assert.equal(m.positions.length,m.normals.length);
}

const fake={
  level:12,levelLength:330,baseSpeed:10,playerZ:1.6,objects:[],
  crowdBatch:{formation(n){return Array.from({length:n},(_,i)=>({x:(i%5-2)*.62,z:Math.floor(i/5)*.5,index:i}));}},
  playerCount:25,visualCount:25,playerX:0,shield:0,knockouts:[],shake:0,flash:0,
  spawnKnockouts(n){for(let i=0;i<n;i++)this.knockouts.push({x:(i%5-2)*.62,y:.3,z:1.6,vx:0,vy:0,vz:0,life:1,maxLife:1});},
  setCrowdCount(){},updateMissionUI(){},toast(){},
  audio:{hit(){},good(){},tone(){}},fail(){this.failed=true;}
};
const car={x:0,hit:false};
const loss=V.knockPeople(fake,car);
assert(loss>0,'car should knock people out when crowd stays in its lane');
assert(fake.playerCount<25);
assert.equal(fake.tookDamage,true);
assert(fake.knockouts.some(k=>k.vz>=6.8),'knocked people should fly in car direction');

const shieldGame={...fake,playerCount:20,visualCount:20,shield:1,knockouts:[],tookDamage:false,crowdBatch:fake.crowdBatch};
const shieldCar={x:0,hit:false};
assert.equal(V.knockPeople(shieldGame,shieldCar),0);
assert.equal(shieldGame.playerCount,20);
assert.equal(shieldGame.shield,0);

for(const token of [
  'const CAR_CHANCE=.5',
  'crowdBatch.formation',
  'spawnKnockouts(loss)',
  'g.tookDamage=true',
  'МАШИНА СБИЛА',
  'ЩИТ СПАС ОТ МАШИНЫ',
  'renderer.createMesh',
  'Uint16Array',
  'meetDistance'
])assert(src.includes(token),token);

const index=fs.readFileSync('index.html','utf8');
for(const asset of ['car-model-meta.js','car-model-data.js','experience-v14.js'])assert(index.includes(asset),asset);
assert(index.indexOf('car-model-data.js')<index.indexOf('experience-v14.js'));
assert(index.indexOf('experience-v14.js')>index.indexOf('experience-v13.js'));
assert(index.indexOf('experience-v14.js')<index.indexOf('boot-v4.js'));

const sw=fs.readFileSync('sw.js','utf8');
assert(sw.includes("const CACHE='sleep-road-v35';"));
for(const asset of ['car-model-meta.js','car-model-data.js','experience-v14.js'])assert(sw.includes(asset),asset);

console.log('PASS: uploaded 027.max car model, 50% hazard chance, collision and crowd knockouts');
