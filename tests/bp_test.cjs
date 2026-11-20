const http=require('http'),fs=require('fs'),path=require('path');const {chromium}=require('playwright');
const WORK=process.argv[2];const TW=fs.readFileSync(path.join(__dirname,'fixtures/tailwind.js'));
const srv=http.createServer((q,r)=>{const f=path.join(WORK,decodeURIComponent(q.url.split('?')[0]).replace(/^\//,''));fs.readFile(f,(e,d)=>{if(e){r.writeHead(404);r.end();return;}r.writeHead(200,{'content-type':f.endsWith('.html')?'text/html; charset=utf-8':'application/octet-stream'});r.end(d)})});
let ok=0,bad=0;const T=(n,c,x)=>{if(c){ok++;console.log('PASS',n)}else{bad++;console.log('FAIL',n,x||'')}};
const MOCK=`
window.__mock={fail:false,calls:0,loads:[]};
(function(){
  const NP=88,TF=172,WIN=43844,HOPF=256,SR=22050;
  const hann=new Float32Array(4096);for(let i=0;i<4096;i++)hann[i]=.5-.5*Math.cos(2*Math.PI*i/4095);
  const mk=(shape,data)=>({shape,dispose(){},array:async()=>data});
  function infer(x){
    const E=[];for(let j=0;j<TF;j++){E.push(new Float32Array(NP));const c=j*HOPF;
      for(let p=19;p<=69;p++){const f=440*Math.pow(2,((p+21)-69)/12),w=2*Math.PI*f/SR,co=2*Math.cos(w);let s1=0,s2=0;
        for(let i=0;i<4096;i++){const idx=c-2048+i;const v=(idx>=0&&idx<WIN?x[idx]:0)*hann[i];const s=v+co*s1-s2;s2=s1;s1=s;}
        const pw=s1*s1+s2*s2-co*s1*s2;E[j][p]=Math.sqrt(Math.max(0,pw))*2/2048;}}
    const fr=[],on=[],ct=[];
    for(let j=0;j<TF;j++){fr.push(new Array(NP).fill(0));ct.push(new Array(264).fill(0));
      for(let p=19;p<=69;p++){const e=E[j][p];const peak=e>=E[j][p-1]&&e>=E[j][p+1];fr[j][p]=peak?Math.min(1,e/0.12):0;}}
    for(let j=0;j<TF;j++){on.push(new Array(NP).fill(0));for(let p=0;p<NP;p++){const prev=j>=2?fr[j-2][p]:0;on[j][p]=Math.min(1,Math.max(0,fr[j][p]-prev)*1.4);}}
    return [fr,on,ct];
  }
  window.tf={ready:async()=>{},getBackend:()=>'mock',tidy:f=>f(),tensor3d:(d,s)=>({data:d,shape:s,dispose(){}}),
    io:{browserFiles:f=>({files:f}),removeModel:async()=>{}},
    loadGraphModel:async(src)=>{window.__mock.loads.push(typeof src==='string'?src:'files');if(window.__mock.fail)throw new Error('offline (mock)');
      return {save:async()=>{},execute(inp,names){window.__mock.calls++;const [fr,on,ct]=infer(inp.data);return [mk([1,TF,NP],[fr]),mk([1,TF,NP],[on]),mk([1,TF,264],[ct])];},predict(){throw new Error('nicht benutzt')}};}};
})();`;
(async()=>{await new Promise(r=>srv.listen(0,'127.0.0.1',r));const port=srv.address().port;const b=await chromium.launch();
const ctx=await b.newContext({viewport:{width:393,height:852}});await ctx.addInitScript(()=>{try{localStorage.setItem('sunshine.home','off')}catch(_){}});const pg=await ctx.newPage();const errs=[];pg.on('pageerror',e=>errs.push(e.message));
await pg.route(/cdn\.tailwindcss\.com/,r=>r.fulfill({status:200,contentType:'application/javascript',body:TW}));
await pg.route(/^https?:\/\/(?!127\.0\.0\.1|cdn\.tailwindcss\.com)/,r=>r.abort());
await pg.addInitScript(MOCK);
await pg.goto(`http://127.0.0.1:${port}/index_ueberarbeitet.html`,{waitUntil:'load'});await pg.waitForTimeout(1000);
T('Modul vorhanden, Status idle',await pg.evaluate(()=>!!window.BasicPitchAI&&BasicPitchAI.state.status==='idle'));
T('Option „KI – Basic Pitch“ im Modus-Menü',await pg.locator('#select-a2m-mode option[value="ai"]').count()===1);
// Testsignal 44.1 kHz: C4+E4+G4 0.05–1.05, D4 1.2–1.9 (über Fenstergrenze), B3 2.1–2.9
const sig=await pg.evaluate(()=>{const sr=44100,n=Math.floor(3.3*sr),x=new Float32Array(n);
  const add=(m,a,b)=>{const f=440*Math.pow(2,(m-69)/12);for(let i=Math.floor(a*sr);i<Math.min(n,Math.floor(b*sr));i++){const t=i/sr,env=Math.min(1,(t-a)/0.01,(b-t)/0.02);x[i]+=0.3*Math.max(0,env)*Math.sin(2*Math.PI*f*t);}};
  add(60,.05,1.05);add(64,.05,1.05);add(67,.05,1.05);add(62,1.2,1.9);add(59,2.1,2.9);window.__x=x;return n});
const res=await pg.evaluate(async()=>{const t0=performance.now();const prog=[];const notes=await BasicPitchAI.transcribe(window.__x,44100,{},p=>prog.push(p));return {notes,ms:Math.round(performance.now()-t0),prog:prog.length,st:{...BasicPitchAI.state},loads:window.__mock.loads,calls:window.__mock.calls}});
console.log('  Dauer',res.ms,'ms, Modellaufrufe',res.calls,', geladen von',JSON.stringify(res.loads));
console.log('  Noten:',res.notes.map(n=>`${n.midi}@${n.t0.toFixed(2)}-${n.t1.toFixed(2)}`).join(' '));
T('Modell wurde geladen (Status ready)',res.st.status==='ready'&&res.loads.length>=1);
T('3 Fenster berechnet (3,3 s Audio)',res.calls===3,String(res.calls));
T('Fortschritt gemeldet',res.prog>=3);
const find=(m,a,b,ta=.1,tb=.14)=>res.notes.find(n=>n.midi===m&&Math.abs(n.t0-a)<=ta&&Math.abs(n.t1-b)<=tb);
T('C4 0.05–1.05 erkannt',!!find(60,.05,1.05));T('E4 erkannt',!!find(64,.05,1.05));T('G4 erkannt',!!find(67,.05,1.05));
T('D4 1.2–1.9 erkannt (über Fenstergrenze)',!!find(62,1.2,1.9),'');
T('B3 2.1–2.9 erkannt',!!find(59,2.1,2.9));
const extra=res.notes.filter(n=>![[60],[64],[67],[62],[59]].some(a=>a[0]===n.midi));
T('keine Geisternoten ('+extra.length+')',extra.length===0,extra.map(n=>n.midi).join(','));
T('keine doppelten Noten gleicher Tonhöhe/Zeit',new Set(res.notes.map(n=>n.midi+':'+n.t0.toFixed(1))).size===res.notes.length);
// Pipeline in der App
const app=await pg.evaluate(async()=>{await audioEngine.ensureCtx();const ac=audioEngine.ctx,sr=44100,n=window.__x.length;
  const ab=ac.createBuffer(1,n,sr);ab.copyToChannel(window.__x,0);
  const tr=createTrack('audio','Test Piano');dawState.buffers[tr.id]=ab;dawState.bpm=100;
  document.getElementById('select-a2m-mode').value='ai';document.getElementById('input-a2m-bar').value='1';
  await extractMidiFromStem(tr.id);
  return {notes:dawState.midiNotes.map(n=>({p:n.pitch,s:n.start,d:n.dur})),mode:document.getElementById('select-a2m-mode').value};});
const pitches=[...new Set(app.notes.map(n=>n.p))].sort((a,b)=>a-b);
console.log('  App-Noten (Tonhöhen):',pitches.join(','),' Anzahl',app.notes.length);
T('App: Noten im Piano-Roll (KI-Modus)',app.notes.length>=5);
T('App: C-Dur-Akkord + D + B enthalten (Oktavlage evtl. gefaltet)',[0,4,7,2,11].every(pc=>pitches.some(p=>p%12===pc)),pitches.join(','));
T('App: Noten im Bereich C2–B4 (36–71)',app.notes.every(n=>n.p>=36&&n.p<=71));
T('App: Chord starts at step 0',app.notes.filter(n=>n.s===0).length>=3,JSON.stringify(app.notes.filter(n=>n.s<2)));
// Fallback bei Fehler
const fb=await pg.evaluate(async()=>{await BasicPitchAI.remove();window.__mock.fail=true;
  window.__toasts=[];const o=window.toast;window.toast=(m,t)=>{window.__toasts.push(t+': '+m);return o&&o(m,t)};
  const tr=dawState.tracks.find(t=>t.name==='Test Piano');document.getElementById('select-a2m-mode').value='ai';
  dawState.midiNotes=[];await extractMidiFromStem(tr.id);window.toast=o;
  return {n:dawState.midiNotes.length,toasts:window.__toasts,st:{...BasicPitchAI.state}}});
T('Fallback: Status error + Meldung',fb.st.status==='error'&&/nicht erreichbar|Modell/.test(fb.st.error),JSON.stringify(fb.st));
T('Fallback: Hinweis auf eigenen Algorithmus (Toast)',fb.toasts.some(t=>/warn:.*Polyphon-Algorithmus/.test(t)),fb.toasts.join(' | '));
T('Fallback: eigener Algorithmus lieferte Noten ('+fb.n+')',fb.n>=1);
// Eigene Dateien
const inst=await pg.evaluate(async()=>{window.__mock.fail=false;const j=new File(['{}'],'model.json'),bn=new File([new Uint8Array(4)],'group1-shard1of1.bin');
  await BasicPitchAI.installFiles([j,bn]);const bad=await BasicPitchAI.installFiles([j]).then(()=>'kein Fehler',e=>e.message);return {st:{...BasicPitchAI.state},bad,loads:window.__mock.loads.slice(-2)}});
T('Eigene Dateien: laden → ready',inst.st.status==='ready'&&inst.st.source==='eigene Dateien',JSON.stringify(inst));
T('Eigene Dateien: nur json → verständliche Fehlermeldung',/\.bin/.test(inst.bad),inst.bad);
T('Keine Skriptfehler',errs.filter(e=>!/JSZip/i.test(e)).length===0,errs.join('|'));
console.log(`\n${ok} bestanden, ${bad} fehlgeschlagen`);await b.close();srv.close();process.exit(bad?1:0)})();
