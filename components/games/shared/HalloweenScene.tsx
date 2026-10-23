import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

/** Real lit geometry, articulated limbs and deforming cloth on a single transparent stage. */
export default function HalloweenScene() {
 const host=useRef<HTMLDivElement>(null);
 useEffect(()=>{
  const element=host.current;if(!element)return;
  let renderer:THREE.WebGLRenderer;
  try{renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power'});}
  catch{element.dataset.renderer='unavailable';return;}
  element.dataset.renderer='webgl';renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));
  renderer.setClearColor(0,0);renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  element.appendChild(renderer.domElement);
  const scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(0,1000,0,800,.1,2000);
  camera.position.z=900;
  scene.add(new THREE.HemisphereLight(0xb6c5ff,0x2b1024,2));
  const light=new THREE.DirectionalLight(0xffdfab,3.5);light.position.set(-160,260,600);light.castShadow=true;
  light.shadow.mapSize.set(1024,1024);Object.assign(light.shadow.camera,{left:-1400,right:1400,top:1400,bottom:-1400,far:2000});light.shadow.normalBias=.06;scene.add(light);
  const rim=new THREE.DirectionalLight(0x9d70ff,2.5);rim.position.set(600,-200,180);scene.add(rim);
  const sphere=new THREE.SphereGeometry(1,24,16),geometries:THREE.BufferGeometry[]=[sphere],materials:THREE.Material[]=[];
  const material=(color:number,roughness=.35,metalness=.05,emissive=0)=>{const m=new THREE.MeshStandardMaterial({color,roughness,metalness,emissive,emissiveIntensity:1.2});materials.push(m);return m;};
  const black=material(0x201321,.23,.25),legsMat=material(0x463046,.3,.25),ivory=material(0xfff6d8),eye=material(0xffa329,.18,0,0xff6500);
  const orange=material(0xf27513,.3),stem=material(0x43642d,.65),cloth=material(0xe8f3ff,.3,.05,0x263448),wingMat=material(0x49253e,.42,.1);
  const ball=(parent:THREE.Object3D,mat:THREE.Material,x:number,y:number,z:number,sx:number,sy:number,sz:number)=>{const m=new THREE.Mesh(sphere,mat);m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.castShadow=true;parent.add(m);return m;};
  const tube=(parent:THREE.Object3D,points:number[][],radius:number,mat:THREE.Material)=>{
   const g=new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p as [number,number,number]))),12,radius,6,false);geometries.push(g);
   const m=new THREE.Mesh(g,mat);m.castShadow=true;parent.add(m);
  };
  const shape=(parent:THREE.Object3D,coords:number[][],mat:THREE.Material,z=0)=>{
   const s=new THREE.Shape();coords.forEach(([x,y],i)=>i?s.lineTo(x,y):s.moveTo(x,y));s.closePath();
   const g=new THREE.ExtrudeGeometry(s,{depth:2,bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:1.2,bevelThickness:1.2});geometries.push(g);
   const m=new THREE.Mesh(g,mat);m.position.z=z;m.castShadow=true;parent.add(m);
  };
  const spiders=Array.from({length:3},()=>{
   const group=new THREE.Group(),legs:THREE.Group[]=[];scene.add(group);
   ball(group,black,0,9,15,19,25,15);ball(group,legsMat,0,-16,16,14,15,12);
   for(const side of [-1,1])for(let i=0;i<4;i++){
    const pivot=new THREE.Group();pivot.position.set(side*10,-17+i*9,12);group.add(pivot);legs.push(pivot);
    tube(pivot,[[0,0,0],[side*(20+i*2),-27+i*12,8],[side*(39+i%2*7),-36+i*20,-9]],2.4,legsMat);
    ball(pivot,black,side*(20+i*2),-27+i*12,8,3.4,3.4,3.4);
   }
   for(const side of [-1,1]){ball(group,eye,side*5,-20,27,3.7,4.6,3);ball(group,eye,side*11,-14,25,1.8,2,2);tube(group,[[side*4,-28,17],[side*8,-34,17],[side*6,-36,24]],1.3,ivory);}
   return {group,legs};
  });
  const pumpkins=Array.from({length:2},()=>{
   const group=new THREE.Group();scene.add(group);
   for(let i=0;i<9;i++){const a=i*Math.PI*2/9;ball(group,orange,Math.cos(a)*12,0,Math.sin(a)*10,14,23,13);}
   tube(group,[[0,-19,0],[-3,-29,0],[3,-33,0]],3.5,stem);
   for(const side of [-1,1])shape(group,[[side*5,-7],[side*17,-5],[side*12,-15]],eye,23);
   shape(group,[[-18,4],[-9,8],[-5,4],[0,10],[7,5],[17,2],[12,14],[0,19],[-13,13]],black,24);
   return group;
  });
  const ghosts=Array.from({length:2},()=>{
   const group=new THREE.Group();scene.add(group);
   const geo=new THREE.SphereGeometry(1,40,28),pos=geo.getAttribute('position') as THREE.BufferAttribute,original=Float32Array.from(pos.array);geometries.push(geo);
   const body=new THREE.Mesh(geo,cloth);body.castShadow=true;group.add(body);
   for(const side of [-1,1]){const arm=ball(group,cloth,side*40,6,0,13,30,12);arm.rotation.z=side*-.7;const socket=ball(group,black,side*14,-17,31,8,12,3);socket.rotation.z=side*.12;ball(group,ivory,side*15,-20,34,2,3,1);}
   ball(group,black,0,15,34,10,17,3);return {group,geo,pos,original};
  });
  const bats=Array.from({length:4},()=>{
   const group=new THREE.Group(),wings:THREE.Group[]=[];scene.add(group);
   ball(group,black,0,0,0,7,13,7);ball(group,black,0,-10,1,9,8,7);
   for(const side of [-1,1]){const wing=new THREE.Group();group.add(wing);wings.push(wing);
    shape(wing,[[side*4,-5],[side*16,-24],[side*43,-32],[side*34,-14],[side*43,-2],[side*27,-4],[side*15,9],[side*7,8]],wingMat);
    tube(wing,[[side*6,-3,3],[side*17,-20,4],[side*40,-30,3]],.8,legsMat);
    shape(group,[[side*3,-15],[side*9,-27],[side*12,-13]],black);ball(group,eye,side*4,-10,7,1.7,2,1.2);
   }return {group,wings};
  });
  // The camera uses screen-like downward Y coordinates; flip each model once to match.
  const stage=new THREE.Group();for(const object of [...spiders.map(s=>s.group),...pumpkins,...ghosts.map(g=>g.group),...bats.map(b=>b.group)]){scene.remove(object);stage.add(object);}stage.scale.y=-1;scene.add(stage);
  const shadowMat=new THREE.ShadowMaterial({opacity:.25});materials.push(shadowMat);
  const shadowGeo=new THREE.PlaneGeometry(1,1);geometries.push(shadowGeo);
  const ground=new THREE.Mesh(shadowGeo,shadowMat);ground.position.z=-35;ground.receiveShadow=true;scene.add(ground);
  let width=1000,height=800,request=0,last=0,elapsed=0,dirty=true;
  const motion=matchMedia('(prefers-reduced-motion: reduce)');
  const resize=()=>{dirty=true;const r=element.getBoundingClientRect();width=Math.max(1,r.width);height=Math.max(1,r.height);renderer.setSize(width,height);camera.right=width;camera.bottom=-height;camera.updateProjectionMatrix();ground.position.set(width/2,-height/2,-35);ground.scale.set(width,height,1);};
  const observer=new ResizeObserver(resize);observer.observe(element);resize();
  const changed=()=>{dirty=true;};motion.addEventListener('change',changed);
  const draw=(now:number)=>{
   request=requestAnimationFrame(draw);if(document.hidden){last=now;return;}if(now-last<1000/30)return;if(motion.matches&&!dirty){last=now;return;}dirty=false;
   elapsed+=Math.min((now-last)/1000,.05);last=now;
   const t=motion.matches?0:elapsed,scale=Math.min(1.15,Math.max(.65,width/1100));
   spiders.forEach(({group,legs},i)=>{
    const p=((t+i*9)%[32,41,47][i])/[32,41,47][i];group.visible=motion.matches?i===0:p<.7;
    if(i===2){group.position.set(width*.07+Math.sin(t*.5)*15,-90+p*(height+180)/.7,45);group.rotation.z=Math.PI;}
    else{group.position.set(i===0?-100+p*(width+200)/.7:width+100-p*(width+200)/.7,height*[.23,.74][i]+Math.sin(t*.9)*22,45);group.rotation.z=i===0?Math.PI/2:-Math.PI/2;}
    if(motion.matches)group.position.set(42,65,45);group.scale.setScalar(scale*(i===1?.85:1));group.rotation.x=.2;
    legs.forEach((leg,j)=>{leg.rotation.z=Math.sin(t*14+j*Math.PI*.85)*.24;leg.rotation.x=Math.max(0,Math.sin(t*14+j*Math.PI*.85))*.28;});
   });
   pumpkins.forEach((group,i)=>{group.position.set(i?width-37:37,height-36,30);group.rotation.set(-.12,Math.sin(t*.7+i)*.25,Math.sin(t*.8+i)*.045);group.scale.setScalar(scale);});
   ghosts.forEach(({group,pos,geo,original},i)=>{
    const age=(t+(i?13:0))%(i?43:31)-6;group.visible=!motion.matches&&age>0&&age<4;
    if(!group.visible)return;
    const grow=Math.min(1,Math.max(0,age/.4)),fade=Math.min(1,Math.max(0,(4-age)/1.2));group.scale.setScalar(scale*(.3+grow*.9)*fade);
    group.position.set(width*(i?.18:.65),height-110-Math.sin(Math.max(0,age)/4*Math.PI)*110,70+grow*45);group.rotation.set(Math.sin(t*2)*.12,Math.sin(t*2.5)*.35,Math.sin(t*3)*.1);
    for(let j=0;j<pos.count;j++){const x=original[j*3],y=original[j*3+1],z=original[j*3+2],a=Math.atan2(z,x),lower=Math.max(0,-y),r=y>0?Math.sqrt(Math.max(0,1-y*y)):1-lower*.12,sway=lower*Math.sin(a*5+t*3)*4;pos.setXYZ(j,Math.cos(a)*r*35+sway,-y*49+lower*(Math.cos(a*6+t*3)*7+6),Math.sin(a)*r*30);}
    pos.needsUpdate=true;geo.computeVertexNormals();
   });
   bats.forEach(({group,wings},i)=>{const p=((t+i*4)%29)/29;group.visible=!motion.matches&&p<.7;group.position.set(-90+p*(width+180)/.7,height*.12+Math.sin(t*1.4+i)*30+i*17,60);group.rotation.set(.2,Math.sin(t+i)*.2,-.18);group.scale.setScalar(scale*(.65+i*.09));wings.forEach((wing,j)=>wing.rotation.y=Math.sin(t*17+i)*.8*(j?1:-1));});
   renderer.render(scene,camera);
  };
  request=requestAnimationFrame(draw);
  const lost=(event:Event)=>{event.preventDefault();cancelAnimationFrame(request);element.dataset.renderer='unavailable';};renderer.domElement.addEventListener('webglcontextlost',lost);
  return ()=>{cancelAnimationFrame(request);observer.disconnect();motion.removeEventListener('change',changed);light.shadow.dispose();renderer.domElement.removeEventListener('webglcontextlost',lost);geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());renderer.dispose();renderer.domElement.remove();};
 },[]);
 return <div ref={host} className="halloween-3d-scene" data-testid="halloween-3d-scene" />;
}
