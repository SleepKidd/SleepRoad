'use strict';
(() => {
  const S=window.SleepRoadSystems,V13=window.SleepRoadExperienceV13,P=window.SleepRoad3D&&window.SleepRoad3D.prototype;
  if(!S||!P)throw new Error('Sleep Road Car Hazard v14 dependencies are missing');
  const {compose,clamp,COLORS}=S;
  const CAR_CHANCE=1,SECOND_CAR_CHANCE=0,LANES=[-3.05,0,3.05],CAR_WIDTH=2.65,CAR_LENGTH=4.66,MODEL_SCALE=.88,MODEL_TRIANGLES=13110;
  const hash=n=>{const x=Math.sin(n*91.713+17.31)*43758.5453123;return x-Math.floor(x);};

  function carEventFor(){return true;}
  function doubleCarEventFor(){return false;}
  function ensure(g){
    if(!g.v14)g.v14={car:null,cars:[],gpuMeshes:null,modelReady:false};
    return g.v14;
  }
  function decodeBytes(b64){
    const raw=atob(b64),out=new Uint8Array(raw.length);
    for(let i=0;i<raw.length;i++)out[i]=raw.charCodeAt(i)&255;
    return out;
  }
  function decodeF32(b64){
    const b=decodeBytes(b64);
    if(b.byteLength%4)throw new Error('Invalid pickup float buffer');
    const v=new DataView(b.buffer,b.byteOffset,b.byteLength),out=new Float32Array(b.byteLength>>2);
    for(let i=0;i<out.length;i++)out[i]=v.getFloat32(i*4,true);
    return out;
  }
  function decodeU16(b64){
    const b=decodeBytes(b64);
    if(b.byteLength%2)throw new Error('Invalid pickup index buffer');
    const v=new DataView(b.buffer,b.byteOffset,b.byteLength),out=new Uint16Array(b.byteLength>>1);
    for(let i=0;i<out.length;i++)out[i]=v.getUint16(i*2,true);
    return out;
  }
  function buildCarMeshes(g){
    if(g.__carGpuMeshes)return g.__carGpuMeshes;
    const model=window.SleepRoadCarModel;
    if(!model?.meta||!model?.groups?.length||!model.p32||!model.n32)return[];
    const positions=model.__positions||(model.__positions=decodeF32(model.p32));
    const normals=model.__normals||(model.__normals=decodeF32(model.n32));
    const expected=model.meta.runtimeVerts*3;
    if(positions.length!==expected||normals.length!==expected)throw new Error('Invalid full-resolution pickup geometry');
    g.__carGpuMeshes=model.groups.map(group=>{
      const indices=group.__indices||(group.__indices=decodeU16(group.i));
      if(indices.length!==group.tris*3)throw new Error('Invalid pickup material group: '+group.name);
      return{
        mesh:g.renderer.createMesh({positions,normals,indices}),
        color:group.color,
        alpha:group.alpha??1,
        emissive:group.emissive||0,
        name:group.name,
        tris:group.tris
      };
    });
    return g.__carGpuMeshes;
  }
  function pickDistance(g,seed,slot=0){
    const min=92,max=Math.max(min+70,(g.levelLength||300)-118),mid=(min+max)*.5,margin=18;
    let lo=slot===0?min:mid+margin,hi=slot===0?mid-margin:max;
    if(hi<=lo+12){lo=min+(max-min)*(slot*.48);hi=max-(max-min)*((1-slot)*.48);}
    let d=lo+hash(seed*18.731+4.6)*Math.max(12,hi-lo);
    for(let pass=0;pass<7;pass++){
      const blocked=(g.objects||[]).some(o=>['enemy','finish','gate','obstacle','jump'].includes(o.type)&&Math.abs((o.distance||0)-d)<13);
      if(!blocked)break;
      d+=11;if(d>hi)d=lo+4+pass*5;
    }
    return clamp(d,min,max);
  }
  function makeCar(g,slot=0){
    const level=g.level||1,spawnRoll=slot===0?0:Math.random(),runSeed=level+slot*131.37+Math.random()*997;
    const laneIndex=Math.floor(hash(runSeed*33.19+7.4)*LANES.length)%LANES.length,speed=10.8+hash(runSeed*12.57+9.2)*3.4,meetDistance=pickDistance(g,runSeed,slot),roadSpeed=Math.max(1,g.baseSpeed||9.5),hitPlane=(g.playerZ||1.6)+.20;
    const approachTravel=roadSpeed*(58+hitPlane)/(roadSpeed+speed),distance=meetDistance+58-approachTravel;
    return{
      active:true,started:false,done:false,hit:false,warned:false,slot,
      x:LANES[laneIndex],distance,meetDistance,speed,spawnRoll,advance:0,z:-999,prevZ:-999
    };
  }
  function makeCars(g){return[makeCar(g,0)];}
  function staticCarZ(g,car){return-car.distance+(g.travel||0);}
  function currentCarZ(g,car){return car.started?car.z:staticCarZ(g,car);}
  function laneHitCount(g,car){
    const count=Math.max(1,Math.round(g.playerCount||0)),formation=g.crowdBatch.formation(count);
    if(!formation.length)return 0;
    let hits=0;const radius=CAR_WIDTH*.5+.31;
    for(const q of formation)if(Math.abs((g.playerX||0)+q.x-car.x)<radius)hits++;
    return Math.ceil(hits*count/formation.length);
  }
  function protectionBlocks(g){
    if(typeof g.tryBlockDamage==='function')return !!g.tryBlockDamage('car');
    if((g.invulnTimer||0)>0){g.toast?.('НЕУЯЗВИМОСТЬ БЛОКИРУЕТ МАШИНУ!',650);g.updateMissionUI?.();return true;}
    if((g.shield||0)>0){g.shield=Math.max(0,(g.shield||0)-1);g.toast?.('ЩИТ СПАС ОТ МАШИНЫ!',950);g.audio?.good?.();g.shake=Math.max(g.shake||0,6);g.flash=Math.max(g.flash||0,.18);g.updateMissionUI?.();return true;}
    return false;
  }
  function knockPeople(g,car){
    car.hit=true;const raw=laneHitCount(g,car);
    if(raw<=0){g.toast?.('МАШИНА МИМО!',700);g.audio?.tone?.(390,.06,'triangle',.012,1.25);return 0;}
    if(protectionBlocks(g)){
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
  function updateCar(g,car,dt){
    if(!car||car.done||g.state!=='running')return;
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
  function updateCars(g,dt){for(const car of ensure(g).cars)updateCar(g,car,dt);}
  function groundY(g,z){return(V13?.elevationAt?.(g,(g.travel||0)-z)||0)+.035;}
  function drawCar(g,car){
    if(!car||car.done)return;
    const z=currentCarZ(g,car);
    if(z<-92||z>19)return;

    const r=g.renderer,m=g.meshes,y=groundY(g,z),asset=window.SleepRoadCarModel,bounds=asset?.meta?.bounds;
    const lo=bounds?.min||[-1.579805,.234096,-3.017546],hi=bounds?.max||[1.353162,3.296137,2.274039];
    const centerX=(lo[0]+hi[0])*.5,centerZ=(lo[2]+hi[2])*.5;
    const model=compose(
      car.x-centerX*MODEL_SCALE,
      y-lo[1]*MODEL_SCALE,
      z-centerZ*MODEL_SCALE,
      0,0,0,
      MODEL_SCALE,MODEL_SCALE,MODEL_SCALE
    );

    // Contact shadow + magenta underglow from the Blender reference.
    r.draw(m.cylinder,compose(car.x,y+.008,z-.05,0,0,0,1.46,.012,2.48),[.025,.03,.038],.15);
    const glow=[.98,.04,.46];
    r.draw(m.sphere,compose(car.x-.64,y+.028,z-.62,0,0,0,.92,.024,1.18),glow,.09);
    r.draw(m.sphere,compose(car.x+.64,y+.028,z-.62,0,0,0,.92,.024,1.18),glow,.09);

    // Source MTL colors stay untouched; only lamp materials receive a small emissive-looking boost.
    for(const part of buildCarMeshes(g)){
      const color=part.emissive>0
        ?part.color.map(v=>clamp(v*(1+part.emissive*.45)+part.emissive*.14,0,1))
        :part.color;
      r.draw(part.mesh,model,color,part.alpha);
    }

    // Soft headlight spill. The front of this Blender/OBJ model points toward +Z.
    const lamp=[1,.80,.34];
    r.draw(m.sphere,compose(car.x-.56,y+.030,z+2.72,0,0,0,.46,.018,1.42),lamp,.045);
    r.draw(m.sphere,compose(car.x+.56,y+.030,z+2.72,0,0,0,.46,.018,1.42),lamp,.045);
    if(z>-48&&z<-7)g.addWorldLabel?.([car.x,y+3.20,z+.35],'МАШИНА!','bad');
  }

  function drawCars(g){for(const car of ensure(g).cars)drawCar(g,car);}

  const oldStart=P.startLevel;
  P.startLevel=function(level){
    oldStart.call(this,level);this.v14=null;const state=ensure(this);state.cars=makeCars(this);state.car=state.cars[0]||null;
  };

  const oldUpdate=P.update;
  P.update=function(dt){oldUpdate.call(this,dt);updateCars(this,dt);};

  const oldCourse=P.drawCourse;
  P.drawCourse=function(){const out=oldCourse.call(this);drawCars(this);return out;};

  window.SleepRoadCarHazardV14={
    CAR_CHANCE,SECOND_CAR_CHANCE,LANES,CAR_WIDTH,CAR_LENGTH,MODEL_TRIANGLES,carEventFor,doubleCarEventFor,ensure,makeCar,makeCars,staticCarZ,currentCarZ,laneHitCount,protectionBlocks,knockPeople,buildCarMeshes
  };
})();
