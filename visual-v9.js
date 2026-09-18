'use strict';
(() => {
  const S=window.SleepRoadSystems,M=window.Mini3D,Q=window.SleepRoadQualityV6,P=window.SleepRoad3D&&window.SleepRoad3D.prototype,C=S&&S.CrowdBatch&&S.CrowdBatch.prototype;
  if(!S||!M||!Q||!P||!C)throw new Error('Sleep Road Visual v9 dependencies are missing');
  const {compose,COLORS,clamp,lerp,DEG,isGoodGate,gateLabel}=S,{multiply}=M,TAU=Math.PI*2;
  const hash=n=>{const x=Math.sin(n*91.733+17.137)*43758.5453;return x-Math.floor(x);};
  const mix=(a,b,t)=>a.map((v,i)=>v+(b[i]-v)*t);
  const shade=(a,k)=>a.map(v=>clamp(v*k,0,1));
  const flatten=list=>{const out=new Float32Array(list.length*16);for(let i=0;i<list.length;i++)out.set(list[i],i*16);return out;};
  const pushColor=(arr,c)=>arr.push(c[0],c[1],c[2]);
  const qFor=g=>g?Q.preset(g):Q.PRESETS.high;

  const APPEARANCES=[
    {height:1.00,width:1.00,head:[1,1,1],body:[1,1,1],leg:[1,1,1],arm:[1,1,1],hair:0},
    {height:1.05,width:.95,head:[.96,1.04,.96],body:[.93,1.06,.94],leg:[.92,1.08,.92],arm:[.92,1.04,.92],hair:1},
    {height:.96,width:1.07,head:[1.07,.96,1.02],body:[1.08,.96,1.03],leg:[1.02,.95,1.02],arm:[1.04,.94,1.03],hair:2},
    {height:1.08,width:.91,head:[.92,1.06,.94],body:[.90,1.10,.91],leg:[.88,1.12,.90],arm:[.88,1.08,.90],hair:3},
    {height:.98,width:1.02,head:[1.03,1.00,.98],body:[1.03,.98,1.02],leg:[.96,1.00,.98],arm:[1.02,.98,1.00],hair:1},
    {height:1.03,width:1.04,head:[1.01,.98,1.04],body:[1.05,1.03,1.04],leg:[1.02,1.02,1.00],arm:[1.06,1.00,1.03],hair:2},
    {height:.94,width:.96,head:[.98,.96,.98],body:[.95,.94,.96],leg:[.92,.94,.92],arm:[.94,.94,.94],hair:0},
    {height:1.06,width:1.01,head:[1.00,1.03,1.00],body:[1.01,1.06,1.01],leg:[1.00,1.06,1.00],arm:[1.00,1.04,1.00],hair:3}
  ];
  const HAIR=[[.09,.06,.04],[.18,.10,.05],[.05,.04,.03],[.26,.15,.07],[.08,.05,.12]];
  const TORSO_STYLES=[
    {id:'tee',body:[1,1,1],hood:false,pocket:false,band:false},
    {id:'hoodie',body:[1.08,1.04,1.08],hood:true,pocket:true,band:false},
    {id:'tank',body:[.91,.99,.94],hood:false,pocket:false,band:true}
  ];
  const SHIRT_NEUTRAL=[.27,.39,.47];
  const crowdOffset=index=>({x:(hash(index*13.17)-.5)*.14,z:(hash(index*7.91+3.2)-.5)*.10});
  const softenShirt=c=>mix(c,SHIRT_NEUTRAL,.18).map(x=>clamp(x*.95+.02,0,1));
  const BOSS_THEMES=[
    {name:'GUARDIAN ARENA',color:[.18,.78,.58],alt:[1,.76,.18]},
    {name:'SAND KING ARENA',color:[1,.48,.10],alt:[.86,.73,.36]},
    {name:'FOREMAN ARENA',color:[1,.40,.08],alt:[.36,.39,.42]},
    {name:'WARDEN ARENA',color:[.20,.78,1],alt:[.94,.28,.72]},
    {name:'CORE ARENA',color:[.95,.22,.78],alt:[.22,.95,.82]}
  ];
  const WEATHER={meadow:'pollen',desert:'dust',factory:'steam',city:'rain',neon:'energy'};

  function detailLimit(){
    const g=window.__sleepRoad,q=qFor(g);
    return q.characterDetail||48;
  }
  function matrixPush(bucket,colorBucket,matrix,color){bucket.push(matrix);pushColor(colorBucket,color);}

  const smooth=t=>{t=clamp(t,0,1);return t*t*(3-2*t);};
  function bossStrikePose(phase,side=1){
    phase=((phase%1)+1)%1;side=side<0?-1:1;
    let attack=-.22,guard=-.22,bodyLean=.08,bodyRoll=0,bodyYaw=0,headPitch=-.02,extraY=0,impact=0;
    if(phase<.30){
      const t=smooth(phase/.30);
      attack=lerp(-.22,.72,t);guard=lerp(-.22,-.48,t);bodyLean=lerp(.08,-.10,t);bodyRoll=side*.12*t;bodyYaw=-side*.09*t;headPitch=lerp(-.02,.04,t);extraY=.02*t;
    }else if(phase<.48){
      const t=smooth((phase-.30)/.18);
      attack=lerp(.72,-1.62,t);guard=-.42;bodyLean=lerp(-.10,.34,t);bodyRoll=side*lerp(.12,-.13,t);bodyYaw=side*lerp(-.09,.11,t);headPitch=lerp(.04,.18,t);extraY=lerp(.02,-.06,t);impact=smooth((t-.62)/.38);
    }else if(phase<.62){
      const t=(phase-.48)/.14;
      attack=lerp(-1.62,-1.50,t);guard=lerp(-.42,-.36,t);bodyLean=lerp(.34,.29,t);bodyRoll=lerp(-side*.13,-side*.08,t);bodyYaw=lerp(side*.11,side*.06,t);headPitch=lerp(.18,.13,t);extraY=lerp(-.06,-.035,t);impact=1-t;
    }else{
      const t=smooth((phase-.62)/.38);
      attack=lerp(-1.50,-.22,t);guard=lerp(-.36,-.22,t);bodyLean=lerp(.29,.08,t);bodyRoll=lerp(-side*.08,0,t);bodyYaw=lerp(side*.06,0,t);headPitch=lerp(.13,-.02,t);extraY=lerp(-.035,0,t);
    }
    return{armL:side<0?attack:guard,armR:side>0?attack:guard,bodyLean,bodyRoll,bodyYaw,headPitch,extraY,impact};
  }

  function bossSlamPose(phase){
    phase=((phase%1)+1)%1;let arm=-.18,bodyLean=.08,bodyRoll=0,bodyYaw=0,headPitch=-.02,extraY=0,legL=-.06,legR=.06,impact=0;
    if(phase<.34){const t=smooth(phase/.34);arm=lerp(-.18,.96,t);bodyLean=lerp(.08,-.16,t);extraY=.08*t;headPitch=lerp(-.02,.05,t);}
    else if(phase<.52){const t=smooth((phase-.34)/.18);arm=lerp(.96,-1.72,t);bodyLean=lerp(-.16,.44,t);extraY=lerp(.08,-.12,t);headPitch=lerp(.05,.20,t);impact=smooth((t-.58)/.42);}
    else if(phase<.66){const t=(phase-.52)/.14;arm=lerp(-1.72,-1.48,t);bodyLean=lerp(.44,.32,t);extraY=lerp(-.12,-.05,t);impact=1-t;}
    else{const t=smooth((phase-.66)/.34);arm=lerp(-1.48,-.18,t);bodyLean=lerp(.32,.08,t);extraY=lerp(-.05,0,t);headPitch=lerp(.18,-.02,t);}
    return{armL:arm,armR:arm,bodyLean,bodyRoll,bodyYaw,headPitch,extraY,legL,legR,impact};
  }
  function bossStompPose(phase,side=1){
    phase=((phase%1)+1)%1;side=side<0?-1:1;let bodyLean=.07,bodyRoll=0,bodyYaw=0,headPitch=-.02,extraY=0,armL=-.30,armR=-.30,legL=-.06,legR=.06,impact=0,lift=0;
    if(phase<.36){const t=smooth(phase/.36);lift=t;extraY=.18*t;bodyLean=lerp(.07,-.06,t);bodyRoll=side*.06*t;armL=lerp(-.30,.18,t);armR=lerp(-.30,.18,t);}
    else if(phase<.52){const t=smooth((phase-.36)/.16);lift=1-t;extraY=lerp(.18,-.10,t);bodyLean=lerp(-.06,.30,t);bodyRoll=side*lerp(.06,-.08,t);impact=smooth((t-.58)/.42);}
    else if(phase<.65){const t=(phase-.52)/.13;extraY=lerp(-.10,-.04,t);bodyLean=lerp(.30,.22,t);impact=1-t;}
    else{const t=smooth((phase-.65)/.35);bodyLean=lerp(.22,.07,t);bodyRoll=lerp(-side*.05,0,t);extraY=lerp(-.04,0,t);armL=lerp(.06,-.30,t);armR=lerp(.06,-.30,t);}
    if(side>0)legR=lerp(.06,-1.18,lift);else legL=lerp(-.06,-1.18,lift);
    return{armL,armR,bodyLean,bodyRoll,bodyYaw,headPitch,extraY,legL,legR,impact};
  }
  function bossSweepPose(phase,side=1){
    phase=((phase%1)+1)%1;side=side<0?-1:1;let attack=-.20,guard=-.30,bodyLean=.08,bodyRoll=0,bodyYaw=0,headPitch=-.02,extraY=0,legL=-.08,legR=.08,impact=0;
    if(phase<.30){const t=smooth(phase/.30);attack=lerp(-.20,.58,t);bodyYaw=-side*.32*t;bodyRoll=side*.08*t;}
    else if(phase<.50){const t=smooth((phase-.30)/.20);attack=lerp(.58,-1.34,t);bodyYaw=side*lerp(-.32,.38,t);bodyRoll=side*lerp(.08,-.12,t);bodyLean=lerp(.08,.22,t);impact=smooth((t-.48)/.52);}
    else if(phase<.63){const t=(phase-.50)/.13;attack=lerp(-1.34,-1.18,t);bodyYaw=side*lerp(.38,.26,t);impact=1-t;}
    else{const t=smooth((phase-.63)/.37);attack=lerp(-1.18,-.20,t);bodyYaw=side*lerp(.26,0,t);bodyRoll=lerp(-side*.08,0,t);bodyLean=lerp(.20,.08,t);}
    return{armL:side<0?attack:guard,armR:side>0?attack:guard,bodyLean,bodyRoll,bodyYaw,headPitch,extraY,legL,legR,impact};
  }
  function bossStaggerPose(amount,side=1){
    const t=clamp(amount,0,1),s=side<0?-1:1;return{armL:.18*t,armR:.18*t,bodyLean:-.30*t,bodyRoll:s*.16*t,bodyYaw:-s*.10*t,headPitch:-.16*t,extraY:.05*t,legL:-.02,legR:.02,impact:0};
  }

  C.draw=function(count,rootX,rootZ,color,time,opts={}){
    const game=window.__sleepRoad,q=qFor(game),renderCount=Math.min(Math.max(1,Math.round(count)),q.maxCrowd||420),f=this.formation(renderCount),scale0=opts.scale||1,direction=opts.direction||1,enemy=opts.enemy===true,motion=(enemy?this.enemyMotion:this.playerMotion)||opts.motion||{},mode=motion.mode||'run',baseY=(motion.jumpY!=null&&!enemy?motion.jumpY:(opts.baseY||0)),runSpeed=clamp(motion.runSpeed==null?1:motion.runSpeed,.42,1.7),strafe=clamp(motion.strafe||0,-1,1),landing=clamp(motion.landing||0,0,1),takeoff=clamp(motion.takeoff||0,0,1),finish=clamp(motion.finishProgress||0,0,1),boss=motion.boss===true;
    const names=['head','body','leftArm','rightArm','leftLeg','rightLeg'],parts={},colors={};for(const n of names){parts[n]=[];colors[n]=[];}
    const hairs=[],hairColors=[],belts=[],beltColors=[],hoods=[],hoodColors=[],pockets=[],pocketColors=[],torsoBands=[],torsoBandColors=[],detail=Math.min(f.length,q.characterDetail||detailLimit()),palette=this.skinPalette||{},bossTone=boss&&game?.v11?.bossColor?game.v11.bossColor:null,shirts=enemy?(bossTone?[bossTone,bossTone.map(x=>clamp(x*.82,0,1)),bossTone.map(x=>clamp(x*1.08,0,1)),mix(bossTone,[.18,.12,.14],.25)]:[[.95,.19,.27],[1,.31,.16],[.74,.09,.20],[.92,.27,.39]]):(palette.shirts||[[.14,.52,.98],[.08,.67,.91],[.24,.42,.91],[.18,.72,.73],[.37,.49,.98]]),skins=[[1,.70,.49],[.72,.43,.28],[.94,.59,.40],[.48,.29,.21],[.84,.50,.32],[.62,.36,.24]],trousers=enemy?[[.30,.06,.09],[.40,.08,.10]]:[[.05,.12,.28],[.10,.10,.22],[.07,.22,.38],[.15,.12,.20]];
    const metrics=this.metrics(renderCount),groundY=opts.groundY==null ? .012 : opts.groundY;
    for(const qf of f){
      const ap=APPEARANCES[qf.index%APPEARANCES.length],torso=TORSO_STYLES[qf.index%TORSO_STYLES.length],jitter=enemy?{x:0,z:0}:crowdOffset(qf.index),row=Math.floor(qf.index/Math.max(1,metrics.cols)),phase=time*(6.25+runSpeed*2.05)+qf.index*.57+row*.13,wave=Math.sin(phase),counter=Math.cos(phase),runAmount=mode==='idle' ? .20 : mode==='finish' ? .50 : mode==='battle' ? .37 : 1,bob=Math.abs(wave)*.050*runAmount,scale=scale0,follow=(motion.strafe||0)*clamp(qf.z/Math.max(1,metrics.depth),0,1),massSway=enemy?0:Math.sin(time*1.28+row*.23+qf.index*.09)*.035*(mode==='run'?1:.45),x=rootX+(qf.x+jitter.x-follow*.58+massSway)*scale,z=rootZ+(qf.z+jitter.z)*direction*scale;
      let bodyLean=.040*runAmount+Math.max(0,runSpeed-1)*.085,bodyRoll=-strafe*.115,bodyYaw=strafe*.045,armL=wave*.58*runAmount,armR=-wave*.58*runAmount,legL=-wave*.42*runAmount,legR=wave*.42*runAmount,headPitch=-bodyLean*.25,extraY=0;
      if(mode==='idle'){bodyLean=0;bodyRoll=Math.sin(time*1.45+qf.index*.12)*.016;armL=wave*.08;armR=-wave*.08;legL=legR=0;extraY=Math.sin(time*2+qf.index*.21)*.012;}
      if(mode==='jump'){const a=clamp(motion.jumpAir||0,0,1),v=motion.jumpVertical||0;bodyLean=-v*.17-.045;armL=.40+a*.82+wave*.08;armR=.40+a*.82-wave*.08;legL=-.22-a*.43;legR=.20+a*.43;headPitch=v*.07;}
      if(mode==='battle'){const punch=Math.sin(time*11.2+qf.index*.41),hit=Math.max(0,punch),guard=Math.max(0,-punch);bodyLean=.12+hit*.09;bodyRoll=punch*.06;armL=-.25-hit*1.0;armR=-.25-guard*1.0;legL=-wave*.15;legR=wave*.15;extraY=Math.abs(punch)*.025;}
      if(mode==='battle'&&boss&&motion.bossAttackActive){
        const type=motion.bossAttackType||'punch',side=motion.bossAttackSide||1,stagger=clamp(motion.bossStagger||0,0,1);
        let pose=type==='slam'?bossSlamPose(motion.bossAttackPhase||0):type==='stomp'?bossStompPose(motion.bossAttackPhase||0,side):type==='sweep'?bossSweepPose(motion.bossAttackPhase||0,side):bossStrikePose(motion.bossAttackPhase||0,side);
        if(stagger>0)pose=bossStaggerPose(stagger,side);
        bodyLean=pose.bodyLean;bodyRoll=pose.bodyRoll;bodyYaw=pose.bodyYaw;headPitch=pose.headPitch;armL=pose.armL;armR=pose.armR;legL=pose.legL==null?-.10+Math.sin(time*2.2)*.035:pose.legL;legR=pose.legR==null?.10-Math.sin(time*2.2)*.035:pose.legR;extraY=pose.extraY;
      }
      if(!enemy&&motion.reaction){
        const rp=clamp(motion.reactionPower||0,0,1),rw=Math.sin(time*8+qf.index*.43);
        if(motion.reaction==='cheer'){armL=lerp(armL,-1.18+rw*.12,rp);armR=lerp(armR,-1.18-rw*.12,rp);extraY+=Math.abs(rw)*.08*rp;bodyLean=lerp(bodyLean,-.03,rp);}
        else if(motion.reaction==='fear'){armL=lerp(armL,.42,rp);armR=lerp(armR,.42,rp);bodyLean=lerp(bodyLean,-.16,rp);bodyRoll+=rw*.035*rp;}
        else if(motion.reaction==='recoil'){armL=lerp(armL,.58,rp);armR=lerp(armR,.58,rp);bodyLean=lerp(bodyLean,-.28,rp);bodyRoll+=rw*.06*rp;}
      }
      if(mode==='enemy'&&boss){bodyLean=.09+Math.sin(time*3.2+qf.index*.15)*.025;armL=wave*.74;armR=-wave*.74;extraY=Math.abs(wave)*.075;}
      if(mode==='finish'){const cheer=clamp((finish-.34)/.44,0,1),cw=Math.sin(time*8+qf.index*.45);armL=lerp(wave*.30,-1.24+cw*.12,cheer);armR=lerp(-wave*.30,-1.24-cw*.12,cheer);legL=-wave*.22;legR=wave*.22;extraY=cheer*Math.abs(cw)*.11;}
      const squash=landing*.12,stretch=takeoff*.07,rootSx=scale*ap.width*(1+squash*.42-stretch*.16),rootSy=scale*ap.height*(1-squash+stretch),rootSz=scale*(1+squash*.28-stretch*.08),turn=direction<0?Math.PI:0,root=compose(x,baseY+bob+extraY,z,bodyLean,turn+bodyYaw,bodyRoll,rootSx,rootSy,rootSz);
      const rawShirt=shirts[(qf.index*7)%shirts.length],shirt=!enemy&&qf.index===0&&game?.v11?.leaderColor?game.v11.leaderColor:(enemy?rawShirt:softenShirt(rawShirt)),skin=skins[(qf.index*3)%skins.length],trouser=trousers[(qf.index*5)%trousers.length],leftLift=Math.max(0,wave)*.082*runAmount,rightLift=Math.max(0,-wave)*.082*runAmount,leftZ=counter*.038*runAmount,rightZ=-counter*.038*runAmount;
      const pivots={head:[0,1.21,0],body:[0,.01,0],leftArm:[-.205,1.03,0],rightArm:[.205,1.03,0],leftLeg:[-.09,.62,0],rightLeg:[.09,.62,0]};
      const rotations={head:headPitch,body:0,leftArm:armL,rightArm:armR,leftLeg:legL,rightLeg:legR};
      const bodyScale=ap.body.map((x,i)=>x*torso.body[i]),partScale={head:ap.head,body:bodyScale,leftArm:ap.arm,rightArm:ap.arm,leftLeg:ap.leg,rightLeg:ap.leg};
      for(const n of names){
        const p=pivots[n],lift=n==='leftLeg'?leftLift:n==='rightLeg'?rightLift:0,zoff=n==='leftLeg'?leftZ:n==='rightLeg'?rightZ:0,ps=partScale[n],local=compose(p[0],p[1]+lift,p[2]+zoff,rotations[n],0,0,ps[0],ps[1],ps[2]),tint=n==='head'||n.includes('Arm')?skin:n==='body'?shirt:trouser,sv=.91+(qf.index%4)*.026;
        matrixPush(parts[n],colors[n],multiply(root,local),tint.map(v=>Math.min(1,v*sv)));
      }
      if(qf.index<detail){
        const hair=HAIR[(qf.index+ap.hair)%HAIR.length],hairY=1.43+(ap.head[1]-1)*.05;
        if(ap.hair===0)matrixPush(hairs,hairColors,multiply(root,compose(0,hairY,.01,0,0,0,.37,.13,.34)),hair);
        else if(ap.hair===1){matrixPush(hairs,hairColors,multiply(root,compose(-.10,hairY,.02,0,0,-.14,.25,.16,.29)),hair);matrixPush(hairs,hairColors,multiply(root,compose(.13,hairY-.01,.01,0,0,.12,.24,.15,.28)),hair);}
        else if(ap.hair===2)matrixPush(hairs,hairColors,multiply(root,compose(0,hairY+.02,.01,0,0,0,.34,.19,.36)),hair);
        else{matrixPush(hairs,hairColors,multiply(root,compose(0,hairY+.03,.01,0,0,0,.31,.23,.33)),hair);matrixPush(hairs,hairColors,multiply(root,compose(0,hairY+.17,.02,0,0,0,.15,.13,.16)),hair);}
        matrixPush(belts,beltColors,multiply(root,compose(0,.70,0,0,0,0,.31,.055,.18)),shade(trouser,.62));
        if(torso.hood){
          matrixPush(hoods,hoodColors,multiply(root,compose(0,1.10,.10,.10,0,0,.34,.22,.28)),shade(shirt,.86));
          matrixPush(pockets,pocketColors,multiply(root,compose(0,.83,-.13,0,0,0,.31,.10,.07)),shade(shirt,.78));
        }else if(torso.band){
          matrixPush(torsoBands,torsoBandColors,multiply(root,compose(0,.99,-.12,0,0,0,.27,.055,.06)),mix(shirt,COLORS.white,.20));
        }
      }
    }
    if(!enemy&&renderCount>10){
      const groupHalfWidth=Math.min(5.15,((metrics.cols-1)*metrics.spacing*.54+.78)*scale0),groupDepth=Math.max(.78,(metrics.depth*.50+.72)*scale0),centerZ=rootZ+metrics.depth*direction*scale0*.47;
      this.r.draw(this.meshes.cylinder,compose(rootX,groundY-.008,centerZ,0,0,0,groupHalfWidth,.010,groupDepth),[.055,.065,.085],.15);
      this.r.draw(this.meshes.cylinder,compose(rootX,groundY-.006,centerZ,0,0,0,groupHalfWidth*.72,.009,groupDepth*.78),[.07,.08,.10],.10);
    }
    for(const n of names)this.r.drawInstances(this.meshes.characterParts[n],flatten(parts[n]),new Float32Array(colors[n]),parts[n].length);
    if(hairs.length)this.r.drawInstances(this.meshes.sphere,flatten(hairs),new Float32Array(hairColors),hairs.length);
    if(belts.length)this.r.drawInstances(this.meshes.box,flatten(belts),new Float32Array(beltColors),belts.length);
    if(hoods.length)this.r.drawInstances(this.meshes.sphere,flatten(hoods),new Float32Array(hoodColors),hoods.length);
    if(pockets.length)this.r.drawInstances(this.meshes.box,flatten(pockets),new Float32Array(pocketColors),pockets.length);
    if(torsoBands.length)this.r.drawInstances(this.meshes.box,flatten(torsoBands),new Float32Array(torsoBandColors),torsoBands.length);
    return f;
  };

  function roadDetailCount(g,base){return Math.max(1,Math.round(base*(qFor(g).propDetail||.42)));}
  function wrap(v,span){return ((v%span)+span)%span;}
  function drawRoadWorldV9(g){
    const r=g.renderer,m=g.meshes,p=g.biome.palette,detail=qFor(g).propDetail||.42,span=330;
    const cracks=roadDetailCount(g,18);
    for(let i=0;i<cracks;i++){
      const z=8-wrap(i*(span/cracks)-g.travel*.995+hash(i*5.1)*9,span),x=(hash(i*7.4)-.5)*7.6,ang=(hash(i*4.8)-.5)*.45,len=.45+hash(i*9.2)*1.15;
      r.draw(m.box,compose(x,.052,z,0,ang,0,.035,.018,len),shade(p.road,.58),.62);
      if(detail>.65&&i%3===0)r.draw(m.box,compose(x+.16,.053,z-.20,0,-ang*.8,0,.028,.017,len*.55),shade(p.road,.62),.48);
    }
    const patches=roadDetailCount(g,9);
    for(let i=0;i<patches;i++){
      const z=4-wrap(i*(span/patches)-g.travel*.993+hash(i*3.6)*12,span),x=(hash(i*8.2)-.5)*5.7,w=.65+hash(i*6.1)*1.7,l=1.4+hash(i*2.7)*3.2;
      r.draw(m.box,compose(x,.045,z,0,(hash(i*2.3)-.5)*.16,0,w,.020,l),i%2?shade(p.road,.84):mix(p.road,p.roadEdge,.07),.56);
    }
    if(detail>.5){
      for(const x of[-1.35,1.35])for(let i=0;i<8;i++){const z=6-wrap(i*41-g.travel*.997,328);r.draw(m.box,compose(x,.047,z,0,0,0,.055,.012,5.6),shade(p.road,.66),.28);}
    }
    const nearDecals=roadDetailCount(g,12);
    for(let i=0;i<nearDecals;i++){
      const z=6-wrap(i*(36/nearDecals)-g.travel*.999+hash(i*6.7)*2.4,36),x=(hash(i*10.3)-.5)*8.2,mark=hash(i*2.9);
      if(mark<.55){
        r.draw(m.box,compose(x,.054,z,0,(hash(i*4.4)-.5)*.55,0,.025,.015,.34+hash(i)*.55),shade(p.road,.54),.66);
        if(detail>.65)r.draw(m.box,compose(x+.10,.055,z-.18,0,(hash(i*5.5)-.5)*.5,0,.020,.013,.20+hash(i*8.1)*.32),shade(p.road,.59),.48);
      }else{
        r.draw(m.box,compose(x,.052,z,0,(hash(i*3.2)-.5)*.15,0,.20+hash(i)*.30,.012,.38+hash(i*7.7)*.45),mix(p.road,p.roadEdge,.045),.34);
      }
      if(i%3===0)for(const side of[-1,1])r.draw(m.sphere,compose(side*5.78,.080,z,0,0,0,.035,.018,.055),i%2?p.accent:p.roadEdge,.75);
    }
    for(const side of[-1,1]){
      for(let i=0;i<roadDetailCount(g,16);i++){
        const z=7-wrap(i*21.1-g.travel*.982+side*7,326),x=side*6.42;
        r.draw(m.box,compose(x,.12,z,0,0,0,.20,.22,2.5),i%2?mix(p.roadEdge,p.structure,.28):p.roadEdge,.76);
      }
    }
    const signCount=roadDetailCount(g,8),decorFrontCull=(g.playerZ||1.6)-5.2;
    for(let i=0;i<signCount;i++){
      const z=5-wrap(i*(324/signCount)-g.travel*.962+hash(i*3.3)*16,324);
      if(z>=decorFrontCull)continue;
      const side=i%2?-1:1,x=side*(7.9+hash(i*4.5)*1.7),h=1.3+hash(i)*.45;
      r.draw(m.cylinder,compose(x,h*.45,z,0,0,0,.050,h,.050),p.structure);
      const c=i%3===0?p.accent:i%3===1?p.good:p.bad;
      r.draw(m.box,compose(x,h,z,0,0,side<0 ? .08 : -.08,.54,.34,.07),c,.88);
    }
    const railZ=9-wrap(165-g.travel*.99,330);
    if(railZ>-92&&railZ<15){
      r.draw(m.box,compose(0,-.14,railZ,0,0,0,12.45,.22,15.2),shade(p.road,.88),.98);
      r.draw(m.box,compose(0,-.28,railZ,0,0,0,13.25,.16,15.4),p.structure,.82);
      for(const side of[-1,1]){
        const x=side*6.75;
        r.draw(m.box,compose(x,.65,railZ,0,0,0,.10,.16,15),p.structure);
        for(let j=-3;j<=3;j++){r.draw(m.cylinder,compose(x,.36,railZ+j*2.3,0,0,0,.065,.72,.065),p.structure);r.draw(m.box,compose(side*7.55,-.52,railZ+j*2.3,0,0,0,1.55,.30,.34),mix(p.structure,p.groundDark,.28),.90);}
      }
    }
    if(g.biome.id==='city'||g.biome.id==='factory'){
      const lamps=roadDetailCount(g,7);
      for(let i=0;i<lamps;i++){const z=4-wrap(i*(320/lamps)-g.travel*.97,320),side=i%2?-1:1,x=side*7.25,h=3.2;r.draw(m.cylinder,compose(x,h*.5,z,0,0,0,.055,h,.055),p.structure);r.draw(m.box,compose(x-side*.22,h,z,0,0,0,.45,.07,.12),p.structure);r.draw(m.sphere,compose(x-side*.42,h-.03,z,0,0,0,.11,.08,.11),g.biome.id==='city'?p.accent:p.stripe,.86);}
    }
    // Curves/elevation are kept in the non-interactive far horizon only.
    for(let i=0;i<7;i++){
      const t=i/6,z=-95-i*8,phase=g.travel*.0026+i*.38,off=Math.sin(phase)*1.15*t,y=-.205+Math.sin(phase*.74)*.10*t,yaw=Math.cos(phase)*.045*t;
      r.draw(m.box,compose(off,y,z,0,yaw,0,12,.42,8.5),p.road,.98);
      r.draw(m.box,compose(off-6.06,y+.22,z,0,yaw,0,.12,.18,8.5),p.roadEdge,.90);
      r.draw(m.box,compose(off+6.06,y+.22,z,0,yaw,0,.12,.18,8.5),p.roadEdge,.90);
    }
  }

  function drawBossArena(g){
    if(!g.profile?.finalBoss)return;
    const boss=g.battleEnemy?.boss?g.battleEnemy:g.objects?.find(o=>o.boss&&!o.processed);
    if(!boss)return;
    const centerZ=g.state==='battle'&&boss===g.battleEnemy?boss.battleZ:g.objectZ(boss);
    if(centerZ<-112||centerZ>22)return;
    const r=g.renderer,m=g.meshes,p=g.biome.palette,theme=BOSS_THEMES[clamp(g.profile.chapter||0,0,4)],major=!!boss.majorBoss;
    for(let i=0;i<4;i++){
      const z=centerZ+8-i*5.2;
      r.draw(m.box,compose(0,.035,z,0,0,0,11.7,.055,5.0),mix(p.road,theme.color,major?.12:.07),.92);
      for(const side of[-1,1]){
        const x=side*7.35;
        r.draw(m.box,compose(x,.12,z,0,0,0,2.25,.22,4.9),mix(p.groundDark,theme.alt,.12),.96);
        r.draw(m.cylinder,compose(x,1.18,z,0,0,0,.10,2.36,.10),p.structure);
        r.draw(m.box,compose(x,2.12,z,0,0,side*.10,.72,.48,.08),i%2?theme.color:theme.alt,.92);
        r.draw(m.sphere,compose(x,2.57,z-.18,0,0,0,major?.15:.11,major?.15:.11,major?.15:.11),theme.color,.94);
      }
    }
    for(const side of[-1,1]){
      const x=side*6.35;
      r.draw(m.box,compose(x,.52,centerZ-2.0,0,0,0,.16,1.04,13),p.structure,.88);
      for(let i=0;i<5;i++)r.draw(m.sphere,compose(x,.90,centerZ+7-i*3.1,0,0,0,.08,.08,.08),i%2?theme.color:theme.alt,.94);
    }
  }

  const oldEnv=P.drawEnvironment;
  P.drawEnvironment=function(){oldEnv.call(this);drawRoadWorldV9(this);drawBossArena(this);};

  function drawGatePanel(g,x,z,opt,slide){
    const r=g.renderer,m=g.meshes,p=g.biome.palette,good=isGoodGate(opt),c=good?p.good:p.bad,frame=good?mix(p.structure,p.good,.20):mix(p.structure,p.bad,.22),center=x+(x<0?-slide:slide);
    r.draw(m.box,compose(center,1.48,z,0,0,0,4.42,2.30,.11),c,.60);
    r.draw(m.box,compose(center,2.66,z-.04,0,0,0,4.70,.17,.35),frame);
    r.draw(m.box,compose(center-2.25,1.42,z-.04,0,0,0,.22,2.85,.38),frame);
    r.draw(m.box,compose(center+2.25,1.42,z-.04,0,0,0,.22,2.85,.38),frame);
    r.draw(m.box,compose(center,1.48,z-.10,0,0,0,4.06,.08,.18),mix(c,COLORS.white,.25),.78);
    for(const px of[-1.72,1.72])r.draw(m.sphere,compose(center+px,2.68,z-.22,0,0,0,.08,.08,.08),good?p.good:p.bad,.96);
    g.addWorldLabel([center,1.56,z+.22],gateLabel(opt),good?'good':'bad');
  }
  P.drawGate=function(o,z){
    const r=this.renderer,m=this.meshes,p=this.biome.palette,approach=clamp((z+12)/11,0,1),slide=approach*.34;
    drawGatePanel(this,-2.55,z,o.left,slide);drawGatePanel(this,2.55,z,o.right,slide);
    r.draw(m.box,compose(0,1.47,z-.06,0,0,0,.20,3.02,.42),p.structure);
    r.draw(m.box,compose(0,3.00,z-.06,0,0,0,10.05,.20,.42),o.risk?p.accent:p.structure);
    for(const x of[-4.85,4.85]){r.draw(m.cylinder,compose(x,.20,z+.04,0,0,0,.38,.36,.38),p.structure);r.draw(m.sphere,compose(x,3.02,z-.18,0,0,0,.13,.13,.13),o.risk?p.accent:p.roadEdge,.92);}
    if(o.risk)this.addWorldLabel([o.riskSide*2.55,3.35,z+.06],'РИСК','boss');
  };

  function dangerPad(g,x,z,w,d,alpha=.22){const p=g.biome.palette;g.renderer.draw(g.meshes.box,compose(x,.032,z,0,0,0,w,.022,d),mix(p.bad,[1,.03,.06],.28),alpha);}
  function safePad(g,x,z,w,d,alpha=.42){const p=g.biome.palette;g.renderer.draw(g.meshes.box,compose(x,.034,z,0,0,0,w,.024,d),mix(p.good,COLORS.white,.12),alpha);}
  function warningBeacon(g,x,y,z,color){const pulse=.10+.045*(Math.sin(g.time*7+x*1.7+z*.21)*.5+.5);g.renderer.draw(g.meshes.sphere,compose(x,y,z,0,0,0,pulse,pulse,pulse),color,.98);}

  function warningStripe(g,x,y,z,w,h,d,colorA,colorB){
    const r=g.renderer,m=g.meshes;r.draw(m.box,compose(x,y,z,0,0,0,w,h,d),colorA);
    for(let i=-2;i<=2;i++)r.draw(m.box,compose(x+i*w*.18,y,z-d*.52,0,0,.55,w*.09,h*.92,.03),colorB,.92);
  }
  const oldObstacle=P.drawObstacle;
  P.drawObstacle=function(o,z){
    const r=this.renderer,m=this.meshes,p=this.biome.palette,t=this.time*(o.speed||1)+(o.phase||0);
    if(o.kind==='saw'){
      const x=o.baseX+Math.sin(t)*o.range,rot=this.time*5.4;dangerPad(this,o.baseX,z,Math.max(2.4,o.range*2+1.6),1.32,.20);warningBeacon(this,x,.94,z-.52,p.bad);
      r.draw(m.box,compose(0,.09,z,0,0,0,9.7,.12,.62),shade(p.road,.65));
      warningStripe(this,0,.16,z-.34,9.4,.16,.08,[.20,.21,.24],p.stripe);
      r.draw(m.box,compose(x,.42,z+.02,0,0,0,1.55,.70,.72),[.20,.22,.25]);
      r.draw(m.cylinder,compose(x,.70,z-.25,Math.PI/2,0,rot,1.05,.18,1.05),[.66,.69,.72]);
      for(let i=0;i<12;i++){const a=rot+i*TAU/12;r.draw(m.cone,compose(x+Math.cos(a)*.96,.70+Math.sin(a)*.96,z-.25,0,0,-a,.20,.42,.20),i%2?[.82,.84,.86]:[.58,.60,.63]);}
      r.draw(m.cylinder,compose(x,.70,z-.36,Math.PI/2,0,0,.34,.22,.34),p.bad);r.draw(m.sphere,compose(x,.70,z-.50,0,0,0,.10,.10,.10),[1,.36,.12],.92);
      return;
    }
    if(o.kind==='mines'){
      for(let i=0;i<o.spikes.length;i++){const a=o.spikes[i],zz=z+a.z;dangerPad(this,a.x,zz,1.18,1.18,.18);const pulse=.09+.04*(Math.sin(this.time*6+i)*.5+.5);r.draw(m.cylinder,compose(a.x,.10,zz,0,0,0,.70,.18,.70),[.12,.15,.19]);r.draw(m.sphere,compose(a.x,.23,zz,0,0,0,.52,.26,.52),[.25,.28,.31]);for(let k=0;k<6;k++){const ang=k*TAU/6;r.draw(m.cone,compose(a.x+Math.cos(ang)*.40,.27,zz+Math.sin(ang)*.40,0,0,-ang,.11,.25,.11),[.42,.44,.46]);}r.draw(m.sphere,compose(a.x,.40,zz,0,0,0,pulse,pulse,pulse),p.bad,.98);}
      return;
    }
    if(o.kind==='spikes'){
      for(const a of o.spikes){const zz=z+a.z;dangerPad(this,a.x,zz,1.18,1.18,.20);r.draw(m.box,compose(a.x,.06,zz,0,0,0,1.05,.10,1.05),[.18,.20,.23]);for(let k=-1;k<=1;k++)r.draw(m.cone,compose(a.x+k*.26,.36,zz+(k%2)*.12,0,0,0,.23,.76,.23),k===0?[.78,.80,.82]:[.60,.62,.65]);r.draw(m.box,compose(a.x,.10,zz-.54,0,0,.45,.72,.08,.04),p.stripe);}
      return;
    }
    if(o.kind==='hammer'){
      const centers=[-2.7+Math.sin(t)*o.range,2.7-Math.sin(t)*o.range];for(const cx of centers){dangerPad(this,cx,z,1.72,1.35,.20);warningBeacon(this,cx,1.72,z-.58,p.bad);}
      for(let i=0;i<2;i++){const side=i?1:-1,anchor=side*5.25,x=centers[i],mid=(anchor+x)/2;r.draw(m.box,compose(anchor,1.22,z,0,0,0,.62,2.45,.82),[.23,.25,.28]);r.draw(m.cylinder,compose(mid,1.72,z,0,0,Math.PI/2,Math.abs(anchor-x)*.52,.15,.15),[.40,.42,.44]);r.draw(m.box,compose(x,1.03,z,0,0,0,1.55,1.45,1.05),[.27,.29,.31]);warningStripe(this,x,1.04,z-.56,1.25,.24,.05,p.stripe,[.16,.17,.19]);for(const bx of[-.46,.46])r.draw(m.sphere,compose(x+bx,1.48,z-.54,0,0,0,.08,.08,.08),[.78,.80,.82]);}
      return;
    }
    if(o.kind==='laser'){
      const safeX=o.dynamic?Math.sin(t)*3.05:o.safeX,gap=1.05,left=safeX-gap,right=safeX+gap;safePad(this,safeX,z,gap*2.0,1.55,.48);
      for(const side of[-1,1]){const x=side*5.20;r.draw(m.box,compose(x,.85,z,0,0,0,.78,1.76,.92),[.20,.19,.31]);r.draw(m.cylinder,compose(x,1.20,z-.36,Math.PI/2,0,0,.32,.24,.32),p.accent);r.draw(m.sphere,compose(x,1.20,z-.62,0,0,0,.18,.18,.18),[1,.10,.16],.98);}
      if(left>-5.02)r.draw(m.box,compose((-5.02+left)/2,.74,z-.22,0,0,0,left+5.02,.08,.08),[1,.06,.12],.96);
      if(right<5.02)r.draw(m.box,compose((right+5.02)/2,.74,z-.22,0,0,0,5.02-right,.08,.08),[1,.06,.12],.96);
      this.addWorldLabel([safeX,1.90,z],'БЕЗОПАСНО','good');return;
    }
    if(o.kind==='crusher'){
      const gapX=Math.sin(t)*2.7,left=gapX-1.35,right=gapX+1.35;safePad(this,gapX,z,2.55,1.45,.46);
      for(const side of[-1,1]){const x=side*5.28;r.draw(m.box,compose(x,1.42,z,0,0,0,.50,2.9,.88),[.20,.22,.25]);r.draw(m.cylinder,compose(x-side*.34,1.42,z,0,0,0,.12,2.42,.12),[.58,.60,.62]);}
      if(left>-5.1){const w=left+5.1;r.draw(m.box,compose(-5.1+w/2,.82,z,0,0,0,w,1.62,.80),[.44,.18,.16]);warningStripe(this,-5.1+w/2,1.32,z-.42,w*.88,.18,.05,p.stripe,[.12,.13,.15]);}
      if(right<5.1){const w=5.1-right;r.draw(m.box,compose(right+w/2,.82,z,0,0,0,w,1.62,.80),[.44,.18,.16]);warningStripe(this,right+w/2,1.32,z-.42,w*.88,.18,.05,p.stripe,[.12,.13,.15]);}
      return;
    }
    if(o.kind==='movingWall'){
      const gapX=Math.sin(t)*3.05,g=o.gapWidth||1.45,left=gapX-g,right=gapX+g;safePad(this,gapX,z,g*1.75,1.50,.48);
      const panel=(cx,w)=>{r.draw(m.box,compose(cx,.92,z,0,0,0,w,1.84,.72),[.21,.24,.29]);for(let yy=.35;yy<1.65;yy+=.42)r.draw(m.box,compose(cx,yy,z-.39,0,0,0,w*.86,.07,.04),yy<.9?p.accent:p.structure,.72);};
      if(left>-5.12){const w=left+5.12;panel(-5.12+w/2,w);}if(right<5.12){const w=5.12-right;panel(right+w/2,w);}
      r.draw(m.box,compose(gapX,1.78,z-.10,0,0,0,g*2,.12,.85),p.good);for(const sx of[-g*.76,g*.76])r.draw(m.sphere,compose(gapX+sx,1.80,z-.54,0,0,0,.08,.08,.08),p.good,.96);
      this.addWorldLabel([gapX,2.18,z],'ПРОХОД','good');return;
    }
    oldObstacle.call(this,o,z);
  };

  function cameraState(g){
    const depth=g.crowdBatch?g.crowdBatch.metrics(g.visualCount).depth:0,pullback=clamp((depth-2.5)*.78,0,11),a=g.__anim||{strafe:0},jump=window.SleepRoadAnimationV5?.jumpArc?.(g.jumpTimer||0,g.__jumpAnimDuration||2.35)||{y:0},mobile=g.w/g.h<.7,speedRatio=g.baseSpeed?g.speed/g.baseSpeed:1,boost=g.boostTimer>0?1:0,slow=g.slowTimer>0?1:0;
    return{depth,pullback,a,jump,mobile,speedRatio,boost,slow};
  }
  P.setCamera=function(){
    const aspect=this.w/this.h,s=cameraState(this),shakeX=this.shake?(Math.random()-.5)*.065*this.shake:0,shakeY=this.shake?(Math.random()-.5)*.026*this.shake:0;
    if(this.state==='menu'){const orbit=Math.sin(this.time*.25)*.85;this.renderer.setCamera([orbit,8.75,14.7],[0,.45,-12.2],aspect,(s.mobile?48:44)*DEG);return;}
    if(this.state==='finish'||this.state==='complete'){const p=this.finishProgress||0,orbit=this.profile?.bossLevel?Math.sin(p*Math.PI)*.70:0;this.renderer.setCamera([lerp(0,5.4,p)+orbit,lerp(8.8,6.7,p)+s.pullback*.22,lerp(15.2,13.3,p)+s.pullback],[0,lerp(.35,1.25,p),lerp(-13,-3.8,p)],aspect,(47+(this.profile?.bossLevel?2:0))*DEG);return;}
    const battle=this.state==='battle',boss=battle&&this.battleEnemy?.boss,camX=shakeX+(battle?Math.sin(this.time*1.25)*(boss ? .58 : .25):0)-s.a.strafe*.13+this.playerX*.020,camY=(s.mobile?9.25:8.35)+s.pullback*.38+shakeY+s.jump.y*.08+(boss?.75:0),camZ=15.1+s.pullback+(s.boost ? -.28 : s.slow ? .16 : 0)+(boss?1.2:0),targetY=(boss?1.65:.28)+s.jump.y*.025,targetZ=boss?-1.8:-12.3+s.pullback*.15,fov=(s.mobile?48.5:44.5)+(s.boost?2.2:0)+(s.slow?-.8:0)+Math.max(0,s.speedRatio-1)*.8+(boss?2.2:0);
    this.renderer.setCamera([camX,camY,camZ],[this.playerX*.028,targetY,targetZ],aspect,fov*DEG);
  };

  function ensureHud(){
    const hud=S.UI.hud;if(!hud||hud.querySelector('.v9-hud-right'))return;
    const wallet=document.querySelector('.hud-wallet'),sound=S.UI.soundBtn,cluster=document.createElement('div');cluster.className='v9-hud-right';
    hud.appendChild(cluster);if(wallet)cluster.appendChild(wallet);if(sound)cluster.appendChild(sound);
    hud.classList.add('hud-v9');
  }
  ensureHud();

  function drawWeather(g){
    const r=g.renderer,m=g.meshes,q=qFor(g),kind=WEATHER[g.biome?.id]||'pollen',n=Math.max(3,Math.round(22*(q.weatherDensity||.36))),t=g.time,travel=g.travel||0;
    if(kind==='pollen'){
      for(let i=0;i<n;i++){const x=(hash(i*4.3)-.5)*26,y=.8+hash(i*8.7)*5,z=8-wrap(i*17.3-travel*.58+t*1.6,150),s=.025+hash(i)*.035;r.draw(m.sphere,compose(x,y,z,0,0,0,s,s,s),i%3?[1,.88,.40]:[.82,1,.72],.48);}
    }else if(kind==='dust'){
      for(let i=0;i<n;i++){const x=(hash(i*5.1)-.5)*32,y=.15+hash(i*7.3)*2.1,z=8-wrap(i*15.4-travel*.72+t*2.0,145),s=.12+hash(i)*.20;r.draw(m.sphere,compose(x,y,z,0,0,0,s*2.4,s,s*1.2),[.86,.66,.39],.12);}
    }else if(kind==='steam'){
      for(let i=0;i<Math.max(3,Math.round(n*.55));i++){const side=i%2?-1:1,x=side*(8.5+hash(i*5.8)*8),z=5-wrap(i*28-travel*.63,160),rise=(t*.35+hash(i*4.2))%1,y=.5+rise*3.2,s=.18+rise*.45;r.draw(m.sphere,compose(x,y,z,0,0,0,s*1.4,s,s),[.72,.75,.78],.10*(1-rise));}
    }else if(kind==='rain'){
      for(let i=0;i<n;i++){const x=(hash(i*9.1)-.5)*24,y=((hash(i*3.7)*8-t*5.2)%8+8)%8,z=5-wrap(i*13.2-travel*.8,125);r.draw(m.box,compose(x,y,z,.12,0,0,.018,.38,.018),[.55,.76,1],.34);}
    }else{
      for(let i=0;i<n;i++){const x=(hash(i*4.9)-.5)*22,y=.5+hash(i*7.7)*5,z=6-wrap(i*15.1-travel*.70-t*1.4,145),pulse=.035+.035*(Math.sin(t*4+i)*.5+.5),c=i%2?g.biome.palette.accent:g.biome.palette.good;r.draw(m.sphere,compose(x,y,z,0,0,0,pulse,pulse,pulse),c,.56);}
    }
  }
  const oldRender=P.render;
  P.render=function(){oldRender.call(this);drawWeather(this);};

  const oldSpawn=P.spawnKnockouts;
  P.spawnKnockouts=function(loss){
    const start=this.knockouts.length;oldSpawn.call(this,loss);
    for(let i=start;i<this.knockouts.length;i++){const k=this.knockouts[i],idx=i-start;k.v9Variant=idx%APPEARANCES.length;k.v9Skin=[[1,.70,.49],[.72,.43,.28],[.94,.59,.40],[.48,.29,.21],[.84,.50,.32]][idx%5];k.v9Shirt=(this.crowdBatch.skinPalette?.shirts||[[.14,.52,.98],[.08,.67,.91],[.24,.42,.91]])[idx%3];k.v9Trouser=[[.05,.12,.28],[.10,.10,.22],[.07,.22,.38]][idx%3];k.v9Roll=(hash(idx*3.7)-.5)*2.4;}
  };
  P.drawKnockouts=function(){
    const r=this.renderer,m=this.meshes;
    for(const k of this.knockouts){const max=k.maxLife||1.55,age=1-k.life/max,fade=clamp(k.life/.26,0,1),rot=age*(k.spin||4),roll=rot*.58+(k.v9Roll||0)*age,s=.84*(.76+.24*fade),skin=k.v9Skin||[.84,.50,.32],shirt=k.v9Shirt||COLORS.blue,tr=k.v9Trouser||COLORS.navy;
      r.draw(m.box,compose(k.x,k.y+.26,k.z,rot*.35,roll,rot*.20,.38*s,.48*s,.25*s),shirt,fade);
      r.draw(m.sphere,compose(k.x+.16*Math.sin(roll),k.y+.68,k.z-.10*Math.cos(roll),rot*.18,roll*.35,0,.30*s,.34*s,.30*s),skin,fade);
      for(const side of[-1,1]){r.draw(m.cylinder,compose(k.x+side*.20,k.y+.28,k.z,rot*.6,0,side*1.05+roll,.07*s,.48*s,.07*s),skin,fade);r.draw(m.cylinder,compose(k.x+side*.11,k.y-.05,k.z,rot*.5,0,side*.38+roll,.08*s,.50*s,.08*s),tr,fade);}
    }
  };

  function finishSpectator(g,x,z,count,color){
    const r=g.renderer,m=g.meshes;for(let i=0;i<count;i++){const row=Math.floor(i/6),col=i%6,px=x+(col-2.5)*.34,py=.40+row*.36,pz=z+row*.34;r.draw(m.sphere,compose(px,py+.42,pz,0,0,0,.13,.15,.13),i%3?[.84,.50,.32]:[.72,.43,.28]);r.draw(m.box,compose(px,py+.18,pz,0,0,0,.22,.28,.16),i%2?color:mix(color,COLORS.white,.18));}}
  const oldFinish=P.drawFinishScene;
  P.drawFinishScene=function(){
    oldFinish.call(this);const r=this.renderer,m=this.meshes,p=this.biome.palette,q=qFor(this),spec=q.finishCrowd||8;
    for(const side of[-1,1]){
      const x=side*8.3;
      for(let step=0;step<3;step++)r.draw(m.box,compose(x,step*.34-.05,this.playerZ-6.5-step*.45,0,0,0,3.1,.32,5.8-step*.45),step%2?mix(p.structure,p.road,.35):p.structure,.90);
      finishSpectator(this,x,this.playerZ-4.6,spec,p.accent);
      const towerX=side*6.8;r.draw(m.cylinder,compose(towerX,2.1,this.playerZ-8.8,0,0,0,.10,4.2,.10),p.structure);r.draw(m.box,compose(towerX,4.10,this.playerZ-8.8,0,0,side*.2,.75,.28,.18),p.accent);r.draw(m.sphere,compose(towerX-side*.20,4.10,this.playerZ-8.85,0,0,0,.16,.12,.16),[1,.92,.62],.88);
      r.draw(m.box,compose(side*6.25,.65,this.playerZ-3.6,0,0,0,.10,.12,12.5),p.structure);
      for(let i=0;i<8;i++)r.draw(m.sphere,compose(side*6.25,.78,this.playerZ-2.5-i*1.45,0,0,0,.07,.07,.07),i%2?p.accent:p.good,.90);
    }
    for(let i=0;i<8;i++){const z=this.playerZ-2.4-i*1.45,y=i*.45;r.draw(m.box,compose(-5.15,y+.05,z,0,0,0,.16,.16,1.35),p.structure);r.draw(m.box,compose(5.15,y+.05,z,0,0,0,.16,.16,1.35),p.structure);}
  };

  window.SleepRoadVisualV9={APPEARANCES,TORSO_STYLES,BOSS_THEMES,WEATHER,cameraState,roadDetailCount,crowdOffset,softenShirt,bossStrikePose,bossSlamPose,bossStompPose,bossSweepPose,bossStaggerPose,roadsideCullDistance:5.2};
})();
