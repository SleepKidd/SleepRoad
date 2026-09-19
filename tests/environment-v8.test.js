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

vm.runInThisContext(fs.readFileSync('assets/models/tree-model-v31.js','utf8'),{filename:'tree-model-v31.js'});
const T=global.SleepRoadTreeModel;
assert(T);
assert.equal(T.meta.source,'Tree.blend');
assert.equal(T.meta.sourceBlendSha256,'9d3a3f2b0c472629adb8061f79b16c13741506eb078662a3b0be2cc5dcb84dc7');
assert.equal(T.meta.sourceObjects,7);
assert.equal(T.meta.sourceVerts,480);
assert.equal(T.meta.sourcePolygons,684);
assert.equal(T.meta.runtimeVerts,1548);
assert.equal(T.meta.runtimeTris,912);
assert(T.meta.geometry.includes('no decimation'));
const expanded=T.expand();
assert.equal(expanded.groups.length,2);
assert.equal(expanded.groups.reduce((n,g)=>n+g.positions.length/3,0),1548);
assert.equal(expanded.groups.reduce((n,g)=>n+g.indices.length/3,0),912);
for(const group of expanded.groups){
  assert(group.positions instanceof Float32Array);
  assert(group.normals instanceof Float32Array);
  assert(group.indices instanceof Uint16Array);
  assert.equal(group.positions.length,group.normals.length);
}

const houseLoader=fs.readFileSync('assets/models/coffee-house-model-v32.js','utf8');
assert.doesNotThrow(()=>new Function(houseLoader));
for(const part of ['data0','data1','data2']){
  const file=`assets/models/coffee-house-v32-${part}.js`;
  const chunk=fs.readFileSync(file,'utf8');
  assert.doesNotThrow(()=>new Function(chunk),file);
}
assert(houseLoader.includes('"source":"untitled1.blend"'));
assert(houseLoader.includes('"sourceArchive":"кофедом.zip"'));
assert(houseLoader.includes('"sourceBlendSha256":"0b58f54cdcfd9ccfb608d5d75905d89e821ec40c7dadbd10424ca4f2fa5e8d79"'));
assert(houseLoader.includes('"sourceObjects":18'));
assert(houseLoader.includes('"sourceVerts":924'));
assert(houseLoader.includes('"sourcePolygons":844'));
assert(houseLoader.includes('"runtimeTris":1736'));
assert(houseLoader.includes('"materialGroups":9'));
assert(houseLoader.includes('"collision":false'));
assert(houseLoader.includes('packed.length!==17532'));

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

assert(E.COFFEE_HOUSE_DECOR);
assert.equal(E.COFFEE_HOUSE_DECOR.x,19);
assert.equal(E.COFFEE_HOUSE_DECOR.scale,.82);
assert(E.coffeeHouseRoadClearance()>9,'coffee house must remain well outside the road and car lanes');

assert(high.detail>medium.detail&&medium.detail>low.detail);
const envSrc=fs.readFileSync('environment-v8.js','utf8');
assert(envSrc.includes('DECOR_CAR_COLORS'));
assert(envSrc.includes('buildTreeMeshes'));
assert(envSrc.includes('drawTreeModel'));
assert(envSrc.includes('buildCoffeeHouseMeshes'));
assert(envSrc.includes('drawCoffeeHouse'));
assert(envSrc.includes('no gameplay object or hitbox'));
assert(envSrc.includes('Never downgrade Tree.blend'));
assert(!envSrc.includes("const r=g.renderer,m=g.meshes,p=g.biome.palette,wind=Math.sin(g.time*.72"),'old procedural tree implementation must be replaced');
assert(envSrc.includes("part.name==='car_main'?bodyTint:part.color"));
assert(envSrc.includes('Math.floor(hash((index+1)*31.731)*DECOR_CAR_COLORS.length)'));
assert(!envSrc.includes('Math.floor(z*.1)'),'decorative car color must not change with position/time');
const paletteBlock=envSrc.slice(envSrc.indexOf('const DECOR_CAR_COLORS=['),envSrc.indexOf('function shadow'));
assert(!paletteBlock.includes('[.18,.62,.92]'),'blue decorative car color must stay excluded');
assert(!paletteBlock.includes('[.47,.32,.82]'),'purple decorative car color must stay excluded');

const quality=fs.readFileSync('quality-v6.js','utf8');
assert(quality.includes('environmentDensity:1'));
assert(quality.includes('environmentDensity:.70'));
assert(quality.includes('environmentDensity:.43'));
assert(quality.includes('environmentShadows:false'));

const css=fs.readFileSync('environment-v8.css','utf8');
assert(css.includes('.mission-hud'));
assert(css.includes('--hud-accent'));
assert(css.includes('.crowd-count'));

for(const file of ['assets/models/tree-model-v31.js','assets/models/coffee-house-v32-data0.js','assets/models/coffee-house-v32-data1.js','assets/models/coffee-house-v32-data2.js','assets/models/coffee-house-model-v32.js','environment-v8.js','engine.js','quality-v6.js'])assert.doesNotThrow(()=>new Function(fs.readFileSync(file,'utf8')));
console.log('PASS: Tree.blend + decorative coffee house assets, >9-unit road clearance, environment integration and syntax');
