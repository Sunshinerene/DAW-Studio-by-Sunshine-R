const http=require('http'),fs=require('fs'),path=require('path');const {chromium}=require('playwright');
const WORK=process.argv[2];
const srv=http.createServer((q,r)=>{const u=new URL(q.url,'http://x');const f=path.join(WORK,decodeURIComponent(u.pathname).replace(/^\//,''));fs.readFile(f,(e,d)=>{if(e){r.writeHead(404);r.end();return;}
 let body=d;if(/\.html$/.test(f)){let t=d.toString();if(u.searchParams.get('repo'))t=t.replace("repo:'__BUILD_REPO__'","repo:'o/r'").replace("n:'__BUILD_N__'","n:'7'");t=t.replace(/const MAIL = "[^"]*";/,u.searchParams.get('mail')?'const MAIL = "test@example.com";':'const MAIL = "";');body=t}
 r.writeHead(200,{'content-type':/\.html$/.test(f)?'text/html':/\.js$/.test(f)?'application/javascript':'application/octet-stream'});r.end(body)})});
let ok=0,bad=0;const T=(n,c,x)=>{if(c){ok++;console.log('PASS',n)}else{bad++;console.log('FAIL',n,x===undefined?'':JSON.stringify(x))}};
const cp=require('child_process');const FX='/tmp/fx128_t';fs.rmSync(FX,{recursive:true,force:true});fs.mkdirSync(FX+'/Album',{recursive:true});
['01 eins','02 zwei','03 drei'].forEach((n,i)=>cp.execSync(`ffmpeg -y -loglevel error -f lavfi -i "sine=frequency=${300+i*100}:duration=6" -c:a libmp3lame -metadata artist=Band_A -metadata album=Album_X -metadata title="${n.slice(3)}" "Album/${n}.mp3"`,{cwd:FX}));
const DISK={'content://tree/Music/doc/Album/01 eins.mp3':FX+'/Album/01 eins.mp3','content://tree/Music/doc/Album/02 zwei.mp3':FX+'/Album/02 zwei.mp3','content://tree/Music/doc/Album/03 drei.mp3':FX+'/Album/03 drei.mp3'};
const ST={perm:true,dialog:'ok',reads:[],lists:0};
(async()=>{await new Promise(r=>srv.listen(0,'127.0.0.1',r));const port=srv.address().port;const b=await chromium.launch();
const ctx=await b.newContext({viewport:{width:393,height:852},isMobile:true,hasTouch:true});const pg=await ctx.newPage();pg.__errs=[];pg.on('pageerror',e=>pg.__errs.push(e.message));
await pg.route(/^https?:\/\/(?!127\.0\.0\.1)/,r=>r.abort());
await pg.exposeFunction('__natPick',()=>ST.dialog==='cancel'?{cancelled:true}:ST.dialog==='old'?'UNIMPL':{cancelled:false,uri:'content://tree/Music',name:'Musik'});
await pg.exposeFunction('__natList',()=>{ST.lists++;if(!ST.perm)return null;return Object.keys(DISK).map(u=>({name:u.replace('content://tree/Music/doc/',''),uri:u,size:fs.statSync(DISK[u]).size}))});
await pg.exposeFunction('__natRead',(uri,off,len)=>{ST.reads.push([uri.split('/').pop(),off,len]);const fd=fs.openSync(DISK[uri],'r');const buf=Buffer.alloc(len);const n=fs.readSync(fd,buf,0,len,off);fs.closeSync(fd);return {b64:buf.subarray(0,n).toString('base64'),n}});
await pg.addInitScript(()=>{try{if(!sessionStorage.__i){sessionStorage.__i=1;localStorage.setItem('sunshine.home','off');localStorage.setItem('sunshine.news','{"seen":"1.30"}');localStorage.setItem('sunshine.player','{"bg":true,"vol":1}');}}catch(_){}
 window.__upd=[];window.__dirClick=0;
 window.Capacitor={isNativePlatform:()=>true,Plugins:{SunshineMedia:{
  update:async o=>{window.__upd.push(o)},stop:async()=>{},
  pickFolder:async()=>{const r=await window.__natPick();if(r==='UNIMPL'){const e=new Error('"SunshineMedia.pickFolder()" is not implemented on android');e.code='UNIMPLEMENTED';throw e}return r},
  listFolder:async o=>{const f=await window.__natList(o.uri);if(!f)throw new Error('Ordner nicht lesbar');return {files:f}},
  readChunk:async o=>window.__natRead(o.uri,o.offset,o.length)}}};});
await pg.goto(`http://127.0.0.1:${port}/index_ueberarbeitet.html`,{waitUntil:'load'});await pg.waitForTimeout(1200);
const ev=(f,a)=>pg.evaluate(f,a);
await ev(()=>Player.open());await pg.waitForTimeout(300);
// 1) Ordner-Dialog der App
const n1=await ev(()=>Player.pickFolder());await pg.waitForTimeout(1500);
const s1=await ev(()=>({n:Player.list().length,names:Player.list().map(t=>t.title),rec:Player.recents()}));
T('App: Ordner-Dialog lädt 3 Titel aus dem gewählten Ordner',n1===3&&s1.n===3,s1);
T('Ordner steht im Verlauf mit dauerhafter Freigabe (nat)',s1.rec.length===1&&s1.rec[0].name==='Musik'&&s1.rec[0].nat===true&&s1.rec[0].count===3,s1.rec);
await pg.waitForTimeout(1500);
const s2=await ev(()=>({t:Player.list().map(t=>[t.title,t.artist,t.album])}));
T('Tags werden nur aus dem Dateianfang gelesen (Titel, Künstler, Album)',s2.t.every(x=>x[1]==='Band_A'&&x[2]==='Album_X')&&s2.t.map(x=>x[0]).join()==='eins,zwei,drei',s2);
T('Beim Tag-Lesen wurde nur ab Offset 0 gelesen, begrenzt auf ≤ 3 MB',ST.reads.length>=3&&ST.reads.every(r=>r[1]===0&&r[2]<=3*1048576),ST.reads.slice(0,5));
// 2) Abspielen
await ev(()=>document.querySelectorAll('#pl-list .pl-row')[1].click());await pg.waitForTimeout(2000);
const s3=await ev(()=>({st:Player.state(),dur:Player.audio.duration}));
T('Titel 2 wird über die Brücke geladen und spielt',s3.st.playing&&s3.st.idx===1&&s3.dur>5&&s3.dur<7,s3);
const upd=await ev(()=>window.__upd[window.__upd.length-1]);
T('Benachrichtigung bekommt Titel, Dauer sowie Zurück/Weiter',upd&&upd.title==='zwei'&&upd.hasNext===true&&upd.hasPrev===true&&upd.duration>5&&upd.playing===true,upd&&{t:upd.title,d:upd.duration,n:upd.hasNext});
await ev(()=>Player.seek(3));await pg.waitForTimeout(700);await ev(()=>Player.pause());await pg.waitForTimeout(300);await ev(()=>Player._persistNow());await pg.waitForTimeout(300);
// 3) Neustart
await pg.reload({waitUntil:'load'});await pg.waitForTimeout(2200);
const s4=await ev(()=>({n:Player.list().length,off:Player.list().filter(t=>t.off).length,st:Player.state(),bar:!document.getElementById('pl-offbar')?null:document.getElementById('pl-offbar').hidden}));
T('Neustart: Ordner ist von selbst wieder verbunden (kein „Letzte Sitzung“-Hinweis)',s4.n===3&&s4.off===0,s4);
T('Neustart: letzter Titel (2) ist gewählt',s4.st.idx===1,s4);
await pg.waitForTimeout(500);
const pos=await ev(()=>Player.audio.currentTime);T('Neustart: Position wiederhergestellt (≈ 3 s)',pos>2&&pos<4,pos);
// 4) Freigabe verloren
ST.perm=false;await ev(()=>Player.clear&&0);
await ev(()=>Player._persistNow());await pg.reload({waitUntil:'load'});await pg.waitForTimeout(2000);await ev(()=>Player.open());await pg.waitForTimeout(300);
const s5=await ev(()=>({n:Player.list().length,off:Player.list().filter(t=>t.off).length,bar:document.getElementById('pl-offbar')&&!document.getElementById('pl-offbar').hidden}));
T('Freigabe verloren: Liste bleibt sichtbar, Hinweis zum erneuten Verbinden',s5.n===3&&s5.off===3&&s5.bar,s5);
ST.perm=true;await ev(()=>document.querySelector('[data-pl=relink]').click());await pg.waitForTimeout(2000);
const s6=await ev(()=>({off:Player.list().filter(t=>t.off).length,idx:Player.state().idx,n:Player.list().length}));
T('Ordner verbinden (Freigabe wieder da): ohne Dialog verbunden, Position wie zuvor',s6.off===0&&s6.idx===1&&s6.n===3,s6);
// 5) Abbrechen
ST.dialog='cancel';const nn=await ev(()=>Player.pickFolder());T('Dialog abgebrochen: nichts ändert sich',nn===0&&(await ev(()=>Player.list().length))===3);
// 6) Verlauf
ST.dialog='ok';await ev(()=>Player.clear());await pg.waitForTimeout(500);
await ev(()=>document.querySelector('[data-pl=recent]').click());await pg.waitForTimeout(300);
const rc=await ev(()=>document.querySelector('#pl-rc .pl-rrow small')&&document.querySelector('#pl-rc .pl-rrow small').textContent);
T('Verlauf: Ordner ohne „neu wählen“',rc&&/3 Titel/.test(rc)&&!/neu wählen/.test(rc),rc);
await ev(()=>document.querySelector('[data-rc]').click());await pg.waitForTimeout(2000);
T('Verlauf: Tipp öffnet den Ordner direkt ohne Dialog',await ev(()=>Player.list().length===3&&!Player.list()[0].off));
// 7) Ältere App ohne Ordner-Dialog
await ev(()=>{Player.clear();window.__dirClick=0;const i=document.getElementById('pl-dir');i.click=()=>{window.__dirClick++}});ST.dialog='old';
await ev(()=>Player.pickFolder());await pg.waitForTimeout(500);
T('Ältere App (Methode fehlt): Rückfall auf den Datei-Dialog',await ev(()=>window.__dirClick===1));
T('Keine JavaScript-Fehler',pg.__errs.length===0,pg.__errs);
console.log(`\n${ok} bestanden, ${bad} fehlgeschlagen`);await b.close();srv.close();process.exit(bad?1:0)})().catch(e=>{console.error(e);process.exit(2)});
