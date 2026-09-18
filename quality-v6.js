'use strict';
(() => {
  const S=window.SleepRoadSystems,P=window.SleepRoad3D&&window.SleepRoad3D.prototype,C=S&&S.CrowdBatch&&S.CrowdBatch.prototype;
  if(!P||!C)throw new Error('Sleep Road v6 quality dependencies are missing');
  const PRESETS={
    high:{id:'high',maxCrowd:420,maxParticles:150,dpr:1.7,trailRate:1},
    medium:{id:'medium',maxCrowd:310,maxParticles:95,dpr:1.35,trailRate:.7},
    low:{id:'low',maxCrowd:220,maxParticles:55,dpr:1.0,trailRate:.42}
  };
  function initial(){
    const mem=Number(navigator.deviceMemory)||4,cores=Number(navigator.hardwareConcurrency)||4;
    if(mem<=2||cores<=4)return'low';
    if(mem<=4||cores<=6)return'medium';
    return'high';
  }
  function ensure(g){
    if(!g.v6Quality)g.v6Quality={level:initial(),samples:[],cooldown:0,avgFps:60};
    return g.v6Quality;
  }
  function preset(g){return PRESETS[ensure(g).level];}
  function apply(g,level){
    const q=ensure(g);if(!PRESETS[level]||q.level===level)return false;q.level=level;q.cooldown=8;q.samples=[];g.v6Particles&&g.v6Particles.splice(PRESETS[level].maxParticles);if(g.renderer&&g.w&&g.h){g.dpr=Math.min(PRESETS[level].dpr,Math.max(1,devicePixelRatio||1));g.renderer.resize(g.w,g.h,g.dpr);}return true;
  }
  function sample(g,dt){
    const q=ensure(g);if(dt<=0||dt>.08)return;q.cooldown=Math.max(0,q.cooldown-dt);q.samples.push(1/dt);if(q.samples.length>180)q.samples.shift();if(q.samples.length<120||q.cooldown>0)return;
    const sorted=q.samples.slice().sort((a,b)=>a-b),trim=sorted.slice(12,-12),avg=trim.reduce((a,b)=>a+b,0)/Math.max(1,trim.length);q.avgFps=avg;
    if(avg<46&&q.level==='high')apply(g,'medium');else if(avg<42&&q.level==='medium')apply(g,'low');else if(avg>57&&q.level==='low')apply(g,'medium');else if(avg>59&&q.level==='medium'&&(Number(navigator.deviceMemory)||4)>=4)apply(g,'high');
  }
  const oldDraw=C.draw;
  C.draw=function(count,rootX,rootZ,color,time,opts={}){
    const game=window.__sleepRoad,q=game?preset(game):PRESETS.high,renderCount=Math.min(Math.max(1,Math.round(count)),q.maxCrowd);
    return oldDraw.call(this,renderCount,rootX,rootZ,color,time,opts);
  };
  const oldResize=P.resize;
  P.resize=function(){oldResize.call(this);const q=preset(this);this.dpr=Math.min(q.dpr,Math.max(1,devicePixelRatio||1));this.renderer.resize(this.w,this.h,this.dpr);};
  const oldUpdate=P.update;
  P.update=function(dt){oldUpdate.call(this,dt);sample(this,dt);};
  window.SleepRoadQualityV6={PRESETS,initial,ensure,preset,apply,sample};
})();
