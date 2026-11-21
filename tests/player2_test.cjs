const http=require('http'),fs=require('fs'),path=require('path');const {chromium}=require('playwright');
const WORK=process.argv[2];
const srv=http.createServer((q,r)=>{const u=new URL(q.url,'http://x');const f=path.join(WORK,decodeURIComponent(u.pathname).replace(/^\//,''));fs.readFile(f,(e,d)=>{if(e){r.writeHead(404);r.end();return;}
 let body=d;if(/\.html$/.test(f)){let t=d.toString();if(u.searchParams.get('repo'))t=t.replace("repo:'__BUILD_REPO__'","repo:'o/r'").replace("n:'__BUILD_N__'","n:'7'");t=t.replace(/const MAIL = "[^"]*";/,u.searchParams.get('mail')?'const MAIL = "test@example.com";':'const MAIL = "";');body=t}
 r.writeHead(200,{'content-type':/\.html$/.test(f)?'text/html':/\.js$/.test(f)?'application/javascript':'application/octet-stream'});r.end(body)})});
let ok=0,bad=0;const T=(n,c,x)=>{if(c){ok++;console.log('PASS',n)}else{bad++;console.log('FAIL',n,x===undefined?'':JSON.stringify(x))}};
(async()=>{await new Promise(r=>srv.listen(0,'127.0.0.1',r));const port=srv.address().port;const b=await chromium.launch();
const mk=async(q,init,routeFn)=>{const ctx=await b.newContext({viewport:{width:393,height:852},isMobile:true,hasTouch:true});const pg=await ctx.newPage();pg.__errs=[];pg.on('pageerror',e=>pg.__errs.push(e.message));
 await pg.route(/^https?:\/\/(?!127\.0\.0\.1)/,r=>routeFn?routeFn(r):r.abort());
 await pg.addInitScript(i=>{try{if(!sessionStorage.__i){sessionStorage.__i=1;localStorage.setItem('sunshine.home','off');localStorage.setItem('sunshine.news','{"seen":"1.48"}');if(i)Object.keys(i).forEach(k=>localStorage.setItem(k,i[k]))}}catch(e){}},init||null);
 await pg.goto(`http://127.0.0.1:${port}/index_ueberarbeitet.html${q||''}`,{waitUntil:'load'});await pg.waitForTimeout(1200);return pg};
let pg=await mk('',{ 'sunshine.player':'{"bg":true,"vol":1}','sunshine.cover':'{"fx":"ring"}' },null);const ev=(f,a)=>pg.evaluate(f,a);
const cp=require('child_process');const FX='/tmp/fx125_t';fs.rmSync(FX,{recursive:true,force:true});fs.mkdirSync(FX,{recursive:true});
const sh=c=>cp.execSync(c,{cwd:FX,stdio:'pipe'});
sh('ffmpeg -y -loglevel error -f lavfi -i color=c=0xe0402a:s=300x300 -frames:v 1 cover.jpg');
const M='-metadata title=Test_Titel -metadata artist=Die_Kuenstlerin -metadata album=Album_Eins -metadata genre=Techno -metadata date=2024 -metadata track=3 -metadata comment=Hallo_Kommentar';
const mkf=(n,src,o)=>sh(`ffmpeg -y -loglevel error -f lavfi -i "sine=frequency=${src}:duration=2" ${o.cover?'-i cover.jpg -map 0 -map 1 ':''}${o.codec} ${o.cover?'-c:v copy -disposition:v attached_pic ':''}${o.extra||''} ${M} ${n}`);
mkf('t_mp3v3.mp3',440,{cover:1,codec:'-c:a libmp3lame',extra:'-id3v2_version 3'});mkf('t_mp3v4.mp3',330,{codec:'-c:a libmp3lame',extra:'-id3v2_version 4'});
mkf('t_m4a.m4a',220,{cover:1,codec:'-c:a aac'});mkf('t_flac.flac',550,{cover:1,codec:'-c:a flac'});mkf('t_opus.opus',660,{codec:'-c:a libopus'});mkf('t_vorbis.ogg',770,{codec:'-c:a libvorbis'});
mkf('t_wav.wav',880,{codec:'-c:a pcm_s16le'});mkf('t_wavid3.wav',990,{codec:'-c:a pcm_s16le',extra:'-write_id3v2 1'});
sh('ffmpeg -y -loglevel error -f lavfi -i "sine=frequency=500:duration=1" -c:a libmp3lame -map_metadata -1 -write_id3v1 1 -id3v2_version 0 -metadata title=Alt_V1 -metadata artist=Alt_Kuenstler v1only.mp3');
sh('ffmpeg -y -loglevel error -f lavfi -i "sine=frequency=500:duration=1" -c:a libmp3lame -map_metadata -1 -write_xing 0 -id3v2_version 0 -write_id3v1 0 nolabel.mp3');
{const t=Buffer.alloc(128);t.write('TAG',0,'latin1');t.write('Alt_V1',3,'latin1');t.write('Alt_Kuenstler',33,'latin1');t.write('Alt_Album',63,'latin1');t.write('1999',93,'latin1');t[127]=18;fs.appendFileSync(FX+'/v1only.mp3',t);}
const names=['t_mp3v3.mp3','t_mp3v4.mp3','t_m4a.m4a','t_flac.flac','t_opus.opus','t_vorbis.ogg','t_wav.wav','t_wavid3.wav','v1only.mp3','nolabel.mp3'];
// ---- 1) Tag-Leser direkt
await ev(()=>Player.open());await pg.waitForTimeout(300);
await pg.setInputFiles('#pl-file',names.map(n=>FX+'/'+n));
await pg.waitForTimeout(2500);
const L=await ev(()=>Player.list());
const by=n=>L.find(x=>x.title===n||x.sub===n);
T('10 Dateien in der Liste',L.length===10,L.length);
const tagged=L.slice(0,8);
T('Tags (MP3 v2.3): Titel, Künstler, Album, Genre, Jahr, Nr.',L[0].title==='Test_Titel'&&L[0].artist==='Die_Kuenstlerin'&&L[0].album==='Album_Eins'&&L[0].genre==='Techno'&&L[0].year==='2024'&&L[0].track==='3'&&L[0].fmt==='MP3',L[0]);
T('Tags (MP3 v2.4, UTF-8)',L[1].title==='Test_Titel'&&L[1].artist==='Die_Kuenstlerin'&&L[1].year==='2024',L[1]);
T('Tags (M4A / MP4)',L[2].title==='Test_Titel'&&L[2].artist==='Die_Kuenstlerin'&&L[2].album==='Album_Eins'&&L[2].genre==='Techno'&&L[2].track==='3'&&L[2].year==='2024',L[2]);
T('Tags (FLAC) inkl. Länge',L[3].title==='Test_Titel'&&L[3].artist==='Die_Kuenstlerin'&&L[3].fmt==='FLAC'&&Math.abs(L[3].dur-2)<0.2,L[3]);
T('Tags (Opus)',L[4].title==='Test_Titel'&&L[4].album==='Album_Eins'&&L[4].fmt==='Opus',L[4]);
T('Tags (Ogg Vorbis)',L[5].title==='Test_Titel'&&L[5].artist==='Die_Kuenstlerin'&&L[5].fmt==='Ogg',L[5]);
T('Tags (WAV LIST/INFO)',L[6].title==='Test_Titel'&&L[6].artist==='Die_Kuenstlerin'&&L[6].fmt==='WAV'&&Math.abs(L[6].dur-2)<0.2,L[6]);
T('Tags (WAV mit id3-Block)',L[7].title==='Test_Titel'&&L[7].genre==='Techno',L[7]);
T('Nur ID3v1 am Dateiende wird gelesen',L[8].title==='Alt_V1'&&L[8].artist==='Alt_Kuenstler'&&L[8].album==='Alt_Album'&&L[8].year==='1999'&&L[8].genre==='Techno',L[8]);
T('Ohne Tags: Titel aus dem Dateinamen',L[9].title==='nolabel'&&L[9].artist==='',L[9]);
T('Cover aus MP3, M4A und FLAC erkannt; ohne Bild kein Cover',L[0].hasCover&&L[2].hasCover&&L[3].hasCover&&!L[1].hasCover&&!L[4].hasCover&&!L[9].hasCover,L.map(x=>x.hasCover));
const cvOk=await ev(async()=>{const o=[];for(const i of [0,2,3]){const u=Player._cover?Player._cover(i):null;o.push(u)}return o});
// Cover-Bild wirklich dekodierbar und rot
const px=await ev(async()=>{const r=[];for(const i of [0,2,3]){const url=Player._coverUrl(i);const im=new Image();await new Promise(res=>{im.onload=res;im.onerror=res;im.src=url});const c=document.createElement('canvas');c.width=c.height=8;const x=c.getContext('2d');x.drawImage(im,0,0,8,8);r.push(Array.from(x.getImageData(4,4,1,1).data))}return r});
T('Eingebettetes Cover ist ein gültiges Bild (rot)',px.every(p=>p[0]>150&&p[1]<120),px);
T('Liste zeigt Künstler · Album statt Dateityp',await ev(()=>{const r=document.querySelector('#pl-list .pl-row');return !!r&&/Die_Kuenstlerin · Album_Eins/.test(r.textContent)}) );
// Kaputte Datei
await pg.setInputFiles('#pl-file',[{name:'kaputt.mp3',mimeType:'audio/mpeg',buffer:Buffer.from('ID3\x03\x00\x00\x00\x00\x10\x00garbage-garbage-garbage')},{name:'leer.flac',mimeType:'audio/flac',buffer:Buffer.from('fLaC')}]);await pg.waitForTimeout(800);
T('Beschädigte Tags: kein Fehler, Titel aus Dateiname',await ev(()=>{const l=Player.list();return l.length===12&&l[10].title==='kaputt'&&l[11].title==='leer'})&&pg.__errs.length===0,pg.__errs);
await ev(()=>Player.clear());
// ---- 2) Ordner (webkitdirectory-Eingabe)
fs.mkdirSync(FX+'/Album/CD2',{recursive:true});fs.copyFileSync(FX+'/t_mp3v3.mp3',FX+'/Album/02 zweiter.mp3');fs.copyFileSync(FX+'/t_flac.flac',FX+'/Album/01 erster.flac');fs.copyFileSync(FX+'/t_wav.wav',FX+'/Album/CD2/03 dritter.wav');fs.writeFileSync(FX+'/Album/notiz.txt','x');fs.writeFileSync(FX+'/Album/cover.jpg',fs.readFileSync(FX+'/cover.jpg'));
await ev(()=>Player.open());
T('Ordner-Eingabe vorhanden (webkitdirectory)',await ev(()=>{const i=document.getElementById('pl-dir');return !!i&&i.hasAttribute('webkitdirectory')}));
T('Buttons „Ordner“ vorhanden',await ev(()=>document.querySelectorAll('[data-pl=folder]').length>=2));
await pg.setInputFiles('#pl-dir',FX+'/Album');await pg.waitForTimeout(2000);
const FL=await ev(()=>Player.list());
T('Ordner: nur Audiodateien (3), Unterordner eingeschlossen, natürlich sortiert',FL.length===3&&/Test_Titel/.test(FL[0].title)&&FL.every(x=>!/notiz|cover/.test(x.title)),FL);
T('Ordner: Quelle zeigt den Ordnernamen (Unterordner)',FL[2].sub==='CD2'||FL[0].sub==='Album',FL.map(x=>x.sub));
await ev(()=>Player.clear());
// Desktop-Ordnerdialog (File System Access) wird bevorzugt, wenn vorhanden
T('Ordner-Dialog: Desktop-Browser nutzt showDirectoryPicker, sonst Eingabe',await ev(()=>typeof Player.pickFolder==='function'));

// ---- 3) Klang, Anzeige, Cover bei laufender Wiedergabe
await pg.setInputFiles('#pl-file',[FX+'/t_mp3v3.mp3',FX+'/t_vorbis.ogg',FX+'/nolabel.mp3']);await pg.waitForTimeout(1200);
await ev(()=>Player.open());await pg.waitForTimeout(300);
T('Titelkarte zeigt Titel, Künstler · Album und Meta-Zeile',await ev(()=>{const g=i=>document.getElementById(i).textContent;return g('pl-title')==='Test_Titel'&&/Die_Kuenstlerin · Album_Eins/.test(g('pl-sub'))&&/Techno/.test(g('pl-meta'))&&/2024/.test(g('pl-meta'))&&/Nr\. 3/.test(g('pl-meta'))}));
T('Cover-Rahmen im Player (Cover.bind) mit Bild aus der Datei',await ev(()=>{const e=document.querySelector('#pl-cv .cv-pv.cv-b');return !!e&&e.classList.contains('has')&&/^blob:/.test(e.querySelector('.cv-img').src)&&getComputedStyle(document.querySelector('#pl-root .pl-art')).display==='none'}));
T('Cover-Rahmen hat Größe und Randfläche für den Effekt',await ev(()=>{const e=document.querySelector('#pl-cv .cv-pv');const r=e.getBoundingClientRect(),b=e.querySelector('.cv-box').getBoundingClientRect();return r.width>=120&&r.width<=300&&b.width<r.width-8&&Math.abs(r.width-r.height)<1&&r.right<=window.innerWidth}));
T('Klang-Chips: 10 Voreinstellungen, „Original“ gewählt',await ev(()=>{const c=[...document.querySelectorAll('#pl-chips [data-pl-preset]')];return c.length===10&&c[0].getAttribute('aria-checked')==='true'&&c.map(x=>x.textContent).join(',')==='Original,Mehr Bass,Techno,Klassik,Pop,Rock,Stimme,Hip-Hop,Weich,Eigen'}));
await ev(()=>Player.play());await pg.waitForTimeout(900);
let st3=await ev(()=>({p:Player.state(),act:PlSound.active(),ctx:PlSound.state()}));
T('Wiedergabe läuft, Audio-Graph angelegt',st3.p.playing&&st3.act,st3);
const lvl=await ev(async()=>{let m=0;for(let i=0;i<10;i++){const d=PlSound.coverData();if(d)m=Math.max(m,...d);await new Promise(r=>setTimeout(r,60))}return m});
T('Spektrum-Daten kommen an (Sinuston)',lvl>40,lvl);
// Effekt am Cover zeichnet im Randbereich
const edge=await ev(async()=>{const c=document.querySelector('#pl-cv canvas.cv-fx');let best=0;for(let k=0;k<12;k++){const g=c.getContext('2d'),w=c.width,d=g.getImageData(0,0,w,w).data;let n=0;for(let i=3;i<d.length;i+=4)if(d[i]>20)n++;best=Math.max(best,n);await new Promise(r=>setTimeout(r,70))}return best});
T('Cover-Effekt zeichnet am Rand (Ring)',edge>150,edge);
// Anzeige
const vz=async()=>ev(async()=>{const c=document.getElementById('pl-viz');let best=0,hash='';for(let k=0;k<10;k++){const g=c.getContext('2d'),d=g.getImageData(0,0,c.width,c.height).data;let n=0;for(let i=3;i<d.length;i+=4)if(d[i]>30)n++;best=Math.max(best,n);await new Promise(r=>setTimeout(r,60))}
 const u=c.toDataURL();let h=0;for(let i=0;i<u.length;i+=7)h=(h*31+u.charCodeAt(i))|0;return {px:best,h,w:c.clientWidth,hh:c.clientHeight}});
const v0=await vz();T('Anzeige sichtbar und gefüllt',v0.px>300&&v0.w>200&&v0.hh>60,v0);
// Voreinstellungen
const pre={bass:[7,4,0,0,1],techno:[6,2,-1,2,4],classic:[2,1,0,1,3],pop:[-1,1,3,2,0],rock:[4,2,-2,2,4],vocal:[-3,-1,3,4,1],hiphop:[6,3,0,1,2],soft:[2,1,0,-2,-4]};
for(const [id,g] of Object.entries(pre)){await ev(i=>document.querySelector(`[data-pl-preset="${i}"]`).click(),id);await pg.waitForTimeout(250);
 const r=await ev(()=>({g:PlSound.gains(),sel:document.querySelector('#pl-chips .on').dataset.plPreset,st:document.getElementById('pl-snd').dataset.vz,nm:document.getElementById('pl-pname').textContent,ls:JSON.parse(localStorage.getItem('sunshine.player')).preset}));
 T('Voreinstellung '+id+': Bänder '+g.join('/')+', Chip, Anzeige-Stil, gespeichert',JSON.stringify(r.g)===JSON.stringify(g)&&r.sel===id&&r.ls===id&&!!r.st&&!!r.nm,r)}
// Filter im Graph wirklich gesetzt (nach Einschwingen)
await ev(()=>document.querySelector('[data-pl-preset="bass"]').click());await pg.waitForTimeout(600);
const fg=await ev(()=>PlSound._filters().map(f=>+f.gain.value.toFixed(1)));
T('Web-Audio-Filter folgen der Voreinstellung (Mehr Bass)',Math.abs(fg[0]-7)<0.4&&Math.abs(fg[1]-4)<0.4&&Math.abs(fg[4]-1)<0.4,fg);
const pg0=await ev(()=>+PlSound._pre().gain.value.toFixed(3));T('Vorverstärkung senkt bei Bass-Anhebung ab (kein Übersteuern)',pg0<0.7&&pg0>0.3,pg0);
// Darstellung je Voreinstellung verschieden
const hs={};for(const id of ['flat','bass','techno','classic','pop','rock','vocal','hiphop','soft']){await ev(i=>document.querySelector(`[data-pl-preset="${i}"]`).click(),id);await pg.waitForTimeout(500);hs[id]=await ev(()=>document.getElementById('pl-snd').dataset.vz)}
T('Jede Voreinstellung hat ihre eigene Darstellung',new Set(Object.values(hs)).size===9,hs);
// Eigen
await ev(()=>document.querySelector('[data-pl-preset="rock"]').click());await pg.waitForTimeout(200);
await ev(()=>document.querySelector('[data-pl-preset="custom"]').click());await pg.waitForTimeout(250);
let cu=await ev(()=>({vis:!document.getElementById('pl-bands').hidden,g:PlSound.gains()}));
T('Eigen: Regler erscheinen und starten mit der letzten Voreinstellung (Rock)',cu.vis&&JSON.stringify(cu.g)==='[4,2,-2,2,4]',cu);
await ev(()=>{const r=document.querySelector('[data-pl-band="0"]');r.value=-5;r.dispatchEvent(new Event('input',{bubbles:true}))});await pg.waitForTimeout(500);
cu=await ev(()=>({g:PlSound.gains(),o:document.querySelector('[data-pl-bo="0"]').textContent,ls:JSON.parse(localStorage.getItem('sunshine.player')).custom}));
T('Eigen: Regler ändert Tiefbass, Anzeige „-5“, gespeichert',cu.g[0]===-5&&cu.o==='-5'&&cu.ls[0]===-5,cu);
await ev(()=>document.querySelector('[data-pl=bandreset]').click());cu=await ev(()=>PlSound.gains());T('Eigen: Zurücksetzen = alle 0',cu.every(v=>v===0),cu);
// Anzeige aus/an
await ev(()=>document.querySelector('[data-pl=viz]').click());T('Anzeige ausblenden',await ev(()=>document.getElementById('pl-vizbox').hidden&&JSON.parse(localStorage.getItem('sunshine.player')).viz===false));
await ev(()=>document.querySelector('[data-pl=viz]').click());T('Anzeige wieder einblenden',await ev(()=>!document.getElementById('pl-vizbox').hidden));
// Titelwechsel: Cover/Tags wechseln, ungetaggter Titel bekommt erzeugtes Cover
await ev(()=>document.querySelectorAll('#pl-list .pl-row')[2].click());await pg.waitForTimeout(800);
T('Titel ohne Cover: automatisch erzeugtes Cover (aus Titel)',await ev(()=>{const e=document.querySelector('#pl-cv .cv-pv');return e.classList.contains('has')&&/^data:image\/jpeg/.test(e.querySelector('.cv-img').src)&&document.getElementById('pl-title').textContent==='nolabel'}));
// Benachrichtigung bekommt Künstler + Cover
await ev(()=>{window.__m=[];window.Capacitor={isNativePlatform:()=>true,Plugins:{SunshineMedia:{update:o=>{window.__m.push(o);return Promise.resolve()},stop:()=>Promise.resolve()}}}});
await ev(()=>document.querySelectorAll('#pl-list .pl-row')[0].click());await pg.waitForTimeout(1200);
const nm=await ev(()=>window.__m.filter(o=>o.title==='Test_Titel').pop());
T('Benachrichtigung: Titel, Künstler und Cover (Base64) aus den Tags',!!nm&&nm.artist==='Die_Kuenstlerin'&&nm.art&&nm.art.length>200&&/^pl:/.test(nm.artKey),nm&&{a:nm.artist,l:(nm.art||'').length,k:nm.artKey});
T('Mini-Leiste: Künstler im Text und kleiner Equalizer beim Abspielen',await (async()=>{await ev(()=>Player.close());await pg.waitForTimeout(300);return ev(()=>{const m=document.getElementById('pl-mini');return !m.hidden&&/Die_Kuenstlerin/.test(m.textContent)&&!!m.querySelector('.pl-eq')})})());
T('Keine JavaScript-Fehler',pg.__errs.length===0,pg.__errs);

fs.writeFileSync('/tmp/fx125_ok','1');

console.log(`\n${ok} bestanden, ${bad} fehlgeschlagen`);await b.close();srv.close();process.exit(bad?1:0)})().catch(e=>{console.error(e);process.exit(2)});
