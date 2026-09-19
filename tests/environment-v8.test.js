'use strict';
const assert=require('assert');
const fs=require('fs');
const vm=require('vm');

global.window=global;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const hud={style:{setProperty(){}}};
global.SleepRoadSystems={
  compose(){return new Float32Array(16)},
  COLORS:{white:[1,1,1],gold:[1,.7,.1]},
  clamp,
  UI:{hud}
};
global.SleepRoadQualityV6={
  preset(g){return g.__preset||{id:'high',environmentDensity:1,environmentShadows:true}}
};
function Game(){}
for(const n of ['drawGate','drawObstacle','drawFinishGate','drawFinishScene','render'])Game.prototype[n]=function(){};
global.SleepRoad3D=Game;

vm.runInThisContext(fs.readFileSync('environment-v8.js','utf8'),{filename:'environment-v8.js'});
const E=global.SleepRoadEnvironmentV8;
assert(E);
assert.equal(E.hash(42),E.hash(42));
assert(E.hash(42)>=0&&E.hash(42)<1);
assert.notEqual(E.hash(42),E.hash(43));

const high=E.envCfg({__preset:{id:'high',environmentDensity:1,environmentShadows:true}});
const medium=E.envCfg({__preset:{id:'medium',environmentDensity:.70,environmentShadows:true}});
const low=E.envCfg({__preset:{id:'low',environmentDensity:.43,environmentShadows:false}});
assert.equal(high.density,1);
assert.equal(medium.density,.70);
assert.equal(low.density,.43);
assert.equal(low.shadows,false);
assert(E.MEADOW_BOUNDS);
assert(E.MEADOW_BOUNDS.roadEdge>=6);
assert(E.MEADOW_BOUNDS.grassOuter<17);
assert(E.MEADOW_BOUNDS.grassOuter>E.MEADOW_BOUNDS.roadEdge);
assert(E.MEADOW_BOUNDS.transitionOuter>E.MEADOW_BOUNDS.grassOuter);
assert(E.MEADOW_BOUNDS.terrainOuter>=50);
assert(E.MEADOW_BOUNDS.grassLength<250);

assert(high.detail>medium.detail&&medium.detail>low.detail);
const envSrc=fs.readFileSync('environment-v8.js','utf8');
assert(envSrc.includes('DECOR_CAR_COLORS'));
assert(envSrc.includes("part.name==='car_main'?bodyTint:part.color"));
assert(envSrc.includes('opts.color||DECOR_CAR_COLORS'));

const quality=fs.readFileSync('quality-v6.js','utf8');
assert(quality.includes('environmentDensity:1'));
assert(quality.includes('environmentDensity:.70'));
assert(quality.includes('environmentDensity:.43'));
assert(quality.includes('environmentShadows:false'));

const css=fs.readFileSync('environment-v8.css','utf8');
assert(css.includes('.mission-hud'));
assert(css.includes('--hud-accent'));
assert(css.includes('.crowd-count'));

for(const file of ['environment-v8.js','engine.js','quality-v6.js'])assert.doesNotThrow(()=>new Function(fs.readFileSync(file,'utf8')));
console.log('PASS: environment v8 layered meadow, covered sides, adaptive density and syntax');
