/* ════════════════════════════════════════════════════════════
   GAME.JS v3 — FPS 3D COMPLET
   Three.js r128 · ZQSD+Souris · Lampe torche · Collisions AABB
   ════════════════════════════════════════════════════════════ */
'use strict';

// ── ÉTAT ─────────────────────────────────────────────────────
const G={chapter:0,scene:'',inventory:[],notes:[],flags:{},selectedItem:null,paused:false,dialogActive:false,puzzleActive:false,options:{volume:0.7,brightness:0.8,flashOn:true},_typeTimer:null};

// ── THREE.JS ──────────────────────────────────────────────────
let renderer,scene,camera,flashlight,flashTarget;
let roomGroup=null,interactables=[],roomColliders=[],doorTriggers=[],animLights=[];
let gameRunning=false,loopId=null;
const clock=new THREE.Clock();

// ── CONSTANTES ────────────────────────────────────────────────
const PH=1.72,PR=0.38,SPD=4.5;
const C={DW:0x0c0608,DARK:0x080405,FL:0x0a0507,CL:0x060304,MT:0x151418,MTD:0x0e0c10,ST:0x181015,STD:0x100d12,BL:0x3a0505,CN:0x141214,WD:0x1a0e08,TC:0x2a1500};

// ── FPS CONTROLS ──────────────────────────────────────────────
const Ctrl={locked:false,yaw:0,pitch:0,keys:{},bobT:0,stepT:0,
  init(){
    const cv=renderer.domElement;
    cv.addEventListener('click',()=>{if(gameRunning&&!G.dialogActive&&!G.puzzleActive&&!G.paused)cv.requestPointerLock();});
    document.addEventListener('pointerlockchange',()=>{
      Ctrl.locked=document.pointerLockElement===cv;
      const h=document.getElementById('ptr-hint');
      if(h)h.style.display=Ctrl.locked?'none':'flex';
    });
    document.addEventListener('mousemove',e=>{
      if(!Ctrl.locked||G.paused||G.dialogActive||G.puzzleActive)return;
      Ctrl.yaw-=e.movementX*0.0018;Ctrl.pitch-=e.movementY*0.0018;
      Ctrl.pitch=Math.max(-1.2,Math.min(1.2,Ctrl.pitch));
      camera.rotation.order='YXZ';camera.rotation.y=Ctrl.yaw;camera.rotation.x=Ctrl.pitch;
    });
    document.addEventListener('keydown',e=>{
      Ctrl.keys[e.code]=true;
      if(e.code==='KeyE'&&currentTarget){e.preventDefault();handleAction(currentTarget.userData);}
      if(e.code==='KeyF'){G.options.flashOn=!G.options.flashOn;flashlight.visible=G.options.flashOn;Audio.play('click');}
      if((e.code==='Space'||e.code==='Enter')){e.preventDefault();if(G.dialogActive)advanceDialog();}
      if(e.code==='Escape'){
        if(document.pointerLockElement)document.exitPointerLock();
        if(G.puzzleActive)closePuzzle();
        else if(!document.getElementById('note-reader').classList.contains('hidden'))closeNote();
        else togglePause();
      }
    });
    document.addEventListener('keyup',e=>{delete Ctrl.keys[e.code];});
    document.addEventListener('mousedown',e=>{if(e.button===0&&Ctrl.locked&&currentTarget&&!G.dialogActive&&!G.puzzleActive)handleAction(currentTarget.userData);});
  },
  update(dt){
    if(!Ctrl.locked||G.paused||G.puzzleActive)return;
    const fwd=Ctrl.keys['KeyZ']||Ctrl.keys['KeyW'],bk=Ctrl.keys['KeyS'],lt=Ctrl.keys['KeyQ']||Ctrl.keys['KeyA'],rt=Ctrl.keys['KeyD'];
    if(!fwd&&!bk&&!lt&&!rt){camera.position.y+=(PH-camera.position.y)*Math.min(1,dt*8);return;}
    const d=new THREE.Vector3();
    if(fwd)d.z-=1;if(bk)d.z+=1;if(lt)d.x-=1;if(rt)d.x+=1;
    d.normalize().multiplyScalar(SPD*dt);
    d.applyAxisAngle(new THREE.Vector3(0,1,0),Ctrl.yaw);
    const np=camera.position.clone();np.x+=d.x;np.z+=d.z;
    if(!collide(np)){camera.position.x=np.x;camera.position.z=np.z;}
    else{
      const nx=new THREE.Vector3(camera.position.x+d.x,camera.position.y,camera.position.z);
      const nz=new THREE.Vector3(camera.position.x,camera.position.y,camera.position.z+d.z);
      if(!collide(nx))camera.position.x=nx.x;
      if(!collide(nz))camera.position.z=nz.z;
    }
    Ctrl.bobT+=dt*11;camera.position.y=PH+Math.sin(Ctrl.bobT)*0.036;
    Ctrl.stepT-=dt;
    if(Ctrl.stepT<=0){Audio.play(['basement','lab_main','ritual_chamber'].includes(G.scene)?'footstep_concrete':'footstep');Ctrl.stepT=0.42;}
    checkDoors();
  }
};

// ── COLLISION ─────────────────────────────────────────────────
function collide(p){for(const b of roomColliders)if(p.x>b.x0-PR&&p.x<b.x1+PR&&p.z>b.z0-PR&&p.z<b.z1+PR)return true;return false;}
function coll(x0,z0,x1,z1){roomColliders.push({x0,z0,x1,z1});}

// ── DOORS ─────────────────────────────────────────────────────
function checkDoors(){
  const p=camera.position;
  for(const d of doorTriggers)if(p.x>d.x0&&p.x<d.x1&&p.z>d.z0&&p.z<d.z1){gotoRoom(d.room,d.sx,d.sz,d.yaw??0);break;}
}
function doorTrig(x0,z0,x1,z1,room,sx,sz,yaw=0){doorTriggers.push({x0,z0,x1,z1,room,sx,sz,yaw});}

// ── FADE ──────────────────────────────────────────────────────
let fadeEl=null;
function fade(ms,cb){fadeEl.style.transition=`opacity ${ms/1000}s ease`;fadeEl.style.opacity='1';fadeEl.style.pointerEvents='all';setTimeout(()=>{cb();setTimeout(()=>{fadeEl.style.opacity='0';fadeEl.style.pointerEvents='none';},80);},ms);}

// ── RAYCASTER ─────────────────────────────────────────────────
const RAY=new THREE.Raycaster(new THREE.Vector3(),new THREE.Vector3(),0,3.5);
const SCV=new THREE.Vector2(0,0);
let currentTarget=null;
function updateRay(){
  if(!gameRunning||G.paused||G.dialogActive||G.puzzleActive)return;
  RAY.setFromCamera(SCV,camera);
  const hits=RAY.intersectObjects(interactables,false);
  const el=document.getElementById('i-hint');
  if(hits.length>0&&hits[0].object.userData.interactive){
    currentTarget=hits[0].object;
    if(el){el.style.display='block';el.textContent='[ E ]  '+currentTarget.userData.label;}
  }else{currentTarget=null;if(el)el.style.display='none';}
}

// ── THREE.JS INIT ─────────────────────────────────────────────
function initThree(){
  const cv=document.getElementById('scene-canvas');
  cv.width=window.innerWidth;cv.height=window.innerHeight;
  renderer=new THREE.WebGLRenderer({canvas:cv,antialias:true,powerPreference:'high-performance'});
  renderer.setSize(window.innerWidth,window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  renderer.setClearColor(0x000000);renderer.toneMapping=THREE.ReinhardToneMapping;renderer.toneMappingExposure=0.78;
  scene=new THREE.Scene();scene.fog=new THREE.FogExp2(0x000000,0.07);
  camera=new THREE.PerspectiveCamera(78,window.innerWidth/window.innerHeight,0.05,55);
  camera.position.set(0,PH,0);camera.rotation.order='YXZ';scene.add(camera);
  // Flashlight on camera
  flashlight=new THREE.SpotLight(0xffe8b0,4.5,22,Math.PI/8.5,0.35,1.8);
  flashlight.castShadow=true;flashlight.shadow.mapSize.set(512,512);
  flashlight.shadow.camera.near=0.1;flashlight.shadow.camera.far=22;
  flashlight.position.set(0.18,-0.12,0);
  flashTarget=new THREE.Object3D();flashTarget.position.set(0,-0.08,-1);
  camera.add(flashlight);camera.add(flashTarget);flashlight.target=flashTarget;
  scene.add(new THREE.AmbientLight(0x060307,2.5));
  window.addEventListener('resize',()=>{
    renderer.setSize(window.innerWidth,window.innerHeight);
    camera.aspect=window.innerWidth/window.innerHeight;camera.updateProjectionMatrix();
    cv.width=window.innerWidth;cv.height=window.innerHeight;
  });
}

// ── MESH HELPERS ─────────────────────────────────────────────
function mat(col,rough=0.92,metal=0.05,em=0x000000,ei=0){return new THREE.MeshStandardMaterial({color:col,roughness:rough,metalness:metal,emissive:em,emissiveIntensity:ei});}
function bmat(col,op=1){return new THREE.MeshBasicMaterial({color:col,transparent:op<1,opacity:op});}
function bx(w,h,d,m,x=0,y=0,z=0,ry=0){const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);mesh.position.set(x,y,z);mesh.rotation.y=ry;mesh.castShadow=true;mesh.receiveShadow=true;return mesh;}
function plight(g,col,i,dist,x,y,z){const l=new THREE.PointLight(col,i,dist);l.position.set(x,y,z);g.add(l);return l;}
function animL(l,base,freq,amp){animLights.push({l,base,freq,amp});}
function inter(mesh,label,action,g){mesh.userData={interactive:true,label,action};interactables.push(mesh);if(g)g.add(mesh);}

// Build a closed room: floor, ceiling, 4 walls with optional door gaps on N/S
function buildRoom(g,W,H,D,col,dN=false,dS=false){
  const DW=2.3,DH=2.5;
  g.add(bx(W,0.12,D,mat(C.FL,0.97),0,-0.06,0)); // floor
  g.add(bx(W,0.12,D,mat(C.CL,0.98),0,H+0.06,0)); // ceil
  // West & East walls (full)
  g.add(bx(0.28,H,D,mat(col,0.98),-W/2,H/2,0));coll(-W/2-0.3,- D/2,- W/2+0.3,D/2);
  g.add(bx(0.28,H,D,mat(col,0.98), W/2,H/2,0));coll( W/2-0.3,-D/2,  W/2+0.3,D/2);
  // South wall
  if(dS){g.add(bx(W/2-DW/2,H,0.28,mat(col,0.98),-W/4,H/2,D/2));g.add(bx(W/2-DW/2,H,0.28,mat(col,0.98),W/4,H/2,D/2));g.add(bx(DW,H-DH,0.28,mat(col,0.98),0,H-(H-DH)/2,D/2));}
  else{g.add(bx(W,H,0.28,mat(col,0.98),0,H/2,D/2));coll(-W/2,D/2-0.3,W/2,D/2+0.3);}
  // North wall
  if(dN){g.add(bx(W/2-DW/2,H,0.28,mat(col,0.98),-W/4,H/2,-D/2));g.add(bx(W/2-DW/2,H,0.28,mat(col,0.98),W/4,H/2,-D/2));g.add(bx(DW,H-DH,0.28,mat(col,0.98),0,H-(H-DH)/2,-D/2));}
  else{g.add(bx(W,H,0.28,mat(col,0.98),0,H/2,-D/2));coll(-W/2,-D/2-0.3,W/2,-D/2+0.3);}
}

function shelf(g,x,z){
  g.add(bx(2,2.2,0.06,mat(C.MTD,0.9),x,1.1,z));
  for(let s=0;s<3;s++){g.add(bx(2,0.04,0.38,mat(C.MTD,0.8),x,0.38+s*0.85,z-0.17));for(let b=0;b<4;b++)g.add(bx(0.3,0.26,0.28,mat(C.TC,0.95),x-0.7+b*0.46,0.51+s*0.85,z-0.17));}
  coll(x-1.05,z-0.22,x+1.05,z+0.1);
}
function bench(g,x,z,w=2){g.add(bx(w,0.07,0.75,mat(C.MT,0.4,0.5),x,0.92,z));g.add(bx(w,0.88,0.75,mat(C.MTD),x,0.44,z));coll(x-w/2-0.1,z-0.42,x+w/2+0.1,z+0.42);}
function candle(g,x,z){g.add(bx(0.07,0.22,0.07,mat(0xd4b060,0.8),x,0.11,z));g.add(bx(0.05,0.07,0.05,bmat(0xff9900),x,0.29,z));const l=plight(g,0xff7700,0.5,2.5,x,0.5,z);animL(l,0.45,3+Math.random()*2,0.15);}
function jar(g,x,z){const m=new THREE.Mesh(new THREE.CylinderGeometry(0.1,0.085,0.3,8),new THREE.MeshStandardMaterial({color:0x001a18,transparent:true,opacity:0.65,roughness:0.1,metalness:0.15}));m.position.set(x,0.82,z);g.add(m);plight(g,0x004422,0.12,0.7,x,0.9,z);g.add(bx(0.06,0.06,0.06,mat(0x3a1800,0.8,0,0xff2200,0.5),x,0.82,z));return m;}

// ════════════════════════════════════════════════════════════
// ROOMS
// ════════════════════════════════════════════════════════════
const ROOMS={};

// ── EXTÉRIEUR ───────────────────────────────────────────────
ROOMS.fastfood_outside={name:'Parking Abandonné — TastyCrousty Inc.',ambient:'factory',creaks:'low',fog:0.022,sp:{x:0,z:9},sy:Math.PI,
build(){
  const g=new THREE.Group();
  // Ground
  g.add(bx(28,0.12,32,mat(0x080608,0.97)));
  // Side/back walls (open top)
  g.add(bx(0.3,8,32,mat(C.DARK,0.98),-14,4,0));coll(-14.3,-16,-13.7,16);
  g.add(bx(0.3,8,32,mat(C.DARK,0.98), 14,4,0));coll( 13.7,-16,14.3,16);
  g.add(bx(28,8,0.3,mat(C.DARK,0.98),0,4,16));coll(-14,15.7,14,16.3);
  // Facade nord
  g.add(bx(9,6,0.3,mat(0x0e0810,0.98),-5.5,3,-14));
  g.add(bx(9,6,0.3,mat(0x0e0810,0.98), 5.5,3,-14));
  g.add(bx(3.5,1.4,0.3,mat(0x0e0810,0.98),0,DH_lintel(),-14));
  g.add(bx(28,0.3,0.3,mat(0x0e0810),0,6.5,-14));
  coll(-14,-14.3,-2.4,-13.7);coll(2.4,-14.3,14,-13.7);
  function DH_lintel(){return 3.45;}
  // Enseigne lumineuse
  g.add(bx(7.8,1,0.14,mat(0x1a0800,0.4,0.1),0,5,-14.1));
  g.add(bx(7.5,0.7,0.04,mat(0xcc5500,0.2,0,0xcc4400,0.72),0,5,-14.04));
  const sl=plight(g,0xdd6600,0.8,6,0,5.5,-13.5);animL(sl,0.7,0.7,0.3);
  // Fenêtres (lueur rouge inside)
  [[-5,2.5],[-5,4],[5,2.5],[5,4]].forEach(([wx,wy])=>{
    g.add(bx(1.3,0.9,0.08,bmat(0x100202,0.8),wx,wy,-14.12));
    const wl=plight(g,0x1a0000,0.15,2.5,wx,wy,-13.8);animL(wl,0.12,1.2,0.06);
  });
  // Benne
  const dump=bx(1.8,1.2,0.9,mat(0x1c1c1c,0.85,0.2),7,0.6,5);
  inter(dump,'Fouiller la poubelle','search_dumpster',g);coll(6.1,4.55,7.9,5.45);
  g.add(bx(1.8,0.08,0.9,mat(0x282828,0.7,0.3),7,1.25,5));
  // Papier au sol
  const paper=bx(0.14,0.01,0.1,mat(0x8a7a5a),-1,0.01,-11.5);
  inter(paper,'Lire le mémo','read_memo_w1',g);
  // Fissures sol
  for(let i=0;i<10;i++){const cr=new THREE.Mesh(new THREE.PlaneGeometry(0.06,2+Math.random()*4),mat(0x050505));cr.rotation.set(-Math.PI/2,0,Math.random()*Math.PI);cr.position.set((Math.random()-.5)*22,0.01,(Math.random()-.5)*26);g.add(cr);}
  // Lumière de lune
  const moon=new THREE.DirectionalLight(0x060620,0.5);moon.position.set(8,12,6);g.add(moon);
  // Door trigger
  doorTrig(-1.6,-14.8,1.6,-13.4,'fastfood_dining',0,-3,0);
  return g;
},
onEnter(){if(!G.flags.outside_dialog){G.flags.outside_dialog=true;schedDlg('intro_outside',1500);}}
};

// ── SALLE À MANGER ───────────────────────────────────────────
ROOMS.fastfood_dining={name:'Salle à Manger — Zone Contaminée',ambient:'factory',creaks:'low',fog:0.085,sp:{x:0,z:5},sy:Math.PI,
build(){
  const g=new THREE.Group();const W=12,H=3.5,D=14;
  buildRoom(g,W,H,D,C.DW,true,true);
  doorTrig(-1.6,D/2-0.6,1.6,D/2+1.6,'fastfood_outside',0,8,0);
  doorTrig(-1.6,-D/2-1.4,1.6,-D/2+0.4,'fastfood_kitchen',0,4,Math.PI);
  // Menu board
  const mb=bx(4,2.2,0.06,mat(0x1a0c0e,0.5),0,2.2,-D/2+0.1);inter(mb,'Lire le menu','read_menu',g);
  // Comptoir
  const ctr=bx(4.2,1.05,0.8,mat(C.MTD,0.5,0.2),2,0.52,-3.5);inter(ctr,'Fouiller le comptoir','search_counter',g);
  g.add(bx(4.4,0.08,0.9,mat(C.MT,0.35,0.4),2,1.08,-3.5));coll(-0.1,-4.5,4.1,-3.1);
  // Tache de sang
  const st=new THREE.Mesh(new THREE.PlaneGeometry(0.9,0.65),mat(C.BL,0.7));
  st.rotation.x=-Math.PI/2;st.position.set(1,0.01,1);inter(st,'Examiner la tache','stain_inspect',g);
  // Tables renversées
  [[-2,0,0],[3.5,0,-1.5],[4,0,2.5],[-3.5,0,-2.5],[-4.5,0,3]].forEach(([x,,z])=>{
    const t=bx(1.5,0.07,0.8,mat(C.WD,0.8));t.position.set(x,0.55+Math.random()*0.4,z);t.rotation.set((Math.random()-.5)*.55,Math.random()*Math.PI,(Math.random()-.5)*.4);g.add(t);
    const ch=bx(0.48,0.04,0.46,mat(C.WD,0.85));ch.position.set(x+(Math.random()-.5),0.38+Math.random()*.55,z+(Math.random()-.5));ch.rotation.z=(Math.random()-.5)*.8;g.add(ch);
  });
  // Note au sol
  const note=bx(0.18,0.01,0.13,mat(0x8a7a5a),-3.8,0.01,-2.8);inter(note,'Griffonnage au sol','read_scratched',g);
  // Lumière rouge clignotante
  const rl=plight(g,0xff1100,0.35,7,0,H-0.3,-2);animL(rl,0.3,2.1,0.2);
  g.add(bx(0.08,0.08,0.08,bmat(0xff2200),0,H-0.2,-2));
  // Rayon de lune (cône visuel)
  const cone=new THREE.Mesh(new THREE.ConeGeometry(0.5,3,6),bmat(0x10102a,0.06));
  cone.position.set(W/2-1,1.5,-1.5);cone.rotation.z=Math.PI/8;g.add(cone);
  return g;
},
onEnter(){
  if(!G.flags.dining_entered){G.flags.dining_entered=true;schedDlg('act1_dining_enter',800);}
  if(G.chapter===2&&!G.flags.tens_shown){G.flags.tens_shown=true;schedDlg('act2_tension_start',1500);}
}
};

// ── CUISINE ──────────────────────────────────────────────────
ROOMS.fastfood_kitchen={name:'Cuisine Industrielle',ambient:'tension',creaks:'low',fog:0.11,sp:{x:0,z:3.5},sy:Math.PI,
build(){
  const g=new THREE.Group();const W=10,H=3,D=10;
  buildRoom(g,W,H,D,C.DW,true,true);
  doorTrig(-1.6,D/2-0.5,1.6,D/2+1.5,'fastfood_dining',0,-5,Math.PI);
  doorTrig(-1.6,-D/2-1.4,1.6,-D/2+0.4,'fastfood_storage',0,4.5,Math.PI);
  // Congélateur walk-in
  const frz=bx(2.6,H,0.22,mat(0x0d1a20,0.35,0.35),3.5,H/2,-D/2+0.12);
  inter(frz,'Ouvrir le congélateur','open_freezer',g);coll(2.2,-D/2-0.15,4.8,-D/2+0.35);
  g.add(bx(2.6,H,0.05,bmat(0xc8e8ff,0.04),3.5,H/2,-D/2+0.16));
  const rl=plight(g,0xff0000,0.5,2,3.5,H-0.25,-D/2+0.22);animL(rl,0.45,1.8,0.35);
  g.add(bx(0.07,0.07,0.07,bmat(0xff0000),3.5,H-0.25,-D/2+0.22));
  // Casiers
  for(let i=0;i<2;i++){const lk=bx(0.65,2.1,0.42,mat(C.MTD,0.65,0.35),W/2-0.35,1.05,-1.5+i*1.6);inter(lk,'Casier employé','search_locker',g);}
  coll(W/2-0.8,-2.5,W/2,1.5);
  // Tables de préparation
  bench(g,-1.5,-0.8,2.8);
  // Caisses
  const cr=bx(1.2,0.88,0.9,mat(C.WD,0.9),-W/2+0.8,0.44,1.2);inter(cr,'Fouiller les caisses','search_crate',g);
  coll(-W/2-0.05,0.7,-W/2+1.6,1.7);
  // Tuyaux plafond
  for(let i=0;i<3;i++){const pipe=new THREE.Mesh(new THREE.CylinderGeometry(0.05,0.05,W,6),mat(C.MTD,0.6,0.5));pipe.rotation.z=Math.PI/2;pipe.position.set(0,H-0.22,-2+i*2);g.add(pipe);}
  plight(g,0x1a0500,0.4,8,0,H-0.4,0);
  return g;
},
onEnter(){if(!G.flags.kit_entered){G.flags.kit_entered=true;schedDlg('act1_kitchen_enter',600);}}
};

// ── STOCKAGE ─────────────────────────────────────────────────
ROOMS.fastfood_storage={name:'Réserve — Zone Restreinte',ambient:'tension',creaks:'low',fog:0.13,sp:{x:0,z:4.5},sy:Math.PI,
build(){
  const g=new THREE.Group();const W=8,H=3,D=12;
  buildRoom(g,W,H,D,C.DW,G.flags.shelf_moved,true);
  doorTrig(-1.6,D/2-0.5,1.6,D/2+1.5,'fastfood_kitchen',0,-4,Math.PI);
  if(G.flags.shelf_moved)doorTrig(-1.2,-D/2-1.4,1.2,-D/2+0.3,'office',0,2.5,0);
  // Étagères
  shelf(g,-W/2+0.5,-2);shelf(g,-W/2+0.5,1);shelf(g,-W/2+0.5,4);
  shelf(g,W/2-0.5,-2); shelf(g,W/2-0.5,1); shelf(g,W/2-0.5,4);
  // Boîtes Lot 666
  [-.5,0,.5].forEach(dx=>{g.add(bx(0.4,0.38,0.36,mat(0x200810,0.9,0,0x880000,0.4),dx,1.6,-D/2+0.7));});
  const el=plight(g,0x550000,0.25,2,0,0.6,-D/2+0.7);animL(el,0.2,1.1,0.1);
  const eb=bx(0.55,0.5,0.5,mat(0x3a1a00,0.9),0,0.25,1.5);inter(eb,'Boîtes TC Lot #666','examine_boxes',g);
  // Étagère secrète / passage
  if(!G.flags.shelf_moved){
    const hs=bx(2.4,H,0.22,mat(C.MTD,0.9),0,H/2,-D/2+0.12);
    inter(hs,"Déplacer l'étagère",'move_shelf',g);coll(-1.3,-D/2-0.15,1.3,-D/2+0.35);
  }else{
    const pl=plight(g,0x220008,0.3,3,0,1,-D/2-0.5);animL(pl,0.25,2.5,0.12);
  }
  plight(g,0x100305,0.5,10,0,H-0.4,0);
  return g;
}
};

// ── BUREAU ───────────────────────────────────────────────────
ROOMS.office={name:"Bureau du Directeur",ambient:'tension',creaks:'low',fog:0.1,sp:{x:0,z:2.5},sy:Math.PI,
build(){
  const g=new THREE.Group();const W=8,H=3,D=8;
  buildRoom(g,W,H,D,C.DW,true,true);
  doorTrig(-1.6,D/2-0.5,1.6,D/2+1.5,'fastfood_storage',0,-4.5,Math.PI);
  doorTrig(-1.6,-D/2-1.4,1.6,-D/2+0.3,'basement',0,4,0);
  // Bureau
  const desk=bx(2.5,0.07,1.2,mat(C.WD,0.65),0,0.85,-1.5);inter(desk,'Fouiller le bureau','search_desk',g);
  g.add(bx(2.5,0.85,1.2,mat(0x180e06,0.85),0,0.42,-1.5));coll(-1.3,-2.15,1.3,-0.9);
  g.add(bx(0.62,0.42,0.05,mat(0x0a0c10,0.35,0.35),0.4,1.12,-1.62));g.add(bx(0.18,0.04,0.18,mat(C.MT,0.35,0.4),0.4,0.9,-1.62));
  // Classeur
  const cab=bx(0.75,1.8,0.5,mat(C.MTD,0.65,0.35),W/2-0.45,0.9,-2);inter(cab,'Classeur de dossiers','search_cabinet',g);
  coll(W/2-0.9,-2.3,W/2,-1.7);
  // Dessins mur ouest (yeux)
  for(let i=0;i<7;i++){const eye=new THREE.Mesh(new THREE.PlaneGeometry(0.28,0.2),bmat(0x3a0808,0.32+Math.random()*0.18));eye.position.set(-W/2+0.04,0.8+i*0.28,-2.5+i*0.22);eye.rotation.y=Math.PI/2;g.add(eye);}
  const wallI=bx(0.04,2,2.5,bmat(0x000000,0),-W/2+0.06,1.5,-1);inter(wallI,"Examiner les dessins",'view_wall',g);
  // Chaise
  g.add(bx(0.5,0.04,0.5,mat(C.MTD,0.7),0,0.49,-0.4));g.add(bx(0.5,0.5,0.04,mat(C.MTD,0.7),0,0.78,-0.17));
  // Papiers au sol
  for(let i=0;i<7;i++){const p=new THREE.Mesh(new THREE.PlaneGeometry(0.22,0.16),mat(0x8a7a5a,0.8));p.rotation.x=-Math.PI/2;p.rotation.z=Math.random()*Math.PI;p.position.set((Math.random()-.5)*5,0.01,(Math.random()-.5)*5);g.add(p);}
  const rl=plight(g,0x1a0008,0.6,8,0,H-0.4,0);animL(rl,0.55,0.5,0.1);
  return g;
},
onEnter(){if(G.chapter===2&&!G.flags.shadow_seen){G.flags.shadow_seen=true;schedDlg('act2_shadow_seen',2200);}}
};

// ── SOUS-SOL ─────────────────────────────────────────────────
ROOMS.basement={name:'Sous-Sol — Laboratoire Interdit',ambient:'horror',creaks:'high',fog:0.13,sp:{x:0,z:4},sy:Math.PI,
build(){
  const g=new THREE.Group();const W=10,H=2.8,D=12;
  buildRoom(g,W,H,D,C.CN,G.flags.lab_unlocked,true);
  doorTrig(-1.6,D/2-0.5,1.6,D/2+1.5,'office',0,-3,Math.PI);
  if(G.flags.lab_unlocked)doorTrig(-1.6,-D/2-1.4,1.6,-D/2+0.3,'lab_main',0,5,0);
  // Paillasse + bocaux
  bench(g,-2.8,-0.8,2.4);
  for(let i=0;i<4;i++){const j=jar(g,-3.6+i*0.55,-0.8);inter(j,'Examiner le bocal','examine_jars',g);}
  // Journal
  const jrn=bx(0.2,0.03,0.15,mat(0x6a5a3a,0.9),-2,0.97,-0.8);inter(jrn,'Journal de Grunholt','read_journal',g);
  // Porte labo (code)
  const labDoor=bx(2.5,H-0.5,0.12,mat(G.flags.lab_unlocked?0x0a0f1a:0x150808,0.5,0.4),0,H/2-0.25,-D/2+0.08);
  if(!G.flags.lab_unlocked){inter(labDoor,'🔒 Code requis — Panneau','open_lab_door',g);coll(-1.4,-D/2-0.15,1.4,-D/2+0.35);}
  else g.add(labDoor);
  const cp=bx(0.28,0.38,0.05,bmat(G.flags.lab_unlocked?0x003300:0x440000),1.2,1.3,-D/2+0.12);
  inter(cp,'Panneau de code','open_lab_door',g);
  // Bandes lumineuses rouges urgence
  [-W/2+0.18,W/2-0.18].forEach(lx=>{
    g.add(bx(0.06,0.06,D-1,bmat(0xff0000),lx,0.18,0));
    const sl=plight(g,0xff0000,0.4,5,lx,0.25,0);animL(sl,0.3,1.6,0.18);
  });
  plight(g,0x0a0308,0.5,12,0,H-0.4,0);
  return g;
},
onEnter(){
  if(!G.flags.bsmt_entered){G.flags.bsmt_entered=true;document.getElementById('game-screen').classList.add('tense-mode');schedDlg('act3_alone_monologue',1200);Audio.play('stinger');}
}
};

// ── LABO PRINCIPAL ───────────────────────────────────────────
ROOMS.lab_main={name:'Laboratoire Principal — Zone X-77',ambient:'horror',creaks:'high',fog:0.09,sp:{x:0,z:5},sy:Math.PI,
build(){
  const g=new THREE.Group();const W=12,H=3,D=14;
  buildRoom(g,W,H,D,C.CN,G.flags.ritual_complete,true);
  doorTrig(-1.6,D/2-0.5,1.6,D/2+1.5,'basement',0,-D/2+2,Math.PI);
  if(G.flags.ritual_complete)doorTrig(-1.6,-D/2-1.4,1.6,-D/2+0.3,'ritual_chamber',0,4,0);
  // Cercle rituel
  const r1=new THREE.Mesh(new THREE.RingGeometry(1.8,2,36),bmat(0xdd3300,G.flags.ritual_complete?0.75:0.3));r1.rotation.x=-Math.PI/2;r1.position.set(0,0.01,2);g.add(r1);
  const r2=new THREE.Mesh(new THREE.RingGeometry(0.65,0.78,36),bmat(0xaa1100,0.9));r2.rotation.x=-Math.PI/2;r2.position.set(0,0.01,2);g.add(r2);
  const ci=bx(0.04,0.04,4.4,bmat(0x000000,0),0,0.02,2);
  inter(ci,G.flags.ritual_complete?'Rituel accompli ✓':G.flags.found_flamby?'Placer les artefacts':'Examiner le cercle',
    G.flags.found_flamby?'placement_puzzle':'examine_circle',g);
  const cl=plight(g,G.flags.ritual_complete?0xff5500:0x220000,G.flags.ritual_complete?1.2:0.3,5,0,0.5,2);
  animL(cl,G.flags.ritual_complete?1.1:0.25,1.4,G.flags.ritual_complete?0.35:0.08);
  // Tableau blanc
  const wb=bx(3,2.2,0.06,mat(0xb8c8c0,0.65),2.5,2,-D/2+0.08);inter(wb,'Lire le tableau blanc','read_whiteboard',g);
  // Tables de labo + béchers
  [-3.5,3.5].forEach(lx=>{
    bench(g,lx,-3,3.2);
    for(let b=0;b<5;b++){const bk=new THREE.Mesh(new THREE.CylinderGeometry(0.055,0.045,0.18,6),new THREE.MeshStandardMaterial({color:0x002a1a,transparent:true,opacity:0.65,roughness:0.08}));bk.position.set(lx-1.3+b*0.55,1.1,-3);g.add(bk);plight(g,0x003418,0.08,0.6,lx-1.3+b*0.55,1.15,-3);}
  });
  // Porte chambre rituelle
  const cd=bx(2.5,H-0.5,0.12,mat(G.flags.ritual_complete?0x100520:0x080508,0.55,0.3),0,H/2-0.25,-D/2+0.08);
  if(!G.flags.ritual_complete){inter(cd,'Porte mystérieusement verrouillée','examine_circle',g);coll(-1.4,-D/2-0.15,1.4,-D/2+0.35);}
  else g.add(cd);
  const bl=plight(g,0x100040,0.9,16,0,H-0.5,0);animL(bl,0.8,0.35,0.12);
  return g;
},
onEnter(){
  if(!G.flags.lab_entered){G.flags.lab_entered=true;document.getElementById('game-screen').classList.add('tense-mode');}
  if(!G.flags.found_flamby&&G.flags.cabinet_searched)G.flags.found_flamby=true;
}
};

// ── CHAMBRE RITUELLE ─────────────────────────────────────────
ROOMS.ritual_chamber={name:'Chambre Rituelle — Niveau -3',ambient:'horror',creaks:'high',fog:0.085,sp:{x:0,z:3},sy:Math.PI,
build(){
  const g=new THREE.Group();const W=10,H=3,D=10;
  buildRoom(g,W,H,D,C.ST,false,true);
  doorTrig(-1.6,D/2-0.5,1.6,D/2+1.5,'lab_main',0,-5,Math.PI);
  // Autel
  const alt=bx(2,1.15,1,mat(C.ST,0.97),0,0.57,-3.2);
  inter(alt,G.flags.ritual_complete?"Invoquer le Sauveur ✝":"Examiner l'autel",G.flags.ritual_complete?'summon_flamby':'examine_altar',g);
  g.add(bx(2.2,0.1,1.2,mat(C.STD,0.97),0,1.2,-3.2));coll(-1.2,-3.8,1.2,-2.7);
  // Anneau rune
  const rr=new THREE.Mesh(new THREE.RingGeometry(2.3,2.55,36),bmat(0x600080,0.55));rr.rotation.x=-Math.PI/2;rr.position.set(0,0.01,0);g.add(rr);
  // Artefacts sur l'autel si rituel fait
  if(G.flags.ritual_complete)[-.5,0,.5].forEach((dx,i)=>g.add(bx(0.18,0.18,0.06,mat(0x4a3800,0.5,0,0xcc8800,0.8),dx,1.32,-3.2)));
  // Bougies
  [[-1.8,1.2],[1.8,1.2],[-1,-.8],[1,-.8],[-3.5,-.2],[3.5,-.2]].forEach(([x,z])=>candle(g,x,z));
  // Runes mur
  for(let i=0;i<5;i++){const r=new THREE.Mesh(new THREE.PlaneGeometry(0.35,0.35),bmat(0x600080,0.2+Math.random()*0.18));r.position.set(-W/2+0.04,0.8+i*0.5,-3+i*0.5);r.rotation.y=Math.PI/2;g.add(r);}
  const pl=plight(g,0x200040,0.8,12,0,H-0.5,0);animL(pl,0.7,0.4,0.18);
  return g;
},
onEnter(){if(!G.flags.chamber){G.flags.chamber=true;if(G.chapter<4)advChapter(4);}}
};

// ════════════════════════════════════════════════════════════
// ROOM LOADER
// ════════════════════════════════════════════════════════════
function gotoRoom(id,sx,sz,yaw=0){
  doorTriggers=[];
  Audio.play('transition');
  fade(350,()=>loadRoom(id,sx,sz,yaw));
}
function loadRoom(id,sx,sz,yaw=0){
  if(roomGroup){scene.remove(roomGroup);roomGroup=null;}
  interactables=[];roomColliders=[];doorTriggers=[];animLights=[];
  G.scene=id;
  const def=ROOMS[id];if(!def){console.warn('Room not found:',id);return;}
  document.getElementById('location-name').textContent=def.name;
  roomGroup=def.build();scene.add(roomGroup);
  scene.fog=new THREE.FogExp2(0x000000,def.fog??0.07);
  const sp=def.sp;
  camera.position.set(sx??sp?.x??0,PH,sz??sp?.z??0);
  Ctrl.yaw=yaw!==0?yaw:(def.sy??0);Ctrl.pitch=0;
  camera.rotation.set(0,Ctrl.yaw,0,'YXZ');
  Audio.stopRandomCreaks();Audio.playAmbient(def.ambient??'factory');Audio.startRandomCreaks(def.creaks??'low');
  if(def.onEnter)def.onEnter();
}

// ════════════════════════════════════════════════════════════
// GAME LOOP
// ════════════════════════════════════════════════════════════
let flashFT=0,flashFN=0;
function startLoop(){
  gameRunning=true;
  if(loopId)cancelAnimationFrame(loopId);
  function loop(){
    loopId=requestAnimationFrame(loop);
    const dt=Math.min(clock.getDelta(),0.05);
    if(!G.paused){
      Ctrl.update(dt);updateRay();
      // Animate lights
      const t=clock.elapsedTime;
      for(const {l,base,freq,amp} of animLights)l.intensity=base+Math.sin(t*freq*Math.PI*2)*amp;
      // Flashlight flicker (rare, horror mode)
      flashFT+=dt;
      if(flashFT>flashFN&&G.chapter>=2&&flashlight.visible){
        if(Math.random()<0.012){flashlight.intensity=0.4+Math.random()*0.8;setTimeout(()=>flashlight.intensity=4.5,55+Math.random()*80);}
        flashFN=flashFT+1+Math.random()*5;
      }
    }
    renderer.render(scene,camera);
  }
  loop();
}

// ════════════════════════════════════════════════════════════
// ACTIONS
// ════════════════════════════════════════════════════════════
function handleAction(ud){
  if(!ud?.action||G.dialogActive||G.puzzleActive)return;
  Audio.play('click');
  switch(ud.action){
    case 'search_dumpster': searchDumpster();break;
    case 'read_memo_w1': case 'read_menu': showNote('note_memo_w1');break;
    case 'search_counter':  searchCounter();break;
    case 'stain_inspect':   schedDlg('act1_stain_investigate',50);break;
    case 'read_scratched':  showNote('note_scratched');break;
    case 'open_freezer':    openFreezer();break;
    case 'search_locker':   searchLocker();break;
    case 'search_crate':    searchCrate();break;
    case 'examine_boxes':   examineBoxes();break;
    case 'move_shelf':      moveShelf();break;
    case 'search_desk':     searchDesk();break;
    case 'search_cabinet':  searchCabinet();break;
    case 'view_wall':       viewWall();break;
    case 'read_journal':    showNote('note_journal_day47');break;
    case 'examine_jars':    examineJars();break;
    case 'open_lab_door':   openPuzzle('code_puzzle');break;
    case 'read_whiteboard': readWB();break;
    case 'examine_circle':  exCircle();break;
    case 'placement_puzzle':openPuzzle('placement_puzzle');break;
    case 'examine_altar':   exAltar();break;
    case 'summon_flamby':   summonFlamby();break;
    default: showToast('Vous examinez ça mais ne trouvez rien d\'utile.');
  }
}
function searchDumpster(){if(G.flags.dump_done){showToast('Déjà fouillé.');return;}G.flags.dump_done=true;Audio.play('item_pickup');addItem('crowbar','🔧','Pied-de-biche');showToast('Vous trouvez un pied-de-biche rouillé.');}
function searchCounter(){if(G.flags.counter_done){showToast('Vide.');return;}G.flags.counter_done=true;Audio.play('item_pickup');addItem('kitchen_key','🗝️','Clé Cuisine');showToast('Clé de la cuisine trouvée !');schedDlg('act1_found_memo',500);}
function openFreezer(){if(G.flags.frz_done){showToast('Le congélateur est vide. Froid.');return;}schedDlg('act1_freezer_before',100);setTimeout(()=>{if(G.flags.frz_done)return;G.flags.frz_done=true;triggerScreamer('freezer',()=>{showToast("Rien. C'était une ombre.");if(G.chapter<2)setTimeout(()=>advChapter(2),2500);});},2200);}
function searchLocker(){if(G.flags.lock_done){showToast('Vide.');return;}G.flags.lock_done=true;Audio.play('door_creak');Audio.play('paper_pickup');showNote('note_journal_day1');}
function searchCrate(){if(G.flags.crate_done){showToast('Vous avez déjà pris ce qu\'il y avait.');return;}G.flags.crate_done=true;Audio.play('item_pickup');addItem('fragment_cuve','🪨','Fragment Cuve Nº6');showToast('Fragment de la Cuve Nº6 — métal bizarre, chaud au toucher.');}
function examineBoxes(){if(!G.flags.boxes_ex){G.flags.boxes_ex=true;Audio.play('stinger');showToast('Des dizaines de boîtes TC. Date de péremption : "JAMAIS". Le lot #666 pulse faiblement.');schedDlg('act2_byilhan_panic',1200);}else showToast('Ces boîtes vous donnent la nausée.');}
function moveShelf(){if(!G.inventory.includes('crowbar')){showToast("Cette étagère est trop lourde. Il vous faudrait un outil solide.");return;}G.flags.shelf_moved=true;Audio.play('door_creak');Audio.play('rumble');showToast("L'étagère grince et révèle un passage obscur vers le sous-sol...");setTimeout(()=>loadRoom('fastfood_storage'),1000);}
function searchDesk(){if(G.flags.desk_done){showToast('Déjà fouillé.');return;}G.flags.desk_done=true;Audio.play('paper_pickup');addItem('formule_x77','📜','Formule X-77');showNote('note_warning_flamby');}
function searchCabinet(){if(G.flags.cab_done){showToast('Les dossiers sont éparpillés.');return;}G.flags.cab_done=true;Audio.play('door_creak');Audio.play('paper_pickup');G.flags.found_flamby=true;addItem('sceau_tc','🔖','Sceau TastyCrousty');showNote('note_journal_day47');schedDlg('act3_found_flamby_note',5000);}
function viewWall(){showToast('Des dizaines d\'yeux dessinés frénétiquement. "IL REVIENT. IL EST DANS LES MURS. TROUVEZ FLAMBY."');Audio.play('heartbeat');}
function examineJars(){showToast('Des bocaux hermétiques. Des TastyCrousty en phase larvaire. Ils bougent encore. Lentement.');Audio.play('stinger');if(!G.flags.jar_scr&&G.chapter>=3){G.flags.jar_scr=true;setTimeout(()=>triggerScreamer('jar',()=>{}),1800);}}
function readWB(){showToast('"Sujet F — Flamby. Ventre de Fer : CONFIRMÉ. Immunité X-77 : 100%. Solution finale : LAISSER FLAMBY MANGER."');if(!G.flags.found_flamby){G.flags.found_flamby=true;loadRoom(G.scene);}}
function exCircle(){if(!G.flags.found_flamby)showToast('Un cercle rituel gravé dans le béton. Des symboles anciens. Vous ne comprenez pas encore.');else showToast('Le cercle attend les 3 artefacts : Fragment de Cuve (Nord), Formule X-77 (Sud-O), Sceau TC (Sud-E).');}
function exAltar(){showToast(G.flags.ritual_complete?"L'autel est prêt. Invoquez le Sauveur.":"L'autel vibre légèrement. Il attend quelque chose.");}
function summonFlamby(){
  if(!G.flags.ritual_complete){showToast('Le rituel n\'est pas encore accompli.');return;}
  if(G.flags.flamby_summ){showToast('Flamby est déjà en route.');return;}
  G.flags.flamby_summ=true;Audio.play('stinger');advChapter(4);
  schedDlg('act4_flamby_arrives',600);schedDlg('act4_flamby_explains',9500);
  schedDlg('act4_prep_ritual',18500);schedDlg('final_confrontation',27500);
  setTimeout(()=>{showScreen('cinematic-screen');gameRunning=false;if(loopId)cancelAnimationFrame(loopId);Cinematic.play('finale',()=>startEpilogue());},32000);
}

// ════════════════════════════════════════════════════════════
// SCREAMER
// ════════════════════════════════════════════════════════════
function triggerScreamer(type,cb){
  Audio.play('screamer');
  const ov=document.getElementById('screamer-overlay');
  const sc=document.getElementById('screamer-canvas');
  sc.width=window.innerWidth;sc.height=window.innerHeight;
  ov.classList.remove('hidden');
  drawScreamer(sc.getContext('2d'),sc.width,sc.height);
  let sh=0;const si=setInterval(()=>{camera.rotation.z=(Math.random()-.5)*0.05;if(++sh>8){clearInterval(si);camera.rotation.z=0;}},30);
  setTimeout(()=>{ov.classList.add('hidden');sc.getContext('2d').clearRect(0,0,sc.width,sc.height);if(cb)cb();},1650);
}
function drawScreamer(ctx,W,H){
  ctx.fillStyle='#cc0000';ctx.fillRect(0,0,W,H);
  const cx=W/2,cy=H/2,r=Math.min(W,H)*0.38;
  ctx.fillStyle='#7a3e00';ctx.beginPath();ctx.ellipse(cx,cy,r,r*0.72,0,0,Math.PI*2);ctx.fill();
  for(let i=0;i<14;i++){ctx.fillStyle=`hsl(25,${50+Math.random()*20}%,${12+Math.random()*8}%)`;ctx.beginPath();ctx.arc(cx+(Math.random()-.5)*r*1.7,cy+(Math.random()-.5)*r,r*(0.05+Math.random()*0.06),0,Math.PI*2);ctx.fill();}
  [-0.31,0.31].forEach(ex=>{
    ctx.fillStyle='#fff';ctx.beginPath();ctx.ellipse(cx+ex*r,cy-.14*r,r*.09,r*.09,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#ff0000';ctx.beginPath();ctx.ellipse(cx+ex*r,cy-.14*r,r*.065,r*.065,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#000';ctx.beginPath();ctx.ellipse(cx+ex*r,cy-.14*r,r*.04,r*.04,0,0,Math.PI*2);ctx.fill();
    const eg=ctx.createRadialGradient(cx+ex*r,cy-.14*r,0,cx+ex*r,cy-.14*r,r*.22);eg.addColorStop(0,'rgba(255,0,0,0.55)');eg.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=eg;ctx.fillRect(0,0,W,H);
  });
  ctx.fillStyle='#000';ctx.beginPath();ctx.ellipse(cx,cy+r*.2,r*.3,r*.18,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#e8e0c0';for(let i=-3;i<=3;i++){ctx.beginPath();ctx.moveTo(cx+i*r*.08,cy+r*.09);ctx.lineTo(cx+i*r*.08+r*.035,cy+r*.09);ctx.lineTo(cx+i*r*.08+r*.018,cy+r*.22);ctx.fill();ctx.beginPath();ctx.moveTo(cx+i*r*.08,cy+r*.35);ctx.lineTo(cx+i*r*.08+r*.035,cy+r*.35);ctx.lineTo(cx+i*r*.08+r*.018,cy+r*.24);ctx.fill();}
  ctx.strokeStyle='rgba(50,15,0,0.85)';ctx.lineWidth=r*.042;for(let i=0;i<10;i++){const a=i/10*Math.PI*2;ctx.beginPath();ctx.moveTo(cx+Math.cos(a)*r,cy+Math.sin(a)*r*.72);ctx.quadraticCurveTo(cx+Math.cos(a)*r*1.5+Math.sin(a)*r*.25,cy+Math.sin(a)*r*1.25,cx+Math.cos(a)*r*1.9,cy+Math.sin(a)*r*1.6);ctx.stroke();}
  ctx.fillStyle='#ffcc00';ctx.strokeStyle='#000';ctx.lineWidth=5;ctx.font=`bold ${H*.09}px Creepster,cursive`;ctx.textAlign='center';ctx.strokeText('☠ TASTYCROUSTY ☠',cx,H*.13);ctx.fillText('☠ TASTYCROUSTY ☠',cx,H*.13);
  const vg=ctx.createRadialGradient(cx,cy,r*.25,cx,cy,r*2.2);vg.addColorStop(0,'rgba(0,0,0,0)');vg.addColorStop(1,'rgba(0,0,0,0.75)');ctx.fillStyle=vg;ctx.fillRect(0,0,W,H);
}

let rndScr=false;
function startRndScreamers(){if(rndScr)return;rndScr=true;setTimeout(()=>{if(G.chapter>=2&&!G.flags.mirror_scr){G.flags.mirror_scr=true;triggerScreamer('mirror',()=>showToast('Une ombre disparaît dans les ténèbres...'));}},12000+Math.random()*8000);}

// ════════════════════════════════════════════════════════════
// DIALOGS
// ════════════════════════════════════════════════════════════
const DLG={
  intro_outside:[{s:'NICO',p:'nico',t:"Byilhan... t'es sûr de vouloir entrer là-dedans ? Ce fast-food est fermé depuis 2019."},{s:'BYILHAN',p:'byilhan',t:"T'inquiète frère ! Y'a sûrement encore des TastyCrousty en stock !"},{s:'NICO',p:'nico',t:"Il a été retiré de la vente pour des 'raisons sanitaires non précisées'..."},{s:'BYILHAN',p:'byilhan',t:"Justement ! Les trucs interdits sont toujours les meilleurs. Viens !"},{s:'NICO',p:'nico',t:"Ta logique m'effraie. Okay. On entre. Et on sort VITE."}],
  act1_dining_enter:[{s:'BYILHAN',p:'byilhan',t:"Woah. Dark. Mais l'ambiance c'est pas mal..."},{s:'NICO',p:'nico',t:"Des tables renversées. Des taches partout. Ça sent le renfermé."},{s:'BYILHAN',p:'byilhan',t:"Ça sent le vieux crouton ! Nostalgique !"},{s:'NICO',p:'nico',t:"Ça sent quelque chose qui n'aurait pas dû survivre aussi longtemps."}],
  act1_stain_investigate:[{s:'BYILHAN',p:'byilhan',t:"C'est quoi cette tache ? Du ketchup ?"},{s:'NICO',p:'nico',t:"Ils ont arrêté le ketchup ici il y a 5 ans..."},{s:'BYILHAN',p:'byilhan',t:"De la sauce tomate alors ?"},{s:'NICO',p:'nico',t:"Byilhan. Ce n'est pas de la sauce."}],
  act1_found_memo:[{s:'NICO',p:'nico',t:'"Ne pas distribuer le lot #666. Ne pas consommer." Qu\'est-ce que c\'est que ça ?'},{s:'BYILHAN',p:'byilhan',t:"Lot 666 ? Les gens sont tellement dramatiques."},{s:'NICO',p:'nico',t:"Je garde ça. Ça a l'air important."}],
  act1_kitchen_enter:[{s:'BYILHAN',p:'byilhan',t:"La cuisine ! Y'a peut-être des TastyCrousty dans le frigo !"},{s:'NICO',p:'nico',t:"Le frigo tourne encore ? Mais l'élec est coupée normalement..."},{s:'BYILHAN',p:'byilhan',t:"Backup power sûrement. Vas-y, ouvre !"}],
  act1_freezer_before:[{s:'BYILHAN',p:'byilhan',t:"Tu ouvres le congélo ou quoi ? Vas-y !"},{s:'NICO',p:'nico',t:"Il y a une lumière rouge qui clignote derrière. C'est... normal ?"},{s:'BYILHAN',p:'byilhan',t:"C'est la lampe de maintenance. Open it !"}],
  act2_tension_start:[{s:'BYILHAN',p:'byilhan',t:"...Tu entends ça ?"},{s:'NICO',p:'nico',t:"Quoi ?"},{s:'BYILHAN',p:'byilhan',t:"Ce bruit. Comme si quelque chose... mâchait. Dans les murs."},{s:'NICO',p:'nico',t:"Ce sont les canalisations. Vieux bâtiment..."},{s:'BYILHAN',p:'byilhan',t:"Nico. Les canalisations ne respirent pas."}],
  act2_shadow_seen:[{s:'BYILHAN',p:'byilhan',t:"Attends. ATTENDS. TU AS VU ÇA ?"},{s:'NICO',p:'nico',t:"Quoi ? Où ?"},{s:'BYILHAN',p:'byilhan',t:"Dans le couloir. Une ombre. Ronde. Avec... des dents."},{s:'NICO',p:'nico',t:"Byilhan, calme—"},{s:'BYILHAN',p:'byilhan',t:"JE SUIS CALME. JE SUIS TRÈS CALME."}],
  act2_byilhan_panic:[{s:'BYILHAN',p:'byilhan',t:"On part. MAINTENANT. J'ai plus envie de TastyCrousty."},{s:'NICO',p:'nico',t:"Attends, j'ai trouvé des notes sur un 'Flamby'. Je dois comprendre."},{s:'BYILHAN',p:'byilhan',t:"NICO. Quelque chose me regarde depuis ces ombres."},{s:'BYILHAN',p:'byilhan',t:"JE SUIS PAS PARANO !!!"}],
  act3_alone_monologue:[{s:'NICO',p:'nico',t:"Byilhan... je suis désolé."},{s:'NICO',p:'nico',t:"J'aurais dû écouter. Mais je dois comprendre. Pourquoi nous ?"},{s:'NICO',p:'nico',t:"Et ce Flamby... toutes les notes en parlent. 'Trouvez Flamby.'"},{s:'NICO',p:'nico',t:"Il faut que je descende plus loin."}],
  act3_found_flamby_note:[{s:'NICO',p:'nico',t:'"Flamby. Ventre de Fer confirmé. Solution finale : MANGER." C\'est insensé.'},{s:'NICO',p:'nico',t:'"Seul celui qui possède le Ventre de Fer peut consommer la bête."'},{s:'NICO',p:'nico',t:"Il faut trouver les artefacts. Et Flamby."}],
  act4_flamby_arrives:[{s:'???',p:'flamby',t:"Eh. T'as l'air d'avoir besoin d'aide, toi."},{s:'NICO',p:'nico',t:"QUI— qui es-tu ? Comment t'es entré ici ?"},{s:'FLAMBY',p:'flamby',t:"Par la porte du fond. Je suis Flamby."},{s:'NICO',p:'nico',t:"FLAMBY ?! C'est toi dont parlent toutes les notes ?!"},{s:'FLAMBY',p:'flamby',t:"Probablement. J'ai une certaine... réputation dans ce milieu."}],
  act4_flamby_explains:[{s:'FLAMBY',p:'flamby',t:"Le TastyCrousty, c'est une erreur scientifique. Un snack qui a développé une conscience."},{s:'NICO',p:'nico',t:"Et... tu peux vraiment le vaincre en le mangeant ?"},{s:'FLAMBY',p:'flamby',t:"Parce que mon système digestif est une arme de destruction massive. Cliniquement prouvé."},{s:'FLAMBY',p:'flamby',t:"Frère, la normale s'est arrêtée quand un crouton a mangé ton ami. Suis-moi."}],
  act4_prep_ritual:[{s:'FLAMBY',p:'flamby',t:"Place les 3 artefacts dans le cercle rituel du labo."},{s:'NICO',p:'nico',t:"Le fragment de cuve, la formule, le sceau. J'ai tout ça."},{s:'FLAMBY',p:'flamby',t:"Exactement. Toi tu fais le rituel. Moi je me prépare psychologiquement."},{s:'FLAMBY',p:'flamby',t:"J'ai faim. C'est mon état optimal."}],
  final_confrontation:[{s:'FLAMBY',p:'flamby',t:"Recule, Nico. Fais confiance au ventre."},{s:'NICO',p:'nico',t:"Sois... prudent, Flamby."},{s:'FLAMBY',p:'flamby',t:"La prudence c'est pour ceux qui ont peur. Moi j'ai faim."}],
};
let dlgL=[],dlgI=0;
function schedDlg(k,ms=0){setTimeout(()=>startDlg(k),ms);}
function startDlg(k){if(!DLG[k])return;dlgL=DLG[k];dlgI=0;G.dialogActive=true;if(Ctrl.locked)document.exitPointerLock();showDlg();}
function showDlg(){
  if(dlgI>=dlgL.length){closeDlg();return;}
  const l=dlgL[dlgI];
  document.getElementById('dialog-box').classList.remove('hidden');
  document.getElementById('dialog-speaker-name').textContent=l.s;
  document.getElementById('dialog-text-area').textContent='';
  const port=document.getElementById('dialog-portrait');
  if(l.p){port.src=`assets/characters/${l.p}.png`;port.style.display='block';}else port.style.display='none';
  let ci=0;clearInterval(G._typeTimer);
  G._typeTimer=setInterval(()=>{document.getElementById('dialog-text-area').textContent=l.t.slice(0,++ci);if(ci>=l.t.length)clearInterval(G._typeTimer);},22);
  Audio.play('click');
}
function advanceDialog(){
  const ta=document.getElementById('dialog-text-area');
  if(ta.textContent.length<(dlgL[dlgI]?.t?.length??0)){clearInterval(G._typeTimer);ta.textContent=dlgL[dlgI].t;return;}
  dlgI++;if(dlgI<dlgL.length)showDlg();else closeDlg();
}
function closeDlg(){G.dialogActive=false;document.getElementById('dialog-box').classList.add('hidden');}

// ════════════════════════════════════════════════════════════
// NOTES
// ════════════════════════════════════════════════════════════
const NOTES={
  note_memo_w1:{title:'Mémo Interne — TastyCrousty Industries, 2018',body:`À : Tous les employés de l'usine N°4\nDe : Dr. Viktor Grunholt, Chef de Projet X-77\n\nConcerne : Lot de production #666\n\nNous avons rencontré des "anomalies comportementales" dans la cuve Nº6.\nLes échantillons du lot #666 présentent une résistance anormale à la péremption.\n\nNE PAS distribuer le lot #666.\nNE PAS consommer les produits de ce lot.\n\nSi vous entendez des bruits la nuit... IGNOREZ-LES.\n\n— Dr. V. Grunholt`},
  note_journal_day1:{title:'Journal de Viktor Grunholt — Jour 1',body:`Aujourd'hui nous avons commencé l'expérience.\n\nObjectif : stabiliser la molécule gustative avec le composé X-77.\nLe snack le plus addictif du siècle.\n\nNous n'aurions pas dû.\n\nLe X-77 réagit avec les épices de manière... inattendue.\nLes cellules se divisent. Spontanément.\n\nAprès tout, un crouton ne peut pas être... vivant.\n\n— Grunholt`},
  note_journal_day47:{title:'Journal de Viktor Grunholt — Jour 47',body:`Ça a poussé pendant la nuit.\n\nSeize boîtes du lot #666 vidées de l'intérieur.\nDes marques sur les murs. Des bruits.\nComme si quelque chose mâchait dans les murs.\n\nJ'ai contacté le sujet "F" — l'employé 447.\nIl mange tout. Il est le seul qui peut approcher sans réaction.\n\nSujet F. Flamby.\nPeut-être que c'est exactement ce qu'il nous faut.\n\n— Grunholt`},
  note_warning_flamby:{title:'Dossier Confidentiel — Sujet F (Employé 447)',body:`NOM DE CODE : FLAMBY\nStatut : ACTIF — Protocole Sauveur\n\n• A consommé 47 croutons du Lot #666 sans effets.\n• Immunité totale aux composés X-77.\n• Capacité gastrique : HORS NORME.\n\nSEUL CELUI QUI POSSÈDE LE VENTRE DE FER\nPEUT ABSORBER LE TASTYCROUSTY TOTALEMENT.\n\nEN CAS DE CATASTROPHE :\nContactez Flamby. Laissez-le manger.\n\n— Archive R&D`},
  note_scratched:{title:'Griffonnage — encre rouge (ou autre chose)',body:`ne partez pas ne partez pas ne partez pas\nil revient quand on éteint les lumières\nil vient quand on mange après minuit\nle snack vous choisit\nvous ne choisissez pas le snack\n\nFlamby sait.\nTrouvez Flamby.\nTROUVEZ FLAMBY avant qu'il ne vous trouve.\n\nça croque dans le noir\nça CROQUE DANS LE NOIR`},
};
function showNote(id){const n=NOTES[id];if(!n)return;Audio.play('paper_pickup');if(!G.notes.includes(id)){G.notes.push(id);document.getElementById('notes-count').textContent=`Notes : ${G.notes.length}`;}document.getElementById('note-title-area').textContent=n.title;document.getElementById('note-body').textContent=n.body;document.getElementById('note-reader').classList.remove('hidden');if(Ctrl.locked)document.exitPointerLock();}
function closeNote(){document.getElementById('note-reader').classList.add('hidden');}

// ════════════════════════════════════════════════════════════
// INVENTORY
// ════════════════════════════════════════════════════════════
const IDEF={kitchen_key:{e:'🗝️',n:'Clé Cuisine'},crowbar:{e:'🔧',n:'Pied-de-biche'},fragment_cuve:{e:'🪨',n:'Fragment Cuve'},formule_x77:{e:'📜',n:'Formule X-77'},sceau_tc:{e:'🔖',n:'Sceau TC'}};
function addItem(id,_e,_n){if(G.inventory.includes(id))return;G.inventory.push(id);Audio.play('item_pickup');renderInv();}
function renderInv(){const sl=document.getElementById('inv-slots');sl.innerHTML='';G.inventory.forEach(id=>{const it=IDEF[id]||{e:'?',n:id};const d=document.createElement('div');d.className='inv-item'+(G.selectedItem===id?' selected':'');d.innerHTML=`${it.e}<span class="inv-item-name">${it.n}</span>`;d.addEventListener('click',()=>{G.selectedItem=(G.selectedItem===id)?null:id;renderInv();});sl.appendChild(d);});}

// ════════════════════════════════════════════════════════════
// PUZZLES
// ════════════════════════════════════════════════════════════
function openPuzzle(type){G.puzzleActive=true;if(Ctrl.locked)document.exitPointerLock();document.getElementById('puzzle-overlay').classList.remove('hidden');document.getElementById('puzzle-feedback').textContent='';if(type==='code_puzzle')buildCodePzl();else if(type==='placement_puzzle')buildPlacePzl();}
function closePuzzle(){G.puzzleActive=false;document.getElementById('puzzle-overlay').classList.add('hidden');}
function spf(msg,col='#ffcc00'){const fb=document.getElementById('puzzle-feedback');fb.style.color=col;fb.textContent=msg;}

function buildCodePzl(){
  document.getElementById('puzzle-title').textContent='Accès Verrouillé';
  document.getElementById('puzzle-content').innerHTML=`<p class="puzzle-hint">Panneau de contrôle. Code à 4 chiffres requis.</p><p class="puzzle-hint" style="color:#cc4400;margin-top:6px;">Indice : "L'année où tout a commencé..."</p><div class="code-inputs">${[0,1,2,3].map(i=>`<input class="code-digit" maxlength="1" id="cd${i}" type="text" inputmode="numeric">`).join('')}</div><button class="puzzle-submit" id="code-submit">VALIDER</button>`;
  [0,1,2,3].forEach(i=>{const inp=document.getElementById(`cd${i}`);inp.addEventListener('input',()=>{if(inp.value.length===1&&i<3)document.getElementById(`cd${i+1}`).focus();});inp.addEventListener('keydown',e=>{if(e.key==='Backspace'&&inp.value===''&&i>0)document.getElementById(`cd${i-1}`).focus();});});
  document.getElementById('code-submit').addEventListener('click',()=>{
    const code=[0,1,2,3].map(i=>document.getElementById(`cd${i}`).value).join('');
    if(code==='1997'){Audio.play('puzzle_success');spf('✓ Code accepté !','#00cc66');G.flags.lab_unlocked=true;setTimeout(()=>{closePuzzle();showToast("La porte du laboratoire s'ouvre !");loadRoom(G.scene);},1200);}
    else{Audio.play('puzzle_fail');spf('✗ Code incorrect.','#ff3333');[0,1,2,3].forEach(i=>document.getElementById(`cd${i}`).value='');document.getElementById('cd0').focus();}
  });
  setTimeout(()=>document.getElementById('cd0').focus(),100);
}
function buildPlacePzl(){
  document.getElementById('puzzle-title').textContent='Cercle Rituel';
  const slots=[{id:'s0',lbl:'Nord',correct:'fragment_cuve',placed:null},{id:'s1',lbl:'Sud-O',correct:'formule_x77',placed:null},{id:'s2',lbl:'Sud-E',correct:'sceau_tc',placed:null}];
  const items=[{id:'fragment_cuve',e:'🪨'},{id:'formule_x77',e:'📜'},{id:'sceau_tc',e:'🔖'}];
  let sel=null;
  function render(){
    document.getElementById('puzzle-content').innerHTML=`<p class="puzzle-hint">Sélectionnez un artefact puis cliquez sur une position.</p><div style="display:grid;grid-template-columns:70px 70px 70px;grid-template-rows:70px 70px;gap:10px;justify-content:center;margin:20px 0;"><div></div><div class="place-slot${slots[0].placed?' filled':''}" id="ps0">${slots[0].placed?items.find(i=>i.id===slots[0].placed)?.e||'?':'?'}<span class="place-slot-label">${slots[0].lbl}</span></div><div></div><div class="place-slot${slots[1].placed?' filled':''}" id="ps1">${slots[1].placed?items.find(i=>i.id===slots[1].placed)?.e||'?':'?'}<span class="place-slot-label">${slots[1].lbl}</span></div><div></div><div class="place-slot${slots[2].placed?' filled':''}" id="ps2">${slots[2].placed?items.find(i=>i.id===slots[2].placed)?.e||'?':'?'}<span class="place-slot-label">${slots[2].lbl}</span></div></div><div style="display:flex;gap:10px;justify-content:center;margin-bottom:14px;">${items.map(it=>`<div class="place-item${sel===it.id?' selected':''}${slots.some(s=>s.placed===it.id)?' placed':''}" data-id="${it.id}">${it.e}</div>`).join('')}</div><button class="puzzle-submit" id="place-ok">ACTIVER LE RITUEL</button>`;
    document.querySelectorAll('.place-item').forEach(el=>el.addEventListener('click',()=>{sel=el.dataset.id;render();}));
    [0,1,2].forEach(i=>document.getElementById(`ps${i}`).addEventListener('click',()=>{if(!sel)return;slots[i].placed=sel;sel=null;Audio.play('item_pickup');render();}));
    document.getElementById('place-ok').addEventListener('click',()=>{
      if(slots.every(s=>s.placed===s.correct)){Audio.play('puzzle_success');spf('✓ Le cercle s\'illumine !','#00cc66');G.flags.ritual_complete=true;setTimeout(()=>{closePuzzle();showToast('Rituel accompli ! Rendez-vous dans la Chambre Rituelle.');loadRoom(G.scene);},1400);}
      else{Audio.play('puzzle_fail');spf('✗ Mauvais placement.','#ff3333');}
    });
  }
  render();
}

// ════════════════════════════════════════════════════════════
// CHAPTERS
// ════════════════════════════════════════════════════════════
function advChapter(n){
  if(n<=G.chapter)return;
  if(n===3&&!G.flags.byilhan_dead){
    G.flags.byilhan_dead=true;gameRunning=false;if(loopId)cancelAnimationFrame(loopId);
    showScreen('cinematic-screen');
    Cinematic.play('byilhan_death',()=>{
      G.chapter=3;showScreen('game-screen');gameRunning=true;startLoop();
      document.getElementById('game-screen').classList.add('tense-mode');
      showCard('ACTE III',"Seul dans l'Obscurité");loadRoom('office');schedDlg('act3_alone_monologue',2000);
    });
    return;
  }
  G.chapter=n;
  const t={1:{n:'ACTE I',t:'Exploration'},2:{n:'ACTE II',t:'La Montée des Ténèbres'},4:{n:'ACTE IV',t:'Le Sauveur'}};
  if(t[n])showCard(t[n].n,t[n].t);
  if(n===2){Audio.play('stinger');startRndScreamers();}
  if(n>=3)document.getElementById('game-screen').classList.add('tense-mode');
}
function showCard(num,name){const c=document.getElementById('chapter-card');document.getElementById('chapter-number').textContent=num;document.getElementById('chapter-name').textContent=name;c.classList.remove('hidden');setTimeout(()=>c.classList.add('hidden'),3800);}

// ════════════════════════════════════════════════════════════
// EPILOGUE & CREDITS
// ════════════════════════════════════════════════════════════
function startEpilogue(){
  Audio.playAmbient('safe');Audio.stopRandomCreaks();
  document.getElementById('game-screen').classList.remove('tense-mode');
  showScreen('epilogue-screen');
  const lines=["Le TastyCrousty Maléfique avait été vaincu.\n\nPar l'estomac d'un homme extraordinaire.","Nico rentra chez lui.\n\nIl ne remangea jamais de TastyCrousty.\n\nPar principe.","Byilhan fut pleuré 3 semaines.\n\nEnsuite Nico commanda une pizza.\n\nC'était ce que Byilhan aurait voulu.","Flamby rentra chez lui.\n\nIl avait encore faim.\n\nIl commanda 4 pizzas.","L'usine fut démolie. Sur l'emplacement fut construit un parking.\n\nPersonne ne se demanda jamais pourquoi les pneus des voitures étaient parfois mordus.","— FIN —"];
  let ei=0;const et=document.getElementById('epilogue-text'),eb=document.getElementById('epilogue-advance');
  function showEp(){et.style.opacity='0';setTimeout(()=>{et.innerHTML=lines[ei].replace(/\n/g,'<br>');et.style.transition='opacity 1s';et.style.opacity='1';eb.classList.remove('hidden');},400);}
  showEp();
  const nb=eb.cloneNode(true);eb.parentNode.replaceChild(nb,eb);
  document.getElementById('epilogue-advance').addEventListener('click',()=>{ei++;if(ei>=lines.length)startCredits();else{document.getElementById('epilogue-advance').classList.add('hidden');showEp();}});
}
function startCredits(){
  Audio.play('victory');showScreen('credits-screen');
  document.getElementById('credits-scroll').innerHTML=`<div class="credits-title-main">NICO ET LE TASTYCROUSTY MALÉFIQUE</div><div class="credits-separator">☠ ☠ ☠</div><div class="credits-section">Développé par</div><div class="credits-dev">STIROXBEREAL</div><div class="credits-separator">· · ·</div><div class="credits-section">Personnages</div><div class="credits-name">NICO — Le Protagoniste</div><div class="credits-name">BYILHAN — L'Ami Courageux (RIP)</div><div class="credits-name">FLAMBY — Le Sauveur au Ventre de Fer</div><div class="credits-separator">☠ ☠ ☠</div><div class="credits-section">Technologies</div><div class="credits-name">Three.js r128 · Web Audio API · HTML5/JS</div><div class="credits-separator">☠ ☠ ☠</div><div class="credits-dev" style="font-size:2.5rem;margin-top:40px">MERCI D'AVOIR JOUÉ</div><div class="credits-section" style="margin-top:14px">© 2024 STIROXBEREAL</div>`;
  const cb=document.getElementById('credits-back');const nb=cb.cloneNode(true);cb.parentNode.replaceChild(nb,cb);
  document.getElementById('credits-back').addEventListener('click',()=>{showScreen('main-menu');showMenu();});
}

// ════════════════════════════════════════════════════════════
// UI
// ════════════════════════════════════════════════════════════
let toastTO=null;
function showToast(msg){let t=document.getElementById('toast-msg');if(!t){t=document.createElement('div');t.id='toast-msg';t.style.cssText='position:fixed;top:56px;left:50%;transform:translateX(-50%);background:rgba(8,4,6,.93);color:#c8b8a8;border:1px solid rgba(180,20,30,.5);border-top:2px solid #cc1122;font-family:Oswald,sans-serif;font-size:.8rem;letter-spacing:2px;padding:10px 22px;max-width:60vw;text-align:center;z-index:80;pointer-events:none;transition:opacity .3s ease;';document.getElementById('game-screen').appendChild(t);}t.textContent=msg;t.style.opacity='1';clearTimeout(toastTO);toastTO=setTimeout(()=>t.style.opacity='0',3200);}
function showScreen(id){document.querySelectorAll('.screen').forEach(s=>s.classList.add('hidden'));document.getElementById(id).classList.remove('hidden');}
function togglePause(){G.paused=!G.paused;document.getElementById('pause-menu').classList.toggle('hidden',!G.paused);if(G.paused&&Ctrl.locked)document.exitPointerLock();}

// ════════════════════════════════════════════════════════════
// SAVE/LOAD
// ════════════════════════════════════════════════════════════
function saveGame(){localStorage.setItem('tc_save',JSON.stringify({chapter:G.chapter,scene:G.scene,inventory:G.inventory,notes:G.notes,flags:G.flags}));document.getElementById('btn-continue').disabled=false;}
function loadSave(){const d=localStorage.getItem('tc_save');if(!d)return;try{const s=JSON.parse(d);Object.assign(G,{chapter:s.chapter,scene:s.scene,inventory:s.inventory,notes:s.notes,flags:s.flags,selectedItem:null});showScreen('game-screen');gameRunning=true;renderInv();document.getElementById('notes-count').textContent=`Notes : ${G.notes.length}`;loadRoom(G.scene||'fastfood_outside');startLoop();Ctrl.init();}catch(e){alert('Sauvegarde corrompue.');}}

// ════════════════════════════════════════════════════════════
// MENU
// ════════════════════════════════════════════════════════════
function showMenu(){showScreen('main-menu');gameRunning=false;Audio.init();Audio.playAmbient('factory');Audio.startRandomCreaks('low');animMenuBg();}
let menuAId=null;
function animMenuBg(){if(menuAId)cancelAnimationFrame(menuAId);const cv=document.getElementById('menu-bg-canvas');const ctx=cv.getContext('2d');let t=0;(function fr(){menuAId=requestAnimationFrame(fr);t+=0.004;ctx.fillStyle='rgba(0,0,0,0.05)';ctx.fillRect(0,0,cv.width,cv.height);for(let i=0;i<3;i++){const x=((Math.sin(t*.3+i*2.1)*.5+.5)+t*.04)%1*cv.width,y=(Math.cos(t*.2+i*1.7)*.5+.5)*cv.height;ctx.fillStyle=`rgba(${110+Math.sin(t+i)*30},0,0,0.07)`;ctx.beginPath();ctx.arc(x,y,80+Math.sin(t*2+i)*25,0,Math.PI*2);ctx.fill();}})();}
function startNewGame(){Audio.resume();cancelAnimationFrame(menuAId);Audio.stopRandomCreaks();Object.assign(G,{chapter:0,scene:'',inventory:[],notes:[],flags:{},selectedItem:null});showScreen('cinematic-screen');Cinematic.play('intro',()=>{showScreen('game-screen');G.chapter=1;showCard('ACTE I','Exploration');setTimeout(()=>{loadRoom('fastfood_outside');renderInv();startLoop();Ctrl.init();gameRunning=true;},800);});}

// ════════════════════════════════════════════════════════════
// INIT
// ════════════════════════════════════════════════════════════
function init(){
  const mCV=document.getElementById('menu-bg-canvas');mCV.width=window.innerWidth;mCV.height=window.innerHeight;
  window.addEventListener('resize',()=>{mCV.width=window.innerWidth;mCV.height=window.innerHeight;});
  // Fade overlay
  fadeEl=document.createElement('div');fadeEl.style.cssText='position:fixed;inset:0;background:#000;opacity:0;pointer-events:none;z-index:88;';document.body.appendChild(fadeEl);
  // Init Three.js
  initThree();
  // FPS HUD elements
  const gs=document.getElementById('game-screen');
  // Interact hint
  const iHint=document.createElement('div');iHint.id='i-hint';iHint.style.cssText='position:fixed;bottom:100px;left:50%;transform:translateX(-50%);color:#c8b89a;font-family:Oswald,sans-serif;font-size:.85rem;letter-spacing:3px;background:rgba(0,0,0,.78);border:1px solid rgba(180,20,30,.4);border-top:1px solid #cc1122;padding:8px 18px;display:none;z-index:30;pointer-events:none;';gs.appendChild(iHint);
  // Pointer lock hint
  const pH=document.createElement('div');pH.id='ptr-hint';pH.style.cssText='position:fixed;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;background:rgba(0,0,0,.52);z-index:22;pointer-events:none;';pH.innerHTML='<div style="font-family:Oswald,sans-serif;font-size:1.1rem;letter-spacing:4px;color:#c8b89a;background:rgba(0,0,0,.85);border:1px solid rgba(180,20,30,.4);border-top:2px solid #cc1122;padding:22px 38px;text-align:center;"><div style="font-size:2.2rem;margin-bottom:10px">🔦</div>CLIQUEZ POUR JOUER<br><span style="font-size:.68rem;color:#888;letter-spacing:2px">ZQSD · Souris · E = Interagir · F = Lampe Torche · Esc = Pause</span></div>';gs.appendChild(pH);
  // Crosshair
  const xh=document.createElement('div');xh.style.cssText='position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);width:14px;height:14px;z-index:21;pointer-events:none;';xh.innerHTML='<div style="position:absolute;top:50%;left:0;right:0;height:1px;background:rgba(255,255,255,0.45);transform:translateY(-50%)"></div><div style="position:absolute;left:50%;top:0;bottom:0;width:1px;background:rgba(255,255,255,0.45);transform:translateX(-50%)"></div><div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:2px;height:2px;background:rgba(255,255,255,0.7);border-radius:50%"></div>';gs.appendChild(xh);
  // Wire buttons
  document.getElementById('btn-new-game').addEventListener('click',startNewGame);
  document.getElementById('btn-continue').addEventListener('click',loadSave);
  document.getElementById('btn-options').addEventListener('click',()=>showScreen('options-screen'));
  document.getElementById('btn-quit').addEventListener('click',()=>window.location.reload());
  document.getElementById('btn-back-options').addEventListener('click',showMenu);
  const vs=document.getElementById('volume-slider'),bs=document.getElementById('bright-slider');
  vs.addEventListener('input',()=>{G.options.volume=vs.value/100;Audio.setVolume(G.options.volume);document.getElementById('volume-val').textContent=vs.value+'%';});
  bs.addEventListener('input',()=>{G.options.brightness=bs.value/100;document.getElementById('bright-val').textContent=bs.value+'%';document.getElementById('vignette-overlay').style.opacity=1.2-G.options.brightness;});
  document.getElementById('dialog-advance').addEventListener('click',advanceDialog);
  document.getElementById('note-close-btn').addEventListener('click',closeNote);
  document.getElementById('puzzle-cancel').addEventListener('click',closePuzzle);
  document.getElementById('pause-btn').addEventListener('click',togglePause);
  document.getElementById('pause-resume').addEventListener('click',togglePause);
  document.getElementById('pause-save').addEventListener('click',()=>{saveGame();showToast('Partie sauvegardée !');});
  document.getElementById('pause-main-menu').addEventListener('click',()=>{G.paused=false;document.getElementById('pause-menu').classList.add('hidden');if(loopId)cancelAnimationFrame(loopId);gameRunning=false;Audio.stopRandomCreaks();showMenu();});
  document.getElementById('cinematic-skip-btn').addEventListener('click',()=>{if(typeof Cinematic!=='undefined'&&Cinematic.skip)Cinematic.skip();});
  document.getElementById('epilogue-advance').addEventListener('click',()=>{});
  if(localStorage.getItem('tc_save'))document.getElementById('btn-continue').disabled=false;
  Audio.init();
  // Loading
  const bar=document.getElementById('loading-bar'),txt=document.getElementById('loading-text');
  const steps=[[15,'Chargement du moteur 3D...'],[30,'Génération des salles Three.js...'],[48,'Calibrage de la lampe torche...'],[65,'Compilation des dialogues...'],[80,'Calibrage des détecteurs de croutons...'],[92,'Instanciation de Flamby...'],[100,'Prêt — Cliquez pour jouer.']];
  let si=0;(function step(){if(si>=steps.length){setTimeout(()=>{document.getElementById('loading-screen').style.display='none';showMenu();},500);return;}const [p,m]=steps[si++];bar.style.width=p+'%';txt.textContent=m;setTimeout(step,260+Math.random()*360);})();
}
window.addEventListener('DOMContentLoaded',init);
