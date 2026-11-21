const http=require('http'),fs=require('fs'),path=require('path');const {chromium}=require('playwright');
const WORK=process.argv[2];
const srv=http.createServer((q,r)=>{const f=path.join(WORK,decodeURIComponent(q.url.split('?')[0]).replace(/^\//,''));fs.readFile(f,(e,d)=>{if(e){r.writeHead(404);r.end();return;}r.writeHead(200,{'content-type':f.endsWith('.html')?'text/html':f.endsWith('.js')?'text/javascript':'application/octet-stream'});r.end(d)})});
let ok=0,bad=0;const T=(n,c,x)=>{if(c){ok++;console.log('PASS',n)}else{bad++;console.log('FAIL',n,x===undefined?'':JSON.stringify(x))}};
// WAV-Dateien: 16 Bit Stereo (wird kompakt gespeichert) und 32 Bit Float (so groß wie Rohdaten → bleibt Rohdaten)
function wav(sr,secs,bits,float,f){const ch=2,n=sr*secs,ba=ch*bits/8,buf=Buffer.alloc(44+n*ba);buf.write('RIFF',0);buf.writeUInt32LE(36+n*ba,4);buf.write('WAVEfmt ',8);buf.writeUInt32LE(16,16);buf.writeUInt16LE(float?3:1,20);buf.writeUInt16LE(ch,22);buf.writeUInt32LE(sr,24);buf.writeUInt32LE(sr*ba,28);buf.writeUInt16LE(ba,32);buf.writeUInt16LE(bits,34);buf.write('data',36);buf.writeUInt32LE(n*ba,40);
 for(let i=0;i<n;i++)for(let c=0;c<ch;c++){const v=0.5*Math.sin(2*Math.PI*(f+c*110)*i/sr);const o=44+(i*ch+c)*bits/8;if(float)buf.writeFloatLE(v,o);else buf.writeInt16LE(Math.round(v*32767),o)}return buf}
(async()=>{await new Promise(r=>srv.listen(0,'127.0.0.1',r));const port=srv.address().port;const b=await chromium.launch();
const ctx=await b.newContext({viewport:{width:393,height:852},isMobile:true,hasTouch:true});const pg=await ctx.newPage();const errs=[];pg.on('pageerror',e=>errs.push(e.message));
await pg.route(/^https?:\/\/(?!127\.0\.0\.1)/,r=>r.abort());
await pg.addInitScript(()=>{try{localStorage.setItem('sunshine.home','off');localStorage.setItem('sunshine.news','{"seen":"1.48"}')}catch(e){}});
await pg.goto(`http://127.0.0.1:${port}/index_ueberarbeitet.html`,{waitUntil:'load'});await pg.waitForTimeout(1200);
const ev=(f,a)=>pg.evaluate(f,a);
const W16=wav(44100,20,16,false,220).toString('base64'),WF=wav(44100,5,32,true,330).toString('base64');
// ---- Import über den echten Weg (Einzelspur-Dateiwahl)
await ev(async([a,f])=>{await audioEngine.ensureCtx();const u8=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0)).buffer;
 window.__a=u8(a);window.__f=u8(f);
 const t1=createTrack('audio','Vocals');const t2=createTrack('audio','Float');window.__t=[t1.id,t2.id];
 dawState.buffers[t1.id]=await __projectIO.decodeKeep(window.__a,'vocals.wav');
 dawState.buffers[t2.id]=await __projectIO.decodeKeep(window.__f,'float.wav');
 const t3=createTrack('audio','Rec');window.__rec=t3.id;const rb=audioEngine.ctx.createBuffer(2,44100*2,44100);for(let c=0;c<2;c++){const d=rb.getChannelData(c);for(let i=0;i<d.length;i++)d[i]=0.25*Math.sin(i/9+c)}dawState.buffers[t3.id]=rb;},[W16,WF]);
const sample=await ev(()=>({a:Array.from(dawState.buffers[__t[0]].getChannelData(1).slice(5000,5004)),len:dawState.buffers[__t[0]].length,r:Array.from(dawState.buffers[__rec].getChannelData(0).slice(300,303))}));
const pl=await ev(()=>{const p=__projectIO.makePayload();const o={};for(const [k,v] of Object.entries(p.buffers))o[k]={src:!!v.src,ch:!!v.channels,sz:v.src?v.src.size:v.channels.reduce((s,c)=>s+c.byteLength,0),type:v.src&&v.src.type,name:v.name};return o});
T('16-Bit-Import: als Original-Datei (Blob, audio/wav) im Projekt',pl[await ev(()=>__t[0])].src===true&&pl[await ev(()=>__t[0])].type==='audio/wav'&&pl[await ev(()=>__t[0])].name==='vocals.wav',pl);
const id0=await ev(()=>__t[0]),id1=await ev(()=>__t[1]),id2=await ev(()=>__rec);
T('Größe: Original-Datei höchstens 55 % der Rohdaten (16 Bit Stereo)',pl[id0].sz<=0.55*(44100*20*2*4),pl[id0]);
T('32-Bit-Float-Datei (nicht kleiner als Rohdaten) bleibt Rohdaten',pl[id1].ch===true&&!pl[id1].src,pl[id1]);
T('Aufgenommene/erzeugte Spur ohne Datei: Rohdaten',pl[id2].ch===true&&!pl[id2].src);
T('Speichern verdoppelt nicht: Kanäle sind direkte Sichten auf die Audiodaten (keine Kopie)',await ev(()=>{const p=__projectIO.makePayload();const v=p.buffers[__rec].channels[0],a=dawState.buffers[__rec].getChannelData(0);return v.buffer===a.buffer&&v.byteOffset===a.byteOffset}));
// ---- Speichern über das echte Projekt-Speichern der Startseite, dann Neustart-Ersatz: leeren und öffnen
const saved=await ev(async()=>{const r=await Home.save();return !!r}).catch(()=>null);
await ev(async()=>{await Home.saveCurrent?.({name:'MemTest'})}).catch(()=>{});
const dbSize=await ev(async()=>{const est=await navigator.storage.estimate();return est.usage});
const rec=await ev(async()=>{const db=await new Promise((res,rej)=>{const q=indexedDB.open('SunshineRStemStudioProjects');q.onsuccess=()=>res(q.result);q.onerror=()=>rej(q.error)});const all=await new Promise(r=>{const q=db.transaction('projects').objectStore('projects').getAll();q.onsuccess=()=>r(q.result)});db.close();return all.map(x=>({name:x.name,srcs:Object.values(x.payload.buffers).filter(b=>b.src instanceof Blob).length,raws:Object.values(x.payload.buffers).filter(b=>b.channels).length}))});
T('Gespeichertes Projekt enthält 2 Blobs (Original-Dateien) und 2 Rohdaten-Spuren',rec.length>=1&&rec.some(r=>r.srcs===1&&r.raws===2),rec);
// ---- Öffnen: Projekt leeren, dann wieder laden
const pid=await ev(()=>dawState.project&&dawState.project.id);
await ev(()=>{dawState.buffers={};dawState.tracks=[]});
const opened=await ev(async id=>{const ok=await Home.openProject?Home.openProject(id):null;return ok},pid);
await pg.waitForTimeout(1500);
const after=await ev(()=>({n:Object.keys(dawState.buffers).length,a:Array.from((dawState.buffers[__t[0]]||{getChannelData:()=>[]}).getChannelData(1).slice(5000,5004)),len:(dawState.buffers[__t[0]]||{}).length,r:Array.from((dawState.buffers[__rec]||{getChannelData:()=>[]}).getChannelData(0).slice(300,303)),srcKept:!!(dawState.buffers[__t[0]]&&__projectIO.srcOf(dawState.buffers[__t[0]])),ids:Object.keys(dawState.buffers)}));
T('Öffnen: alle 3 Spuren wieder da',after.n===3,after);
T('Öffnen: dekodiertes Audio gleich lang und praktisch identisch (16-Bit-Quelle)',after.len===sample.len&&after.a.every((v,i)=>Math.abs(v-sample.a[i])<1e-6),[after.a,sample.a,after.len,sample.len]);
T('Öffnen: Aufnahme (Rohdaten) bit-genau',after.r.every((v,i)=>v===sample.r[i]),[after.r,sample.r]);
T('Nach dem Öffnen ist die Quelle wieder gemerkt (nächstes Speichern bleibt kompakt)',after.srcKept);
// ---- Altes Format (Rohdaten) bleibt lesbar
const legacy=await ev(async()=>{await audioEngine.ensureCtx();const len=44100;const ch=new Float32Array(len).map((_,i)=>Math.sin(i/7));
 const st=__projectIO.makePayload({noBuffers:true}).state;const p={state:st,buffers:{old1:{sampleRate:44100,length:len,channels:[ch,ch]}},savedAt:1};
 const r=__projectIO.restorePayload(p);const sync=!(r&&typeof r.then==='function');return {sync,len:dawState.buffers.old1&&dawState.buffers.old1.length}});
T('Altes Projektformat (Rohdaten): lädt wie früher sofort (ohne Wartezeit)',legacy.sync&&legacy.len===44100,legacy);
// ---- Autosave mit Original-Datei
await ev(async()=>{await audioEngine.ensureCtx();const t=createTrack('audio','AS');window.__as=t.id;dawState.buffers[t.id]=await __projectIO.decodeKeep(window.__a,'as.wav');document.getElementById('status-subtitle').dataset.projectName='AS'});
const as1=await ev(()=>Autosave.saveNow(true));
const peek=await ev(async()=>{const db=await new Promise((res,rej)=>{const q=indexedDB.open('SunshineAutosave');q.onsuccess=()=>res(q.result);q.onerror=()=>rej(q.error)});const r=await new Promise(res=>{const q=db.transaction('buf').objectStore('buf').get(__as);q.onsuccess=()=>res(q.result)});db.close();return r?{blob:r.src instanceof Blob,size:r.src&&r.src.size,ch:!!r.channels}:null});
T('Autosave legt die Original-Datei ab (nicht die Rohdaten)',as1&&peek&&peek.blob&&!peek.ch&&peek.size<0.55*44100*20*2*4,peek);
const meta=await ev(()=>Autosave._peek());
await ev(()=>{dawState.buffers={};dawState.tracks=[]});
await ev(async m=>{await Autosave._restore?.(m)},meta).catch(()=>{});
const asr=await ev(()=>({has:!!dawState.buffers[__as],len:dawState.buffers[__as]&&dawState.buffers[__as].length}));
T('Autosave-Wiederherstellung dekodiert die Original-Datei wieder',asr.has&&asr.len>=44100*19,asr);
// ---- Sicherung (ZIP) mit Blobs
const bk=await ev(async()=>{const r=await Backup.make({});await SunLazy.zip();const f=await JSZip.loadAsync(r.blob);const m=JSON.parse(await f.file('manifest.json').async('string'));return {bytes:r.bytes,bin:m.binBytes,recs:r.records}});
T('Datensicherung enthält die kleinen Dateien (Gesamtgröße deutlich unter Rohdaten)',bk.bytes<44100*(20+5+2+20)*2*4*0.6,bk);
T('Keine JS-Fehler',errs.length===0,errs);
console.log('\n'+ok+' ok, '+bad+' fehlgeschlagen');await b.close();srv.close();process.exit(bad?1:0)})();
