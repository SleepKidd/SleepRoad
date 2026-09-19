'use strict';
const assert=require('assert'),fs=require('fs'),vm=require('vm');
const src=fs.readFileSync('audio-v28.js','utf8');
assert.doesNotThrow(()=>new Function(src));

function Game(){}
class AudioEngine{
  constructor(){this.enabled=true;this.ac={};this.ensureCalls=0;this.musicCalls=0;}
  ensure(){this.ensureCalls++;return true;}
  musicStep(){this.musicCalls++;}
}
const window={SleepRoad3D:Game,SleepRoadSystems:{AudioEngine}};
const fakeFetch=()=>Promise.resolve({ok:true,arrayBuffer:()=>Promise.resolve(new ArrayBuffer(8))});
vm.runInNewContext(src,{window,fetch:fakeFetch,console,setTimeout,clearTimeout,Promise,ArrayBuffer,Math});
const V=window.SleepRoadAudioV28;
assert(V);
assert.equal(V.TRACK,'./assets/audio/boss-battle-v28.mp3');
assert.equal(V.NEAR_BOSS_Z,12.5);
assert(V.TRACK_GAIN>0&&V.TRACK_GAIN<.5);

const g=new Game();
g.playerZ=1.6;g.state='running';g.objects=[{type:'enemy',boss:true,processed:false,distance:100}];g.travel=90;g.objectZ=o=>-o.distance+g.travel;
assert(V.bossIsNear(g),'boss should trigger music when crowd is close');
g.travel=70;assert(!V.bossIsNear(g),'distant boss must not trigger track');
g.state='battle';g.battleEnemy={boss:true};assert(V.bossIsNear(g),'boss battle must keep track active');
g.state='complete';assert(!V.bossIsNear(g),'completed run must not count as active boss proximity');

const a=new AudioEngine();
a._externalBossActive=false;a.musicStep(.1);assert.equal(a.musicCalls,1);
a._externalBossActive=true;a.musicStep(.1);assert.equal(a.musicCalls,1,'synth music must be ducked while supplied boss track is active');

const file='assets/audio/boss-battle-v28.mp3',stat=fs.statSync(file),head=fs.readFileSync(file).subarray(0,3).toString('ascii');
assert(stat.size>150000,'boss music asset is unexpectedly small');
assert(head==='ID3'||head.charCodeAt(0)===255,'boss music asset does not look like MP3 data');

const index=fs.readFileSync('index.html','utf8');
assert(index.includes('./audio-v28.js'));
assert(index.includes('./visual-polish-v28.js'));
assert(index.indexOf('experience-v14.js')<index.indexOf('audio-v28.js'));
const sw=fs.readFileSync('sw.js','utf8');
assert(sw.includes("const CACHE='sleep-road-v54';"));
assert(sw.includes("'./assets/audio/boss-battle-v28.mp3'"));
assert(sw.includes("'./audio-v28.js'"));
console.log('PASS: supplied boss music is cached, starts near/fighting boss and ducks synth music');