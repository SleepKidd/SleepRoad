'use strict';
(() => {
  const S=window.SleepRoadSystems,Q=window.SleepRoadQualityV6,R=window.SleepRoadProgressionV6,P=window.SleepRoad3D&&window.SleepRoad3D.prototype,C=S&&S.CrowdBatch&&S.CrowdBatch.prototype;
  if(!P||!C||!Q||!R)throw new Error('Sleep Road v6 polish dependencies are missing');
  const {UI,COLORS,compose,clamp,lerp,DEG}=S;
  const CHAPTER_ATTACKS=[
    {id:'shockwave',name:'SHOCKWAVE',color:[.25,.72,1]},
    {id:'sand',name:'SAND BURST',color:[1,.62,.18]},
    {id:'hammer',name:'HAMMER SLAM',color:[1,.32,.12]},
    {id:'laser',name:'LASER SWEEP',color:[.25,.82,1]},
    {id:'neon',name:'NEON PULSE',color:[1,.20,.74]}
  ];
  const rnd=(a,b)=>a+Math.random()*(b-a);
  function fxUI(g){
    if(g.__v6FxUI)return g.__v6FxUI;
    const app=document.getElementById('app');
    const flash=document.createElement('div');flash.className='v6-screen-fx';app.appendChild(flash);
    const combo=document.createElement('div');combo.className='v6-combo hidden';combo.innerHTML='<b></b><span></span>';app.appendChild(combo);
    const boss=document.createElement('div');boss.className='v6-boss-attack hidden';boss.innerHTML='<span>BOSS ATTACK</span><b></b>';app.appendChild(boss);
    const bars=document.createElement('div');bars.className='v6-cine-bars';bars.innerHTML='<i></i><i></i>';app.appendChild(bars);
    g.__v6FxUI={flash,combo,boss,bars};return g.__v6FxUI;
  }
  function ensure(g){
    if(!g.v6Particles)g.v6Particles=[];
    if(!g.v6Feel)g.v6Feel={combo:0,perfectTotal:0,dustClock:0,trailClock:0,cameraKick:0,impact:0,bossAttackTick:0,lastJump:0,introFinished:false};
    fxUI(g);return g.v6Feel;
  }
  function cap(g){return Q.preset(g).maxParticles;}
  function push(g,p){ensure(g);g.v6Particles.push(p);const over=g.v6Particles.length-cap(g);if(over>0)g.v6Particles.splice(0,over);}
  function burst(g,x,y,z,color,count=12,opts={}){
    const n=Math.max(1,Math.round(count*Q.preset(g).trailRate));
    for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2,s=rnd(opts.minSpeed||1.1,opts.maxSpeed||4.2);push(g,{kind:opts.kind||'spark',x,y,z,vx:Math.cos(a)*s,vy:rnd(opts.minVy||1.0,opts.maxVy||4.2),vz:Math.sin(a)*s*.55,life:rnd(.34,.72),max:.72,size:rnd(.055,.15),color,gravity:opts.gravity==null?6.5:opts.gravity,spin:rnd(-7,7)});}
  }
  function ring(g,x,y,z,color,size=1.1){push(g,{kind:'ring',x,y,z,life:.48,max:.48,size,color,gravity:0});}
  function confetti(g,count=60){
    const skin=R.currentSkin(g),colors=[skin.trail,COLORS.gold,[1,.28,.5],[.3,1,.72],[.45,.55,1]];
    const n=Math.round(count*Q.preset(g).trailRate);
    for(let i=0;i<n;i++)push(g,{kind:'confetti',x:rnd(-5,5),y:rnd(3.5,7),z:g.playerZ-rnd(1,8),vx:rnd(-1.1,1.1),vy:rnd(1.5,4.2),vz:rnd(-1.4,1.2),life:rnd(1.1,2.3),max:2.3,size:rnd(.07,.16),color:colors[i%colors.length],gravity:4.2,spin:rnd(-9,9)});
  }
  function screenPulse(g,type='good',strength=1){
    const ui=fxUI(g),className=type==='bad'?'bad':type==='gold'?'gold':'good';
    ui.flash.className=`v6-screen-fx ${className} active`;ui.flash.style.setProperty('--v6-strength',String(clamp(strength,.4,1.6)));clearTimeout(g.__v6FlashTimer);g.__v6FlashTimer=setTimeout(()=>ui.flash.className='v6-screen-fx',170);
  }
  function cinematic(g,duration=1.1){
    const ui=fxUI(g);ui.bars.classList.add('active');clearTimeout(g.__v6CineTimer);g.__v6CineTimer=setTimeout(()=>ui.bars.classList.remove('active'),duration*1000);
  }
  function bossAttack(g,enemy){
    if(!enemy||!enemy.boss)return;const chapter=clamp(g.profile?.chapter||0,0,4),a=CHAPTER_ATTACKS[chapter],ui=fxUI(g);
    ui.boss.querySelector('b').textContent=a.name;ui.boss.classList.remove('hidden');clearTimeout(g.__v6BossLabel);g.__v6BossLabel=setTimeout(()=>ui.boss.classList.add('hidden'),680);
    const z=enemy.battleZ??g.playerZ-5;ring(g,0,.22,z,a.color,1.4);burst(g,0,.65,z,a.color,20,{minSpeed:1.8,maxSpeed:5,minVy:.5,maxVy:3.4});
    if(a.id==='shockwave')for(let i=0;i<3;i++)ring(g,0,.08,z,a.color,1.2+i*.55);
    if(a.id==='hammer')for(const x of[-2.8,2.8])burst(g,x,.5,z,a.color,10,{maxSpeed:2.5,maxVy:4.8});
    if(a.id==='laser')for(const x of[-4,-2,0,2,4])push(g,{kind:'laser',x,y:.7,z,life:.22,max:.22,size:.12,color:a.color,gravity:0});
    if(a.id==='neon')for(let i=0;i<8;i++){const th=i*Math.PI/4;push(g,{kind:'spark',x:Math.cos(th)*2.4,y:1.2,z:z+Math.sin(th)*1.2,vx:Math.cos(th)*3,vy:1.5,vz:Math.sin(th)*2,life:.6,max:.6,size:.12,color:a.color,gravity:2});}
    g.audio?.bossAttack?.(a.id);g.shake=Math.max(g.shake,5);ensure(g).cameraKick=Math.max(ensure(g).cameraKick,.8);
  }
  function addMoons(g,amount,label){
    amount=Math.max(0,Math.floor(amount));if(!amount)return;g.save.moons+=amount;g.levelMoons+=amount;g.persistSoon?.();UI.moonValue.textContent=g.save.moons.toLocaleString('ru-RU');g.toast?.(`${label}: +${amount} ☾`,800);
  }
  function showCombo(g,near=false){
    const f=ensure(g),ui=fxUI(g),bonus=f.combo>=3?Math.min(8,2+Math.floor(f.combo/3)):0;
    ui.combo.querySelector('b').textContent=near?'CLOSE!':f.combo>=3?`PERFECT ×${f.combo}`:'PERFECT';
    ui.combo.querySelector('span').textContent=near?'+2 ☾':bonus?`+${bonus} ☾`:'';
    ui.combo.classList.remove('hidden');clearTimeout(g.__v6ComboTimer);g.__v6ComboTimer=setTimeout(()=>ui.combo.classList.add('hidden'),700);
  }
  function registerPerfect(g,near=false){
    const f=ensure(g);f.combo++;f.perfectTotal++;const st=R.ensureState(g);st.bestPerfect=Math.max(st.bestPerfect,f.combo);R.save(st);
    if(near){addMoons(g,2,'CLOSE');g.audio?.nearMiss?.();showCombo(g,true);}
    else{const bonus=f.combo>=3?Math.min(8,2+Math.floor(f.combo/3)):0;if(bonus){addMoons(g,bonus,`PERFECT ×${f.combo}`);g.audio?.combo?.(f.combo);}showCombo(g,false);}
    if(f.combo>=10)R.unlockAchievement(g,'perfect10');
  }
  function resetCombo(g){const f=ensure(g);f.combo=0;}
  function nearMiss(g,o){
    if(!o||!g.crowdBatch||typeof g.obstacleHits!=='function')return false;const form=g.crowdBatch.formation(Math.min(g.playerCount,90)),x=g.playerX;
    try{g.playerX=x+.30;if(g.obstacleHits(o,form)>0)return true;g.playerX=x-.30;if(g.obstacleHits(o,form)>0)return true;}finally{g.playerX=x;}return false;
  }
  function updateParticles(g,dt){
    const f=ensure(g),skin=R.currentSkin(g);f.cameraKick=Math.max(0,f.cameraKick-dt*4);f.impact=Math.max(0,f.impact-dt*5);
    if((g.state==='running'||g.state==='intro')&&g.speed>0){
      f.dustClock-=dt;f.trailClock-=dt;
      if(f.dustClock<=0){f.dustClock=.065/Q.preset(g).trailRate;push(g,{kind:'dust',x:g.playerX+rnd(-.75,.75),y:.04,z:g.playerZ+rnd(.8,2.7),vx:rnd(-.18,.18),vy:rnd(.15,.55),vz:rnd(.4,1.4),life:.48,max:.48,size:rnd(.10,.22),color:[.78,.76,.70],gravity:.8});}
      if(f.trailClock<=0){f.trailClock=(g.boostTimer>0?.045:.10)/Q.preset(g).trailRate;push(g,{kind:'trail',x:g.playerX+rnd(-1.1,1.1),y:rnd(.18,.65),z:g.playerZ+rnd(1.2,3.4),vx:rnd(-.1,.1),vy:g.boostTimer>0?.30:.16,vz:g.boostTimer>0?1.25:.7,life:g.boostTimer>0?.66:.52,max:g.boostTimer>0?.66:.52,size:rnd(.06,g.boostTimer>0?.16:.12),color:skin.trail,gravity:.1});}
    }
    for(const p of g.v6Particles){
      p.life-=dt;const age=1-clamp(p.life/Math.max(.001,p.max),0,1);p.age=age;
      if(p.kind==='moonFly'){const t=clamp(age,0,1),e=1-Math.pow(1-t,3),tx=g.playerX,ty=1.2,tz=g.playerZ+1.0;p.x=lerp(p.sx,tx,e);p.y=lerp(p.sy,ty,e)+Math.sin(t*Math.PI)*.7;p.z=lerp(p.sz,tz,e);continue;}
      p.x+=(p.vx||0)*dt;p.y+=(p.vy||0)*dt;p.z+=(p.vz||0)*dt;if(p.gravity)p.vy=(p.vy||0)-p.gravity*dt;
    }
    g.v6Particles=g.v6Particles.filter(p=>p.life>0&&p.y>-1.2);
  }
  function drawParticles(g){
    if(!g.v6Particles?.length)return;const r=g.renderer,m=g.meshes;
    for(const p of g.v6Particles){const alpha=clamp(p.life/Math.max(.001,p.max),0,1),s=(p.size||.1)*(p.kind==='ring'?(1+p.age*4):p.kind==='moonFly'?(1-p.age*.35):1),c=p.color||COLORS.white;
      if(p.kind==='ring')r.draw(m.cylinder,compose(p.x,p.y,p.z,0,0,0,s,.025,s),c,alpha*.8);
      else if(p.kind==='confetti')r.draw(m.box,compose(p.x,p.y,p.z,(p.spin||0)*p.age,(p.spin||0)*p.age*.5,0,s*1.8,s*.45,s*.8),c,alpha);
      else if(p.kind==='laser')r.draw(m.box,compose(p.x,p.y,p.z,0,0,0,.08,1.6,.08),c,alpha);
      else if(p.kind==='moonFly')r.draw(m.cylinder,compose(p.x,p.y,p.z,Math.PI/2,0,p.age*8,s,.08,s),c,alpha);
      else r.draw(m.sphere,compose(p.x,p.y,p.z,0,0,0,s,s,s),c,alpha*(p.kind==='dust'?.45:.9));
    }
  }

  const oldCrowdDraw=C.draw;
  C.draw=function(count,rootX,rootZ,color,time,opts={}){
    const motion=(opts.enemy?this.enemyMotion:this.playerMotion)||opts.motion,original=this.formation;
    if(!opts.enemy&&motion&&motion.mode!=='finish'){
      this.formation=function(n){const base=original.call(this,n),metrics=this.metrics(n),depth=Math.max(.01,metrics.depth);return base.map(q=>{const t=clamp(q.z/depth,0,1),lag=-(motion.strafe||0)*t*.62,wobble=Math.sin(time*5.2+q.index*.47)*.055*t;return{...q,x:q.x+lag+wobble,z:q.z+Math.abs(motion.strafe||0)*t*.07};});};
    }
    try{return oldCrowdDraw.call(this,count,rootX,rootZ,color,time,opts);}finally{this.formation=original;}
  };

  const oldSetCount=P.setCrowdCount;
  P.setCrowdCount=function(v,pop){
    const from=this.__v6DisplayedCount==null?Math.max(0,Math.round(this.playerCount)):this.__v6DisplayedCount,target=Math.max(0,Math.round(v));oldSetCount.call(this,v,pop);this.__v6DisplayedCount=target;
    if(!pop||from===target||typeof requestAnimationFrame!=='function')return;cancelAnimationFrame(this.__v6CountRaf||0);const start=performance.now(),dur=280,positive=target>from;UI.crowdCount.classList.toggle('v6-gain',positive);UI.crowdCount.classList.toggle('v6-loss',!positive);
    const tick=now=>{const t=clamp((now-start)/dur,0,1),e=1-Math.pow(1-t,3),n=Math.round(lerp(from,target,e));UI.crowdCount.textContent=n;this.__v6DisplayedCount=n;if(t<1)this.__v6CountRaf=requestAnimationFrame(tick);else{UI.crowdCount.classList.remove('v6-gain','v6-loss');this.__v6DisplayedCount=target;}};this.__v6CountRaf=requestAnimationFrame(tick);
  };

  const oldCollectMoon=P.collectMoon;
  P.collectMoon=function(o){const z=this.objectZ(o),skin=R.currentSkin(this);push(this,{kind:'moonFly',sx:o.x,sy:1.18,sz:z,x:o.x,y:1.18,z,life:.34,max:.34,size:o.bonus?.20:.14,color:skin.moon,gravity:0});burst(this,o.x,1.18,z,skin.moon,o.bonus?10:5,{maxSpeed:2.1,maxVy:2.4,gravity:3});oldCollectMoon.call(this,o);};

  const oldGate=P.applyGate;
  P.applyGate=function(opt){const before=this.playerCount;oldGate.call(this,opt);const good=this.playerCount>=before,color=good?(this.biome?.palette?.good||COLORS.teal):(this.biome?.palette?.bad||COLORS.red);burst(this,this.playerX,1.0,this.playerZ,color,20,{maxSpeed:5,maxVy:5});ring(this,this.playerX,.15,this.playerZ,color,1.0);screenPulse(this,good?'good':'bad',opt?.op==='mul'?1.35:1);ensure(this).cameraKick=Math.max(ensure(this).cameraKick,opt?.op==='mul'?1.2:.65);this.audio?.gateWhoosh?.(good);};

  const oldJump=P.collectJump;
  P.collectJump=function(){oldJump.call(this);burst(this,this.playerX,.08,this.playerZ,[.65,.92,1],16,{minVy:.5,maxVy:2.7,maxSpeed:3.2,gravity:3});ring(this,this.playerX,.06,this.playerZ,[.25,.72,1],1.15);this.audio?.jump?.();ensure(this).cameraKick=.55;};

  const oldZone=P.collectZone;
  P.collectZone=function(o){oldZone.call(this,o);const slow=o.kind!=='boost',color=slow?[.72,.30,.86]:[.18,.82,.58];burst(this,this.playerX,.4,this.playerZ,color,18,{maxSpeed:4,maxVy:3.2,gravity:2});screenPulse(this,slow?'bad':'good',.7);this.audio?.boost?.(slow);ensure(this).cameraKick=slow?.25:.9;};

  const oldPower=P.collectPowerup;
  P.collectPowerup=function(o){oldPower.call(this,o);const color=o.kind==='double'?[.32,.90,.48]:o.kind==='magnet'?[.95,.30,.70]:o.kind==='invuln'?[1,.72,.10]:[.18,.75,1];burst(this,this.playerX,1.0,this.playerZ,color,22,{maxSpeed:4.5,maxVy:4.5});for(let i=0;i<3;i++)ring(this,this.playerX,.15+i*.22,this.playerZ,color,.8+i*.25);screenPulse(this,'good',1);};

  const oldHit=P.hitObstacle;
  P.hitObstacle=function(o,repeat=false){
    const before=this.dodgedObstacles,result=oldHit.call(this,o,repeat);
    if(result?.damage){resetCombo(this);burst(this,this.playerX,.7,this.playerZ,[1,.18,.15],24,{minSpeed:2,maxSpeed:6,maxVy:5.2});screenPulse(this,'bad',1.3);ensure(this).impact=1;ensure(this).cameraKick=1.2;this.audio?.obstacle?.(o.kind);}
    else if(result&&result.contact===false){const near=nearMiss(this,o);if(repeat){if(near)o.__v6Near=true;}else if(this.dodgedObstacles>before)registerPerfect(this,near);}
    return result;
  };
  const oldTick=P.tickActiveObstacle;
  P.tickActiveObstacle=function(o,z){const before=this.dodgedObstacles;oldTick.call(this,o,z);if(this.dodgedObstacles>before){registerPerfect(this,!!o.__v6Near);o.__v6Near=false;}};

  const oldSpawn=P.spawnKnockouts;
  P.spawnKnockouts=function(loss){const start=this.knockouts.length;oldSpawn.call(this,loss);for(let i=start;i<this.knockouts.length;i++){const k=this.knockouts[i];k.life=1.55;k.maxLife=1.55;k.bounces=0;k.vx*=1.15;k.vy*=1.05;k.vz*=1.18;}};
  P.updateKnockouts=function(dt){for(const k of this.knockouts){k.life-=dt;k.x+=k.vx*dt;k.y+=k.vy*dt;k.z+=k.vz*dt;k.vy-=9.6*dt;k.spin=(k.spin||0)*.995;if(k.y<.24&&k.vy<0&&k.bounces<2){k.y=.24;k.vy=Math.abs(k.vy)*(.38-k.bounces*.08);k.vx*=.72;k.vz*=.72;k.bounces++;}}this.knockouts=this.knockouts.filter(k=>k.life>0);};
  P.drawKnockouts=function(){const r=this.renderer,m=this.meshes,skin=R.currentSkin(this),color=skin.shirts[0];for(const k of this.knockouts){const max=k.maxLife||1.55,age=1-k.life/max,rot=age*(k.spin||4),scale=.92*(.75+.25*clamp(k.life/.35,0,1));r.draw(m.cylinder,compose(k.x,.02,k.z,0,0,0,.42*scale,.018,.28*scale),[.10,.14,.20],.45);r.draw(m.character,compose(k.x,k.y,k.z,rot,rot*.45,rot*.62,scale,scale,scale),color,clamp(k.life/.25,0,1));}};

  const oldBattle=P.beginBattle;
  P.beginBattle=function(enemy){oldBattle.call(this,enemy);ensure(this).bossAttackTick=0;if(enemy.boss){cinematic(this,1.0);screenPulse(this,'gold',1);this.audio?.bossAttack?.('shockwave');}};
  const oldBattleUpdate=P.updateBattle;
  P.updateBattle=function(dt){const e=this.battleEnemy,before=e?.battleTicks||0;oldBattleUpdate.call(this,dt);if(e?.boss&&(e.battleTicks||0)>before){const tick=e.battleTicks||0;if(tick%3===0&&tick!==ensure(this).bossAttackTick){ensure(this).bossAttackTick=tick;bossAttack(this,e);}}};

  const oldFinish=P.beginFinish;
  P.beginFinish=function(){oldFinish.call(this);cinematic(this,1.5);confetti(this,this.profile?.bossLevel?110:70);screenPulse(this,'gold',1.2);ensure(this).cameraKick=1.2;};
  const oldShow=P.showResult;
  P.showResult=function(won){if(won)confetti(this,55);oldShow.call(this,won);};

  const oldStart=P.startLevel;
  P.startLevel=function(level){oldStart.call(this,level);const f=ensure(this);f.combo=0;f.perfectTotal=0;f.lastJump=this.jumpTimer||0;this.v6Particles=[];if(this.profile?.bossLevel)cinematic(this,.85);};

  const oldUpdate=P.update;
  P.update=function(dt){
    const f=ensure(this),beforeJump=this.jumpTimer||0;oldUpdate.call(this,dt);
    if(this.state==='intro'){this.__v6IntroRemaining=Math.max(0,(this.__v6IntroRemaining||0)-dt);if(this.__v6IntroRemaining<=0){this.state='running';this.speed=this.baseSpeed;}}
    if(beforeJump>0&&(this.jumpTimer||0)<=0){burst(this,this.playerX,.06,this.playerZ,[.74,.85,.92],15,{minVy:.25,maxVy:1.3,maxSpeed:2.3,gravity:2});ring(this,this.playerX,.04,this.playerZ,[.65,.78,.9],.95);this.audio?.land?.();}
    f.lastJump=this.jumpTimer||0;updateParticles(this,dt);
    const zoom=1+f.cameraKick*.012+f.impact*.008;UI.canvas.style.transform=`scale(${zoom})`;UI.canvas.style.transformOrigin='50% 58%';
  };

  const oldRender=P.render;
  P.render=function(){oldRender.call(this);drawParticles(this);};

  const oldCamera=P.setCamera;
  P.setCamera=function(){
    oldCamera.call(this);const f=ensure(this);
    if(this.state==='menu'){
      const aspect=this.w/this.h,orbit=Math.sin(this.time*.28)*1.15,y=9.1+Math.sin(this.time*.38)*.16,z=15.6+Math.cos(this.time*.22)*.28;this.renderer.setCamera([orbit,y,z],[0,.62,-16.8],aspect,(this.w/this.h<.7?49:45)*DEG);
    }
  };

  const oldDrawMoon=P.drawMoon;
  P.drawMoon=function(o,z){const skin=R.currentSkin(this),r=this.renderer,m=this.meshes,bob=Math.sin(this.time*3+(o.spin||0))*.16,y=1.18+bob,rot=this.time*1.7+(o.spin||0),scale=o.bonus?1.05:.76,t=this.time*2.4+(o.spin||0),s=.07+(o.bonus?.035:0);r.draw(m.cylinder,compose(o.x,y,z,Math.PI/2,0,rot,scale,.20,scale),skin.moon);r.draw(m.cylinder,compose(o.x+.20*scale,y+.07,z+.12,Math.PI/2,0,rot,scale*.68,.13,scale*.68),this.biome?.palette?.structure||COLORS.white);for(let i=0;i<3;i++){const a=t+i*Math.PI*2/3;r.draw(m.sphere,compose(o.x+Math.cos(a)*.72,y+Math.sin(a*1.3)*.20,z+Math.sin(a)*.26,0,0,0,s,s,s),skin.moon,.75);}};

  const oldDrawObstacle=P.drawObstacle;
  P.drawObstacle=function(o,z){oldDrawObstacle.call(this,o,z);const r=this.renderer,m=this.meshes,t=this.time*(o.speed||1)+(o.phase||0);if(o.kind==='saw'){const x=o.baseX+Math.sin(t)*o.range;for(let i=0;i<4;i++){const a=t*5+i*Math.PI/2,s=.05+.025*(Math.sin(t*9+i)*.5+.5);r.draw(m.sphere,compose(x+Math.cos(a)*.82,.42+Math.sin(a*1.7)*.25,z+Math.sin(a)*.22,0,0,0,s,s,s),[1,.62,.12],.85);}}else if(o.kind==='fireline'){for(let i=-4;i<=4;i+=2){const y=.5+Math.abs(Math.sin(t*2+i))*.45,s=.10+.04*(i%3);r.draw(m.sphere,compose(i,y,z-.15,0,0,0,s,s*1.35,s),[.32,.30,.34],.34);}}};

  const oldUpdateFinish=P.updateFinish;
  P.updateFinish=function(dt){oldUpdateFinish.call(this,dt*.82);};

  window.SleepRoadPolishV6={CHAPTER_ATTACKS,burst,ring,confetti,registerPerfect,resetCombo,nearMiss,updateParticles,drawParticles,ensure,screenPulse,cinematic};
})();
