import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { PlinkoFrame, PLINKO_BLOB_NODES, plinkoLandingSink, projectPlinkoPoint } from '../../utils/plinko';

type Props={sample:PlinkoFrame};
/** Live geometry, not an enlarged sprite: the collision spring ring drives every vertex. */
export default function PlinkoBlob({sample}:Props){
 const host=useRef<HTMLDivElement>(null),latest=useRef(sample);
 const [fallback,setFallback]=useState(false);
 latest.current=sample;
 useEffect(()=>{
  const element=host.current;if(!element)return;
  let renderer:THREE.WebGLRenderer;
  try{renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power'});}catch{setFallback(true);return;}
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.75));
  renderer.setClearColor(0,0);renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1;
  element.appendChild(renderer.domElement);
  const scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(0,560,640,0,.1,1500);
  camera.position.z=800;
  const pmrem=new THREE.PMREMGenerator(renderer),room=new RoomEnvironment(),environment=pmrem.fromScene(room,.04);
  scene.environment=environment.texture;room.dispose();pmrem.dispose();
  scene.add(new THREE.HemisphereLight(0xdcfaff,0x254b27,1));
  const key=new THREE.DirectionalLight(0xfff6d6,2);key.position.set(-100,700,500);scene.add(key);
  const rim=new THREE.DirectionalLight(0x6dedff,1.4);rim.position.set(560,250,150);scene.add(rim);
  const body=new THREE.Group();scene.add(body);
  const material=new THREE.MeshPhysicalMaterial({color:0x079c22,envMapIntensity:.35,roughness:.24,metalness:0,clearcoat:1,clearcoatRoughness:.15,ior:1.38, sheen:.18,sheenColor:new THREE.Color(0x55ec66)});
  const geometry=new THREE.SphereGeometry(1,80,48),positions=geometry.getAttribute('position') as THREE.BufferAttribute,original=Float32Array.from(positions.array);
  const jelly=new THREE.Mesh(geometry,material);jelly.frustumCulled=false;body.add(jelly);
  const white=new THREE.MeshStandardMaterial({color:0xfffff0,roughness:.22}),dark=new THREE.MeshStandardMaterial({color:0x122c1b,roughness:.2}),pink=new THREE.MeshStandardMaterial({color:0xf8b0a6,roughness:.4});
  const sphere=new THREE.SphereGeometry(1,20,12),eyes:THREE.Mesh[]=[],pupils:THREE.Mesh[]=[],cheeks:THREE.Mesh[]=[];
  for(let i=0;i<2;i++){
   const eye=new THREE.Mesh(sphere,white),pupil=new THREE.Mesh(sphere,dark),cheek=new THREE.Mesh(sphere,pink);
   body.add(eye,pupil,cheek);eyes.push(eye);pupils.push(pupil);cheeks.push(cheek);
  }
  const smileGeometry=new THREE.TorusGeometry(1,.13,8,32,Math.PI),smile=new THREE.Mesh(smileGeometry,dark);smile.rotation.z=Math.PI;body.add(smile);
  const scream=new THREE.Mesh(sphere,dark),tongue=new THREE.Mesh(sphere,pink),tooth=new THREE.Mesh(sphere,white);
  const brows=[new THREE.Mesh(smileGeometry,dark),new THREE.Mesh(smileGeometry,dark)];
  body.add(scream,tongue,tooth,...brows);
  const dropletMaterial=material.clone(),droplets=Array.from({length:20},()=>{const mesh=new THREE.Mesh(sphere,dropletMaterial);mesh.visible=false;scene.add(mesh);return mesh;});
  let dirty=true,drawn:PlinkoFrame|undefined;
  const resize=()=>{dirty=true;const bounds=element.getBoundingClientRect();renderer.setSize(Math.max(1,bounds.width),Math.max(1,bounds.height));};
  const observer=new ResizeObserver(resize);observer.observe(element);resize();
  const contextLost=(event:Event)=>{event.preventDefault();setFallback(true);};renderer.domElement.addEventListener('webglcontextlost',contextLost);
  let request=0;
  const render=()=>{
   const frame=latest.current;
   if(frame===drawn&&!dirty){request=requestAnimationFrame(render);return;}
   drawn=frame;dirty=false;
   const skin=frame.blob,p=projectPlinkoPoint(frame),sink=plinkoLandingSink(frame.landing),shrink=1-sink*.5;
   const points=skin?.points??Array.from({length:PLINKO_BLOB_NODES},(_,i)=>({x:Math.cos(i*Math.PI*2/PLINKO_BLOB_NODES)*9.5,y:Math.sin(i*Math.PI*2/PLINKO_BLOB_NODES)*9.5}));
   const width=Math.max(...points.map(p=>Math.abs(p.x))),height=Math.max(...points.map(p=>Math.abs(p.y))),deflated=skin?.phase==='deflated';
   const terrified=skin?.reactionAt!==undefined||!!skin?.burst;
   const lookProgress=terrified?Math.min(1,Math.max(0,(frame.time-(skin?.reactionAt??frame.time))/.08)):0;
   const lookEase=lookProgress*lookProgress*(3-2*lookProgress);
   const depth=Math.max(4,Math.min(width,height)*(deflated?.3:.72));
   for(let i=0;i<positions.count;i++){
    const ux=original[i*3],uy=original[i*3+1],uz=original[i*3+2],angle=(Math.atan2(-uy,ux)+Math.PI*2)%(Math.PI*2),index=angle/(Math.PI*2)*points.length,a=Math.floor(index),t=index-a;
    const radius=(j:number)=>{const q=points[(j+points.length)%points.length];return Math.hypot(q.x,q.y);},r0=radius(a-1),r1=radius(a),r2=radius(a+1),r3=radius(a+2);
    const r=Math.max(2,.5*((2*r1)+(-r0+r2)*t+(2*r0-5*r1+4*r2-r3)*t*t+(-r0+3*r1-3*r2+r3)*t*t*t));
    const planar=Math.hypot(ux,uy),wave=deflated?Math.sin(angle*3+frame.time*15)*.2:0;
    positions.setXYZ(i,planar>.00001?ux/planar*r*planar*.82:0,planar>.00001?uy/planar*r*planar*.92:0,uz*depth*(1+wave));
   }
   positions.needsUpdate=true;geometry.computeVertexNormals();geometry.computeBoundingSphere();
   body.position.set(p.x,640-p.y-sink*26,0);body.scale.setScalar(shrink);
   body.rotation.z=deflated?Math.sin(frame.time*15)*.4:0;
   body.rotation.y=skin?.phase==='startled'?(frame.x<280?-.13:.13)*(1-lookEase):0;
   body.visible=sink<.99;
   // Face pieces sit on the jelly surface and stay readable without stretching the eyes.
   const faceSize=Math.max(3,Math.min(15+7*lookEase,width*.15)),spacing=Math.min(width*.3,faceSize*1.65),eyeY=Math.min(height*.16,faceSize*.7);
   const blink=terrified?1:Math.sin(frame.time*1.9)>.992?.15:1;
   for(let i=0;i<2;i++){
    const x=(i?1:-1)*spacing,z=depth*Math.sqrt(Math.max(.1,1-(x/(width*.82))**2-(eyeY/(height*.92))**2));
    eyes[i].position.set(x,eyeY,z);eyes[i].scale.set(faceSize*.85,faceSize*(terrified?1.2:blink),faceSize*.46);
    // Centre the pupils on the lens as the large shocked face snaps forward.
    pupils[i].position.set(x+Math.sin(frame.time*2)*faceSize*.1*(1-lookEase),eyeY-faceSize*.08*(1-lookEase),z+faceSize*.4);pupils[i].scale.set(faceSize*(terrified?.22:.4),faceSize*(terrified?.3:.58*blink),faceSize*.22);
    cheeks[i].position.set(x*1.45,-faceSize*.85,z*.9);cheeks[i].scale.set(faceSize*.55,faceSize*.23,faceSize*.18);
    cheeks[i].visible=!terrified;brows[i].visible=terrified;
    brows[i].position.set(x,eyeY+faceSize*1.6,z);brows[i].scale.set(faceSize*.8,faceSize*.45,faceSize*.3);brows[i].rotation.z=(i?-.25:.25);
   }
   smile.visible=!terrified;scream.visible=tongue.visible=tooth.visible=terrified;
   smile.position.set(0,-faceSize*.6,depth*.98);smile.scale.set(faceSize*.8,faceSize*.65,faceSize*.65);
   scream.position.set(0,-faceSize*.95,depth*.99);scream.scale.set(faceSize*.7,faceSize*1.05*Math.max(.2,lookEase),faceSize*.18);
   tongue.position.set(0,-faceSize*1.55,depth+faceSize*.18);tongue.scale.set(faceSize*.4,faceSize*.3,faceSize*.08);
   tooth.position.set(0,-faceSize*.18,depth+faceSize*.17);tooth.scale.set(faceSize*.43,faceSize*.17,faceSize*.08);
   const burst=skin?.burst,age=burst?frame.time-burst.time:-1;
   droplets.forEach((drop,i)=>{
    drop.visible=age>=0&&age<1.2;
    if(!drop.visible||!burst)return;
    const origin=projectPlinkoPoint(burst),a=i*2.399,speed=26+(i%5)*16;
    drop.position.set(origin.x+Math.cos(a)*speed*age,640-origin.y-Math.sin(a)*speed*age-age*age*65,8+i);
    const r=(2+i%3)*Math.max(0,1-age/1.2);drop.scale.set(r*.8,r*(1.2+age),r*.7);drop.rotation.z=a+age*4;
   });
   element.dataset.phase=skin?.phase??'falling';element.dataset.face=terrified?'scream':'smile';element.dataset.gaze=terrified?(lookEase>=.99?'camera':'turning'):'wandering';element.dataset.skinWidth=String(width*2);element.dataset.skinHeight=String(height*2);
   renderer.render(scene,camera);request=requestAnimationFrame(render);
  };
  render();
  return ()=>{
   cancelAnimationFrame(request);observer.disconnect();renderer.domElement.removeEventListener('webglcontextlost',contextLost);
   geometry.dispose();sphere.dispose();smileGeometry.dispose();[material,white,dark,pink,dropletMaterial].forEach(m=>m.dispose());environment.dispose();renderer.dispose();renderer.domElement.remove();
  };
 },[]);
 const p=projectPlinkoPoint(sample),skin=sample.blob,scared=skin?.reactionAt!==undefined||!!skin?.burst;
 return <div ref={host} className="plinko-blob-3d" data-testid="plinko-blob-body" data-renderer={fallback?'svg-fallback':'webgl'} aria-hidden="true">
  {fallback&&<svg viewBox="0 0 560 640" preserveAspectRatio="none"><defs><radialGradient id="blob-fallback"><stop stopColor="#8cf5a0"/><stop offset=".5" stopColor="#10b43b"/><stop offset="1" stopColor="#067326"/></radialGradient></defs><g transform={`translate(${p.x} ${p.y})`} opacity={1-plinkoLandingSink(sample.landing)}><path d={(skin?.points??[]).map((q,i)=>`${i?'L':'M'}${q.x*.82} ${q.y*.92}`).join(' ')+'Z'} fill="url(#blob-fallback)" stroke="#42e961" strokeWidth="1"/><ellipse cx="-4" cy="-2" rx="2" ry="3" fill="white"/><ellipse cx="4" cy="-2" rx="2" ry="3" fill="white"/><ellipse cx="-4" cy="-2" rx={scared?.65:1} ry={scared?.8:1.5} fill="#152f20"/><ellipse cx="4" cy="-2" rx={scared?.65:1} ry={scared?.8:1.5} fill="#152f20"/>{scared?<><ellipse data-testid="dumpling-scream-mouth" cy="4" rx="2.3" ry="3.5" fill="#152f20"/><path d="M-6 -7Q-4 -9 -2 -7M2 -7Q4 -9 6 -7" fill="none" stroke="#152f20" strokeWidth="1"/></>:<path d="M-3 3Q0 7 3 3" fill="none" stroke="#193d22" strokeWidth="1.5"/>}</g></svg>}
 </div>;
}
