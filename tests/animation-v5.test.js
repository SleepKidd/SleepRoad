'use strict';
const assert=require('assert');
const fs=require('fs');
const vm=require('vm');

global.window=global;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const lerp=(a,b,t)=>a+(b-a)*t;
class CrowdBatch{}
CrowdBatch.prototype.draw=function(){};
function Game(){}
for(const name of ['drawCourse','drawFinishScene','drawEnemy','setCamera','drawPowerup','drawJump','drawGate','drawObstacle','drawBonusGate','drawFinishGate','updateEffectsV5','collectJump','applyGate','collectPowerup','collectZone','hitObstacle','beginBattle','beginFinish'])Game.prototype[name]=function(){if(name==='collectJump')this.jumpTimer=2.35;if(name==='hitObstacle')return{contact:true,damage:false};};
global.SleepRoadSystems={compose(){return new Float32Array(16);},COLORS:{gold:[1,.72,.09]},clamp,lerp,DEG:Math.PI/180,CrowdBatch};
global.Mini3D={multiply(){return new Float32Array(16);}};
global.SleepRoad3D=Game;
vm.runInThisContext(fs.readFileSync('animation-v5.js','utf8'),{filename:'animation-v5.js'});
const A=global.SleepRoadAnimationV5;
assert(A);
assert.equal(A.JUMP_DURATION,2.35);
const start=A.jumpArc(2.35),mid=A.jumpArc(1.175),end=A.jumpArc(0);
assert(Math.abs(start.y)<1e-9&&Math.abs(end.y)<1e-9);
assert(mid.y>2.0&&mid.air>.99);
assert(start.vertical>.99&&end.vertical<-.99);
assert.equal(A.smoothstep(-1),0);
assert.equal(A.smoothstep(2),1);
const g=new Game();
g.shake=0;
g.__anim=null;
g.collectJump();
assert.equal(g.jumpTimer,2.35);
assert.equal(g.__jumpAnimDuration,2.35);
assert(g.__anim.takeoff>0);
console.log('PASS: animation helpers and jump state');
