'use strict';
(() => {
  const S=window.SleepRoadSystems,D=window.SleepRoadLevelDirector,R=window.SleepRoadProgressionV6,Q=window.SleepRoadQualityV6,Polish=window.SleepRoadPolishV6,V9=window.SleepRoadVisualV9,P=window.SleepRoad3D&&window.SleepRoad3D.prototype,C=S&&S.CrowdBatch&&S.CrowdBatch.prototype,A=S&&S.AudioEngine&&S.AudioEngine.prototype;
  if(!S||!D||!R||!Q||!P||!C||!A)throw new Error('Sleep Road Experience v11 dependencies are missing');
  const {compose,COLORS,clamp,lerp,DEG}=S,TAU=Math.PI*2;
  const mix=(a,b,t)=>a.map((v,i)=>v+(b[i]-v)*t);
  const hash=n=>{const x=Math.sin(n*73.913+11.417)*43758.5453;return x-Math.floor(x);};

  const BOSS_PATTERNS=[
    ['punch','slam','stomp'],
    ['stomp','punch','sweep'],
    ['slam','sweep','punch'],
    ['sweep','punch','slam'],
    ['punch','stomp','slam','sweep']
  ];
  const BOSS_VARIANTS=[
    {id:'guardian',name:'GUARDIAN',main:[.20,.70,.44],accent:[1,.77,.20],gear:'bands'},
    {id:'brute',name:'DESERT BRUTE',main:[.76,.28,.12],accent:[1,.64,.16],gear:'bracers'},
    {id:'foreman',name:'FOREMAN',main:[.43,.25,.14],accent:[1,.46,.10],gear:'helmet'},
    {id:'enforcer',name:'NEON ENFORCER',main:[.10,.32,.58],accent:[.22,.84,1],gear:'plates'},
    {id:'core',name:'CORE TITAN',main:[.46,.12,.55],accent:[.24,1,.82],gear:'orbs'}
  ];
  const LIGHTING={
    meadow:{dir:[-.42,.92,.30],haze:[.64,.82,.94],strength:.07},
    desert:{dir:[-.58,.86,.22],haze:[.92,.70,.43],strength:.08},
    factory:{dir:[-.34,.84,.44],haze:[.48,.52,.54],strength:.09},
    city:{dir:[-.22,.72,.66],haze:[.22,.32,.52],strength:.10},
    neon:{dir:[-.28,.78,.56],haze:[.35,.18,.55],strength:.11}
  };
  const MINI_EVENTS=['train','containers','tunnel','drones','bridge'];
  const V11_SKINS=[
    {id:'ninja',name:'NINJA',unlock:16,shirts:[[.07,.09,.13],[.12,.14,.20],[.16,.20,.28],[.22,.12,.28]],trail:[.48,.30,1],moon:[.66,.48,1],leader:[.46,.22,.88],gear:'headband',aura:[.48,.30,1]},
    {id:'worker',name:'WORKER',unlock:26,shirts:[[.86,.43,.10],[.72,.30,.08],[.34,.36,.39],[.95,.58,.12]],trail:[1,.55,.18],moon:[1,.70,.18],leader:[.98,.48,.08],gear:'helmet',aura:[1,.48,.12]},
    {id:'astronaut',name:'ASTRONAUT',unlock:36,shirts:[[.82,.86,.92],[.54,.61,.72],[.19,.31,.48],[.93,.95,.98]],trail:[.55,.82,1],moon:[.72,.90,1],leader:[.68,.88,1],gear:'backpack',aura:[.48,.82,1]},
    {id:'gold',name:'GOLD',unlock:46,shirts:[[.88,.60,.08],[1,.78,.18],[.62,.38,.04],[.96,.70,.12]],trail:[1,.74,.08],moon:[1,.86,.22],leader:[1,.72,.08],gear:'crown',aura:[1,.74,.08]}
  ];

  for(const skin of V11_SKINS)if(!R.SKINS.some(s=>s.id===skin.id))R.SKINS.push(skin);

  function intensityFor(level){
    level=Math.max(1,Math.floor(level||1));
    if(level<=5)return .72;
    if(level<=10)return .86;
    if(level<=20)return 1;
    if(level<=30)return 1.12;
    if(level<=40)return 1.22;
    if(level<=50)return 1.32;
    return Math.min(1.55,1.32+(level-50)*.0025);
  }
  function ensure(g){
    if(!g.v11)g.v11={reaction:'',reactionTimer:0,reactionPower:0,gateFx:null,camera:null,cameraKick:0,bossImpactTick:-1,bossWarnCycle:-1,bossLastRatio:1,corpse:null,chapterTimer:0,finishPulse:0,intensity:intensityFor(g.level),leaderColor:null,miniEventsInstalled:false};
    const skin=R.currentSkin(g);
    g.v11.leaderColor=(skin&&skin.leader)||mix((skin?.shirts||[[.2,.55,.96]])[0],COLORS.white,.20);
    g.v11.bossColor=BOSS_VARIANTS[clamp(g.profile?.chapter||0,0,4)].main;
    g.v11.intensity=intensityFor(g.level);
    return g.v11;
  }
  function haptic(pattern){
    try{if(navigator&&typeof navigator.vibrate==='function')navigator.vibrate(pattern);}catch{}
  }
  function ensureUI(g){
    if(g.__v11UI)return g.__v11UI;
    const app=document.getElementById('app');
    const warn=document.createElement('div');warn.className='v11-boss-warning hidden';warn.innerHTML='<span>⚠</span><b></b><small></small>';app.appendChild(warn);
    const gate=document.createElement('div');gate.className='v11-gate-pop hidden';gate.innerHTML='<b></b><span></span>';app.appendChild(gate);
    const chapter=document.createElement('div');chapter.className='v11-chapter-transition hidden';chapter.innerHTML='<span></span><b></b><small></small>';app.appendChild(chapter);
    g.__v11UI={warn,gate,chapter};return g.__v11UI;
  }
  function showReaction(g,type,power=1,duration=.55){
    const s=ensure(g);s.reaction=type;s.reactionPower=clamp(power,0,1);s.reactionTimer=Math.max(s.reactionTimer,duration);
  }
  function showGatePop(g,good,delta,opt){
    const ui=ensureUI(g),el=ui.gate;el.className='v11-gate-pop '+(good?'good':'bad');
    el.querySelector('b').textContent=delta>0?'+'+delta:String(delta);
    el.querySelector('span').textContent=opt?.op==='mul'?'MULTIPLIER':good?'ТОЛПА РАСТЁТ':'ТОЛПА УМЕНЬШИЛАСЬ';
    clearTimeout(g.__v11GateTimer);g.__v11GateTimer=setTimeout(()=>el.className='v11-gate-pop hidden',620);
  }
  function showChapter(g){
    if(!(g.level<=50&&g.profile?.local===1))return;
    const ui=ensureUI(g),el=ui.chapter,b=g.profile.biome;
    el.querySelector('span').textContent='CHAPTER '+(g.profile.chapter+1);
    el.querySelector('b').textContent=b.name;
    el.querySelector('small').textContent='НОВАЯ ЗОНА';
    el.classList.remove('hidden');clearTimeout(g.__v11ChapterHide);g.__v11ChapterHide=setTimeout(()=>el.classList.add('hidden'),1800);
  }

  A.v11Impact=function(strength=1){this.tone(74,.11,'square',.025*strength,.48);setTimeout(()=>this.tone(132,.08,'triangle',.018*strength,.72),28);};
  A.v11Gate=function(good=true){this.tone(good?520:155,.08,good?'triangle':'sawtooth',.022,good?1.38:.65);};
  A.v11BossDeath=function(){this.tone(94,.28,'sawtooth',.038,.45);setTimeout(()=>this.tone(56,.34,'square',.028,.62),120);};
  A.v11Stagger=function(){this.tone(118,.10,'square',.022,.62);};
  A.v11Finish=function(){this.tone(610,.10,'triangle',.026,1.22);setTimeout(()=>this.tone(910,.16,'sine',.022,1.10),90);};

  function attackTypeFor(g,e){
    const chapter=clamp(g.profile?.chapter||0,0,4),pattern=e.v11Pattern||BOSS_PATTERNS[chapter],cycle=Math.floor((e.battleTicks||0)/18);
    return pattern[cycle%pattern.length];
  }
  function attackPhase(g,e){
    const cadence=.055,clock=(e.battleTicks||0)+(g.battleTimer||0)/cadence;
    return ((clock%18)/18+1)%1;
  }
  function installMiniEvents(g){
    const s=ensure(g);if(s.miniEventsInstalled)return;s.miniEventsInstalled=true;
    const available=Math.max(0,(g.levelLength||260)-125);if(available<50)return;
    const count=s.intensity>=1.18?2:1;
    for(let i=0;i<count;i++){
      const distance=78+i*Math.max(62,available/(count+1))+hash(g.level*9.7+i)*28;
      g.objects.push({type:'v11Event',kind:MINI_EVENTS[(g.level+i*2)%MINI_EVENTS.length],distance:Math.min((g.levelLength||260)-88,distance),phase:hash(g.level*3.1+i)*TAU,processed:false});
    }
    g.objects.sort((a,b)=>a.distance-b.distance);
  }

  const oldCrowdDraw=C.draw;
  C.draw=function(count,rootX,rootZ,color,time,opts={}){
    const g=window.__sleepRoad,motion=(opts.enemy?this.enemyMotion:this.playerMotion)||opts.motion,isPlayer=!opts.enemy&&!!motion,original=this.formation;
    if(!isPlayer)return oldCrowdDraw.call(this,count,rootX,rootZ,color,time,opts);
    const st=g?ensure(g):null;
    this.formation=function(n){
      const base=original.call(this,n),metrics=this.metrics(n),depth=Math.max(.01,metrics.depth),width=n<18?.80:n<55?.92:n<130?1.02:1.08,zScale=n<18?.90:n>170?.93:1;
      return base.map(q=>{
        const t=clamp(q.z/depth,0,1),edge=Math.abs(q.x)/Math.max(.1,(metrics.cols-1)*metrics.spacing*.5),leader=q.index===0;
        let x=q.x*width,z=q.z*zScale+edge*.08;
        if(leader){x=0;z=-.28;}
        else if(q.z<.12)z+=.14;
        if(st?.reaction==='recoil')z+=st.reactionPower*(.18+.12*(1-t));
        if(st?.reaction==='fear')x*=1+.08*st.reactionPower;
        return{...q,x,z};
      });
    };
    try{return oldCrowdDraw.call(this,count,rootX,rootZ,color,time,opts);}finally{this.formation=original;}
  };

  function drawLeader(g){
    if(!g.crowdBatch||g.state==='menu'||g.state==='failed')return;
    const r=g.renderer,m=g.meshes,s=ensure(g),skin=R.currentSkin(g),jump=g.jumpTimer>0?.50:0,x=g.playerX,z=g.playerZ-.32,y=2.10+jump,t=g.time;
    const c=s.leaderColor||COLORS.gold,pulse=.08+.025*Math.sin(t*5);
    r.draw(m.sphere,compose(x,y,z,0,0,0,.10+pulse,.06+pulse*.5,.10+pulse),c,.92);
    r.draw(m.cone,compose(x,y+.20,z,0,0,Math.PI,.18,.28,.18),c,.88);
    if(skin?.gear==='headband')r.draw(m.box,compose(x,y-.52,z-.04,0,0,0,.42,.06,.18),skin.aura||c,.96);
    else if(skin?.gear==='helmet')r.draw(m.sphere,compose(x,y-.49,z,0,0,0,.34,.22,.34),mix(c,COLORS.white,.32),.36);
    else if(skin?.gear==='backpack')r.draw(m.box,compose(x,y-.92,z+.24,0,0,0,.28,.40,.18),skin.aura||c,.72);
    else if(skin?.gear==='crown'){for(let i=-1;i<=1;i++)r.draw(m.cone,compose(x+i*.10,y+.12,z,0,0,0,.08,.18,.08),c,.94);}
    if(skin?.aura&&Q.preset(g).propDetail>.7)for(let i=0;i<3;i++){const a=t*1.8+i*TAU/3;r.draw(m.sphere,compose(x+Math.cos(a)*.42,y-.55+Math.sin(a*1.7)*.08,z+Math.sin(a)*.22,0,0,0,.04,.04,.04),skin.aura,.60);}
  }

  function drawAtmosphere(g){
    const cfg=LIGHTING[g.biome?.id]||LIGHTING.meadow,r=g.renderer,m=g.meshes,q=Q.preset(g),layers=q.propDetail>.7?3:2;
    for(let i=0;i<layers;i++){
      const z=-72-i*26,alpha=cfg.strength*(1-i*.18),w=42+i*12,h=7+i*2;
      r.draw(m.sphere,compose(0,2.0+i*.35,z,0,0,0,w,h,6+i*2),cfg.haze,alpha);
    }
  }
  function drawChapterPortal(g){
    if(!(g.level<=50&&g.profile?.local===1))return;
    const z=38-g.travel;if(z<-16||z>16)return;
    const r=g.renderer,m=g.meshes,p=g.biome.palette,t=g.time,pulse=.10+.04*Math.sin(t*4);
    for(const side of[-1,1]){const x=side*5.7;r.draw(m.box,compose(x,2.0,z,0,0,0,.50,4.0,.70),p.structure);r.draw(m.sphere,compose(x,4.05,z,0,0,0,.18+pulse,.18+pulse,.18+pulse),p.accent,.88);}
    r.draw(m.box,compose(0,4.0,z,0,0,0,11.8,.45,.72),p.structure);
    r.draw(m.box,compose(0,3.48,z-.10,0,0,0,10.4,.10,.20),p.accent,.74);
  }

  function drawMiniEvent(g,o,z){
    const r=g.renderer,m=g.meshes,p=g.biome.palette,t=g.time+o.phase;
    if(o.kind==='train'){
      const y=4.15,x=Math.sin(t*.45)*4.2;
      for(const side of[-1,1])r.draw(m.box,compose(side*6.6,2.05,z,0,0,0,.55,4.1,.65),p.structure);
      r.draw(m.box,compose(0,4.0,z,0,0,0,14,.35,.70),p.structure);
      for(let i=-2;i<=2;i++){const cx=x+i*2.15;r.draw(m.box,compose(cx,y,z-.10,0,0,0,1.9,.92,.82),i%2?mix(p.structure,p.accent,.28):p.structure);r.draw(m.box,compose(cx,y+.10,z-.54,0,0,0,1.30,.28,.04),p.accent,.70);}
    }else if(o.kind==='containers'){
      const side=o.phase>Math.PI?1:-1,x=side*8.2,bob=Math.sin(t*.9)*.35;r.draw(m.cylinder,compose(x,2.6,z,0,0,0,.14,5.2,.14),p.structure);r.draw(m.box,compose(x-side*2.0,4.85,z,0,0,0,4.2,.15,.18),p.structure);r.draw(m.box,compose(x-side*2.5,2.6+bob,z,0,0,0,1.7,1.35,1.2),p.accent,.92);
    }else if(o.kind==='tunnel'){
      for(let i=0;i<4;i++){const zz=z-i*2.1;r.draw(m.box,compose(-6.0,2.0,zz,0,0,0,.30,4.0,.40),p.structure);r.draw(m.box,compose(6.0,2.0,zz,0,0,0,.30,4.0,.40),p.structure);r.draw(m.box,compose(0,4.0,zz,0,0,0,12.2,.30,.40),mix(p.structure,p.accent,.16));}
    }else if(o.kind==='drones'){
      for(let i=0;i<4;i++){const a=t*1.1+i*TAU/4,x=Math.cos(a)*4.8,y=3.2+Math.sin(a*1.7)*.45,zz=z+Math.sin(a)*1.4;r.draw(m.sphere,compose(x,y,zz,0,0,0,.28,.18,.28),p.structure);r.draw(m.sphere,compose(x,y-.18,zz,0,0,0,.07,.07,.07),p.accent,.92);}
    }else{
      for(const side of[-1,1]){const x=side*6.4;r.draw(m.cylinder,compose(x,1.6,z,0,0,0,.18,3.2,.18),p.structure);r.draw(m.box,compose(x,.42,z,0,0,0,.24,.18,9),p.structure);}
      r.draw(m.box,compose(0,3.08,z,0,0,0,13,.24,.50),mix(p.structure,p.accent,.18),.92);
    }
  }

  function drawBossWarning(g,o,z){
    if(!o.boss||g.state!=='battle'||o!==g.battleEnemy)return;
    const phase=attackPhase(g,o),type=attackTypeFor(g,o),r=g.renderer,m=g.meshes,p=g.biome.palette,rootZ=z-2.25,warn=phase<.46,alpha=warn?(.16+.16*Math.sin(g.time*10)*.5+.08):.04,c=mix(p.bad,[1,.08,.04],.25);
    let cx=0,cz=rootZ+2.7,w=4.2,d=3.0;
    if(type==='slam'){w=7.6;d=3.6;cz=rootZ+3.0;}
    else if(type==='stomp'){w=3.5;d=3.5;cz=rootZ+1.4;}
    else if(type==='sweep'){w=10.2;d=1.55;cz=rootZ+2.4;}
    r.draw(m.box,compose(cx,.038,cz,0,0,0,w,.025,d),c,alpha);
    if(warn){for(const side of[-1,1])r.draw(m.sphere,compose(side*Math.min(4.7,w*.42),.16,cz-d*.32,0,0,0,.08,.08,.08),p.bad,.94);}
    const ui=ensureUI(g),cycle=Math.floor((o.battleTicks||0)/18);
    if(warn&&cycle!==ensure(g).bossWarnCycle){ensure(g).bossWarnCycle=cycle;ui.warn.querySelector('b').textContent=type==='slam'?'УДАР СВЕРХУ':type==='stomp'?'ТОПОТ':type==='sweep'?'РАЗМАХ':'УДАР';ui.warn.querySelector('small').textContent='ПРИГОТОВЬСЯ';ui.warn.classList.remove('hidden');clearTimeout(g.__v11WarnHide);g.__v11WarnHide=setTimeout(()=>ui.warn.classList.add('hidden'),520);}
  }
  function drawBossVariant(g,o,z){
    if(!o.boss)return;const variant=BOSS_VARIANTS[clamp(g.profile?.chapter||0,0,4)],r=g.renderer,m=g.meshes,scale=o.bossScale||3.25,rootZ=z-2.25,t=g.time;
    if(variant.gear==='bands'){for(const x of[-.70,.70])r.draw(m.cylinder,compose(x*scale*.28,2.65,rootZ-.28,Math.PI/2,0,0,.18,.18,.18),variant.accent,.90);}
    else if(variant.gear==='bracers'){for(const x of[-.72,.72])r.draw(m.box,compose(x*scale*.30,2.65,rootZ-.26,0,0,0,.42,.30,.34),variant.accent,.88);}
    else if(variant.gear==='helmet'){r.draw(m.sphere,compose(0,4.45,rootZ,0,0,0,.92,.48,.82),variant.accent,.34);r.draw(m.box,compose(0,4.45,rootZ-.56,0,0,0,.72,.10,.08),[.12,.14,.16],.90);}
    else if(variant.gear==='plates'){for(const x of[-1,1])r.draw(m.box,compose(x*.88,3.25,rootZ,0,0,x*.15,.62,.25,.48),variant.accent,.72);}
    else for(let i=0;i<5;i++){const a=t*1.3+i*TAU/5;r.draw(m.sphere,compose(Math.cos(a)*1.25,3.5+Math.sin(a*1.4)*.42,rootZ+Math.sin(a)*.50,0,0,0,.12,.12,.12),variant.accent,.78);}
  }
  function drawBossCorpse(g){
    const c=ensure(g).corpse;if(!c||c.life<=0)return;
    const p=clamp(1-c.life/c.max,0,1),fall=Math.sin(Math.min(1,p)*Math.PI*.5),r=g.renderer,m=g.meshes,alpha=clamp(c.life/.28,0,1),rot=fall*1.38,scale=c.scale||3.3;
    const z=c.z-(g.travel-(c.travel||g.travel));r.draw(m.character,compose(0,.42+Math.cos(p*Math.PI)*.12,z,rot,0,Math.sin(p*Math.PI)*.08,scale,scale,scale),c.color,alpha);
    if(p>.52&&p<.72)for(let i=0;i<5;i++){const a=i*TAU/5;r.draw(m.sphere,compose(Math.cos(a)*1.4,.12,z+Math.sin(a)*.8,0,0,0,.10,.06,.10),[.60,.55,.48],.34);}
  }

  function drawObstacleTelegraph(g,o,z){
    if(z<-16||z>11)return;const r=g.renderer,m=g.meshes,p=g.biome.palette,t=g.time*(o.speed||1)+(o.phase||0),pulse=.10+.09*(Math.sin(g.time*9)*.5+.5),c=mix(p.bad,[1,.06,.03],.25);
    if(['saw','hammer','crusher','movingWall','laser','spikes','mines','fireline'].includes(o.kind)){
      for(const x of[-5.45,5.45])r.draw(m.sphere,compose(x,.22,z-.35,0,0,0,pulse,pulse,pulse),c,.88);
    }
    if(o.kind==='hammer'){const x=Math.sin(t)*Math.abs(o.range||2.4);r.draw(m.box,compose(x,.035,z+.45,0,0,0,2.0,.022,1.3),c,.15);}
    else if(o.kind==='crusher'||o.kind==='movingWall')r.draw(m.box,compose(0,.034,z+.38,0,0,0,9.8,.022,1.1),c,.11+.06*Math.abs(Math.sin(t*2)));
    else if(o.kind==='laser')r.draw(m.box,compose(0,.035,z+.28,0,0,0,10.0,.020,.65),c,.10+.08*Math.abs(Math.sin(t*3)));
  }

  function drawFinishV11(g){
    const r=g.renderer,m=g.meshes,p=g.biome.palette,prog=g.finishProgress||0,t=g.time;
    r.draw(m.box,compose(0,.08,g.playerZ-13.7,0,0,0,5.0,.12,2.0),mix(p.road,p.accent,.10),.92);
    for(const side of[-1,1]){
      const x=side*4.2;r.draw(m.cylinder,compose(x,2.3,g.playerZ-12.7,0,0,0,.10,4.6,.10),p.structure);
      const sweep=Math.sin(t*1.8+side)*.55;r.draw(m.box,compose(x-side*.45,4.45,g.playerZ-12.7,.10,0,sweep,.80,.12,.16),p.accent,.82);
    }
    const c=ensure(g).leaderColor||COLORS.gold,ly=.55+Math.sin(prog*Math.PI)*.35;
    r.draw(m.cone,compose(0,ly+1.05,g.playerZ-14.2,0,0,Math.PI,.28,.42,.28),c,.94);
    for(let i=0;i<6;i++){const a=t*1.5+i*TAU/6;r.draw(m.sphere,compose(Math.cos(a)*1.3,1.2+Math.sin(a*1.7)*.35,g.playerZ-14.2+Math.sin(a)*.45,0,0,0,.055,.055,.055),i%2?p.accent:p.good,.72);}
  }

  const oldStart=P.startLevel;
  P.startLevel=function(level){
    oldStart.call(this,level);this.v11=null;const s=ensure(this);s.miniEventsInstalled=false;installMiniEvents(this);showChapter(this);
    const light=LIGHTING[this.biome?.id]||LIGHTING.meadow;if(this.biome)this.biome.lightDir=light.dir.slice();
  };

  const oldApplyGate=P.applyGate;
  P.applyGate=function(opt){
    const before=this.playerCount;oldApplyGate.call(this,opt);const after=this.playerCount,delta=after-before,good=delta>=0,s=ensure(this);
    s.gateFx={life:.68,max:.68,good,delta};s.cameraKick=Math.max(s.cameraKick,opt?.op==='mul'?.9:.45);showReaction(this,good?'cheer':'recoil',good?.65:.82,.58);showGatePop(this,good,delta,opt);haptic(good?20:[20,30,20]);this.audio?.v11Gate?.(good);
  };

  const oldHit=P.hitObstacle;
  P.hitObstacle=function(o,repeat=false){
    const result=oldHit.call(this,o,repeat);if(result?.damage){showReaction(this,'recoil',1,.50);ensure(this).cameraKick=1;haptic([25,20,35]);this.audio?.v11Impact?.(.8);}else if(result?.contact===false)showReaction(this,'fear',.34,.22);return result;
  };

  const oldBeginBattle=P.beginBattle;
  P.beginBattle=function(enemy){
    oldBeginBattle.call(this,enemy);if(!enemy?.boss)return;
    const chapter=clamp(this.profile?.chapter||0,0,4),s=ensure(this);enemy.v11Pattern=BOSS_PATTERNS[chapter].slice();enemy.v11AttackType=enemy.v11Pattern[0];enemy.v11Stagger=0;s.bossLastRatio=1;s.bossWarnCycle=-1;s.cameraKick=1;showReaction(this,'fear',.55,.60);haptic([30,40,30]);
  };

  const oldBattle=P.updateBattle;
  P.updateBattle=function(dt){
    const e=this.battleEnemy,beforeTicks=e?.battleTicks||0,beforeRatio=e?.boss?e.count/Math.max(1,e.maxCount||e.count):1;
    oldBattle.call(this,dt);
    if(e?.boss){
      e.v11AttackType=attackTypeFor(this,e);
      e.v11Stagger=Math.max(0,(e.v11Stagger||0)-dt*2.8);
      const afterRatio=e.count/Math.max(1,e.maxCount||1),beforeQuarter=Math.floor(beforeRatio*4+.0001),afterQuarter=Math.floor(afterRatio*4+.0001);
      if(e.count>0&&afterQuarter<beforeQuarter){e.v11Stagger=1;showReaction(this,'cheer',.40,.34);this.audio?.v11Stagger?.();haptic(18);}
      const attackCycle=e.v13Phase>=3?13:e.v13Phase>=2?15:18,impactTick=Math.max(5,Math.round(attackCycle*.44));for(let tick=beforeTicks+1;tick<=(e.battleTicks||0);tick++)if(tick%attackCycle===impactTick){showReaction(this,'recoil',.95,.46);ensure(this).cameraKick=1.1;haptic([35,25,45]);this.audio?.v11Impact?.(1);}
      if(!this.battleEnemy&&e.count<=0){
        const variant=BOSS_VARIANTS[clamp(this.profile?.chapter||0,0,4)],s=ensure(this);s.corpse={life:1.35,max:1.35,z:e.battleZ-2.25,travel:this.travel,scale:e.bossScale||3.25,color:variant.main};s.cameraKick=1.4;showReaction(this,'cheer',1,1.05);haptic([45,35,70]);this.audio?.v11BossDeath?.();Polish?.cinematic?.(this,1.0);
      }
    }
  };

  const oldBeginFinish=P.beginFinish;
  P.beginFinish=function(){oldBeginFinish.call(this);const s=ensure(this);s.finishPulse=1;s.cameraKick=1.1;showReaction(this,'cheer',1,1.4);haptic([20,30,20,30,40]);this.audio?.v11Finish?.();};

  const oldUpdate=P.update;
  P.update=function(dt){
    oldUpdate.call(this,dt);const s=ensure(this);
    s.cameraKick=Math.max(0,s.cameraKick-dt*2.8);s.finishPulse=Math.max(0,s.finishPulse-dt*.65);
    if(s.reactionTimer>0){s.reactionTimer=Math.max(0,s.reactionTimer-dt);s.reactionPower=clamp(s.reactionTimer/.35,0,1);}else{s.reaction='';s.reactionPower=0;}
    if(s.gateFx){s.gateFx.life-=dt;if(s.gateFx.life<=0)s.gateFx=null;}
    if(s.corpse){s.corpse.life-=dt;if(s.corpse.life<=0)s.corpse=null;}
    if(this.state==='running'&&this.speed>0&&this.audio?.enabled){
      s.stepClock=(s.stepClock||0)-dt;
      if(s.stepClock<=0){const biome=this.biome?.id||'meadow',freq=biome==='factory'?92:biome==='city'?108:biome==='desert'?122:biome==='neon'?148:116;this.audio.tone(freq,.045,biome==='factory'?'square':'triangle',.0048,biome==='desert'?.82:.72);s.stepClock=.33/Math.max(.8,this.speed/Math.max(.1,this.baseSpeed||this.speed));}
    }
  };

  const oldEnv=P.drawEnvironment;
  P.drawEnvironment=function(){oldEnv.call(this);drawAtmosphere(this);drawChapterPortal(this);};

  const oldObstacle=P.drawObstacle;
  P.drawObstacle=function(o,z){drawObstacleTelegraph(this,o,z);oldObstacle.call(this,o,z);};

  const oldEnemy=P.drawEnemy;
  P.drawEnemy=function(o,z){oldEnemy.call(this,o,z);if(o.boss){drawBossWarning(this,o,z);drawBossVariant(this,o,z);}};

  const oldCourse=P.drawCourse;
  P.drawCourse=function(){
    oldCourse.call(this);
    for(const o of this.objects){if(o.type!=='v11Event')continue;const z=this.objectZ(o);if(z<-42||z>16)continue;drawMiniEvent(this,o,z);}
    drawLeader(this);drawBossCorpse(this);
  };

  const oldFinishScene=P.drawFinishScene;
  P.drawFinishScene=function(){oldFinishScene.call(this);drawFinishV11(this);drawLeader(this);};

  const oldRender=P.render;
  P.render=function(){
    oldRender.call(this);const s=ensure(this),r=this.renderer,m=this.meshes;
    if(s.gateFx){const t=1-s.gateFx.life/s.gateFx.max,size=.7+t*2.6,c=s.gateFx.good?(this.biome?.palette?.good||COLORS.teal):(this.biome?.palette?.bad||COLORS.red);r.draw(m.cylinder,compose(this.playerX,.035,this.playerZ+.1,0,0,0,size,.020,size*.70),c,(1-t)*.42);}
  };

  const oldCamera=P.setCamera;
  P.setCamera=function(){
    const r=this.renderer,raw=r.setCamera,st=ensure(this);
    r.setCamera=(eye,target,aspect,fov)=>{
      const desiredEye=eye.slice(),desiredTarget=target.slice();let desiredFov=fov;
      if(this.state==='finish'||this.state==='complete'){const p=this.finishProgress||0;desiredEye[0]+=Math.sin(p*Math.PI)*2.4;desiredTarget[1]+=Math.sin(p*Math.PI)*.35;}
      if(this.state==='battle'&&this.battleEnemy?.boss){desiredEye[2]-=.45*st.cameraKick;desiredTarget[1]+=.15*st.cameraKick;desiredFov+=st.cameraKick*.8*DEG;}
      else desiredFov+=st.cameraKick*.45*DEG;
      if(!st.camera)st.camera={eye:desiredEye.slice(),target:desiredTarget.slice(),fov:desiredFov};
      const k=this.state==='battle'?.26:this.state==='finish'?.20:.16;
      for(let i=0;i<3;i++){st.camera.eye[i]=lerp(st.camera.eye[i],desiredEye[i],k);st.camera.target[i]=lerp(st.camera.target[i],desiredTarget[i],k);}
      st.camera.fov=lerp(st.camera.fov,desiredFov,k);raw.call(r,st.camera.eye,st.camera.target,aspect,st.camera.fov);
    };
    try{oldCamera.call(this);}finally{r.setCamera=raw;}
  };

  window.SleepRoadExperienceV11={BOSS_PATTERNS,BOSS_VARIANTS,LIGHTING,MINI_EVENTS,V11_SKINS,intensityFor,ensure,attackTypeFor,attackPhase,installMiniEvents,showReaction};
})();
