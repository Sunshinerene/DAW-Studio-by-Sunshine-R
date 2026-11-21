/* 1.47: MP3-Export (lamejs) – Datei wird mit ffprobe/ffmpeg geprüft */
const http=require('http'),fs=require('fs'),path=require('path'),cp=require('child_process');const {chromium}=require('playwright');
const WORK=process.argv[2];
const srv=http.createServer((q,r)=>{const f=path.join(WORK,decodeURIComponent(q.url.split('?')[0]).replace(/^\//,''));fs.readFile(f,(e,d)=>{if(e){r.writeHead(404);r.end();return;}r.writeHead(200,{'content-type':f.endsWith('.html')?'text/html':'application/octet-stream'});r.end(d)})});
let ok=0,bad=0;const T=(n,c,x)=>{if(c){ok++;console.log('PASS',n)}else{bad++;console.log('FAIL',n,x===undefined?'':JSON.stringify(x))}};
(async()=>{await new Promise(r=>srv.listen(0,'127.0.0.1',r));const port=srv.address().port;const b=await chromium.launch();
const ctx=await b.newContext({viewport:{width:393,height:852},isMobile:true,hasTouch:true});await ctx.addInitScript(()=>{try{localStorage.setItem('sunshine.home','off');localStorage.setItem('sunshine.news','{"seen":"9.99"}')}catch(_){}});
const pg=await ctx.newPage();const errs=[];pg.on('pageerror',e=>errs.push(e.message));
await pg.route(/^https?:\/\/(?!127\.0\.0\.1)/,r=>r.abort());
await pg.goto(`http://127.0.0.1:${port}/index_ueberarbeitet.html`,{waitUntil:'load'});await pg.waitForTimeout(1200);
const ev=(f,a)=>pg.evaluate(f,a);
const bytes=async()=>Buffer.from(await ev(async()=>{const ab=await window.__blob.arrayBuffer();let s='';const u=new Uint8Array(ab);for(let i=0;i<u.length;i+=32768)s+=String.fromCharCode.apply(null,u.subarray(i,i+32768));return btoa(s)}),'base64');
const probe=f=>{try{return cp.execSync(`ffprobe -v error -show_entries stream=codec_name,channels,sample_rate,bit_rate -show_entries format=duration:format_tags -of default=nw=1 ${f}`,{encoding:'utf8'})}catch(e){return 'ERR '+e.message}};
T('Encoder steckt in der Seite, aber noch nicht gestartet',await ev(()=>!!document.getElementById('lame-src')&&!window.lamejs));
// Stereo-Testpuffer: 3 s, links 440 Hz, rechts 880 Hz, 44,1 kHz
await ev(async()=>{await audioEngine.ensureCtx();const sr=44100,b=audioEngine.ctx.createBuffer(2,sr*3,sr);for(let i=0;i<b.length;i++){b.getChannelData(0)[i]=0.5*Math.sin(2*Math.PI*440*i/sr);b.getChannelData(1)[i]=0.5*Math.sin(2*Math.PI*880*i/sr)}window.__buf=b});
for(const [fmt,kb] of [['mp3_128',128],['mp3_192',192],['mp3_320',320]]){
  await ev(async f=>{const e=await ExportUI.encodeBuf(window.__buf,f);window.__blob=e.blob;window.__ext=e.ext},fmt);
  const by=await bytes();fs.writeFileSync('/tmp/t_'+fmt+'.mp3',by);const p=probe('/tmp/t_'+fmt+'.mp3');
  T(fmt+': Endung mp3, MIME audio/mpeg, Datei nicht leer',await ev(()=>window.__ext==='mp3'&&window.__blob.type==='audio/mpeg'&&window.__blob.size>1000));
  T(fmt+': ffprobe erkennt mp3, 2 Kanäle, 44,1 kHz',/codec_name=mp3/.test(p)&&/channels=2/.test(p)&&/sample_rate=44100/.test(p),p);
  const br=parseInt((p.match(/bit_rate=(\d+)/)||[])[1]);T(fmt+': Bitrate ≈ '+kb+' kbit/s (±8 %)',Math.abs(br/1000-kb)<kb*0.08,br);
  const du=parseFloat((p.match(/duration=([\d.]+)/)||[])[1]);T(fmt+': Dauer ≈ 3,0 s (±0,1)',Math.abs(du-3)<0.1,du);
  let dec='';try{dec=cp.execSync(`ffmpeg -v error -i /tmp/t_${fmt}.mp3 -f null - 2>&1`,{encoding:'utf8'})}catch(e){dec='ERR '+e.message}
  T(fmt+': ffmpeg dekodiert ohne Fehler',dec.trim()==='',dec.slice(0,200));
}
T('Encoder wurde erst beim ersten Export gestartet und bleibt danach bereit',await ev(()=>!!window.lamejs&&!!lamejs.Mp3Encoder));
// Kanäle getrennt? links 440 Hz, rechts 880 Hz → Frequenz je Kanal über ffmpeg-Zero-Crossing prüfen
{const zc=ch=>{const raw=cp.execSync(`ffmpeg -v error -i /tmp/t_mp3_320.mp3 -af "pan=mono|c0=c${ch}" -f s16le -ac 1 -ar 44100 - `,{maxBuffer:1<<26});let z=0,pr=0;for(let i=44100;i<raw.length/2-44100;i++){const v=raw.readInt16LE(i*2);if(pr<0&&v>=0)z++;pr=v}return z/((raw.length/2-88200)/44100)};
 const l=zc(0),r=zc(1);T('Links ≈ 440 Hz und rechts ≈ 880 Hz (Kanäle sauber getrennt)',Math.abs(l-440)<15&&Math.abs(r-880)<25,[Math.round(l),Math.round(r)])}
// Mono + ungewöhnliche Abtastrate (22,05 kHz → wird umgerechnet)
await ev(async()=>{const c=audioEngine.ctx,b=c.createBuffer(1,22050*2,22050);for(let i=0;i<b.length;i++)b.getChannelData(0)[i]=0.4*Math.sin(2*Math.PI*500*i/22050);const e=await ExportUI.encodeBuf(b,'mp3_192');window.__blob=e.blob});
{const by=await bytes();fs.writeFileSync('/tmp/t_mono.mp3',by);const p=probe('/tmp/t_mono.mp3');const du=parseFloat((p.match(/duration=([\d.]+)/)||[])[1]);
 T('Mono-Puffer mit 22,05 kHz: gültige MP3, Dauer ≈ 2,0 s',/codec_name=mp3/.test(p)&&Math.abs(du-2)<0.1&&/channels=1/.test(p),p)}
// Tags (ID3 mit Titel, Künstler)
await ev(()=>{const p=dawState.project||(dawState.project={});p.name='Testlied';p.tags=Object.assign(p.tags||{},{artist:'Sunshine@R',album:'Probe',genre:'Techno'})});
await ev(async()=>{window.__saved=null;const e=await ExportUI.encodeBuf(window.__buf,'mp3_192');window.__blob=e.blob});
{const by=await bytes();fs.writeFileSync('/tmp/t_tag.mp3',by);const p=probe('/tmp/t_tag.mp3');
 T('Mit Tags: Datei beginnt mit ID3',by.slice(0,3).toString()==='ID3'||!(await ev(()=>Cover.hasTags())),by.slice(0,3).toString());
 if(by.slice(0,3).toString()==='ID3')T('ffprobe liest Titel und Künstler aus dem ID3-Tag',/TAG:title=Testlied/i.test(p)&&/TAG:artist=Sunshine@R/i.test(p),p)}
// Über das Export-Fenster: Mix als MP3
await ev(async()=>{const sr=44100,b=audioEngine.ctx.createBuffer(1,sr*8,sr);for(let i=0;i<b.length;i++)b.getChannelData(0)[i]=0.3*Math.sin(2*Math.PI*200*i/sr);const a=createTrack('audio','Ton');dawState.buffers[a.id]=b;audioEngine.ensureTrackNode(a);renderMultiTrackLanes();window.__saved=null;window.saveOrShareBlob=async(bl,n)=>{window.__saved={name:n,size:bl.size};window.__blob=bl;return 'downloaded'}});
await pg.tap('#btn-export-wav');await pg.waitForSelector('#ex-root',{state:'visible'});await pg.waitForTimeout(300);
T('Kopfzeilen-Knopf heißt „Export“ und öffnet das Export-Fenster mit MP3 in der Formatauswahl',await ev(()=>/Export/.test(document.getElementById('lbl-export-wav').textContent)&&!/Master WAV/.test(document.getElementById('btn-export-wav').textContent)&&[...document.getElementById('ex-fmt').options].some(o=>o.value==='mp3_192')&&document.querySelector('#ex-root [data-what=master]').getAttribute('aria-pressed')==='true'));
await ev(()=>document.querySelector('#ex-root [data-ex=close]').click());await pg.waitForTimeout(200);
await pg.tap('#btn-menu');await pg.tap('#file-menu #btn-export-all');await pg.waitForSelector('#ex-root',{state:'visible'});await pg.waitForTimeout(300);
T('Export-Fenster bietet drei MP3-Formate',await ev(()=>[...document.getElementById('ex-fmt').options].filter(o=>/^mp3_/.test(o.value)).length===3));
await pg.selectOption('#ex-fmt','mp3_192');await pg.waitForTimeout(150);
T('Hinweistext zum MP3-Format erscheint',await ev(()=>/MP3 \(\.mp3\)/.test(document.getElementById('ex-fmtnote').textContent)));
await pg.tap('#ex-root [data-ex="go"]');await pg.waitForFunction(()=>window.__saved||/fehlgeschlagen/.test(document.getElementById('ex-status').textContent),null,{timeout:60000});
{const sv=await ev(()=>window.__saved);T('Mix-Export liefert eine .mp3-Datei',!!sv&&/\.mp3$/.test(sv.name),sv);
 const by=await bytes();fs.writeFileSync('/tmp/t_ui.mp3',by);const p=probe('/tmp/t_ui.mp3');const du=parseFloat((p.match(/duration=([\d.]+)/)||[])[1]);
 T('Exportierte MP3 ist gültig (ffprobe) und hat die Länge des Songs',/codec_name=mp3/.test(p)&&du>7,p)}
// Einzelstems als ZIP mit MP3-Dateien
await ev(()=>{window.__saved=null});await pg.tap('#ex-root [data-what="stems"]');await pg.waitForTimeout(200);await pg.selectOption('#ex-fmt','mp3_128');
await pg.tap('#ex-root [data-ex="go"]');await pg.waitForFunction(()=>window.__saved||/fehlgeschlagen|Keine/.test(document.getElementById('ex-status').textContent),null,{timeout:90000});
{const sv=await ev(()=>window.__saved);const by=await bytes();fs.writeFileSync('/tmp/t_stems.zip',by);let ls='';try{ls=cp.execSync('unzip -l /tmp/t_stems.zip',{encoding:'utf8'})}catch(e){ls='ERR '+e.message}
 T('Stems-Export: ZIP mit .mp3-Dateien',!!sv&&/\.zip$/.test(sv.name)&&/\.mp3/.test(ls)&&!/\.wav/.test(ls),ls.slice(0,300))}
T('Keine JS-Fehler',errs.length===0,errs.slice(0,3));
console.log(`\n${ok} ok / ${bad} fail`);await b.close();srv.close();process.exit(bad?1:0)})();
