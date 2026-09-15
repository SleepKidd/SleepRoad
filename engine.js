'use strict';

(function (global) {
  const DEG = Math.PI / 180;

  function mat4Identity() {
    const out = new Float32Array(16);
    out[0] = out[5] = out[10] = out[15] = 1;
    return out;
  }

  function mat4Multiply(a, b) {
    const out = new Float32Array(16);
    for (let c = 0; c < 4; c++) {
      const b0 = b[c * 4], b1 = b[c * 4 + 1], b2 = b[c * 4 + 2], b3 = b[c * 4 + 3];
      out[c * 4] = a[0] * b0 + a[4] * b1 + a[8] * b2 + a[12] * b3;
      out[c * 4 + 1] = a[1] * b0 + a[5] * b1 + a[9] * b2 + a[13] * b3;
      out[c * 4 + 2] = a[2] * b0 + a[6] * b1 + a[10] * b2 + a[14] * b3;
      out[c * 4 + 3] = a[3] * b0 + a[7] * b1 + a[11] * b2 + a[15] * b3;
    }
    return out;
  }

  function mat4Perspective(fovy, aspect, near, far) {
    const f = 1 / Math.tan(fovy / 2), nf = 1 / (near - far);
    const out = new Float32Array(16);
    out[0] = f / aspect; out[5] = f; out[10] = (far + near) * nf; out[11] = -1; out[14] = 2 * far * near * nf;
    return out;
  }

  function normalize(v) { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0]/l,v[1]/l,v[2]/l]; }
  function sub(a,b) { return [a[0]-b[0],a[1]-b[1],a[2]-b[2]]; }
  function cross(a,b) { return [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]]; }
  function dot(a,b) { return a[0]*b[0]+a[1]*b[1]+a[2]*b[2]; }

  function mat4LookAt(eye, center, up) {
    const z = normalize(sub(eye, center));
    const x = normalize(cross(up, z));
    const y = cross(z, x);
    const out = mat4Identity();
    out[0]=x[0]; out[1]=y[0]; out[2]=z[0];
    out[4]=x[1]; out[5]=y[1]; out[6]=z[1];
    out[8]=x[2]; out[9]=y[2]; out[10]=z[2];
    out[12]=-dot(x,eye); out[13]=-dot(y,eye); out[14]=-dot(z,eye);
    return out;
  }

  function compose(x=0,y=0,z=0,rx=0,ry=0,rz=0,sx=1,sy=1,sz=1) {
    const cx=Math.cos(rx), sxn=Math.sin(rx), cy=Math.cos(ry), syn=Math.sin(ry), cz=Math.cos(rz), szn=Math.sin(rz);
    const r00=cy*cz+syn*sxn*szn, r01=-cy*szn+syn*sxn*cz, r02=syn*cx;
    const r10=cx*szn, r11=cx*cz, r12=-sxn;
    const r20=-syn*cz+cy*sxn*szn, r21=syn*szn+cy*sxn*cz, r22=cy*cx;
    const out=new Float32Array(16);
    out[0]=r00*sx; out[1]=r10*sx; out[2]=r20*sx;
    out[4]=r01*sy; out[5]=r11*sy; out[6]=r21*sy;
    out[8]=r02*sz; out[9]=r12*sz; out[10]=r22*sz;
    out[12]=x; out[13]=y; out[14]=z; out[15]=1;
    return out;
  }

  function transformPoint(m,x,y,z,w=1){return [m[0]*x+m[4]*y+m[8]*z+m[12]*w,m[1]*x+m[5]*y+m[9]*z+m[13]*w,m[2]*x+m[6]*y+m[10]*z+m[14]*w,m[3]*x+m[7]*y+m[11]*z+m[15]*w];}

  function makeBox(){
    const p=[
      -0.5,-0.5, 0.5,  0.5,-0.5, 0.5,  0.5, 0.5, 0.5, -0.5, 0.5, 0.5,
       0.5,-0.5,-0.5, -0.5,-0.5,-0.5, -0.5, 0.5,-0.5,  0.5, 0.5,-0.5,
      -0.5, 0.5, 0.5,  0.5, 0.5, 0.5,  0.5, 0.5,-0.5, -0.5, 0.5,-0.5,
      -0.5,-0.5,-0.5,  0.5,-0.5,-0.5,  0.5,-0.5, 0.5, -0.5,-0.5, 0.5,
       0.5,-0.5, 0.5,  0.5,-0.5,-0.5,  0.5, 0.5,-0.5,  0.5, 0.5, 0.5,
      -0.5,-0.5,-0.5, -0.5,-0.5, 0.5, -0.5, 0.5, 0.5, -0.5, 0.5,-0.5
    ];
    const n=[
       0,0,1, 0,0,1, 0,0,1, 0,0,1,
       0,0,-1,0,0,-1,0,0,-1,0,0,-1,
       0,1,0,0,1,0,0,1,0,0,1,0,
       0,-1,0,0,-1,0,0,-1,0,0,-1,0,
       1,0,0,1,0,0,1,0,0,1,0,0,
      -1,0,0,-1,0,0,-1,0,0,-1,0,0
    ];
    const idx=[];for(let f=0;f<6;f++){const o=f*4;idx.push(o,o+1,o+2,o,o+2,o+3);}return {positions:p,normals:n,indices:idx};
  }

  function makeCylinder(segments=12,radius=.5,height=1){
    const p=[],n=[],idx=[],half=height/2;
    for(let i=0;i<=segments;i++){const a=i/segments*Math.PI*2,c=Math.cos(a),s=Math.sin(a);p.push(c*radius,-half,s*radius,c*radius,half,s*radius);n.push(c,0,s,c,0,s);}
    for(let i=0;i<segments;i++){const o=i*2;idx.push(o,o+1,o+3,o,o+3,o+2);} let start=p.length/3; p.push(0,-half,0);n.push(0,-1,0);
    for(let i=0;i<=segments;i++){const a=i/segments*Math.PI*2,c=Math.cos(a),s=Math.sin(a);p.push(c*radius,-half,s*radius);n.push(0,-1,0);} for(let i=0;i<segments;i++)idx.push(start,start+i+2,start+i+1);
    start=p.length/3;p.push(0,half,0);n.push(0,1,0);for(let i=0;i<=segments;i++){const a=i/segments*Math.PI*2,c=Math.cos(a),s=Math.sin(a);p.push(c*radius,half,s*radius);n.push(0,1,0);}for(let i=0;i<segments;i++)idx.push(start,start+i+1,start+i+2);
    return {positions:p,normals:n,indices:idx};
  }

  function makeCone(segments=12){
    const p=[],n=[],idx=[];for(let i=0;i<=segments;i++){const a=i/segments*Math.PI*2,c=Math.cos(a),s=Math.sin(a),nn=normalize([c,.55,s]);p.push(c*.5,-.5,s*.5,0,.5,0);n.push(nn[0],nn[1],nn[2],nn[0],nn[1],nn[2]);}for(let i=0;i<segments;i++){const o=i*2;idx.push(o,o+2,o+1);}let start=p.length/3;p.push(0,-.5,0);n.push(0,-1,0);for(let i=0;i<=segments;i++){const a=i/segments*Math.PI*2;p.push(Math.cos(a)*.5,-.5,Math.sin(a)*.5);n.push(0,-1,0);}for(let i=0;i<segments;i++)idx.push(start,start+i+2,start+i+1);return {positions:p,normals:n,indices:idx};
  }

  function makeSphere(lats=8,longs=12){
    const p=[],n=[],idx=[];for(let y=0;y<=lats;y++){const phi=y/lats*Math.PI;for(let x=0;x<=longs;x++){const theta=x/longs*Math.PI*2,sx=Math.sin(phi)*Math.cos(theta),sy=Math.cos(phi),sz=Math.sin(phi)*Math.sin(theta);p.push(sx*.5,sy*.5,sz*.5);n.push(sx,sy,sz);}}for(let y=0;y<lats;y++)for(let x=0;x<longs;x++){const a=y*(longs+1)+x,b=a+longs+1;idx.push(a,b,a+1,b,b+1,a+1);}return {positions:p,normals:n,indices:idx};
  }

  class Renderer{
    constructor(canvas){
      this.canvas=canvas;
      this.gl=canvas.getContext('webgl2',{antialias:true,alpha:false,depth:true,powerPreference:'high-performance'});
      this.webgl2=!!this.gl;
      if(!this.gl)this.gl=canvas.getContext('webgl',{antialias:true,alpha:false,depth:true,powerPreference:'high-performance',preserveDrawingBuffer:false});
      if(!this.gl)throw new Error('WebGL is not supported');
      const gl=this.gl;
      this.instExt=this.webgl2?null:gl.getExtension('ANGLE_instanced_arrays');
      gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.enable(gl.CULL_FACE);gl.cullFace(gl.BACK);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);

      const stdVS=this.webgl2?`#version 300 es
precision highp float;layout(location=0)in vec3 aPosition;layout(location=1)in vec3 aNormal;uniform mat4 uModel;uniform mat4 uViewProj;uniform vec3 uColor;out vec3 vNormal;out vec3 vColor;void main(){vec4 world=uModel*vec4(aPosition,1.0);gl_Position=uViewProj*world;vNormal=normalize(mat3(uModel)*aNormal);vColor=uColor;}`:
`precision highp float;attribute vec3 aPosition;attribute vec3 aNormal;uniform mat4 uModel;uniform mat4 uViewProj;uniform vec3 uColor;varying vec3 vNormal;varying vec3 vColor;void main(){vec4 world=uModel*vec4(aPosition,1.0);gl_Position=uViewProj*world;vNormal=normalize(mat3(uModel)*aNormal);vColor=uColor;}`;
      const stdFS=this.webgl2?`#version 300 es
precision highp float;in vec3 vNormal;in vec3 vColor;uniform vec3 uLightDir;uniform float uAlpha;out vec4 outColor;void main(){vec3 n=normalize(vNormal);float d=max(dot(n,normalize(uLightDir)),0.0);float hemi=.5+.5*n.y;float light=.48+d*.38+hemi*.14;outColor=vec4(vColor*light,uAlpha);}`:
`precision highp float;varying vec3 vNormal;varying vec3 vColor;uniform vec3 uLightDir;uniform float uAlpha;void main(){vec3 n=normalize(vNormal);float d=max(dot(n,normalize(uLightDir)),0.0);float hemi=.5+.5*n.y;float light=.48+d*.38+hemi*.14;gl_FragColor=vec4(vColor*light,uAlpha);}`;
      const instVS=this.webgl2?`#version 300 es
precision highp float;layout(location=0)in vec3 aPosition;layout(location=1)in vec3 aNormal;layout(location=2)in vec4 iM0;layout(location=3)in vec4 iM1;layout(location=4)in vec4 iM2;layout(location=5)in vec4 iM3;layout(location=6)in vec3 iColor;uniform mat4 uViewProj;out vec3 vNormal;out vec3 vColor;void main(){mat4 m=mat4(iM0,iM1,iM2,iM3);vec4 world=m*vec4(aPosition,1.0);gl_Position=uViewProj*world;vNormal=normalize(mat3(m)*aNormal);vColor=iColor;}`:
`precision highp float;attribute vec3 aPosition;attribute vec3 aNormal;attribute vec4 iM0;attribute vec4 iM1;attribute vec4 iM2;attribute vec4 iM3;attribute vec3 iColor;uniform mat4 uViewProj;varying vec3 vNormal;varying vec3 vColor;void main(){mat4 m=mat4(iM0,iM1,iM2,iM3);vec4 world=m*vec4(aPosition,1.0);gl_Position=uViewProj*world;vNormal=normalize(mat3(m)*aNormal);vColor=iColor;}`;
      const instFS=this.webgl2?`#version 300 es
precision highp float;in vec3 vNormal;in vec3 vColor;uniform vec3 uLightDir;out vec4 outColor;void main(){vec3 n=normalize(vNormal);float d=max(dot(n,normalize(uLightDir)),0.0);float hemi=.5+.5*n.y;float light=.48+d*.38+hemi*.14;outColor=vec4(vColor*light,1.0);}`:
`precision highp float;varying vec3 vNormal;varying vec3 vColor;uniform vec3 uLightDir;void main(){vec3 n=normalize(vNormal);float d=max(dot(n,normalize(uLightDir)),0.0);float hemi=.5+.5*n.y;float light=.48+d*.38+hemi*.14;gl_FragColor=vec4(vColor*light,1.0);}`;
      this.program=this._program(stdVS,stdFS);
      this.instProgram=this._program(instVS,instFS);
      this.stdAttr={pos:gl.getAttribLocation(this.program,'aPosition'),nor:gl.getAttribLocation(this.program,'aNormal')};
      this.instAttr={pos:gl.getAttribLocation(this.instProgram,'aPosition'),nor:gl.getAttribLocation(this.instProgram,'aNormal'),m0:gl.getAttribLocation(this.instProgram,'iM0'),m1:gl.getAttribLocation(this.instProgram,'iM1'),m2:gl.getAttribLocation(this.instProgram,'iM2'),m3:gl.getAttribLocation(this.instProgram,'iM3'),color:gl.getAttribLocation(this.instProgram,'iColor')};
      this.loc={model:gl.getUniformLocation(this.program,'uModel'),vp:gl.getUniformLocation(this.program,'uViewProj'),color:gl.getUniformLocation(this.program,'uColor'),light:gl.getUniformLocation(this.program,'uLightDir'),alpha:gl.getUniformLocation(this.program,'uAlpha'),ivp:gl.getUniformLocation(this.instProgram,'uViewProj'),ilight:gl.getUniformLocation(this.instProgram,'uLightDir')};
      this.view=mat4Identity();this.proj=mat4Identity();this.viewProj=mat4Identity();this.lightDir=normalize([-.45,.9,.35]);this.instanceMatrixBuffer=gl.createBuffer();this.instanceColorBuffer=gl.createBuffer();
    }
    _program(vs,fs){const gl=this.gl,compile=(type,src)=>{const sh=gl.createShader(type);gl.shaderSource(sh,src);gl.compileShader(sh);if(!gl.getShaderParameter(sh,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(sh)||'shader');return sh;};const p=gl.createProgram();gl.attachShader(p,compile(gl.VERTEX_SHADER,vs));gl.attachShader(p,compile(gl.FRAGMENT_SHADER,fs));gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(p)||'link');return p;}
    createMesh(data){const gl=this.gl,pos=gl.createBuffer(),nor=gl.createBuffer(),ind=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,pos);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(data.positions),gl.STATIC_DRAW);gl.bindBuffer(gl.ARRAY_BUFFER,nor);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(data.normals),gl.STATIC_DRAW);gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,ind);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array(data.indices),gl.STATIC_DRAW);return {pos,nor,ind,count:data.indices.length};}
    _bindBase(mesh,attrs){const gl=this.gl;gl.bindBuffer(gl.ARRAY_BUFFER,mesh.pos);gl.enableVertexAttribArray(attrs.pos);gl.vertexAttribPointer(attrs.pos,3,gl.FLOAT,false,0,0);gl.bindBuffer(gl.ARRAY_BUFFER,mesh.nor);gl.enableVertexAttribArray(attrs.nor);gl.vertexAttribPointer(attrs.nor,3,gl.FLOAT,false,0,0);gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,mesh.ind);}
    resize(w,h,dpr=1){const rw=Math.max(1,Math.round(w*dpr)),rh=Math.max(1,Math.round(h*dpr));if(this.canvas.width!==rw||this.canvas.height!==rh){this.canvas.width=rw;this.canvas.height=rh;}this.canvas.style.width=`${w}px`;this.canvas.style.height=`${h}px`;this.gl.viewport(0,0,rw,rh);}
    setCamera(eye,target,aspect,fov=45*DEG){this.view=mat4LookAt(eye,target,[0,1,0]);this.proj=mat4Perspective(fov,aspect,.1,320);this.viewProj=mat4Multiply(this.proj,this.view);}
    clear(r,g,b,a=1){const gl=this.gl;gl.clearColor(r,g,b,a);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);}
    draw(mesh,model,color,alpha=1){const gl=this.gl;gl.useProgram(this.program);this._bindBase(mesh,this.stdAttr);gl.uniformMatrix4fv(this.loc.model,false,model);gl.uniformMatrix4fv(this.loc.vp,false,this.viewProj);gl.uniform3fv(this.loc.color,color);gl.uniform3fv(this.loc.light,this.lightDir);gl.uniform1f(this.loc.alpha,alpha);gl.drawElements(gl.TRIANGLES,mesh.count,gl.UNSIGNED_SHORT,0);}
    drawInstances(mesh,matrices,colors,count){
      if(!count)return;const gl=this.gl;
      if(!this.webgl2&&!this.instExt){for(let i=0;i<count;i++){this.draw(mesh,matrices.subarray(i*16,i*16+16),colors.subarray(i*3,i*3+3),1);}return;}
      gl.useProgram(this.instProgram);this._bindBase(mesh,this.instAttr);
      gl.bindBuffer(gl.ARRAY_BUFFER,this.instanceMatrixBuffer);gl.bufferData(gl.ARRAY_BUFFER,matrices,gl.DYNAMIC_DRAW);const stride=64;const ma=[this.instAttr.m0,this.instAttr.m1,this.instAttr.m2,this.instAttr.m3];
      for(let i=0;i<4;i++){const loc=ma[i];gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,4,gl.FLOAT,false,stride,i*16);if(this.webgl2)gl.vertexAttribDivisor(loc,1);else this.instExt.vertexAttribDivisorANGLE(loc,1);}
      gl.bindBuffer(gl.ARRAY_BUFFER,this.instanceColorBuffer);gl.bufferData(gl.ARRAY_BUFFER,colors,gl.DYNAMIC_DRAW);gl.enableVertexAttribArray(this.instAttr.color);gl.vertexAttribPointer(this.instAttr.color,3,gl.FLOAT,false,12,0);if(this.webgl2)gl.vertexAttribDivisor(this.instAttr.color,1);else this.instExt.vertexAttribDivisorANGLE(this.instAttr.color,1);
      gl.uniformMatrix4fv(this.loc.ivp,false,this.viewProj);gl.uniform3fv(this.loc.ilight,this.lightDir);
      if(this.webgl2)gl.drawElementsInstanced(gl.TRIANGLES,mesh.count,gl.UNSIGNED_SHORT,0,count);else this.instExt.drawElementsInstancedANGLE(gl.TRIANGLES,mesh.count,gl.UNSIGNED_SHORT,0,count);
      for(let i=0;i<4;i++){if(this.webgl2)gl.vertexAttribDivisor(ma[i],0);else this.instExt.vertexAttribDivisorANGLE(ma[i],0);}if(this.webgl2)gl.vertexAttribDivisor(this.instAttr.color,0);else this.instExt.vertexAttribDivisorANGLE(this.instAttr.color,0);
    }
    project(world,w,h){const p=transformPoint(this.viewProj,world[0],world[1],world[2],1);if(p[3]<=.001)return null;const nx=p[0]/p[3],ny=p[1]/p[3],nz=p[2]/p[3];if(nz<-1||nz>1)return null;return {x:(nx*.5+.5)*w,y:(-.5*ny+.5)*h,z:nz};}
  }

  global.Mini3D={DEG,Renderer,compose,multiply:mat4Multiply,identity:mat4Identity,makeBox,makeCylinder,makeCone,makeSphere};
})(window);
