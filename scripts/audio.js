/* ═══════════════════════════════════════════════
   AUDIO.JS — Moteur sonore procédural (Web Audio API)
   ═══════════════════════════════════════════════ */
'use strict';

const Audio = (() => {
  let ctx = null;
  let masterGain = null;
  let ambientNode = null;
  let ambientGain = null;
  let masterVolume = 0.7;
  let initialized = false;

  function init() {
    if (initialized) return;
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      masterGain = ctx.createGain();
      masterGain.gain.value = masterVolume;
      masterGain.connect(ctx.destination);
      initialized = true;
    } catch(e) { console.warn('Web Audio non supporté'); }
  }

  function resume() {
    if (ctx && ctx.state === 'suspended') ctx.resume();
  }

  function setVolume(v) {
    masterVolume = v;
    if (masterGain) masterGain.gain.setTargetAtTime(v, ctx.currentTime, 0.1);
  }

  // ── LOW-LEVEL HELPERS ───────────────────────
  function createOscillator(type, freq, duration, gainVal, attack=0.01, release=0.1) {
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const g   = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    g.gain.setValueAtTime(0, ctx.currentTime);
    g.gain.linearRampToValueAtTime(gainVal, ctx.currentTime + attack);
    g.gain.setValueAtTime(gainVal, ctx.currentTime + duration - release);
    g.gain.linearRampToValueAtTime(0, ctx.currentTime + duration);
    osc.connect(g);
    g.connect(masterGain);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
  }

  function createNoise(duration, gainVal, filter={type:'lowpass',freq:800}) {
    if (!ctx) return;
    const bufLen = ctx.sampleRate * duration;
    const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for(let i=0;i<bufLen;i++) data[i] = Math.random()*2-1;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const biq = ctx.createBiquadFilter();
    biq.type = filter.type;
    biq.frequency.value = filter.freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, ctx.currentTime);
    g.gain.linearRampToValueAtTime(gainVal, ctx.currentTime + 0.05);
    g.gain.linearRampToValueAtTime(0, ctx.currentTime + duration);
    src.connect(biq);
    biq.connect(g);
    g.connect(masterGain);
    src.start();
    src.stop(ctx.currentTime + duration);
  }

  // ── SOUND EFFECTS ───────────────────────────
  const sounds = {

    click() {
      createOscillator('sine', 600, 0.08, 0.3, 0.001, 0.05);
    },

    door_creak() {
      if(!ctx) return;
      for(let i=0;i<3;i++){
        setTimeout(()=>{
          createOscillator('sawtooth', 60+Math.random()*30, 0.4, 0.15*masterVolume, 0.05, 0.2);
          createNoise(0.4, 0.03*masterVolume, {type:'bandpass',freq:200+Math.random()*100});
        }, i*180);
      }
    },

    footstep() {
      if(!ctx) return;
      createNoise(0.12, 0.08*masterVolume, {type:'lowpass',freq:300});
      createOscillator('sine', 40+Math.random()*20, 0.12, 0.12*masterVolume, 0.005, 0.08);
    },

    paper_pickup() {
      if(!ctx) return;
      createNoise(0.15, 0.06*masterVolume, {type:'highpass',freq:2000});
    },

    item_pickup() {
      if(!ctx) return;
      createOscillator('sine', 880, 0.1, 0.25, 0.005, 0.08);
      createOscillator('sine', 1100, 0.15, 0.2, 0.005, 0.1);
    },

    puzzle_success() {
      if(!ctx) return;
      [440,550,660,880].forEach((f,i)=>{
        setTimeout(()=>createOscillator('sine',f,0.25,0.3,0.01,0.15), i*80);
      });
    },

    puzzle_fail() {
      if(!ctx) return;
      createOscillator('sawtooth', 120, 0.4, 0.3, 0.01, 0.15);
      createOscillator('square', 80, 0.4, 0.2, 0.01, 0.2);
    },

    heartbeat() {
      if(!ctx) return;
      function beat() {
        createOscillator('sine', 60, 0.06, 0.4*masterVolume, 0.01, 0.04);
        createNoise(0.06, 0.2*masterVolume, {type:'lowpass',freq:120});
        setTimeout(()=>{
          createOscillator('sine', 55, 0.06, 0.3*masterVolume, 0.01, 0.04);
          createNoise(0.06, 0.15*masterVolume, {type:'lowpass',freq:100});
        }, 80);
      }
      beat();
    },

    // BIG SCREAMER SOUND
    screamer() {
      if(!ctx) return;
      // Loud distorted shriek
      const buf = ctx.createBuffer(1, ctx.sampleRate*1.5, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for(let i=0;i<data.length;i++){
        const t = i/ctx.sampleRate;
        const env = Math.max(0, 1 - t/1.5);
        data[i] = (Math.random()*2-1) * env * 2;
        // Add harmonic scream
        data[i] += Math.sin(2*Math.PI*900*t * (1+t*2)) * env * 0.8;
        data[i] += Math.sin(2*Math.PI*1800*t) * env * 0.3;
        // Clamp
        data[i] = Math.max(-1, Math.min(1, data[i]));
      }
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const dist = ctx.createWaveShaper();
      const curve = new Float32Array(256);
      for(let i=0;i<256;i++) {
        const x = i*2/256-1;
        curve[i] = (Math.PI+400)*x/(Math.PI+400*Math.abs(x));
      }
      dist.curve = curve;
      const g = ctx.createGain();
      g.gain.value = masterVolume * 0.9;
      src.connect(dist);
      dist.connect(g);
      g.connect(masterGain);
      src.start();
      src.stop(ctx.currentTime+1.5);
    },

    // Eerie chord
    stinger() {
      if(!ctx) return;
      [55, 58, 62, 73].forEach((freq,i)=>{
        setTimeout(()=>{
          createOscillator('sawtooth', freq, 2.5, 0.08*masterVolume, 0.3, 1.5);
        }, i*100);
      });
    },

    // Distant rumble
    rumble() {
      if(!ctx) return;
      createOscillator('sine', 30, 3, 0.2*masterVolume, 0.5, 1.5);
      createNoise(3, 0.04*masterVolume, {type:'lowpass', freq:80});
    },

    // Wind howl
    wind() {
      if(!ctx) return;
      const osc = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const g = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(120, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(90, ctx.currentTime+1);
      osc.frequency.linearRampToValueAtTime(140, ctx.currentTime+2);
      filter.type = 'bandpass';
      filter.frequency.value = 600;
      filter.Q.value = 0.8;
      g.gain.setValueAtTime(0, ctx.currentTime);
      g.gain.linearRampToValueAtTime(0.05*masterVolume, ctx.currentTime+0.5);
      g.gain.linearRampToValueAtTime(0, ctx.currentTime+2);
      osc.connect(filter);
      filter.connect(g);
      g.connect(masterGain);
      osc.start();
      osc.stop(ctx.currentTime+2);
    },

    // QTE button press
    qte_press() {
      createOscillator('square', 220, 0.08, 0.3, 0.001, 0.04);
    },

    qte_fail() {
      if(!ctx) return;
      createOscillator('sawtooth', 110, 0.6, 0.4, 0.01, 0.4);
      createNoise(0.6, 0.2*masterVolume, {type:'lowpass',freq:200});
    },

    // End game victory
    victory() {
      if(!ctx) return;
      [220,277,330,440,550].forEach((f,i)=>{
        setTimeout(()=>createOscillator('sine',f,1.5,0.2,0.05,0.8), i*150);
      });
    }
  };

  // ── AMBIENT LOOPS ───────────────────────────
  const ambients = {

    none() { stopAmbient(); },

    factory() {
      startAmbientDrone(45, 0.06, 'sawtooth');
      startAmbientDrone(62, 0.03, 'sine');
    },

    tension() {
      startAmbientDrone(30, 0.08, 'sine');
      startAmbientDrone(47, 0.04, 'square');
    },

    horror() {
      startAmbientDrone(25, 0.1, 'sawtooth');
      startAmbientDrone(38, 0.05, 'square');
      startAmbientDrone(75, 0.02, 'sine');
    },

    safe() {
      startAmbientDrone(55, 0.03, 'sine');
    }
  };

  let ambientNodes = [];
  function stopAmbient() {
    ambientNodes.forEach(n => {
      try {
        n.gain.gain.setTargetAtTime(0, ctx.currentTime, 0.5);
        setTimeout(()=>{ try{n.osc.stop();}catch(e){} }, 1000);
      } catch(e){}
    });
    ambientNodes = [];
  }

  function startAmbientDrone(freq, vol, type='sine') {
    if(!ctx) return;
    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    const g = ctx.createGain();

    osc.type = type;
    osc.frequency.value = freq;

    // Subtle LFO modulation
    lfo.type = 'sine';
    lfo.frequency.value = 0.1 + Math.random()*0.15;
    lfoGain.gain.value = 2;
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);

    filter.type = 'lowpass';
    filter.frequency.value = 400;

    g.gain.setValueAtTime(0, ctx.currentTime);
    g.gain.linearRampToValueAtTime(vol * masterVolume, ctx.currentTime + 2);

    osc.connect(filter);
    filter.connect(g);
    g.connect(masterGain);
    osc.start();
    lfo.start();

    ambientNodes.push({osc, lfo, gain: g});
  }

  function playAmbient(name) {
    if(!ctx) return;
    stopAmbient();
    if(ambients[name]) ambients[name]();
  }

  function play(name) {
    if(!ctx) { init(); }
    if(ctx.state === 'suspended') ctx.resume();
    if(sounds[name]) sounds[name]();
  }

  // Random ambient creak/drip
  let creakInterval = null;
  function startRandomCreaks(intensity='low') {
    if(creakInterval) clearInterval(creakInterval);
    const minDelay = intensity==='high' ? 4000 : 8000;
    const maxDelay = intensity==='high' ? 12000 : 25000;
    function scheduleNext() {
      const delay = minDelay + Math.random()*(maxDelay - minDelay);
      creakInterval = setTimeout(()=>{
        const r = Math.random();
        if(r < 0.4) play('door_creak');
        else if(r < 0.7) play('wind');
        else play('rumble');
        scheduleNext();
      }, delay);
    }
    scheduleNext();
  }
  function stopRandomCreaks() {
    if(creakInterval) clearTimeout(creakInterval);
    creakInterval = null;
  }

  return {
    init, resume, setVolume,
    play, playAmbient,
    startRandomCreaks, stopRandomCreaks,
    get initialized() { return initialized; }
  };
})();
