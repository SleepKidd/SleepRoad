'use strict';
// Coffee-house decor from the user-provided кофедом.zip / untitled1.blend. Visual only: no collision.
(()=>{
  const meta={"source":"untitled1.blend","sourceArchive":"кофедом.zip","sourceBlendSha256":"0b58f54cdcfd9ccfb608d5d75905d89e821ec40c7dadbd10424ca4f2fa5e8d79","sourceObjects":18,"sourceVerts":924,"sourcePolygons":844,"sourceLoops":3424,"runtimeVerts":924,"runtimeTris":1736,"materialGroups":9,"bounds":{"min":[-4.073522,0.0,-4.018871],"max":[4.073522,6.634546,4.018871]},"collision":false,"transport":"uint16 positions + int8 normals; geometry topology unchanged","geometry":"full source mesh topology with Blender object transforms; authoring ground plane excluded; no mesh decimation or source-geometry simplification"};
  const state={meta,ready:false,error:null,promise:null};
  window.SleepRoadCoffeeHouseModel=state;
  const packed=(window.SleepRoadCoffeeHousePacked||[]).join('');
  window.SleepRoadCoffeeHousePacked=null;
  const bytes=b64=>{const s=atob(b64),a=new Uint8Array(s.length);for(let i=0;i<s.length;i++)a[i]=s.charCodeAt(i)&255;return a;};
  const u16=b64=>{const b=bytes(b64),v=new DataView(b.buffer,b.byteOffset,b.byteLength),a=new Uint16Array(b.byteLength>>1);for(let i=0;i<a.length;i++)a[i]=v.getUint16(i*2,true);return a;};
  const i8=b64=>{const b=bytes(b64),a=new Int8Array(b.length);for(let i=0;i<b.length;i++)a[i]=b[i]>127?b[i]-256:b[i];return a;};
  const expand=data=>{const qp=u16(data.p16),qn=i8(data.n8),positions=new Float32Array(qp.length),normals=new Float32Array(qn.length);for(let i=0;i<qp.length;i++){const j=i%3;positions[i]=data.qmin[j]+qp[i]/65535*data.qspan[j];normals[i]=qn[i]/127;}return{positions,normals,groups:data.groups.map(g=>({name:g.name,color:g.color,emissive:g.emissive||0,tris:g.tris,indices:u16(g.i16)}))};};
  state.promise=(async()=>{
    if(packed.length!==17532)throw new Error('Coffee-house packed data length mismatch: '+packed.length);
    if(typeof DecompressionStream!=='function')throw new Error('DecompressionStream is unavailable');
    const stream=new Blob([bytes(packed)]).stream().pipeThrough(new DecompressionStream('gzip'));
    const data=JSON.parse(await new Response(stream).text());
    if(data.meta?.sourceBlendSha256!==meta.sourceBlendSha256)throw new Error('Coffee-house source metadata mismatch');
    Object.assign(state,data);
    state.meta=data.meta;
    state.expand=()=>state.__expanded||(state.__expanded=expand(data));
    state.ready=true;
    return state;
  })().catch(err=>{state.error=String(err);console.error('Sleep Road coffee-house model failed:',err);return state;});
})();
