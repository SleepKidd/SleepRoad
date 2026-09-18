'use strict';
(() => {
  const S=window.SleepRoadSystems,P=window.SleepRoad3D&&window.SleepRoad3D.prototype,C=S&&S.CrowdBatch&&S.CrowdBatch.prototype;
  if(!P||!C)throw new Error('Sleep Road v6 quality dependencies are missing');
  const PRESETS={
    high:{id:'high',maxCrowd:420,maxParticles:160,dpr:3.0,maxDimension:2880,maxPixels:4200000,trailRate:1,environmentDensity:1,environmentShadows:true,characterDetail:200,propDetail:1,weatherDensity:1,finishCrowd:20},
    medium:{id:'medium',maxCrowd:340,maxParticles:115,dpr:2.85,maxDimension:2688,maxPixels:3800000,trailRate:.82,environmentDensity:.86,environmentShadows:true,characterDetail:132,propDetail:.86,weatherDensity:.80,finishCrowd:15},
    low:{id:'low',maxCrowd:250,maxParticles:75,dpr:2.75,maxDimension:2400,maxPixels:3200000,trailRate:.58,environmentDensity:.62,environmentShadows:false,characterDetail:88,propDetail:.68,weatherDensity:.56,finishCrowd:10}
  };
  function initial(){
    const mem=Number(navigator.deviceMemory)||4,cores=Number(navigator.hardwareConcurrency)||4,dpr=Math.max(1,Number(devicePixelRatio)||1);
    if(mem<=2&&cores<=4)return'medium';
    if(cores>=6||mem>=6||dpr>=3)return'high';
    return'medium';
  }
  function ensure(g){
    if(!g.v6Quality)g.v6Quality={level:initial(),samples:[],cooldown:0,avgFps:60};
    return g.v6Quality;
  }
  function preset(g){return PRESETS[ensure(g).level];}
  function resolutionDpr(g,level=ensure(g).level){
    const p=PRESETS[level]||PRESETS.medium,w=Math.max(1,g.w||innerWidth||1),h=Math.max(1,g.h||innerHeight||1),device=Math.max(1,Number(devicePixelRatio)||1);
    let cap=p.dpr;
    const gl=g.renderer&&g.renderer.gl,maxHw=gl&&gl.getParameter?Number(gl.getParameter(gl.MAX_RENDERBUFFER_SIZE))||8192:8192;
    const maxDim=Math.min(p.maxDimension||2880,maxHw);
    cap=Math.min(cap,maxDim/Math.max(w,h));
    cap=Math.min(cap,Math.sqrt((p.maxPixels||4200000)/(w*h)));
    return Math.max(1,Math.min(device,cap));
  }
  function resizeToQuality(g,level=ensure(g).level){
    if(!g.renderer||!g.w||!g.h)return 1;
    const dpr=resolutionDpr(g,level);g.dpr=dpr;g.renderer.resize(g.w,g.h,dpr);return dpr;
  }
  function apply(g,level){
    const q=ensure(g);if(!PRESETS[level]||q.level===level)return false;q.level=level;q.cooldown=10;q.samples=[];g.v6Particles&&g.v6Particles.splice(PRESETS[level].maxParticles);resizeToQuality(g,level);return true;
  }
  function sample(g,dt){
    const q=ensure(g);if(dt<=0||dt>.08)return;q.cooldown=Math.max(0,q.cooldown-dt);q.samples.push(1/dt);if(q.samples.length>300)q.samples.shift();if(q.samples.length<180||q.cooldown>0)return;
    const sorted=q.samples.slice().sort((a,b)=>a-b),trim=sorted.slice(12,-12),avg=trim.reduce((a,b)=>a+b,0)/Math.max(1,trim.length);q.avgFps=avg;
    if(avg<38&&q.level==='high')apply(g,'medium');else if(avg<32&&q.level==='medium')apply(g,'low');else if(avg>50&&q.level==='low')apply(g,'medium');else if(avg>56&&q.level==='medium'&&((Number(navigator.hardwareConcurrency)||4)>=6||(Number(navigator.deviceMemory)||4)>=4))apply(g,'high');
  }
  const oldDraw=C.draw;
  C.draw=function(count,rootX,rootZ,color,time,opts={}){
    const game=window.__sleepRoad,q=game?preset(game):PRESETS.high,renderCount=Math.min(Math.max(1,Math.round(count)),q.maxCrowd);
    return oldDraw.call(this,renderCount,rootX,rootZ,color,time,opts);
  };
  const oldResize=P.resize;
  P.resize=function(){oldResize.call(this);resizeToQuality(this);};
  const oldUpdate=P.update;
  P.update=function(dt){oldUpdate.call(this,dt);sample(this,dt);};
  window.SleepRoadQualityV6={PRESETS,initial,ensure,preset,resolutionDpr,resizeToQuality,apply,sample};
})();
