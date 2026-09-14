import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160/build/three.module.js';

const scene=new THREE.Scene();
scene.background=new THREE.Color(0x9fc7ff);
const camera=new THREE.PerspectiveCamera(55,innerWidth/innerHeight,.1,1000);
camera.position.set(0,8,12);
const renderer=new THREE.WebGLRenderer({antialias:true});
renderer.setSize(innerWidth,innerHeight);renderer.shadowMap.enabled=true;document.body.appendChild(renderer.domElement);
scene.add(new THREE.HemisphereLight(0xffffff,0x445577,2));
const road=new THREE.Mesh(new THREE.BoxGeometry(7,.2,80),new THREE.MeshStandardMaterial({color:0xf4f4f8}));
road.position.z=-35;scene.add(road);
let crowd=[];
function human(x,z){const h=new THREE.Mesh(new THREE.CapsuleGeometry(.12,.35,4,8),new THREE.MeshStandardMaterial({color:0x4287ff}));h.position.set(x,.5,z);scene.add(h);crowd.push(h)}
for(let i=0;i<10;i++)human((i%5-2)*.35,-i*.25);
const saw=new THREE.Mesh(new THREE.CylinderGeometry(.5,.5,.8,16),new THREE.MeshStandardMaterial({color:0xff4444}));saw.position.set(0,.5,-18);scene.add(saw);
let x=0,count=10,moon=0;const keys={};addEventListener('keydown',e=>keys[e.key]=true);addEventListener('keyup',e=>keys[e.key]=false);
function loop(){if(keys.ArrowLeft)x-=.05;if(keys.ArrowRight)x+=.05;x=Math.max(-2.5,Math.min(2.5,x));crowd.forEach(h=>{h.position.x+=(x-h.position.x)*.05;h.position.z+=.04});saw.rotation.z+=.1;camera.lookAt(0,0,-10);camera.position.x+=(x-camera.position.x)*.05;renderer.render(scene,camera);requestAnimationFrame(loop)}loop();