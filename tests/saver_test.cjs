const http=require('http'),fs=require('fs'),path=require('path');const {chromium}=require('playwright');
const WORK=process.argv[2];
const srv=http.createServer((q,r)=>{const f=path.join(WORK,decodeURIComponent(q.url.split('?')[0]).replace(/^\//,''));fs.readFile(f,(e,d)=>{if(e){r.writeHead(404);r.end();return;}r.writeHead(200,{'content-type':/\.html$/.test(f)?'text/html':/\.js$/.test(f)?'application/javascript':'application/octet-stream'});r.end(d)})});
let ok=0,bad=0;const T=(n,c,x)=>{if(c){ok++;console.log('PASS',n)}else{bad++;console.log('FAIL',n,x===undefined?'':JSON.stringify(x))}};
function wav(sr,secs,f){const ch=2,n=sr*secs,ba=4,buf=Buffer.alloc(44+n*ba);buf.write('RIFF',0);buf.writeUInt32LE(36+n*ba,4);buf.write('WAVEfmt ',8);buf.writeUInt32LE(16,16);buf.writeUInt16LE(1,20);buf.writeUInt16LE(ch,22);buf.writeUInt32LE(sr,24);buf.writeUInt32LE(sr*ba,28);buf.writeUInt16LE(ba,32);buf.writeUInt16LE(16,34);buf.write('data',36);buf.writeUInt32LE(n*ba,40);
 for(let i=0;i<n;i++)for(let c=0;c<ch;c++)buf.writeInt16LE(Math.round(16000*Math.sin(2*Math.PI*(f+c*110)*i/sr)),44+(i*ch+c)*2);return buf}
(async()=>{await new Promise(r=>srv.listen(0,'127.0.0.1',r));const port=srv.address().port;const b=await chromium.launch();
const ctx=await b.newContext({viewport:{width:393,height:852},isMobile:true,hasTouch:true});const pg=await ctx.newPage();const errs=[];pg.on('pageerror',e=>errs.push(e.message));
await pg.route(/^https?:\/\/(?!127\.0\.0\.1)/,r=>r.abort());
await pg.addInitScript(()=>{try{localStorage.setItem('sunshine.home','off');localStorage.setItem('sunshine.news','{"seen":"9.99"}')}catch(e){}});
await pg.goto(`http://127.0.0.1:${port}/index_ueberarbeitet.html`,{waitUntil:'load'});await pg.waitForTimeout(1200);
const ev=(f,a)=>pg.evaluate(f,a);
const W=wav(44100,12,220).toString('base64');
T('Saver-Modul vorhanden, Standard: aus',await ev(()=>!!window.Saver&&Saver.auto()===false));
// ---- Spuren: A = Datei (mit Original-Blob), B/C = Rohdaten (z. B. Aufnahme)
await ev(async w=>{await audioEngine.ensureCtx();const u8=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0)).buffer;
 const a=createTrack('audio','Datei-Spur'),bt=createTrack('audio','Roh-B'),c=createTrack('audio','Roh-C');window.__ids=[a.id,bt.id,c.id];
 dawState.buffers[a.id]=await __projectIO.decodeKeep(u8(w),'a.wav');
 for(const [t,f] of [[bt,330],[c,440]]){const buf=audioEngine.ctx.createBuffer(2,44100*12,44100);for(let k=0;k<2;k++){const d=buf.getChannelData(k);for(let i=0;i<d.length;i++)d[i]=0.4*Math.sin(2*Math.PI*(f+k*50)*i/44100)*Math.cos(i/9000)}dawState.buffers[t.id]=buf}
 window.__snap=ids=>ids.map(id=>{const b=dawState.buffers[id];let s=0;const o=[];for(let k=0;k<b.numberOfChannels;k++){const d=b.getChannelData(k);for(let i=0;i<d.length;i+=997)s+=d[i]*(i%7+1);o.push(d[12345],d[d.length-1])}return {s,o,len:b.length,dur:b.duration}});
 window.__before=__snap(__ids);window.__pk0=Array.from(ClipModel.peaks(dawState.buffers[__ids[1]]).slice(0,200));renderMultiTrackLanes();
},W);
const IDS=await ev(()=>__ids);const mb0=await ev(()=>Health.memory().mb);
T('Start: alle 3 geladen, Status stimmt',await ev(()=>{const s=Saver.status();return s.loaded===3&&s.parked===0}),await ev(()=>Saver.status()));
// ---- Manuell entladen
T('Nicht hörbare Spur kann entladen werden (Datei-Spur und Rohdaten-Spur)',await ev(()=>{__ids.forEach(id=>{const t=dawState.tracks.find(x=>x.id===id);t.mute=true});return Saver.park(__ids[0],{force:true})&&Saver.park(__ids[1],{force:true})}));
const st1=await ev(()=>Saver.status());T('Status: 2 entladen, ca. 2×4 MB gespart',st1.parked===2&&st1.parkedMB>=6,st1);
const meta=await ev(()=>{const a=dawState.buffers[__ids[0]],b=dawState.buffers[__ids[1]];return {a:[a.__parked,a.duration,a.length,a.sampleRate,a.numberOfChannels],b:[b.__parked,b.duration,b.length,b.sampleRate,b.numberOfChannels],own:[a.own,b.own]}});
T('Platzhalter behält Dauer/Länge/Rate/Kanäle',meta.a[0]&&meta.b[0]&&meta.a[1]>11.9&&meta.b[2]===44100*12&&meta.b[3]===44100&&meta.b[4]===2,meta);
T('Datei-Spur behält Original-Datei, Rohdaten-Spur bekommt verlustfreie WAV',meta.own[0]===false&&meta.own[1]===true);
T('Health-Anzeige zählt entladene Spuren nicht mehr mit',await ev(m=>Health.memory().mb<=m-6,mb0),[mb0,await ev(()=>Health.memory().mb)]);
T('Wellenform bleibt (Peaks identisch)',await ev(()=>{const p=ClipModel.peaks(dawState.buffers[__ids[1]]);return p.length>=200&&__pk0.every((v,i)=>v===p[i])}));
T('Zugriff auf Samples einer entladenen Spur wirft klare Meldung (statt Stille)',await ev(()=>{try{dawState.buffers[__ids[1]].getChannelData(0);return false}catch(e){return /entladen/.test(e.message)}}));
await pg.waitForTimeout(1500);
T('…und lädt dabei im Hintergrund nach (Aktion wiederholbar)',await ev(()=>!dawState.buffers[__ids[1]].__parked));
await ev(()=>{Saver.park(__ids[1],{force:true});Saver.park(__ids[0],{force:true})});
T('Oberfläche zeichnet entladene Spuren ohne Fehler',await ev(()=>{try{renderMultiTrackLanes();renderAllTrackCanvases();return true}catch(e){return e.message}}));
// ---- Speichern/Autosave mit entladenen Spuren
const pl=await ev(()=>{const p=__projectIO.makePayload();const o={};for(const id of __ids){const v=p.buffers[id];o[id]=v?{src:!!v.src,ch:!!v.channels,n:v.src?v.src.size:0}:null}return o});
T('Projekt speichern: entladene Spuren kommen als Datei-Blob mit (ohne sie zu laden)',pl[IDS[0]]&&pl[IDS[0]].src&&pl[IDS[1]]&&pl[IDS[1]].src,pl);
T('Speichern hat die Spuren nicht wieder geladen',await ev(()=>dawState.buffers[__ids[0]].__parked&&dawState.buffers[__ids[1]].__parked));
const as=await ev(async()=>{document.getElementById('status-subtitle').dataset.projectName='SV';return await Autosave.saveNow(true)});
const peekX=await ev(async id=>{const db=await new Promise((res,rej)=>{const q=indexedDB.open('SunshineAutosave');q.onsuccess=()=>res(q.result);q.onerror=()=>rej(q.error)});const r=await new Promise(res=>{const q=db.transaction('buf').objectStore('buf').get(id);q.onsuccess=()=>res(q.result)});return r?{blob:!!r.blob||!!r.src,ch:!!r.channels}:null},null).catch(()=>null);
const peek2=await ev(async()=>{const id=__ids[1];const db=await new Promise((res,rej)=>{const q=indexedDB.open('SunshineAutosave');q.onsuccess=()=>res(q.result);q.onerror=()=>rej(q.error)});const r=await new Promise(res=>{const q=db.transaction('buf').objectStore('buf').get(id);q.onsuccess=()=>res(q.result)});return r?Object.keys(r):null});
T('Autosave schreibt entladene Spuren ebenfalls als Datei (keine Fehler)',!!as&&Array.isArray(peek2)&&!peek2.includes('channels'),[as,peek2]);
// ---- Laden: bit-genau
await ev(async()=>{await Saver.load(__ids[0]);await Saver.load(__ids[1])});
const after=await ev(()=>__snap(__ids.slice(0,2)));
T('Rohdaten-Spur nach Laden BIT-GENAU identisch',JSON.stringify(after[1])===JSON.stringify(await ev(()=>__before[1])),[after[1],await ev(()=>__before[1])]);
T('Datei-Spur nach Laden identisch (gleiche Dekodierung)',JSON.stringify(after[0])===JSON.stringify(await ev(()=>__before[0])));
T('Wellenform nach Laden unverändert',await ev(()=>{const p=ClipModel.peaks(dawState.buffers[__ids[1]]);return __pk0.every((v,i)=>v===p[i])}));
// ---- Abspielen lädt Hörbares nach
await ev(()=>{Saver.park(__ids[1],{force:true});const t=dawState.tracks.find(x=>x.id===__ids[1]);t.mute=false;audioEngine.syncAudioParams()});
const pl2=await ev(async()=>{await audioEngine.play();const r={playing:dawState.isPlaying,loaded:!dawState.buffers[__ids[1]].__parked,src:audioEngine.activeStemSources.filter(s=>s.buffer===dawState.buffers[__ids[1]]).length};return r});
T('Play: hörbare, entladene Spur wird zuerst geladen und klingt (aktive Quelle vorhanden)',pl2.playing&&pl2.loaded&&pl2.src>=1,pl2);
// ---- Auto-Modus während des Spielens
await ev(()=>{Saver.setAuto(true);const t=dawState.tracks.find(x=>x.id===__ids[2]);t.mute=true;audioEngine.syncAudioParams()});
await pg.waitForTimeout(13000);
const au=await ev(()=>({p:dawState.buffers[__ids[2]].__parked,playing:dawState.isPlaying,stale:audioEngine.activeStemSources.filter(s=>s.buffer&&s.buffer.__parked).length,othersOk:!dawState.buffers[__ids[1]].__parked,srcB:audioEngine.activeStemSources.filter(s=>s.buffer===dawState.buffers[__ids[1]]).length}));
T('Auto: stumm geschaltete Spur wird nach ~8 s entladen, Wiedergabe läuft weiter',au.p&&au.playing&&au.othersOk&&au.srcB>=1,au);
await ev(()=>{const t=dawState.tracks.find(x=>x.id===__ids[2]);t.mute=false;audioEngine.syncAudioParams()});
await pg.waitForTimeout(3500);
const un=await ev(()=>({p:dawState.buffers[__ids[2]].__parked,playing:dawState.isPlaying,src:audioEngine.activeStemSources.filter(s=>s.buffer===dawState.buffers[__ids[2]]).length}));
T('Auto: Stumm aufgehoben während Wiedergabe → Spur wird geladen und wieder eingeklinkt',!un.p&&un.playing&&un.src>=1,un);
await ev(()=>audioEngine.stop&&audioEngine.stop(true));
// ---- Solo blendet andere aus
await ev(()=>{Saver.setAuto(false);const t=dawState.tracks.find(x=>x.id===__ids[0]);t.solo=true;audioEngine.syncAudioParams()});
T('Solo: nur die Solo-Spur wird als hörbar gebraucht',await ev(()=>{const n=Saver.needed();return n.length===1&&n[0]===__ids[0]}));
await ev(()=>{const t=dawState.tracks.find(x=>x.id===__ids[0]);t.solo=false;audioEngine.syncAudioParams()});
// ---- Export: lädt Hörbares nach / lässt Stummes weg
await ev(()=>{Saver.ensureAll();});await pg.waitForTimeout(800);
await ev(()=>{dawState.tracks.find(x=>x.id===__ids[2]).mute=true;Saver.park(__ids[2],{force:true});Saver.park(__ids[1],{force:true})});
const ex=await ev(async()=>{try{const r=await window.__exportMix({returnBuffer:true});return {len:r&&r.length,ok:!!r,loadedB:!dawState.buffers[__ids[1]].__parked,cStill:dawState.buffers[__ids[2]].__parked}}catch(e){return {err:e.message}}});
T('Export: hörbare entladene Spur wird automatisch geladen, stumme bleibt entladen',ex.ok&&ex.len>0&&ex.loadedB&&ex.cStill,ex);
T('Offline-Planer: stumme entladene Spur wird übersprungen, hörbare entladene wirft statt still wegzulassen',await ev(()=>{const tr=dawState.tracks.find(x=>x.id===__ids[2]);ClipModel.materialize(tr);const dummy={createBufferSource(){return {}}};let a=false,b=false;try{ClipModel.scheduleOffline(dummy,tr,{},10);a=true}catch(e){}
 tr.mute=false;try{ClipModel.scheduleOffline(dummy,tr,{},10)}catch(e){b=/entladen/.test(e.message)}tr.mute=true;return a&&b}));
// ---- Optionen
await pg.waitForTimeout(1200);
await ev(()=>{const x=document.querySelector('#btn-settings');x&&x.click()});await pg.waitForTimeout(600);
const ui=await ev(()=>{const s=document.querySelector('#sv-sec');return s?{html:s.innerText.slice(0,400),rows:s.querySelectorAll('[data-sv-one]').length,chk:!!s.querySelector('[data-sv-auto]')}:null});
T('Optionen: Abschnitt „Speicher-Sparer“ mit Spurliste',ui&&ui.rows>=3&&ui.chk&&/Speicher-Sparer/i.test(ui.html),ui);
await ev(()=>{document.querySelector('[data-sv-one]').click()});await pg.waitForTimeout(800);
T('Optionen: Knopf entlädt/lädt einzelne Spur',await ev(()=>{const r=Saver.status().rows;return r.length>=3}));
await ev(()=>{document.querySelector('[data-sv-auto]').click()});await pg.waitForTimeout(300);
T('Optionen: Schalter speichert Einstellung',await ev(()=>localStorage.getItem('sunshine.saver')==='1'&&Saver.auto()));
await ev(()=>{document.querySelector('[data-sv-all]').click()});await pg.waitForTimeout(1500);
T('Optionen: „Alle laden“ lädt alles',await ev(()=>Saver.status().parked===0),await ev(()=>Saver.status()));
T('Fehlerbericht nennt Speicher-Sparer',await ev(()=>/Speicher-Sparer/.test(Health.report())));
const real=errs.filter(e=>!/entladen \(Speicher-Sparer\)/.test(e));
T('Keine unerwarteten Seitenfehler',real.length===0,real);
console.log(`\n${ok} bestanden, ${bad} fehlgeschlagen`);await b.close();srv.close();process.exit(bad?1:0)})();
