'use strict';
const assert=require('assert');
const fs=require('fs');
const vm=require('vm');

const assetSrc=fs.readFileSync('assets/models/pickup-model.js','utf8');
assert.doesNotThrow(()=>new Function(assetSrc));
for(const token of [
  'carForInet1.blend',
  '"runtimeVerts":13351',
  '"runtimeTris":13110',
  'no decimation or simplification'
])assert(assetSrc.includes(token),token);

global.window=global;
if(typeof global.atob!=='function')global.atob=s=>Buffer.from(s,'base64').toString('binary');
Object.defineProperty(global,'navigator',{value:{vibrate(){}},configurable:true});
vm.runInThisContext(assetSrc,{filename:'pickup-model.js'});

const M=global.SleepRoadCarModel;
assert(M);
assert.equal(M.meta.source,'carForInet1.blend');
assert.equal(M.meta.geometrySource,'carForInet1.obj');
assert.equal(M.meta.sourceBlendSha256,'0195be28332ebddd736ca00dca9b7d5523bc946523a0e0fcd1cb37b7c8de2a17');
assert.equal(M.meta.sourceObjSha256,'4adc88eb69441100cf8ff9c357505ff8e177c5ef795e2900ac96d0282463eebc');
assert.equal(M.meta.sourceVerts,6813);
assert.equal(M.meta.runtimeVerts,13351);
assert.equal(M.meta.runtimeTris,13110);
assert.equal(M.groups.length,15);
assert.equal(M.groups.reduce((n,g)=>n+g.tris,0),13110);

function decodeBytes(b64){
  const raw=atob(b64),out=new Uint8Array(raw.length);
  for(let i=0;i<raw.length;i++)out[i]=raw.charCodeAt(i)&255;
  return out;
}
function decodeF32(b64){
  const b=decodeBytes(b64),v=new DataView(b.buffer,b.byteOffset,b.byteLength),out=new Float32Array(b.byteLength>>2);
  for(let i=0;i<out.length;i++)out[i]=v.getFloat32(i*4,true);
  return out;
}
function decodeU16(b64){
  const b=decodeBytes(b64),v=new DataView(b.buffer,b.byteOffset,b.byteLength),out=new Uint16Array(b.byteLength>>1);
  for(let i=0;i<out.length;i++)out[i]=v.getUint16(i*2,true);
  return out;
}
const pp=decodeF32(M.p32),nn=decodeF32(M.n32);
assert.equal(pp.length,13351*3);
assert.equal(nn.length,13351*3);
let maxIndex=0;
for(const group of M.groups){
  const ii=decodeU16(group.i);
  assert.equal(ii.length,group.tris*3);
  for(const i of ii)if(i>maxIndex)maxIndex=i;
}
assert(maxIndex<13351);

const src=fs.readFileSync('experience-v14.js','utf8');
assert.doesNotThrow(()=>new Function(src));

function Game(){}
for(const n of ['startLevel','update','drawCourse'])Game.prototype[n]=function(){};
global.SleepRoad3D=Game;
global.SleepRoadSystems={
  compose(){return new Float32Array(16)},
  clamp:(v,a,b)=>Math.max(a,Math.min(b,v)),
  COLORS:{white:[1,1,1],gold:[1,.72,.09],red:[.9,.2,.2]}
};
global.SleepRoadExperienceV13={elevationAt(){return 0;}};
vm.runInThisContext(src,{filename:'experience-v14.js'});
const V=global.SleepRoadCarHazardV14;
assert(V);
assert.equal(V.CAR_CHANCE,.75);
assert.equal(V.CARS_PER_EVENT,2);
assert.equal(V.MIN_CAR_GAP,54);
assert.equal(V.MODEL_TRIANGLES,13110);

let deterministic=0;
for(let level=1;level<=10000;level++)if(V.carEventFor(level))deterministic++;
assert(deterministic/10000>.73&&deterministic/10000<.77);

const oldRandom=Math.random;
try{
  const rolls=[.20,.11,.73];
  Math.random=()=>rolls.shift()??.41;
  const pair=V.makeCars({level:18,levelLength:520,baseSpeed:9.5,playerZ:1.6,objects:[]});
  assert.equal(pair.length,2,'successful hazard event must spawn exactly two cars');
  assert(Math.abs(pair[0].meetDistance-pair[1].meetDistance)>=V.MIN_CAR_GAP,'hazard cars must be separated');
  assert.notEqual(pair[0].x,pair[1].x,'consecutive hazard cars should not use the same lane');
}finally{Math.random=oldRandom;}

const calls=[];
const gmesh={renderer:{createMesh(d){calls.push(d);return d;}}};
const gpu=V.buildCarMeshes(gmesh);
assert.equal(gpu.length,15);
assert.equal(calls.length,15);
for(const m of calls){
  assert(m.positions instanceof Float32Array);
  assert(m.normals instanceof Float32Array);
  assert(m.indices instanceof Uint16Array);
  assert.equal(m.positions.length,13351*3);
  assert.equal(m.normals.length,13351*3);
  assert(Math.max(...m.indices)<13351);
}
assert.strictEqual(V.buildCarMeshes(gmesh),gpu);

const xs=[-1.24,-.62,0,.62,1.24];
const hitGame={
  playerCount:25,visualCount:25,playerX:0,playerZ:1.6,shield:0,shake:0,flash:0,knockouts:[],
  crowdBatch:{formation(count){return Array.from({length:count},(_,i)=>({x:xs[i%5],z:Math.floor(i/5)*.5,index:i}));}},
  spawnKnockouts(n){for(let i=0;i<n;i++)this.knockouts.push({x:xs[i%5],vx:0,vy:0,vz:0,life:1,maxLife:1});},
  setCrowdCount(){},updateMissionUI(){},toast(){},audio:{hit(){},good(){},tone(){}},fail(){this.failed=true;}
};
const loss=V.knockPeople(hitGame,{x:0,hit:false});
assert(loss>0);
assert(hitGame.playerCount<25);
assert.equal(hitGame.tookDamage,true);
assert(hitGame.knockouts.some(k=>k.vz>=6.8));

for(const token of [
  'const CAR_CHANCE=.75',
  'CARS_PER_EVENT=2',
  'MIN_CAR_GAP=54',
  'makeCars',
  'CAR_WIDTH=2.65',
  'MODEL_SCALE=.88',
  'MODEL_TRIANGLES=13110',
  'SleepRoadCarModel',
  'decodeF32',
  'spawnKnockouts(loss)'
])assert(src.includes(token),token);
assert(!src.includes('SleepRoadCarModelGLB'));
assert(!src.includes('MODEL_TRIANGLES=696'));

const index=fs.readFileSync('index.html','utf8');
assert(index.includes('pickup-model.js'));
assert(!index.includes('gclass-glb.js'));
assert(index.indexOf('pickup-model.js')<index.indexOf('experience-v14.js'));

const sw=fs.readFileSync('sw.js','utf8');
assert(sw.includes("const CACHE='sleep-road-v39';"));
assert(sw.includes('pickup-model.js'));
assert(!sw.includes('gclass-glb.js'));

console.log('PASS: full-resolution Blender pickup, 75% two-car hazard event, collision and lighting');
