'use strict';
(() => {
  const S=window.SleepRoadSystems,Q=window.SleepRoadQualityV6,C=S&&S.CrowdBatch&&S.CrowdBatch.prototype;
  if(!S||!Q||!C)throw new Error('Sleep Road Ruby character dependencies are missing');
  const {compose,clamp}=S,oldDraw=C.draw,MODEL_SCALE=.90,RENDER_CAP={high:150,medium:110,low:80};
  const SKINS=[[.78,.48,.32],[.60,.34,.23],[.90,.58,.40],[.46,.27,.19],[.72,.41,.27],[.86,.52,.34]];
  const PLAYER=[[.18,.62,.98],[.08,.72,.90],[.34,.48,.96],[.18,.78,.74],[.48,.46,.96]],ENEMY=[[.94,.18,.25],[1,.30,.13],[.72,.08,.18],[.92,.24,.37]];
  const hash=n=>{const x=Math.sin(n*91.733+17.137)*43758.5453;return x-Math.floor(x);};
  const mix=(a,b,t)=>a.map((v,i)=>v+(b[i]-v)*t);
  const flatten=list=>{const out=new Float32Array(list.length*16);for(let i=0;i<list.length;i++)out.set(list[i],i*16);return out;};
  const bytes=b64=>{const raw=atob(b64),out=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)out[i]=raw.charCodeAt(i)&255;return out;};
  const u16=b64=>{const b=bytes(b64);if(b.byteLength%2)throw new Error('Ruby uint16 alignment');const v=new DataView(b.buffer,b.byteOffset,b.byteLength),out=new Uint16Array(b.byteLength>>1);for(let i=0;i<out.length;i++)out[i]=v.getUint16(i*2,true);return out;};

  function build(batch){
    if(batch.__rubyMeshes)return batch.__rubyMeshes;
    const model=window.SleepRoadRubyCharacter;if(!model?.meta||!model.p||model.groups?.length!==2)return null;
    const count=model.meta.runtimeVerts|0,q=u16(model.p);if(q.length!==count*3)throw new Error('Ruby position size');
    const p=new Float32Array(count*3),lo=model.lo,hi=model.hi;
    for(let i=0;i<count;i++)for(let a=0;a<3;a++)p[i*3+a]=lo[a]+q[i*3+a]/65535*(hi[a]-lo[a]);
    const groups=model.groups.map(g=>{const ind=u16(g.i);if(ind.length!==(g.tris|0)*3)throw new Error('Ruby index size');for(const x of ind)if(x>=count)throw new Error('Ruby index range');return{g,ind};});
    const n=new Float32Array(p.length);
    for(const {ind} of groups)for(let k=0;k<ind.length;k+=3){const ia=ind[k]*3,ib=ind[k+1]*3,ic=ind[k+2]*3,abx=p[ib]-p[ia],aby=p[ib+1]-p[ia+1],abz=p[ib+2]-p[ia+2],acx=p[ic]-p[ia],acy=p[ic+1]-p[ia+1],acz=p[ic+2]-p[ia+2],nx=aby*acz-abz*acy,ny=abz*acx-abx*acz,nz=abx*acy-aby*acx;for(const o of[ia,ib,ic]){n[o]+=nx;n[o+1]+=ny;n[o+2]+=nz;}}
    for(let i=0;i<count;i++){const o=i*3,l=Math.hypot(n[o],n[o+1],n[o+2])||1;n[o]/=l;n[o+1]/=l;n[o+2]/=l;}
    batch.__rubyMeshes=groups.map(({g,ind})=>({role:/Clothes/i.test(g.name)?'clothes':'skin',mesh:batch.r.createMesh({positions:p,normals:n,indices:ind})}));return batch.__rubyMeshes;
  }
  function choose(batch,count,cap){const full=batch.formation(count);if(full.length<=cap)return{full,draw:full};const draw=[];for(let i=0;i<cap;i++)draw.push(full[Math.round(i*(full.length-1)/(cap-1))]);return{full,draw};}
  function pose(m,time,index,enemy){const mode=m.mode||'run',speed=clamp(m.runSpeed??1,.42,1.7),st=clamp(m.strafe||0,-1,1),w=Math.sin(time*(6+speed*1.75)+index*.57),amt=mode==='idle'?.18:mode==='finish'?.48:mode==='battle'?.34:1;let pitch=.035*amt+Math.max(0,speed-1)*.07,roll=-st*.09,yaw=st*.035,y=Math.abs(w)*.035*amt;if(mode==='idle'){pitch=0;roll=Math.sin(time*1.45+index*.13)*.014;y=Math.sin(time*2+index*.21)*.012;}if(mode==='jump'){pitch=-(m.jumpVertical||0)*.12-.035;y=clamp(m.jumpAir||0,0,1)*.025;}if(mode==='battle'){const hit=Math.max(0,Math.sin(time*10.5+index*.41));pitch=.10+hit*.10;roll=Math.sin(time*10.5+index*.41)*.045;y=hit*.022;}if(mode==='finish'){const cheer=clamp(((m.finishProgress||0)-.34)/.45,0,1),q=Math.sin(time*8+index*.45);pitch=-.015;roll=q*.04*cheer;y=Math.abs(q)*.12*cheer;}if(!enemy&&m.reaction){const p=clamp(m.reactionPower||0,0,1),q=Math.sin(time*8+index*.43);if(m.reaction==='cheer'){y+=Math.abs(q)*.11*p;roll+=q*.045*p;}else if(m.reaction==='fear')pitch-=.10*p;else if(m.reaction==='recoil')pitch-=.22*p;}if(m.bossAttackActive){const p=((m.bossAttackPhase||0)%1+1)%1,hit=Math.sin(Math.PI*clamp(p/.62,0,1)),side=(m.bossAttackSide||1)<0?-1:1;pitch+=hit*.20;roll+=side*hit*.10;y+=Math.sin(Math.PI*p)*.05;}return{pitch,roll,yaw,y};}

  C.draw=function(count,rootX,rootZ,color,time,opts={}){
    let meshes;try{meshes=build(this);}catch(err){console.error('Ruby character fallback:',err);return oldDraw.call(this,count,rootX,rootZ,color,time,opts);}if(!meshes)return oldDraw.call(this,count,rootX,rootZ,color,time,opts);
    const game=window.__sleepRoad,q=game?Q.preset(game):Q.PRESETS.high,logical=Math.min(Math.max(1,Math.round(count)),q.maxCrowd||420),sel=choose(this,logical,Math.min(logical,RENDER_CAP[q.id]||110)),f=sel.draw,full=sel.full,scale0=opts.scale||1,direction=opts.direction||1,enemy=opts.enemy===true,m=(enemy?this.enemyMotion:this.playerMotion)||opts.motion||{},baseY=(m.jumpY!=null&&!enemy?m.jumpY:(opts.baseY||0)),groundY=opts.groundY==null?.012:opts.groundY,boss=m.boss===true,metrics=this.metrics(logical),mat=[],skins=[],cloth=[],bossTone=boss&&game?.v11?.bossColor?game.v11.bossColor:null,shirts=enemy?(bossTone?[bossTone,mix(bossTone,[.15,.05,.08],.18),mix(bossTone,[1,.36,.12],.12)]:ENEMY):(this.skinPalette?.shirts||PLAYER);
    for(const qf of f){const row=Math.floor(qf.index/Math.max(1,metrics.cols)),ps=pose(m,time+row*.012,qf.index,enemy),jx=enemy?0:(hash(qf.index*13.17)-.5)*.12,jz=enemy?0:(hash(qf.index*7.91+3.2)-.5)*.09,follow=(m.strafe||0)*clamp(qf.z/Math.max(1,metrics.depth),0,1),sway=enemy?0:Math.sin(time*1.25+row*.23+qf.index*.09)*.03,x=rootX+(qf.x+jx-follow*.55+sway)*scale0,z=rootZ+(qf.z+jz)*direction*scale0,variant=.96+hash(qf.index*5.71)*.08,s=scale0*MODEL_SCALE*variant,turn=direction<0?0:Math.PI;mat.push(compose(x,baseY+ps.y,z,ps.pitch,turn+ps.yaw,ps.roll,s,s,s));const sk=SKINS[(qf.index*3)%SKINS.length],cl=shirts[(qf.index*7)%shirts.length];skins.push(...sk);cloth.push(...cl);}
    const fm=flatten(mat),sa=new Float32Array(skins),ca=new Float32Array(cloth),width=Math.min(5.15,((metrics.cols-1)*metrics.spacing*.54+.78)*scale0),depth=Math.max(.78,(metrics.depth*.50+.72)*scale0),cz=rootZ+metrics.depth*direction*scale0*.47;this.r.draw(this.meshes.cylinder,compose(rootX,groundY-.006,cz,0,0,0,width,.010,depth),[.055,.065,.085],.12);for(const part of meshes)this.r.drawInstances(part.mesh,fm,part.role==='clothes'?ca:sa,f.length);return full;
  };
  window.SleepRoadRubyV15={MODEL_SCALE,RENDER_CAP,build};
})();
