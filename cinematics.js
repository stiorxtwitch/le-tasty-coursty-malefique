/* ═══════════════════════════════════════════════
   CINEMATICS.JS — Cinématiques 3D avec Three.js
   ═══════════════════════════════════════════════ */
'use strict';

const Cinematic = (() => {
  let renderer = null;
  let currentScene = null;
  let animFrameId = null;
  let onCompleteCallback = null;
  let canvas = null;
  let textOverlay = null;
  let skipBtn = null;
  let clock = null;

  // ── INIT ────────────────────────────────────
  function init() {
    canvas = document.getElementById('cinematic-canvas');
    textOverlay = document.getElementById('cinematic-text-overlay');
    skipBtn = document.getElementById('cinematic-skip-btn');

    renderer = new THREE.WebGLRenderer({ canvas, antialias:true, alpha:false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.6;

    clock = new THREE.Clock();

    skipBtn.addEventListener('click', skip);
    window.addEventListener('resize', onResize);
  }

  function onResize() {
    if (!renderer) return;
    renderer.setSize(window.innerWidth, window.innerHeight);
    if (currentScene && currentScene.camera) {
      currentScene.camera.aspect = window.innerWidth / window.innerHeight;
      currentScene.camera.updateProjectionMatrix();
    }
  }

  // ── PLAY ────────────────────────────────────
  function play(name, onComplete) {
    if (!renderer) init();
    Audio.resume();
    onCompleteCallback = onComplete || (()=>{});
    stopLoop();

    document.getElementById('cinematic-screen').classList.remove('hidden');
    document.getElementById('game-screen').classList.add('hidden');
    textOverlay.innerHTML = '';
    textOverlay.style.opacity = '0';

    clock.start();

    switch(name) {
      case 'intro':       buildIntro();       break;
      case 'byilhan_death': buildByilhanDeath(); break;
      case 'finale':      buildFinale();      break;
      default: complete();
    }
  }

  function complete() {
    stopLoop();
    document.getElementById('cinematic-screen').classList.add('hidden');
    if(onCompleteCallback) {
      const cb = onCompleteCallback;
      onCompleteCallback = null;
      cb();
    }
  }

  function skip() { complete(); }

  function stopLoop() {
    if(animFrameId) cancelAnimationFrame(animFrameId);
    animFrameId = null;
  }

  function setText(html, delay=0) {
    setTimeout(()=>{
      textOverlay.innerHTML = html;
      textOverlay.style.opacity = '0';
      textOverlay.style.transition = 'opacity 1s ease';
      setTimeout(()=>textOverlay.style.opacity='1', 50);
    }, delay);
  }

  function clearText(delay=0) {
    setTimeout(()=>{
      textOverlay.style.opacity='0';
    }, delay);
  }

  // ── HELPERS 3D ──────────────────────────────
  function makeMat(color, roughness=0.9, metalness=0.0, emissive=0x000000, emissiveI=0) {
    return new THREE.MeshStandardMaterial({
      color, roughness, metalness,
      emissive, emissiveIntensity: emissiveI
    });
  }

  function addFog(scene, color=0x000000, near=5, far=30) {
    scene.fog = new THREE.FogExp2(color, 0.07);
  }

  function buildFloor(scene, size=40) {
    const geo = new THREE.PlaneGeometry(size, size);
    const mat = makeMat(0x0a0404);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.x = -Math.PI/2;
    mesh.receiveShadow = true;
    scene.add(mesh);
    return mesh;
  }

  // Build a simple human-like figure
  function buildHumanFigure(colors) {
    const group = new THREE.Group();
    const {body:bodyC, head:headC, accent:accC} = colors;

    // Body (torso)
    const torso = new THREE.Mesh(new THREE.BoxGeometry(.35,.5,.2), makeMat(bodyC));
    torso.position.y = .85;
    torso.castShadow = true;
    group.add(torso);

    // Head
    const head = new THREE.Mesh(new THREE.SphereGeometry(.18, 12, 8), makeMat(0xc8a070));
    head.position.y = 1.35;
    head.castShadow = true;
    group.add(head);

    // Legs
    [-0.1, 0.1].forEach(x=>{
      const leg = new THREE.Mesh(new THREE.BoxGeometry(.14,.5,.14), makeMat(bodyC));
      leg.position.set(x, .35, 0);
      leg.castShadow = true;
      group.add(leg);
    });

    // Arms
    [-0.25, 0.25].forEach(x=>{
      const arm = new THREE.Mesh(new THREE.BoxGeometry(.1,.4,.1), makeMat(bodyC));
      arm.position.set(x, .85, 0);
      arm.castShadow = true;
      group.add(arm);
    });

    // Accent (hat/detail)
    if(accC) {
      const acc = new THREE.Mesh(new THREE.CylinderGeometry(.19,.19,.08,12), makeMat(accC));
      acc.position.y = 1.52;
      group.add(acc);
    }

    return group;
  }

  // Build TastyCrousty monster
  function buildTastyCrousty(scale=1) {
    const group = new THREE.Group();
    group.scale.set(scale,scale,scale);

    // Main body: irregular crouton shape
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(1.2,0.7,0.9),
      makeMat(0x8b5a00, 0.7, 0, 0xff3300, 0.3)
    );
    body.castShadow = true;
    group.add(body);

    // Bumps on body
    for(let i=0;i<6;i++){
      const bump = new THREE.Mesh(
        new THREE.SphereGeometry(.12+Math.random()*.08, 6, 4),
        makeMat(0x6b4000, 0.8, 0, 0xff2200, 0.2)
      );
      bump.position.set(
        (Math.random()-.5)*1.0,
        .25+Math.random()*.2,
        (Math.random()-.5)*0.7
      );
      group.add(bump);
    }

    // Eyes (glowing)
    [-0.22, 0.22].forEach(x=>{
      const eye = new THREE.Mesh(
        new THREE.SphereGeometry(.1, 8, 6),
        makeMat(0x000000, 0, 0, 0xff0000, 4)
      );
      eye.position.set(x, 0.1, 0.46);
      group.add(eye);

      // Eye glow
      const glow = new THREE.Mesh(
        new THREE.SphereGeometry(.14, 8, 6),
        new THREE.MeshBasicMaterial({color:0xff2200, transparent:true, opacity:.3})
      );
      glow.position.copy(eye.position);
      group.add(glow);
    });

    // Mouth (teeth row)
    const mouth = new THREE.Mesh(
      new THREE.BoxGeometry(.7,.12,.05),
      makeMat(0x000000)
    );
    mouth.position.set(0, -.12, 0.46);
    group.add(mouth);

    for(let i=-3;i<=3;i++){
      const tooth = new THREE.Mesh(
        new THREE.ConeGeometry(.04,.1,4),
        makeMat(0xeee8d0)
      );
      tooth.position.set(i*.09, -.1, 0.47);
      tooth.rotation.x = Math.PI;
      group.add(tooth);
    }

    // Legs/tendrils
    for(let i=0;i<4;i++){
      const angle = (i/4)*Math.PI*2;
      const tendril = new THREE.Mesh(
        new THREE.CylinderGeometry(.04,.08,.5,6),
        makeMat(0x5a3800, 0.8, 0, 0x880000, 0.3)
      );
      tendril.position.set(
        Math.cos(angle)*.5,
        -.5,
        Math.sin(angle)*.4
      );
      tendril.rotation.z = Math.cos(angle)*.3;
      tendril.rotation.x = Math.sin(angle)*.3;
      group.add(tendril);
    }

    return group;
  }

  // ═══════════════════════════════════════════
  // CINÉMATIQUE 1 : INTRO
  // ═══════════════════════════════════════════
  function buildIntro() {
    Audio.play('rumble');
    Audio.playAmbient('factory');

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);
    addFog(scene);

    const camera = new THREE.PerspectiveCamera(60, window.innerWidth/window.innerHeight, 0.1, 100);
    camera.position.set(0, 1.6, 8);
    camera.lookAt(0,1,0);

    // Lighting
    const ambient = new THREE.AmbientLight(0x050203, 0.5);
    scene.add(ambient);

    const redSpot = new THREE.SpotLight(0xff1100, 3, 20, Math.PI/6, 0.6, 2);
    redSpot.position.set(0, 8, 0);
    redSpot.castShadow = true;
    scene.add(redSpot);

    const yellowPt = new THREE.PointLight(0xd49000, 1, 10);
    yellowPt.position.set(-3, 3, -3);
    scene.add(yellowPt);

    // Floor
    buildFloor(scene, 50);

    // Walls (corridor)
    const wallMat = makeMat(0x0d0608, 0.95);
    [-4, 4].forEach(x=>{
      const wall = new THREE.Mesh(new THREE.BoxGeometry(.3, 5, 30), wallMat);
      wall.position.set(x, 2.5, -5);
      wall.receiveShadow = true;
      scene.add(wall);
    });
    const ceiling = new THREE.Mesh(new THREE.BoxGeometry(9, .3, 30), makeMat(0x080305));
    ceiling.position.set(0, 5, -5);
    scene.add(ceiling);

    // Fast food sign
    const signMat = makeMat(0x1a0a00, 0.5, 0, 0xd47000, 0.8);
    const sign = new THREE.Mesh(new THREE.BoxGeometry(3.5, .8, .15), signMat);
    sign.position.set(0, 3.8, -12);
    scene.add(sign);

    // Sign text geometry (simple box representations)
    for(let i=0;i<5;i++){
      const letter = new THREE.Mesh(
        new THREE.BoxGeometry(.25, .35, .05),
        makeMat(0xffaa00, 0, 0, 0xff8800, 2)
      );
      letter.position.set(-1.2+i*.6, 3.8, -11.9);
      scene.add(letter);
    }

    // TastyCrousty lurking in shadows
    const tasty = buildTastyCrousty(1.5);
    tasty.position.set(0, .35, -18);
    scene.add(tasty);

    // Particles (dust/spores)
    const particleGeo = new THREE.BufferGeometry();
    const particleCount = 300;
    const positions = new Float32Array(particleCount*3);
    for(let i=0;i<particleCount;i++){
      positions[i*3]   = (Math.random()-.5)*8;
      positions[i*3+1] = Math.random()*5;
      positions[i*3+2] = -Math.random()*20;
    }
    particleGeo.setAttribute('position', new THREE.BufferAttribute(positions,3));
    const particleMat = new THREE.PointsMaterial({color:0x553322, size:.05, transparent:true, opacity:.6});
    scene.add(new THREE.Points(particleGeo, particleMat));

    // Text sequence
    const texts = [
      { time:0.5,  html:'<em>Quelque part... dans une zone industrielle abandonnée.</em>' },
      { time:4,    html:'<em>Un fast-food fermé depuis des années.</em><br><em>Un snack interdit.</em><br><em>Une erreur scientifique.</em>' },
      { time:9,    html:'<strong style="color:#d4a017;font-size:1.3rem">TastyCrousty</strong><br><em>Lot n°666 — Ne jamais consommer</em>' },
      { time:14,   html:'<strong>Nico</strong> et son ami <strong>Byilhan</strong> ne savaient pas ce qui les attendait...' },
    ];

    currentScene = { scene, camera, tasty, redSpot, yellowPt, texts };

    let lastTextTime = -1;
    let elapsed = 0;
    const DURATION = 18;

    function animate() {
      animFrameId = requestAnimationFrame(animate);
      elapsed = clock.getElapsedTime();
      const t = elapsed;

      // Camera slow dolly forward
      camera.position.z = 8 - t * 0.5;
      camera.position.y = 1.6 + Math.sin(t * 0.3) * 0.05;

      // Red light flicker
      redSpot.intensity = 2.5 + Math.sin(t*7)*0.3 + (Math.random()<.005 ? 2 : 0);

      // TastyCrousty breathe/glow
      tasty.children.forEach(c=>{
        if(c.material && c.material.emissiveIntensity > 0) {
          c.material.emissiveIntensity = 0.3 + Math.sin(t*2)*0.15;
        }
      });
      tasty.position.y = .35 + Math.sin(t*1.5)*.05;
      tasty.rotation.y = Math.sin(t*.5)*.1;

      // Text sequence
      for(const tx of texts) {
        if(t >= tx.time && lastTextTime < tx.time) {
          setText(tx.html);
          lastTextTime = tx.time;
        }
      }

      // End
      if(t > DURATION) { complete(); return; }

      renderer.render(scene, camera);
    }
    animate();
  }

  // ═══════════════════════════════════════════
  // CINÉMATIQUE 2 : MORT DE BYILHAN
  // ═══════════════════════════════════════════
  function buildByilhanDeath() {
    Audio.play('stinger');
    Audio.playAmbient('horror');

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);
    scene.fog = new THREE.FogExp2(0x100005, 0.08);

    const camera = new THREE.PerspectiveCamera(70, window.innerWidth/window.innerHeight, 0.1, 50);
    camera.position.set(0, 1.6, 5);
    camera.lookAt(0, 1.2, 0);

    // Lighting — red horror
    const ambient = new THREE.AmbientLight(0x0a0003, 0.3);
    scene.add(ambient);
    const redLight = new THREE.PointLight(0xff1100, 4, 12);
    redLight.position.set(0, 4, 0);
    redLight.castShadow = true;
    scene.add(redLight);
    const backLight = new THREE.PointLight(0x330000, 1, 8);
    backLight.position.set(0, 1, -3);
    scene.add(backLight);

    buildFloor(scene, 20);

    // Walls
    const wm = makeMat(0x0a0305, 0.98);
    for(let i=0;i<4;i++){
      const angle = i*Math.PI/2;
      const wall = new THREE.Mesh(new THREE.BoxGeometry(10, 5, .3), wm);
      wall.position.set(Math.sin(angle)*5, 2.5, Math.cos(angle)*5);
      wall.rotation.y = angle;
      wall.receiveShadow = true;
      scene.add(wall);
    }

    // Byilhan figure (curly hair, beige shirt)
    const byilhan = buildHumanFigure({body:0xd4c8a8, head:0xc8a070, accent:null});
    // Curly hair
    const hairGeo = new THREE.SphereGeometry(.2, 10, 8);
    const hair = new THREE.Mesh(hairGeo, makeMat(0x1a0e05, 0.9));
    hair.scale.set(1, 0.75, 1);
    hair.position.y = 1.48;
    byilhan.add(hair);

    byilhan.position.set(0, 0, 1);
    scene.add(byilhan);

    // TastyCrousty
    const tasty = buildTastyCrousty(1.2);
    tasty.position.set(0, .35, -3);
    tasty.rotation.y = Math.PI; // facing camera
    scene.add(tasty);

    // Blood particle system
    const bloodGeo = new THREE.BufferGeometry();
    const bCount = 200;
    const bPos = new Float32Array(bCount*3);
    const bVel = new Float32Array(bCount*3);
    for(let i=0;i<bCount;i++){
      bPos[i*3]=0; bPos[i*3+1]=1; bPos[i*3+2]=0;
      bVel[i*3]   = (Math.random()-.5)*4;
      bVel[i*3+1] = Math.random()*5;
      bVel[i*3+2] = (Math.random()-.5)*4;
    }
    bloodGeo.setAttribute('position', new THREE.BufferAttribute(bPos,3));
    const bloodMat = new THREE.PointsMaterial({color:0xcc0011, size:.06, transparent:true, opacity:0});
    const blood = new THREE.Points(bloodGeo, bloodMat);
    scene.add(blood);

    const texts = [
      { time:0.5,  html:'<em>Le TastyCrousty émergea des ténèbres...</em>' },
      { time:4,    html:'<strong style="color:#ff3333">BYILHAN :</strong> "NICO ! RUN ! COURS !!! NO—"' },
      { time:6.5,  html:'<em style="color:#880000">Le silence. Puis le craquement.</em>' },
      { time:11,   html:'<em>Byilhan... était parti.</em>' },
    ];

    currentScene = { scene, camera, byilhan, tasty, blood, bPos, bVel, redLight, texts };

    let elapsed = 0;
    let lastTextTime = -1;
    let attackStarted = false;
    let bloodActive = false;

    function animate() {
      animFrameId = requestAnimationFrame(animate);
      elapsed = clock.getElapsedTime();
      const t = elapsed;

      // Phase 1: TastyCrousty charges
      if(t < 4) {
        tasty.position.z = -3 + t * 0.4;
        tasty.position.y = .35 + Math.sin(t*8)*.03;
        tasty.rotation.y = Math.PI + Math.sin(t*3)*.05;
        byilhan.rotation.y = Math.sin(t*.5)*.1; // trembling
      }

      // Phase 2: Attack
      if(t >= 4 && t < 6) {
        if(!attackStarted) {
          attackStarted = true;
          Audio.play('screamer');
        }
        const attackT = (t-4)/2;
        tasty.position.z = -1.4 + attackT*2;
        byilhan.position.y = attackT * -.5;
        byilhan.rotation.x = attackT * .8;
        byilhan.position.z = 1 + attackT * .5;
        camera.position.z = 5 + attackT*1.5;
        camera.position.y = 1.6 + attackT*0.3;
        redLight.intensity = 4 + Math.sin(t*30)*3;
      }

      // Phase 3: Blood & aftermath
      if(t >= 5.5 && !bloodActive) {
        bloodActive = true;
        bloodMat.opacity = 0.8;
      }
      if(bloodActive && t < 9) {
        const bPosArr = blood.geometry.attributes.position.array;
        for(let i=0;i<bCount;i++){
          bPosArr[i*3]   += bVel[i*3]   * .016;
          bPosArr[i*3+1] += (bVel[i*3+1]*.016 - 0.016*9.8*(t-5.5));
          bPosArr[i*3+2] += bVel[i*3+2] * .016;
        }
        blood.geometry.attributes.position.needsUpdate = true;
        bloodMat.opacity = Math.max(0, 0.8 - (t-5.5)/3);
      }

      // Phase 4: Byilhan disappears
      if(t >= 6) {
        byilhan.visible = false;
        tasty.position.set(0, .35, 0);
        tasty.rotation.y = 0;
        redLight.intensity = 2 + Math.sin(t*1.5)*.5;
        camera.position.set(
          Math.sin(t*.3)*.1,
          1.6 + Math.sin(t*.5)*.05,
          5 + (t-6)*.3
        );
        camera.lookAt(tasty.position.x, 1.2, tasty.position.z);
        tasty.children.forEach(c=>{
          if(c.material && c.material.emissiveIntensity > 0)
            c.material.emissiveIntensity = 1+Math.sin(t*3)*.5;
        });
      }

      for(const tx of texts) {
        if(t >= tx.time && lastTextTime < tx.time) {
          setText(tx.html);
          lastTextTime = tx.time;
        }
      }

      if(t > 15) { complete(); return; }

      renderer.render(scene, camera);
    }
    animate();
  }

  // ═══════════════════════════════════════════
  // CINÉMATIQUE 3 : FINALE — FLAMBY MANGE LE TASTYCROUSTY
  // ═══════════════════════════════════════════
  function buildFinale() {
    Audio.playAmbient('tension');

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);
    scene.fog = new THREE.FogExp2(0x050010, 0.05);

    const camera = new THREE.PerspectiveCamera(65, window.innerWidth/window.innerHeight, 0.1, 80);
    camera.position.set(0, 1.8, 7);
    camera.lookAt(0, 1, 0);

    // Lighting
    const ambient = new THREE.AmbientLight(0x05031a, 0.4);
    scene.add(ambient);
    const mainLight = new THREE.SpotLight(0xffd080, 2.5, 20, Math.PI/5, 0.5);
    mainLight.position.set(0, 8, 2);
    mainLight.castShadow = true;
    scene.add(mainLight);
    const redFill = new THREE.PointLight(0xff2200, 1.5, 15);
    redFill.position.set(-4, 3, 0);
    scene.add(redFill);
    const blueFill = new THREE.PointLight(0x0044cc, 1, 10);
    blueFill.position.set(4, 3, 0);
    scene.add(blueFill);

    buildFloor(scene, 50);

    // Ancient stone walls
    const stoneMat = makeMat(0x151015, 0.98);
    for(let i=0;i<4;i++){
      const angle = i*Math.PI/2;
      const wall = new THREE.Mesh(new THREE.BoxGeometry(18, 8, .5), stoneMat);
      wall.position.set(Math.sin(angle)*9, 4, Math.cos(angle)*9);
      wall.rotation.y = angle;
      scene.add(wall);
    }

    // Ritual circle on floor
    const ringGeo = new THREE.RingGeometry(2, 2.2, 32);
    const ringMat = new THREE.MeshBasicMaterial({color:0xdd4400, side:THREE.DoubleSide});
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI/2;
    ring.position.y = .01;
    scene.add(ring);
    const innerRing = new THREE.Mesh(new THREE.RingGeometry(.8,.9,32), new THREE.MeshBasicMaterial({color:0xaa2200,side:THREE.DoubleSide}));
    innerRing.rotation.x = -Math.PI/2;
    innerRing.position.y = .01;
    scene.add(innerRing);

    // Flamby figure (headphones, hoodie)
    const flamby = buildHumanFigure({body:0x888888, head:0xc8a878, accent:0x222222});
    // Hoodie details
    const hood = new THREE.Mesh(new THREE.SphereGeometry(.22, 10, 8), makeMat(0x888888));
    hood.scale.set(1,.6,1);
    hood.position.y = 1.52;
    flamby.add(hood);
    // Headphones arc
    const hpArc = new THREE.Mesh(new THREE.TorusGeometry(.22,.03,6,12,Math.PI), makeMat(0x111111));
    hpArc.position.y = 1.5;
    hpArc.rotation.z = Math.PI/2;
    flamby.add(hpArc);

    flamby.position.set(-2.5, 0, .5);
    flamby.rotation.y = 0.5;
    scene.add(flamby);

    // TastyCrousty
    const tasty = buildTastyCrousty(1.3);
    tasty.position.set(1.5, .35, -1);
    scene.add(tasty);

    // Victory particles
    const victGeo = new THREE.BufferGeometry();
    const vCount = 500;
    const vPos = new Float32Array(vCount*3);
    const vVel = new Float32Array(vCount*3);
    const vColors = new Float32Array(vCount*3);
    for(let i=0;i<vCount;i++){
      vPos[i*3]=0; vPos[i*3+1]=1; vPos[i*3+2]=0;
      vVel[i*3]   = (Math.random()-.5)*6;
      vVel[i*3+1] = Math.random()*6+2;
      vVel[i*3+2] = (Math.random()-.5)*6;
      const r = Math.random();
      vColors[i*3]   = r < .4 ? 1 : r < .7 ? 0.8 : 0.2;
      vColors[i*3+1] = r < .4 ? .7 : r < .7 ? 0.5 : 0.8;
      vColors[i*3+2] = r < .4 ? 0 : r < .7 ? 0 : 0.2;
    }
    victGeo.setAttribute('position', new THREE.BufferAttribute(vPos,3));
    victGeo.setAttribute('color', new THREE.BufferAttribute(vColors,3));
    const victMat = new THREE.PointsMaterial({size:.06, vertexColors:true, transparent:true, opacity:0});
    const victory = new THREE.Points(victGeo, victMat);
    scene.add(victory);

    const texts = [
      { time:0.5,  html:'<em>La chambre rituelle. L\'air est immobile.</em>' },
      { time:4,    html:'<strong style="color:#ffd080">FLAMBY :</strong> "Recule, Nico. Je m\'en occupe."' },
      { time:7.5,  html:'<em>Flamby s\'avança vers la créature sans la moindre peur...</em>' },
      { time:12,   html:'<strong style="color:#ffd080">FLAMBY :</strong> "Hmm. Pas mauvais. Un peu trop de sel."' },
      { time:17,   html:'<strong style="color:#4cffaa;font-size:1.3rem">Le TastyCrousty Maléfique était vaincu.</strong><br><em>Sauvé par le ventre de fer de Flamby le Sauveur.</em>' },
      { time:22,   html:'<em>Et Nico... put rentrer chez lui.</em>' },
    ];

    currentScene = { scene, camera, flamby, tasty, victory, victMat, vPos, vVel, mainLight, redFill, texts };

    let elapsed = 0;
    let lastTextTime = -1;
    let eatingStarted = false;
    let victoryStarted = false;

    function animate() {
      animFrameId = requestAnimationFrame(animate);
      elapsed = clock.getElapsedTime();
      const t = elapsed;

      // Phase 1: Setup (0-5s)
      if(t < 5) {
        flamby.position.set(-2.5 + t*.1, 0, .5);
        tasty.position.y = .35 + Math.sin(t*2)*.1;
        tasty.rotation.y += .01;
        camera.position.x = Math.sin(t*.2)*.3;
      }

      // Phase 2: Flamby approaches (5-9s)
      if(t >= 5 && t < 10) {
        const p = (t-5)/5;
        flamby.position.set(-2.5+p*3.8, 0, .5-p*.5);
        flamby.rotation.y = .5 + p*1.5;
        tasty.position.y = .35 + Math.sin(t*3)*.15;
        tasty.rotation.y += .02;
        // Tasty backs away a little
        tasty.position.z = -1 - p*.5;
      }

      // Phase 3: Eating (10-15s)
      if(t >= 10 && t < 15) {
        if(!eatingStarted) {
          eatingStarted = true;
          Audio.play('victory');
        }
        const p = (t-10)/5;
        flamby.position.set(1.3, 0, -.5);
        // Tasty shrinks as it's eaten
        const s = 1.3 * (1-p*.8);
        tasty.scale.set(s, s, s);
        tasty.position.y = .35 * (1-p);
        // Flamby eating animation
        flamby.children[0] && (flamby.children[0].position.y = .85 + Math.sin(t*8)*.03);
        // Light flickers
        mainLight.intensity = 2.5 + Math.sin(t*10)*1.5;
        redFill.intensity = 1.5*(1-p);

        // Start victory particles
        if(p > 0.3 && victMat.opacity < 0.8) {
          victMat.opacity = Math.min(.9, victMat.opacity + .04);
        }
        if(p > 0.3) {
          victoryStarted = true;
          const vPosArr = victory.geometry.attributes.position.array;
          for(let i=0;i<vCount;i++){
            vPosArr[i*3]   += vVel[i*3]   * .016;
            vPosArr[i*3+1] += (vVel[i*3+1]*.016 - 0.016*4*(t-11.5));
            vPosArr[i*3+2] += vVel[i*3+2] * .016;
          }
          victory.geometry.attributes.position.needsUpdate = true;
        }
      }

      // Phase 4: Aftermath (15s+)
      if(t >= 15) {
        tasty.visible = false;
        victMat.opacity = Math.max(0, victMat.opacity - .005);
        mainLight.intensity = 2 + Math.sin(t*.5)*.2;

        // Graceful camera pan
        camera.position.set(
          Math.sin(t*.2)*2,
          1.8 + (t-15)*.05,
          7 + (t-15)*.1
        );
        camera.lookAt(0, 1, 0);
      }

      for(const tx of texts) {
        if(t >= tx.time && lastTextTime < tx.time) {
          setText(tx.html);
          lastTextTime = tx.time;
        }
      }

      if(t > 26) { complete(); return; }

      renderer.render(scene, camera);
    }
    animate();
  }

  return { init, play };
})();
