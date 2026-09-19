'use strict';
const assert=require('assert'),fs=require('fs'),vm=require('vm');
global.window=global;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const elements=[];
const UI={labels:{appendChild(e){elements.push(e);}},canvas:{style:{}}};
global.document={createElement(){return{textContent:'',className:'',style:{},classList:{add(){},remove(){},toggle(){}}};}};
global.SleepRoadSystems={
  compose(){return new Float32Array(16)},DEG:Math.PI/180,UI,
  COLORS:{grass:[0,0,0],road:[0,0,0],roadEdge:[0,0,0],gold:[0,0,0],roadStripe:[0,0,0],white:[1,1,1],red:[1,0,0],orange:[1,.5,0],gray:[.5,.5,.5],purple:[.5,0,.5],teal:[0,1,1],blue:[0,0,1],navy:[0,0,.2],island:[0,0,0],islandTop:[0,0,0],grassDark:[0,0,0],step0:[0,0,0],step1:[0,0,0],step2:[0,0,0],step3:[0,0,0]},
  clamp,lerp:(a,b,t)=>a+(b-a)*t,isGoodGate:()=>true,gateLabel:()=>'+1'
};
function Game(){}
global.SleepRoad3D=Game;
const src=fs.readFileSync('render-v4.js','utf8');assert.doesNotThrow(()=>new Function(src));vm.runInThisContext(src,{filename:'render-v4.js'});
const g=Object.assign(new Game(),{labels:[],labelCursor:0,labelLayout:[],w:390,h:844,renderer:{project:p=>({x:p[0],y:p[1],z:.94})}});
g.beginLabels();
g.addWorldLabel([150,120,-40],'СЛИШКОМ ДАЛЕКО','powerup');
assert.equal(g.labelCursor,0,'mobile labels must stay hidden until the obstacle is visually close');
g.addWorldLabel([150,120,-20],'РАЗДЕЛЕНИЕ','powerup');
g.addWorldLabel([154,124,-19],'ОБЪЕДИНЕНИЕ','good');
assert.equal(g.labelCursor,1,'overlapping close label must be suppressed');
g.addWorldLabel([310,300,-18],'+33','good');
assert.equal(g.labelCursor,2,'non-overlapping close label should remain visible');
assert.equal(g.labelLayout.length,2);
g.endLabels();
const css=fs.readFileSync('style.css','utf8');assert(css.includes('white-space:nowrap'));
console.log('PASS: far labels stay hidden; close labels reserve screen space and suppress overlaps');
