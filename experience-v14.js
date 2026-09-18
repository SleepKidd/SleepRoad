'use strict';
(() => {
  const S=window.SleepRoadSystems,V13=window.SleepRoadExperienceV13,P=window.SleepRoad3D&&window.SleepRoad3D.prototype;
  if(!S||!P)throw new Error('Sleep Road Car Hazard v14 dependencies are missing');
  const {compose,clamp,COLORS}=S;
  const CAR_CHANCE=.5,LANES=[-3.05,0,3.05],CAR_WIDTH=2.0,CAR_LENGTH=4.55,MODEL_TRIANGLES=696;
  const hash=n=>{const x=Math.sin(n*91.713+17.31)*43758.5453123;return x-Math.floor(x);};

  function carEventFor(level){
    level=Math.max(1,Math.floor(level||1));
    return hash(level*57.119+2.7)<CAR_CHANCE;
  }
  function ensure(g){
    if(!g.v14)g.v14={car:null,gpuMeshes:null,modelReady:false};
    return g.v14;
  }
  function decodeBytes(b64){
    const raw=atob(b64),out=new Uint8Array(raw.length);
    for(let i=0;i<raw.length;i++)out[i]=raw.charCodeAt(i)&255;
    return out;
  }
  function decodeU16(b64){
    const b=decodeBytes(b64),v=new DataView(b.buffer,b.byteOffset,b.byteLength),out=new Uint16Array(b.length>>1);
    for(let i=0;i<out.length;i++)out[i]=v.getUint16(i*2,true);
    return out;
  }
  function buildCarMeshes(g){
    if(g.__carGpuMeshes)return g.__carGpuMeshes;
    const model=window.SleepRoadCarModelGLB;if(!model?.meta||!model?.groups?.length)return[];
    const lo=model.meta.bounds.min,hi=model.meta.bounds.max,qp=decodeU16(model.p),nb=decodeBytes(model.n),positions=new Float32Array(qp.length),normals=new Float32Array(nb.length);
    for(let i=0;i<qp.length;i++){const axis=i%3;positions[i]=lo[axis]+(qp[i]/65535)*(hi[axis]-lo[axis]);}
    for(let i=0;i<nb.length;i++){const signed=nb[i]>127?nb[i]-256:nb[i];normals[i]=clamp(signed/127,-1,1);}
    g.__carGpuMeshes=model.groups.map(group=>{
      const indices=decodeU16(group.i);
      return{mesh:g.renderer.createMesh({positions,normals,indices}),color:group.color,tris:group.tris};
    });
    return g.__carGpuMeshes;
  }
  function pickDistance(g,level){
    const min=92,max=Math.max(min+20,(g.levelLength||300)-118),span=Math.max(20,max-min);
    let d=min+hash(level*18.731+4.6)*span;
    for(let pass=0;pass<7;pass++){
      const blocked=(g.objects||[]).some(o=>['enemy','finish','gate','obstacle','jump'].includes(o.type)&&Math.abs((o.distance||0)-d)<13);
      if(!blocked)break;
      d+=17;if(d>max)d=min+8+pass*9;
    }
    return clamp(d,min,max);
  }
  function makeCar(g){
    const level=g.level||1,spawnRoll=Math.random();if(spawnRoll>=CAR_CHANCE)return null;
    const runSeed=level+Math.random()*997,laneIndex=Math.floor(hash(runSeed*33.19+7.4)*LANES.length)%LANES.length,speed=10.8+hash(runSeed*12.57+9.2)*3.4,meetDistance=pickDistance(g,runSeed),roadSpeed=Math.max(1,g.baseSpeed||9.5),hitPlane=(g.playerZ||1.6)+.20;
    const approachTravel=roadSpeed*(58+hitPlane)/(roadSpeed+speed),distance=meetDistance+58-approachTravel;
    return{
      active:true,started:false,done:false,hit:false,warned:false,
      x:LANES[laneIndex],distance,meetDistance,speed,spawnRoll,advance:0,z:-999,prevZ:-999
    };
  }
  function staticCarZ(g,car){return-car.distance+(g.travel||0);}
  function currentCarZ(g,car){return car.started?car.z:staticCarZ(g,car);}
  function laneHitCount(g,car){
    const count=Math.max(1,Math.round(g.playerCount||0)),formation=g.crowdBatch.formation(count);
    if(!formation.length)return 0;
    let hits=0;const radius=CAR_WIDTH*.5+.31;
    for(const q of formation)if(Math.abs((g.playerX||0)+q.x-car.x)<radius)hits++;
    return Math.ceil(hits*count/formation.length);
  }
  function knockPeople(g,car){
    car.hit=true;const raw=laneHitCount(g,car);
    if(raw<=0){g.toast?.('МАШИНА МИМО!',700);g.audio?.tone?.(390,.06,'triangle',.012,1.25);return 0;}
    if(g.shield>0){
      g.shield=0;g.toast?.('ЩИТ СПАС ОТ МАШИНЫ!',950);g.audio?.good?.();g.shake=Math.max(g.shake,6);g.flash=Math.max(g.flash,.18);
      try{navigator.vibrate?.([18,20,18]);}catch{}return 0;
    }
    const maxLoss=Math.max(1,Math.ceil(g.playerCount*.40)),loss=clamp(raw,1,maxLoss),start=g.knockouts?.length||0;
    g.spawnKnockouts(loss);
    for(let i=start;i<(g.knockouts?.length||0);i++){
      const k=g.knockouts[i],side=Math.sign(k.x-car.x)||((i&1)?1:-1);
      k.vz=6.8+Math.random()*4.8;k.vx+=side*(2.4+Math.random()*2.4);k.vy+=1.7+Math.random()*1.4;k.life=Math.max(k.life||0,1.55);k.maxLife=Math.max(k.maxLife||0,1.55);
    }
    g.playerCount=Math.max(0,g.playerCount-loss);
    g.visualCount=Math.min(g.visualCount,g.playerCount+Math.min(loss,12));
    g.setCrowdCount(g.playerCount,true);g.tookDamage=true;g.audio?.hit?.();g.shake=Math.max(g.shake,16);g.flash=Math.max(g.flash,.40);
    g.toast?.(`МАШИНА СБИЛА: ${loss}`,1050);g.updateMissionUI?.();
    try{navigator.vibrate?.([35,25,55]);}catch{}
    if(g.playerCount<=0)g.fail?.();
    return loss;
  }
  function warnCar(g,car){
    if(car.warned)return;car.warned=true;g.toast?.('⚠ МАШИНА!',720);
    g.audio?.tone?.(220,.10,'square',.022,.82);setTimeout(()=>g.audio?.tone?.(185,.12,'square',.018,.82),105);
    try{navigator.vibrate?.([16,36,16]);}catch{}
  }
  function updateCar(g,dt){
    const car=ensure(g).car;if(!car||car.done||g.state!=='running')return;
    const base=staticCarZ(g,car);
    if(!car.started){
      car.z=base;car.prevZ=base;
      if(base>-58){car.started=true;car.z=base;car.prevZ=base;}
      else return;
    }
    car.prevZ=car.z;car.advance+=car.speed*dt;car.z=staticCarZ(g,car)+car.advance;
    if(!car.warned&&car.z>-30)warnCar(g,car);
    const hitPlane=(g.playerZ||1.6)+.20;
    if(!car.hit&&car.prevZ<hitPlane&&car.z>=hitPlane)knockPeople(g,car);
    if(car.z>24)car.done=true;
  }
  function groundY(g,z){return(V13?.elevationAt?.(g,(g.travel||0)-z)||0)+.035;}
  function drawCar(g){
    const car=ensure(g).car;if(!car||car.done)return;const z=currentCarZ(g,car);
    if(z<-92||z>19)return;const r=g.renderer,m=g.meshes,y=groundY(g,z),model=compose(car.x,y,z,0,0,0,1,1,1);
    r.draw(m.cylinder,compose(car.x,y+.012,z-.08,0,0,0,1.02,.014,2.12),[.035,.04,.05],.15);
    for(const part of buildCarMeshes(g))r.draw(part.mesh,model,part.color,1);
    if(z>-48){
      for(const x of[-.57,.57])r.draw(m.sphere,compose(car.x+x,y+.62,z+2.13,0,0,0,.085,.065,.045),[1,.90,.64],.82);
      if(z<-7)g.addWorldLabel?.([car.x,y+2.34,z+.35],'МАШИНА!','bad');
    }
  }

  const oldStart=P.startLevel;
  P.startLevel=function(level){oldStart.call(this,level);this.v14=null;const s=ensure(this);s.car=makeCar(this);};

  const oldUpdate=P.update;
  P.update=function(dt){oldUpdate.call(this,dt);updateCar(this,dt);};

  const oldCourse=P.drawCourse;
  P.drawCourse=function(){const out=oldCourse.call(this);drawCar(this);return out;};

  window.SleepRoadCarHazardV14={
    CAR_CHANCE,LANES,CAR_WIDTH,CAR_LENGTH,MODEL_TRIANGLES,carEventFor,ensure,makeCar,staticCarZ,currentCarZ,laneHitCount,knockPeople,buildCarMeshes
  };
})();
