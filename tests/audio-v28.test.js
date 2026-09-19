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
assert.equal(V.BOSS_VIEW_MIN_Z,-88);
assert.equal(V.BOSS_VIEW_MAX_Z,12);
assert(V.TRACK_GAIN>0&&V.TRACK_GAIN<.5);

const g=new Game();
g.playerZ=1.6;g.state='running';g.objects=[{type:'enemy',boss:true,processed:false,distance:100}];g.objectZ=o=>-o.distance+g.travel;
g.travel=11.99;assert(!V.bossIsVisible(g),'boss outside render range must not trigger track');
g.travel=12;assert(V.bossIsVisible(g),'boss must trigger music at the first render-visible frame');
g.travel=70;assert(V.bossIsVisible(g),'visible approaching boss must keep track active');
g.state='battle';g.battleEnemy={boss:true};assert(V.bossIsVisible(g),'boss battle must keep track active');
g.state='complete';assert(!V.bossIsVisible(g),'completed run must not count as active boss visibility');

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
assert(sw.includes("const CACHE='sleep-road-v55';"));
assert(sw.includes("'./assets/audio/boss-battle-v28.mp3'"));
assert(sw.includes("'./audio-v28.js'"));
const render=fs.readFileSync('render-v4.js','utf8');
assert(render.includes('if(z<-88||z>12)continue;'),'boss audio visibility window must match course render culling');
console.log('PASS: boss music is cached, starts when the boss first enters the rendered view and ducks synth music');