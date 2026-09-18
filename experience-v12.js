'use strict';
(() => {
  const S=window.SleepRoadSystems,D=window.SleepRoadLevelDirector,R=window.SleepRoadProgressionV6,Q=window.SleepRoadQualityV6,V11=window.SleepRoadExperienceV11,Polish=window.SleepRoadPolishV6,P=window.SleepRoad3D&&window.SleepRoad3D.prototype;
  if(!S||!D||!R||!Q||!V11||!P)throw new Error('Sleep Road Experience v12 dependencies are missing');
  const {compose,COLORS,clamp,lerp,RNG}=S,TAU=Math.PI*2;
  const mix=(a,b,t)=>a.map((v,i)=>v+(b[i]-v)*t);
  const hash=n=>{const x=Math.sin(n*83.173+29.411)*43758.5453123;return x-Math.floor(x);};

  const COMBOS=[
    ['saw','hammer'],['laser','movingWall'],['hammer','mines'],['crusher','saw'],
    ['fireline','laser'],['movingWall','hammer'],['pendulum','laser'],['spikes','crusher']
  ];
  const ROAD_EVENTS=['collapseBridge','crossingTrain','craneDrop','blackoutTunnel','stormGate'];
  const RARE_EVENTS=[
    {id:'moonRush',name:'MOON RUSH',desc:'Лун на трассе намного больше'},
    {id:'giantCrowd',name:'GIANT CROWD',desc:'Большая стартовая толпа'},
    {id:'stormRun',name:'STORM RUN',desc:'Усиленная динамическая погода'},
    {id:'speedRun',name:'SPEED RUN',desc:'Скорость уровня увеличена'},
    {id:'obstacleRush',name:'OBSTACLE RUSH',desc:'Дополнительная комбинация препятствий'},
    {id:'luckyRun',name:'LUCKY RUN',desc:'Первые ворота становятся выгоднее'}
  ];
  const WEATHER_PHASES={
    meadow:['clear','pollen','breeze','drizzle'],
    desert:['clear','gust','dust','dust'],
    factory:['steam','smog','sparks','steam'],
    city:['drizzle','rain','clear','rain'],
    neon:['energy','mist','pulse','energy']
  };
  const PERF={
    high:{weather:52,debris:76,eventDetail:1,drawDistance:96,eventDistance:74},
    medium:{weather:38,debris:54,eventDetail:.78,drawDistance:84,eventDistance:64},
    low:{weather:24,debris:36,eventDetail:.58,drawDistance:70,eventDistance:54}
  };
  const V12_ACHIEVEMENTS={
    boss10:{title:'ОХОТНИК НА ГИГАНТОВ',desc:'Победи 10 боссов'},
    noHit5:{title:'НЕПРИКАСАЕМЫЙ',desc:'Пройди 5 уровней подряд без урона'},
    crowd250:{title:'МЕГАТОЛПА',desc:'Собери 250 человек'},
    dodge20:{title:'МАСТЕР МАНЁВРА',desc:'Уклонись от 20 препятствий подряд'},
    allSkins:{title:'КОЛЛЕКЦИОНЕР',desc:'Открой все скины'},
    rare3:{title:'РЕДКИЙ МАРШРУТ',desc:'Сыграй 3 разных редких забега'}
  };
  Object.assign(R.ACHIEVEMENTS,V12_ACHIEVEMENTS);
  for(const [level,p] of Object.entries(Q.PRESETS))Object.assign(p,{
    v12Weather:PERF[level]?.weather||24,
    v12Debris:PERF[level]?.debris||36,
    v12EventDetail:PERF[level]?.eventDetail||.58,
    v12DrawDistance:PERF[level]?.drawDistance||70
  });

  const STATS_KEY='sleep-road-achievements-v12';
  function loadStats(){
    try{
      const raw=localStorage.getItem(STATS_KEY),v=raw?JSON.parse(raw):{};
      return{bossWins:Math.max(0,v.bossWins|0),noHitStreak:Math.max(0,v.noHitStreak|0),bestNoHitStreak:Math.max(0,v.bestNoHitStreak|0),dodgeStreak:Math.max(0,v.dodgeStreak|0),bestDodgeStreak:Math.max(0,v.bestDodgeStreak|0),maxCrowd:Math.max(0,v.maxCrowd|0),rareLevels:Array.isArray(v.rareLevels)?v.rareLevels.filter(Number.isFinite).slice(-30):[]};
    }catch{return{bossWins:0,noHitStreak:0,bestNoHitStreak:0,dodgeStreak:0,bestDodgeStreak:0,maxCrowd:0,rareLevels:[]};}
  }
  function saveStats(v){try{localStorage.setItem(STATS_KEY,JSON.stringify(v));}catch{}}
  function blankPool(size){return Array.from({length:size},()=>({active:false,life:0,max:0,x:0,y:0,z:0,vx:0,vy:0,vz:0,size:.1,spin:0,kind:'box',color:[1,1,1]}));}
  function ensure(g){
    if(!g.v12)g.v12={rare:null,weatherType:'clear',weatherIntensity:0,weatherClock:0,weatherPool:blankPool(56),debrisPool:blankPool(80),eventInstalled:false,combosInstalled:false,finish:{phase:-1,lastBurst:-1},stats:loadStats(),perfScale:1,roadEvents:0};
    return g.v12;
  }
  function budgetFor(g){
    const q=Q.preset(g),base=PERF[q.id]||PERF.low,fps=Q.ensure(g).avgFps||60,scale=fps<34 ? .52 : fps<42 ? .72 : fps<50 ? .86 : 1;
    const rare=ensure(g).rare?.id==='stormRun'?1.18:1;
    return{weather:Math.max(10,Math.round(base.weather*scale*rare)),debris:Math.max(18,Math.round(base.debris*scale)),eventDetail:base.eventDetail*scale,drawDistance:base.drawDistance,eventDistance:base.eventDistance};
  }
  function acquire(pool,limit){
    for(let i=0;i<Math.min(limit,pool.length);i++)if(!pool[i].active){pool[i].active=true;return pool[i];}
    let oldest=pool[0];for(let i=1;i<Math.min(limit,pool.length);i++)if(pool[i].life<oldest.life)oldest=pool[i];oldest.active=true;return oldest;
  }
  function rareEventFor(level){
    level=Math.max(1,Math.floor(level||1));
    if(hash(level*47.119+3.7)>=.35)return null;
    return RARE_EVENTS[Math.floor(hash(level*91.71+17.2)*RARE_EVENTS.length)%RARE_EVENTS.length];
  }
  function ensureUI(g){
    if(g.__v12UI)return g.__v12UI;const app=document.getElementById('app');
    const rare=document.createElement('div');rare.className='v12-rare hidden';rare.innerHTML='<span>RARE RUN</span><b></b><small></small>';app.appendChild(rare);
    const finish=document.createElement('div');finish.className='v12-finish-callout hidden';finish.innerHTML='<span></span><b></b>';app.appendChild(finish);
    const weather=document.createElement('div');weather.className='v12-weather-chip hidden';weather.innerHTML='<i></i><span></span>';app.appendChild(weather);
    g.__v12UI={rare,finish,weather};return g.__v12UI;
  }
  function showRare(g,rare){
    if(!rare)return;const el=ensureUI(g).rare;el.querySelector('b').textContent=rare.name;el.querySelector('small').textContent=rare.desc;el.classList.remove('hidden');clearTimeout(g.__v12RareTimer);g.__v12RareTimer=setTimeout(()=>el.classList.add('hidden'),1900);
  }
  function showFinishPhase(g,kicker,title){
    const el=ensureUI(g).finish;el.querySelector('span').textContent=kicker;el.querySelector('b').textContent=title;el.classList.remove('hidden');clearTimeout(g.__v12FinishTimer);g.__v12FinishTimer=setTimeout(()=>el.classList.add('hidden'),620);
  }
  function weatherLabel(type){return type==='rain'?'ДОЖДЬ':type==='drizzle'?'МОРОСЬ':type==='dust'?'ПЫЛЬ':type==='gust'?'ВЕТЕР':type==='steam'?'ПАР':type==='smog'?'СМОГ':type==='sparks'?'ИСКРЫ':type==='energy'?'ЭНЕРГИЯ':type==='pulse'?'ИМПУЛЬС':type==='mist'?'ТУМАН':type==='pollen'?'ПЫЛЬЦА':type==='breeze'?'БРИЗ':'ЯСНО';}
  function setWeather(g,type,intensity){
    const s=ensure(g);if(type===s.weatherType&&Math.abs(intensity-s.weatherIntensity)<.18)return;
    s.weatherType=type;s.weatherIntensity=intensity;
    const ui=ensureUI(g).weather;if(type==='clear'||intensity<.18){ui.classList.add('hidden');return;}ui.querySelector('i').textContent=type==='rain'||type==='drizzle'?'≋':type==='dust'||type==='gust'?'≈':type==='sparks'||type==='energy'||type==='pulse'?'✦':'◌';ui.querySelector('span').textContent=weatherLabel(type);ui.classList.remove('hidden');
  }

  function findFreeWindow(g,rng,start,end,span=19){
    const blocking=g.objects.filter(o=>['gate','obstacle','enemy','jump','split','merge'].includes(o.type));
    for(let tries=0;tries<48;tries++){
      const d=start+rng.next()*Math.max(1,end-start);
      if(blocking.every(o=>Math.abs(o.distance-d)>7&&Math.abs(o.distance-(d+span*.5))>7&&Math.abs(o.distance-(d+span))>7))return d;
    }
    return null;
  }
  function comboCount(level,extra=0){return level<6?extra:Math.min(3,1+(level>=18?1:0)+(level>=36?1:0)+extra);}
  function installObstacleCombos(g,extra=0){
    const s=ensure(g);if(s.combosInstalled)return;s.combosInstalled=true;
    const count=comboCount(g.level,extra),rng=new RNG(0x12c0ffee+(g.level||1)*6151),end=(g.levelLength||260)-112;if(count<=0||end<92)return;
    for(let i=0;i<count;i++){
      const d=findFreeWindow(g,rng,70,end,20);if(d==null)continue;
      const combo=COMBOS[(g.level+i+Math.floor(rng.next()*COMBOS.length))%COMBOS.length],gap=9.2+rng.range(0,2.0);
      const first=g.makeObstacle(rng,d,g.profile?.intensity||1,combo[0],{v12Combo:true});
      const second=g.makeObstacle(rng,d+gap,g.profile?.intensity||1,combo[1],{v12Combo:true,phase:(first.phase||0)+Math.PI*.72});
      g.objects.push(first,second);
    }
    g.objects.sort((a,b)=>a.distance-b.distance);
  }
  function installRoadEvents(g){
    const s=ensure(g);if(s.eventInstalled)return;s.eventInstalled=true;
    const rng=new RNG(0x7e12aa+(g.level||1)*4099),count=(g.level>=24?2:1),end=(g.levelLength||260)-96;
    if(end<86)return;
    for(let i=0;i<count;i++){
      const d=findFreeWindow(g,rng,62,end,14);if(d==null)continue;
      g.objects.push({type:'v12Event',kind:ROAD_EVENTS[(g.level+i*3)%ROAD_EVENTS.length],distance:d,phase:rng.range(0,TAU),processed:false});s.roadEvents++;
    }
    g.objects.sort((a,b)=>a.distance-b.distance);
  }
  function addMoonRush(g){
    const rng=new RNG(0x9911+(g.level||1)*811),start=62,end=(g.levelLength||260)-92,count=24;
    for(let i=0;i<count;i++){const t=i/Math.max(1,count-1),distance=lerp(start,end,t),x=Math.sin(i*.82)*3.0;g.objects.push({type:'moon',distance,x,processed:false,bonus:i%8===7,spin:rng.range(0,TAU)});}
  }
  function applyRareEvent(g,rare){
    if(!rare)return;const s=ensure(g);
    if(rare.id==='moonRush')addMoonRush(g);
    else if(rare.id==='giantCrowd'){const bonus=12+Math.min(28,Math.floor(g.level/4));g.playerCount=clamp(g.playerCount+bonus,1,S.MAX_CROWD);g.visualCount=Math.max(g.visualCount,g.playerCount);g.setCrowdCount(g.playerCount,true);}
    else if(rare.id==='stormRun')s.weatherBoost=1.55;
    else if(rare.id==='speedRun'){g.baseSpeed*=1.11;g.speed=g.baseSpeed;}
    else if(rare.id==='obstacleRush')s.obstacleRush=true;
    else if(rare.id==='luckyRun'){
      let touched=0;for(const o of g.objects){if(o.type!=='gate'||o.risk||touched>=2)continue;for(const side of['left','right']){const x=o[side];if(x.op==='sub'||x.op==='div')o[side]={op:'add',value:8+Math.floor(g.level/5)};}touched++;}
    }
    if(!s.stats.rareLevels.includes(g.level)){s.stats.rareLevels.push(g.level);s.stats.rareLevels=s.stats.rareLevels.slice(-30);saveStats(s.stats);}
    if(s.stats.rareLevels.length>=3)R.unlockAchievement(g,'rare3');
    g.objects.sort((a,b)=>a.distance-b.distance);showRare(g,rare);
  }

  function spawnDebris(g,x,y,z,count,color,force=1){
    const s=ensure(g),limit=budgetFor(g).debris,n=Math.min(count,limit);
    for(let i=0;i<n;i++){const p=acquire(s.debrisPool,limit),a=hash((g.time+i)*19.3)*TAU,spd=(1.4+hash(i*7.1+g.time)*3.2)*force;p.active=true;p.life=p.max=.55+hash(i*4.3)*.65;p.x=x+(hash(i*2.2)-.5)*.7;p.y=y;p.z=z+(hash(i*5.1)-.5)*.4;p.vx=Math.cos(a)*spd;p.vy=1.8+hash(i*6.8)*3.8;p.vz=Math.sin(a)*spd*.55;p.size=.07+hash(i*8.7)*.15;p.spin=(hash(i*9.9)-.5)*9;p.kind=i%3?'box':'sphere';p.color=color||[.5,.5,.5];}
  }
  function updateDebris(g,dt){
    const s=ensure(g);for(const p of s.debrisPool){if(!p.active)continue;p.life-=dt;if(p.life<=0){p.active=false;continue;}p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt;p.vy-=8.8*dt;p.spin+=dt*5;}
  }
  function drawDebris(g){
    const s=ensure(g),r=g.renderer,m=g.meshes,b=budgetFor(g),max=b.debris;let drawn=0;
    for(const p of s.debrisPool){if(!p.active||drawn>=max)continue;if(p.z<g.playerZ-b.drawDistance||p.z>g.playerZ+18)continue;const a=clamp(p.life/p.max,0,1),mesh=p.kind==='sphere'?m.sphere:m.box;r.draw(mesh,compose(p.x,p.y,p.z,p.spin,p.spin*.6,p.spin*.3,p.size,p.size,p.size),p.color,a);drawn++;}
  }

  function spawnWeather(g,type,intensity){
    if(type==='clear')return;const s=ensure(g),b=budgetFor(g),limit=b.weather,rate=Math.max(1,Math.round(intensity*(type==='rain'?5:type==='drizzle'?3:2)));
    for(let i=0;i<rate;i++){
      const p=acquire(s.weatherPool,limit),seed=g.time*13.1+i*7.7;p.active=true;p.life=p.max=type==='rain'||type==='drizzle'?1.2:1.8;p.x=g.playerX+(hash(seed)-.5)*18;p.z=g.playerZ-8-hash(seed+2)*52;p.y=.5+hash(seed+5)*7;p.vx=type==='gust'||type==='dust'?2.2+intensity*2:type==='pollen'||type==='energy'?(hash(seed+8)-.5)*.4:0;p.vy=type==='rain' ? -8.8 : type==='drizzle' ? -5.4 : type==='sparks' ? -1.8 : (type==='steam'||type==='mist') ? .9 : (hash(seed+9)-.5)*.15;p.vz=type==='gust'||type==='dust'?1.5:0;p.size=type==='rain' ? .035 : type==='drizzle' ? .028 : (type==='steam'||type==='mist') ? .18 : .06;p.spin=hash(seed+11)*TAU;p.kind=type;p.color=type==='sparks'?[1,.56,.16]:type==='energy'||type==='pulse'?[.32,1,.86]:type==='pollen'?[1,.88,.40]:type==='rain'||type==='drizzle'?[.58,.78,1]:type==='dust'||type==='gust'?[.78,.58,.32]:[.72,.76,.78];
    }
  }
  function updateWeather(g,dt){
    const s=ensure(g);if(g.state==='menu'||g.state==='complete'||g.state==='failed'){setWeather(g,'clear',0);for(const p of s.weatherPool)p.active=false;return;}
    const phases=WEATHER_PHASES[g.biome?.id]||WEATHER_PHASES.meadow,idx=Math.floor(((g.travel||0)+(g.level||1)*17)/62)%phases.length,type=s.rare?.id==='stormRun'?(g.biome?.id==='desert'?'dust':g.biome?.id==='factory'?'steam':'rain'):phases[idx],wave=.48+.42*(Math.sin((g.travel||0)*.022+(g.level||1))*.5+.5),boost=s.weatherBoost||1,intensity=type==='clear'?0:clamp(wave*boost,0,1.6);
    setWeather(g,type,intensity);s.weatherClock-=dt;if(s.weatherClock<=0){spawnWeather(g,type,intensity);s.weatherClock=.055/Math.max(.35,intensity);}
    for(const p of s.weatherPool){if(!p.active)continue;p.life-=dt;if(p.life<=0||p.y<-.5){p.active=false;continue;}p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt;if(p.kind==='steam'||p.kind==='mist')p.size+=dt*.05;}
  }
  function drawWeather(g){
    const s=ensure(g),r=g.renderer,m=g.meshes,b=budgetFor(g);let drawn=0;
    for(const p of s.weatherPool){if(!p.active||drawn>=b.weather)continue;if(p.z<g.playerZ-b.drawDistance||p.z>g.playerZ+12)continue;const a=clamp(p.life/p.max,0,1),type=p.kind;
      if(type==='rain'||type==='drizzle')r.draw(m.box,compose(p.x,p.y,p.z,.18,0,0,p.size,p.size*(type==='rain'?9:6),p.size),p.color,a*.56);
      else if(type==='steam'||type==='mist')r.draw(m.sphere,compose(p.x,p.y,p.z,0,0,0,p.size*2,p.size,p.size*2),p.color,a*.18);
      else r.draw(m.sphere,compose(p.x,p.y,p.z,0,0,0,p.size,p.size,p.size),p.color,a*((type==='dust'||type==='gust') ? .30 : .62));drawn++;
    }
    if((s.weatherType==='dust'||s.weatherType==='rain'||s.weatherType==='smog')&&s.weatherIntensity>.55){const c=s.weatherType==='dust'?[.72,.55,.34]:s.weatherType==='smog'?[.42,.46,.50]:[.42,.58,.72];r.draw(m.sphere,compose(0,2.2,-48,0,0,0,34,6,22),c,.035*Math.min(1.4,s.weatherIntensity));}
  }

  function drawRoadEvent(g,o,z){
    const b=budgetFor(g);if(z<-b.eventDistance||z>18)return;const d=b.eventDetail,r=g.renderer,m=g.meshes,p=g.biome.palette,t=g.time+o.phase;
    if(o.kind==='collapseBridge'){
      for(const side of[-1,1])r.draw(m.box,compose(side*6.45,.25,z,0,0,0,.26,.34,10),p.structure,.88);
      const pieces=d>.7?7:4;for(let i=0;i<pieces;i++){const x=(i-(pieces-1)/2)*1.45,y=-.05-Math.max(0,i-3)*.07,rot=(i%2?1:-1)*.04*Math.sin(t*.8+i);r.draw(m.box,compose(x,y,z-i*.28,rot,0,(i-3)*.012,1.35,.20,2.2),i%2?p.road:mix(p.road,p.structure,.10),.96);}
    }else if(o.kind==='crossingTrain'){
      const x=((t*.95)%18)-9,y=3.65;r.draw(m.box,compose(0,4.5,z,0,0,0,14,.20,.36),p.structure);for(let i=-2;i<=2;i++){const xx=x+i*2.25;r.draw(m.box,compose(xx,y,z-.4,0,0,0,2.0,.86,.70),i%2?mix(p.structure,p.accent,.30):p.structure);if(d>.7)r.draw(m.box,compose(xx,y+.05,z-.77,0,0,0,1.25,.24,.04),p.accent,.72);}
    }else if(o.kind==='craneDrop'){
      const side=o.phase>Math.PI?1:-1,frontCull=(g.playerZ||1.6)-5.8;if(z>=frontCull)return;
      const fade=clamp((frontCull-z)/5.5,0,1),x=side*9.6,armCenter=x-side*1.55,containerX=side*7.75,drop=1.1+Math.abs(Math.sin(t*.68))*2.35,containerColor=mix(p.structure,p.accent,.46);
      r.draw(m.cylinder,compose(x,2.45,z,0,0,0,.10,4.9,.10),p.structure,.90*fade);
      r.draw(m.box,compose(armCenter,4.65,z,0,0,0,3.15,.11,.14),p.structure,.90*fade);
      r.draw(m.box,compose(containerX,drop,z-.55,0,t*.08,0,1.08,.82,.78),containerColor,.84*fade);
      r.draw(m.box,compose(containerX,3.72+(drop-1.1)*.22,z-.55,0,0,0,.025,2.45,.025),p.structure,.55*fade);
    }else if(o.kind==='blackoutTunnel'){
      const rings=d>.75?5:3;for(let i=0;i<rings;i++){const zz=z-i*2.2;r.draw(m.box,compose(-5.95,2.1,zz,0,0,0,.30,4.2,.35),p.structure);r.draw(m.box,compose(5.95,2.1,zz,0,0,0,.30,4.2,.35),p.structure);r.draw(m.box,compose(0,4.12,zz,0,0,0,12.2,.28,.35),p.structure);if(i%2===0)r.draw(m.sphere,compose(0,3.75,zz-.2,0,0,0,.10,.06,.10),Math.sin(t*6+i)>.15?p.accent:[.06,.06,.08],.85);}
    }else{
      for(const side of[-1,1]){const x=side*5.8;r.draw(m.cylinder,compose(x,1.5,z,0,0,0,.10,3.0,.10),p.structure);r.draw(m.sphere,compose(x,3.0,z,0,0,0,.13,.13,.13),p.accent,.88);}for(let i=0;i<(d>.7?7:4);i++){const a=t*1.4+i*TAU/7;r.draw(m.sphere,compose(Math.cos(a)*4.2,2.0+Math.sin(a*1.7)*.65,z+Math.sin(a)*1.3,0,0,0,.07,.07,.07),i%2?p.accent:p.good,.66);}
    }
  }
  function triggerRoadEvent(g,o){
    if(o.v12Triggered)return;o.v12Triggered=true;const p=g.biome?.palette||{},accent=p.accent||COLORS.gold,structure=p.structure||[.5,.5,.5];
    if(o.kind==='collapseBridge'){spawnDebris(g,0,.35,g.playerZ-2,18,structure,1.0);g.toast?.('МОСТ РУШИТСЯ!',700);}
    else if(o.kind==='crossingTrain'){g.toast?.('ПОЕЗД НАД ТРАССОЙ',650);}
    else if(o.kind==='craneDrop'){const side=o.phase>Math.PI?1:-1;spawnDebris(g,side*7.3,.85,g.playerZ-3.5,9,mix(structure,accent,.45),.55);g.toast?.('КРАН У ОБОЧИНЫ',650);}
    else if(o.kind==='blackoutTunnel'){g.toast?.('BLACKOUT!',650);g.flash=Math.max(g.flash,.10);}
    else {spawnDebris(g,0,.45,g.playerZ-1.8,10,mix(structure,COLORS.white,.45),.45);g.toast?.('ШТОРМОВОЙ ФРОНТ',650);}
    g.shake=Math.max(g.shake,3.5);try{navigator.vibrate?.(18);}catch{}
  }


  function finishPhase(progress){return progress<.14?0:progress<.38?1:progress<.78?2:3;}
  function updateFinishSequence(g){
    const s=ensure(g),p=g.finishProgress||0,phase=finishPhase(p);if(phase===s.finish.phase)return;s.finish.phase=phase;
    if(phase===0)showFinishPhase(g,g.profile?.finalBoss?'BOSS DOWN':'FINISH','SLOW MOTION');
    else if(phase===1)showFinishPhase(g,'RUNWAY','ТОЛПА ВПЕРЁД');
    else if(phase===2)showFinishPhase(g,'MULTIPLIER','×'+(g.finishMultiplier||1).toFixed(2));
    else showFinishPhase(g,'CLEAR','ПОБЕДА');
    if(phase<=2&&phase!==s.finish.lastBurst){s.finish.lastBurst=phase;spawnDebris(g,g.playerX,.35,g.playerZ-5-phase*3,8,phase===2?COLORS.gold:(g.biome?.palette?.accent||COLORS.blue),.55);}
  }
  function drawFinishV12(g){
    const p=g.finishProgress||0,r=g.renderer,m=g.meshes,c=g.biome.palette.accent,t=g.time;if(p<.12){const s=.16+.04*Math.sin(t*8);for(let i=0;i<5;i++){const a=i*TAU/5;r.draw(m.sphere,compose(Math.cos(a)*2.0,.42,g.playerZ-5+Math.sin(a)*.9,0,0,0,s,s*.55,s),c,.42);}}
    if(p>.20){for(const side of[-1,1]){const x=side*5.6;r.draw(m.sphere,compose(x,2.8,g.playerZ-7.2,0,0,0,.12,.12,.12),COLORS.gold,.72);if(p>.58)r.draw(m.box,compose(x,2.2,g.playerZ-10.5,0,0,side*.22,.10,3.8,.12),c,.62);}}
  }

  function achievementProgress(g,key){
    const st=ensure(g).stats,done=!!R.ensureState(g).achievements[key],level=g.save?.level||g.level||1,totalSkins=R.SKINS.length,unlocked=R.unlockedSkins(level).length;
    if(key==='boss10')return{value:st.bossWins,target:10,ratio:done?1:clamp(st.bossWins/10,0,1),label:Math.min(st.bossWins,10)+' / 10'};
    if(key==='noHit5')return{value:st.noHitStreak,target:5,ratio:done?1:clamp(st.noHitStreak/5,0,1),label:Math.min(st.noHitStreak,5)+' / 5'};
    if(key==='crowd250')return{value:st.maxCrowd,target:250,ratio:done?1:clamp(st.maxCrowd/250,0,1),label:Math.min(st.maxCrowd,250)+' / 250'};
    if(key==='dodge20')return{value:st.dodgeStreak,target:20,ratio:done?1:clamp(st.dodgeStreak/20,0,1),label:Math.min(st.dodgeStreak,20)+' / 20'};
    if(key==='allSkins')return{value:unlocked,target:totalSkins,ratio:done?1:clamp(unlocked/Math.max(1,totalSkins),0,1),label:unlocked+' / '+totalSkins};
    if(key==='rare3')return{value:st.rareLevels.length,target:3,ratio:done?1:clamp(st.rareLevels.length/3,0,1),label:Math.min(st.rareLevels.length,3)+' / 3'};
    return null;
  }
  function checkSkinAchievement(g){if(R.unlockedSkins(g.save?.level||g.level).length>=R.SKINS.length)R.unlockAchievement(g,'allSkins');}
  function markCrowd(g,n){const s=ensure(g),st=s.stats;if(n>st.maxCrowd){st.maxCrowd=n;saveStats(st);}if(n>=250)R.unlockAchievement(g,'crowd250');}

  const oldStart=P.startLevel;
  P.startLevel=function(level){
    oldStart.call(this,level);this.v12=null;const s=ensure(this);s.rare=rareEventFor(this.level);s.stats=loadStats();s.combosInstalled=false;s.eventInstalled=false;
    installObstacleCombos(this,s.rare?.id==='obstacleRush'?1:0);installRoadEvents(this);applyRareEvent(this,s.rare);checkSkinAchievement(this);markCrowd(this,this.playerCount);
  };

  const oldSetCount=P.setCrowdCount;
  P.setCrowdCount=function(v,pop){oldSetCount.call(this,v,pop);markCrowd(this,Math.max(0,Math.round(v)));};

  const oldHit=P.hitObstacle;
  P.hitObstacle=function(o,repeat=false){
    const beforeDodges=this.dodgedObstacles||0,result=oldHit.call(this,o,repeat),s=ensure(this),st=s.stats;
    if(result?.damage){st.dodgeStreak=0;spawnDebris(this,this.playerX,.50,this.playerZ,14,this.biome?.palette?.structure||[.5,.5,.5],.95);}
    else if((this.dodgedObstacles||0)>beforeDodges){st.dodgeStreak++;st.bestDodgeStreak=Math.max(st.bestDodgeStreak,st.dodgeStreak);if(st.dodgeStreak>=20)R.unlockAchievement(this,'dodge20');}
    saveStats(st);return result;
  };

  const oldBattle=P.updateBattle;
  P.updateBattle=function(dt){
    const e=this.battleEnemy,boss=e?.boss===true;oldBattle.call(this,dt);
    if(boss&&e&&e.count<=0&&!this.battleEnemy){const st=ensure(this).stats;st.bossWins++;saveStats(st);if(st.bossWins>=10)R.unlockAchievement(this,'boss10');spawnDebris(this,0,.55,e.battleZ-2.2,26,this.biome?.palette?.accent||COLORS.gold,1.35);}
  };

  const oldShow=P.showResult;
  P.showResult=function(won){
    const took=!!this.tookDamage;oldShow.call(this,won);const st=ensure(this).stats;
    if(won&&!took){st.noHitStreak++;st.bestNoHitStreak=Math.max(st.bestNoHitStreak,st.noHitStreak);}else st.noHitStreak=0;
    if(st.noHitStreak>=5)R.unlockAchievement(this,'noHit5');checkSkinAchievement(this);saveStats(st);
  };

  const oldBeginFinish=P.beginFinish;
  P.beginFinish=function(){oldBeginFinish.call(this);const s=ensure(this);s.finish={phase:-1,lastBurst:-1};updateFinishSequence(this);};

  const oldFinish=P.updateFinish;
  P.updateFinish=function(dt){const p=this.finishProgress||0,slow=p<.14 ? .62 : p<.30 ? .84 : 1;oldFinish.call(this,dt*slow);updateFinishSequence(this);};

  const oldUpdate=P.update;
  P.update=function(dt){
    oldUpdate.call(this,dt);updateDebris(this,dt);updateWeather(this,dt);
    if(this.state==='running')for(const o of this.objects){if(o.type!=='v12Event'||o.v12Triggered)continue;const z=this.objectZ(o);if(z<this.playerZ+1.1&&z>this.playerZ-1.4)triggerRoadEvent(this,o);}
    if(this.state==='finish')updateFinishSequence(this);
  };

  const oldEnv=P.drawEnvironment;
  P.drawEnvironment=function(){oldEnv.call(this);drawWeather(this);};

  const oldCourse=P.drawCourse;
  P.drawCourse=function(){oldCourse.call(this);const b=budgetFor(this);for(const o of this.objects){if(o.type!=='v12Event')continue;const z=this.objectZ(o);if(z<-b.eventDistance||z>18)continue;drawRoadEvent(this,o,z);}drawDebris(this);};

  const oldFinishScene=P.drawFinishScene;
  P.drawFinishScene=function(){oldFinishScene.call(this);drawFinishV12(this);drawDebris(this);};

  window.SleepRoadExperienceV12={COMBOS,ROAD_EVENTS,RARE_EVENTS,WEATHER_PHASES,PERF,V12_ACHIEVEMENTS,rareEventFor,comboCount,budgetFor,installObstacleCombos,installRoadEvents,finishPhase,achievementProgress,triggerRoadEvent,ensure,loadStats};
})();
