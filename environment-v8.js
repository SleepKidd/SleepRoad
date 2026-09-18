'use strict';
(() => {
  const S=window.SleepRoadSystems,Q=window.SleepRoadQualityV6,P=window.SleepRoad3D&&window.SleepRoad3D.prototype;
  if(!S||!Q||!P)throw new Error('Sleep Road Environment v8 dependencies are missing');
  const {compose,COLORS,clamp}=S;
  const TAU=Math.PI*2;
  const hash=n=>{const x=Math.sin(n*127.1+311.7)*43758.5453123;return x-Math.floor(x);};
  const mix=(a,b,t)=>a.map((v,i)=>v+(b[i]-v)*t);
  const scale=(a,k)=>a.map(v=>clamp(v*k,0,1));
  const envCfg=g=>{
    const q=Q.preset(g),density=q.environmentDensity??(q.id==='high'?1:q.id==='medium'?.70:.43);
    return{density,shadows:q.environmentShadows!==false,detail:q.id==='high'?2:q.id==='medium'?1:0};
  };
  const wrap=(v,span=300)=>((v%span)+span)%span;

  function shadow(g,x,z,sx,sz,alpha=.17){
    const c=envCfg(g);if(!c.shadows)return;
    g.renderer.draw(g.meshes.cylinder,compose(x,-.245,z,0,0,0,sx,.018,sz),[.08,.13,.10],alpha);
  }
  function patch(g,x,z,sx,sz,color,rot=0,alpha=.9){
    g.renderer.draw(g.meshes.box,compose(x,-.252,z,0,rot,0,sx,.026,sz),color,alpha);
  }
  function grassTuft(g,x,z,s=1,tone=0,phase=0){
    const r=g.renderer,m=g.meshes,p=g.biome.palette,wind=Math.sin(g.time*1.65+phase+x*.17+z*.025)*.10,colors=[
      mix(p.groundDark,p.ground,.34),mix(p.groundDark,p.good,.18),scale(p.ground,1.06),mix(p.ground,p.stripe,.08)
    ],c=colors[tone%colors.length];
    for(let j=0;j<3;j++){
      const dx=(j-1)*.12*s,rz=wind+(j-1)*.07;
      r.draw(m.cone,compose(x+dx,-.27+.26*s,z+(j%2)*.08,0,0,rz,.14*s,.52*s,.14*s),c,.96);
    }
  }
  function flower(g,x,z,s=1,tone=0){
    const r=g.renderer,m=g.meshes,p=g.biome.palette,colors=[[1,.86,.28],[.98,.47,.70],[.76,.62,1],[1,.96,.82]],c=colors[tone%colors.length];
    r.draw(m.cylinder,compose(x,-.105,z,0,0,0,.035*s,.35*s,.035*s),mix(p.groundDark,p.good,.25));
    r.draw(m.sphere,compose(x,.10+s*.02,z,0,0,0,.13*s,.08*s,.13*s),c);
  }
  function rock(g,x,z,s=1,tone=0){
    const c=tone%2?[.45,.48,.45]:[.55,.55,.50];shadow(g,x,z,.55*s,.33*s,.10);
    g.renderer.draw(g.meshes.sphere,compose(x,-.27+.21*s,z,0,hash(x+z)*TAU,0,.70*s,.42*s,.56*s),c);
  }

  function decodeModelBytes(b64){
    const raw=atob(b64),out=new Uint8Array(raw.length);
    for(let i=0;i<raw.length;i++)out[i]=raw.charCodeAt(i)&255;
    return out;
  }
  function decodeModelU16(b64){
    const bytes=decodeModelBytes(b64),view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),out=new Uint16Array(bytes.byteLength>>1);
    for(let i=0;i<out.length;i++)out[i]=view.getUint16(i*2,true);
    return out;
  }
  function buildDecorCarMeshes(g){
    if(g.__decorCarMeshes)return g.__decorCarMeshes;
    const model=window.SleepRoadDecorCarModel;
    if(!model?.meta||!model.p||!model.i||!model.groups?.length)return[];
    const q=decodeModelU16(model.p),src=decodeModelU16(model.i),half=model.meta.halfVerts|0,total=half*2,lo=model.lo,hi=model.hi,positions=new Float32Array(total*3);
    if(q.length!==half*3)throw new Error('Invalid SuperSport car position buffer');
    for(let i=0;i<half;i++){
      const x=lo[0]+q[i*3]/65535*(hi[0]-lo[0]),y=lo[1]+q[i*3+1]/65535*(hi[1]-lo[1]),z=lo[2]+q[i*3+2]/65535*(hi[2]-lo[2]);
      positions[i*3]=x;positions[i*3+1]=y;positions[i*3+2]=z;
      const j=half+i;positions[j*3]=-x;positions[j*3+1]=y;positions[j*3+2]=z;
    }
    const groups=model.groups.map(group=>{
      const base=group.offset|0,count=(group.tris|0)*3,indices=new Uint16Array(count*2);
      for(let k=0;k<count;k++)indices[k]=src[base+k];
      for(let t=0;t<group.tris;t++){
        const a=src[base+t*3],b=src[base+t*3+1],c=src[base+t*3+2],o=count+t*3;
        indices[o]=half+a;indices[o+1]=half+c;indices[o+2]=half+b;
      }
      return{indices,color:group.color,tris:group.tris*2,name:group.name};
    });
    const normals=new Float32Array(positions.length);
    for(const group of groups){
      const ii=group.indices;
      for(let k=0;k<ii.length;k+=3){
        const ia=ii[k]*3,ib=ii[k+1]*3,ic=ii[k+2]*3;
        const abx=positions[ib]-positions[ia],aby=positions[ib+1]-positions[ia+1],abz=positions[ib+2]-positions[ia+2];
        const acx=positions[ic]-positions[ia],acy=positions[ic+1]-positions[ia+1],acz=positions[ic+2]-positions[ia+2];
        const nx=aby*acz-abz*acy,ny=abz*acx-abx*acz,nz=abx*acy-aby*acx;
        for(const i of[ia,ib,ic]){normals[i]+=nx;normals[i+1]+=ny;normals[i+2]+=nz;}
      }
    }
    for(let i=0;i<total;i++){const o=i*3,l=Math.hypot(normals[o],normals[o+1],normals[o+2])||1;normals[o]/=l;normals[o+1]/=l;normals[o+2]/=l;}
    g.__decorCarMeshes=groups.map(group=>({mesh:g.renderer.createMesh({positions,normals,indices:group.indices}),color:group.color,name:group.name,tris:group.tris}));
    return g.__decorCarMeshes;
  }
  function decodeDeltaIndices(b64,expected){
    const bytes=decodeModelBytes(b64),out=new Uint16Array(expected);let p=0,prev=0;
    for(let i=0;i<expected;i++){
      let shift=0,value=0,b;
      do{if(p>=bytes.length)throw new Error('Truncated SuperSport wheel index stream');b=bytes[p++];value|=(b&127)<<shift;shift+=7;}while(b&128);
      const delta=(value>>>1)^-(value&1);prev+=delta;
      if(prev<0||prev>65535)throw new Error('Invalid SuperSport wheel index');
      out[i]=prev;
    }
    if(p!==bytes.length)throw new Error('Unexpected SuperSport wheel index data');
    return out;
  }
  function buildDecorWheelMeshes(g){
    if(g.__decorWheelMeshes)return g.__decorWheelMeshes;
    const model=window.__SleepRoadDecorWheelModel;
    if(!model?.meta||!model.p||!model.groups?.length)return[];
    const q=decodeModelU16(model.p),lo=model.bounds.min,hi=model.bounds.max,total=model.meta.verts|0,positions=new Float32Array(total*3);
    if(q.length!==total*3)throw new Error('Invalid SuperSport wheel position buffer');
    for(let i=0;i<q.length;i++){const axis=i%3;positions[i]=lo[axis]+q[i]/65535*(hi[axis]-lo[axis]);}
    const decoded=model.groups.map(group=>({group,indices:decodeDeltaIndices(group.di,(group.tris|0)*3)}));
    const normals=new Float32Array(positions.length);
    for(const entry of decoded){
      const ii=entry.indices;
      for(let k=0;k<ii.length;k+=3){
        const ia=ii[k]*3,ib=ii[k+1]*3,ic=ii[k+2]*3;
        const abx=positions[ib]-positions[ia],aby=positions[ib+1]-positions[ia+1],abz=positions[ib+2]-positions[ia+2];
        const acx=positions[ic]-positions[ia],acy=positions[ic+1]-positions[ia+1],acz=positions[ic+2]-positions[ia+2];
        const nx=aby*acz-abz*acy,ny=abz*acx-abx*acz,nz=abx*acy-aby*acx;
        for(const o of[ia,ib,ic]){normals[o]+=nx;normals[o+1]+=ny;normals[o+2]+=nz;}
      }
    }
    for(let i=0;i<total;i++){const o=i*3,len=Math.hypot(normals[o],normals[o+1],normals[o+2])||1;normals[o]/=len;normals[o+1]/=len;normals[o+2]/=len;}
    g.__decorWheelMeshes=decoded.map(({group,indices})=>({mesh:g.renderer.createMesh({positions,normals,indices}),color:group.color,alpha:group.alpha??1,tris:group.tris,name:group.name}));
    return g.__decorWheelMeshes;
  }
  function drawDecorCar(g,x,z,index=0,opts={}){
    const r=g.renderer,body=buildDecorCarMeshes(g),wheels=buildDecorWheelMeshes(g),wheelModel=window.__SleepRoadDecorWheelModel;
    if(!body.length)return;
    const side=x<0?-1:1,scale=opts.scale??.42,y=opts.groundY??-.205,yaw=opts.yaw??(side<0?.035:-.035);
    if(opts.shadow!==false)shadow(g,x,z,1.28*scale/.42,.78*scale/.42,.16);
    const model=compose(x,y,z,0,yaw,0,scale,scale,scale);
    for(const part of body)r.draw(part.mesh,model,part.color,1);
    if(wheels.length&&wheelModel?.meta?.wheelPlacements){
      const ws=wheelModel.meta.wheelScale||1,c=Math.cos(yaw),sn=Math.sin(yaw);
      for(const p of wheelModel.meta.wheelPlacements){
        const ox=(p[0]*c+p[2]*sn)*scale,oz=(-p[0]*sn+p[2]*c)*scale,wy=y+p[1]*scale;
        const wm=compose(x+ox,wy,z+oz,0,yaw,0,scale*ws,scale*ws,scale*ws);
        for(const part of wheels)r.draw(part.mesh,wm,part.color,part.alpha);
      }
    }
  }
  function bush(g,x,z,s=1,tone=0){
    const r=g.renderer,m=g.meshes,p=g.biome.palette,c1=tone%2?mix(p.groundDark,p.good,.17):mix(p.groundDark,p.ground,.35),c2=scale(c1,1.10),w=Math.sin(g.time*1.35+x*.1+z*.03)*.035;
    shadow(g,x,z,.82*s,.52*s,.13);
    r.draw(m.sphere,compose(x,-.27+.26*s,z,0,0,w,.88*s,.52*s,.72*s),c1);
    r.draw(m.sphere,compose(x-.48*s,-.27+.22*s,z+.08*s,0,0,-w,.52*s,.44*s,.48*s),c2);
    r.draw(m.sphere,compose(x+.46*s,-.27+.24*s,z-.06*s,0,0,w,.58*s,.48*s,.52*s),c2);
  }
  function tree(g,x,z,s=1,variant=0,tone=0){
    const r=g.renderer,m=g.meshes,p=g.biome.palette,wind=Math.sin(g.time*.72+variant*1.7+x*.04+z*.015)*.035,leafA=tone%2?mix(p.groundDark,p.good,.23):mix(p.groundDark,p.ground,.31),leafB=scale(leafA,1.13),leafC=mix(leafA,p.stripe,.09),trunk=tone%2?[.34,.22,.12]:[.29,.19,.11],far=z<-66||Math.abs(x)>25;
    if(!far)shadow(g,x,z,1.15*s,.66*s,.18);
    const trunkH=(variant===1?2.7:variant===3?1.65:2.15)*s;
    r.draw(m.cylinder,compose(x,-.23+trunkH*.48,z,0,0,wind*.35,(far?.19:.24)*s,trunkH,(far?.19:.24)*s),trunk);
    if(far){
      if(variant===1)r.draw(m.cone,compose(x,1.40*s,z,0,0,wind,1.30*s,2.35*s,1.30*s),leafA);
      else r.draw(m.sphere,compose(x,1.05*s,z,0,0,wind,1.25*s,.92*s,1.10*s),leafA);
      return;
    }
    if(variant===0){
      r.draw(m.sphere,compose(x,.85*s,z,0,0,wind,1.25*s,1.08*s,1.15*s),leafA);
      r.draw(m.sphere,compose(x-.55*s,1.18*s,z+.03*s,0,0,-wind,.82*s,.72*s,.78*s),leafB);
      r.draw(m.sphere,compose(x+.55*s,1.12*s,z-.08*s,0,0,wind,.86*s,.75*s,.80*s),leafC);
    }else if(variant===1){
      r.draw(m.cone,compose(x,1.25*s,z,0,0,wind,1.55*s,2.75*s,1.55*s),leafA);
      r.draw(m.cone,compose(x,2.02*s,z,0,0,-wind,1.17*s,2.05*s,1.17*s),leafB);
    }else if(variant===2){
      r.draw(m.sphere,compose(x,1.00*s,z,0,0,wind,1.65*s,.80*s,1.30*s),leafA);
      r.draw(m.sphere,compose(x-.74*s,1.22*s,z,0,0,-wind,.88*s,.72*s,.82*s),leafB);
      r.draw(m.sphere,compose(x+.74*s,1.20*s,z,0,0,wind,.92*s,.70*s,.84*s),leafC);
    }else if(variant===3){
      r.draw(m.sphere,compose(x,.74*s,z,0,0,wind,.92*s,.96*s,.88*s),leafB);
      r.draw(m.sphere,compose(x,.01*s,1.25*s,z,0,0,-wind,.70*s,.70*s,.66*s),leafC);
    }else{
      r.draw(m.sphere,compose(x-.40*s,1.02*s,z,0,0,wind,1.00*s,.88*s,.82*s),leafA);
      r.draw(m.sphere,compose(x+.48*s,1.07*s,z,0,0,-wind,1.08*s,.91*s,.88*s),leafB);
      r.draw(m.sphere,compose(x,1.55*s,z,0,0,wind,.82*s,.72*s,.76*s),leafC);
    }
    if(envCfg(g).detail>0&&variant!==1){
      r.draw(m.cylinder,compose(x-.38*s,.52*s,z,0,0,1.00,.09*s,.75*s,.09*s),trunk);
      r.draw(m.cylinder,compose(x+.35*s,.59*s,z,0,0,-1.02,.085*s,.68*s,.085*s),trunk);
    }
  }

  const MEADOW_BOUNDS={roadEdge:6.55,grassOuter:15.6,transitionOuter:23.5,terrainOuter:52,grassLength:246,farTerrainStart:24.5};

  function drawMeadowGround(g,p){
    const r=g.renderer,m=g.meshes,grassZ=-116,grassLength=MEADOW_BOUNDS.grassLength;
    const grassWidth=MEADOW_BOUNDS.grassOuter-MEADOW_BOUNDS.roadEdge;
    const grassCenter=(MEADOW_BOUNDS.grassOuter+MEADOW_BOUNDS.roadEdge)*.5;
    const transitionWidth=MEADOW_BOUNDS.transitionOuter-MEADOW_BOUNDS.grassOuter;
    const transitionCenter=(MEADOW_BOUNDS.transitionOuter+MEADOW_BOUNDS.grassOuter)*.5;
    const outerWidth=MEADOW_BOUNDS.terrainOuter-MEADOW_BOUNDS.transitionOuter;
    const outerCenter=(MEADOW_BOUNDS.terrainOuter+MEADOW_BOUNDS.transitionOuter)*.5;

    const grass=mix(p.ground,p.groundDark,.07);
    const verge=mix(p.ground,p.groundDark,.20);
    const transition=mix(p.groundDark,[.31,.30,.22],.30);
    const forestFloor=mix(p.groundDark,[.20,.22,.17],.48);

    // Bright grass exists only beside the road.
    for(const side of[-1,1]){
      r.draw(m.box,compose(side*grassCenter,-.78,grassZ,0,0,0,grassWidth,1.0,grassLength),grass);
      r.draw(m.box,compose(side*7.34,-.755,grassZ,0,0,0,1.58,.94,grassLength),verge,.98);

      // Transition belt breaks the flat lawn before the background terrain.
      r.draw(m.box,compose(side*transitionCenter,-.86,grassZ,0,0,0,transitionWidth,1.18,grassLength),transition,.99);

      // Wide dark terrain fills the viewport sides so clear sky never appears below the horizon.
      r.draw(m.box,compose(side*outerCenter,-1.10,grassZ,0,0,0,outerWidth,1.55,grassLength),forestFloor,.99);
    }

    // A few low mounds hide the straight outer boundary without becoming "green walls".
    for(let i=0;i<8;i++){
      const side=i%2?-1:1,x=side*(19.5+(i%4)*7.5),z=-18-(i%4)*42-(i>3?18:0),sx=8+(i%3)*3.5,sy=1.5+(i%2)*.6,sz=11+(i%3)*4;
      r.draw(m.sphere,compose(x,-.85+sy*.24,z,0,0,0,sx,sy,sz),i%2?transition:forestFloor,.98);
    }
  }

  function drawMeadowBackdrop(g,p,cfg){
    const r=g.renderer,m=g.meshes;
    const hillA=mix(p.groundDark,p.sky,.24),hillB=mix(p.groundDark,[.19,.29,.22],.36);
    for(let i=0;i<10;i++){
      const side=i%2?-1:1,x=side*(27+(i%5)*9),z=-88-(i%4)*24,sx=10+(i%3)*4,sy=2.2+(i%3)*.7,sz=12+(i%2)*5;
      r.draw(m.sphere,compose(x,-.8+sy*.30,z,0,0,0,sx,sy,sz),i%2?hillA:hillB,.99);
    }

    const forest=Math.round(14*cfg.density);
    for(let i=0;i<forest;i++){
      const side=i%2?-1:1,x=side*(20.5+hash(i*7.1)*18),z=-58-hash(i*3.9)*86,s=.62+hash(i*8.3)*.95,variant=[0,2,3,4][i%4];
      tree(g,x,z,s,variant,i);
    }

    if(cfg.detail>0){
      const shrubs=Math.round(10*cfg.density);
      for(let i=0;i<shrubs;i++){
        const side=i%2?-1:1,x=side*(16.5+hash(i*5.5)*7),z=-32-hash(i*6.8)*98;
        bush(g,x,z,.65+hash(i*2.4)*.55,i);
      }
    }
  }

  function drawDesertBackdrop(g,p,cfg){
    const r=g.renderer,m=g.meshes;
    for(let i=0;i<8;i++){const side=i%2?-1:1,x=side*(15+(i%4)*7),z=-92-(i%4)*24,s=8+(i%3)*3;r.draw(m.sphere,compose(x,-.4,z,0,0,0,s,1.4,s*.62),i%2?[.69,.48,.24]:[.78,.57,.30]);}
    const count=Math.round(11*cfg.density);for(let i=0;i<count;i++){const side=i%2?-1:1,x=side*(8.5+hash(i*8.2)*16),z=8-wrap(i*25.3-g.travel*.94,310),s=.65+hash(i*4.7)*.8;r.draw(m.cylinder,compose(x,.38*s,z,0,0,0,.20*s,1.25*s,.20*s),[.15,.43,.23]);r.draw(m.cylinder,compose(x+side*.28*s,.55*s,z,0,0,Math.PI/2,.14*s,.52*s,.14*s),[.15,.43,.23]);shadow(g,x,z,.55*s,.34*s,.10);}
  }
  function drawFactoryBackdrop(g,p,cfg){
    const r=g.renderer,m=g.meshes,count=Math.round(10*cfg.density);
    for(let i=0;i<count;i++){const side=i%2?-1:1,x=side*(10+hash(i*7.4)*19),z=5-wrap(i*28.4-g.travel*.955,330),h=3+hash(i*3.3)*5,w=1.7+hash(i*5.1)*2.2;r.draw(m.box,compose(x,h*.5-.22,z,0,0,0,w,h,w),i%2?[.25,.28,.30]:[.34,.35,.36]);if(i%2===0){r.draw(m.cylinder,compose(x+side*(w*.6),h*.78,z-.5,0,0,0,.36,h*1.25,.36),[.20,.22,.24]);r.draw(m.sphere,compose(x+side*(w*.6),h*1.4,z-.5,0,0,0,.40,.18,.40),p.stripe);}shadow(g,x,z,w*.7,w*.5,.12);}
  }
  function drawCityBackdrop(g,p,cfg){
    const r=g.renderer,m=g.meshes,count=Math.round(13*cfg.density);
    for(let i=0;i<count;i++){const side=i%2?-1:1,x=side*(10+hash(i*6.6)*22),z=4-wrap(i*23.5-g.travel*.965,320),h=5+hash(i*9.1)*9,w=2.6+hash(i*2.4)*2.1,col=i%2?[.07,.09,.17]:[.11,.13,.23];r.draw(m.box,compose(x,h*.5-.22,z,0,0,0,w,h,w),col);if(cfg.detail>0)for(let y=1;y<h-1;y+=1.6)r.draw(m.box,compose(x+(side<0?w*.51:-w*.51),y,z,0,0,0,.07,.28,.48),i%3?p.accent:[.95,.39,.75],.82);}
  }
  function drawNeonBackdrop(g,p,cfg){
    const r=g.renderer,m=g.meshes,count=Math.round(14*cfg.density);
    for(let i=0;i<count;i++){const side=i%2?-1:1,x=side*(9+hash(i*4.8)*19),z=4-wrap(i*22.7-g.travel*.97,310),h=2.2+hash(i*7.3)*3.6,col=i%2?p.accent:p.good;r.draw(m.cylinder,compose(x,h*.5,z,0,0,0,.16,h,.16),p.structure);r.draw(m.sphere,compose(x,h+.18,z,0,0,0,.37,.37,.37),col);r.draw(m.box,compose(x,h*.62,z,0,0,i*.6,.10,1.9,.46),col,.76);shadow(g,x,z,.45,.30,.10);}
  }

  function drawMeadowDetails(g,p,cfg){
    const r=g.renderer,m=g.meshes,span=310;
    for(let i=0;i<12;i++){const z=7-wrap(i*25.3-g.travel*.975+hash(i*4.1)*8,span),side=i%2?-1:1,x=side*(7.2+hash(i*2.7)*5.7),w=1.5+hash(i*6.2)*2.2,l=2.5+hash(i*4.1)*4.2,col=i%2?mix(p.ground,p.groundDark,.12):mix(p.ground,p.good,.025);r.draw(m.sphere,compose(x,-.255,z,0,hash(i)*.35-.17,0,w,.045,l),col,.34);}
    const grassCount=Math.round(42*cfg.density);
    for(let i=0;i<grassCount;i++){const z=9-wrap(i*(310/Math.max(1,grassCount))-g.travel*.985+hash(i*2.3)*7,310),side=i%2?-1:1,x=side*(6.35+hash(i*7.7)*4.00),s=.55+hash(i*11.2)*.75;grassTuft(g,x,z,s,i,i*.77);}
    const bushCount=Math.round(12*cfg.density);
    for(let i=0;i<bushCount;i++){const z=7-wrap(i*(307/Math.max(1,bushCount))-g.travel*.97+hash(i*5.2)*10,307),side=i%2?-1:1,x=side*(7.8+hash(i*9.7)*4.70),s=.55+hash(i*3.4)*.75;bush(g,x,z,s,i);}
    const treeCount=Math.round(12*cfg.density);
    for(let i=0;i<treeCount;i++){const z=8-wrap(i*(300/Math.max(1,treeCount))-g.travel*.956+hash(i*5.6)*11,300),side=i%2?-1:1,x=side*(10.0+hash(i*8.8)*5.25),s=.66+hash(i*2.1)*.72;tree(g,x,z,s,i%5,i);}
    if(cfg.detail>0){
      const flowerCount=Math.round(16*cfg.density);for(let i=0;i<flowerCount;i++){const z=7-wrap(i*(300/flowerCount)-g.travel*.986+hash(i*7.1)*8,300),side=i%2?-1:1,x=side*(6.45+hash(i*4.5)*3.45);flower(g,x,z,.65+hash(i)*.5,i);}
      const rockCount=Math.round(8*cfg.density);for(let i=0;i<rockCount;i++){const z=5-wrap(i*(304/rockCount)-g.travel*.97+hash(i*8.1)*13,304),side=i%2?-1:1,x=side*(7.7+hash(i*3.2)*5.2);rock(g,x,z,.5+hash(i*6.1)*.55,i);}
    }
  }

  function drawSkyDecor(g,b,p,cfg){
    const r=g.renderer,m=g.meshes,id=b.id;
    if(id==='meadow'){
      r.draw(m.sphere,compose(-13,17,-124,0,0,0,2.7,2.7,2.7),[1,.86,.42],.91);
      const clouds=cfg.detail>0?4:2;
      for(let i=0;i<clouds;i++){const x=-18+i*9+(hash(i*3.7)-.5)*4,z=-72-i*12,y=10.5+(i%2)*1.7,s=.8+hash(i*5.2)*.55,col=[.93,.97,1];r.draw(m.sphere,compose(x,y,z,0,0,0,2.7*s,.86*s,1.05*s),col,.88);r.draw(m.sphere,compose(x+1.8*s,y-.08,z,0,0,0,1.85*s,.68*s,.88*s),col,.88);}
    }else if(id==='desert'){
      r.draw(m.sphere,compose(-13,15,-124,0,0,0,3.4,3.4,3.4),[1,.73,.28],.92);
      r.draw(m.box,compose(0,2.5,-112,0,0,0,78,8,.1),[.95,.68,.35],.055);
    }else if(id==='factory'){
      for(let i=0;i<4;i++){const x=-18+i*12,z=-108-i*7,y=8+i%2*1.2;r.draw(m.sphere,compose(x,y,z,0,0,0,2.2,1.0,1.2),[.60,.63,.66],.24);}
    }else if(id==='city'){
      r.draw(m.sphere,compose(-12,15,-122,0,0,0,2.25,2.25,2.25),[.82,.88,1],.82);
      if(cfg.detail>0)for(let i=0;i<16;i++){const x=-28+hash(i*4.2)*56,y=8+hash(i*7.4)*10,z=-105-hash(i*9.8)*38,s=.035+hash(i*2.1)*.045;r.draw(m.sphere,compose(x,y,z,0,0,0,s,s,s),[.72,.84,1],.72);}
    }else{
      r.draw(m.sphere,compose(-13,14,-120,0,0,0,2.2,2.2,2.2),p.accent,.34);
      if(cfg.detail>0)for(let i=0;i<10;i++){const x=-24+hash(i*5.8)*48,y=7+hash(i*3.4)*10,z=-100-hash(i*8.2)*42,s=.04+hash(i)*.05;r.draw(m.sphere,compose(x,y,z,0,0,0,s,s,s),i%2?p.accent:p.good,.74);}
    }
  }

  P.drawEnvironment=function(){
    const r=this.renderer,m=this.meshes,b=this.biome,p=b.palette,cfg=envCfg(this),span=310;
    if(b.id==='meadow')drawMeadowGround(this,p);else r.draw(m.box,compose(0,-.78,-132,0,0,0,92,1.0,316),p.ground);
    drawSkyDecor(this,b,p,cfg);
    if(b.id==='meadow')drawMeadowDetails(this,p,cfg);
    else if(b.id==='desert')drawDesertBackdrop(this,p,cfg);
    else if(b.id==='factory')drawFactoryBackdrop(this,p,cfg);
    else if(b.id==='city')drawCityBackdrop(this,p,cfg);
    else drawNeonBackdrop(this,p,cfg);

    if(b.id==='meadow')drawMeadowBackdrop(this,p,cfg);

    const shoulder=b.id==='meadow'?[.40,.31,.20]:b.id==='desert'?[.65,.46,.23]:mix(p.road,p.ground,.30);
    r.draw(m.box,compose(-6.48,-.16,-132,0,0,0,.74,.22,316),shoulder);
    r.draw(m.box,compose(6.48,-.16,-132,0,0,0,.74,.22,316),shoulder);
    r.draw(m.box,compose(0,-.22,-132,0,0,0,12,.45,316),p.road);
    r.draw(m.box,compose(-5.93,.018,-132,0,0,0,.12,.035,316),mix(p.roadEdge,p.stripe,.25));
    r.draw(m.box,compose(5.93,.018,-132,0,0,0,.12,.035,316),mix(p.roadEdge,p.stripe,.25));

    for(let i=0;i<12;i++){const z=8-wrap(i*26.4-this.travel*.992,span),x=(hash(i*8.2)-.5)*7.8,w=.8+hash(i*3.1)*2.3,l=1.2+hash(i*5.7)*3.8,col=i%2?scale(p.road,.88):mix(p.road,p.roadEdge,.12);r.draw(m.box,compose(x,.012,z,0,hash(i)*.18-.09,0,w,.025,l),col,.58);}
    for(let i=0;i<36;i++){const z=10-wrap(i*8.55-this.travel,span);r.draw(m.box,compose(0,.028,z,0,0,0,.13,.038,2.9),p.stripe,.92);}
    for(let i=0;i<14;i++){const z=8-wrap(i*21.8-this.travel*.982,span),side=i%2?-1:1,x=side*6.92;r.draw(m.cylinder,compose(x,.31,z,0,0,0,.08,.72,.08),p.roadEdge);r.draw(m.box,compose(x,.50,z,0,0,0,.21,.19,.14),i%3?p.bad:p.accent);shadow(this,x,z,.20,.16,.08);}

    if(b.id!=='meadow'&&cfg.detail>0){
      const accents=Math.round(12*cfg.density);for(let i=0;i<accents;i++){const z=5-wrap(i*(300/accents)-this.travel*.96+hash(i*4.2)*9,300),side=i%2?-1:1,x=side*(8+hash(i*8.1)*10);if(b.id==='factory')rock(this,x,z,.7+hash(i)*.5,i);else if(b.id==='city')drawDecorCar(this,x,z,i);else if(b.id==='neon')r.draw(m.sphere,compose(x,.32,z,0,0,0,.18,.18,.18),i%2?p.accent:p.good,.75);}
    }

    const skyFog=mix(p.sky,p.ground,.12);
    r.draw(m.box,compose(0,7,-103,0,0,0,86,24,.12),skyFog,.055);
    r.draw(m.box,compose(0,8,-143,0,0,0,96,28,.12),p.sky,.10);
  };

  const oldGate=P.drawGate;
  P.drawGate=function(o,z){
    oldGate.call(this,o,z);const r=this.renderer,m=this.meshes,p=this.biome.palette,risk=!!o.risk,frame=risk?p.accent:p.structure;
    for(const x of[-5.02,-.08,.08,5.02])r.draw(m.box,compose(x,1.47,z-.04,0,0,0,.10,3.18,.34),frame,.95);
    r.draw(m.box,compose(0,2.99,z-.04,0,0,0,10.15,.12,.34),frame,.92);
    for(const x of[-4.55,4.55])r.draw(m.box,compose(x,.13,z+.03,0,0,0,.54,.20,.78),mix(frame,p.roadEdge,.25));
    if(envCfg(this).detail>0)for(let i=0;i<8;i++){const x=-4.45+i*1.27;r.draw(m.sphere,compose(x,3.00,z-.22,0,0,0,.06,.06,.06),i%2?p.accent:p.good,.88);}
    shadow(this,0,z,5.3,.42,.13);
  };

  const oldObstacle=P.drawObstacle;
  P.drawObstacle=function(o,z){
    oldObstacle.call(this,o,z);const r=this.renderer,m=this.meshes,p=this.biome.palette,cfg=envCfg(this),a=this.time*(o.speed||1)+(o.phase||0);
    if(o.kind==='saw'){const x=o.baseX+Math.sin(a)*o.range;r.draw(m.cylinder,compose(x,.40,z,Math.PI/2,0,a*5,.31,.17,.31),[.18,.20,.23]);for(let i=0;i<8;i++){const t=i*TAU/8+a*5;r.draw(m.cone,compose(x+Math.cos(t)*.66,.40+Math.sin(t)*.66,z,0,0,-t,.15,.29,.15),[.73,.76,.79]);}shadow(this,x,z,.72,.22,.12);}
    else if(o.kind==='hammer'){for(const x of[-2.8,2.8]){r.draw(m.box,compose(x,.18,z+.34,0,0,0,1.25,.16,.62),[.22,.23,.26]);if(Math.abs(Math.sin(a))>.88&&cfg.detail>0)for(let i=0;i<4;i++)r.draw(m.sphere,compose(x+(i-1.5)*.18,.18,z+rndDet(i+o.distance)*.28,0,0,0,.07,.07,.07),[.55,.48,.40],.52);}}
    else if(o.kind==='laser'){for(const x of[-5.25,5.25]){r.draw(m.cylinder,compose(x,.78,z,0,0,0,.34,1.45,.34),p.structure);r.draw(m.sphere,compose(x,1.28,z-.16,0,0,0,.18,.18,.18),p.bad,.96);}}
    else if(o.kind==='crusher'){for(const x of[-4.72,4.72]){r.draw(m.box,compose(x,1.05,z,0,0,0,.44,2.12,.65),p.structure);for(let y=.3;y<1.9;y+=.42)r.draw(m.box,compose(x,y,z-.35,0,0,.52,.50,.10,.08),p.stripe);}}
    else if(o.kind==='mines'&&cfg.detail>0&&o.spikes){for(const mine of o.spikes.slice(0,10))r.draw(m.sphere,compose(mine.x,.22,z+mine.z-.24,0,0,0,.07,.07,.07),p.bad,.92);}
  };

  const oldFinishGate=P.drawFinishGate;
  P.drawFinishGate=function(z,o){
    oldFinishGate.call(this,z,o);const r=this.renderer,m=this.meshes,p=this.biome.palette,cfg=envCfg(this);
    r.draw(m.box,compose(0,5.12,z,0,0,0,10.7,.26,.48),o?.bossFinish?p.accent:p.structure);
    for(const x of[-4.8,4.8]){r.draw(m.box,compose(x,2.50,z+.25,0,0,0,.74,4.9,.62),p.structure);r.draw(m.box,compose(x,2.55,z+.58,0,0,0,.52,4.3,.08),p.accent,.70);shadow(this,x,z,.50,.40,.12);}
    if(cfg.detail>0)for(let i=0;i<7;i++){const x=-3.9+i*1.3;r.draw(m.sphere,compose(x,5.12,z-.30,0,0,0,.10,.10,.10),i%2?COLORS.white:p.accent,.94);}
  };

  function rndDet(n){return hash(n*3.177)-.5;}

  const oldFinishScene=P.drawFinishScene;
  P.drawFinishScene=function(){
    oldFinishScene.call(this);const r=this.renderer,m=this.meshes,p=this.biome.palette,cfg=envCfg(this);
    for(const side of[-1,1])for(let i=0;i<4;i++){const x=side*(6.8+i*.85),z=this.playerZ-3.2-i*2.4,h=2.3+i*.35;r.draw(m.cylinder,compose(x,h*.5,z,0,0,0,.10,h,.10),p.structure);r.draw(m.box,compose(x,h,z,0,0,side*.15,.62,.38,.10),i%2?p.accent:p.good);}
    if(cfg.detail>0)for(let i=0;i<12;i++){const x=(i%2?-1:1)*(6.4+(i%3)*.8),z=this.playerZ-2-(i%6)*1.7;r.draw(m.sphere,compose(x,3.6+(i%3)*.4,z,0,0,0,.08,.08,.08),i%2?p.accent:COLORS.gold,.78);}
  };

  const oldRender=P.render;
  P.render=function(){
    const p=this.biome?.palette;
    if(p&&S.UI?.hud){
      const toCss=a=>'rgb('+a.map(v=>Math.round(clamp(v,0,1)*255)).join(',')+')';
      S.UI.hud.style.setProperty('--hud-accent',toCss(p.accent));
      S.UI.hud.style.setProperty('--hud-secondary',toCss(p.good));
    }
    oldRender.call(this);
  };

  window.SleepRoadEnvironmentV8={MEADOW_BOUNDS,envCfg,hash,tree,bush,grassTuft,flower,rock,buildDecorCarMeshes,buildDecorWheelMeshes,drawDecorCar};
})();
