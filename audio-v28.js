'use strict';
(() => {
  const S=window.SleepRoadSystems,H=window.SleepRoadCarHazardV14,P=window.SleepRoad3D&&window.SleepRoad3D.prototype,A=S&&S.AudioEngine&&S.AudioEngine.prototype;
  if(!P||!A)throw new Error('Sleep Road v28 audio dependencies are missing');

  const BOSS_TRACK='./assets/audio/boss-battle-v28.mp3';
  const CAR_TRACK='./assets/audio/car-near-v29.mp3';
  const JUMP_TRACK='./assets/audio/jump-loop-v30.mp3';
  // Near-full-scale special-audio bus: boss/car/jump are intentionally much louder
  // than the normal game mix, but a compressor prevents ugly digital clipping.
  const BOSS_VIEW_MIN_Z=-88,BOSS_VIEW_MAX_Z=12,BOSS_TRACK_GAIN=2.4;
  const CAR_VIEW_MIN_Z=-92,CAR_VIEW_MAX_Z=19,CAR_TRACK_GAIN=2.8;
  const JUMP_TRACK_GAIN=2.8;
  const SPECIAL_OUTPUT_GAIN=.98,SPECIAL_LIMITER_THRESHOLD=-2.5;
  const CAR_FADE_IN=.06,CAR_FADE_OUT=.16,JUMP_FADE_IN=.035,JUMP_FADE_OUT=.10;
  const oldEnsure=A.ensure,oldMusicStep=A.musicStep;

  A._loadBossTrack=function(){
    if(this._bossTrackBuffer||this._bossTrackPromise||!this.ac)return this._bossTrackPromise;
    this._bossTrackPromise=fetch(BOSS_TRACK,{cache:'force-cache'})
      .then(r=>{if(!r.ok)throw new Error('Boss music HTTP '+r.status);return r.arrayBuffer();})
      .then(b=>this.ac.decodeAudioData(b))
      .then(buf=>{this._bossTrackBuffer=buf;return buf;})
      .catch(err=>{console.warn('Boss music unavailable:',err);this._bossTrackPromise=null;return null;});
    return this._bossTrackPromise;
  };

  A._loadCarTrack=function(){
    if(this._carTrackBuffer||this._carTrackPromise||!this.ac)return this._carTrackPromise;
    this._carTrackPromise=fetch(CAR_TRACK,{cache:'force-cache'})
      .then(r=>{if(!r.ok)throw new Error('Car audio HTTP '+r.status);return r.arrayBuffer();})
      .then(b=>this.ac.decodeAudioData(b))
      .then(buf=>{this._carTrackBuffer=buf;return buf;})
      .catch(err=>{console.warn('Car audio unavailable:',err);this._carTrackPromise=null;return null;});
    return this._carTrackPromise;
  };

  A._loadJumpTrack=function(){
    if(this._jumpTrackBuffer||this._jumpTrackPromise||!this.ac)return this._jumpTrackPromise;
    this._jumpTrackPromise=fetch(JUMP_TRACK,{cache:'force-cache'})
      .then(r=>{if(!r.ok)throw new Error('Jump audio HTTP '+r.status);return r.arrayBuffer();})
      .then(b=>this.ac.decodeAudioData(b))
      .then(buf=>{this._jumpTrackBuffer=buf;return buf;})
      .catch(err=>{console.warn('Jump audio unavailable:',err);this._jumpTrackPromise=null;return null;});
    return this._jumpTrackPromise;
  };

  A.ensure=function(){
    const ok=oldEnsure.call(this);
    if(ok){
      this._loadBossTrack();
      this._loadCarTrack();
      this._loadJumpTrack();
    }
    return ok;
  };

  A._specialAudioOutput=function(){
    if(this._specialAudioBus)return this._specialAudioBus;
    if(!this.ac)return this.master;
    const destination=this.ac.destination;
    if(!destination||typeof this.ac.createDynamicsCompressor!=='function'||typeof this.ac.createGain!=='function')return this.master;
    const limiter=this.ac.createDynamicsCompressor(),out=this.ac.createGain();
    limiter.threshold.value=SPECIAL_LIMITER_THRESHOLD;
    limiter.knee.value=0;
    limiter.ratio.value=20;
    limiter.attack.value=.002;
    limiter.release.value=.10;
    out.gain.value=SPECIAL_OUTPUT_GAIN;
    limiter.connect(out);out.connect(destination);
    this._specialAudioLimiter=limiter;
    this._specialAudioOutputGain=out;
    this._specialAudioBus=limiter;
    return limiter;
  };

  A._startBossTrack=function(){
    if(!this.enabled||!this.ensure()||!this._bossTrackBuffer)return false;
    if(this._bossTrackSource)return true;
    const src=this.ac.createBufferSource(),gain=this.ac.createGain(),t=this.ac.currentTime;
    src.buffer=this._bossTrackBuffer;src.loop=true;
    gain.gain.setValueAtTime(.0001,t);
    gain.gain.exponentialRampToValueAtTime(BOSS_TRACK_GAIN,t+.42);
    src.connect(gain);gain.connect(this._specialAudioOutput());
    src.onended=()=>{if(this._bossTrackSource===src){this._bossTrackSource=null;this._bossTrackGain=null;}};
    src.start(t);
    this._bossTrackSource=src;this._bossTrackGain=gain;
    return true;
  };

  A._fadeBossTrack=function(active){
    active=!!active;
    if(!this.enabled){
      if(this._bossTrackSource){try{this._bossTrackSource.stop();}catch{}}
      this._bossTrackSource=null;this._bossTrackGain=null;this._externalBossActive=false;this._bossTrackWanted=false;
      return;
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
    gain.exponentialRampToValueAtTime(active?BOSS_TRACK_GAIN:.0001,t+(active?.28:.46));
  };

  A._stopCarTrack=function(){
    if(this._carTrackStopTimer){clearTimeout(this._carTrackStopTimer);this._carTrackStopTimer=0;}
    const src=this._carTrackSource;
    this._carTrackSource=null;this._carTrackGain=null;
    if(src){try{src.stop();}catch{}}
  };

  A._startCarTrack=function(){
    if(!this.enabled||!this.ensure()||!this._carTrackBuffer)return false;
    if(this._carTrackSource)return true;
    const src=this.ac.createBufferSource(),gain=this.ac.createGain(),t=this.ac.currentTime;
    src.buffer=this._carTrackBuffer;src.loop=true;
    gain.gain.setValueAtTime(.0001,t);
    gain.gain.exponentialRampToValueAtTime(CAR_TRACK_GAIN,t+CAR_FADE_IN);
    src.connect(gain);gain.connect(this._specialAudioOutput());
    src.onended=()=>{if(this._carTrackSource===src){this._carTrackSource=null;this._carTrackGain=null;}};
    src.start(t);
    this._carTrackSource=src;this._carTrackGain=gain;
    return true;
  };

  A._fadeCarTrack=function(active){
    active=!!active;
    this._externalCarActive=active;

    if(!this.enabled){
      this._carTrackWanted=false;
      this._stopCarTrack();
      return;
    }

    if(active&&this._carTrackStopTimer){
      clearTimeout(this._carTrackStopTimer);
      this._carTrackStopTimer=0;
    }

    if(active&&!this._carTrackBuffer){
      this._carTrackWanted=true;
      this._loadCarTrack();
      return;
    }

    if(active&&!this._carTrackSource&&!this._startCarTrack())return;

    this._carTrackWanted=active;
    const src=this._carTrackSource,gainNode=this._carTrackGain;
    if(!src||!gainNode||!this.ac)return;

    const t=this.ac.currentTime,gain=gainNode.gain;
    gain.cancelScheduledValues(t);
    gain.setValueAtTime(Math.max(.0001,gain.value||.0001),t);
    gain.exponentialRampToValueAtTime(active?CAR_TRACK_GAIN:.0001,t+(active?CAR_FADE_IN:CAR_FADE_OUT));

    if(!active&&!this._carTrackStopTimer){
      this._carTrackStopTimer=setTimeout(()=>{
        this._carTrackStopTimer=0;
        if(!this._carTrackWanted&&this._carTrackSource===src)this._stopCarTrack();
      },Math.ceil((CAR_FADE_OUT+.05)*1000));
    }
  };

  A._stopJumpTrack=function(){
    if(this._jumpTrackStopTimer){clearTimeout(this._jumpTrackStopTimer);this._jumpTrackStopTimer=0;}
    const src=this._jumpTrackSource;
    this._jumpTrackSource=null;this._jumpTrackGain=null;
    if(src){try{src.stop();}catch{}}
  };

  A._startJumpTrack=function(){
    if(!this.enabled||!this.ensure()||!this._jumpTrackBuffer)return false;
    if(this._jumpTrackSource)return true;
    const src=this.ac.createBufferSource(),gain=this.ac.createGain(),t=this.ac.currentTime;
    src.buffer=this._jumpTrackBuffer;src.loop=true;
    gain.gain.setValueAtTime(.0001,t);
    gain.gain.exponentialRampToValueAtTime(JUMP_TRACK_GAIN,t+JUMP_FADE_IN);
    src.connect(gain);gain.connect(this._specialAudioOutput());
    src.onended=()=>{if(this._jumpTrackSource===src){this._jumpTrackSource=null;this._jumpTrackGain=null;}};
    src.start(t);
    this._jumpTrackSource=src;this._jumpTrackGain=gain;
    return true;
  };

  A._fadeJumpTrack=function(active){
    active=!!active;
    this._externalJumpActive=active;
    if(!this.enabled){
      this._externalJumpActive=false;this._jumpTrackWanted=false;this._stopJumpTrack();return;
    }
    if(active&&this._jumpTrackStopTimer){clearTimeout(this._jumpTrackStopTimer);this._jumpTrackStopTimer=0;}
    if(active&&!this._jumpTrackBuffer){this._jumpTrackWanted=true;this._loadJumpTrack();return;}
    if(active&&!this._jumpTrackSource&&!this._startJumpTrack())return;
    this._jumpTrackWanted=active;
    const src=this._jumpTrackSource,gainNode=this._jumpTrackGain;
    if(!src||!gainNode||!this.ac)return;
    const t=this.ac.currentTime,gain=gainNode.gain;
    gain.cancelScheduledValues(t);
    gain.setValueAtTime(Math.max(.0001,gain.value||.0001),t);
    gain.exponentialRampToValueAtTime(active?JUMP_TRACK_GAIN:.0001,t+(active?JUMP_FADE_IN:JUMP_FADE_OUT));
    if(!active&&!this._jumpTrackStopTimer){
      this._jumpTrackStopTimer=setTimeout(()=>{
        this._jumpTrackStopTimer=0;
        if(!this._jumpTrackWanted&&this._jumpTrackSource===src)this._stopJumpTrack();
      },Math.ceil((JUMP_FADE_OUT+.05)*1000));
    }
  };

  A.musicStep=function(...args){
    if(this._externalBossActive||this._externalCarActive||this._externalJumpActive)return;
    return oldMusicStep?.apply(this,args);
  };

  function bossIsVisible(g){
    if(g.state==='battle'&&g.battleEnemy?.boss)return true;
    if(g.state!=='running'&&g.state!=='intro')return false;
    const list=g.objects||[];
    for(const o of list){
      if(o.processed||o.type!=='enemy'||!o.boss)continue;
      const z=g.objectZ?.(o);if(z==null)continue;
      if(z>=BOSS_VIEW_MIN_Z&&z<=BOSS_VIEW_MAX_Z)return true;
    }
    return false;
  }

  function carIsVisible(g){
    if(g.state!=='running'||!H)return false;
    const cars=g.v14?.cars||[];
    for(const car of cars){
      if(!car||car.done||car.active===false)continue;
      const z=H.currentCarZ?.(g,car);
      if(Number.isFinite(z)&&z>=CAR_VIEW_MIN_Z&&z<=CAR_VIEW_MAX_Z)return true;
    }
    return false;
  }

  function jumpIsActive(g){
    return g.state==='running'&&(g.jumpTimer||0)>0;
  }

  const oldUpdate=P.update;
  P.update=function(dt){
    oldUpdate.call(this,dt);
    const enabled=!!this.audio?.enabled;
    const bossActive=enabled&&bossIsVisible(this)&&this.state!=='failed'&&this.state!=='complete'&&this.state!=='menu';
    const carActive=enabled&&carIsVisible(this);
    const jumpActive=enabled&&jumpIsActive(this);
    this.audio?._fadeBossTrack?.(!!bossActive);
    this.audio?._fadeCarTrack?.(!!carActive);
    this.audio?._fadeJumpTrack?.(!!jumpActive);
  };

  const stopExternalTracks=function(g){
    g.audio?._fadeBossTrack?.(false);
    g.audio?._fadeCarTrack?.(false);
    g.audio?._fadeJumpTrack?.(false);
  };

  const oldStart=P.startLevel;
  P.startLevel=function(...a){stopExternalTracks(this);return oldStart.apply(this,a);};

  const oldMenu=P.returnToMenu;
  P.returnToMenu=function(...a){stopExternalTracks(this);return oldMenu.apply(this,a);};

  const oldFail=P.fail;
  if(oldFail)P.fail=function(...a){stopExternalTracks(this);return oldFail.apply(this,a);};

  const oldFinish=P.beginFinish;
  P.beginFinish=function(...a){stopExternalTracks(this);return oldFinish.apply(this,a);};

  window.SleepRoadAudioV28={
    TRACK:BOSS_TRACK,
    BOSS_TRACK,CAR_TRACK,JUMP_TRACK,
    BOSS_VIEW_MIN_Z,BOSS_VIEW_MAX_Z,CAR_VIEW_MIN_Z,CAR_VIEW_MAX_Z,
    TRACK_GAIN:BOSS_TRACK_GAIN,BOSS_TRACK_GAIN,CAR_TRACK_GAIN,JUMP_TRACK_GAIN,
    SPECIAL_OUTPUT_GAIN,SPECIAL_LIMITER_THRESHOLD,
    bossIsVisible,bossIsNear:bossIsVisible,carIsVisible,jumpIsActive
  };
})();
