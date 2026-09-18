'use strict';
const assert=require('assert');
const fs=require('fs');
const vm=require('vm');

const src=fs.readFileSync('experience-v14.js','utf8');
assert.doesNotThrow(()=>new Function(src));

global.window=global;
if(typeof global.atob!=='function')global.atob=s=>Buffer.from(s,'base64').toString('binary');
Object.defineProperty(global,'navigator',{value:{vibrate(){}},configurable:true});

vm.runInThisContext(fs.readFileSync('assets/models/gclass-glb.js','utf8'),{filename:'gclass-glb.js'});
const M=global.SleepRoadCarModelGLB;
assert(M);
assert.equal(M.meta.source,'mercedes-benz_g-class_free_download.glb');
assert.equal(M.meta.sourceSha256,'eee0c94aaf1f847bcfcc0bce6dbac9f36d59b27eb3d57220a15b25cf791de719');
assert.equal(M.meta.originalVerts,1242);
assert.equal(M.meta.originalTris,1524);
assert.equal(M.meta.runtimeVerts,330);
assert.equal(M.meta.runtimeTris,696);
assert.equal(M.groups.length,12);
assert.equal(M.groups.reduce((n,g)=>n+g.tris,0),696);

function Game(){}
for(const n of ['startLevel','update','drawCourse'])Game.prototype[n]=function(){};
global.SleepRoad3D=Game;
global.SleepRoadSystems={compose(){return new Float32Array(16)},clamp:(v,a,b)=>Math.max(a,Math.min(b,v)),COLORS:{white:[1,1,1],gold:[1,.72,.09],red:[.9,.2,.2]}};
global.SleepRoadExperienceV13={elevationAt(){return 0;}};
vm.runInThisContext(src,{filename:'experience-v14.js'});
const V=global.SleepRoadCarHazardV14;
assert(V);
assert.equal(V.CAR_CHANCE,.5);
assert.equal(V.MODEL_TRIANGLES,696);

let deterministic=0;
for(let level=1;level<=10000;level++)if(V.carEventFor(level))deterministic++;
assert(deterministic/10000>.48&&deterministic/10000<.52);

const calls=[];
const gmesh={renderer:{createMesh(d){calls.push(d);return d;}}};
const gpu=V.buildCarMeshes(gmesh);
assert.equal(gpu.length,12);
assert.equal(calls.length,12);
for(const m of calls){
  assert(m.positions instanceof Float32Array);
  assert(m.normals instanceof Float32Array);
  assert(m.indices instanceof Uint16Array);
  assert.equal(m.positions.length,330*3);
  assert.equal(m.normals.length,330*3);
  assert(Math.max(...m.indices)<330);
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

for(const token of ['const CAR_CHANCE=.5','spawnRoll=Math.random()','spawnKnockouts(loss)','SleepRoadCarModelGLB','m.cylinder','MODEL_TRIANGLES=696','1.08,1.08,1.08'])assert(src.includes(token),token);
assert(!src.includes('SleepRoadCarModelMeta'));
assert(!src.includes('__SleepRoadCarChunks'));
assert(!src.includes('r.draw(m.box,compose(car.x,y-.012,z'));

const index=fs.readFileSync('index.html','utf8');
assert(index.includes('gclass-glb.js'));
assert(!index.includes('gclass-frag-'));
assert(!index.includes('gclass-final.js'));
assert(!index.includes('car-model-meta.js'));
assert(!index.includes('car-model-data.js'));
assert(index.indexOf('gclass-glb.js')<index.indexOf('experience-v14.js'));

const sw=fs.readFileSync('sw.js','utf8');
assert(sw.includes("const CACHE='sleep-road-v37';"));
assert(sw.includes('gclass-glb.js'));
assert(!sw.includes('gclass-frag-'));
assert(!sw.includes('gclass-final.js'));
assert(!sw.includes('car-model-meta.js'));
assert(!sw.includes('car-model-data.js'));

console.log('PASS: G-Class GLB replacement, 50% car hazard, collision and soft shadow');
