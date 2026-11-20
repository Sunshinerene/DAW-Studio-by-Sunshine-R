const fs=require('fs'),path=require('path');const {chromium}=require('playwright');
const SRC=fs.readFileSync(path.join(__dirname,'../src/ki/studioai_core.js'),'utf8');
let ok=0,bad=0;const T=(n,c,x)=>{if(c){ok++;console.log('PASS',n)}else{bad++;console.log('FAIL',n,x||'')}};
(async()=>{const b=await chromium.launch();const pg=await b.newPage();const errs=[];pg.on('pageerror',e=>errs.push(e.message));
await pg.setContent('<html><body></body></html>');await pg.addScriptTag({content:SRC});
await pg.evaluate(()=>{window.mkbuf=(sr,sec,ch)=>new OfflineAudioContext(ch||1,Math.floor(sr*sec),sr).createBuffer(ch||1,Math.floor(sr*sec),sr);
  let seed=777;window.rnd=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296};
  window.fill=(b,fn)=>{for(let c=0;c<b.numberOfChannels;c++){const d=b.getChannelData(c);for(let i=0;i<d.length;i++)d[i]=fn(i/b.sampleRate,c)}return b};});
/* ---------- Auto-Mix ---------- */
const mix=await pg.evaluate(()=>{const sr=44100,sec=20;
  const voc=fill(mkbuf(sr,sec,2),(t,c)=>(Math.sin(t*Math.PI*2*1)>0?1:0.15)*0.06*(Math.sin(2*Math.PI*330*t)+0.5*Math.sin(2*Math.PI*660*t)));       // leise
  const dr=fill(mkbuf(sr,sec,2),(t)=>{const ph=t%0.5;return 0.6*Math.sin(2*Math.PI*(60+80*Math.exp(-ph*40))*ph)*Math.exp(-ph*10)+0.2*(rnd()*2-1)*Math.exp(-((ph+0.25)%0.5)*40)});  // laut
  const bs=fill(mkbuf(sr,sec,1),(t)=>0.3*Math.sin(2*Math.PI*55*t));
  const p1=fill(mkbuf(sr,sec,1),(t)=>0.12*(Math.sin(2*Math.PI*110*t)+0.6*Math.sin(2*Math.PI*277*t)));    // Pad mit viel Tiefe, mono
  const p2=fill(mkbuf(sr,sec,1),(t)=>0.12*(Math.sin(2*Math.PI*98*t)+0.6*Math.sin(2*Math.PI*392*t)));
  const items=[{id:'v',name:'Vocals',type:'audio',vol:0.9,pan:0,buf:voc},{id:'d',name:'Drums',type:'audio',vol:0.9,pan:0,buf:dr},{id:'b',name:'Bass',type:'audio',vol:0.9,pan:0,buf:bs},{id:'p1',name:'Synth Pad',type:'audio',vol:0.9,pan:0,buf:p1},{id:'p2',name:'Keys',type:'audio',vol:0.9,pan:0,buf:p2},{id:'m',name:'MIDI Synth',type:'midi',vol:0.8,pan:0,buf:null}];
  const r=StudioAI.dsp.suggestMix(items,{});
  return {anchor:r.anchor,before:r.mixPeakBefore,after:r.mixPeakAfter,rows:r.rows.map(x=>({id:x.id,role:x.role,skipped:!!x.skipped,cur:x.curVol,nv:x.newVol,np:x.newPan,lc:x.newLowCut,rms:x.st&&+x.st.rmsDb.toFixed(1),reasons:x.reasons}))}});
console.log('  Anker:',mix.anchor,' Spitze vorher',mix.before.toFixed(2),'→ nachher',mix.after.toFixed(2));mix.rows.forEach(r=>console.log('  ',r.id,r.role,'RMS',r.rms,'vol',r.cur,'→',r.nv&&r.nv.toFixed(2),'pan',r.np,'lowcut',r.lc,'|',(r.reasons||[]).join('; ')));
const R=id=>mix.rows.find(r=>r.id===id);
T('Rollen: Vocals/Drums/Bass/Pad erkannt',R('v').role==='vocal'&&R('d').role==='drums'&&R('b').role==='bass'&&R('p1').role==='other');
T('MIDI-Spur wird übersprungen, nicht verändert',R('m').skipped);
T('Anker = Gesang',mix.anchor==='vocal');
T('Leiser Gesang wird angehoben (vol ↑)',R('v').nv>R('v').cur+0.05,R('v').nv+'');
T('Lautes Schlagzeug wird abgesenkt (vol ↓)',R('d').nv<R('d').cur-0.05,R('d').nv+'');
T('Summenspitze ≤ 0,9 nach Vorschlag',mix.after<=0.9,String(mix.after));
T('Alle Lautstärken in 0,02…1,25',mix.rows.filter(r=>!r.skipped).every(r=>r.nv>=0.02&&r.nv<=1.25));
T('Zwei Mono-Pads: links/rechts verteilt',R('p1').np*R('p2').np<0&&Math.abs(R('p1').np)===0.3);
T('Pad mit viel Tiefe → Low-Cut vorgeschlagen',R('p1').lc===true);
T('Bass behält Tiefen (kein Low-Cut)',R('b').lc===false);
T('Begründungstexte vorhanden',R('v').reasons.length>0&&/zu leise/.test(R('v').reasons[0]));
/* ---------- Rauschfilter ---------- */
const dn=await pg.evaluate(async()=>{const sr=44100,sec=6;const clean=(t)=>((Math.floor(t)%2)===0)?0.25*(Math.sin(2*Math.PI*220*t)+0.5*Math.sin(2*Math.PI*440*t)+0.3*Math.sin(2*Math.PI*660*t))*Math.min(1,(1-(t%1))*20):0;
  const b=fill(mkbuf(sr,sec,2),(t,c)=>clean(t)+0.02*(rnd()*2-1));
  const ctx=new OfflineAudioContext(2,10,sr);const t0=performance.now();
  const out=await StudioAI.dsp.denoiseBuffer(ctx,b,{strength:0.6});const ms=Math.round(performance.now()-t0);
  const rms=(buf,a,z)=>{const d=buf.getChannelData(0);let s=0,n=0;for(let i=Math.floor(a*sr);i<Math.floor(z*sr);i++){s+=d[i]*d[i];n++}return Math.sqrt(s/n)};
  const db=v=>20*Math.log10(Math.max(v,1e-9));
  let nan=false;for(const v of out.getChannelData(0))if(!isFinite(v)){nan=true;break}
  return {ms,gapBefore:db(rms(b,1.2,1.9)),gapAfter:db(rms(out,1.2,1.9)),sigBefore:db(rms(b,2.1,2.8)),sigAfter:db(rms(out,2.1,2.8)),len:out.length===b.length,ch:out.numberOfChannels,nan}});
console.log('  Rauschfilter:',JSON.stringify(dn));
T('Rauschfilter: Pausen ≥ 12 dB leiser ('+(dn.gapBefore-dn.gapAfter).toFixed(1)+' dB)',dn.gapBefore-dn.gapAfter>=12);
T('Rauschfilter: Nutzsignal bleibt (Δ ≤ 2 dB: '+(dn.sigBefore-dn.sigAfter).toFixed(1)+')',Math.abs(dn.sigBefore-dn.sigAfter)<=2);
T('Rauschfilter: Länge/Kanäle gleich, keine NaN',dn.len&&dn.ch===2&&!dn.nan);
// Lern-Pattern
const pt=await pg.evaluate(()=>{const base=[0,3,6,8,10,14,16,19,22,24,26,30].map((s,i)=>({pitch:[48,51,55,53,51,48,48,51,55,58,55,53][i],start:s,dur:2,vel:100}));
  const m=StudioAI.dsp.learnPattern(base);const snap=p=>p;
  const v0=StudioAI.dsp.generateVariation(m,base,{variation:0,seed:3,snap});
  const a=StudioAI.dsp.generateVariation(m,base,{variation:0.5,seed:5,snap}),a2=StudioAI.dsp.generateVariation(m,base,{variation:0.5,seed:5,snap}),c=StudioAI.dsp.generateVariation(m,base,{variation:0.5,seed:6,snap});
  const hi=StudioAI.dsp.generateVariation(m,base,{variation:1,seed:9,snap});
  const key=n=>n.start+':'+n.pitch;
  return {model:!!m&&m.count===12,none:StudioAI.dsp.learnPattern(base.slice(0,3)),v0same:JSON.stringify(v0.map(key))===JSON.stringify(base.map(key)),
    det:JSON.stringify(a)===JSON.stringify(a2),seedDiff:JSON.stringify(a)!==JSON.stringify(c),changed:a.map(key).filter(k=>!base.map(key).includes(k)).length,
    valid:[a,c,hi].every(arr=>arr.every(n=>n.pitch>=36&&n.pitch<=71&&n.start>=0&&n.start<32&&n.dur>=1&&n.start+n.dur<=32&&n.vel>=1&&n.vel<=127)),hiChanged:hi.map(key).filter(k=>!base.map(key).includes(k)).length,aLen:a.length}});
console.log('  Lern-Pattern:',JSON.stringify(pt));
T('Lernmodell aus 12 Noten, <6 Noten → null',pt.model&&pt.none===null);
T('Abweichung 0 = unverändert',pt.v0same);
T('Gleicher Seed = gleiches Ergebnis; anderer Seed = anderes',pt.det&&pt.seedDiff);
T('Abweichung 0,5 verändert Noten ('+pt.changed+') – Abweichung 1 stärker ('+pt.hiChanged+')',pt.changed>0&&pt.hiChanged>=pt.changed);
T('Alle Noten gültig (Tonhöhe 36–71, Steps 0–31, Länge)',pt.valid);
// Sprachbefehle
const cases=[['Play',{cmd:'play'}],['Start','play'],['Stopp','stop'],['pause','stop'],['Zurück',{cmd:'undo'}],['rückgängig',{cmd:'undo'}],['vor',{cmd:'redo'}],['Wiederherstellen',{cmd:'redo'}],
 ['Tempo 120',{cmd:'bpm',value:120}],['setze Tempo auf 128 BPM',{cmd:'bpm',value:128}],['146 BPM',{cmd:'bpm',value:146}],['Tempo hundertzwanzig',{cmd:'bpm',value:120}],['Tempo einhundert',{cmd:'bpm',value:100}],['tempo fünfundneunzig',{cmd:'bpm',value:95}],
 ['Spur 2 stumm',{cmd:'mute',track:2,on:true}],['Spur zwei stumm aus',{cmd:'mute',track:2,on:false}],['Spur drei solo',{cmd:'solo',track:3,on:true}],['Spur 1 lauter',{cmd:'vol',track:1,db:2}],['Spur vier leiser',{cmd:'vol',track:4,db:-2}],
 ['Loop aus',{cmd:'loop',on:false}],['Metronom an',{cmd:'metronome',on:true}],['Klick aus',{cmd:'metronome',on:false}],['Mixer zeigen',{cmd:'tab',tab:'mixer'}],['gehe zu Drums',{cmd:'tab',tab:'drums'}],
 ['Tempo erkennen',{cmd:'open',what:'tempo'}],['Auto Mix',{cmd:'open',what:'mix'}],['Neue Spur',{cmd:'newtrack'}],['speichern',{cmd:'save'}],['lauter',{cmd:'master',db:1.5}],
 ['Projekt leeren',{cmd:'blocked'}],['Reset',{cmd:'blocked'}],['Spur löschen',{cmd:'blocked'}],['blablabla',{cmd:'unknown'}]];
const pr=await pg.evaluate(c=>c.map(x=>[x[0],StudioAI.dsp.parseCommand(x[0])]),cases);
let bad2=[];cases.forEach((c,i)=>{const exp=typeof c[1]==='string'?{cmd:c[1]}:c[1],got=pr[i][1];if(!Object.keys(exp).every(k=>got[k]===exp[k]))bad2.push(`„${c[0]}“ → ${JSON.stringify(got)} (erwartet ${JSON.stringify(exp)})`)});
T(`Sprachbefehle: ${cases.length-bad2.length}/${cases.length} korrekt geparst`,bad2.length===0,'\n   '+bad2.join('\n   '));
T('Keine Skriptfehler',errs.length===0,errs.join('|'));
console.log(`\n${ok} bestanden, ${bad} fehlgeschlagen`);await b.close();process.exit(bad?1:0)})();
