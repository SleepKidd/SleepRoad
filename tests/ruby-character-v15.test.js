'use strict';
const assert=require('assert'),fs=require('fs'),vm=require('vm');
const assetSrc=fs.readFileSync('assets/models/ruby-character-v15.js','utf8'),runtimeSrc=fs.readFileSync('character-ruby-v15.js','utf8');
assert.doesNotThrow(()=>new Function(assetSrc));assert.doesNotThrow(()=>new Function(runtimeSrc));
global.window=global;if(typeof global.atob!=='function')global.atob=s=>Buffer.from(s,'base64').toString('binary');
vm.runInThisContext(assetSrc,{filename:'ruby-character-v15.js'});
const M=global.SleepRoadRubyCharacter;assert(M);assert.equal(M.meta.source,'Ruby_003.blend');assert.equal(M.meta.sourceSha256,'43272d9238f7242b181799125619c2b7442fd113b9d410cacccc1be12ed2cc0b');assert.equal(M.meta.sourceVerts,11847);assert.equal(M.meta.sourceTris,23508);assert.equal(M.meta.runtimeVerts,404);assert.equal(M.meta.runtimeTris,1121);assert.equal(M.groups.reduce((n,g)=>n+g.tris,0),1121);
function Batch(){this.r={created:[],calls:[],createMesh:d=>(this.r.created.push(d),d),draw(){},drawInstances:(m,mat,col,count)=>this.r.calls.push({m,mat,col,count})};this.meshes={cylinder:{}};this.skinPalette={};}
Batch.prototype.metrics=function(count){const n=Math.max(1,Math.min(Math.round(count),420)),cols=Math.min(16,Math.max(3,Math.ceil(Math.sqrt(n*1.05)))),spacing=Math.min(.70,9.2/Math.max(1,cols-1)),rowGap=Math.min(.62,spacing*.86);return{n,cols,spacing,rowGap,depth:(Math.ceil(n/cols)-1)*rowGap};};
Batch.prototype.formation=function(count){const{n,cols,spacing,rowGap}=this.metrics(count),a=[];for(let i=0;i<n;i++){const row=Math.floor(i/cols),rc=Math.min(cols,n-row*cols),col=i%cols;a.push({x:(col-(rc-1)/2)*spacing,z:row*rowGap,index:i});}return a;};
Batch.prototype.draw=function(){throw new Error('fallback should not be used');};
global.SleepRoadSystems={CrowdBatch:Batch,compose(){const a=new Float32Array(16);a[0]=a[5]=a[10]=a[15]=1;return a;},clamp:(v,a,b)=>Math.max(a,Math.min(b,v))};
global.SleepRoadQualityV6={PRESETS:{high:{id:'high',maxCrowd:420}},preset(){return this.PRESETS.high;}};global.__sleepRoad={};
vm.runInThisContext(runtimeSrc,{filename:'character-ruby-v15.js'});
const b=new Batch(),full=b.draw(420,0,1.6,[.2,.5,1],1,{scale:1});assert.equal(full.length,420);assert.equal(b.r.created.length,2);assert.equal(b.r.calls.length,2);for(const c of b.r.calls){assert.equal(c.count,150);assert.equal(c.mat.length,150*16);assert.equal(c.col.length,150*3);}for(const d of b.r.created){assert.equal(d.positions.length,404*3);assert.equal(d.normals.length,404*3);assert(Math.max(...d.indices)<404);}
const index=fs.readFileSync('index.html','utf8');assert(index.includes('ruby-character-v15.js'));assert(index.includes('character-ruby-v15.js'));assert(index.indexOf('ruby-character-v15.js')<index.indexOf('systems-v4.js'));assert(index.indexOf('visual-v9.js')<index.indexOf('character-ruby-v15.js'));for(const n of ['supersport-wheel-0.js','supersport-wheel-1.js','supersport-wheel-2.js','supersport-wheel-3.js'])assert(!index.includes(n),n);
const env=fs.readFileSync('environment-v8.js','utf8');assert.doesNotThrow(()=>new Function(env));assert(!env.includes('decodeDeltaIndices'));assert(!env.includes('buildDecorWheelMeshes'));
const sw=fs.readFileSync('sw.js','utf8');assert(sw.includes("const CACHE='sleep-road-v42';"));assert(sw.includes('ruby-character-v15.js'));assert(sw.includes('character-ruby-v15.js'));for(const n of ['supersport-wheel-0.js','supersport-wheel-1.js','supersport-wheel-2.js','supersport-wheel-3.js'])assert(!sw.includes(n),n);
console.log('PASS: Ruby ZIP crowd model, safe fallback, corrupt wheel crash path removed and cache wiring valid');
