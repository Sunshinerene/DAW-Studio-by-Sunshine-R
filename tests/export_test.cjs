const http=require('http'),fs=require('fs'),path=require('path');const {chromium}=require('playwright');
const WORK=process.argv[2];const TW=fs.readFileSync(path.join(__dirname,'fixtures/tailwind.js'));
const srv=http.createServer((q,r)=>{const f=path.join(WORK,decodeURIComponent(q.url.split('?')[0]).replace(/^\//,''));fs.readFile(f,(e,d)=>{if(e){r.writeHead(404);r.end();return;}r.writeHead(200,{'content-type':f.endsWith('.html')?'text/html':'application/octet-stream'});r.end(d)})});
let ok=0,bad=0;const T=(n,c,x)=>{if(c){ok++;console.log('PASS',n)}else{bad++;console.log('FAIL',n,x||'')}};
(async()=>{await new Promise(r=>srv.listen(0,'127.0.0.1',r));const port=srv.address().port;const b=await chromium.launch();
const ctx=await b.newContext({viewport:{width:393,height:852},isMobile:true,hasTouch:true});await ctx.addInitScript(()=>{try{localStorage.setItem('sunshine.home','off')}catch(_){}});const pg=await ctx.newPage();const errs=[];pg.on('pageerror',e=>errs.push(e.message));
await pg.route(/cdn\.tailwindcss\.com/,r=>r.fulfill({status:200,contentType:'application/javascript',body:TW}));
await pg.route(/^https?:\/\/(?!127\.0\.0\.1|cdn\.tailwindcss\.com)/,r=>r.abort());
const cp=require('child_process');const JSZ=fs.readFileSync('/opt/npm-tools/node_modules/jszip/dist/jszip.min.js','utf8');
await pg.route(/cdnjs\.cloudflare\.com.*jszip/,r=>r.fulfill({status:200,contentType:'application/javascript',body:JSZ}));
await pg.goto(`http://127.0.0.1:${port}/index_ueberarbeitet.html`,{waitUntil:'load'});await pg.waitForTimeout(1200);
const SHOT=path.join(__dirname,'../dist/_shots');const ev=(f,a)=>pg.evaluate(f,a);
await ev(async()=>{await audioEngine.ensureCtx();const sr=44100;const mk=(f,a)=>{const b=audioEngine.ctx.createBuffer(1,sr*40,sr),d=b.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=a*Math.sin(2*Math.PI*f*i/sr);return b};
 const a=createTrack('audio','Bass/Sub');dawState.buffers[a.id]=mk(80,0.3);window.__a=a.id;audioEngine.ensureTrackNode(a);
 const l=createTrack('audio','Lead');dawState.buffers[l.id]=mk(1000,0.2);l.mute=true;window.__l=l.id;audioEngine.ensureTrackNode(l);
 const m=createTrack('midi','Keys');m.midiNotes=[{id:1,pitch:60,start:0,dur:4,vel:100},{id:2,pitch:64,start:4,dur:4,vel:90}];dawState.activeMidiTrackId=m.id;dawState.midiNotes=JSON.parse(JSON.stringify(m.midiNotes));window.__m=m.id;
 const k=createTrack('kick','Kick');window.__k=k.id;dawState.seqKick=[1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0];dawState.seqHat=[0,0,1,0,0,0,1,0,0,0,1,0,0,0,1,0];
 const i=document.getElementById('input-bpm');i.value=120;i.dispatchEvent(new Event('change',{bubbles:true}));renderMultiTrackLanes();
 window.__saved=null;window.saveOrShareBlob=async(b,n)=>{window.__saved={name:n,size:b.size};window.__blob=b;return 'downloaded'}});
const bytes=async()=>Buffer.from(await ev(async()=>{const ab=await window.__blob.arrayBuffer();let s='';const u=new Uint8Array(ab);for(let i=0;i<u.length;i+=32768)s+=String.fromCharCode.apply(null,u.subarray(i,i+32768));return btoa(s)}),'base64');
const wavInfo=b=>({sr:b.readUInt32LE(24),ch:b.readUInt16LE(22),bits:b.readUInt16LE(34),n:b.readUInt32LE(40)});
const dlg=async()=>{await pg.tap('#btn-menu');await pg.tap('#file-menu #btn-export-all');await pg.waitForSelector('#ex-root',{state:'visible'});await pg.waitForTimeout(300)};
const run=async(t=60000)=>{await ev(()=>{window.__saved=null});await pg.tap('#ex-root [data-ex="go"]');await pg.waitForFunction(()=>window.__saved||/fehlgeschlagen|Keine/.test(document.getElementById('ex-status').textContent),null,{timeout:t});await pg.waitForTimeout(150)};
await dlg();
T('Export-Fenster über das Menü',await pg.locator('#ex-root').isVisible());
const opusOk=await ev(()=>ExportUI.opusSupported());console.log('INFO Opus-Encoder verfügbar:',opusOk);
T('Bereichsliste: Ganz, Inhalt, 5 Abschnitte, Eigener',await ev(()=>document.getElementById('ex-range').options.length)===8);
T('Format-Liste enthält WAV 16/24'+(opusOk?' und Opus':''),await ev(()=>document.getElementById('ex-fmt').options.length)===(opusOk?3:2));
// Master ganz
await run();let sv=await ev(()=>window.__saved);let by=await bytes();let wi=wavInfo(by);
T('Master: Dateiname …_Mix.wav',/Sunshine-R_120BPM_Mix\.wav$/.test(sv.name),sv.name);
T('…WAV 44,1 kHz, stereo, 16 Bit',wi.sr===44100&&wi.ch===2&&wi.bits===16,JSON.stringify(wi));
T('…Länge = 24 Takte × 2 s = 48 s',Math.abs(wi.n/4/44100-48)<0.05,wi.n/4/44100);
// Abschnitt Intro
await pg.selectOption('#ex-range','sec0');await run();sv=await ev(()=>window.__saved);by=await bytes();wi=wavInfo(by);
T('Abschnitt „Intro“: 4 Takte = 8 s, Name mit Zusatz',Math.abs(wi.n/4/44100-8)<0.05&&/_Intro\.wav$/.test(sv.name),[wi.n/4/44100,sv.name]);
// Eigener Bereich
await pg.selectOption('#ex-range','custom');T('Eigener Bereich zeigt Takt-Felder',await pg.locator('#ex-from').isVisible());
await pg.fill('#ex-from','3');await pg.fill('#ex-to','4');await run();sv=await ev(()=>window.__saved);by=await bytes();wi=wavInfo(by);
T('Takt 3–4 = 4 s, Name „_Takt3-4“',Math.abs(wi.n/4/44100-4)<0.05&&/_Takt3-4\.wav$/.test(sv.name),[wi.n/4/44100,sv.name]);
// Inhalt
await pg.selectOption('#ex-range','content');await run();sv=await ev(()=>window.__saved);by=await bytes();wi=wavInfo(by);
T('„Bis Ende der Inhalte“ ≈ 41 s (40 s Datei + 1 s)',Math.abs(wi.n/4/44100-41)<0.1,wi.n/4/44100);
// 24 Bit
await pg.selectOption('#ex-range','custom');await pg.selectOption('#ex-fmt','wav24');await run();by=await bytes();wi=wavInfo(by);
T('WAV 24 Bit: Header 24, Datengröße = Samples×2×3',wi.bits===24&&wi.n===Math.round(4*44100)*6&&by.length===44+wi.n,JSON.stringify(wi));
// Opus
if(opusOk){await pg.selectOption('#ex-fmt','opus');await run(90000);sv=await ev(()=>window.__saved);by=await bytes();fs.writeFileSync('/tmp/ex_test.ogg',by);
 T('Opus: Dateiendung .ogg, deutlich kleiner als WAV',/\.ogg$/.test(sv.name)&&by.length<4*44100*4/5,by.length);
 let probe='';try{probe=cp.execSync('ffprobe -v error -show_entries stream=codec_name,channels,sample_rate -show_entries format=duration -of default=nw=1 /tmp/ex_test.ogg',{encoding:'utf8'})}catch(e){probe='ERR '+e.message}
 T('ffprobe erkennt Opus, 2 Kanäle, 48 kHz',/codec_name=opus/.test(probe)&&/channels=2/.test(probe)&&/sample_rate=48000/.test(probe),probe);
 const dur=parseFloat((probe.match(/duration=([\d.]+)/)||[])[1]);T('…Dauer ≈ 4,0 s (±0,05)',Math.abs(dur-4)<0.05,dur);
 let dec='';try{dec=cp.execSync('ffmpeg -v error -i /tmp/ex_test.ogg -f null - 2>&1',{encoding:'utf8'})}catch(e){dec='ERR '+e.message}
 T('ffmpeg dekodiert ohne Fehler',dec.trim()==='',dec.slice(0,200));
 const rt=await ev(async()=>{const ab=await window.__blob.arrayBuffer();const c=audioEngine.ctx;const d=await c.decodeAudioData(ab.slice(0));return {dur:d.duration,ch:d.numberOfChannels,sr:d.sampleRate}});
 T('Browser dekodiert die Opus-Datei (decodeAudioData)',Math.abs(rt.dur-4)<0.1&&rt.ch===2,JSON.stringify(rt));
}
await pg.selectOption('#ex-fmt','wav16');
// Stems
await pg.tap('#ex-what [data-what="stems"]');await pg.waitForTimeout(150);
await pg.screenshot({path:SHOT+'/export_dialog.png'});
T('Spurliste: leere Spuren nicht vorgewählt (Kick mit Muster ja)',await ev(()=>[...document.querySelectorAll('#ex-list input')].map(i=>i.checked).join())==='true,true,true,true',await ev(()=>[...document.querySelectorAll('#ex-list input')].map(i=>i.checked).join()));
await pg.selectOption('#ex-range','custom');await pg.fill('#ex-from','1');await pg.fill('#ex-to','2');
await pg.locator('#ex-list input').nth(2).uncheck();   // Keys abwählen
await run(180000);sv=await ev(()=>window.__saved);by=await bytes();fs.writeFileSync('/tmp/ex_stems.zip',by);
T('Stems: Dateiname …_Stems_Takt1-2.zip',/_Stems_Takt1-2\.zip$/.test(sv.name),sv.name);
const zt=cp.spawnSync('python3',['-c','import zipfile,sys;z=zipfile.ZipFile("/tmp/ex_stems.zip");print(z.testzip());print("|".join(z.namelist()))'],{encoding:'utf8'});
T('ZIP ist gültig (Python zipfile.testzip)',zt.stdout.split('\n')[0]==='None',zt.stdout+zt.stderr);
const names=(zt.stdout.split('\n')[1]||'').split('|');
T('Inhalt: 00_Master-Mix, 01_Bass_Sub, 02_Lead, 04_Kick (Keys abgewählt)',names.join()==='00_Master-Mix.wav,01_Bass_Sub.wav,02_Lead.wav,04_Kick.wav',names.join());
const st=await ev(async()=>{await SunLazy.zip();const z=await JSZip.loadAsync(window.__blob);const out={};for(const n of Object.keys(z.files)){const u=await z.files[n].async('uint8array');const dv=new DataView(u.buffer,u.byteOffset,u.byteLength);const nn=(u.length-44)/2;const ch0=[];const fr=(f)=>{let re=0,im=0,n=0;for(let i=0;i<nn/2;i+=1){const s=dv.getInt16(44+i*4,true)/32768;const a=2*Math.PI*f*i/44100;re+=s*Math.cos(a);im+=s*Math.sin(a);n++}return Math.hypot(re,im)/n*2};out[n]={bytes:u.length,rate:dv.getUint32(24,true),f80:fr(80),f1000:fr(1000)};}return out});
T('Stems sind gültige WAVs (44,1 kHz, 4 s)',Object.values(st).every(x=>x.rate===44100&&x.bytes===44+4*44100*4),JSON.stringify(Object.values(st).map(x=>x.bytes)));
T('Bass-Stem: Energie bei 80 Hz, keine bei 1 kHz',st['01_Bass_Sub.wav'].f80>0.1&&st['01_Bass_Sub.wav'].f1000<0.01,JSON.stringify(st['01_Bass_Sub.wav']));
T('Lead-Stem (Spur ist stumm!) trotzdem mit Inhalt',st['02_Lead.wav'].f1000>0.05&&st['02_Lead.wav'].f80<0.01,JSON.stringify(st['02_Lead.wav']));
T('Master-Mix in der ZIP enthält nur die hörbaren Spuren (Lead stumm)',st['00_Master-Mix.wav'].f80>0.05&&st['00_Master-Mix.wav'].f1000<0.01,JSON.stringify(st['00_Master-Mix.wav']));
T('Stumm-Zustand nach dem Export wiederhergestellt',await ev(()=>dawState.tracks.find(t=>t.id===__l).mute)===true&&await ev(()=>dawState.tracks.every(t=>!t.solo)));
// MIDI
await pg.tap('#ex-what [data-what="midi"]');await run();sv=await ev(()=>window.__saved);by=await bytes();
T('MIDI: Dateiname …_MIDI.mid',/_MIDI\.mid$/.test(sv.name),sv.name);
const mid=(b)=>{const dv=new DataView(b.buffer,b.byteOffset,b.byteLength);const o={fmt:dv.getUint16(8),n:dv.getUint16(10),tpb:dv.getUint16(12),tempo:0,names:[],on:0};let p=14;for(let t=0;t<o.n;t++){p+=4;const len=dv.getUint32(p);p+=4;const end=p+len;let run=0;while(p<end){let d=0,x;do{x=b[p++];d=(d<<7)|(x&127)}while(x&128);let st=b[p];if(st&128){p++;run=st}else st=run;if(st===0xFF){const ty=b[p++];let l=0,y;do{y=b[p++];l=(l<<7)|(y&127)}while(y&128);if(ty===0x51)o.tempo=(b[p]<<16)|(b[p+1]<<8)|b[p+2];if(ty===3)o.names.push(String.fromCharCode(...b.subarray(p,p+l)));p+=l}else{const hi=st&0xF0;const nb=(hi===0xC0||hi===0xD0)?1:2;if(hi===0x90&&b[p+1]>0)o.on++;p+=nb}}}return o};
const mi=mid(by);
T('MIDI: Format 1, 480 Ticks, Tempo 120 BPM (500000 µs)',mi.fmt===1&&mi.tpb===480&&mi.tempo===500000,JSON.stringify(mi));
T('MIDI: Spuren Tempo + Keys + Sequencer Drums',mi.n===3&&mi.names.join('|')==='Sunshine@R|Keys|Sequencer Drums',mi.names.join('|'));
T('MIDI: 2 Keys-Noten + Kick/Hat über 24 Takte (4+4 Schläge × 24)',mi.on===2+24*8,mi.on);
T('Keine Skriptfehler',errs.length===0,errs.join(' | '));
console.log(`\n${ok} bestanden, ${bad} fehlgeschlagen`);await b.close();srv.close();
})();
