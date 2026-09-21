'use strict';
const assert=require('assert'),fs=require('fs'),vm=require('vm');
const src=fs.readFileSync('audio-v28.js','utf8');
assert.doesNotThrow(()=>new Function(src));

function Game(){}
for(const name of ['update','startLevel','returnToMenu','fail','beginFinish'])Game.prototype[name]=function(){};

class AudioEngine{
  constructor(){
    this.enabled=true;
    this.ensureCalls=0;
    this.musicCalls=0;
    this.master={};
    this.ac={
      currentTime:1,
      createBufferSource(){
        return{
          loop:false,buffer:null,started:false,stopped:false,
          connect(){},start(){this.started=true;},stop(){this.stopped=true;}
        };
      },
      createGain(){
        return{
          connect(){},
          gain:{
            value:.1,
            setValueAtTime(v){this.value=v;},
            exponentialRampToValueAtTime(v){this.value=v;},
            cancelScheduledValues(){}
          }
        };
      },
      decodeAudioData(buffer){return Promise.resolve({duration:2.162,buffer});}
    };
  }
  ensure(){this.ensureCalls++;return true;}
  musicStep(){this.musicCalls++;}
}

const window={
  SleepRoad3D:Game,
  SleepRoadSystems:{AudioEngine},
  SleepRoadCarHazardV14:{
    currentCarZ(g,car){return car.started?car.z:-car.distance+(g.travel||0);}
  }
};
const fakeFetch=()=>Promise.resolve({ok:true,arrayBuffer:()=>Promise.resolve(new ArrayBuffer(8))});
vm.runInNewContext(src,{window,fetch:fakeFetch,console,setTimeout,clearTimeout,Promise,ArrayBuffer,Math,Number});
const V=window.SleepRoadAudioV28;
assert(V);

assert.equal(V.BOSS_TRACK,'./assets/audio/boss-battle-v28.mp3');
assert.equal(V.CAR_TRACK,'./assets/audio/car-near-v29.mp3');
assert.equal(V.JUMP_TRACK,'./assets/audio/jump-loop-v30.mp3');
assert.equal(V.BOSS_VIEW_MIN_Z,-88);
assert.equal(V.BOSS_VIEW_MAX_Z,12);
assert.equal(V.CAR_VIEW_MIN_Z,-92);
assert.equal(V.CAR_VIEW_MAX_Z,19);
assert.equal(V.BOSS_TRACK_GAIN,2.4);
assert.equal(V.CAR_TRACK_GAIN,2.8);
assert.equal(V.JUMP_TRACK_GAIN,2.8);
assert.equal(V.SPECIAL_OUTPUT_GAIN,.98);
assert.equal(V.SPECIAL_LIMITER_THRESHOLD,-2.5);

const bossGame=new Game();
bossGame.state='running';
bossGame.objects=[{type:'enemy',boss:true,processed:false,distance:100}];
bossGame.objectZ=o=>-o.distance+bossGame.travel;
bossGame.travel=11.99;assert(!V.bossIsVisible(bossGame),'boss outside render range must not trigger track');
bossGame.travel=12;assert(V.bossIsVisible(bossGame),'boss must trigger music at the first render-visible frame');
bossGame.travel=70;assert(V.bossIsVisible(bossGame),'visible approaching boss must keep track active');
bossGame.state='battle';bossGame.battleEnemy={boss:true};assert(V.bossIsVisible(bossGame),'boss battle must keep track active');
bossGame.state='complete';assert(!V.bossIsVisible(bossGame),'completed run must not count as active boss visibility');

const carGame=new Game();
carGame.state='running';
carGame.travel=0;
carGame.v14={cars:[{active:true,done:false,started:true,z:-92.01}]};
assert(!V.carIsVisible(carGame),'car before render range must stay silent');
carGame.v14.cars[0].z=-92;assert(V.carIsVisible(carGame),'sound must start on the first visible car frame');
carGame.v14.cars[0].z=1.8;assert(V.carIsVisible(carGame),'sound must remain active while the car passes and hits the crowd');
carGame.v14.cars[0].z=19;assert(V.carIsVisible(carGame),'last visible frame must still be audible');
carGame.v14.cars[0].z=19.01;assert(!V.carIsVisible(carGame),'sound must stop after the car leaves view');
carGame.v14.cars[0].z=0;carGame.v14.cars[0].done=true;assert(!V.carIsVisible(carGame),'finished cars must stay silent');
carGame.v14.cars[0].done=false;carGame.state='battle';assert(!V.carIsVisible(carGame),'car audio is only active during the running state');

const jumpGame=new Game();
jumpGame.state='running';jumpGame.jumpTimer=0;assert(!V.jumpIsActive(jumpGame),'jump audio must stay silent on the ground');
jumpGame.jumpTimer=.001;assert(V.jumpIsActive(jumpGame),'jump audio must start as soon as jumpTimer becomes active');
jumpGame.jumpTimer=2.35;assert(V.jumpIsActive(jumpGame),'jump audio must remain active for the whole normal jump');
jumpGame.jumpTimer=3.65;assert(V.jumpIsActive(jumpGame),'jump audio must also cover extended low-gravity jumps');
jumpGame.state='battle';assert(!V.jumpIsActive(jumpGame),'jump audio must stop outside the running state');

const a=new AudioEngine();
a._externalBossActive=false;a._externalCarActive=false;a._externalJumpActive=false;a.musicStep(.1);assert.equal(a.musicCalls,1);
assert.equal(a._specialAudioOutput(),a.master,'unsupported limiter path must safely fall back to master');
a._externalBossActive=true;a.musicStep(.1);assert.equal(a.musicCalls,1,'synth music must be ducked while boss music is active');
a._externalBossActive=false;a._externalCarActive=true;a.musicStep(.1);assert.equal(a.musicCalls,1,'synth music must be ducked while car speech is active');
a._externalCarActive=false;a._externalJumpActive=true;a.musicStep(.1);assert.equal(a.musicCalls,1,'synth music must be ducked while jump speech is active');

a._bossTrackBuffer={duration:10};
assert.equal(a._startBossTrack(),true);
assert(a._bossTrackSource.loop,'boss music must loop');

a._carTrackBuffer={duration:2.162};
assert.equal(a._startCarTrack(),true);
assert(a._carTrackSource.loop,'car audio must loop while the car is visible');
assert(a._carTrackSource.started,'car audio source must start');

a._jumpTrackBuffer={duration:2.116};
assert.equal(a._startJumpTrack(),true);
assert(a._jumpTrackSource.loop,'jump audio must loop while jumpTimer is active');
assert(a._jumpTrackSource.started,'jump audio source must start');

const carFile='assets/audio/car-near-v29.mp3';
const carStat=fs.statSync(carFile);
const carHead=fs.readFileSync(carFile).subarray(0,3).toString('ascii');
assert(carStat.size>9000,'car audio asset is unexpectedly small');
assert(carHead==='ID3'||carHead.charCodeAt(0)===255,'car audio asset does not look like MP3 data');

const jumpFile='assets/audio/jump-loop-v30.mp3';
const jumpStat=fs.statSync(jumpFile);
const jumpHead=fs.readFileSync(jumpFile).subarray(0,3).toString('ascii');
assert(jumpStat.size>6000,'jump audio asset is unexpectedly small');
assert(jumpHead==='ID3'||jumpHead.charCodeAt(0)===255,'jump audio asset does not look like MP3 data');

const sw=fs.readFileSync('sw.js','utf8');
assert(sw.includes("const CACHE='sleep-road-v65';"));
assert(sw.includes("'./assets/audio/boss-battle-v28.mp3'"));
assert(sw.includes("'./assets/audio/car-near-v29.mp3'"));
assert(sw.includes("'./assets/audio/jump-loop-v30.mp3'"));
assert(sw.includes("'./audio-v28.js'"));

const carSource=fs.readFileSync('experience-v14.js','utf8');
assert(carSource.includes('if(z<-92||z>19)return;'),'car audio visibility window must match car render culling');

console.log('PASS: boss/car/jump supplied audio is cached and each loop follows its exact gameplay-active state');
