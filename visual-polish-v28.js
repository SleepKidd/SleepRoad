'use strict';
(() => {
  const S=window.SleepRoadSystems,Q=window.SleepRoadQualityV6,P=window.SleepRoad3D&&window.SleepRoad3D.prototype;
  if(!S||!P)throw new Error('Sleep Road v28 visual polish dependencies are missing');
  const {compose,COLORS,clamp}=S,STEEL=[.56,.60,.65],STEEL_HI=[.78,.81,.84],STEEL_DARK=[.13,.15,.18],RUBBER=[.055,.065,.075],HAZARD=[.98,.61,.06],WARNING=[.78,.08,.055],HOT=[1,.22,.035];
  const mix=(a,b,t)=>a.map((v,i)=>v+(b[i]-v)*t);
  const hash=n=>{const x=Math.sin(n*12.9898+78.233)*43758.5453123;return x-Math.floor(x);};
  const detail=g=>Q?.preset?.(g)?.detail??1;

  function shadow(g,x,z,sx=1,sz=.65,a=.15){
    g.renderer.draw(g.meshes.cylinder,compose(x,.015,z,0,0,0,sx,.016,sz),[.035,.045,.055],a);
  }
  function addParticle(g,p){
    if(!g.v6Particles)return;
    const cap=(Q?.preset?.(g)?.maxParticles||80),arr=g.v6Particles;
    arr.push(p);if(arr.length>cap)arr.splice(0,arr.length-cap);
  }

  // --- Obstacles: one coherent industrial/mechanical style ---
  P.drawMines=function(o,z){
    const r=this.renderer,m=this.meshes,pal=this.biome?.palette||{},items=o.spikes||[],d=detail(this);
    for(let i=0;i<items.length;i++){
      const p=items[i],x=p.x,zz=z+p.z,pulse=.10+(.5+.5*Math.sin(this.time*7+i*1.7))*.055;
      shadow(this,x,zz,.70,.54,.17);
      r.draw(m.cylinder,compose(x,.075,zz,0,0,0,.70,.15,.70),RUBBER);
      r.draw(m.cylinder,compose(x,.17,zz,0,0,0,.57,.17,.57),STEEL_DARK);
      r.draw(m.sphere,compose(x,.25,zz,0,0,0,.41,.22,.41),mix(STEEL_DARK,STEEL,.34));
      if(d>.55)for(let k=0;k<8;k++){const a=k*Math.PI/4;r.draw(m.cone,compose(x+Math.cos(a)*.48,.23,zz+Math.sin(a)*.48,0,a,0,.10,.31,.10),STEEL);}
      r.draw(m.cylinder,compose(x,.35,zz,0,0,0,.15,.08,.15),WARNING);
      r.draw(m.sphere,compose(x,.42,zz,0,0,0,pulse,pulse,pulse),HOT,.94);
      if(d>.65)r.draw(m.cylinder,compose(x,.12,zz,0,0,0,.76,.025,.76),pal.accent||HAZARD,.26);
    }
  };

  P.drawSpikes=function(o,z){
    const r=this.renderer,m=this.meshes,items=o.spikes||[],d=detail(this);
    for(const p of items){
      const x=p.x,zz=z+p.z;
      shadow(this,x,zz,.64,.55,.15);
      r.draw(m.box,compose(x,.07,zz,0,0,0,1.02,.14,.88),STEEL_DARK);
      r.draw(m.box,compose(x,.15,zz-.36,0,0,0,.86,.08,.08),HAZARD);
      r.draw(m.cone,compose(x,.54,zz,0,0,0,.43,.88,.43),STEEL);
      if(d>.55){r.draw(m.cone,compose(x-.28,.39,zz+.06,0,0,-.18,.24,.58,.24),STEEL_HI);r.draw(m.cone,compose(x+.28,.39,zz+.06,0,0,.18,.24,.58,.24),STEEL_HI);}
    }
  };

  P.drawLaser=function(o,z){
    const r=this.renderer,m=this.meshes,safe=o.safeX,leftEnd=safe-1.05,rightStart=safe+1.05,d=detail(this),pulse=.62+.38*Math.sin(this.time*12);
    for(const side of[-1,1]){
      const x=side*5.25;
      shadow(this,x,z,.46,.48,.18);
      r.draw(m.box,compose(x,.10,z,0,0,0,.74,.20,.78),STEEL_DARK);
      r.draw(m.cylinder,compose(x,.76,z,0,0,0,.29,1.42,.29),STEEL_DARK);
      r.draw(m.cylinder,compose(x,1.19,z-.16,Math.PI/2,0,0,.31,.20,.31),STEEL);
      r.draw(m.sphere,compose(x,1.19,z-.37,0,0,0,.20,.20,.20),HOT,.98);
      if(d>.55)r.draw(m.sphere,compose(x,1.19,z-.43,0,0,0,.34,.34,.13),[1,.10,.06],.20+.18*pulse);
    }
    const beam=(x,w)=>{if(w<=0)return;r.draw(m.box,compose(x,.72,z,0,0,0,w,.065,.065),[1,.055,.08],.98);r.draw(m.box,compose(x,.72,z+.01,0,0,0,w,.16,.14),[1,.12,.12],.15+.10*pulse);};
    if(leftEnd>-5.05)beam((-5.05+leftEnd)/2,leftEnd+5.05);
    if(rightStart<5.05)beam((rightStart+5.05)/2,5.05-rightStart);
    this.addWorldLabel([safe,1.84,z],'БЕЗОПАСНО','good');
  };

  P.drawBarrier=function(o,z){
    const r=this.renderer,m=this.meshes,d=detail(this);
    for(let i=0;i<o.poleXs.length;i++){
      const x=o.poleXs[i],h=.74+(i%2)*.24;
      shadow(this,x,z,.55,.43,.14);
      r.draw(m.box,compose(x,.07,z,0,0,0,1.08,.14,.72),RUBBER);
      r.draw(m.cylinder,compose(x-.34,.19,z+.22,Math.PI/2,0,0,.16,.14,.16),RUBBER);
      r.draw(m.cylinder,compose(x+.34,.19,z+.22,Math.PI/2,0,0,.16,.14,.16),RUBBER);
      r.draw(m.box,compose(x,h*.5+.16,z,0,0,0,.94,h,.50),i%2?mix(HAZARD,STEEL_DARK,.15):mix(WARNING,STEEL_DARK,.10));
      r.draw(m.box,compose(x,h*.67+.16,z-.27,0,0,i%2?.16:-.16,.78,.14,.07),STEEL_HI);
      if(d>.6){r.draw(m.cylinder,compose(x-.34,h+.20,z,0,0,0,.055,.20,.055),STEEL);r.draw(m.cylinder,compose(x+.34,h+.20,z,0,0,0,.055,.20,.055),STEEL);}
    }
  };

  P.drawSpinner=function(o,z){
    const a=this.time*o.speed+o.phase,r=this.renderer,m=this.meshes,d=detail(this);
    shadow(this,0,z,1.15,.75,.18);
    r.draw(m.cylinder,compose(0,.06,z,0,0,0,1.12,.12,1.12),RUBBER);
    r.draw(m.cylinder,compose(0,.28,z,0,0,0,.70,.44,.70),STEEL_DARK);
    r.draw(m.cylinder,compose(0,.52,z,0,0,a,.36,.28,.36),STEEL_HI);
    for(const [rot,len] of[[a,8.05],[a+Math.PI/2,6.0]]){
      r.draw(m.box,compose(0,.50,z,0,rot,0,len,.18,.42),STEEL);
      r.draw(m.box,compose(0,.57,z-.22,0,rot,0,len*.92,.065,.07),WARNING);
      if(d>.55)for(let t=-len*.42;t<=len*.42;t+=1.35)r.draw(m.box,compose(Math.cos(rot)*t,.50,z-Math.sin(rot)*t,0,rot,0,.20,.24,.52),HAZARD);
    }
    r.draw(m.cylinder,compose(0,.66,z,0,0,a,.48,.22,.48),STEEL_HI);
    r.draw(m.sphere,compose(0,.72,z,0,0,0,.15,.15,.15),WARNING);
  };

  P.drawPusher=function(o,z){
    const a=this.time*o.speed+o.phase,reach=.65+(Math.sin(a)*.5+.5)*2.55,sideX=o.side*5.62,inner=o.side<0?-5.62+reach:5.62-reach,mid=(sideX+inner)/2,len=Math.abs(sideX-inner),r=this.renderer,m=this.meshes;
    shadow(this,sideX,z,.72,.62,.16);
    r.draw(m.box,compose(sideX,.10,z,0,0,0,.82,.20,1.12),STEEL_DARK);
    r.draw(m.box,compose(sideX,.80,z,0,0,0,.72,1.52,.88),STEEL_DARK);
    r.draw(m.cylinder,compose(mid,.62,z,0,0,Math.PI/2,.18,len,.18),STEEL_HI);
    r.draw(m.cylinder,compose(mid,.62,z+.04,0,0,Math.PI/2,.10,len*.92,.10),[.82,.85,.88]);
    r.draw(m.box,compose(inner,.64,z,0,0,0,.92,1.22,.96),STEEL_DARK);
    r.draw(m.box,compose(inner-o.side*.48,.64,z-.50,0,0,0,.14,1.00,.08),WARNING);
    for(let j=-1;j<=1;j++)r.draw(m.cone,compose(inner-o.side*.59,.64+j*.34,z,0,0,o.side<0?Math.PI/2:-Math.PI/2,.27,.48,.27),STEEL);
  };

  P.drawSlalom=function(o,z){
    const r=this.renderer,m=this.meshes,safe=o.safeX,left=safe-1.08,right=safe+1.08;
    const slab=(x,w,side)=>{if(w<=0)return;shadow(this,x,z,w*.52,.58,.12);r.draw(m.box,compose(x,.42,z,0,0,0,w,.84,.76),STEEL_DARK);for(let sx=-w*.42;sx<=w*.42;sx+=.92)r.draw(m.box,compose(x+sx,.44,z-.40,0,0,side*.12,.48,.14,.06),Math.round(sx*10)%2?HAZARD:STEEL_HI);};
    if(left>-5){const w=left+5;slab(-5+w/2,w,-1);}
    if(right<5){const w=5-right;slab(right+w/2,w,1);}
    for(const x of[-4.7,-2.35,0,2.35,4.7])if(Math.abs(x-safe)>1.25){r.draw(m.cylinder,compose(x,.18,z-.18,0,0,0,.22,.36,.22),RUBBER);r.draw(m.cone,compose(x,.72,z-.18,0,0,0,.28,.92,.28),HAZARD);r.draw(m.box,compose(x,.57,z-.47,0,0,0,.30,.10,.05),STEEL_HI);}
    this.addWorldLabel([safe,1.82,z],'КОРИДОР','good');
  };

  P.drawShockwave=function(o,z){
    const a=this.time*o.speed+o.phase,active=Math.sin(a)>.06,r=this.renderer,m=this.meshes,safe=o.safeX,g=1.05,left=safe-g,right=safe+g,pulse=.5+.5*Math.sin(a*2);
    shadow(this,0,z,5.2,.78,.10);
    for(const side of[-1,1]){
      const x=side*5.16;r.draw(m.cylinder,compose(x,.18,z,0,0,0,.48,.32,.48),STEEL_DARK);r.draw(m.cylinder,compose(x,.36,z,0,0,0,.28,.28,.28),STEEL);r.draw(m.sphere,compose(x,.56,z,0,0,0,.16,.16,.16),active?HOT:HAZARD,.90);
    }
    const plate=(x,w)=>{if(w<=0)return;r.draw(m.box,compose(x,.055,z,0,0,0,w,.10,1.08),STEEL_DARK);r.draw(m.box,compose(x,.105,z,0,0,0,w,.055,.86),active?HOT:HAZARD,active?.78:.34);};
    if(left>-5.15)plate((-5.15+left)/2,left+5.15);
    if(right<5.15)plate((right+5.15)/2,5.15-right);
    if(active){for(let k=0;k<3;k++)r.draw(m.cylinder,compose(0,.08+k*.015,z,0,0,0,4.5-k*.72,.018,1.02-k*.14),[1,.26,.06],.13+.08*pulse);}
    this.addWorldLabel([safe,.95,z],active?'ВОЛНА!':'ГОТОВЬСЯ','bad');
  };

  // --- Road and environment detail ---
  const oldEnvironment=P.drawEnvironment;
  P.drawEnvironment=function(){
    oldEnvironment.call(this);
    const r=this.renderer,m=this.meshes,p=this.biome?.palette||{},d=detail(this),span=310,wrap=v=>((v%span)+span)%span;
    // subtle asphalt wear and tyre marks
    r.draw(m.box,compose(-1.45,.014,-132,0,0,0,.13,.018,316),[.16,.17,.19],.16);
    r.draw(m.box,compose(1.45,.014,-132,0,0,0,.13,.018,316),[.16,.17,.19],.16);
    const cracks=d>.55?14:7;
    for(let i=0;i<cracks;i++){
      const z=9-wrap(i*(294/cracks)+hash(i*7.7)*8-this.travel*.995,span),x=(hash(i*3.2)-.5)*8.4,rot=(hash(i*5.4)-.5)*.52,len=.55+hash(i*9.1)*1.35;
      r.draw(m.box,compose(x,.034,z,0,rot,0,.035,.018,len),[.095,.10,.11],.50);
      if(d>.75&&i%3===0)r.draw(m.box,compose(x+.14,.033,z+.18,0,rot+.7,0,.025,.017,len*.42),[.095,.10,.11],.38);
    }
    // reflective lane/edge studs
    const studs=d>.45?26:14;
    for(let i=0;i<studs;i++){
      const z=7-wrap(i*(300/studs)-this.travel,span),blink=.80+.20*Math.sin(this.time*2+i);
      r.draw(m.sphere,compose(0,.055,z,0,0,0,.045,.025,.065),p.stripe||COLORS.white,.55*blink);
      if(i%2===0){for(const x of[-5.72,5.72])r.draw(m.sphere,compose(x,.055,z,0,0,0,.052,.030,.072),p.roadEdge||COLORS.white,.62*blink);}
    }
    // shoulder clutter: rocks, cones, signs, discarded blocks - safely outside the road
    const roadside=d>.70?12:d>.35?7:4;
    for(let i=0;i<roadside;i++){
      const z=5-wrap(i*(292/roadside)+hash(i*13.2)*9-this.travel*.97,span),side=i%2?-1:1,x=side*(7.35+hash(i*2.8)*2.1),kind=i%4;
      if(kind===0){r.draw(m.box,compose(x,.36,z,0,hash(i)*.5,0,.46,.65,.42),mix(p.ground||[.5,.4,.3],STEEL_DARK,.22));}
      else if(kind===1){r.draw(m.cone,compose(x,.46,z,0,0,0,.25,.75,.25),HAZARD);r.draw(m.cylinder,compose(x,.08,z,0,0,0,.34,.08,.34),RUBBER);}
      else if(kind===2){r.draw(m.cylinder,compose(x,.72,z,0,0,0,.055,1.36,.055),STEEL);r.draw(m.box,compose(x,1.18,z,0,0,side*.08,.50,.42,.07),i%3?HAZARD:WARNING);}
      else{r.draw(m.box,compose(x,.14,z,0,hash(i)*.7,0,.58,.25,.34),RUBBER);r.draw(m.cylinder,compose(x-.18,.13,z+.20,Math.PI/2,0,0,.12,.10,.12),STEEL_DARK);}
    }
  };

  // --- Ambient FX near live hazards + speed dust ---
  const oldUpdate=P.update;
  P.update=function(dt){
    oldUpdate.call(this,dt);
    if(!this.v6Particles||this.state==='menu'||this.state==='failed'||this.state==='complete')return;
    this.__v28FxClock=(this.__v28FxClock||0)-dt;
    if(this.__v28FxClock>0)return;
    this.__v28FxClock=detail(this)>.65?.075:.13;
    const objs=this.objects||[],near=[];
    for(const o of objs){if(o.processed||o.type!=='obstacle')continue;const z=this.objectZ?.(o);if(z==null||z<this.playerZ-19||z>this.playerZ+5)continue;near.push([o,z]);if(near.length>=2)break;}
    for(const [o,z] of near){
      let color=null,x=0,y=.30,kind='spark';
      if(o.kind==='saw'){const a=this.time*o.speed+o.phase;x=o.baseX+Math.sin(a)*o.range;color=[1,.68,.24];y=.48;}
      else if(o.kind==='bladePair'){const a=this.time*o.speed+o.phase;x=-2.65+Math.sin(a)*o.range;color=[1,.66,.20];y=.50;}
      else if(o.kind==='laser'){x=(Math.random()>.5?-1:1)*5.1;color=[1,.12,.08];y=1.15;kind='laser';}
      else if(o.kind==='fireline'){x=-4+Math.random()*8;color=[1,.42,.08];y=.22;}
      else if(o.kind==='shockwave'){x=o.safeX+(Math.random()-.5)*7;color=[1,.30,.08];y=.12;}
      if(!color)continue;
      addParticle(this,{kind,x,y,z:z+(Math.random()-.5)*.25,vx:(Math.random()-.5)*1.6,vy:.7+Math.random()*1.8,vz:(Math.random()-.5)*.7,life:.20+Math.random()*.25,max:.45,size:.045+Math.random()*.06,color,gravity:kind==='laser'?0:4.4});
    }
    if((this.state==='running'||this.state==='intro')&&this.speed>0&&Math.random()<.70){
      const ground=this.biome?.palette?.ground||[.62,.52,.40],c=mix(ground,[.82,.80,.74],.48);
      addParticle(this,{kind:'dust',x:this.playerX+(Math.random()-.5)*1.8,y:.035,z:this.playerZ+1.7+Math.random()*1.9,vx:(Math.random()-.5)*.35,vy:.18+Math.random()*.38,vz:.8+Math.random()*1.2,life:.34,max:.34,size:.10+Math.random()*.14,color:c,gravity:.65});
    }
  };

  // Every dangerous obstacle gets a grounded shadow, making it feel less like it floats.
  const oldObstacle=P.drawObstacle;
  P.drawObstacle=function(o,z){
    oldObstacle.call(this,o,z);
    const sizes={saw:[1.25,.62],bladePair:[4.7,.75],hammer:[4.9,.70],roller:[4.8,.76],crusher:[5.0,.70],pendulum:[4.8,.82],laser:[5.1,.62],movingWall:[5.1,.74],fallingBlock:[4.8,.82],fireline:[5.0,.72],slamGate:[5.1,.78],slalom:[5.0,.72],shockwave:[5.0,.78],spinner:[4.3,.82],pusher:[3.6,.72],barrier:[4.4,.62],spikes:[4.5,.62],mines:[4.7,.60]};
    const q=sizes[o.kind];if(q)shadow(this,0,z,q[0],q[1],.075);
  };

  // World-label fade: readable only when the physical object is already visually present.
  const oldLabel=P.addWorldLabel;
  P.addWorldLabel=function(pos,text,type){
    const before=this.labelCursor||0;oldLabel.call(this,pos,text,type);if((this.labelCursor||0)<=before)return;
    const e=this.labels[this.labelCursor-1],mobile=this.w/this.h<.72,start=mobile?-34:-42,end=mobile?-17:-22,t=clamp((pos[2]-start)/(end-start),0,1);
    e.style.opacity=String(.20+.80*t);
    e.style.filter=`drop-shadow(0 3px 4px rgba(12,16,26,${(.12+.24*t).toFixed(2)}))`;
    e.style.transform=`translate(-50%,-50%) scale(${(.90+.10*t).toFixed(3)})`;
  };

  window.SleepRoadVisualPolishV28={STEEL,STEEL_DARK,HAZARD,WARNING};
})();