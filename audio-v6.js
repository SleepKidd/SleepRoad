'use strict';
(() => {
  const S=window.SleepRoadSystems,P=window.SleepRoad3D&&window.SleepRoad3D.prototype,A=S&&S.AudioEngine&&S.AudioEngine.prototype;
  if(!P||!A)throw new Error('Sleep Road v6 audio dependencies are missing');
  const MUSIC={
    meadow:{notes:[262,330,392,330,294,392,440,392],wave:'sine',step:.38},
    desert:{notes:[220,262,330,294,220,349,330,262],wave:'triangle',step:.40},
    factory:{notes:[110,165,147,196,110,175,147,220],wave:'square',step:.32},
    city:{notes:[196,247,294,392,220,294,330,440],wave:'sine',step:.30},
    neon:{notes:[220,330,440,554,247,370,494,659],wave:'triangle',step:.27}
  };
  A.gateWhoosh=function(good=true){this.tone(good?320:180,.10,'sawtooth',.022,good?1.8:.7);setTimeout(()=>this.tone(good?690:130,.08,'triangle',.025,good?1.2:.75),45);};
  A.jump=function(){this.tone(280,.13,'triangle',.035,1.75);};
  A.land=function(){this.tone(105,.08,'square',.025,.62);};
  A.obstacle=function(kind='hit'){const f=kind==='saw'?150:kind==='laser'?420:kind==='hammer'?95:125;this.tone(f,.10,kind==='laser'?'sawtooth':'square',.025,kind==='laser'?1.45:.55);};
  A.boost=function(slow=false){this.tone(slow?190:310,.18,'sawtooth',.027,slow?.72:1.75);};
  A.bossAttack=function(type='shockwave'){const map={shockwave:[92,.20,'sine',.55],sand:[140,.13,'triangle',.72],hammer:[78,.16,'square',.50],laser:[520,.13,'sawtooth',1.35],neon:[350,.15,'triangle',1.65]};const [f,d,w,s]=map[type]||map.shockwave;this.tone(f,d,w,.034,s);};
  A.nearMiss=function(){this.tone(760,.07,'sine',.022,1.28);};
  A.combo=function(n=3){this.tone(480+n*35,.08,'triangle',.028,1.32);setTimeout(()=>this.tone(680+n*28,.09,'sine',.024,1.15),55);};
  A.chest=function(big=false){this.tone(big?390:330,.11,'triangle',.035,1.32);setTimeout(()=>this.tone(big?620:520,.13,'triangle',.032,1.25),90);setTimeout(()=>this.tone(big?880:720,.18,'sine',.026,1.12),190);};
  A.achievement=function(){this.tone(520,.09,'triangle',.03,1.3);setTimeout(()=>this.tone(780,.12,'sine',.03,1.2),75);};
  A.musicStep=function(dt,biome='meadow',boss=false,state='running'){
    if(!this.enabled||state==='failed'||state==='complete'||(!this.ac&&state==='menu')){this._musicClock=.1;return;}
    const cfg=MUSIC[biome]||MUSIC.meadow;this._musicClock=(this._musicClock==null?0:this._musicClock)-dt;
    if(this._musicClock>0)return;
    const idx=(this._musicIndex||0)%cfg.notes.length,root=cfg.notes[idx]*(boss?(idx%2?1:.5):1),gain=state==='menu'?.008:boss?.014:.010;
    this.tone(root,.16,cfg.wave,gain,idx%4===3?1.05:1);if(idx%2===0)this.tone(root*.5,.20,'sine',gain*.45,1);
    this._musicIndex=idx+1;this._musicClock=cfg.step*(boss?.72:state==='menu'?1.35:1);
  };
  const oldUpdate=P.update;
  P.update=function(dt){oldUpdate.call(this,dt);const b=this.profile?.biome?.id||this.biome?.id||'meadow';this.audio?.musicStep?.(dt,b,!!this.battleEnemy?.boss||!!this.profile?.bossLevel,this.state);};
  window.SleepRoadAudioV6={MUSIC};
})();
