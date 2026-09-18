'use strict';
const assert=require('assert');
const fs=require('fs');
const vm=require('vm');

global.window=global;
global.innerWidth=390;
global.innerHeight=844;
global.devicePixelRatio=3;
Object.defineProperty(global,'navigator',{value:{deviceMemory:4,hardwareConcurrency:6},configurable:true});

class CrowdBatch{draw(){return[]}}
function Game(){}
Game.prototype.resize=function(){};
Game.prototype.update=function(){};

global.SleepRoadSystems={CrowdBatch};
global.SleepRoad3D=Game;

vm.runInThisContext(fs.readFileSync('quality-v6.js','utf8'),{filename:'quality-v6.js'});
const Q=global.SleepRoadQualityV6;
assert(Q);

const calls=[];
const g={
  w:390,h:844,
  renderer:{
    gl:{MAX_RENDERBUFFER_SIZE:0x84E8,getParameter(){return 8192}},
    resize(w,h,dpr){calls.push({w,h,dpr})}
  },
  v6Particles:[]
};

assert.equal(Q.initial(),'high');

for(const level of ['high','medium','low']){
  g.v6Quality={level,samples:[],cooldown:0,avgFps:60};
  const dpr=Q.resolutionDpr(g,level);
  const width=Math.round(g.w*dpr),height=Math.round(g.h*dpr);
  assert(width>=1050,level+' should stay around 1080-class width on a 390px Retina viewport');
  assert(height>=2200,level+' should stay 2K-class vertically on a 390x844 iPhone viewport');
  assert(height<=Q.PRESETS[level].maxDimension+1,level+' must respect framebuffer dimension cap');
}

g.v6Quality={level:'high',samples:[],cooldown:0,avgFps:60};
assert(Q.apply(g,'medium'));
assert(calls.length>0);
assert(calls.at(-1).dpr>=2.8);

const src=fs.readFileSync('quality-v6.js','utf8');
for(const token of [
  "dpr:3.0",
  "dpr:2.85",
  "dpr:2.75",
  "avg<38",
  "avg<32",
  "q.samples.length<180",
  "resizeToQuality(this)"
])assert(src.includes(token),token);
assert(!src.includes("dpr:1.35"));
assert(!src.includes("dpr:1.0"));

assert.doesNotThrow(()=>new Function(src));
console.log('PASS: Retina quality v10 keeps 1080/2K-class rendering across adaptive presets');
