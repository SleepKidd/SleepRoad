'use strict';
(() => {
  const S=window.SleepRoadSystems,M=window.Mini3D,P=window.SleepRoad3D&&window.SleepRoad3D.prototype;
  if(!S||!M||!P)throw new Error('Sleep Road animation layer dependencies are missing');
  const {compose,COLORS,clamp,lerp,DEG}=S,{multiply}=M;
  const JUMP_DURATION=2.35;
  const smoothstep=t=>{t=clamp(t,0,1);return t*t*(3-2*t);};
  const easeOutBack=t=>{t=clamp(t,0,1);const c1=1.70158,c3=c1+1;return 1+c3*Math.pow(t-1,3)+c1*Math.pow(t-1,2);};
  const jumpArc=(timer,duration=JUMP_DURATION)=>{const p=clamp(1-(timer||0)/Math.max(.001,duration),0,1),air=Math.sin(Math.PI*p),vertical=Math.cos(Math.PI*p);return{progress:p,y:air*2.05,air,vertical};};
  const flattenMatrices=list=>{const out=new Float32Array(list.length*16);for(let i=0;i<list.length;i++)out.set(list[i],i*16);return out;};
  const ensureAnim=g=>g.__anim||(g.__anim={strafe:0,landing:0,takeoff:0,gate:0,power:0,hit:0,battle:0,finish:0});

  S.CrowdBatch.prototype.draw=function(count,rootX,rootZ,color,time,opts={}){
    const f=this.formation(count),scale=opts.scale||1,direction=opts.direction||1,enemy=opts.enemy===true,motion=(enemy?this.enemyMotion:this.playerMotion)||opts.motion||{},mode=motion.mode||'run',baseY=(motion.jumpY!=null&&!enemy?motion.jumpY:(opts.baseY||0)),runSpeed=clamp(motion.runSpeed==null?1:motion.runSpeed,.45,1.65),strafe=clamp(motion.strafe||0,-1,1),landing=clamp(motion.landing||0,0,1),takeoff=clamp(motion.takeoff||0,0,1),finish=clamp(motion.finishProgress||0,0,1),boss=motion.boss===true,shadows=[],shadowColors=[],partNames=['head','body','leftArm','rightArm','leftLeg','rightLeg'],parts={},partColors={};
    for(const name of partNames){parts[name]=[];partColors[name]=[];}
    const palette=this.skinPalette||{},shirts=enemy?[[.95,.19,.27],[1,.31,.16],[.74,.09,.20],[.92,.27,.39]]:(palette.shirts||[[.14,.52,.98],[.08,.67,.91],[.24,.42,.91],[.18,.72,.73],[.37,.49,.98]]),skins=[[1,.70,.49],[.72,.43,.28],[.94,.59,.40],[.48,.29,.21],[.84,.50,.32]],trousers=enemy?[[.30,.06,.09],[.40,.08,.10]]:[[.05,.12,.28],[.10,.10,.22],[.07,.22,.38]],pivots={head:[0,1.18,0],body:[0,0,0],leftArm:[-.20,1.04,0],rightArm:[.20,1.04,0],leftLeg:[-.09,.62,0],rightLeg:[.09,.62,0]};
    const groundY=opts.groundY==null?.012:opts.groundY,metrics=this.metrics(count);
    for(const q of f){
      const row=Math.floor(q.index/Math.max(1,metrics.cols)),phase=time*(6.2+runSpeed*2.0)+q.index*.57+row*.13,wave=Math.sin(phase),counter=Math.cos(phase),runAmount=mode==='idle'?.22:mode==='finish'?.50:mode==='battle'?.35:1,bob=Math.abs(wave)*.052*runAmount,x=rootX+q.x*scale,z=rootZ+q.z*direction*scale;
      let bodyLean=.035*runAmount+Math.max(0,runSpeed-1)*.08,bodyRoll=-strafe*.12,bodyYaw=strafe*.045,armL=wave*.55*runAmount,armR=-wave*.55*runAmount,legL=-wave*.38*runAmount,legR=wave*.38*runAmount,headPitch=-bodyLean*.28,extraY=0;
      if(mode==='idle'){bodyLean=0;bodyRoll=Math.sin(time*1.5+q.index*.12)*.015;armL=wave*.08;armR=-wave*.08;legL=legR=0;extraY=Math.sin(time*2+q.index*.21)*.012;}
      if(mode==='jump'){const a=clamp(motion.jumpAir||0,0,1),v=motion.jumpVertical||0;bodyLean=-v*.16-.05;bodyRoll=-strafe*.08;armL=.38+a*.82+wave*.08;armR=.38+a*.82-wave*.08;legL=-.18-a*.40;legR=.18+a*.40;headPitch=v*.06;}
      if(mode==='battle'){const punch=Math.sin(time*11+q.index*.41),hit=Math.max(0,punch),guard=Math.max(0,-punch);bodyLean=.11+hit*.08;bodyRoll=punch*.055;armL=-.25-hit*.95;armR=-.25-guard*.95;legL=-wave*.14;legR=wave*.14;extraY=Math.abs(punch)*.025;}
      if(mode==='enemy'&&boss){bodyLean=.08+Math.sin(time*3.4+q.index*.15)*.025;armL=wave*.72;armR=-wave*.72;extraY=Math.abs(wave)*.07;}
      if(mode==='finish'){const cheer=smoothstep((finish-.38)/.42),cheerWave=Math.sin(time*8+q.index*.45);bodyLean=-.02;armL=lerp(wave*.30,-1.20+cheerWave*.12,cheer);armR=lerp(-wave*.30,-1.20-cheerWave*.12,cheer);legL=-wave*.20;legR=wave*.20;extraY=cheer*Math.abs(cheerWave)*.10;}
      const squash=landing*.12,stretch=takeoff*.07,rootSx=scale*(1+squash*.45-stretch*.18),rootSy=scale*(1-squash+stretch),rootSz=scale*(1+squash*.30-stretch*.08),turn=direction<0?Math.PI:0,root=compose(x,baseY+bob+extraY,z,bodyLean,turn+bodyYaw,bodyRoll,rootSx,rootSy,rootSz),shirt=shirts[(q.index*7)%shirts.length],skin=skins[(q.index*3)%skins.length],trouser=trousers[(q.index*5)%trousers.length],leftLift=Math.max(0,wave)*.075*runAmount,rightLift=Math.max(0,-wave)*.075*runAmount,leftZ=counter*.035*runAmount,rightZ=-counter*.035*runAmount,angles={head:headPitch,body:0,leftArm:armL,rightArm:armR,leftLeg:legL,rightLeg:legR};
      const shadowLift=clamp(baseY/2.2,0,1),shadowScale=(1-shadowLift*.38)*(boss?1.08:1);
      shadows.push(compose(x,groundY,z,0,0,0,.48*scale*shadowScale,.018,.32*scale*shadowScale));shadowColors.push(.10,.14,.20);
      for(const name of partNames){const p=pivots[name],lift=name==='leftLeg'?leftLift:name==='rightLeg'?rightLift:0,zoff=name==='leftLeg'?leftZ:name==='rightLeg'?rightZ:0,local=compose(p[0],p[1]+lift,p[2]+zoff,angles[name],0,0,1,1,1),tint=name==='head'||name.includes('Arm')?skin:name==='body'?shirt:trouser,shade=.92+(q.index%4)*.025;parts[name].push(multiply(root,local));partColors[name].push(...tint.map(v=>Math.min(1,v*shade)));}
    }
    this.r.drawInstances(this.meshes.cylinder,flattenMatrices(shadows),new Float32Array(shadowColors),f.length);
    for(const name of partNames)this.r.drawInstances(this.meshes.characterParts[name],flattenMatrices(parts[name]),new Float32Array(partColors[name]),f.length);
    return f;
  };

  const oldDrawCourse=P.drawCourse;
  P.drawCourse=function(){
    const a=ensureAnim(this),prev=this.__animPrevPlayerX==null?this.playerX:this.__animPrevPlayerX,delta=this.playerX-prev;this.__animPrevPlayerX=this.playerX;a.strafe=lerp(a.strafe,clamp(delta*12,-1,1),.22);
    const j=jumpArc(this.jumpTimer||0,this.__jumpAnimDuration||JUMP_DURATION),jumping=(this.jumpTimer||0)>0,ratio=this.baseSpeed?this.speed/this.baseSpeed:1;
    this.crowdBatch.playerMotion={mode:this.state==='menu'?'idle':this.state==='battle'?'battle':jumping?'jump':'run',runSpeed:ratio,strafe:a.strafe,jumpY:jumping?j.y:0,jumpAir:j.air,jumpVertical:j.vertical,landing:a.landing,takeoff:a.takeoff};
    oldDrawCourse.call(this);
    this.crowdBatch.playerMotion=null;
  };

  const oldDrawFinishScene=P.drawFinishScene;
  P.drawFinishScene=function(){const a=ensureAnim(this);this.crowdBatch.playerMotion={mode:'finish',runSpeed:.78,finishProgress:this.finishProgress||0,landing:a.landing};oldDrawFinishScene.call(this);this.crowdBatch.playerMotion=null;};

  const oldDrawEnemy=P.drawEnemy;
  P.drawEnemy=function(o,z){
    const bossBattle=this.state==='battle'&&o===this.battleEnemy&&o.boss===true,cadence=.055,clock=bossBattle?((o.battleTicks||0)+(this.battleTimer||0)/cadence):0,cycle=18;
    this.crowdBatch.enemyMotion={mode:(this.state==='battle'&&o===this.battleEnemy)?'battle':'enemy',runSpeed:o.boss?.72:o.elite?.92:1,boss:o.boss===true,elite:o.elite===true,bossAttackActive:bossBattle,bossAttackPhase:bossBattle?((clock%cycle)/cycle):0,bossAttackSide:bossBattle?(Math.floor(clock/cycle)%2?-1:1):1};
    oldDrawEnemy.call(this,o,z);this.crowdBatch.enemyMotion=null;
  };

  P.setCamera=function(){
    const aspect=this.w/this.h,depth=this.crowdBatch?this.crowdBatch.metrics(this.visualCount).depth:0,pullback=clamp((depth-2.55)*.92,0,12.5),a=ensureAnim(this),j=jumpArc(this.jumpTimer||0,this.__jumpAnimDuration||JUMP_DURATION),jumpY=(this.jumpTimer||0)>0?j.y:0,speedRatio=this.baseSpeed?this.speed/this.baseSpeed:1,boost=this.boostTimer>0?1:0,slow=this.slowTimer>0?1:0;
    if(this.state==='finish'||this.state==='complete'){const p=this.finishProgress||0,orbit=this.profile?.bossLevel?Math.sin(p*Math.PI)*.85:0;this.renderer.setCamera([lerp(0,6.2,p)+orbit,lerp(9.2,7.1,p)+pullback*.27,lerp(16.2,14.2,p)+pullback],[0,lerp(.55,1.45,p),lerp(-18,-4,p)],aspect,(48+(this.profile?.bossLevel?2:0))*DEG);return;}
    const sx=this.shake?(Math.random()-.5)*.08*this.shake:0,sy=this.shake?(Math.random()-.5)*.035*this.shake:0,mobile=this.w/this.h<.7,battleOrbit=this.state==='battle'?Math.sin(this.time*1.35)*.42:0,camX=sx+battleOrbit-a.strafe*.18+this.playerX*.025,camY=(mobile?10.15:8.95)+pullback*.42+sy+jumpY*.10,camZ=16.0+pullback+(boost?-.32:slow?.20:0),targetX=this.playerX*.035,targetY=.58+jumpY*.035,fov=(mobile?50:46)+(boost?2.8:0)+(slow?-1.2:0)+Math.max(0,speedRatio-1)*1.2;
    this.renderer.setCamera([camX,camY,camZ],[targetX,targetY,-17+pullback*.20],aspect,fov*DEG);
  };

  const oldUpdateEffects=P.updateEffectsV5;
  P.updateEffectsV5=function(dt){const a=ensureAnim(this),before=this.jumpTimer||0;oldUpdateEffects.call(this,dt);a.landing=Math.max(0,a.landing-dt*4.7);a.takeoff=Math.max(0,a.takeoff-dt*5.5);a.gate=Math.max(0,a.gate-dt*4.4);a.power=Math.max(0,a.power-dt*3.7);a.hit=Math.max(0,a.hit-dt*5.0);a.battle=Math.max(0,a.battle-dt*2.6);a.finish=Math.max(0,a.finish-dt*1.8);if(before>0&&(this.jumpTimer||0)<=0){a.landing=1;this.shake=Math.max(this.shake,3.2);}};

  const oldCollectJump=P.collectJump;
  P.collectJump=function(){oldCollectJump.call(this);this.__jumpAnimDuration=Math.max(this.jumpTimer||JUMP_DURATION,JUMP_DURATION);const a=ensureAnim(this);a.takeoff=1;a.landing=0;this.shake=Math.max(this.shake,1.4);};
  const oldApplyGate=P.applyGate;
  P.applyGate=function(opt){oldApplyGate.call(this,opt);ensureAnim(this).gate=1;};
  const oldCollectPowerup=P.collectPowerup;
  P.collectPowerup=function(o){oldCollectPowerup.call(this,o);ensureAnim(this).power=1;};
  const oldCollectZone=P.collectZone;
  P.collectZone=function(o){oldCollectZone.call(this,o);ensureAnim(this).power=.7;};
  const oldHitObstacle=P.hitObstacle;
  P.hitObstacle=function(o,repeat=false){const result=oldHitObstacle.call(this,o,repeat);if(result&&result.damage)ensureAnim(this).hit=1;return result;};
  const oldBeginBattle=P.beginBattle;
  P.beginBattle=function(enemy){oldBeginBattle.call(this,enemy);ensureAnim(this).battle=1;};
  const oldBeginFinish=P.beginFinish;
  P.beginFinish=function(){oldBeginFinish.call(this);ensureAnim(this).finish=1;};

  const oldDrawPowerup=P.drawPowerup;
  P.drawPowerup=function(o,z){oldDrawPowerup.call(this,o,z);const r=this.renderer,m=this.meshes,t=this.time*2.6+(o.spin||0),y=1.15+Math.sin(this.time*3.2+(o.spin||0))*.18,c=o.kind==='double'?[.32,.90,.48]:o.kind==='magnet'?[.95,.30,.70]:o.kind==='invuln'?[1,.72,.10]:[.18,.75,1];for(let i=0;i<3;i++){const a=t+i*Math.PI*2/3,rad=.98+.08*Math.sin(t*1.7+i);r.draw(m.sphere,compose(o.x+Math.cos(a)*rad,y+Math.sin(a*1.3)*.28,z+Math.sin(a)*rad*.34,0,0,0,.13,.13,.13),c);}};
  const oldDrawJump=P.drawJump;
  P.drawJump=function(o,z){oldDrawJump.call(this,o,z);const r=this.renderer,m=this.meshes,p=(this.time*1.6)%1;for(let i=0;i<3;i++){const q=(p+i/3)%1,y=.35+Math.sin(q*Math.PI)*.34,zz=z+.72-q*1.65,scale=.78+.28*(1-q);r.draw(m.cone,compose(0,y,zz,0,0,-Math.PI/2,.34*scale,.78*scale,.34*scale),[.78,.96,1]);}};
  const oldDrawGate=P.drawGate;
  P.drawGate=function(o,z){oldDrawGate.call(this,o,z);const r=this.renderer,m=this.meshes,p=this.biome.palette,pulse=.16+.08*Math.sin(this.time*4+z*.05);for(const x of[-4.65,-.45,.45,4.65])r.draw(m.sphere,compose(x,2.93+Math.sin(this.time*3+x)*.05,z,.0,0,0,pulse,pulse,pulse),o.risk?p.accent:p.roadEdge);};
  const oldDrawObstacle=P.drawObstacle;
  P.drawObstacle=function(o,z){oldDrawObstacle.call(this,o,z);if(!o.multiHit&&!['saw','hammer','crusher','pendulum','laser'].includes(o.kind))return;const r=this.renderer,m=this.meshes,pulse=.11+.06*(Math.sin(this.time*8+(o.phase||0))*.5+.5);for(const x of[-5.15,5.15])r.draw(m.sphere,compose(x,.28,z-.12,0,0,0,pulse,pulse,pulse),[1,.18,.12]);};
  const oldDrawBonusGate=P.drawBonusGate;
  P.drawBonusGate=function(o,z){oldDrawBonusGate.call(this,o,z);const r=this.renderer,m=this.meshes,t=this.time*2+(o.spin||0);for(let i=0;i<4;i++){const a=t+i*Math.PI/2;r.draw(m.sphere,compose(o.x+Math.cos(a)*1.18,1.25+Math.sin(a*1.2)*.22,z+Math.sin(a)*.34,0,0,0,.10,.10,.10),COLORS.gold);}};
  const oldDrawFinishGate=P.drawFinishGate;
  P.drawFinishGate=function(z,o){oldDrawFinishGate.call(this,z,o);const r=this.renderer,m=this.meshes,p=this.biome.palette,s=.14+.07*(Math.sin(this.time*5)*.5+.5);for(const x of[-5.1,5.1])r.draw(m.sphere,compose(x,4.75,z,0,0,0,s,s,s),o?.bossFinish?p.accent:p.good);};

  window.SleepRoadAnimationV5={JUMP_DURATION,jumpArc,smoothstep,easeOutBack};
})();
