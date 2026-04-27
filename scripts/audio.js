'use strict';
const Audio = (() => {
  let ctx=null,masterGain=null,masterVolume=0.7,initialized=false,ambientNodes=[],creakTO=null,stepV=0;
  function init(){if(initialized)return;try{ctx=new(window.AudioContext||window.webkitAudioContext)();masterGain=ctx.createGain();masterGain.gain.value=masterVolume;masterGain.connect(ctx.destination);initialized=true;}catch(e){}}
  function resume(){if(ctx&&ctx.state==='suspended')ctx.resume();}
  function setVolume(v){masterVolume=v;if(masterGain)masterGain.gain.setTargetAtTime(v,ctx.currentTime,0.1);}
  function osc(type,freq,dur,vol,atk=0.005,rel=0.08){if(!ctx)return;const o=ctx.createOscillator(),g=ctx.createGain();o.type=type;o.frequency.value=freq;g.gain.setValueAtTime(0,ctx.currentTime);g.gain.linearRampToValueAtTime(vol,ctx.currentTime+atk);g.gain.setValueAtTime(vol,ctx.currentTime+dur-rel);g.gain.linearRampToValueAtTime(0,ctx.currentTime+dur);o.connect(g);g.connect(masterGain);o.start(ctx.currentTime);o.stop(ctx.currentTime+dur);}
  function noise(dur,vol,ftype='lowpass',ffreq=600){if(!ctx)return;const len=Math.ceil(ctx.sampleRate*dur),buf=ctx.createBuffer(1,len,ctx.sampleRate),data=buf.getChannelData(0);let b0=0,b1=0,b2=0;for(let i=0;i<len;i++){const w=Math.random()*2-1;b0=0.99886*b0+w*0.0555179;b1=0.99332*b1+w*0.0750759;b2=0.969*b2+w*0.153852;data[i]=(b0+b1+b2+w*0.5362)/3.5;}const src=ctx.createBufferSource();src.buffer=buf;const flt=ctx.createBiquadFilter();flt.type=ftype;flt.frequency.value=ffreq;const g=ctx.createGain();g.gain.setValueAtTime(0,ctx.currentTime);g.gain.linearRampToValueAtTime(vol*masterVolume,ctx.currentTime+0.02);g.gain.linearRampToValueAtTime(0,ctx.currentTime+dur);src.connect(flt);flt.connect(g);g.connect(masterGain);src.start();src.stop(ctx.currentTime+dur);}
  function distNoise(dur,vol){if(!ctx)return;const len=Math.ceil(ctx.sampleRate*dur),buf=ctx.createBuffer(1,len,ctx.sampleRate),d=buf.getChannelData(0);for(let i=0;i<len;i++){const t=i/ctx.sampleRate,env=Math.max(0,1-t/dur)*Math.min(1,t*20);d[i]=Math.max(-1,Math.min(1,((Math.random()*2-1)*env+Math.sin(2*Math.PI*(800+t*600)*t)*env*0.7)*2.5));}const src=ctx.createBufferSource();src.buffer=buf;const comp=ctx.createDynamicsCompressor();comp.threshold.value=-12;comp.ratio.value=20;const g=ctx.createGain();g.gain.value=vol*masterVolume;src.connect(comp);comp.connect(g);g.connect(masterGain);src.start();src.stop(ctx.currentTime+dur);}
  const sounds={
    click(){osc('sine',800,0.06,0.2*masterVolume,0.001,0.04);},
    footstep(){stepV=(stepV+1)%4;const f=[38,42,35,45][stepV];noise(0.15,0.12,'lowpass',180+stepV*20);osc('sine',f,0.12,0.14*masterVolume,0.003,0.08);},
    footstep_concrete(){noise(0.18,0.15,'bandpass',300);osc('sine',40,0.15,0.16*masterVolume,0.005,0.1);},
    door_creak(){if(!ctx)return;[80+Math.random()*20,120+Math.random()*30,60+Math.random()*15].forEach((f,i)=>{setTimeout(()=>{const o=ctx.createOscillator(),g=ctx.createGain();o.type='sawtooth';o.frequency.setValueAtTime(f,ctx.currentTime);o.frequency.linearRampToValueAtTime(f*1.15,ctx.currentTime+0.3);o.frequency.linearRampToValueAtTime(f*0.85,ctx.currentTime+0.6);g.gain.setValueAtTime(0,ctx.currentTime);g.gain.linearRampToValueAtTime(0.12*masterVolume,ctx.currentTime+0.05);g.gain.linearRampToValueAtTime(0,ctx.currentTime+0.55);const flt=ctx.createBiquadFilter();flt.type='bandpass';flt.frequency.value=300;flt.Q.value=2;o.connect(flt);flt.connect(g);g.connect(masterGain);o.start();o.stop(ctx.currentTime+0.6);},i*120);});noise(0.6,0.04,'bandpass',400);},
    paper_pickup(){noise(0.18,0.07,'highpass',3000);},
    item_pickup(){osc('sine',660,0.12,0.28*masterVolume,0.003,0.08);setTimeout(()=>osc('sine',880,0.10,0.22*masterVolume,0.003,0.08),80);},
    puzzle_success(){[330,440,550,660,880].forEach((f,i)=>setTimeout(()=>osc('sine',f,0.28,0.26*masterVolume,0.01,0.2),i*70));},
    puzzle_fail(){osc('sawtooth',120,0.45,0.28*masterVolume,0.01,0.2);setTimeout(()=>osc('square',90,0.45,0.2*masterVolume,0.01,0.25),60);},
    heartbeat(){if(!ctx)return;noise(0.07,0.4,'lowpass',100);osc('sine',58,0.07,0.38*masterVolume,0.005,0.045);setTimeout(()=>{noise(0.07,0.3,'lowpass',90);osc('sine',55,0.07,0.28*masterVolume,0.005,0.045);},90);},
    screamer(){if(!ctx)return;noise(0.08,0.9,'lowpass',8000);osc('square',60,0.08,0.8*masterVolume,0.001,0.04);setTimeout(()=>distNoise(1.4,0.85),60);},
    stinger(){if(!ctx)return;[55,58,73].forEach((f,i)=>setTimeout(()=>osc('sawtooth',f,3,0.1*masterVolume,0.4,2),i*150));},
    rumble(){osc('sine',28,3.5,0.18*masterVolume,0.8,2);noise(3.5,0.05,'lowpass',60);},
    wind(){if(!ctx)return;const o=ctx.createOscillator(),f=ctx.createBiquadFilter(),g=ctx.createGain();o.type='sawtooth';o.frequency.setValueAtTime(110,ctx.currentTime);o.frequency.linearRampToValueAtTime(85,ctx.currentTime+0.8);o.frequency.linearRampToValueAtTime(130,ctx.currentTime+2);f.type='bandpass';f.frequency.value=500;f.Q.value=0.6;g.gain.setValueAtTime(0,ctx.currentTime);g.gain.linearRampToValueAtTime(0.05*masterVolume,ctx.currentTime+0.6);g.gain.linearRampToValueAtTime(0,ctx.currentTime+2);o.connect(f);f.connect(g);g.connect(masterGain);o.start();o.stop(ctx.currentTime+2.2);noise(2.2,0.025,'bandpass',800);},
    drip(){osc('sine',1200,0.06,0.06*masterVolume,0.001,0.04);setTimeout(()=>osc('sine',900,0.05,0.04*masterVolume,0.001,0.03),35);noise(0.05,0.03,'bandpass',2000);},
    electricity(){if(!ctx)return;for(let i=0;i<4;i++)setTimeout(()=>noise(0.04,0.12,'highpass',2000+Math.random()*1000),i*30+Math.random()*20);},
    victory(){[220,277,330,440,550,660].forEach((f,i)=>setTimeout(()=>osc('sine',f,2,0.2*masterVolume,0.05,1),i*110));},
    transition(){noise(0.35,0.1,'lowpass',400);osc('sine',40,0.35,0.1*masterVolume,0.05,0.2);},
  };
  function stopAmbient(){ambientNodes.forEach(n=>{try{n.gain.gain.setTargetAtTime(0,ctx.currentTime,0.8);setTimeout(()=>{try{n.osc.stop();}catch(e){}},2500);}catch(e){}});ambientNodes=[];}
  function addDrone(freq,vol,type='sine',lfoF=0.1,lfoA=2){if(!ctx)return;const o=ctx.createOscillator(),lfo=ctx.createOscillator(),lg=ctx.createGain(),flt=ctx.createBiquadFilter(),g=ctx.createGain();o.type=type;o.frequency.value=freq;lfo.type='sine';lfo.frequency.value=lfoF;lg.gain.value=lfoA;lfo.connect(lg);lg.connect(o.frequency);flt.type='lowpass';flt.frequency.value=600;g.gain.setValueAtTime(0,ctx.currentTime);g.gain.linearRampToValueAtTime(vol*masterVolume,ctx.currentTime+3);o.connect(flt);flt.connect(g);g.connect(masterGain);o.start();lfo.start();ambientNodes.push({osc:o,lfo,gain:g});}
  const ambients={
    none(){stopAmbient();},
    factory(){stopAmbient();addDrone(44,0.055,'sawtooth',0.07,1.5);addDrone(60,0.03,'sine',0.12,1);},
    tension(){stopAmbient();addDrone(30,0.08,'sine',0.05,1);addDrone(47,0.04,'square',0.08,0.8);addDrone(75,0.02,'sine',0.15,0.5);},
    horror(){stopAmbient();addDrone(24,0.1,'sawtooth',0.04,0.8);addDrone(38,0.055,'square',0.07,0.6);addDrone(72,0.025,'sine',0.18,0.3);addDrone(95,0.015,'sine',0.11,0.2);},
    safe(){stopAmbient();addDrone(55,0.03,'sine',0.08,0.5);addDrone(82,0.015,'sine',0.12,0.3);},
  };
  function playAmbient(name){if(!ctx)return;stopAmbient();if(ambients[name])ambients[name]();}
  function startRandomCreaks(intensity='low'){if(creakTO)clearTimeout(creakTO);const min=intensity==='high'?5000:9000,max=intensity==='high'?14000:28000;function next(){const delay=min+Math.random()*(max-min);creakTO=setTimeout(()=>{const r=Math.random();if(r<0.35)play('door_creak');else if(r<0.55)play('wind');else if(r<0.72)play('drip');else if(r<0.88)play('electricity');else play('rumble');next();},delay);}next();}
  function stopRandomCreaks(){if(creakTO)clearTimeout(creakTO);creakTO=null;}
  function play(name){if(!ctx)init();if(!initialized)return;if(ctx.state==='suspended')ctx.resume();if(sounds[name])sounds[name]();}
  return{init,resume,setVolume,play,playAmbient,startRandomCreaks,stopRandomCreaks,get initialized(){return initialized;}};
})();
