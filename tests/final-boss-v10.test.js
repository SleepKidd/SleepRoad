'use strict';
const assert=require('assert');
const fs=require('fs');
const vm=require('vm');

global.window=global;
vm.runInThisContext(fs.readFileSync('level-director-v5.js','utf8'),{filename:'level-director-v5.js'});
const D=global.SleepRoadLevelDirector;
assert(D);
assert.equal(D.BOSS_STRENGTH_MULTIPLIER,3,'boss strength multiplier must be exactly x3');

for(let level=1;level<=200;level++){
  const p=D.profileForLevel(level);
  assert.equal(p.finalBoss,true,'level '+level+' must end with a boss');
  const baseHp=D.finalBossBaseStrength(level,p.sections),hp=D.finalBossStrength(level,p.sections);
  assert(Number.isInteger(hp)&&hp>=84,'boss HP must be positive at level '+level);
  assert.equal(hp,baseHp*3,'final boss HP must be exactly x3 at level '+level);
  assert.equal(D.bossStrength(level,p.sections),D.bossBaseStrength(level,p.sections)*3,'full boss strength must be exactly x3');
  if(p.bossLevel)assert.equal(hp,D.bossStrength(level,p.sections),'major boss must use full strength');
  else assert(hp<D.bossStrength(level,p.sections),'regular final boss must be softer than major boss');
}

const runtime=fs.readFileSync('level-runtime-v5.js','utf8');
for(const token of [
  "if(profile.finalBoss)",
  "soloBoss:true",
  "bossScale:major?3.75:3.25",
  "D.finalBossStrength",
  "D.finalBossBaseStrength",
  "bossStrengthMultiplier:D.BOSS_STRENGTH_MULTIPLIER",
  "bossDamage",
  "bossBaseCount/(70*D.BOSS_STRENGTH_MULTIPLIER)",
  "bossFinish:profile.finalBoss",
  "majorBoss:major"
])assert(runtime.includes(token),token);

const render=fs.readFileSync('render-levels-v5.js','utf8');
for(const token of [
  "this.crowdBatch.draw(1,0,rootZ",
  "HP ${Math.max(0,o.count)}",
  "scale=o.bossScale||3.25",
  "fillW=Math.max(.06,barW*hp)"
])assert(render.includes(token),token);
assert(!render.includes("this.crowdBatch.draw(Math.max(1,o.count),0,z-.8,c,this.time+1.1,{scale:o.boss"));

const visual=fs.readFileSync('visual-v9.js','utf8');
for(const token of [
  "if(!g.profile?.finalBoss)return",
  "g.objects?.find(o=>o.boss&&!o.processed)",
  "targetZ=boss?-1.8",
  "boss?2.2:0"
])assert(visual.includes(token),token);

for(const file of ['level-director-v5.js','level-runtime-v5.js','render-levels-v5.js','visual-v9.js'])
  assert.doesNotThrow(()=>new Function(fs.readFileSync(file,'utf8')),file);

console.log('PASS: every level has one giant final boss, scaled HP, arena and camera');
