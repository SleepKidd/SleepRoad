'use strict';
(() => {
  const S=window.SleepRoadSystems,D=window.SleepRoadLevelDirector,R=window.SleepRoadProgressionV6,Q=window.SleepRoadQualityV6,E8=window.SleepRoadEnvironmentV8,V11=window.SleepRoadExperienceV11,V12=window.SleepRoadExperienceV12,P=window.SleepRoad3D&&window.SleepRoad3D.prototype,C=S&&S.CrowdBatch&&S.CrowdBatch.prototype;
  if(!S||!D||!R||!Q||!E8||!V11||!V12||!P||!C)throw new Error('Sleep Road Experience v13 dependencies are missing');
  const {compose,COLORS,clamp,lerp,RNG,isGoodGate}=S,TAU=Math.PI*2;
  const mix=(a,b,t)=>a.map((v,i)=>v+(b[i]-v)*t);
  const smooth=t=>{t=clamp(t,0,1);return t*t*(3-2*t);};
  const hash=n=>{const x=Math.sin(n*91.713+17.131)*43758.5453;return x-Math.floor(x);};

  const SETPIECES=['trainCrossing','collapseBridge','giantDoors','tunnelRun','industrialLift','rainChase'];
  const V13_RARE_IDS=['doubleBoss','nightRun','noGates','moonStorm','giantObstacles','lowGravity'];
  const DESTRUCTIBLE=new Set(['barrier','poles']);
  const PHASE_COLORS=[
    null,
    [.98,.28,.15],
    [1,.09,.05]
  ];

  function makeFragments(n=42){return Array.from({length:n},()=>({active:false,life:0,max:0,x:0,y:0,z:0,vx:0,vy:0,vz:0,size:.1,spin:0,color:[1,1,1],kind:0}));}
  function ensure(g){
    if(!g.v13)g.v13={
      crowd:{squeeze:0,stretch:0,shock:0},
      setpieces:[],setpieceInstalled:false,
      death:null,fragments:makeFragments(48),
      bossPhase:1,bossPhasePulse:0,musicPulse:0,
      night:false,moonStorm:false,lowGravity:false,giantObstacles:false,noGates:false,doubleBoss:false,
      reflectPulse:0
    };
    return g.v13;
  }
  function qualityDetail(g){const q=Q.preset(g);return q.id==='high'?1:q.id==='medium'?.78:.56;}

  function baseElevation(g,d){
    const amp=.26+Math.min(.46,Math.max(0,(g.level||1)-1)*.008),seed=(g.level||1)*.73;
    const a=(Math.sin(d*.024+seed)+1)*.5,b=(Math.sin(d*.052+seed*1.63)+1)*.5;
    return .16+amp*(a*.68+b*.32);
  }
  function setpieceLift(g,d){
    const s=ensure(g);let add=0;
    for(const o of s.setpieces){
      if(o.kind!=='collapseBridge'&&o.kind!=='industrialLift')continue;
      const span=o.kind==='industrialLift'?22:18,x=1-Math.abs(d-o.distance)/span;if(x>0)add+=smooth(x)*(o.kind==='industrialLift'?.34:.22);
    }
    return add;
  }
  function elevationAt(g,d){return baseElevation(g,d)+setpieceLift(g,d);}

  function elevateMatrix(g,mat){
    if(!mat||mat.length!==16)return mat;
    const out=new Float32Array(mat),z=out[14],y=out[13];
    if(z<20&&z>-112&&y<8.6)out[13]+=elevationAt(g,(g.travel||0)-z);
    return out;
  }
  function elevateMatrices(g,mats,count){
    const out=new Float32Array(mats);
    for(let i=0;i<count;i++){const o=i*16,z=out[o+14],y=out[o+13];if(z<20&&z>-112&&y<8.6)out[o+13]+=elevationAt(g,(g.travel||0)-z);}
    return out;
  }
  function withElevation(g,fn){
    const r=g.renderer,rawDraw=r.draw,rawInst=r.drawInstances,rawLabel=g.addWorldLabel;
    r.draw=function(mesh,mat,color,alpha=1){return rawDraw.call(r,mesh,elevateMatrix(g,mat),color,alpha);};
    r.drawInstances=function(mesh,mats,colors,count){return rawInst.call(r,mesh,elevateMatrices(g,mats,count),colors,count);};
    if(rawLabel)g.addWorldLabel=function(world,...rest){const w=world.slice();if(w[2]<20&&w[2]>-112)w[1]+=elevationAt(g,(g.travel||0)-w[2]);return rawLabel.call(g,w,...rest);};
    try{return fn();}finally{r.draw=rawDraw;r.drawInstances=rawInst;if(rawLabel)g.addWorldLabel=rawLabel;}
  }

  function drawElevationRoad(g){
    if(g.state==='menu')return;const r=g.renderer,m=g.meshes,p=g.biome?.palette||{},detail=qualityDetail(g),seg=detail>.7?6.5:8.0;
    for(let z=14;z>-98;z-=seg){
      const d0=(g.travel||0)-z,d1=d0+seg,h0=elevationAt(g,d0),h1=elevationAt(g,d1),h=(h0+h1)*.5,rx=Math.atan2(h1-h0,seg),road=p.road||COLORS.road,edge=p.roadEdge||COLORS.roadEdge,stripe=p.stripe||COLORS.roadStripe;
      r.draw(m.box,compose(0,h-.09,z-seg*.5,rx,0,0,12.05,.18,seg+.28),road,.99);
      r.draw(m.box,compose(-6.18,h-.015,z-seg*.5,rx,0,0,.28,.12,seg+.30),edge,.96);
      r.draw(m.box,compose(6.18,h-.015,z-seg*.5,rx,0,0,.28,.12,seg+.30),edge,.96);
      if((Math.floor((d0+2)/8)&1)===0)r.draw(m.box,compose(0,h+.012,z-seg*.5,rx,0,0,.12,.025,Math.min(3.2,seg*.52)),stripe,.90);
    }
  }

  function nearestGatePressure(g){
    let best=99;
    for(const o of g.objects||[]){if(o.type!=='gate'||o.processed)continue;const z=g.objectZ(o),dz=(g.playerZ||1.6)-z;if(dz>0&&dz<best)best=dz;}
    return best<10?clamp(1-best/10,0,1):0;
  }
  function updateCrowdPhysics(g,dt){
    const s=ensure(g),c=s.crowd,pressure=nearestGatePressure(g),strafe=Math.abs(g.__anim?.strafe||0);
    c.squeeze=lerp(c.squeeze,pressure,.10);c.stretch=lerp(c.stretch,strafe,.12);c.shock=Math.max(0,c.shock-dt*2.7);
  }
  const oldCrowdDraw=C.draw;
  C.draw=function(count,rootX,rootZ,color,time,opts={}){
    const g=window.__sleepRoad,isPlayer=!opts.enemy&&g,original=this.formation;
    if(!isPlayer)return oldCrowdDraw.call(this,count,rootX,rootZ,color,time,opts);
    const cp=ensure(g).crowd,motion=this.playerMotion||{},strafe=Math.abs(motion.strafe||0);
    this.formation=function(n){
      const base=original.call(this,n),metrics=this.metrics(n),depth=Math.max(.1,metrics.depth);
      return base.map(q=>{
        const front=1-clamp(q.z/depth,0,1),shock=cp.shock*front;
        return{...q,x:q.x*(1-cp.squeeze*.20+strafe*.08)*(1+shock*.09),z:q.z*(1+cp.stretch*.14)+shock*(.22+.22*front)};
      });
    };
    try{return oldCrowdDraw.call(this,count,rootX,rootZ,color,time,opts);}finally{this.formation=original;}
  };

  function phaseFor(e){
    const ratio=e.count/Math.max(1,e.maxCount||e.count||1);
    if(e.majorBoss&&ratio<=.25)return 3;
    if(ratio<=.50)return 2;
    return 1;
  }
  function bossSpeed(e){return e.v13Phase>=3?1.24:e.v13Phase>=2?1.12:1;}
  function chooseBossAttack(g,e,cycle){
    const phase=e.v13Phase||1,crowd=g.playerCount||1;
    let pool=phase>=3?['slam','stomp','sweep','punch','slam']:phase===2?['slam','sweep','stomp','punch']:['punch','sweep','stomp','slam'];
    if(crowd>=130)pool=phase>=2?['slam','stomp','sweep','slam']:['slam','stomp','punch'];
    else if(crowd<=40)pool=phase>=2?['sweep','punch','stomp']:['punch','sweep'];
    let pick=pool[Math.floor(hash((g.level||1)*17.3+cycle*5.9+crowd*.013)*pool.length)%pool.length];
    if(pick===e.v13LastAttack&&pool.length>1)pick=pool[(pool.indexOf(pick)+1)%pool.length];
    return pick;
  }
  function phaseColor(g,e){
    const base=V11.BOSS_VARIANTS?.[clamp(g.profile?.chapter||0,0,4)]?.main||g.biome?.palette?.bad||COLORS.red,phase=e.v13Phase||1;
    return phase===1?base:mix(base,PHASE_COLORS[phase-1]||COLORS.red,phase===3?.62:.38);
  }
  function phaseTransition(g,e,next){
    if(next===(e.v13Phase||1))return;
    e.v13Phase=next;const s=ensure(g);s.bossPhase=next;s.bossPhasePulse=1.3;s.musicPulse=0;
    g.flash=Math.max(g.flash,next===3?.34:.22);g.shake=Math.max(g.shake,next===3?10:6);
    g.toast?.(next===3?'BOSS RAGE · PHASE 3':'BOSS PHASE 2',1000);
    g.audio?.tone?.(next===3?72:96,.28,'sawtooth',next===3?.042:.030,next===3?.62:.72);
    try{navigator.vibrate?.(next===3?[40,30,70]:[25,25,40]);}catch{}
  }
  function syncBossAI(g,e){
    if(!e?.boss)return;const next=phaseFor(e);phaseTransition(g,e,next);e.v13Phase=next;
    const cycle=Math.floor((e.battleTicks||0)/18);
    if(cycle!==e.v13Cycle){e.v13Cycle=cycle;const attack=chooseBossAttack(g,e,cycle);e.v13LastAttack=attack;e.v11AttackType=attack;e.v11Pattern=[attack,attack,attack,attack];}
    if(g.v11)g.v11.bossColor=phaseColor(g,e);
  }
  function drawBossPhaseAura(g,o,z){
    const phase=o.v13Phase||1;if(phase<2)return;const r=g.renderer,m=g.meshes,root=z-2.25,c=phaseColor(g,o),t=g.time,n=phase===3?8:5,rad=phase===3?1.65:1.35;
    for(let i=0;i<n;i++){const a=t*(phase===3?2.3:1.5)+i*TAU/n;r.draw(m.sphere,compose(Math.cos(a)*rad,2.25+Math.sin(a*1.7)*.42,root+Math.sin(a)*.55,0,0,0,.08+(phase===3?.03:0),.08,.08),c,.58);}
    r.draw(m.cylinder,compose(0,.055,root,0,0,0,2.3+(phase-2)*.5,.025,1.35+(phase-2)*.25),c,phase===3?.24:.14);
  }

  function acquireFragment(g){
    const pool=ensure(g).fragments;for(const p of pool)if(!p.active){p.active=true;return p;}let oldest=pool[0];for(const p of pool)if(p.life<oldest.life)oldest=p;oldest.active=true;return oldest;
  }
  function spawnFragments(g,x,y,z,count,color,power=1){
    const n=Math.min(count,Math.round(28*qualityDetail(g)));
    for(let i=0;i<n;i++){const p=acquireFragment(g),a=hash(g.time*29+i*4.1)*TAU,spd=(1.2+hash(i*7.7+g.time)*3.6)*power;Object.assign(p,{life:.6+hash(i*5.2)*.8,max:1.4,x:x+(hash(i*2.3)-.5)*.8,y,z:z+(hash(i*9.1)-.5)*.5,vx:Math.cos(a)*spd,vy:1.4+hash(i*3.9)*4.0,vz:Math.sin(a)*spd*.65,size:.07+hash(i*8.2)*.14,spin:(hash(i*11.3)-.5)*8,color,kind:i%3});}
  }
  function startBossDeath(g,e){
    const s=ensure(g);if(s.death)return;const c=phaseColor(g,e),gear=[];
    for(let i=0;i<6;i++){const a=i*TAU/6;gear.push({x:Math.cos(a)*.5,y:2.2+hash(i)*1.8,z:Math.sin(a)*.35,vx:Math.cos(a)*2.4,vy:2.0+hash(i+4)*2.7,vz:Math.sin(a)*1.5,spin:(i%2?1:-1)*(2.5+i*.3),kind:i%2});}
    s.death={life:1.9,max:1.9,z:e.battleZ-2.25,travel:g.travel,color:c,scale:e.bossScale||3.25,gear,cracks:Array.from({length:8},(_,i)=>({a:i*TAU/8+hash(i)*.22,len:1.0+hash(i+4)*2.4}))};
    spawnFragments(g,0,.9,e.battleZ-2.25,28,c,1.35);g.shake=Math.max(g.shake,14);g.flash=Math.max(g.flash,.38);
  }
  function updateDeath(g,dt){
    const s=ensure(g),d=s.death;if(!d)return;d.life-=dt;
    for(const p of d.gear){p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt;p.vy-=7.2*dt;p.spin+=dt*3;}
    if(d.life<=0)s.death=null;
  }
  function drawDeath(g){
    const d=ensure(g).death;if(!d)return;const p=1-d.life/d.max,z=d.z-(g.travel-d.travel),r=g.renderer,m=g.meshes,fade=clamp(d.life/.5,0,1),ring=smooth(clamp((p-.20)/.55,0,1))*4.8;
    if(p>.18)for(const crack of d.cracks){const x=Math.cos(crack.a)*crack.len*.48,zz=z+Math.sin(crack.a)*crack.len*.48;r.draw(m.box,compose(x,.035,zz,0,crack.a,0,crack.len,.025,.055),[.10,.09,.10],.55*fade);}
    if(ring>0&&ring<4.9)for(let i=0;i<12;i++){const a=i*TAU/12;r.draw(m.sphere,compose(Math.cos(a)*ring,.08,z+Math.sin(a)*ring*.55,0,0,0,.09,.045,.09),d.color,.36*fade);}
    for(const q of d.gear){const mesh=q.kind?m.cone:m.box;r.draw(mesh,compose(q.x,q.y,z+q.z,q.spin,q.spin*.5,0,.22,.22,.22),d.color,fade);}
  }
  function updateFragments(g,dt){for(const p of ensure(g).fragments){if(!p.active)continue;p.life-=dt;if(p.life<=0){p.active=false;continue;}p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt;p.vy-=8.5*dt;p.spin+=dt*4;}}
  function drawFragments(g){const r=g.renderer,m=g.meshes;for(const p of ensure(g).fragments){if(!p.active)continue;const a=clamp(p.life/p.max,0,1),mesh=p.kind===2?m.sphere:m.box;r.draw(mesh,compose(p.x,p.y,p.z,p.spin,p.spin*.5,0,p.size*(p.kind===1?1.8:1),p.size,p.size),p.color,a*.86);}}

  function installSetpiece(g){
    const s=ensure(g);if(s.setpieceInstalled)return;s.setpieceInstalled=true;
    if((g.level||1)<7||hash((g.level||1)*31.7+4.8)>.30)return;
    const kind=SETPIECES[(g.level+Math.floor(hash(g.level*8.2)*SETPIECES.length))%SETPIECES.length],distance=Math.max(76,Math.min((g.levelLength||260)-100,(g.levelLength||260)*(.43+hash(g.level*6.1)*.12)));
    s.setpieces.push({type:'v13SetPiece',kind,distance,phase:hash(g.level*2.8)*TAU,triggered:false});
  }
  function setpieceName(k){return k==='trainCrossing'?'TRAIN CROSSING':k==='collapseBridge'?'BRIDGE EVENT':k==='giantDoors'?'GIANT DOORS':k==='tunnelRun'?'TUNNEL RUN':k==='industrialLift'?'INDUSTRIAL LIFT':'RAIN CHASE';}
  function drawSetpiece(g,o,z){
    const front=(g.playerZ||1.6)-5.8;if(z>=front)return;const fade=clamp((front-z)/6,0,1),r=g.renderer,m=g.meshes,p=g.biome.palette,t=g.time+o.phase,d=qualityDetail(g);
    if(o.kind==='trainCrossing'){
      r.draw(m.box,compose(0,4.6,z,0,0,0,13.5,.24,.45),p.structure,.92*fade);const x=((t*.82)%22)-11;
      for(let i=-2;i<=2;i++){const xx=x+i*2.45;r.draw(m.box,compose(xx,3.75,z-.35,0,0,0,2.15,.90,.78),i%2?mix(p.structure,p.accent,.26):p.structure,.94*fade);}
    }else if(o.kind==='collapseBridge'){
      for(const side of[-1,1])r.draw(m.box,compose(side*6.35,.32,z,0,0,0,.32,.42,10),p.structure,.88*fade);
      for(let i=-3;i<=3;i++)r.draw(m.box,compose(i*1.55,.08-Math.abs(i)*.035,z+i*.20,0,0,i*.018,1.40,.20,2.2),i%2?p.road:mix(p.road,p.structure,.12),.96*fade);
    }else if(o.kind==='giantDoors'){
      const close=.45+.35*(Math.sin(t*.65)*.5+.5),gap=3.8+close*1.1;
      for(const side of[-1,1]){const x=side*(6.7-gap*.18);r.draw(m.box,compose(x,2.3,z,0,0,0,2.0,4.6,.72),p.structure,.92*fade);r.draw(m.box,compose(x-side*.72,2.3,z-.38,0,0,0,.12,3.8,.06),p.accent,.72*fade);}
    }else if(o.kind==='tunnelRun'){
      const n=d>.7?6:4;for(let i=0;i<n;i++){const zz=z-i*2.5;r.draw(m.box,compose(-6.1,2.1,zz,0,0,0,.34,4.2,.42),p.structure,.92*fade);r.draw(m.box,compose(6.1,2.1,zz,0,0,0,.34,4.2,.42),p.structure,.92*fade);r.draw(m.box,compose(0,4.15,zz,0,0,0,12.4,.32,.42),p.structure,.92*fade);}
    }else if(o.kind==='industrialLift'){
      for(const side of[-1,1]){const x=side*8.4,y=1.3+Math.sin(t*.72+side)*1.1;r.draw(m.cylinder,compose(x,2.2,z,0,0,0,.16,4.4,.16),p.structure,.9*fade);r.draw(m.box,compose(x-side*1.2,y,z,0,0,0,2.1,.28,2.2),p.accent,.72*fade);}
    }else{
      for(let i=0;i<(d>.7?10:6);i++){const x=(hash(i*3.3+o.distance)-.5)*11,y=.8+hash(i*7.4)*4,zz=z-i*.55;r.draw(m.box,compose(x,y,zz,.18,0,0,.025,.50,.025),[.58,.78,1],.48*fade);}
      r.draw(m.box,compose(0,3.7,z-2.2,0,0,0,12.2,.16,.30),mix(p.structure,p.accent,.18),.74*fade);
    }
  }
  function triggerSetpiece(g,o){
    if(o.triggered)return;o.triggered=true;g.toast?.(setpieceName(o.kind),800);g.shake=Math.max(g.shake,4);
    if(o.kind==='collapseBridge'||o.kind==='industrialLift')spawnFragments(g,0,.45,g.playerZ-2,14,g.biome.palette.structure,.72);
    if(o.kind==='rainChase'&&g.v12){g.v12.weatherType='rain';g.v12.weatherIntensity=1.3;g.v12.weatherBoost=1.4;}
  }

  function drawLivingWorld(g){
    if(g.state==='menu')return;const r=g.renderer,m=g.meshes,p=g.biome.palette,detail=qualityDetail(g),front=(g.playerZ||1.6)-6.0,count=detail>.7?5:3,span=96;
    for(let i=0;i<count;i++){
      // Oncoming decorative traffic always uses the player's right lane.
      // The pickup source points toward +Z, so yaw=0 means its nose faces the player
      // while z increases toward the camera/player. This avoids the old "driving backwards"
      // illusion and keeps traffic off the desert/grass shoulder.
      const progress=(g.travel||0)*.38+g.time*(2.4+i*.14);
      const z=-86+(((i*20.5+progress)%span)+span)%span;
      if(z>=front)continue;
      const x=4.18+(i%2)*.28,ground=elevationAt(g,(g.travel||0)-z);
      E8.drawDecorCar(g,x,z,i,{scale:.68,groundY:ground+.015,yaw:0,shadow:false});
    }
    if(g.biome?.id==='factory'||g.biome?.id==='neon')for(const side of[-1,1]){const x=side*10.8,z=-28-((g.travel*.35)%42),a=g.time*1.6*side;r.draw(m.cylinder,compose(x,2.0,z,0,0,0,.18,4,.18),p.structure,.88);for(let i=0;i<4;i++)r.draw(m.box,compose(x+Math.cos(a+i*TAU/4)*.75,3.2+Math.sin(a+i*TAU/4)*.75,z,0,0,a+i*TAU/4,1.15,.09,.12),p.accent,.68);}
  }

  function wetReflectionEnabled(g){
    const weather=g.v12?.weatherType;return g.biome?.id==='city'||g.biome?.id==='neon'||weather==='rain'||weather==='drizzle'||ensure(g).night;
  }
  function drawFakeReflections(g){
    if(!wetReflectionEnabled(g)||g.state==='menu')return;const r=g.renderer,m=g.meshes,p=g.biome.palette,detail=qualityDetail(g);
    for(let z=8;z>-76;z-=10){const h=elevationAt(g,(g.travel||0)-z);r.draw(m.box,compose(0,h+.018,z,0,0,0,10.6,.012,6.5),mix(p.road,p.accent,.12),.028+(g.biome.id==='neon'?.018:0));}
    let shown=0;for(const o of g.objects||[]){if(shown>8)break;const z=g.objectZ(o);if(z<-62||z>8)continue;const h=elevationAt(g,(g.travel||0)-z);
      if(o.type==='gate'){for(const [x,opt] of [[-2.55,o.left],[2.55,o.right]])r.draw(m.box,compose(x,h+.024,z+1.15,0,0,0,3.4,.012,4.2),isGoodGate(opt)?p.good:p.bad,.06);}
      else if(o.type==='moon'&&detail>.7)r.draw(m.box,compose(o.x,h+.024,z+.6,0,0,0,.25,.010,1.2),COLORS.gold,.055);
      else if(o.type==='obstacle')r.draw(m.box,compose(0,h+.023,z+.55,0,0,0,4.8,.010,1.7),p.bad,.035);shown++;
    }
  }

  function applyRareV13(g){
    const rare=g.v12?.rare,s=ensure(g);if(!rare||!V13_RARE_IDS.includes(rare.id))return;
    if(rare.id==='doubleBoss'){
      s.doubleBoss=true;const boss=(g.objects||[]).find(o=>o.boss&&o.finalBoss&&!o.processed);
      if(boss){const full=boss.maxCount||boss.count;boss.count=boss.maxCount=Math.max(24,Math.round(full*.82));const twinCount=Math.max(22,Math.round(full*.62));g.objects.push({type:'enemy',distance:boss.distance-13,count:twinCount,maxCount:twinCount,boss:true,finalBoss:false,majorBoss:false,soloBoss:true,bossScale:3.05,elite:true,name:'TWIN GIANT',processed:false,phase:(boss.phase||0)+1.7,v13Twin:true});}
    }else if(rare.id==='nightRun')s.night=true;
    else if(rare.id==='noGates'){s.noGates=true;g.objects=g.objects.filter(o=>o.type!=='gate');g.playerCount=clamp(g.playerCount+18,1,S.MAX_CROWD);g.visualCount=Math.max(g.visualCount,g.playerCount);g.setCrowdCount(g.playerCount,true);}
    else if(rare.id==='moonStorm'){s.moonStorm=true;const rng=new RNG(0x13aa71+g.level*811),end=(g.levelLength||260)-88;for(let d=58,i=0;d<end;d+=6.8,i++)g.objects.push({type:'moon',distance:d,x:Math.sin(i*.88)*3.6,processed:false,bonus:i%7===6,spin:rng.range(0,TAU)});}
    else if(rare.id==='giantObstacles'){s.giantObstacles=true;for(const o of g.objects)if(o.type==='obstacle')o.v13Giant=true;g.objects.push({type:'powerup',kind:'shield',distance:52,x:0,processed:false,spin:0});}
    else if(rare.id==='lowGravity')s.lowGravity=true;
    g.objects.sort((a,b)=>a.distance-b.distance);
  }

  function breakThreshold(o){return o.v13Giant?185:150;}
  const oldHitObstacle=P.hitObstacle;
  P.hitObstacle=function(o,repeat=false){
    if(o&&!repeat&&DESTRUCTIBLE.has(o.kind)&&this.playerCount>=breakThreshold(o)){
      o.v13Destroyed=true;const c=this.biome?.palette?.structure||[.45,.45,.48];spawnFragments(this,this.playerX,.45,this.playerZ,20,c,1.05);ensure(this).crowd.shock=.55;this.shake=Math.max(this.shake,8);this.flash=Math.max(this.flash,.18);this.toast?.('ПРОЛОМИЛИ ПРЕПЯТСТВИЕ!',800);this.audio?.good?.();try{navigator.vibrate?.([20,20,35]);}catch{}return{contact:true,damage:false,destroyed:true};
    }
    const res=oldHitObstacle.call(this,o,repeat);if(res?.damage)ensure(this).crowd.shock=1;return res;
  };

  const oldApplyGate=P.applyGate;
  P.applyGate=function(opt){oldApplyGate.call(this,opt);const c=ensure(this).crowd;c.squeeze=.85;c.stretch=Math.max(c.stretch,.55);};

  const oldCollectJump=P.collectJump;
  P.collectJump=function(){oldCollectJump.call(this);if(ensure(this).lowGravity){this.jumpTimer=Math.max(this.jumpTimer,3.65);this.__jumpAnimDuration=Math.max(this.__jumpAnimDuration||0,3.65);this.toast?.('LOW GRAVITY',600);}};

  const oldBeginBattle=P.beginBattle;
  P.beginBattle=function(enemy){oldBeginBattle.call(this,enemy);if(enemy?.boss){enemy.v13Phase=1;enemy.v13Cycle=-1;enemy.v13LastAttack='';enemy.v13BaseScale=enemy.bossScale||3.25;syncBossAI(this,enemy);}};

  const oldBattle=P.updateBattle;
  P.updateBattle=function(dt){
    const e=this.battleEnemy,before=e?.battleTicks||0;if(e?.boss)syncBossAI(this,e);
    oldBattle.call(this,dt);
    if(e?.boss){
      if(this.battleEnemy===e){syncBossAI(this,e);const cycle=e.v13Phase>=3?13:e.v13Phase>=2?15:18,impact=Math.max(5,Math.round(cycle*.44));for(let tick=before+1;tick<=(e.battleTicks||0);tick++)if(tick%cycle===impact)ensure(this).crowd.shock=Math.max(ensure(this).crowd.shock,.72);}
      else if(e.count<=0&&!e.__v13Death){e.__v13Death=true;startBossDeath(this,e);}
    }
  };

  const oldDrawEnemy=P.drawEnemy;
  P.drawEnemy=function(o,z){
    if(o.boss){syncBossAI(this,o);if(this.v11)this.v11.bossColor=phaseColor(this,o);o.bossScale=(o.v13BaseScale||o.bossScale||3.25)+(o.v13Phase===3?.24:o.v13Phase===2?.12:0);}
    oldDrawEnemy.call(this,o,z);if(o.boss)drawBossPhaseAura(this,o,z);
  };

  const oldDrawObstacle=P.drawObstacle;
  P.drawObstacle=function(o,z){
    if(!o.v13Giant)return oldDrawObstacle.call(this,o,z);
    const r=this.renderer,raw=r.draw,scale=1.14;
    r.draw=function(mesh,mat,color,alpha=1){const x=new Float32Array(mat);for(const base of[0,4,8]){x[base]*=scale;x[base+1]*=scale;x[base+2]*=scale;}return raw.call(r,mesh,x,color,alpha);};
    try{return oldDrawObstacle.call(this,o,z);}finally{r.draw=raw;}
  };

  const oldStart=P.startLevel;
  P.startLevel=function(level){
    oldStart.call(this,level);this.v13=null;ensure(this);installSetpiece(this);applyRareV13(this);
  };

  const oldUpdate=P.update;
  P.update=function(dt){
    oldUpdate.call(this,dt);const s=ensure(this);updateCrowdPhysics(this,dt);updateDeath(this,dt);updateFragments(this,dt);s.bossPhasePulse=Math.max(0,s.bossPhasePulse-dt*1.5);
    if(this.state==='battle'&&this.battleEnemy?.boss&&(this.battleEnemy.v13Phase||1)>=2&&this.audio?.enabled){s.musicPulse-=dt;if(s.musicPulse<=0){const p=this.battleEnemy.v13Phase||2;this.audio.tone(p===3?82:108,.08,'square',p===3?.014:.010,p===3?.72:.84);s.musicPulse=p===3?.42:.62;}}
    if(this.state==='running')for(const o of s.setpieces){if(o.triggered)continue;const z=this.objectZ(o);if(z<this.playerZ+1&&z>this.playerZ-1.5)triggerSetpiece(this,o);}
  };

  const oldEnv=P.drawEnvironment;
  P.drawEnvironment=function(){oldEnv.call(this);drawElevationRoad(this);drawFakeReflections(this);drawLivingWorld(this);};

  const oldCourse=P.drawCourse;
  P.drawCourse=function(){
    return withElevation(this,()=>{const s=ensure(this);for(const o of s.setpieces){const z=this.objectZ(o);if(z<-76||z>16)continue;drawSetpiece(this,o,z);}const out=oldCourse.call(this);drawDeath(this);drawFragments(this);return out;});
  };

  const oldFinishScene=P.drawFinishScene;
  P.drawFinishScene=function(){return withElevation(this,()=>{const out=oldFinishScene.call(this);drawDeath(this);drawFragments(this);return out;});};

  const oldKnockouts=P.drawKnockouts;
  if(oldKnockouts)P.drawKnockouts=function(){return withElevation(this,()=>oldKnockouts.call(this));};

  const oldCamera=P.setCamera;
  P.setCamera=function(){
    const r=this.renderer,raw=r.setCamera,h=elevationAt(this,(this.travel||0)-(this.playerZ||1.6));
    r.setCamera=(eye,target,aspect,fov)=>{const e=eye.slice(),t=target.slice();e[1]+=h*.70;t[1]+=h*.82;return raw.call(r,e,t,aspect,fov);};
    try{return oldCamera.call(this);}finally{r.setCamera=raw;}
  };

  const oldRender=P.render;
  P.render=function(){
    const s=ensure(this),r=this.renderer,raw=r.clear;
    if(s.night||this.battleEnemy?.v13Phase>=2)r.clear=(a,b,c,d)=>{const rage=this.battleEnemy?.v13Phase||0;if(rage>=3)return raw.call(r,a*.30+.12,b*.18,c*.18,d);if(rage===2)return raw.call(r,a*.48+.04,b*.38,c*.38,d);return raw.call(r,a*.24,b*.34,c*.50,d);};
    try{return oldRender.call(this);}finally{r.clear=raw;}
  };

  window.SleepRoadExperienceV13={SETPIECES,V13_RARE_IDS,DESTRUCTIBLE,ensure,elevationAt,phaseFor,bossSpeed,chooseBossAttack,installSetpiece,applyRareV13,breakThreshold,wetReflectionEnabled};
})();
