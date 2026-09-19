'use strict';
const assert=require('assert');
const fs=require('fs');

const src=fs.readFileSync('experience-v11.js','utf8');
const visual=fs.readFileSync('visual-v9.js','utf8');
const anim=fs.readFileSync('animation-v5.js','utf8');
const audio=fs.readFileSync('audio-v6.js','utf8');
const index=fs.readFileSync('index.html','utf8');
const sw=fs.readFileSync('sw.js','utf8');

for(const file of ['experience-v11.js','visual-v9.js','animation-v5.js','audio-v6.js'])
  assert.doesNotThrow(()=>new Function(fs.readFileSync(file,'utf8')),file);

const blocks={
  bossBattle:['BOSS_PATTERNS','bossStagger','drawBossCorpse','drawBossWarning'],
  gateVfx:['v11-gate-pop','gateFx','showGatePop'],
  crowdReactions:["reaction==='recoil'","reaction==='fear'","reaction==='cheer'"],
  formation:['n<18?.80','leader=q.index===0','this.formation=function(n)'],
  camera:['st.camera','desiredEye','oldCamera=P.setCamera'],
  lighting:['const LIGHTING=','drawAtmosphere','lightDir'],
  chapters:['drawChapterPortal','v11-chapter-transition','showChapter'],
  obstacleReadability:['drawObstacleTelegraph',"o.kind==='hammer'","o.kind==='laser'"],
  finish:['drawFinishV11','finishPulse','v11Finish'],
  juice:['function haptic','v11Impact','v11BossDeath'],
  leader:['drawLeader','leaderColor','qf.index===0'],
  skins:['V11_SKINS',"'ninja'","'astronaut'","'gold'"],
  bossVariants:['BOSS_VARIANTS',"'foreman'","'enforcer'","'core'"],
  miniEvents:['MINI_EVENTS','drawMiniEvent',"'train'","'containers'","'drones'"],
  progression:['function intensityFor','s.intensity>=1.18','return 1.32']
};

for(const [name,tokens] of Object.entries(blocks)){
  for(const token of tokens){
    const haystack=name==='crowdReactions'||name==='leader'?src+'\n'+visual:src;
    assert(haystack.includes(token),name+' missing '+token);
  }
}

assert(anim.includes("bossAttackType:o.v11AttackType||'punch'"));
assert(anim.includes("reaction:this.v11?.reaction||''"));
assert(visual.includes('bossSlamPose'));
assert(visual.includes('bossStompPose'));
assert(visual.includes('bossSweepPose'));
assert(visual.includes('bossStaggerPose'));
assert(audio.includes('!!this.battleEnemy?.boss||!!this.profile?.bossLevel'));
assert(index.includes('experience-v11.css'));
assert(index.includes('experience-v11.js'));
assert(index.indexOf('experience-v11.js')>index.indexOf('visual-v9.js'));
assert(index.indexOf('experience-v11.js')<index.indexOf('boot-v4.js'));
assert(sw.includes("const CACHE='sleep-road-v59';"));
assert(sw.includes("'./experience-v11.css'"));
assert(sw.includes("'./experience-v11.js'"));

console.log('PASS: Experience v11 covers all 15 requested upgrade blocks');
