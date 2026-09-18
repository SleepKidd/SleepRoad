'use strict';
(() => {
  const S=window.SleepRoadSystems,D=window.SleepRoadLevelDirector,R=window.SleepRoadProgressionV6,P=window.SleepRoad3D&&window.SleepRoad3D.prototype;
  if(!S||!D||!R||!P)throw new Error('Sleep Road Unified Menu v7 dependencies are missing');
  const {UI,clamp}=S;

  const rgb=a=>'rgb('+a.map(v=>Math.round(clamp(v,0,1)*255)).join(',')+')';
  const rgba=(a,alpha)=>'rgba('+a.map(v=>Math.round(clamp(v,0,1)*255)).join(',')+','+alpha+')';

  function profileFor(g){
    const level=Math.max(1,Math.floor(g?.state==='menu'?(g.save?.level||1):(g?.level||g?.save?.level||1)));
    return D.profileForLevel(level);
  }
  function themeForProfile(profile){
    const p=profile?.biome?.palette||D.BIOMES[0].palette;
    return{
      id:profile?.biome?.id||'meadow',
      accent:rgb(p.accent),secondary:rgb(p.good),danger:rgb(p.bad),sky:rgb(p.sky),
      accentGlow:rgba(p.accent,.38),accentSoft:rgba(p.accent,.16),secondarySoft:rgba(p.good,.14),
      panel:'rgba(22,28,48,.82)',panelStrong:'rgba(27,34,58,.94)'
    };
  }
  function playLabel(profile,level){
    if(profile?.bossLevel)return{title:'BOSS RUN',sub:'Финальный забег главы'};
    if(profile?.bonusLevel)return{title:'BONUS LEVEL',sub:'Особая награда'};
    if(profile?.timed)return{title:'TIME RUN',sub:'Успей до конца таймера'};
    if(profile?.noHit)return{title:'NO-HIT',sub:'Пройди уровень без урона'};
    return{title:level<=1?'ИГРАТЬ':'ПРОДОЛЖИТЬ',sub:(profile?.biome?.name||'SLEEP ROAD')+' · Уровень '+level};
  }
  function routeProgress(level){return clamp((Math.min(50,Math.max(1,level))-1)/49,0,1);}
  function achievementProgress(g,key){
    const state=R.ensureState(g),done=!!state.achievements[key],extended=window.SleepRoadExperienceV12?.achievementProgress?.(g,key);
    if(extended)return extended;
    if(key==='moons'){const value=Math.max(state.totalMoons||0,g.save?.moons||0);return{value,target:1000,ratio:done?1:clamp(value/1000,0,1),label:Math.min(value,1000)+' / 1000'};}
    if(key==='crowd'){const value=state.bestCrowd||0;return{value,target:100,ratio:done?1:clamp(value/100,0,1),label:Math.min(value,100)+' / 100'};}
    if(key==='perfect10'){const value=state.bestPerfect||0;return{value,target:10,ratio:done?1:clamp(value/10,0,1),label:Math.min(value,10)+' / 10'};}
    return{value:done?1:0,target:1,ratio:done?1:0,label:done?'ВЫПОЛНЕНО':'НЕ ВЫПОЛНЕНО'};
  }

  function createEl(tag,className,parent){
    const el=document.createElement(tag);if(className)el.className=className;if(parent)parent.appendChild(el);return el;
  }
  function build(g){
    if(g.__v7Menu)return g.__v7Menu;
    const menu=UI.menu;
    menu.classList.add('v7-themed');

    const ambient=createEl('div','v7-menu-ambient',menu);
    for(let i=0;i<6;i++){const orb=createEl('i','v7-ambient-orb v7-orb-'+(i+1),ambient);orb.setAttribute('aria-hidden','true');}

    const card=createEl('section','v7-hub',menu);
    card.setAttribute('aria-label','Главное меню Sleep Road');
    card.innerHTML=
      '<header class="v7-hub-head">'+
        '<div class="v7-title-group"><span class="v7-kicker"></span><div class="v7-level-line"><h2></h2><span class="v7-special-badge hidden"></span></div></div>'+
        '<button class="v7-ach-summary" type="button" aria-label="Открыть достижения"><i>★</i><span><b></b><small>ДОСТИЖЕНИЯ</small></span></button>'+
      '</header>'+
      '<div class="v7-content-grid">'+
        '<section class="v7-mission-pane">'+
          '<div class="v7-pane-head"><span>МИССИЯ УРОВНЯ</span><b class="v7-reward-pill">☾ <em></em></b></div>'+
          '<strong class="v7-mission-title"></strong>'+
          '<div class="v7-mission-meter"><i></i></div>'+
          '<small class="v7-mission-progress"></small>'+
        '</section>'+
        '<section class="v7-path-pane">'+
          '<div class="v7-pane-head"><span>ПУТЬ</span><b class="v7-route-meta"></b></div>'+
          '<div class="v7-route"><div class="v7-route-line"><i></i></div><div class="v7-route-nodes"></div></div>'+
        '</section>'+
      '</div>'+
      '<footer class="v7-actions">'+
        '<button class="v7-action v7-skin-action" type="button"><span class="v7-skin-preview"><i></i><i></i><i></i></span><span class="v7-action-copy"><small>СКИН</small><b></b></span><span class="v7-chevron">›</span></button>'+
        '<button class="v7-action v7-ach-action" type="button"><span class="v7-action-icon">★</span><span class="v7-action-copy"><small>КОЛЛЕКЦИЯ</small><b>ДОСТИЖЕНИЯ</b></span><span class="v7-chevron">›</span></button>'+
        '<button class="v7-play" type="button"><span><b></b><small></small></span><i>›</i></button>'+
      '</footer>';

    const nodes=card.querySelector('.v7-route-nodes');
    D.BIOMES.forEach((biome,i)=>{
      const n=createEl('div','v7-route-node',nodes);n.dataset.biome=biome.id;
      n.innerHTML='<span class="v7-route-dot"><i></i></span><b>'+biome.name+'</b><small>'+(i*10+1)+'–'+(i*10+10)+'</small>';
    });

    const backdrop=createEl('div','v7-ach-backdrop hidden',menu);
    backdrop.innerHTML=
      '<section class="v7-ach-modal" role="dialog" aria-modal="true" aria-label="Достижения">'+
        '<header><div><span>КОЛЛЕКЦИЯ</span><h3>ДОСТИЖЕНИЯ</h3></div><button class="v7-ach-close" type="button" aria-label="Закрыть">×</button></header>'+
        '<div class="v7-ach-list"></div>'+
      '</section>';

    const list=backdrop.querySelector('.v7-ach-list');
    Object.entries(R.ACHIEVEMENTS).forEach(([key,def])=>{
      const row=createEl('article','v7-ach-row',list);row.dataset.key=key;
      row.innerHTML=
        '<span class="v7-ach-icon">◇</span>'+
        '<div class="v7-ach-copy"><div><b>'+def.title+'</b><em></em></div><small>'+def.desc+'</small><i class="v7-ach-meter"><u></u></i></div>';
    });

    const openAchievements=()=>{syncAchievements(g);backdrop.classList.remove('hidden');card.classList.add('v7-dimmed');};
    const closeAchievements=()=>{backdrop.classList.add('hidden');card.classList.remove('v7-dimmed');};
    card.querySelector('.v7-ach-summary').addEventListener('click',openAchievements);
    card.querySelector('.v7-ach-action').addEventListener('click',openAchievements);
    backdrop.querySelector('.v7-ach-close').addEventListener('click',closeAchievements);
    backdrop.addEventListener('click',e=>{if(e.target===backdrop)closeAchievements();});
    card.querySelector('.v7-skin-action').addEventListener('click',()=>{R.cycleSkin(g);sync(g,true);});
    card.querySelector('.v7-play').addEventListener('click',()=>UI.playBtn.click());
    if(!window.__sleepRoadV7EscapeBound){
      window.__sleepRoadV7EscapeBound=true;
      addEventListener('keydown',e=>{if(e.code==='Escape'&&!backdrop.classList.contains('hidden')){e.preventDefault();e.stopImmediatePropagation();closeAchievements();}},true);
    }

    g.__v7Menu={menu,ambient,card,backdrop};
    sync(g,true);
    return g.__v7Menu;
  }

  function applyTheme(g,profile){
    const ui=g.__v7Menu||build(g),theme=themeForProfile(profile),style=ui.menu.style;
    style.setProperty('--v7-accent',theme.accent);
    style.setProperty('--v7-secondary',theme.secondary);
    style.setProperty('--v7-danger',theme.danger);
    style.setProperty('--v7-sky',theme.sky);
    style.setProperty('--v7-accent-glow',theme.accentGlow);
    style.setProperty('--v7-accent-soft',theme.accentSoft);
    style.setProperty('--v7-secondary-soft',theme.secondarySoft);
    style.setProperty('--v7-panel',theme.panel);
    style.setProperty('--v7-panel-strong',theme.panelStrong);
    ui.menu.dataset.v7Biome=theme.id;
    const meta=document.querySelector?.('meta[name="theme-color"]');if(meta)meta.setAttribute('content',theme.accent);
  }

  function syncAchievements(g){
    const ui=g.__v7Menu||build(g),state=R.ensureState(g);
    ui.backdrop.querySelectorAll('.v7-ach-row').forEach(row=>{
      const key=row.dataset.key,p=achievementProgress(g,key),done=!!state.achievements[key];
      row.classList.toggle('done',done);
      row.querySelector('.v7-ach-icon').textContent=done?'◆':'◇';
      row.querySelector('.v7-ach-copy em').textContent=p.label;
      row.querySelector('.v7-ach-meter u').style.width=(p.ratio*100).toFixed(1)+'%';
    });
  }

  function sync(g,animate=false){
    const ui=g.__v7Menu||build(g),card=ui.card,level=Math.max(1,Math.floor(g.save?.level||g.level||1)),profile=D.profileForLevel(level),state=R.ensureState(g),skin=R.currentSkin(g);
    applyTheme(g,profile);

    card.querySelector('.v7-kicker').textContent=level>50?'ENDLESS · '+profile.biome.name:profile.biome.name;
    card.querySelector('.v7-level-line h2').textContent='УРОВЕНЬ '+level;

    const badge=card.querySelector('.v7-special-badge');
    const special=profile.bossLevel?'BOSS':profile.bonusLevel?'BONUS':profile.timed?'TIME':profile.noHit?'NO-HIT':'';
    badge.textContent=special;badge.classList.toggle('hidden',!special);

    const mission=g.mission||g.createMission?.(level),missionTitle=mission?.title||'Продолжай путь',reward=mission?.reward||0;
    card.querySelector('.v7-mission-title').textContent=missionTitle;
    card.querySelector('.v7-reward-pill em').textContent=reward;
    let progress=0,target=Math.max(1,mission?.target||1);
    try{progress=Math.min(target,Math.max(0,g.missionProgress?.()||0));}catch{}
    card.querySelector('.v7-mission-meter i').style.width=(clamp(progress/target,0,1)*100).toFixed(1)+'%';
    card.querySelector('.v7-mission-progress').textContent=progress+' / '+target;

    const rp=routeProgress(level);
    card.querySelector('.v7-route-line i').style.width=(rp*100).toFixed(2)+'%';
    card.querySelector('.v7-route-meta').textContent=level>50?'ENDLESS':'ГЛАВА '+(profile.chapter+1)+' / 5';
    card.querySelectorAll('.v7-route-node').forEach((node,i)=>{
      const start=i*10+1,end=i*10+10,done=level>end,current=level>=start&&level<=end||(level>50&&i===4);
      node.classList.toggle('done',done||level>50);
      node.classList.toggle('current',current);
      node.classList.toggle('locked',level<start);
      node.querySelector('.v7-route-dot i').textContent=done||level>50?'✓':current?String(Math.min(10,((level-1)%10)+1)):'';
    });

    const unlocked=Object.values(state.achievements).filter(Boolean).length,total=Object.keys(R.ACHIEVEMENTS).length;
    card.querySelector('.v7-ach-summary b').textContent=unlocked+' / '+total;

    const skinBtn=card.querySelector('.v7-skin-action');
    const availableSkins=R.unlockedSkins(level);skinBtn.querySelector('.v7-action-copy small').textContent='СКИН · '+availableSkins.length+' / '+R.SKINS.length;skinBtn.querySelector('.v7-action-copy b').textContent=skin.name;
    const swatches=skinBtn.querySelectorAll('.v7-skin-preview i');
    swatches.forEach((s,i)=>s.style.background=rgb(skin.shirts[i%skin.shirts.length]));
    skinBtn.title='Открыто скинов: '+availableSkins.length+' / '+R.SKINS.length;

    const label=playLabel(profile,level),play=card.querySelector('.v7-play');
    play.querySelector('b').textContent=label.title;play.querySelector('small').textContent=label.sub;
    play.classList.toggle('boss',!!profile.bossLevel);play.classList.toggle('bonus',!!profile.bonusLevel);

    syncAchievements(g);
    if(animate){ui.menu.classList.remove('v7-theme-shift');card.classList.remove('v7-refresh');void card.offsetWidth;ui.menu.classList.add('v7-theme-shift');card.classList.add('v7-refresh');clearTimeout(g.__v7ThemeTimer);g.__v7ThemeTimer=setTimeout(()=>ui.menu.classList.remove('v7-theme-shift'),520);}
  }

  const oldRefresh=P.refreshUI;
  P.refreshUI=function(){oldRefresh.call(this);build(this);sync(this);};
  const oldMission=P.updateMissionUI;
  P.updateMissionUI=function(){oldMission.call(this);if(this.__v7Menu)sync(this);};
  const oldReturn=P.returnToMenu;
  P.returnToMenu=function(){oldReturn.call(this);build(this);sync(this,true);this.__v7Menu.backdrop.classList.add('hidden');this.__v7Menu.card.classList.remove('v7-dimmed');};
  const oldStart=P.startLevel;
  P.startLevel=function(level){if(this.__v7Menu)this.__v7Menu.backdrop.classList.add('hidden');oldStart.call(this,level);};

  window.SleepRoadMenuV7={themeForProfile,playLabel,routeProgress,achievementProgress,build,sync,syncAchievements};
})();
