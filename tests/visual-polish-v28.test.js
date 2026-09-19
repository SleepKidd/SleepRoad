'use strict';
const assert=require('assert'),fs=require('fs'),vm=require('vm');
const src=fs.readFileSync('visual-polish-v28.js','utf8');
assert.doesNotThrow(()=>new Function(src));

function Game(){}
const calls=[],compose=(...args)=>args,clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const COLORS={white:[1,1,1],red:[1,0,0],orange:[1,.5,0],navy:[0,0,.2],roadEdge:[.9,.9,.9]};
const labels=[];
Game.prototype.drawEnvironment=function(){this.__oldEnv=true;};
Game.prototype.update=function(){};
Game.prototype.drawObstacle=function(){};
Game.prototype.hitObstacle=function(){return{damage:true,contact:true}};
Game.prototype.addWorldLabel=function(pos,text,type){this.labels.push({style:{},pos,text,type});this.labelCursor++;};
const window={
  SleepRoad3D:Game,
  SleepRoadQualityV6:{preset:()=>({detail:1,maxParticles:120})},
  SleepRoadSystems:{compose,COLORS,clamp}
};
vm.runInNewContext(src,{window,Math,console});
const P=Game.prototype;
for(const name of ['drawMines','drawSpikes','drawLaser','drawBarrier','drawSpinner','drawPusher','drawSlalom','drawShockwave'])assert.equal(typeof P[name],'function',name);
assert.equal(typeof P.drawEnvironment,'function');
assert.equal(typeof P.drawObstacle,'function');

const renderer={draw(...a){calls.push(a)}},meshes={box:{},cylinder:{},cone:{},sphere:{}};
const g=Object.assign(new Game(),{
  renderer,meshes,time:2.1,travel:35,playerZ:1.6,playerX:0,state:'running',speed:10,
  labels,labelCursor:0,v6Particles:[],
  biome:{palette:{ground:[.55,.45,.3],stripe:[.9,.9,.8],roadEdge:[.9,.9,.9],accent:[.9,.4,.1],bad:[.9,.1,.1]}},
  objects:[],objectZ:o=>-o.distance+35,w:390,h:844
});
P.drawMines.call(g,{spikes:[{x:0,z:0},{x:2,z:.2}]},-8);
P.drawSpikes.call(g,{spikes:[{x:-1,z:0},{x:1,z:0}]},-10);
P.drawLaser.call(g,{safeX:0},-12);
P.drawBarrier.call(g,{poleXs:[-3,0,3]},-14);
P.drawSpinner.call(g,{speed:1.2,phase:.2},-16);
P.drawPusher.call(g,{speed:1.1,phase:.3,side:1},-18);
P.drawSlalom.call(g,{safeX:0},-20);
P.drawShockwave.call(g,{speed:1.0,phase:.4,safeX:0},-22);
assert(calls.length>70,'polished obstacles should create detailed geometry');

const before=calls.length;P.drawEnvironment.call(g);assert(g.__oldEnv);assert(calls.length>before+25,'road/environment overlay should add visual detail');
const envBlock=src.slice(src.indexOf('const oldEnvironment'),src.indexOf('// --- Ambient FX'));
for(const token of ['tyre marks','reflective lane/edge studs','shoulder clutter'])assert(envBlock.includes(token),token);

g.labelCursor=0;g.labels=[];
P.addWorldLabel.call(g,[0,1,-20],'ОГОНЬ','bad');
assert.equal(g.labelCursor,1);assert(Number(g.labels[0].style.opacity)>.2);assert(g.labels[0].style.transform.includes('scale('));

P.drawObstacle.call(g,{kind:'saw'},-9);
assert(calls.length>before,'obstacle wrapper should keep drawing and add grounded shadow');
const particlesBefore=g.v6Particles.length;P.hitObstacle.call(g,{kind:'saw'},false);assert(g.v6Particles.length>=particlesBefore+10,'damaging obstacle hit should emit metallic sparks');

const css=fs.readFileSync('visual-polish-v28.css','utf8');
assert(css.includes('.world-label.bad:before'));
assert(css.includes('radial-gradient'));
const activeVisual=fs.readFileSync('visual-v9.js','utf8');
assert(activeVisual.includes('rot=this.time*9.5'),'active saw renderer must use the faster mechanical blade spin');
assert(activeVisual.includes('const x=o.baseX+Math.sin(t)*o.range'),'active saw path must preserve collision-matched movement');
assert(activeVisual.includes("if(o.kind==='mines')"));
assert(activeVisual.includes("if(o.kind==='spikes')"));
assert(activeVisual.includes("if(o.kind==='laser')"));
assert(activeVisual.includes("if(o.kind==='crusher')"));
assert(activeVisual.includes("if(o.kind==='movingWall')"));
const env=fs.readFileSync('environment-v8.js','utf8');
const envObstacle=env.slice(env.indexOf('const oldObstacle=P.drawObstacle'),env.indexOf('const oldFinishGate=P.drawFinishGate'));
assert(envObstacle.includes('return oldObstacle.call(this,o,z)'));
assert(!envObstacle.includes("o.kind==='saw'"),'environment layer must not duplicate the final saw geometry');

const engine=fs.readFileSync('engine.js','utf8');
assert(engine.includes('float light=.36+d*.44+hemi*.20'));
assert(engine.includes("float rim=pow(1.0-abs(n.y),3.0)*.055"));

const index=fs.readFileSync('index.html','utf8');
assert(index.includes('./visual-polish-v28.css'));
assert(index.includes('./visual-polish-v28.js'));
const sw=fs.readFileSync('sw.js','utf8');
assert(sw.includes("'./visual-polish-v28.css'"));
assert(sw.includes("'./visual-polish-v28.js'"));
console.log('PASS: v28 active obstacle renderer, road/environment detail, label fade, particles and lighting polish are wired without duplicate geometry');