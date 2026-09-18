'use strict';
const assert=require('assert');
const fs=require('fs');
const vm=require('vm');

global.window=global;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const dummy=()=>({textContent:'',style:{setProperty(){}},classList:{add(){},remove(){},toggle(){},contains(){return false}},appendChild(){},setAttribute(){},querySelector(){return dummy()},querySelectorAll(){return[]},addEventListener(){},dataset:{},offsetWidth:1,title:''});
global.document={createElement:()=>dummy(),querySelector:()=>null,getElementById:()=>dummy()};
global.addEventListener=()=>{};
global.localStorage={getItem(){return null},setItem(){}};
function Game(){}
for(const n of ['refreshUI','updateMissionUI','returnToMenu','startLevel'])Game.prototype[n]=function(){};
const UI={menu:dummy(),playBtn:{click(){}},menuMoonValue:dummy(),moonValue:dummy()};
global.SleepRoadSystems={UI,clamp};
const biomes=[
{id:'meadow',name:'GREEN ROAD',palette:{accent:[.3,.7,1],good:[.2,.8,.6],bad:[.9,.2,.2],sky:[.5,.7,.9]}},
{id:'desert',name:'DUST HIGHWAY',palette:{accent:[1,.5,.1],good:[.2,.7,.5],bad:[.9,.2,.2],sky:[.9,.7,.4]}},
{id:'factory',name:'IRON WORKS',palette:{accent:[1,.5,.1],good:[.2,.7,.5],bad:[.9,.2,.2],sky:[.4,.5,.5]}},
{id:'city',name:'NIGHT CITY',palette:{accent:[.2,.8,1],good:[.2,.8,.7],bad:[1,.2,.4],sky:[.1,.1,.2]}},
{id:'neon',name:'NEON LAB',palette:{accent:[1,.3,.8],good:[.2,.9,.7],bad:[1,.2,.4],sky:[.1,.1,.2]}}
];
global.SleepRoadLevelDirector={BIOMES:biomes,profileForLevel(level){const i=Math.min(4,Math.floor((Math.min(level,50)-1)/10));return{level,chapter:i,biome:biomes[i],bossLevel:level%10===0,bonusLevel:level%15===5&&level%10!==0,timed:level>=14&&level%7===0,noHit:level>=18&&level%9===0};}};
global.SleepRoadProgressionV6={
  ACHIEVEMENTS:{moons:{},crowd:{},bossNoHit:{},triple:{},perfect10:{}},
  SKINS:[{id:'classic'}],
  ensureState(){return{achievements:{},totalMoons:250,bestCrowd:42,bestPerfect:4}},
  currentSkin(){return{name:'КЛАССИКА',shirts:[[.1,.5,1],[.2,.6,1],[.3,.7,1]]}},
  unlockedSkins(){return[{id:'classic'}]},
  cycleSkin(){},
  save(){}
};
global.SleepRoad3D=Game;

vm.runInThisContext(fs.readFileSync('menu-v7.js','utf8'),{filename:'menu-v7.js'});
const M=global.SleepRoadMenuV7;
assert(M);
assert.equal(M.routeProgress(1),0);
assert.equal(M.routeProgress(50),1);
assert.equal(M.routeProgress(500),1);
assert.equal(M.playLabel(global.SleepRoadLevelDirector.profileForLevel(10),10).title,'BOSS RUN');
assert.equal(M.playLabel(global.SleepRoadLevelDirector.profileForLevel(1),1).title,'ИГРАТЬ');
assert.equal(M.playLabel(global.SleepRoadLevelDirector.profileForLevel(2),2).title,'ПРОДОЛЖИТЬ');
const game={save:{moons:250},v6Progress:{achievements:{},totalMoons:250,bestCrowd:42,bestPerfect:4}};
const moon=M.achievementProgress(game,'moons'),crowd=M.achievementProgress(game,'crowd'),perfect=M.achievementProgress(game,'perfect10');
assert.equal(moon.label,'250 / 1000');
assert(Math.abs(moon.ratio-.25)<1e-9);
assert.equal(crowd.label,'42 / 100');
assert.equal(perfect.label,'4 / 10');
const theme=M.themeForProfile(global.SleepRoadLevelDirector.profileForLevel(41));
assert.equal(theme.id,'neon');
assert(theme.accent.startsWith('rgb('));
for(const file of ['menu-v7.js','progression-v6.js'])assert.doesNotThrow(()=>new Function(fs.readFileSync(file,'utf8')));
console.log('PASS: unified menu helpers, route, labels, achievements and syntax');
