'use strict';
const assert=require('assert'),fs=require('fs'),vm=require('vm');
const assetSrc=fs.readFileSync('assets/models/goblin-boss-v22.js','utf8');
const runtimeSrc=fs.readFileSync('boss-goblin-v22.js','utf8');
assert.doesNotThrow(()=>new Function(assetSrc));
assert.doesNotThrow(()=>new Function(runtimeSrc));

global.window=global;
vm.runInThisContext(assetSrc,{filename:'goblin-boss-v22.js'});
const A=global.SleepRoadGoblinBossAssetV22;
assert(A);
assert.equal(A.meta.source,'Fantasy Goblin Guard Character_basic_shaded.glb');
assert.equal(A.meta.sourceSha256,'51870802aadab325d6aa386d865df05b290a4154cebe638b73abbee7bbbb5392');
assert.equal(A.meta.sourceVerts,50205);
assert.equal(A.meta.runtimeVerts,50205);
assert.equal(A.meta.sourceTris,40000);
assert.equal(A.meta.runtimeTris,40000);
assert(A.meta.geometry.includes('no decimation or simplification'));
assert(A.meta.appearance.includes('shaded GLB emissive texture'));
assert(A.meta.doubleSided);
assert(A.lo[1]===0&&A.hi[1]>1.89);
assert(A.lo[2]<0&&A.hi[2]>0);

const bytes=s=>Buffer.from(s,'base64');
assert.equal(bytes(A.p).length,50205*3*2);
assert.equal(bytes(A.n).length,50205*2);
assert.equal(bytes(A.c).length,50205*3);
assert.equal(bytes(A.i).length,40000*3*2);
const colors=bytes(A.c),seen=new Set();
for(let i=0;i<colors.length;i+=3)if(i%33===0)seen.add(colors[i]+','+colors[i+1]+','+colors[i+2]);
assert(seen.size>250,'boss should retain a rich shaded color field');

function Game(){}
global.SleepRoad3D=Game;
global.SleepRoadSystems={
  compose(){const m=new Float32Array(16);m[0]=m[5]=m[10]=m[15]=1;return m;},
  clamp:(v,a,b)=>Math.max(a,Math.min(b,v))
};
vm.runInThisContext(runtimeSrc,{filename:'boss-goblin-v22.js'});
const B=global.SleepRoadGoblinBossV22;
assert(B);
assert.equal(B.meta.source,A.meta.source);
assert(B.modelScale({bossScale:3.25})>2.3&&B.modelScale({bossScale:3.25})<2.5);

const render=fs.readFileSync('render-v4.js','utf8');
assert(render.includes("if(o.boss&&window.SleepRoadGoblinBossV22?.draw(this,o,z))"));
assert(render.includes("SleepRoadGoblinBossV22.labelPosition"));

const v11=fs.readFileSync('experience-v11.js','utf8');
assert(v11.includes("window.SleepRoadGoblinBossV22&&!g.__goblinBossFailed"));
assert(v11.includes("window.SleepRoadGoblinBossV22?.drawCorpse(g,c)"));

const index=fs.readFileSync('index.html','utf8');
assert(index.includes('./assets/models/goblin-boss-v22.js'));
assert(index.includes('./boss-goblin-v22.js'));
assert(index.indexOf('goblin-boss-v22.js')<index.indexOf('systems-v4.js'));
assert(index.indexOf('visual-v9.js')<index.indexOf('boss-goblin-v22.js'));
assert(index.indexOf('boss-goblin-v22.js')<index.indexOf('experience-v11.js'));

const sw=fs.readFileSync('sw.js','utf8');
assert(sw.includes("const CACHE='sleep-road-v48';"));
assert(sw.includes("'./assets/models/goblin-boss-v22.js'"));
assert(sw.includes("'./boss-goblin-v22.js'"));

console.log('PASS: full-topology shaded GLB goblin replaces boss visuals with fallback and PWA wiring');
