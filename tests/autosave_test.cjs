const http=require('http'),fs=require('fs'),path=require('path');const {chromium}=require('playwright');
const WORK=process.argv[2];const TW=fs.readFileSync(path.join(__dirname,'fixtures/tailwind.js'));
const srv=http.createServer((q,r)=>{const f=path.join(WORK,decodeURIComponent(q.url.split('?')[0]).replace(/^\//,''));fs.readFile(f,(e,d)=>{if(e){r.writeHead(404);r.end();return;}r.writeHead(200,{'content-type':f.endsWith('.html')?'text/html':'application/octet-stream'});r.end(d)})});
let ok=0,bad=0;const T=(n,c,x)=>{if(c){ok++;console.log('PASS',n)}else{bad++;console.log('FAIL',n,x||'')}};
(async()=>{await new Promise(r=>srv.listen(0,'127.0.0.1',r));const port=srv.address().port;const b=await chromium.launch();
const ctx=await b.newContext({viewport:{width:393,height:852},isMobile:true,hasTouch:true});await ctx.addInitScript(()=>{try{localStorage.setItem('sunshine.home','off')}catch(_){}});const pg=await ctx.newPage();const errs=[];pg.on('pageerror',e=>errs.push(e.message));
await pg.route(/cdn\.tailwindcss\.com/,r=>r.fulfill({status:200,contentType:'application/javascript',body:TW}));
await pg.route(/^https?:\/\/(?!127\.0\.0\.1|cdn\.tailwindcss\.com)/,r=>r.abort());
await pg.goto(`http://127.0.0.1:${port}/index_ueberarbeitet.html`,{waitUntil:'load'});await pg.waitForTimeout(1200);
const ev=(f,a)=>pg.evaluate(f,a);
const reload=async()=>{await pg.reload({waitUntil:'load'});await pg.waitForTimeout(3600)};
T('Autosave-API da',await ev(()=>!!window.Autosave&&!!window.__projectIO));
// 1 leerer Zustand → nichts gesichert
await ev(()=>Autosave.saveNow(true));await pg.waitForTimeout(300);
T('Leeres Projekt wird nicht gesichert',(await ev(()=>Autosave._peek()))===null||(await ev(()=>Autosave._peek()))===undefined);
await reload();
T('…und beim Neustart kein Angebot',await pg.locator('#as-offer').count()===0);
// 2 Inhalt anlegen
await ev(async()=>{await audioEngine.ensureCtx();const c=audioEngine.ctx,sr=c.sampleRate;
 const b=c.createBuffer(2,sr*3,sr);for(let ch=0;ch<2;ch++){const d=b.getChannelData(ch);for(let i=0;i<d.length;i++)d[i]=0.5*Math.sin(2*Math.PI*(220+ch*110)*i/sr)}
 const t=createTrack('audio','Vocals');dawState.buffers[t.id]=b;window.__tid=t.id;audioEngine.ensureTrackNode(t);
 ClipModel.materialize(t);ClipModel.split(t,1.5);
 const m=createTrack('midi','Keys');m.midiNotes=[{id:1,pitch:60,start:0,dur:4,vel:100,step:0,len:4}];dawState.activeMidiTrackId=m.id;dawState.midiNotes=JSON.parse(JSON.stringify(m.midiNotes));
 window.__mid=m.id;renderMultiTrackLanes();document.getElementById('status-subtitle').dataset.projectName='Testsong'});
const before=await ev(()=>({n:dawState.tracks.length,clips:dawState.tracks.find(t=>t.id===__tid).clips.length,len:dawState.buffers[__tid].length,s:dawState.buffers[__tid].getChannelData(1)[1234],ntes:dawState.tracks.find(t=>t.id===__mid).midiNotes.length}));
const dbg=await ev(()=>{try{return JSON.stringify(window.__projectIO.makePayload({noBuffers:true}).state).length}catch(e){return 'ERR '+e.message}});const sv=await ev(()=>Autosave.saveNow(true));T('Sichern liefert true',sv,JSON.stringify(await ev(()=>Autosave._info()))+' errs='+errs.join('|'));
let info=await ev(()=>Autosave._info());T('Status: 1 Audiospur gesichert',info&&info.audio===1&&!info.err,JSON.stringify(info));
const writes=await ev(()=>Autosave.stats.bufWrites);
// 3 unverändert → keine Audio-Neuschreibung
await ev(()=>Autosave.saveNow(true));
T('Audio wird nicht erneut geschrieben, wenn unverändert',await ev(()=>Autosave.stats.bufWrites)===writes);
// 4 Änderung am Zustand erkannt
await ev(()=>{dawState.bpm=133});T('Änderung wird gesichert',await ev(()=>Autosave.saveNow()));
T('…gespeicherter Zustand hat BPM 133',(await ev(()=>Autosave._peek())).state.bpm===133);
// 5 Neustart → Angebot
await reload();
T('Nach Neustart: Wiederherstellungs-Dialog',await pg.locator('#as-offer').isVisible());
T('…Dialog nennt Projektnamen',/Testsong/.test(await pg.locator('#as-offer').innerText()));
// 6 vor Entscheidung wird nicht überschrieben
const sa0=(await ev(()=>Autosave._peek())).savedAt;await ev(()=>Autosave.saveNow(true));await pg.waitForTimeout(200);
T('Vor der Entscheidung wird der Zwischenstand nicht überschrieben',(await ev(()=>Autosave._peek())).savedAt===sa0);
await pg.tap('#as-offer [data-as="yes"]');await pg.waitForTimeout(1500);
const after=await ev(()=>{const t=dawState.tracks.find(t=>t.name&&/Vocals/.test(t.name))||dawState.tracks.find(t=>dawState.buffers[t.id]);const m=dawState.tracks.find(t=>t.type==='midi'&&t.midiNotes&&t.midiNotes.length);return {n:dawState.tracks.length,clips:(t.clips||[]).length,len:dawState.buffers[t.id]&&dawState.buffers[t.id].length,s:dawState.buffers[t.id]&&dawState.buffers[t.id].getChannelData(1)[1234],ntes:m?m.midiNotes.length:0,bpm:dawState.bpm,sub:document.getElementById('status-subtitle').textContent}});
T('Spuren wiederhergestellt',after.n===before.n,JSON.stringify(after));
T('Audio identisch (Länge + Probe)',after.len===before.len&&Math.abs(after.s-before.s)<1e-6,JSON.stringify([after.len,before.len,after.s,before.s]));
T('Clips (Teilung) erhalten',after.clips===before.clips);
T('MIDI-Noten erhalten',after.ntes===before.ntes);
T('BPM erhalten',after.bpm===133);
T('Projektname in der Kopfzeile',/Testsong/.test(after.sub));
T('Dialog weg',await pg.locator('#as-offer').count()===0);
// 7 weiterarbeiten sichert wieder, ohne Audio neu zu schreiben
const w2=await ev(()=>Autosave.stats.bufWrites);await ev(()=>{dawState.bpm=100});await ev(()=>Autosave.saveNow());
T('Nach Wiederherstellung: Zustand wird weiter gesichert',(await ev(()=>Autosave._peek())).state.bpm===100);
T('…ohne Audio erneut zu schreiben',await ev(()=>Autosave.stats.bufWrites)===w2);
// 8 Verwerfen
await reload();T('2. Neustart: wieder Angebot',await pg.locator('#as-offer').isVisible());
await pg.tap('#as-offer [data-as="no"]');await pg.waitForTimeout(500);
T('Verwerfen löscht den Zwischenstand',(await ev(()=>Autosave._peek()))==null);
await reload();T('…kein Angebot mehr',await pg.locator('#as-offer').count()===0);
// 9 Optionen
await pg.evaluate(()=>document.getElementById('btn-settings').click());await pg.waitForSelector('#settings-modal');
T('Optionen: Autosave-Schalter an',await pg.locator('input[data-autosave]').isChecked());
T('Optionen: Status-Zeile sichtbar',await pg.locator('#as-status').isVisible());
await pg.locator('input[data-autosave]').uncheck();await pg.waitForTimeout(200);
T('Ausschalten wirkt',await ev(()=>Autosave.enabled())===false);
T('…speichert dann nicht',await ev(async()=>{await audioEngine.ensureCtx();const t=createTrack('audio','X');dawState.buffers[t.id]=audioEngine.ctx.createBuffer(1,100,audioEngine.ctx.sampleRate);return Autosave.saveNow(true)})===false);
await pg.locator('input[data-autosave]').check();await pg.waitForTimeout(800);
T('Einschalten sichert sofort',(await ev(()=>Autosave._peek()))!=null);
await pg.screenshot({path:'../dist/_shots/autosave_options.png'});
T('Keine Skriptfehler',errs.length===0,errs.join(' | '));
console.log(`\n${ok} bestanden, ${bad} fehlgeschlagen`);await b.close();srv.close();
})();
