'use strict';
(() => {
  const S=window.SleepRoadSystems,P=window.SleepRoad3D&&window.SleepRoad3D.prototype,A=S&&S.AudioEngine&&S.AudioEngine.prototype;
  if(!P||!A)throw new Error('Sleep Road v28 boss-music dependencies are missing');
  const TRACK='./assets/audio/boss-battle-v28.mp3',NEAR_BOSS_Z=12.5,TRACK_GAIN=.34;
  const oldEnsure=A.ensure,oldMusicStep=A.musicStep;

  A._loadBossTrack=function(){
    if(this._bossTrackBuffer||this._bossTrackPromise||!this.ac)return this._bossTrackPromise;
    this._bossTrackPromise=fetch(TRACK,{cache:'force-cache'})
      .then(r=>{if(!r.ok)throw new Error('Boss music HTTP '+r.status);return r.arrayBuffer();})
      .then(b=>this.ac.decodeAudioData(b))
      .then(buf=>{this._bossTrackBuffer=buf;return buf;})
      .catch(err=>{console.warn('Boss music unavailable:',err);this._bossTrackPromise=null;return null;});
    return this._bossTrackPromise;
  };

  A.ensure=function(){
    const ok=oldEnsure.call(this);
    if(ok)this._loadBossTrack();
    return ok;
  };

  A._startBossTrack=function(){
    if(!this.enabled||!this.ensure()||!this._bossTrackBuffer)return false;
    if(this._bossTrackSource)return true;
    const src=this.ac.createBufferSource(),gain=this.ac.createGain(),t=this.ac.currentTime;
    src.buffer=this._bossTrackBuffer;src.loop=true;
    gain.gain.setValueAtTime(.0001,t);
    gain.gain.exponentialRampToValueAtTime(TRACK_GAIN,t+.42);
    src.connect(gain);gain.connect(this.master);
    src.onended=()=>{if(this._bossTrackSource===src){this._bossTrackSource=null;this._bossTrackGain=null;}};
    src.start(t);
    this._bossTrackSource=src;this._bossTrackGain=gain;
    return true;
  };

  A._fadeBossTrack=function(active){
    active=!!active;
    if(!this.enabled){
      if(this._bossTrackSource){try{this._bossTrackSource.stop();}catch{}}
      this._bossTrackSource=null;this._bossTrackGain=null;this._externalBossActive=false;this._bossTrackWanted=false;return;
    }
    this._externalBossActive=active;
    if(active&&!this._bossTrackBuffer){this._bossTrackWanted=true;this._loadBossTrack();return;}
    if(active&&!this._bossTrackSource&&!this._startBossTrack())return;
    if(this._bossTrackWanted===active&&this._bossTrackSource)return;
    this._bossTrackWanted=active;
    if(!this._bossTrackGain||!this.ac)return;
    const t=this.ac.currentTime,gain=this._bossTrackGain.gain;
    gain.cancelScheduledValues(t);
    gain.setValueAtTime(Math.max(.0001,gain.value||.0001),t);
    gain.exponentialRampToValueAtTime(active?TRACK_GAIN:.0001,t+(active?.28:.46));
  };

  A.musicStep=function(...args){
    if(this._externalBossActive)return;
    return oldMusicStep?.apply(this,args);
  };

  function bossIsNear(g){
    if(g.state==='battle'&&g.battleEnemy?.boss)return true;
    if(g.state!=='running'&&g.state!=='intro')return false;
    const list=g.objects||[];
    for(const o of list){
      if(o.processed||o.type!=='enemy'||!o.boss)continue;
      const z=g.objectZ?.(o);if(z==null)continue;
      const dz=z-g.playerZ;
      if(dz>=-NEAR_BOSS_Z&&dz<=3.5)return true;
    }
    return false;
  }

  const oldUpdate=P.update;
  P.update=function(dt){
    oldUpdate.call(this,dt);
    const active=this.audio?.enabled&&bossIsNear(this)&&this.state!=='failed'&&this.state!=='complete'&&this.state!=='menu';
    this.audio?._fadeBossTrack?.(!!active);
  };

  const oldMenu=P.returnToMenu;
  P.returnToMenu=function(){this.audio?._fadeBossTrack?.(false);return oldMenu.call(this);};
  const oldFail=P.fail;
  if(oldFail)P.fail=function(...a){this.audio?._fadeBossTrack?.(false);return oldFail.apply(this,a);};
  const oldFinish=P.beginFinish;
  P.beginFinish=function(...a){this.audio?._fadeBossTrack?.(false);return oldFinish.apply(this,a);};

  window.SleepRoadAudioV28={TRACK,NEAR_BOSS_Z,TRACK_GAIN,bossIsNear};
})();