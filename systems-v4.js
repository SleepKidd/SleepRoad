'use strict';
(() => {
  const { Renderer, compose, multiply, makeBox, makeCylinder, makeCone, makeSphere, DEG } = window.Mini3D;
  const $ = (id) => document.getElementById(id);
  const clamp = (v,a,b) => Math.max(a,Math.min(b,v));
  const lerp = (a,b,t) => a+(b-a)*t;
  const TAU = Math.PI*2;
  const UI = {
    canvas:$('game'),labels:$('worldLabels'),hud:$('hud'),menu:$('menu'),result:$('result'),fatal:$('fatal'),progressFill:$('progressFill'),moonValue:$('moonValue'),menuMoonValue:$('menuMoonValue'),crowdCount:$('crowdCount'),soundBtn:$('soundBtn'),menuSoundBtn:$('menuSoundBtn'),exitBtn:$('exitBtn'),resultMenuBtn:$('resultMenuBtn'),playBtn:$('playBtn'),nextBtn:$('nextBtn'),retryBtn:$('retryBtn'),menuLevelValue:$('menuLevelValue'),resultBanner:$('resultBanner'),resultKicker:$('resultKicker'),resultTitle:$('resultTitle'),resultCount:$('resultCount'),resultMoons:$('resultMoons'),resultMultiplier:$('resultMultiplier'),resultReward:$('resultReward'),toast:$('toast'),upgradeCrowd:$('upgradeCrowd'),upgradeMagnet:$('upgradeMagnet'),upgradeIncome:$('upgradeIncome'),crowdUpgradeText:$('crowdUpgradeText'),magnetUpgradeText:$('magnetUpgradeText'),incomeUpgradeText:$('incomeUpgradeText'),crowdUpgradeCost:$('crowdUpgradeCost'),magnetUpgradeCost:$('magnetUpgradeCost'),incomeUpgradeCost:$('incomeUpgradeCost'),missionHud:$('missionHud'),missionHudText:$('missionHudText'),missionFill:$('missionFill'),menuMissionText:$('menuMissionText'),menuMissionReward:$('menuMissionReward'),resultMission:$('resultMission'),shieldHud:$('shieldHud')
  };
  const COLORS={road:[.34,.37,.44],roadStripe:[.92,.92,.82],roadEdge:[.90,.92,.96],blue:[.20,.55,.96],blueLight:[.38,.72,1],red:[.93,.20,.25],orange:[1,.40,.13],teal:[.16,.75,.67],pink:[.90,.20,.43],purple:[.28,.23,.50],gold:[1,.72,.09],navy:[.08,.10,.20],gray:[.43,.46,.54],white:[.99,.99,1],grass:[.36,.68,.40],grassDark:[.24,.51,.31],island:[.30,.44,.66],islandTop:[.45,.66,.88],step0:[.22,.76,.91],step1:[.16,.50,.94],step2:[.35,.20,.91],step3:[.67,.12,.78]};
  const SAVE_KEY='sleep-road-save-v4',LEGACY_KEYS=['sleep-road-save-v2','sleep-road-save-v1'],DEFAULT_SAVE={level:1,moons:0,sound:true,upgrades:{crowd:0,magnet:0,income:0}},MAX_UPGRADE={crowd:24,magnet:10,income:10},MAX_CROWD=999,MAX_VISIBLE_CROWD=420;
  const safeNum=(v,f=0)=>{const n=Number(v);return Number.isFinite(n)?n:f;};
  function loadSave(){try{let raw=localStorage.getItem(SAVE_KEY);if(!raw){for(const k of LEGACY_KEYS){raw=localStorage.getItem(k);if(raw)break;}}if(!raw)return JSON.parse(JSON.stringify(DEFAULT_SAVE));const d=JSON.parse(raw),u=d.upgrades||{};return{level:Math.max(1,Math.floor(safeNum(d.level,1))),moons:Math.max(0,Math.floor(safeNum(d.moons??d.coins,0))),sound:d.sound!==false,upgrades:{crowd:clamp(Math.floor(safeNum(u.crowd,0)),0,MAX_UPGRADE.crowd),magnet:clamp(Math.floor(safeNum(u.magnet,0)),0,MAX_UPGRADE.magnet),income:clamp(Math.floor(safeNum(u.income,0)),0,MAX_UPGRADE.income)}};}catch{return JSON.parse(JSON.stringify(DEFAULT_SAVE));}}
  function saveGame(s){try{localStorage.setItem(SAVE_KEY,JSON.stringify(s));}catch{}}
  function applyGateValue(count,opt){let result=count;if(opt.op==='mul')result*=opt.value;else if(opt.op==='add')result+=opt.value;else if(opt.op==='sub')result-=opt.value;else if(opt.op==='div')result=Math.ceil(result/opt.value);return clamp(Math.round(result),1,MAX_CROWD);}
  function finishStepForCount(count){return clamp(Math.floor(Math.max(0,count-1)/14)+1,1,8);}
  function finishMultiplierForStep(step){return 1+clamp(Math.round(step),1,8)*.35;}
  function finishBaseReward(count,income=1){return Math.max(1,Math.round(Math.max(0,count)*.45*Math.max(1,income)));}
  function finishReward(count,multiplier,income=1){const base=finishBaseReward(count,income);return Math.max(base,Math.round(base*Math.max(1,multiplier)));}
  class RNG{constructor(seed){this.s=(seed>>>0)||1;}next(){this.s=(Math.imul(this.s,1664525)+1013904223)>>>0;return this.s/4294967296;}range(a,b){return a+(b-a)*this.next();}int(a,b){return Math.floor(this.range(a,b+1));}pick(a){return a[Math.floor(this.next()*a.length)];}}
  class AudioEngine{constructor(enabled){this.enabled=enabled;this.ac=null;this.master=null;}ensure(){if(!this.enabled)return false;const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return false;if(!this.ac){this.ac=new AC();this.master=this.ac.createGain();this.master.gain.value=.105;this.master.connect(this.ac.destination);}if(this.ac.state==='suspended')this.ac.resume().catch(()=>{});return true;}tone(f,d=.08,type='sine',gain=.055,slide=1){if(!this.ensure())return;const t=this.ac.currentTime,o=this.ac.createOscillator(),g=this.ac.createGain();o.type=type;o.frequency.setValueAtTime(f,t);o.frequency.exponentialRampToValueAtTime(Math.max(40,f*slide),t+d);g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(gain,t+.01);g.gain.exponentialRampToValueAtTime(.0001,t+d);o.connect(g);g.connect(this.master);o.start(t);o.stop(t+d+.03);}coin(){this.tone(930,.08,'sine',.05,1.22)}good(){this.tone(450,.07,'triangle',.055,1.45);setTimeout(()=>this.tone(720,.10,'sine',.045,1.18),50)}bad(){this.tone(185,.13,'sawtooth',.045,.68)}hit(){this.tone(115,.09,'square',.04,.55)}battle(){this.tone(155,.055,'square',.025,.8)}win(){this.tone(430,.12,'triangle',.06,1.35);setTimeout(()=>this.tone(650,.15,'triangle',.055,1.25),100);setTimeout(()=>this.tone(850,.22,'sine',.05,1.12),220)}fail(){this.tone(220,.28,'triangle',.055,.5)}}
  function flattenMatrices(list){const out=new Float32Array(list.length*16);for(let i=0;i<list.length;i++)out.set(list[i],i*16);return out;}
  class CrowdBatch{
    constructor(renderer,meshes){this.r=renderer;this.meshes=meshes;}
    metrics(count){const n=Math.max(1,Math.min(Math.round(count),MAX_VISIBLE_CROWD)),cols=Math.min(16,Math.max(3,Math.ceil(Math.sqrt(n*1.05)))),spacing=Math.min(.70,9.2/Math.max(1,cols-1)),rowGap=Math.min(.62,spacing*.86);return{n,cols,spacing,rowGap,depth:(Math.ceil(n/cols)-1)*rowGap};}
    formation(count){const{n,cols,spacing,rowGap}=this.metrics(count),rows=[];for(let i=0;i<n;i++){const row=Math.floor(i/cols),rowCount=Math.min(cols,n-row*cols),col=i%cols,stagger=row%2?spacing*.10:-spacing*.10;rows.push({x:(col-(rowCount-1)/2)*spacing+stagger,z:row*rowGap,index:i});}return rows;}
    draw(count,rootX,rootZ,color,time,opts={}){
      const f=this.formation(count),scale=opts.scale||1,baseY=opts.baseY||0,direction=opts.direction||1,enemy=opts.enemy===true,shadows=[],shadowColors=[],partNames=['head','body','leftArm','rightArm','leftLeg','rightLeg'],parts={},partColors={};for(const name of partNames){parts[name]=[];partColors[name]=[];}
      const shirts=enemy?[[.95,.19,.27],[1,.31,.16],[.74,.09,.20],[.92,.27,.39]]:[[.14,.52,.98],[.08,.67,.91],[.24,.42,.91],[.18,.72,.73],[.37,.49,.98]],skins=[[1,.70,.49],[.72,.43,.28],[.94,.59,.40],[.48,.29,.21],[.84,.50,.32]],trousers=enemy?[[.30,.06,.09],[.40,.08,.10]]:[[.05,.12,.28],[.10,.10,.22],[.07,.22,.38]],pivots={head:[0,1.18,0],body:[0,0,0],leftArm:[-.20,1.04,0],rightArm:[.20,1.04,0],leftLeg:[-.09,.62,0],rightLeg:[.09,.62,0]};
      for(const q of f){
        const phase=time*7.4+q.index*.71,wave=Math.sin(phase),bob=Math.abs(wave)*.055,x=rootX+q.x*scale,z=rootZ+q.z*direction*scale,turn=direction<0?Math.PI:0,sway=wave*.025,root=compose(x,baseY+bob,z,sway*.55,turn,sway,scale,scale,scale),shirt=shirts[(q.index*7)%shirts.length],skin=skins[(q.index*3)%skins.length],trouser=trousers[(q.index*5)%trousers.length],angles={head:-sway*.35,body:0,leftArm:wave*.38,rightArm:-wave*.38,leftLeg:-wave*.27,rightLeg:wave*.27};
        shadows.push(compose(x,baseY+.012,z,0,0,0,.48*scale,.018,.32*scale));
        for(const name of partNames){const p=pivots[name],local=compose(p[0],p[1],p[2],angles[name],0,0,1,1,1),tint=name==='head'||name.includes('Arm')?skin:name==='body'?shirt:trouser,shade=.92+(q.index%4)*.025;parts[name].push(multiply(root,local));partColors[name].push(...tint.map(v=>Math.min(1,v*shade)));}shadowColors.push(.10,.14,.20);
      }
      this.r.drawInstances(this.meshes.cylinder,flattenMatrices(shadows),new Float32Array(shadowColors),f.length);
      for(const name of partNames)this.r.drawInstances(this.meshes.characterParts[name],flattenMatrices(parts[name]),new Float32Array(partColors[name]),f.length);
      return f;
    }
  }
  const gateLabel=opt=>opt.op==='mul'?`×${opt.value}`:opt.op==='add'?`+${opt.value}`:opt.op==='sub'?`−${opt.value}`:`÷${opt.value}`;
  const isGoodGate=opt=>opt.op==='mul'||opt.op==='add';
  window.SleepRoadSystems={Renderer,compose,makeBox,makeCylinder,makeCone,makeSphere,DEG,UI,COLORS,MAX_UPGRADE,MAX_CROWD,MAX_VISIBLE_CROWD,clamp,lerp,TAU,loadSave,saveGame,applyGateValue,finishStepForCount,finishMultiplierForStep,finishBaseReward,finishReward,RNG,AudioEngine,CrowdBatch,gateLabel,isGoodGate};
})();
