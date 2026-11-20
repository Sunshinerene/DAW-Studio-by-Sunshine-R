const fs=require('fs'),path=require('path');const {chromium}=require('playwright');
const SRC=fs.readFileSync(path.join(__dirname,'../src/ki/studioai_core.js'),'utf8');
let ok=0,bad=0;const T=(n,c,x)=>{if(c){ok++;console.log('PASS',n)}else{bad++;console.log('FAIL',n,x||'')}};
(async()=>{const b=await chromium.launch();const pg=await b.newPage();const errs=[];pg.on('pageerror',e=>errs.push(e.message));
await pg.setContent('<html><body></body></html>');await pg.addScriptTag({content:SRC});
await pg.evaluate(()=>{
  window.mkbuf=(sr,sec,ch)=>new OfflineAudioContext(ch||1,Math.floor(sr*sec),sr).createBuffer(ch||1,Math.floor(sr*sec),sr);
  let seed=12345;window.rnd=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296};
  window.groove=(bpm,sec,off,sr)=>{sr=sr||44100;const b=mkbuf(sr,sec,1),d=b.getChannelData(0),per=60/bpm;
    const add=(t,fn,len)=>{const i0=Math.floor(t*sr);for(let i=0;i<len*sr&&i0+i<d.length;i++)d[i0+i]+=fn(i/sr)};
    let k=0;for(let t=off;t<sec-0.3;t+=per,k++){
      const acc=(k%4===0)?1.0:0.6;
      add(t,tt=>acc*0.7*Math.sin(2*Math.PI*(55+90*Math.exp(-tt*35))*tt)*Math.exp(-tt*9),0.25);              // Kick
      if(k%4===2||k%4===0&&false)add(t,tt=>0.25*(rnd()*2-1)*Math.exp(-tt*22),0.15);                          // Snare auf 3
      add(t+per/2,tt=>0.12*(rnd()*2-1)*Math.exp(-tt*60),0.06);                                               // Hat Off-Beat
      if(k%4===0)add(t,tt=>0.25*Math.sin(2*Math.PI*41*tt)*Math.exp(-tt*2.5),0.9);                            // Bass-Akzent auf der 1
    }return b};
});
for(const [bpm,off] of [[95,0.31],[120,0.23],[128,0.5],[146,0.12]]){
  const r=await pg.evaluate(([bpm,off])=>{const b=groove(bpm,40,off);const m=StudioAI.dsp.toMono(b);const t0=performance.now();const r=StudioAI.dsp.detectTempo(m.x,m.sr);r.ms=Math.round(performance.now()-t0);return r},[bpm,off]);
  console.log(`  ${bpm} BPM → erkannt ${r.bpm.toFixed(2)} (App ${r.bpmApp}), Konfidenz ${(r.confidence*100).toFixed(0)} %, 1. Zählzeit ${r.firstBeatSec.toFixed(3)} s, Takt ${r.firstBarSec.toFixed(3)} s, Downbeat-Idx ${r.downbeatIdx}, ${r.ms} ms`);
  T(`Tempo ${bpm}: ±0,5 BPM`,Math.abs(r.bpm-bpm)<=0.5,String(r.bpm));
  const per=60/bpm,ph=((r.firstBeatSec-off)%per+per)%per;
  T(`Tempo ${bpm}: Raster-Phase ±30 ms`,Math.min(ph,per-ph)<=0.03,String(ph));
  T(`Tempo ${bpm}: Takt-Eins gefunden (±30 ms)`,Math.abs(r.firstBarSec-off)<=0.03,String(r.firstBarSec));
}
// Stille am Anfang
let r=await pg.evaluate(()=>{const g=groove(120,30,3.2);const m=StudioAI.dsp.toMono(g);return StudioAI.dsp.detectTempo(m.x,m.sr)});
T('Stille-Intro 3,2 s: Takt-1 bei ≈3,2 s ('+r.firstBarSec.toFixed(2)+')',Math.abs(r.firstBarSec-3.2)<=0.05);
// 174 BPM: 174 oder 87 mit Kandidat
r=await pg.evaluate(()=>{const g=groove(174,30,0.2);const m=StudioAI.dsp.toMono(g);return StudioAI.dsp.detectTempo(m.x,m.sr)});
T('174 BPM: 174 oder Halbtempo 87 in Kandidaten ('+r.bpm.toFixed(1)+')',[174,87].some(v=>Math.abs(r.bpm-v)<1)&&r.candidates.some(c=>Math.abs(c.bpm-174)<1.5||Math.abs(c.bpm-87)<1.5));
// 22.05 kHz & Stereo-Quelle
r=await pg.evaluate(()=>{const g=groove(110,30,0.4,22050);const m=StudioAI.dsp.toMono(g);return StudioAI.dsp.detectTempo(m.x,m.sr)});
T('22,05-kHz-Quelle 110 BPM ('+r.bpm.toFixed(2)+')',Math.abs(r.bpm-110)<=0.5);
// zu kurz / Rauschen
r=await pg.evaluate(()=>{const b=mkbuf(44100,2,1);const m=StudioAI.dsp.toMono(b);return StudioAI.dsp.detectTempo(m.x,m.sr)});
T('Zu kurzes Audio → sauberer Hinweis',!!r.error&&r.bpm===0,JSON.stringify(r));
r=await pg.evaluate(()=>{const b=mkbuf(44100,20,1),d=b.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=(rnd()*2-1)*0.1;const m=StudioAI.dsp.toMono(b);const q=StudioAI.dsp.detectTempo(m.x,m.sr);return {c:q.confidence,e:q.error}});
T('Weißes Rauschen → niedrige Konfidenz ('+(r.c*100|0)+' %)',r.e||r.c<0.4);
console.log('errs',errs.join('|')||'none');
console.log(`\n${ok} bestanden, ${bad} fehlgeschlagen`);await b.close();process.exit(bad?1:0)})();
