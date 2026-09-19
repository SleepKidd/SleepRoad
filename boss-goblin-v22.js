'use strict';
(() => {
  const S=window.SleepRoadSystems,P=window.SleepRoad3D&&window.SleepRoad3D.prototype,A=window.SleepRoadGoblinBossAssetV22;
  if(!S||!P||!A)throw new Error('Goblin boss v22 dependencies are missing');
  const {compose,clamp}=S,BASE_SCALE=.74;

  function bytes(b64){const raw=atob(b64),out=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)out[i]=raw.charCodeAt(i)&255;return out;}
  function u16(b64){const b=bytes(b64);if(b.byteLength&1)throw new Error('Goblin uint16 alignment');const v=new DataView(b.buffer,b.byteOffset,b.byteLength),out=new Uint16Array(b.byteLength>>1);for(let i=0;i<out.length;i++)out[i]=v.getUint16(i*2,true);return out;}
  function decode(){
    if(A.__decoded)return A.__decoded;
    const count=A.meta.runtimeVerts|0,pq=u16(A.p),nb=bytes(A.n),colors=bytes(A.c),indices=u16(A.i);
    if(pq.length!==count*3||nb.length!==count*2||colors.length!==count*3||indices.length!==(A.meta.runtimeTris|0)*3)throw new Error('Goblin asset length mismatch');
    const positions=new Float32Array(count*3),normals=new Float32Array(count*3),lo=A.lo,hi=A.hi;
    for(let i=0;i<count;i++){
      for(let axis=0;axis<3;axis++)positions[i*3+axis]=lo[axis]+pq[i*3+axis]/65535*(hi[axis]-lo[axis]);
      let x=(nb[i*2]>127?nb[i*2]-256:nb[i*2])/127,y=(nb[i*2+1]>127?nb[i*2+1]-256:nb[i*2+1])/127,z=1-Math.abs(x)-Math.abs(y);
      if(z<0){const ox=x;x=(1-Math.abs(y))*(ox<0?-1:1);y=(1-Math.abs(ox))*(y<0?-1:1);}
      const l=Math.hypot(x,y,z)||1;normals[i*3]=x/l;normals[i*3+1]=y/l;normals[i*3+2]=z/l;
    }
    for(let i=0;i<indices.length;i++)if(indices[i]>=count)throw new Error('Goblin index out of range');
    return A.__decoded={positions,normals,colors,indices};
  }

  function makeProgram(r){
    const gl=r.gl,webgl2=r.webgl2;
    const vs=webgl2?`#version 300 es
precision highp float;
layout(location=0) in vec3 aPosition;
layout(location=1) in vec3 aNormal;
layout(location=2) in vec3 aColor;
uniform mat4 uModel;
uniform mat4 uViewProj;
out vec3 vNormal;
out vec3 vColor;
void main(){vec4 world=uModel*vec4(aPosition,1.0);gl_Position=uViewProj*world;vNormal=normalize(mat3(uModel)*aNormal);vColor=aColor;}`:
`precision highp float;
attribute vec3 aPosition;
attribute vec3 aNormal;
attribute vec3 aColor;
uniform mat4 uModel;
uniform mat4 uViewProj;
varying vec3 vNormal;
varying vec3 vColor;
void main(){vec4 world=uModel*vec4(aPosition,1.0);gl_Position=uViewProj*world;vNormal=normalize(mat3(uModel)*aNormal);vColor=aColor;}`;
    const fs=webgl2?`#version 300 es
precision highp float;
in vec3 vNormal;
in vec3 vColor;
uniform vec3 uLightDir;
uniform float uAlpha;
out vec4 outColor;
void main(){vec3 n=normalize(vNormal);float d=max(dot(n,normalize(uLightDir)),0.0);float hemi=.5+.5*n.y;float k=.91+d*.055+hemi*.035;outColor=vec4(min(vec3(1.0),vColor*k),uAlpha);}`:
`precision highp float;
varying vec3 vNormal;
varying vec3 vColor;
uniform vec3 uLightDir;
uniform float uAlpha;
void main(){vec3 n=normalize(vNormal);float d=max(dot(n,normalize(uLightDir)),0.0);float hemi=.5+.5*n.y;float k=.91+d*.055+hemi*.035;gl_FragColor=vec4(min(vec3(1.0),vColor*k),uAlpha);}`;
    const program=r._program(vs,fs);
    return{program,pos:gl.getAttribLocation(program,'aPosition'),nor:gl.getAttribLocation(program,'aNormal'),col:gl.getAttribLocation(program,'aColor'),model:gl.getUniformLocation(program,'uModel'),vp:gl.getUniformLocation(program,'uViewProj'),light:gl.getUniformLocation(program,'uLightDir'),alpha:gl.getUniformLocation(program,'uAlpha')};
  }

  function gpu(g){
    if(g.__goblinBossGpu)return g.__goblinBossGpu;
    if(g.__goblinBossFailed)return null;
    try{
      const r=g.renderer,gl=r.gl,d=decode(),mesh=r.createMesh({positions:d.positions,normals:d.normals,indices:d.indices}),color=gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER,color);gl.bufferData(gl.ARRAY_BUFFER,d.colors,gl.STATIC_DRAW);
      return g.__goblinBossGpu={mesh,color,shader:makeProgram(r)};
    }catch(err){g.__goblinBossFailed=true;console.error('Goblin boss disabled:',err);return null;}
  }

  function elevation(g,z){
    const V=window.SleepRoadExperienceV13;
    return V?.elevationAt?V.elevationAt(g,(g.travel||0)-z):0;
  }
  function modelScale(o){return Math.max(1.85,(o?.bossScale||3.25)*BASE_SCALE);}
  function pose(g,o,z,death=null){
    const rootZ=z,scale=modelScale(o||death),ground=elevation(g,rootZ),t=g.time||0;
    let rx=0,ry=0,rz=0,bob=death?0:Math.sin(t*2.15)*.035;
    if(death){const p=clamp(death.progress||0,0,1);rx=p*1.30;rz=Math.sin(p*Math.PI)*.10;bob=Math.cos(p*Math.PI)*.05;}
    else if(g.state==='battle'){
      const cycle=(o?.v13Phase||1)>=3?13:(o?.v13Phase||1)>=2?15:18,p=((o?.battleTicks||0)%cycle)/cycle,a=Math.sin(Math.PI*clamp(p/.72,0,1)),type=o?.v11AttackType||o?.v13LastAttack||'punch';
      if(type==='slam')rx=-.13*a;
      else if(type==='stomp')rz=.055*Math.sin(t*7)*a;
      else if(type==='sweep')ry=.17*Math.sin(t*5.2)*a;
      else rx=-.075*a;
      const stagger=clamp(o?.v11Stagger||0,0,1);rz+=.11*stagger*Math.sin(t*12);rx-=.08*stagger;
    }
    return compose(0,ground+.025+bob,rootZ,rx,ry,rz,scale,scale,scale);
  }

  function drawGpu(g,model,alpha=1){
    const pack=gpu(g);if(!pack)return false;
    const r=g.renderer,gl=r.gl,{mesh,color,shader}=pack,cull=gl.isEnabled(gl.CULL_FACE);
    gl.useProgram(shader.program);
    gl.bindBuffer(gl.ARRAY_BUFFER,mesh.pos);gl.enableVertexAttribArray(shader.pos);gl.vertexAttribPointer(shader.pos,3,gl.FLOAT,false,0,0);
    gl.bindBuffer(gl.ARRAY_BUFFER,mesh.nor);gl.enableVertexAttribArray(shader.nor);gl.vertexAttribPointer(shader.nor,3,gl.FLOAT,false,0,0);
    gl.bindBuffer(gl.ARRAY_BUFFER,color);gl.enableVertexAttribArray(shader.col);gl.vertexAttribPointer(shader.col,3,gl.UNSIGNED_BYTE,true,0,0);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,mesh.ind);
    gl.uniformMatrix4fv(shader.model,false,model);gl.uniformMatrix4fv(shader.vp,false,r.viewProj);gl.uniform3fv(shader.light,r.lightDir);gl.uniform1f(shader.alpha,alpha);
    if(cull)gl.disable(gl.CULL_FACE);
    gl.drawElements(gl.TRIANGLES,mesh.count,gl.UNSIGNED_SHORT,0);
    if(cull)gl.enable(gl.CULL_FACE);
    return true;
  }

  function draw(g,o,z){
    const rootZ=z-2.25,ok=drawGpu(g,pose(g,o,rootZ),1);
    if(ok&&g.meshes?.cylinder)g.renderer.draw(g.meshes.cylinder,compose(0,.02,rootZ,0,0,0,1.28,.018,.78),[.05,.06,.06],.18);
    return ok;
  }
  function labelPosition(g,o,z){
    const rootZ=z-2.25,scale=modelScale(o),ground=elevation(g,rootZ),height=(A.hi[1]-A.lo[1])*scale;
    return[0,ground+height+.34,rootZ+.04];
  }
  function drawCorpse(g,c){
    if(!c||c.life<=0)return false;
    const p=clamp(1-c.life/c.max,0,1),z=c.z-(g.travel-(c.travel||g.travel)),alpha=clamp(c.life/.28,0,1),fake={bossScale:c.scale||3.25};
    return drawGpu(g,pose(g,fake,z,{progress:p,scale:c.scale}),alpha);
  }

  window.SleepRoadGoblinBossV22={meta:A.meta,draw,drawCorpse,labelPosition,modelScale};
})();
