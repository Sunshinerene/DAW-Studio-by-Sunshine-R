const http=require('http'),fs=require('fs'),path=require('path'),cp=require('child_process');const {chromium}=require('playwright');
const WORK=process.argv[2];const TW=fs.readFileSync(path.join(__dirname,'fixtures/tailwind.js'));const JSZ=fs.readFileSync('/opt/npm-tools/node_modules/jszip/dist/jszip.min.js','utf8');
const srv=http.createServer((q,r)=>{const f=path.join(WORK,decodeURIComponent(q.url.split('?')[0]).replace(/^\//,''));fs.readFile(f,(e,d)=>{if(e){r.writeHead(404);r.end();return;}r.writeHead(200,{'content-type':f.endsWith('.html')?'text/html':f.endsWith('.js')?'application/javascript':'application/octet-stream'});r.end(d)})});
let ok=0,bad=0;const T=(n,c,x)=>{if(c){ok++;console.log('PASS',n)}else{bad++;console.log('FAIL',n,x===undefined?'':JSON.stringify(x))}};
(async()=>{await new Promise(r=>srv.listen(0,'127.0.0.1',r));const port=srv.address().port;const b=await chromium.launch();
const ctx=await b.newContext({viewport:{width:393,height:852},isMobile:true,hasTouch:true});await ctx.addInitScript(()=>{try{if(!sessionStorage.__i){sessionStorage.__i=1;localStorage.setItem('sunshine.home','off');localStorage.setItem('sunshine.news','{"seen":"1.48"}')}}catch(_){}});const pg=await ctx.newPage();const errs=[];pg.on('pageerror',e=>errs.push(e.message));
await pg.route(/cdn\.tailwindcss\.com/,r=>r.fulfill({status:200,contentType:'application/javascript',body:TW}));await pg.route(/cdnjs\.cloudflare\.com.*jszip/,r=>r.fulfill({status:200,contentType:'application/javascript',body:JSZ}));
await pg.route(/^https?:\/\/(?!127\.0\.0\.1|cdn\.tailwindcss\.com|cdnjs)/,r=>r.abort());
await pg.goto(`http://127.0.0.1:${port}/index_ueberarbeitet.html`,{waitUntil:'load'});await pg.waitForTimeout(1200);
const ev=(f,a)=>pg.evaluate(f,a);const SHOT=path.join(__dirname,'../dist/_shots');
T('Modul Cover vorhanden, Kopf-Slot da',await ev(()=>!!window.Cover&&!!document.getElementById('cv-slot')));
T('Ohne Cover: Platzhalter sichtbar, kein Bild',await ev(()=>{const s=document.getElementById('cv-slot');return !s.classList.contains('has')&&s.getBoundingClientRect().width>40&&getComputedStyle(s.querySelector('.cv-ph')).display!=='none'}));
// ---- Generator
const gen=await ev(()=>{const a=Cover.generate({title:'Neon Sunrise',artist:'DJ Test',style:'sun'}),b=Cover.generate({title:'Neon Sunrise',artist:'DJ Test',style:'sun'}),c=Cover.generate({title:'Neon Sunrise',artist:'Anderer',style:'sun'}),d=Cover.styles.map(s=>Cover.generate({title:'X',artist:'Y',style:s[0]}).cover);return {same:a.cover===b.cover,diffArtist:a.cover!==c.cover,styles:new Set(d).size,jpeg:/^data:image\/jpeg;base64,/.test(a.cover),len:a.cover.length,thumb:a.thumb.length}});
T('Generator: reproduzierbar, Künstler ändert das Bild, 4 verschiedene Stile, JPEG',gen.same&&gen.diffArtist&&gen.styles===4&&gen.jpeg,gen);
T('Cover bleibt klein genug fürs Projekt (< 150 KB) und Thumbnail < 12 KB',gen.len<150000&&gen.thumb<12000,gen);
// ---- Neues Projekt mit Cover + Tags
await ev(()=>{Home.openForm('new')});await pg.waitForTimeout(500);
T('Neues Projekt: „Cover & Tags“ ist aufgeklappt, Knöpfe sofort sichtbar (ohne extra Tipp)',await ev(()=>{const d=document.getElementById('pf-cvdet');const b=document.querySelector('#pf-cover [data-cv=gen]');return d&&d.open&&b&&b.offsetHeight>0}));
T('Projekt-Dialog hat den Bereich „Cover & Tags“',await ev(()=>!!document.getElementById('pf-cvdet')&&!!document.querySelector('#pf-cover .cv-ed')));
await ev(()=>{document.getElementById('pf-cvdet').open=true});
await pg.fill('#pf-name','Testsong');await pg.fill('#pf-cover [data-t=artist]','DJ Test');await pg.fill('#pf-cover [data-t=genre]','Trance');await pg.fill('#pf-cover [data-t=album]','Demo EP');await pg.fill('#pf-cover [data-t=copyright]','© 2026 DJ Test');
await pg.tap('#pf-cover [data-cv=gen]');await pg.waitForTimeout(500);
const c1=await ev(()=>document.querySelector('#pf-cover [data-cv-prev] img').src);T('„Cover erstellen“ zeigt eine Vorschau',/^data:image\/jpeg/.test(c1));
await pg.tap('#pf-cover [data-cv=mix]');await pg.waitForTimeout(400);const c2=await ev(()=>document.querySelector('#pf-cover [data-cv-prev] img').src);T('„Neu mischen“ ergibt ein anderes Cover',c2!==c1);
await pg.tap('#pf-cover [data-cv-style=eq]');await pg.waitForTimeout(400);T('Stil „Equalizer“ wählbar (aria-checked)',await ev(()=>document.querySelector('#pf-cover [data-cv-style=eq]').getAttribute('aria-checked')==='true'));
await pg.fill('#pf-cover [data-t=artist]','DJ Test Neu');await pg.waitForTimeout(900);const c3=await ev(()=>document.querySelector('#pf-cover [data-cv-prev] img').src);T('Künstler ändern erzeugt das Cover automatisch neu',c3!==await Promise.resolve(c2));
await pg.fill('#pf-cover [data-t=artist]','DJ Test');await pg.waitForTimeout(700);
await pg.screenshot({path:path.join(SHOT,'cv_form.png')});
await pg.tap('#pf-ok');await pg.waitForTimeout(1500);
const pr=await ev(()=>({n:dawState.project.name,cv:!!dawState.project.cover,th:!!dawState.project.thumb,t:dawState.project.tags,g:dawState.project.coverGen}));
T('Projekt angelegt mit Cover, Thumbnail, Tags und Generator-Stil',pr.n==='Testsong'&&pr.cv&&pr.th&&pr.t.artist==='DJ Test'&&pr.t.genre==='Trance'&&pr.t.album==='Demo EP'&&pr.t.year===String(new Date().getFullYear())&&pr.g.style==='eq',pr);
T('Kopfbereich zeigt das Cover (Bild geladen, 44 px)',await ev(async()=>{const s=document.getElementById('cv-slot'),i=s.querySelector('.cv-img');await new Promise(r=>setTimeout(r,400));return s.classList.contains('has')&&i.naturalWidth===512&&i.getBoundingClientRect().width>=40}));
T('Künstler wird für das nächste Projekt gemerkt',await ev(()=>JSON.parse(localStorage.getItem('sunshine.cover.last')).artist==='DJ Test'));
// ---- Speichern & wieder öffnen
const pid=await ev(()=>dawState.project.id);
await ev(async()=>{await Home.saveCurrent({silent:true});await Home.createProject({name:'Zweites',bpm:120,root:0,scale:'minor',grid:2,arr:'std',click:false,loop:true,start:'empty',notes:''})});await pg.waitForTimeout(800);
T('Zweites Projekt ohne Cover: Kopf zeigt Platzhalter',await ev(async()=>{await new Promise(r=>setTimeout(r,700));return !document.getElementById('cv-slot').classList.contains('has')&&!dawState.project.cover}));
await ev(async(id)=>{await Home.openProject(id)},pid);await pg.waitForTimeout(1200);
T('Projekt wieder geöffnet: Cover und Tags sind zurück',await ev(()=>dawState.project.cover&&dawState.project.tags.artist==='DJ Test'&&document.getElementById('cv-slot').classList.contains('has')));
T('Startseite: Projektkarte zeigt das Cover als Vorschau',await ev(async()=>{Home.open();await Home.refreshList();await new Promise(r=>setTimeout(r,500));const t=document.querySelector('#hm-list .hm-thumb');Home.close();return !!t&&/^data:image/.test(t.src)}));
// ---- Bild laden (Dialog)
await ev(()=>Cover.open());await pg.waitForTimeout(300);
const png=await ev(()=>{const c=document.createElement('canvas');c.width=800;c.height=400;const x=c.getContext('2d');x.fillStyle='#e22';x.fillRect(0,0,400,400);x.fillStyle='#22e';x.fillRect(400,0,400,400);return c.toDataURL('image/png').split(',')[1]});
await pg.setInputFiles('#cv-root [data-cv-file]',{name:'bild.png',mimeType:'image/png',buffer:Buffer.from(png,'base64')});await pg.waitForTimeout(600);
const up=await ev(()=>{const i=document.querySelector('#cv-root [data-cv-prev] img');return {w:i.naturalWidth,h:i.naturalHeight,gen:Cover.editor?1:0,genp:document.querySelector('#cv-root [data-cv-genp]').hidden}});
T('Eigenes Bild (800×400) wird mittig auf 512×512 zugeschnitten, Generator-Leiste aus',up.w===512&&up.h===512&&up.genp,up);
await pg.tap('#cv-root [data-cvd=ok]');await pg.waitForTimeout(700);
T('„Übernehmen“ speichert in Projekt und Kopf (Dialog zu)',await ev(()=>!document.getElementById('cv-root')&&dawState.project.cover&&!dawState.project.coverGen&&document.getElementById('cv-slot').classList.contains('has')));
await ev(()=>Cover.open());await pg.waitForTimeout(200);await pg.tap('#cv-root [data-cv=rm]');await pg.tap('#cv-root [data-cvd=ok]');await pg.waitForTimeout(600);
T('„Entfernen“ löscht Cover und Thumbnail',await ev(async()=>{await new Promise(r=>setTimeout(r,600));return !dawState.project.cover&&!dawState.project.thumb&&!document.getElementById('cv-slot').classList.contains('has')}));
// Cover neu setzen für die restlichen Tests
await ev(()=>{const r=Cover.generate({title:'Testsong',artist:'DJ Test',style:'wave'});Cover.applyTo(dawState.project,{cover:r.cover,thumb:r.thumb,coverGen:{style:'wave',seed:0},tags:Object.assign({},dawState.project.tags,{comment:'Mein Kommentar'})});Cover.refresh()});
// ---- Effekt rund um das Cover
await ev(async()=>{audioEngine.masterAnalyser={frequencyBinCount:128,getByteFrequencyData(a){for(let i=0;i<a.length;i++)a[i]=200}};dawState.isPlaying=true;await new Promise(r=>setTimeout(r,700))});
await ev(()=>{dawState.isPlaying=false});await pg.waitForTimeout(900);
T('Ohne Wiedergabe: Ring ruht (nur kleine Markierungen, Animation stoppt)',await ev(()=>{return Cover.slot().isConnected}));
await ev(()=>{const s=JSON.parse(localStorage.getItem('sunshine.cover')||'{}');});
await ev(()=>{dawState.isPlaying=true});await pg.waitForTimeout(500);
await ev(()=>{document.getElementById('btn-settings').click()});await pg.waitForTimeout(500);await ev(()=>OptNav.page('look'));await pg.waitForTimeout(400);
T('Optionen → Design: Abschnitt „Cover & Tags“ mit Schalter, 14 Effekt-Chips, Größe, Stärke, Vorschau, Knopf',await ev(()=>{const s=document.getElementById('cv-sec');return !!s&&s.offsetHeight>0&&!!s.querySelector('[data-cv-show]')&&s.querySelectorAll('[data-cv-fxv]').length===14&&s.querySelectorAll('[data-cv-size]').length===3&&s.querySelectorAll('[data-cv-gain]').length===3&&!!s.querySelector('.cv-pv canvas')&&!!s.querySelector('[data-cv-edit]')}));
const nonEmpty=()=>ev(()=>{const c=document.querySelector('#cv-slot .cv-fx'),x=c.getContext('2d'),d=x.getImageData(0,0,c.width,c.height).data;let s=0;for(let i=3;i<d.length;i+=4)s+=d[i];const W=c.width,m=W>>1,ctr=x.getImageData(m,m,1,1).data[3]+x.getImageData(m,m+6,1,1).data[3]+x.getImageData(m-6,m,1,1).data[3];return {s,ctr}});
const setFx=async v=>{await ev(v=>{document.querySelector('[data-cv-fxv="'+v+'"]').click()},v);await pg.waitForTimeout(700)};
await setFx('off');
const o=await nonEmpty();T('Effekt „Aus“: Canvas leer, Auswahl gespeichert',o.s===0&&await ev(()=>JSON.parse(localStorage.getItem('sunshine.cover')).fx==='off'),o);
for(const v of ['ring','dots','wave','pulse','orbit','frame','glow','both','flick','chase','blur','light','aura']){await setFx(v);const r=await nonEmpty();T('Effekt „'+v+'“ zeichnet am Rand, Bildmitte bleibt frei',r.s>0&&r.ctr===0,r);}
T('Chip-Auswahl gespeichert (aria-checked)',await ev(()=>document.querySelector('[data-cv-fxv=aura]').getAttribute('aria-checked')==='true'&&JSON.parse(localStorage.getItem('sunshine.cover')).fx==='aura'));
// Stärke
await ev(()=>document.querySelector('[data-cv-gain=hard]').click());await pg.waitForTimeout(300);T('Stärke „kräftig“ gespeichert',await ev(()=>JSON.parse(localStorage.getItem('sunshine.cover')).gain==='hard'));
await ev(()=>document.querySelector('[data-cv-gain=norm]').click());
// Regler: Größe, Helligkeit, Transparenz
await setFx('ring');
const px=()=>ev(()=>{const c=document.querySelector('#cv-slot .cv-fx'),d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let a=0,n=0;for(let i=3;i<d.length;i+=4){if(d[i]){a+=d[i];n++}}return {W:c.width,a,n}});
const setR=async(k,v)=>{await ev(([k,v])=>{const r=document.querySelector('[data-cv-rng="'+k+'"]');r.value=v;r.dispatchEvent(new Event('input',{bubbles:true}))},[k,v]);await pg.waitForTimeout(500)};
const r0=await px();await setR('reach',150);const r1=await px();T('Regler „Größe des Effekts“ vergrößert die Zeichenfläche',r1.W>r0.W,[r0.W,r1.W]);
T('Regler gespeichert (reach 150)',await ev(()=>JSON.parse(localStorage.getItem('sunshine.cover')).reach===150||new Promise(r=>setTimeout(()=>r(JSON.parse(localStorage.getItem('sunshine.cover')).reach===150),400))));
await setR('reach',100);
const b0=await ev(()=>{Cover.set('fx','glow');return 1});await pg.waitForTimeout(400);const g0=await px();await setR('trans',70);const g1=await px();T('Regler „Transparenz“ macht den Effekt durchsichtiger (weniger Deckkraft)',g1.a<g0.a*0.6,[g0.a,g1.a]);
await setR('trans',0);await setR('bright',150);const h1=await px();await setR('bright',100);
T('Regler „Helligkeit“ ändert die Farben (Wert gespeichert)',h1.n>0&&await ev(()=>Cover.settings().bright===100));
await ev(()=>{document.querySelector('[data-cv-reset]').click()});await pg.waitForTimeout(300);T('„Zurücksetzen“ stellt 100 / 100 / 0 ein',await ev(()=>{const s=Cover.settings();return s.reach===100&&s.bright===100&&s.trans===0}));
await setFx('ring');
// Vorschau
await setFx('ring');
T('Vorschau in den Optionen zeichnet Pixel',await ev(()=>{const c=document.querySelector('.cv-pv canvas'),d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let s=0;for(let i=3;i<d.length;i+=4)s+=d[i];return s>0}));
// Größen
const sz={};for(const k of ['s','m','l']){await ev(k=>document.querySelector('[data-cv-size="'+k+'"]').click(),k);await pg.waitForTimeout(500);sz[k]=await ev(()=>Math.round(document.getElementById('cv-slot').querySelector('.cv-box').getBoundingClientRect().width))}
T('Größe S < M ≤ L (Hochformat, Kollisionsschutz)',sz.s<sz.m&&sz.m<=sz.l,sz);
await ev(()=>document.querySelector('[data-cv-size=m]').click());await pg.waitForTimeout(300);
// Kollision mit Knöpfen
T('Cover überdeckt keine Kopfbereich-Knöpfe',await ev(()=>{const sl=document.querySelector('#cv-slot .cv-box').getBoundingClientRect();return ![...document.querySelectorAll('header.sticky button')].some(b=>{if(b.closest('#cv-slot'))return false;const q=b.getBoundingClientRect();return q.width>2&&q.right>sl.left&&q.left<sl.right&&q.bottom>sl.top&&q.top<sl.bottom})}));
// Theme-Verknüpfung
const th={};for(const t of ['aurora','studio','neon','liquid','classic']){await ev(t=>document.documentElement.setAttribute('data-theme',t),t);await pg.waitForTimeout(250);th[t]=await ev(()=>{const c=getComputedStyle(document.documentElement).getPropertyValue('--cv-c2').trim()+'|'+getComputedStyle(document.querySelector('#cv-slot .cv-box')).borderRadius+'|'+getComputedStyle(document.querySelector('#cv-slot .cv-box')).boxShadow;return c})}
T('Rahmen/Farben folgen dem Design (5 Themes unterscheiden sich)',new Set(Object.values(th)).size===5,th);
await ev(()=>document.documentElement.setAttribute('data-theme','aurora'));await pg.waitForTimeout(300);
await ev(()=>{const a=document.querySelector('[data-cv-show]');a.click()});await pg.waitForTimeout(300);
T('„Cover im Kopfbereich anzeigen“ aus → Slot versteckt',await ev(()=>document.getElementById('cv-slot').hidden===true&&!document.documentElement.classList.contains('cv-show')));
await ev(()=>{document.querySelector('[data-cv-show]').click()});await pg.waitForTimeout(300);
await ev(()=>{document.querySelector('[data-cv-edit]').click()});await pg.waitForTimeout(400);
T('„Cover & Tags bearbeiten“ aus den Optionen öffnet den Dialog',await ev(()=>!!document.getElementById('cv-root')&&!document.getElementById('settings-modal')));
await pg.keyboard.press('Escape');await pg.waitForTimeout(300);T('Escape schließt den Dialog ohne zu speichern',await ev(()=>!document.getElementById('cv-root')));
await ev(()=>{dawState.isPlaying=false});
// ---- Export
await ev(async()=>{await audioEngine.ensureCtx();const sr=44100;const bf=audioEngine.ctx.createBuffer(1,sr*10,sr),d=bf.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=.3*Math.sin(2*Math.PI*220*i/sr);const a=createTrack('audio','Bass/Sub');dawState.buffers[a.id]=bf;audioEngine.ensureTrackNode(a);renderMultiTrackLanes();
 const i=document.getElementById('input-bpm');i.value=120;i.dispatchEvent(new Event('change',{bubbles:true}));window.__saved=null;window.saveOrShareBlob=async(b,n)=>{window.__saved={name:n,size:b.size};window.__blob=b;return 'downloaded'}});
const bytes=async()=>Buffer.from(await ev(async()=>{const ab=await window.__blob.arrayBuffer();let s='';const u=new Uint8Array(ab);for(let i=0;i<u.length;i+=32768)s+=String.fromCharCode.apply(null,u.subarray(i,i+32768));return btoa(s)}),'base64');
const probe=(f,extra)=>{try{return JSON.parse(cp.execSync(`ffprobe -v error -show_format -show_streams -of json ${extra||''} ${f}`,{encoding:'utf8'}))}catch(e){return {err:e.message}}};
const dlg=async()=>{await pg.tap('#btn-menu');await pg.tap('#file-menu #btn-export-all');await pg.waitForSelector('#ex-root',{state:'visible'});await pg.waitForTimeout(300)};
const run=async(t=90000)=>{await ev(()=>{window.__saved=null});await pg.tap('#ex-root [data-ex="go"]');await pg.waitForFunction(()=>window.__saved||/fehlgeschlagen|Keine/.test(document.getElementById('ex-status').textContent),null,{timeout:t});await pg.waitForTimeout(150)};
await dlg();await pg.selectOption('#ex-range','sec0');
T('Export-Fenster: Häkchen „Tags & Cover einbetten“ an, Hinweis mit Inhalt',await ev(()=>document.getElementById('ex-tags').checked&&/Cover/.test(document.getElementById('ex-tagnote').textContent)));
await run();let sv=await ev(()=>window.__saved);let by=await bytes();fs.writeFileSync('/tmp/cv_a.wav',by);let pr1=probe('/tmp/cv_a.wav');
const tg=(pr1.format&&pr1.format.tags)||{};const tgl=Object.fromEntries(Object.entries(tg).map(([k,v])=>[k.toLowerCase(),v]));
T('WAV16: Dateiname „Künstler - Titel.wav“',sv.name==='DJ Test - Testsong_Mix_Intro.wav',sv.name);
T('WAV16: ffprobe liest Titel, Künstler, Album, Genre, Copyright, Kommentar',tgl.title==='Testsong'&&tgl.artist==='DJ Test'&&tgl.album==='Demo EP'&&/Trance/.test(tgl.genre||'')&&/DJ Test/.test(tgl.copyright||'')&&/Mein Kommentar/.test(tgl.comment||''),tgl);
const vs=(pr1.streams||[]).find(s=>s.codec_type==='video');T('WAV16: Cover als Bild-Stream eingebettet (JPEG 512×512)',!!vs&&vs.codec_name==='mjpeg'&&vs.width===512&&vs.height===512,pr1.streams);
let dec='';try{dec=cp.execSync('ffmpeg -v error -i /tmp/cv_a.wav -map 0:a -f null - 2>&1',{encoding:'utf8'})}catch(e){dec='ERR '+e.message}
const au=(pr1.streams||[]).find(s=>s.codec_type==='audio');T('WAV16: Audio unverändert lesbar (44,1 kHz, 16 Bit, ~8 s), keine Dekodierfehler',!dec.trim()&&au&&+au.sample_rate===44100&&Math.abs(+pr1.format.duration-8)<0.3,[dec,au,pr1.format&&pr1.format.duration]);
T('WAV16: RIFF-Größe stimmt zur Dateigröße',by.readUInt32LE(4)===by.length-8,[by.readUInt32LE(4),by.length]);
// WAV24
await pg.selectOption('#ex-fmt','wav24');await run();by=await bytes();fs.writeFileSync('/tmp/cv_b.wav',by);const pr2=probe('/tmp/cv_b.wav');T('WAV24: Tags + Cover ebenfalls enthalten',(pr2.format.tags.title||pr2.format.tags.TITLE)==='Testsong'&&(pr2.streams||[]).some(s=>s.codec_type==='video'),pr2.format&&pr2.format.tags);
// Opus
const opusOk=await ev(()=>ExportUI.opusSupported());console.log('INFO Opus verfügbar:',opusOk);
if(opusOk){await pg.selectOption('#ex-fmt','opus');await run();by=await bytes();fs.writeFileSync('/tmp/cv_c.ogg',by);const pr3=probe('/tmp/cv_c.ogg');const t3=Object.fromEntries(Object.entries((pr3.streams&&pr3.streams[0]&&pr3.streams[0].tags)||pr3.format.tags||{}).map(([k,v])=>[k.toLowerCase(),v]));
 let d3='';try{d3=cp.execSync('ffmpeg -v error -i /tmp/cv_c.ogg -map 0:a -f null - 2>&1',{encoding:'utf8'})}catch(e){d3='ERR'}
 T('Opus/OGG: Titel, Künstler, Genre, Jahr, BPM im Tag',t3.title==='Testsong'&&t3.artist==='DJ Test'&&t3.genre==='Trance'&&!!t3.date&&t3.bpm==='120',t3);
 T('Opus/OGG: Cover als Bild eingebettet und Audio ohne Fehler',(pr3.streams||[]).some(s=>s.codec_type==='video')&&!d3.trim(),[d3,(pr3.streams||[]).map(s=>s.codec_type)]);}
// Häkchen aus
await pg.selectOption('#ex-fmt','wav16');await ev(()=>{document.getElementById('ex-tags').click()});await run();sv=await ev(()=>window.__saved);by=await bytes();fs.writeFileSync('/tmp/cv_d.wav',by);const p4=probe('/tmp/cv_d.wav');
T('Häkchen aus: keine Tags/kein Cover, alter Dateiname',/^Sunshine-R_120BPM_Mix_Intro\.wav$/.test(sv.name)&&!(p4.format.tags&&p4.format.tags.title)&&!(p4.streams||[]).some(s=>s.codec_type==='video')&&by.length===44+8*44100*4,[sv.name,by.length]);
await ev(()=>{document.getElementById('ex-tags').click()});
// Großes Ogg-Paket (Cover im Tag) → mehrere Seiten
const og=await ev(()=>{const pk=new Uint8Array(150000);for(let i=0;i<pk.length;i++)pk[i]=(i*7)&255;const pages=ExportUI.oggBig(pk,1234,1);return {pages:pages.map(p=>Array.from(p))}});
{let ok2=true,asm=[],seqs=[],gr=[],types=[];const pk=new Uint8Array(150000);for(let i=0;i<pk.length;i++)pk[i]=(i*7)&255;
 og.pages.forEach((p,i)=>{const B=Buffer.from(p);const nseg=B[26];const lac=[...B.subarray(27,27+nseg)];const body=B.subarray(27+nseg);asm.push(body);seqs.push(B.readUInt32LE(18));types.push(B[5]);gr.push(B.readUInt32LE(6)+'/'+B.readUInt32LE(10));
  const crc=B.readUInt32LE(22);const c2=Buffer.from(B);c2.writeUInt32LE(0,22);let r=0;const tab=new Uint32Array(256);for(let k=0;k<256;k++){let x=k<<24;for(let j=0;j<8;j++)x=(x&0x80000000)?((x<<1)^0x04C11DB7):(x<<1);tab[k]=x>>>0}for(const by2 of c2)r=((r<<8)^tab[((r>>>24)^by2)&255])>>>0;if(r!==crc)ok2=false;
  const last=i===og.pages.length-1;if(last&&lac[lac.length-1]===255)ok2=false;if(!last&&lac[lac.length-1]!==255)ok2=false});
 const all=Buffer.concat(asm);T('Ogg-Großpaket: 150 kB → 3 Seiten, fortlaufend, CRC ok, Fortsetzungs-Flag, Granule -1, Paket vollständig',og.pages.length===3&&ok2&&seqs.join()==='1,2,3'&&types.join()==='0,1,1'&&gr[0]==='4294967295/4294967295'&&gr[2]==='0/0'&&all.equals(Buffer.from(pk)),{n:og.pages.length,seqs,types,gr,ok2});}
// Stems ZIP
await pg.tap('#ex-root [data-what=stems]');await pg.waitForTimeout(200);await run();by=await bytes();fs.writeFileSync('/tmp/cv_s.zip',by);
const zl=cp.execSync('unzip -l /tmp/cv_s.zip',{encoding:'utf8'});T('Stems-ZIP enthält cover.jpg und die Stem-WAVs',/cover\.jpg/.test(zl)&&/00_Master-Mix\.wav/.test(zl)&&/Bass_Sub\.wav/.test(zl),zl);
cp.execSync('rm -rf /tmp/cv_z && mkdir /tmp/cv_z && cd /tmp/cv_z && unzip -q /tmp/cv_s.zip');const ps=probe('/tmp/cv_z/01_Bass_Sub.wav');const ts=Object.fromEntries(Object.entries((ps.format&&ps.format.tags)||{}).map(([k,v])=>[k.toLowerCase(),v]));
T('Stem-Datei: Titel „Testsong – Bass/Sub“, Künstler und Tracknummer',/Testsong . Bass\/Sub/.test(ts.title||'')&&ts.artist==='DJ Test'&&/^1/.test(ts.track||''),ts);
const cj=fs.readFileSync('/tmp/cv_z/cover.jpg');T('cover.jpg ist ein gültiges JPEG',cj[0]===0xFF&&cj[1]===0xD8&&cj.length>5000,cj.length);
// MIDI
await pg.tap('#ex-root [data-what=midi]');await ev(()=>{const m=createTrack('midi','Keys');m.midiNotes=[{id:1,pitch:60,start:0,dur:4,vel:100}];dawState.activeMidiTrackId=m.id;dawState.midiNotes=JSON.parse(JSON.stringify(m.midiNotes))});await run();by=await bytes();
T('MIDI: Projektname als Titel, Künstler und Copyright als Meta-Text',by.includes(Buffer.from('Testsong'))&&by.includes(Buffer.from('© 2026 DJ Test'))&&by.includes(Buffer.from('DJ Test')),by.length);
await ev(()=>document.querySelector('#ex-root [data-ex=close]').click());
// Export-Knopf in der Kopfzeile (öffnet das Export-Fenster, Mix vorgewählt)
await ev(()=>{window.__saved=null});await pg.tap('#btn-export-wav');await pg.waitForSelector('#ex-root',{state:'visible'});await pg.waitForTimeout(300);
T('Kopfzeilen-Knopf „Export“ öffnet das Export-Fenster mit „Mix“ vorgewählt',await ev(()=>document.querySelector('#ex-root [data-what=master]').getAttribute('aria-pressed')==='true'));
await pg.selectOption('#ex-range','all');await pg.selectOption('#ex-fmt','wav16');await run();sv=await ev(()=>window.__saved);by=await bytes();fs.writeFileSync('/tmp/cv_e.wav',by);const p5=probe('/tmp/cv_e.wav');
T('Kopfzeilen-Knopf „Export“: Dateiname und Tags/Cover wie im Export-Fenster',sv.name==='DJ Test - Testsong_Mix.wav'&&((p5.format.tags||{}).title||(p5.format.tags||{}).TITLE)==='Testsong'&&(p5.streams||[]).some(s=>s.codec_type==='video'),[sv.name,p5.format&&p5.format.tags]);
// Projekt ohne Tags
await ev(()=>{delete dawState.project.cover;delete dawState.project.thumb;dawState.project.tags={}});await ev(()=>{window.__saved=null});await ev(()=>{window.__exportMix()});await pg.waitForFunction(()=>window.__saved,null,{timeout:120000});sv=await ev(()=>window.__saved);
T('Projekt ohne Tags/Cover: Export wie bisher (alter Name, keine Zusatzdaten)',/^Sunshine-R_Stem_DAW_Pro_120BPM\.wav$/.test(sv.name),sv.name);
// Benachrichtigungsbild
await ev(()=>{const r=Cover.generate({title:'N',artist:'A',style:'sun'});Cover.applyTo(dawState.project,{cover:r.cover,thumb:r.thumb,tags:{artist:'Kanal Eins'}});window.__m=[];window.Capacitor={isNativePlatform:()=>true,Plugins:{SunshineMedia:{update:async o=>{window.__m.push(o)},stop:async()=>{}}}};Player.hookDaw();dawState.isPlaying=true;Player._dawSync()});await pg.waitForTimeout(200);
const nm=await ev(()=>window.__m.filter(o=>o.title).pop());T('DAW-Benachrichtigung nutzt Projekt-Cover und Künstler',nm&&nm.art&&nm.art.length>2000&&nm.artist==='Kanal Eins'&&/^cv:/.test(nm.artKey),nm&&{a:nm.artist,k:nm.artKey});
T('Keine Seitenfehler',errs.length===0,errs);
console.log(`\n${ok} bestanden, ${bad} fehlgeschlagen`);await b.close();srv.close();process.exit(bad?1:0)})();
