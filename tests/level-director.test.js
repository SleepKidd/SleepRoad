'use strict';
const assert=require('assert');
const fs=require('fs');
const vm=require('vm');
const path=require('path');

global.window=global;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
class RNG{constructor(seed){this.s=(seed>>>0)||1;}next(){this.s=(Math.imul(this.s,1664525)+1013904223)>>>0;return this.s/4294967296;}range(a,b){return a+(b-a)*this.next();}int(a,b){return Math.floor(this.range(a,b+1));}pick(a){return a[Math.floor(this.next()*a.length)];}}
class CrowdBatch{metrics(count){const n=Math.max(1,Math.min(Math.round(count),420)),cols=Math.min(16,Math.max(3,Math.ceil(Math.sqrt(n*1.05)))),spacing=Math.min(.70,9.2/Math.max(1,cols-1)),rowGap=Math.min(.62,spacing*.86);return{n,cols,spacing,rowGap,depth:(Math.ceil(n/cols)-1)*rowGap};}formation(count){const{n,cols,spacing,rowGap}=this.metrics(count),rows=[];for(let i=0;i<n;i++){const row=Math.floor(i/cols),rowCount=Math.min(cols,n-row*cols),col=i%cols,stagger=row%2?spacing*.10:-spacing*.10;rows.push({x:(col-(rowCount-1)/2)*spacing+stagger,z:row*rowGap,index:i});}return rows;}}
const element=()=>({textContent:'',style:{},offsetWidth:1,classList:{add(){},remove(){},toggle(){}},addEventListener(){}});
const UI={menuMissionText:element(),menuMissionReward:element(),missionHudText:element(),missionFill:element(),shieldHud:element(),progressFill:element(),moonValue:element(),hud:element(),result:element(),resultBanner:element(),resultKicker:element(),resultTitle:element(),resultCount:element(),resultMoons:element(),resultMultiplier:element(),resultReward:element(),resultMission:element(),nextBtn:element(),retryBtn:element()};
window.SleepRoadSystems={UI,MAX_CROWD:999,clamp,lerp:(a,b,t)=>a+(b-a)*t,TAU:Math.PI*2,RNG,CrowdBatch,applyGateValue(c,o){if(o.op==='add')c+=o.value;else if(o.op==='sub')c-=o.value;else if(o.op==='mul')c*=o.value;else c=Math.ceil(c/o.value);return clamp(Math.round(c),1,999);},finishStepForCount(c){return clamp(Math.floor(Math.max(0,c-1)/14)+1,1,8);},finishMultiplierForStep(s){return 1+clamp(Math.round(s),1,8)*.35;},finishBaseReward(c,i=1){return Math.max(1,Math.round(c*.45*i));},finishReward(c,m,i=1){const b=Math.max(1,Math.round(c*.45*i));return Math.max(b,Math.round(b*m));},gateLabel(o){return o.op==='mul'?`×${o.value}`:o.op==='add'?`+${o.value}`:o.op==='sub'?`−${o.value}`:`÷${o.value}`;}};
function SleepRoad3D(){}
SleepRoad3D.prototype.startLevel=function(){};
SleepRoad3D.prototype.returnToMenu=function(){};
SleepRoad3D.prototype.missionProgress=function(){return 0;};
SleepRoad3D.prototype.missionComplete=function(){return false;};
SleepRoad3D.prototype.startCount=function(){return 8;};
SleepRoad3D.prototype.updateKnockouts=function(){};
SleepRoad3D.prototype.objectZ=function(o){return-o.distance+(this.travel||0);};
SleepRoad3D.prototype.applyGate=function(){};
SleepRoad3D.prototype.collectMoon=function(){};
SleepRoad3D.prototype.spawnKnockouts=function(){};
SleepRoad3D.prototype.setCrowdCount=function(){};
SleepRoad3D.prototype.toast=function(){};
SleepRoad3D.prototype.persistSoon=function(){};
SleepRoad3D.prototype.flushSave=function(){};
SleepRoad3D.prototype.refreshUI=function(){};
window.SleepRoad3D=SleepRoad3D;
for(const file of ['level-director-v5.js','level-runtime-v5.js'])vm.runInThisContext(fs.readFileSync(path.join(__dirname,'..',file),'utf8'),{filename:file});
const D=window.SleepRoadLevelDirector,game=window.SleepRoad3D.prototype,batch=new CrowdBatch();

assert.equal(D.biomeForLevel(1).id,'meadow');
assert.equal(D.biomeForLevel(11).id,'desert');
assert.equal(D.biomeForLevel(21).id,'factory');
assert.equal(D.biomeForLevel(31).id,'city');
assert.equal(D.biomeForLevel(41).id,'neon');
assert(D.profileForLevel(200).intensity>1);
assert(D.profileForLevel(200).sections>=D.profileForLevel(50).sections);
assert(D.profileForLevel(51).sections>=D.profileForLevel(50).sections);
assert(D.profileForLevel(51).baseSpeed>=D.profileForLevel(50).baseSpeed);
assert(D.profileForLevel(1).sections<=8);
assert(D.profileForLevel(10).sections<D.profileForLevel(9).sections,'boss run should trim pre-boss sections');
assert.equal(D.profileForLevel(9).finalBoss,true);
assert.equal(D.profileForLevel(10).finalBoss,true);
assert(D.obstaclePool(D.profileForLevel(51)).includes('fireline'));
assert(D.obstaclePool(D.profileForLevel(51)).includes('spinner'));
const timedProfile=D.profileForLevel(14);
assert(timedProfile.timed,'level 14 should be timed');
const legacyTimedLimit=Math.max(46,Math.round((timedProfile.sections*timedProfile.spacing)/timedProfile.baseSpeed*1.16));
assert.equal(timedProfile.timedLimit,Math.ceil(legacyTimedLimit*1.5),'timed mission limit must be exactly 1.5x the previous budget');

const seenBiomes=new Set(),seenKinds=new Set(),seenTypes=new Set(),seenZones=new Set(),seenPowerups=new Set();
let maxObjects=0,sawTimed=false,sawNoHit=false,sawBonus=false;
for(let level=1;level<=500;level++){
  const state=Object.assign(Object.create(game),{level,time:0,playerX:0,playerZ:1.6,playerCount:80,baseSpeed:9,objects:[]});
  game.generateLevel.call(state,level);
  seenBiomes.add(state.biome.id);maxObjects=Math.max(maxObjects,state.objects.length);
  sawTimed ||= state.profile.timed;sawNoHit ||= state.profile.noHit;sawBonus ||= state.profile.bonusLevel;
  for(const obj of state.objects){seenTypes.add(obj.type);if(obj.type==='zone')seenZones.add(obj.kind);if(obj.type==='powerup')seenPowerups.add(obj.kind);}
  assert(state.levelLength>360,`level ${level} unexpectedly short`);
  assert(state.objects.length<420,`level ${level} object budget exceeded`);
  assert(state.objects.every((item,index,list)=>index===0||list[index-1].distance<=item.distance),`level ${level} is not sorted`);
  const major=state.objects.filter(o=>['gate','obstacle','enemy','split','merge','jump','zone','rescue','bonusGate','finish'].includes(o.type));
  for(let j=1;j<major.length;j++)assert(major[j].distance-major[j-1].distance>=2.5,`level ${level} stacks major objects too tightly`);
  const finish=state.objects.filter(x=>x.type==='finish');assert.equal(finish.length,1);assert.equal(finish[0].distance,state.levelLength);
  const boss=state.objects.filter(x=>x.type==='enemy'&&x.boss);assert.equal(boss.length,1,`boss rule broken on ${level}`);
  for(const o of state.objects.filter(x=>x.type==='obstacle')){
    seenKinds.add(o.kind);let safe=false;
    for(const t of [0,.5,1,1.5,2.25]){state.time=t;for(const x of [-4,-3.1,-2,0,2,3.1,4]){state.playerX=x;const hits=game.obstacleHits.call(state,o,batch.formation(1));assert(Number.isInteger(hits)&&hits>=0&&hits<=1);if(hits===0){safe=true;break;}}if(safe)break;}
    assert(safe,`no sampled safe route for ${o.kind} on ${level}`);
  }
  const state2=Object.assign(Object.create(game),{level,time:0,playerX:0,playerZ:1.6,playerCount:80,baseSpeed:9,objects:[]});game.generateLevel.call(state2,level);
  const compact=s=>JSON.stringify(s.objects.map(o=>({type:o.type,kind:o.kind,d:+o.distance.toFixed(3),x:o.x,count:o.count,left:o.left,right:o.right,boss:o.boss,elite:o.elite,safeX:o.safeX,phase:o.phase})));
  assert.equal(compact(state),compact(state2),`level ${level} is not deterministic`);
}
assert.deepEqual([...seenBiomes].sort(),['city','desert','factory','meadow','neon']);
for(const type of ['rescue','jump','split','merge','bonusGate','powerup','zone'])assert(seenTypes.has(type),`missing object type ${type}`);
for(const zone of ['boost','slow'])assert(seenZones.has(zone),`missing zone ${zone}`);
for(const power of ['shield','magnet','double','invuln'])assert(seenPowerups.has(power),`missing powerup ${power}`);
assert(sawTimed&&sawNoHit&&sawBonus,'special level profiles did not appear');
for(const required of ['movingWall','fallingBlock','fireline','laser','pendulum','crusher','hammer','roller','saw','mines','bladePair','slamGate','slalom','shockwave'])assert(seenKinds.has(required),`missing ${required}`);
for(const level of [10,20,30,40,50,60,100]){const p=D.profileForLevel(level);assert(p.bossLevel);assert(D.bossName(level));assert(D.bossStrength(level,p.sections)>0);}
assert(maxObjects<420);

function bestGateCount(count,gate){return Math.max(window.SleepRoadSystems.applyGateValue(count,gate.left),window.SleepRoadSystems.applyGateValue(count,gate.right));}
function surviveEnemy(count,enemy){
  let foes=enemy.count,ticks=0;
  if(enemy.boss){
    while(count>0&&foes>0&&ticks<10000){ticks++;const dealt=Math.max(1,Math.floor(count/30));foes=Math.max(0,foes-dealt);if(ticks%3===0)count=Math.max(0,count-Math.max(1,Math.ceil(enemy.maxCount/70)));}
    return count;
  }
  if(enemy.elite)return count-Math.floor(foes/2);
  return count-foes;
}
for(let level=1;level<=500;level++){
  const state=Object.assign(Object.create(game),{level,time:0,playerX:0,playerZ:1.6,playerCount:80,baseSpeed:9,objects:[]});
  game.generateLevel.call(state,level);
  let count=8,banked=0;
  for(const o of state.objects){
    if(o.type==='gate')count=bestGateCount(count,o);
    else if(o.type==='rescue')count=clamp(count+o.count,1,999);
    else if(o.type==='split'){const active=Math.max(1,Math.ceil(count*Math.max(o.leftRatio,o.rightRatio)));banked+=Math.max(0,count-active);count=active;}
    else if(o.type==='merge'){count=clamp(count+banked,1,999);banked=0;}
    else if(o.type==='enemy'){count=surviveEnemy(count,o);assert(count>0,`level ${level} has a forced enemy defeat on an ideal route`);}
  }
}
console.log(`PASS: shorter/harder Level Director 1-500, ${seenKinds.size} obstacle kinds, max ${maxObjects} objects`);
