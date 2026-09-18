'use strict';
(() => {
  const S=window.SleepRoadSystems,D=window.SleepRoadLevelDirector,P=window.SleepRoad3D&&window.SleepRoad3D.prototype,{UI,clamp}=S;
  if(!P||!D)throw new Error('Sleep Road v6 progression dependencies are missing');

  const KEY='sleep-road-polish-v6';
  const SKINS=[
    {id:'classic',name:'КЛАССИКА',unlock:1,shirts:[[.14,.52,.98],[.08,.67,.91],[.24,.42,.91],[.18,.72,.73],[.37,.49,.98]],trail:[.24,.72,1],moon:[1,.72,.09]},
    {id:'desert',name:'ПЕСОК',unlock:11,shirts:[[.96,.54,.18],[.85,.34,.12],[1,.70,.24],[.72,.27,.12]],trail:[1,.55,.16],moon:[1,.80,.25]},
    {id:'factory',name:'СТАЛЬ',unlock:21,shirts:[[.38,.42,.48],[.53,.56,.62],[.94,.58,.12],[.28,.31,.36]],trail:[.75,.80,.86],moon:[1,.62,.12]},
    {id:'city',name:'NIGHT',unlock:31,shirts:[[.16,.55,1],[.55,.22,1],[.10,.78,.92],[.86,.18,.65]],trail:[.31,.55,1],moon:[.45,.82,1]},
    {id:'neon',name:'NEON',unlock:41,shirts:[[.97,.22,.72],[.20,.94,.82],[.62,.24,1],[.18,.72,1]],trail:[.96,.25,.82],moon:[.34,1,.86]}
  ];
  const ACHIEVEMENTS={
    moons:{title:'ЛУННЫЙ ОХОТНИК',desc:'Собери 1000 лун'},
    crowd:{title:'АРМИЯ',desc:'Собери толпу из 100 человек'},
    bossNoHit:{title:'ИДЕАЛЬНЫЙ БОСС',desc:'Победи босса без урона'},
    triple:{title:'ТРОЙНОЙ РОСТ',desc:'Пройди ворота ×3'},
    perfect10:{title:'НЕУЛОВИМЫЙ',desc:'Сделай 10 идеальных уклонений'}
  };

  const fresh=()=>({skin:'classic',claimed:[],achievements:{},totalMoons:0,bestCrowd:0,bestPerfect:0});
  function load(){
    try{
      const raw=localStorage.getItem(KEY),v=raw?JSON.parse(raw):fresh(),out=fresh();
      out.skin=SKINS.some(s=>s.id===v.skin)?v.skin:'classic';
      out.claimed=Array.isArray(v.claimed)?v.claimed.filter(Number.isFinite):[];
      out.achievements=v.achievements&&typeof v.achievements==='object'?v.achievements:{};
      out.totalMoons=Math.max(0,Math.floor(Number(v.totalMoons)||0));
      out.bestCrowd=Math.max(0,Math.floor(Number(v.bestCrowd)||0));
      out.bestPerfect=Math.max(0,Math.floor(Number(v.bestPerfect)||0));
      return out;
    }catch{return fresh();}
  }
  function save(v){try{localStorage.setItem(KEY,JSON.stringify(v));}catch{}}
  function milestoneReward(level){
    if(level>0&&level%10===0)return{kind:'chapter',amount:150+level*4,label:'НАГРАДА ГЛАВЫ'};
    if(level>0&&level%5===0)return{kind:'chest',amount:50+level*2,label:'СУНДУК'};
    return null;
  }
  function unlockedSkins(level){return SKINS.filter(s=>level>=s.unlock);}
  function currentSkin(g){const state=ensureState(g),skin=SKINS.find(s=>s.id===state.skin)||SKINS[0];return g.save.level>=skin.unlock?skin:SKINS[0];}
  function ensureState(g){if(!g.v6Progress)g.v6Progress=load();return g.v6Progress;}
  function ensureUI(g){
    if(g.__v6ProgressUI)return g.__v6ProgressUI;
    const map=document.createElement('div');map.className='v6-progress-map';
    map.innerHTML='<div class="v6-progress-head"><b>ПУТЬ</b><span class="v6-ach-count"></span></div><div class="v6-chapters"></div><button class="v6-skin-btn" type="button"></button>';
    UI.menu.appendChild(map);
    const reward=document.createElement('div');reward.className='v6-reward-card hidden';reward.innerHTML='<b></b><span></span>';document.getElementById('app').appendChild(reward);
    const intro=document.createElement('div');intro.className='v6-intro hidden';intro.innerHTML='<span></span><b></b><small></small>';document.getElementById('app').appendChild(intro);
    const achievement=document.createElement('div');achievement.className='v6-achievement hidden';achievement.innerHTML='<span>ДОСТИЖЕНИЕ</span><b></b><small></small>';document.getElementById('app').appendChild(achievement);
    const nodes=D.BIOMES.map((b,i)=>({id:b.id,name:b.name,start:i*10+1,end:i*10+10}));
    const chapters=map.querySelector('.v6-chapters');
    for(const n of nodes){const e=document.createElement('div');e.className='v6-chapter-node';e.dataset.id=n.id;e.innerHTML='<i></i><b></b><small></small>';e.querySelector('b').textContent=n.name;e.querySelector('small').textContent=`${n.start}–${n.end}`;chapters.appendChild(e);}
    map.querySelector('.v6-skin-btn').addEventListener('click',()=>cycleSkin(g));
    g.__v6ProgressUI={map,reward,intro,achievement,nodes};
    return g.__v6ProgressUI;
  }
  function renderUI(g){
    const state=ensureState(g),ui=ensureUI(g),level=g.save.level;
    ui.map.querySelectorAll('.v6-chapter-node').forEach((e,i)=>{const n=ui.nodes[i],done=level>n.end,current=level>=n.start&&level<=n.end;e.classList.toggle('done',done);e.classList.toggle('current',current);e.classList.toggle('locked',level<n.start);});
    const unlocked=Object.keys(state.achievements).filter(k=>state.achievements[k]).length;
    ui.map.querySelector('.v6-ach-count').textContent=`${unlocked}/${Object.keys(ACHIEVEMENTS).length} наград`;
    const skin=currentSkin(g);ui.map.querySelector('.v6-skin-btn').textContent=`СКИН: ${skin.name} ›`;
    if(g.crowdBatch){g.crowdBatch.skinPalette=skin;g.v6Skin=skin;}
  }
  function cycleSkin(g){
    const state=ensureState(g),available=unlockedSkins(g.save.level),idx=Math.max(0,available.findIndex(s=>s.id===state.skin)),next=available[(idx+1)%available.length];state.skin=next.id;save(state);renderUI(g);g.audio?.good?.();g.toast?.(`СКИН: ${next.name}`,800);
  }
  function unlockAchievement(g,key){
    const def=ACHIEVEMENTS[key],state=ensureState(g);if(!def||state.achievements[key])return false;
    state.achievements[key]=true;save(state);renderUI(g);const ui=ensureUI(g),el=ui.achievement;el.querySelector('b').textContent=def.title;el.querySelector('small').textContent=def.desc;el.classList.remove('hidden');clearTimeout(g.__v6AchTimer);g.__v6AchTimer=setTimeout(()=>el.classList.add('hidden'),2200);g.audio?.achievement?.();return true;
  }
  function claimMilestone(g,level){
    const reward=milestoneReward(level),state=ensureState(g);if(!reward||state.claimed.includes(level))return 0;
    state.claimed.push(level);save(state);g.save.moons+=reward.amount;g.levelMoons+=reward.amount;g.flushSave();UI.moonValue.textContent=g.save.moons.toLocaleString('ru-RU');UI.menuMoonValue.textContent=g.save.moons.toLocaleString('ru-RU');
    const el=ensureUI(g).reward;el.querySelector('b').textContent=reward.label;el.querySelector('span').textContent=`+${reward.amount} ☾`;el.classList.remove('hidden');clearTimeout(g.__v6RewardTimer);g.__v6RewardTimer=setTimeout(()=>el.classList.add('hidden'),2200);g.audio?.chest?.(reward.kind==='chapter');return reward.amount;
  }
  function showIntro(g){
    const ui=ensureUI(g),p=g.profile||D.profileForLevel(g.level),el=ui.intro,chapterStart=g.level<=50&&((g.level-1)%10===0);
    el.querySelector('span').textContent=chapterStart?`CHAPTER ${p.chapter+1}`:`LEVEL ${g.level}`;
    el.querySelector('b').textContent=p.title||p.biome.name;
    el.querySelector('small').textContent=p.bossLevel?'BOSS RUN':p.timed?'TIME CHALLENGE':p.noHit?'NO-HIT CHALLENGE':p.bonusLevel?'BONUS LEVEL':'SLEEP ROAD';
    el.classList.toggle('chapter',chapterStart);el.classList.remove('hidden');clearTimeout(g.__v6IntroHide);g.__v6IntroHide=setTimeout(()=>el.classList.add('hidden'),chapterStart?1550:1150);
  }

  const oldRefresh=P.refreshUI;
  P.refreshUI=function(){oldRefresh.call(this);renderUI(this);};
  const oldStart=P.startLevel;
  P.startLevel=function(level){oldStart.call(this,level);ensureState(this);renderUI(this);showIntro(this);this.__v6IntroRemaining=(this.level<=50&&((this.level-1)%10===0))?1.45:1.05;this.state='intro';};
  const oldReturn=P.returnToMenu;
  P.returnToMenu=function(){oldReturn.call(this);renderUI(this);};
  const oldCollectMoon=P.collectMoon;
  P.collectMoon=function(o){const before=this.save.moons;oldCollectMoon.call(this,o);const gain=Math.max(0,this.save.moons-before),state=ensureState(this);state.totalMoons+=gain;save(state);if(state.totalMoons>=1000)unlockAchievement(this,'moons');};
  const oldSetCount=P.setCrowdCount;
  P.setCrowdCount=function(v,pop){oldSetCount.call(this,v,pop);const state=ensureState(this),n=Math.max(0,Math.round(v));if(n>state.bestCrowd){state.bestCrowd=n;save(state);}if(n>=100)unlockAchievement(this,'crowd');};
  const oldGate=P.applyGate;
  P.applyGate=function(opt){oldGate.call(this,opt);if(opt&&opt.op==='mul'&&Number(opt.value)>=3)unlockAchievement(this,'triple');};
  const oldResult=P.showResult;
  P.showResult=function(won){oldResult.call(this,won);if(!won)return;const extra=claimMilestone(this,this.level);if(extra&&UI.resultReward)UI.resultReward.textContent+=` · ${this.level%10===0?'глава':'сундук'} +${extra} ☾`;if(this.profile?.bossLevel&&!this.tookDamage)unlockAchievement(this,'bossNoHit');renderUI(this);};

  window.SleepRoadProgressionV6={KEY,SKINS,ACHIEVEMENTS,milestoneReward,unlockedSkins,currentSkin,unlockAchievement,claimMilestone,showIntro,ensureState,renderUI,save};
})();
