'use strict';
(() => {
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const BIOMES=[
    {
      id:'meadow',name:'GREEN ROAD',levels:[1,10],
      palette:{sky:[.46,.72,.93],ground:[.31,.60,.36],groundDark:[.18,.39,.24],road:[.34,.37,.44],roadEdge:[.90,.92,.96],stripe:[.92,.92,.82],accent:[1,.72,.09],structure:[.28,.23,.50],good:[.16,.75,.67],bad:[.93,.20,.25]},
      obstaclePool:['spinner','spikes','poles','barrier','mines','saw','bladePair','slamGate','slalom'],decor:'trees',lightDir:[-.45,.9,.35]
    },
    {
      id:'desert',name:'DUST HIGHWAY',levels:[11,20],
      palette:{sky:[.92,.69,.43],ground:[.76,.57,.28],groundDark:[.56,.39,.19],road:[.39,.34,.31],roadEdge:[.96,.83,.60],stripe:[1,.90,.55],accent:[1,.48,.10],structure:[.36,.20,.35],good:[.18,.68,.58],bad:[.88,.18,.20]},
      obstaclePool:['mines','saw','pusher','spikes','barrier','hammer','roller','bladePair','slamGate','slalom'],decor:'desert',lightDir:[-.35,.95,.22]
    },
    {
      id:'factory',name:'IRON WORKS',levels:[21,30],
      palette:{sky:[.42,.48,.55],ground:[.28,.30,.31],groundDark:[.18,.20,.21],road:[.24,.25,.28],roadEdge:[.80,.82,.83],stripe:[.95,.70,.16],accent:[1,.48,.08],structure:[.18,.20,.25],good:[.15,.66,.58],bad:[.88,.17,.16]},
      obstaclePool:['crusher','hammer','saw','roller','pusher','barrier','movingWall','fallingBlock','bladePair','slamGate','slalom'],decor:'factory',lightDir:[-.55,.8,.30]
    },
    {
      id:'city',name:'NIGHT CITY',levels:[31,40],
      palette:{sky:[.07,.10,.20],ground:[.08,.12,.18],groundDark:[.04,.07,.12],road:[.12,.14,.20],roadEdge:[.34,.44,.65],stripe:[.30,.74,1],accent:[.20,.78,1],structure:[.20,.16,.42],good:[.16,.82,.72],bad:[1,.20,.36]},
      obstaclePool:['laser','pendulum','movingWall','fireline','roller','crusher','pusher','saw','bladePair','slamGate','slalom'],decor:'city',lightDir:[-.30,.78,.55]
    },
    {
      id:'neon',name:'NEON LAB',levels:[41,50],
      palette:{sky:[.09,.05,.18],ground:[.10,.07,.16],groundDark:[.05,.03,.10],road:[.15,.12,.23],roadEdge:[.48,.30,.85],stripe:[.28,.95,.92],accent:[.96,.26,.78],structure:[.32,.12,.58],good:[.18,.92,.74],bad:[1,.18,.42]},
      obstaclePool:['laser','fireline','movingWall','fallingBlock','crusher','pendulum','hammer','roller','saw','bladePair','slamGate','slalom'],decor:'neon',lightDir:[-.20,.72,.65]
    }
  ];

  const ENCOUNTERS={
    meadow:['classic','riskReward','doubleSaw','spinnerIslands','rescue','jumpRun','bladeGauntlet','slamRun'],
    desert:['riskReward','mineZigzag','doubleSaw','hammerRun','speedRun','splitMerge','rescue','bladeGauntlet','slalomRush','shockJump'],
    factory:['crusherGate','hammerRun','movingWalls','waves','fallingRun','slowRun','splitMerge','elite','bladeGauntlet','slamRun','trapMix'],
    city:['laserShift','twinPendulum','movingWalls','speedRun','slowRun','waves','fireRun','elite','treasure','bladeGauntlet','slalomRush','trapMix'],
    neon:['laserShift','twinPendulum','movingWalls','fallingRun','fireRun','slowRun','waves','riskReward','splitMerge','elite','treasure','bladeGauntlet','slamRun','shockJump','trapMix']
  };

  function biomeForLevel(level){
    level=Math.max(1,Math.floor(level));
    if(level<=50)return BIOMES[Math.floor((level-1)/10)];
    const cycle=Math.floor((level-51)/5)%BIOMES.length;
    return BIOMES[cycle];
  }

  function profileForLevel(level){
    level=Math.max(1,Math.floor(level));
    const biome=biomeForLevel(level),biomeIndex=BIOMES.indexOf(biome),chapter=level<=50?biomeIndex:4,local=((level-1)%10)+1,endless=Math.max(0,level-50);
    const endlessScale=endless?Math.log2(1+endless/10):0;
    const intensity=level<=50?clamp((level-1)/49,0,1):1+endlessScale*.22;
    // Shorter runs, but denser and faster: fewer sections + tighter spacing are offset by
    // harder encounter packs and slightly higher movement speed.
    const bossRunCut=local===10?1:0;
    const sections=level<=50?Math.max(7,7+chapter+Math.min(1,Math.floor((local-1)/5))-bossRunCut):12+Math.min(2,Math.floor(Math.max(0,endless-1)/80));
    // Keep encounters compact but never stack the next gate on top of the previous trap.
    // Difficulty comes from denser packs and faster hazards, not unreadable object overlap.
    const spacing=level<=50?Math.max(45,46-chapter*.25):45;
    const baseSpeed=level<=50?Math.min(12.0,9.35+chapter*.48+(local-1)*.050):Math.min(13.2,11.75+endless*.010);
    const bossLevel=level%10===0;
    const finalBoss=true;
    const eliteLevel=!bossLevel&&level%5===0;
    const bonusLevel=!bossLevel&&level>5&&level%15===5;
    const timed=!bossLevel&&level>=14&&level%7===0;
    const noHit=!bossLevel&&level>=18&&level%9===0;
    const title=bossLevel?`${biome.name} · BOSS`:bonusLevel?`${biome.name} · BONUS`:biome.name;
    const timedBase=timed?Math.max(46,Math.round((sections*spacing)/baseSpeed*1.16)):0;
    const timedLimit=timed?Math.ceil(timedBase*1.5):0;
    return{level,biome,chapter,local,endless,intensity,sections,spacing,baseSpeed,finalBoss,bossLevel,eliteLevel,bonusLevel,timed,noHit,timedLimit,title};
  }

  function encounterFor(rng,index,profile){
    const pool=profile.endless?[...new Set(Object.values(ENCOUNTERS).flat())]:(ENCOUNTERS[profile.biome.id]||ENCOUNTERS.meadow);
    if(index===0)return profile.level<=3?'classic':'riskReward';
    if(profile.bossLevel){
      const bossSequence=['classic','riskReward','elite','waves','splitMerge','speedRun','crusherGate','rescue'];
      return bossSequence[(index-1)%bossSequence.length];
    }
    if(profile.bonusLevel&&index%3===1)return'treasure';
    if(profile.eliteLevel&&index===profile.sections-3)return'elite';
    return pool[Math.floor(rng.next()*pool.length)];
  }

  function bossName(level){
    const names=['THE GUARDIAN','THE SAND KING','THE FOREMAN','THE WARDEN','THE CORE'];
    const biome=biomeForLevel(level),idx=BIOMES.indexOf(biome);
    if(level<=50)return names[idx];
    return `OMEGA ${1+Math.floor((level-51)/10)}`;
  }

  function bossStrength(level,section){
    // Linear HP already scales indefinitely with level. The old extra endless multiplier
    // could outgrow the shorter run-up economy and create mathematically unwinnable bosses.
    return Math.round(42+level*1.55+section*2.1);
  }
  function finalBossStrength(level,section){
    const profile=profileForLevel(level),full=bossStrength(level,section);
    return profile.bossLevel?full:Math.max(28,Math.round(full*.55));
  }

  function gateValues(level,rng,risk=false){
    const profile=profileForLevel(level),scale=1+profile.chapter*.16+Math.min(.75,profile.endless*.006);
    if(risk){
      const safe={op:'add',value:Math.round((7+rng.range(1,8))*scale)};
      const risky=rng.next()<.45?{op:'mul',value:profile.level>=35&&rng.next()<.16?3:2}:{op:'add',value:Math.round((15+rng.range(3,14))*scale)};
      return rng.next()<.5?[safe,risky]:[risky,safe];
    }
    const good=()=>rng.next()<.13+Math.min(.10,profile.intensity*.05)?{op:'mul',value:profile.level>20&&rng.next()<.08?3:2}:{op:'add',value:Math.round(rng.range(6,14+profile.chapter*2)*scale)};
    const bad=()=>rng.next()<.36+Math.min(.22,profile.intensity*.08)?{op:'div',value:profile.level>18&&rng.next()<.18?3:2}:{op:'sub',value:Math.round(rng.range(5,11+profile.chapter*4)*scale)};
    let a=good(),b=bad();
    if(rng.next()<.20){a=good();b=good();}
    if(rng.next()<.5)[a,b]=[b,a];
    return[a,b];
  }

  function obstaclePool(profile){return profile.endless?[...new Set(BIOMES.flatMap(b=>b.obstaclePool))]:profile.biome.obstaclePool.slice();}

  window.SleepRoadLevelDirector={BIOMES,ENCOUNTERS,biomeForLevel,profileForLevel,encounterFor,bossName,bossStrength,finalBossStrength,gateValues,obstaclePool,clamp};
})();
