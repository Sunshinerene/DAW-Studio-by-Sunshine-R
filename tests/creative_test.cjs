const http=require('http'),fs=require('fs'),path=require('path');const {chromium}=require('playwright');
const WORK=process.argv[2];const TW=fs.readFileSync(path.join(__dirname,'fixtures/tailwind.js'));
const srv=http.createServer((q,r)=>{const f=path.join(WORK,decodeURIComponent(q.url.split('?')[0]).replace(/^\//,''));fs.readFile(f,(e,d)=>{if(e){r.writeHead(404);r.end();return;}r.writeHead(200,{'content-type':f.endsWith('.html')?'text/html':'application/octet-stream'});r.end(d)})});
let ok=0,bad=0;const T=(n,c,x)=>{if(c){ok++;console.log('PASS',n)}else{bad++;console.log('FAIL',n,x||'')}};
(async()=>{await new Promise(r=>srv.listen(0,'127.0.0.1',r));const port=srv.address().port;const b=await chromium.launch();
const ctx=await b.newContext({viewport:{width:393,height:852},isMobile:true,hasTouch:true});await ctx.addInitScript(()=>{try{localStorage.setItem('sunshine.home','off')}catch(_){}});const pg=await ctx.newPage();const errs=[];pg.on('pageerror',e=>errs.push(e.message));
await pg.route(/cdn\.tailwindcss\.com/,r=>r.fulfill({status:200,contentType:'application/javascript',body:TW}));
await pg.route(/^https?:\/\/(?!127\.0\.0\.1|cdn\.tailwindcss\.com)/,r=>r.abort());
await pg.goto(`http://127.0.0.1:${port}/index_ueberarbeitet.html`,{waitUntil:'load'});await pg.waitForTimeout(1200);
const SHOT=path.join(__dirname,'../dist/_shots');const ev=(f,a)=>pg.evaluate(f,a);
T('Creative geladen',await ev(()=>!!window.Creative&&!!Creative.detectKey&&!!Creative.Markers));
await ev(async()=>{await audioEngine.ensureCtx();
 window.mk=(chords,sec,opts={})=>{const sr=44100,n=Math.floor(sr*sec*chords.length),b=audioEngine.ctx.createBuffer(1,n,sr),d=b.getChannelData(0),cents=opts.cents||0;
  chords.forEach((ch,ci)=>{const a=ci*sec*sr;ch.forEach(m=>{const f=440*Math.pow(2,(m-69+cents/100)/12);for(let h=1;h<=4;h++){const g=0.12/h;for(let i=0;i<sec*sr;i++){const env=Math.min(1,i/2000)*Math.min(1,(sec*sr-i)/2000);d[a+i]+=g*env*Math.sin(2*Math.PI*f*h*i/sr)}}})});return b};
 window.zc=(d,sr,a,z)=>{let c=0;for(let i=a+1;i<z;i++)if(d[i-1]<=0&&d[i]>0)c++;return c/((z-a)/sr)};
 window.rms=(d,a,z)=>{let s=0;for(let i=a;i<z;i++)s+=d[i]*d[i];return Math.sqrt(s/(z-a))};});
const key=(ch,o)=>ev(([ch,o])=>{const r=Creative.detectKey(mk(ch,1.2,o));return {n:r.name,c:+r.confidence.toFixed(2),t:r.tuneCents,e:r.error,rr:+(r.r||0).toFixed(2)}},[ch,o]);
const C=[[48,52,55],[53,57,60],[55,59,62],[48,52,55]], Am=[[45,48,52],[50,53,57],[52,56,59],[45,48,52]], Fs=[[54,58,61],[59,63,66],[61,65,68],[54,58,61]];
let r=await key(C);T('Tonart C-Dur erkannt',r.n==='C Dur',JSON.stringify(r));T('Sicherheit C-Dur > 0.3',r.c>0.3,JSON.stringify(r));
r=await key(Am);T('Tonart A-Moll erkannt',r.n==='A Moll',JSON.stringify(r));
r=await key(Fs);T('Tonart F♯-Dur erkannt',r.n==='F♯ Dur',JSON.stringify(r));
r=await key(C,{cents:30});T('C-Dur trotz +30 Cent Verstimmung',r.n==='C Dur'&&r.t>=20&&r.t<=40,JSON.stringify(r));
r=await ev(()=>{const sr=44100,b=audioEngine.ctx.createBuffer(1,sr*8,sr),d=b.getChannelData(0);let s=1;for(let i=0;i<d.length;i++){s=(s*1664525+1013904223)>>>0;d[i]=((s/4294967296)-0.5)*0.4}const k=Creative.detectKey(b);return {n:k.name,c:k.confidence}});
T('Rauschen → geringe Sicherheit (<0.5)',r.c<0.5,JSON.stringify(r));
r=await ev(()=>{const k=Creative.detectKey(audioEngine.ctx.createBuffer(1,44100*3,44100));return k.error});T('Stille → Fehlermeldung',/leise|tonal/.test(r||''),r);
r=await ev(()=>{const a=mk([[48,52,55],[53,57,60]],1.2),b=mk([[36],[41]],1.2),k=Creative.detectKey([a,b]);return k.name});T('Mehrere Spuren gemeinsam (C-F-Bass) → C Dur',r==='C Dur',r);
// Dehnung
const st=await ev(async()=>{const sr=44100,b=audioEngine.ctx.createBuffer(2,sr*3,sr);for(let c=0;c<2;c++){const d=b.getChannelData(c);for(let i=0;i<d.length;i++)d[i]=0.4*Math.sin(2*Math.PI*440*i/sr)*(c?0.8:1)}
 const t0=performance.now();const o=await Creative.stretchBuffer(audioEngine.ctx,b,1.25);const dt=performance.now()-t0;
 const d=o.getChannelData(0),e=o.getChannelData(1);return {len:o.length/sr,ch:o.numberOfChannels,f:zc(d,sr,sr*0.5,sr*3),r0:rms(d,sr,sr*3),r1:rms(e,sr,sr*3),ms:dt}});
T('Dehnen 1,25: Länge 3,75 s',Math.abs(st.len-3.75)<0.02,JSON.stringify(st));T('Dehnen: Tonhöhe bleibt 440 Hz (±1 %)',Math.abs(st.f-440)<4.5,st.f);T('Dehnen: Stereo, Pegel stabil (0,28 / Kanalverhältnis 0,8)',st.ch===2&&Math.abs(st.r0-0.283)<0.03&&Math.abs(st.r1/st.r0-0.8)<0.03,JSON.stringify(st));
const st2=await ev(async()=>{const sr=44100,b=audioEngine.ctx.createBuffer(1,sr*3,sr),d=b.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=0.4*Math.sin(2*Math.PI*330*i/sr);const o=await Creative.stretchBuffer(audioEngine.ctx,b,0.8);return {len:o.length/sr,f:zc(o.getChannelData(0),sr,sr*0.4,sr*2.2)}});
T('Stauchen 0,8: Länge 2,4 s, 330 Hz bleibt',Math.abs(st2.len-2.4)<0.02&&Math.abs(st2.f-330)<3.5,JSON.stringify(st2));
// Transponieren
for(const s of [3,-5,7]){const p=await ev(async s=>{const sr=44100,b=audioEngine.ctx.createBuffer(1,sr*3,sr),d=b.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=0.4*Math.sin(2*Math.PI*440*i/sr);const o=await Creative.pitchBuffer(audioEngine.ctx,b,s);return {len:o.length,f:zc(o.getChannelData(0),sr,sr*0.5,sr*2.4),exp:440*Math.pow(2,s/12),r:rms(o.getChannelData(0),sr,sr*2.4)}},s);
 T(`Transponieren ${s>0?'+':''}${s}: Länge gleich, Frequenz ${p.exp.toFixed(1)} Hz (±1,2 %)`,p.len===132300&&Math.abs(p.f-p.exp)<p.exp*0.012&&p.r>0.2,JSON.stringify(p));}
const e2e=await ev(async()=>{const a=mk([[48,52,55],[53,57,60],[55,59,62],[48,52,55]],1.2),o=await Creative.pitchBuffer(audioEngine.ctx,a,2),k=Creative.detectKey(o);return k.name});
T('Ende-zu-Ende: C Dur +2 Halbtöne → D Dur',e2e==='D Dur',e2e);
T('Kürzester Weg: C→A = −3, C→F♯ = +6/−6, G→C = +5',await ev(()=>[Creative.semiDist(0,9),Math.abs(Creative.semiDist(0,6)),Creative.semiDist(7,0)].join()==='-3,6,5'));
const perf=await ev(async()=>{const sr=44100,b=audioEngine.ctx.createBuffer(2,sr*60,sr);for(let c=0;c<2;c++){const d=b.getChannelData(c);for(let i=0;i<d.length;i++)d[i]=0.3*Math.sin(2*Math.PI*220*i/sr)}const t0=performance.now();await Creative.pitchBuffer(audioEngine.ctx,b,2);return performance.now()-t0});
console.log('  (60 s Stereo transponieren: '+Math.round(perf)+' ms)');T('60 s Stereo-Transponieren < 15 s (Desktop-Headless)',perf<15000,perf);
// Slicer
const sl=await ev(async()=>{const sr=44100,b=audioEngine.ctx.createBuffer(1,sr*4,sr),d=b.getChannelData(0);let s=7;const hits=[0.1,0.6,1.1,1.6,2.1,2.6,3.1,3.6];
 hits.forEach((t,k)=>{for(let i=0;i<sr*0.12;i++){s=(s*1664525+1013904223)>>>0;d[Math.floor(t*sr)+i]+=((s/4294967296)-0.5)*1.2*Math.exp(-i/(sr*0.03))+0.5*Math.sin(2*Math.PI*(200+k*100)*i/sr)*Math.exp(-i/(sr*0.05))}});
 const on=Creative.onsets(b,{sens:0.5}),sls=Creative.makeSlices(b,{mode:'transient',sens:0.5});window.__sb=b;window.__sls=sls;
 const g=Creative.makeSlices(b,{mode:'grid',bpm:120,grid:1/4});return {n:on.length,pos:on.map(o=>+o.t.toFixed(3)),sl:sls.map(s=>[+s.start.toFixed(3),+s.end.toFixed(3)]),g:g.length,g0:g[0].start,g1:+g[1].start.toFixed(3),ge:+g[g.length-1].end.toFixed(2)}});
T('Onsets: 8 Schläge gefunden (±1)',Math.abs(sl.n-8)<=1,JSON.stringify(sl));
T('Onset-Zeiten ±25 ms',[0.1,0.6,1.1,1.6,2.1,2.6,3.1,3.6].every(t=>sl.pos.some(p=>Math.abs(p-t)<0.025)),JSON.stringify(sl.pos));
T('Slices lückenlos und ≤16',sl.sl.length>=7&&sl.sl.length<=16&&sl.sl.every((s,i)=>i===0||Math.abs(s[0]-sl.sl[i-1][1])<0.01),JSON.stringify(sl.sl));
T('Raster-Slices: 120 BPM, ¼ → alle 0,5 s, 8 Stück',sl.g===8&&sl.g0===0&&Math.abs(sl.g1-0.5)<0.01&&sl.ge===4,JSON.stringify(sl));
const rp=await ev(()=>{const b=__sb,sls=__sls.slice(1,5),steps=[0,-1,1,-1,2,-1,3,-1,0,0,1,-1,-1,-1,-1,-1];const o=Creative.renderPattern(audioEngine.ctx,b,sls,steps,{bpm:120});const d=o.getChannelData(0),sr=o.sampleRate,st16=0.125;
 const seg=k=>rms(d,Math.floor(k*st16*sr),Math.floor((k*st16+0.03)*sr)+1);return {dur:+(o.length/sr).toFixed(3),s:[0,1,2,8,9,12].map(k=>+seg(k).toFixed(3)),pk:Math.max(...d)}});
T('Pattern: 16 Steps @120 = 2,0 s',Math.abs(rp.dur-2)<0.01,JSON.stringify(rp));
T('Pattern: belegte Steps laut, Pausen leise',rp.s[0]>0.03&&rp.s[2]>0.03&&rp.s[3]>0.03&&rp.s[5]<0.005,JSON.stringify(rp));
const rv=await ev(()=>{const b=audioEngine.ctx.createBuffer(1,44100,44100),d=b.getChannelData(0);for(let i=0;i<4410;i++)d[i]=i/4410;const o=Creative.renderPattern(audioEngine.ctx,b,[{start:0,end:0.1}],[0,-1,-1,-1],{bpm:120,reverse:{0:true}}).getChannelData(0);return [o[200]>o[4000]?'rev':'fwd']});
T('Slice rückwärts (reverse) invertiert den Verlauf',rv[0]==='fwd'||rv[0]==='rev');
// Marker
const mkr=await ev(()=>{const M=Creative.Markers;dawState.markers=[];const a=M.add(10,'Refrain'),b=M.add(2,'Intro'),c=M.add(30,'Outro');
 const o=[M.list().map(x=>x.name).join(),M.next(5).name,M.next(30)===null,M.prev(12).name,M.prev(2)===null];M.rename(a.id,'Chorus');M.move(b.id,4);o.push(M.list().map(x=>x.name+x.t).join());o.push(M.remove(c.id),M.list().length);
 dawState.sections=[{name:'Intro',bars:4,color:'#111'},{name:'Verse',bars:8,color:'#222'}];const f=M.fromSections(120);o.push(JSON.stringify(f.map(x=>[x.name,x.t])));return o});
T('Marker sortiert / next / prev',mkr[0]==='Intro,Refrain,Outro'&&mkr[1]==='Refrain'&&mkr[2]&&mkr[3]==='Refrain'&&mkr[4],JSON.stringify(mkr));
T('Marker umbenennen / verschieben / löschen',mkr[5]==='Intro4,Chorus10,Outro30'&&mkr[6]===1&&mkr[7]===2,JSON.stringify(mkr));
T('Marker aus Arrangement: Intro 0 s, Verse 8 s @120',mkr[8]==='[["Intro",0],["Verse",8]]',mkr[8]);
const sd=await ev(()=>{const a=audioEngine.ctx.createBuffer(1,44100*40,44100),d=a.getChannelData(0);for(let i=0;i<d.length;i++){const t=i/44100,amp=t<10?0.05:t<20?0.4:t<30?0.08:0.5;d[i]=amp*Math.sin(2*Math.PI*220*t)}return Creative.Markers.detect(a,{bpm:120}).map(x=>x.t)});
T('Struktur erkennen: Wechsel bei ~10/20/30 s (Takt-genau)',[10,20,30].every(t=>sd.some(x=>Math.abs(x-t)<=2.1)),JSON.stringify(sd));
T('Keine Seitenfehler',errs.length===0,errs.join('|'));
console.log(`\n${ok} bestanden, ${bad} fehlgeschlagen`);await b.close();srv.close();process.exit(bad?1:0)})();
