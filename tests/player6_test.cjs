// Player auf Android: direkter Weg (nativ kopiert, dann gestreamt), Rückfälle, Abbruch, Fortschritt, Ruhe des Hintergrund-Scans
const http=require('http'),fs=require('fs'),path=require('path'),cp=require('child_process');const {chromium}=require('playwright');
const WORK=process.argv[2];
const FX='/tmp/fx135_t';fs.rmSync(FX,{recursive:true,force:true});fs.mkdirSync(FX+'/Album',{recursive:true});
const mk=(n,sec,ex)=>cp.execSync(`ffmpeg -y -loglevel error -f lavfi -i "sine=frequency=${300+sec*7}:duration=${sec}" ${ex} "${n}"`,{cwd:FX+'/Album'});
mk('01 eins.mp3',6,'-c:a libmp3lame -metadata artist=Band_A -metadata title=eins');mk('02 zwei.mp3',6,'-c:a libmp3lame -metadata artist=Band_A -metadata title=zwei');
mk('03 gross.wav',90,'-ac 2');mk('04 vier.mp3',6,'-c:a libmp3lame -metadata title=vier');mk('05 fuenf.mp3',6,'-c:a libmp3lame -metadata title=fuenf');
const U=n=>'content://tree/Music/doc/Album/'+n;const NAMES=['01 eins.mp3','02 zwei.mp3','03 gross.wav','04 vier.mp3','05 fuenf.mp3'];
const DISK={};NAMES.forEach(n=>DISK[U(n)]=FX+'/Album/'+n);
let PORT=0;
const srv=http.createServer((q,r)=>{const u=new URL(q.url,'http://x');let f;
 if(u.pathname.startsWith('/_cf/'))f=decodeURIComponent(u.pathname.slice(5));else f=path.join(WORK,decodeURIComponent(u.pathname).replace(/^\//,''));
 fs.stat(f,(e,st)=>{if(e||!st.isFile()){r.writeHead(404);r.end();return}
  const ct=/\.html$/.test(f)?'text/html':/\.js$/.test(f)?'application/javascript':/\.mp3$/.test(f)?'audio/mpeg':/\.wav$/.test(f)?'audio/wav':'application/octet-stream';
  const rg=q.headers.range&&/bytes=(\d*)-(\d*)/.exec(q.headers.range);
  if(rg){const s=rg[1]?+rg[1]:0,en=rg[2]?Math.min(+rg[2],st.size-1):st.size-1;ST.ranges++;r.writeHead(206,{'content-type':ct,'accept-ranges':'bytes','content-range':`bytes ${s}-${en}/${st.size}`,'content-length':en-s+1});fs.createReadStream(f,{start:s,end:en}).pipe(r)}
  else{r.writeHead(200,{'content-type':ct,'accept-ranges':'bytes','content-length':st.size});fs.createReadStream(f).pipe(r)}})});
let ok=0,bad=0;const T=(n,c,x)=>{if(c){ok++;console.log('PASS',n)}else{bad++;console.log('FAIL',n,x===undefined?'':JSON.stringify(x))}};
const ST={cache:'ok',cacheCalls:[],reads:[],ranges:0,delay:0,t0:0};
(async()=>{await new Promise(r=>srv.listen(0,'127.0.0.1',r));PORT=srv.address().port;const b=await chromium.launch();
const ctx=await b.newContext({viewport:{width:393,height:852},isMobile:true,hasTouch:true});const pg=await ctx.newPage();const errs=[];pg.on('pageerror',e=>errs.push(e.message));
await pg.route(/^https?:\/\/(?!127\.0\.0\.1)/,r=>r.abort());
await pg.exposeFunction('__list',()=>NAMES.map(n=>({name:'Album/'+n,uri:U(n),size:fs.statSync(DISK[U(n)]).size})));
await pg.exposeFunction('__read',async(uri,off,len)=>{ST.reads.push([uri.split('/').pop(),off,len,Date.now()]);if(ST.delay)await new Promise(r=>setTimeout(r,ST.delay));const fd=fs.openSync(DISK[uri],'r');const buf=Buffer.alloc(len);const n=fs.readSync(fd,buf,0,len,off);fs.closeSync(fd);return {b64:buf.subarray(0,n).toString('base64'),n}});
await pg.exposeFunction('__cache',(uri,name,size)=>{ST.cacheCalls.push([name,size]);if(ST.cache==='fail')return {err:'Datei nicht kopierbar'};if(ST.cache==='unimpl')return {err:'"SunshineMedia.cacheFile()" is not implemented on android',code:'UNIMPLEMENTED'};if(ST.cache==='bad')return {path:'/gibt/es/nicht.mp3'};return {path:DISK[uri],size}});
await pg.addInitScript(p=>{try{if(!sessionStorage.__i){sessionStorage.__i=1;localStorage.setItem('sunshine.home','off');localStorage.setItem('sunshine.news','{"seen":"1.49"}');localStorage.setItem('sunshine.player','{"bg":true,"vol":1}')}}catch(_){}
 window.Capacitor={isNativePlatform:()=>true,convertFileSrc:f=>'http://127.0.0.1:'+p+'/_cf/'+encodeURIComponent(f.replace(/^file:\/\//,'')),Plugins:{SunshineMedia:{update:async()=>{},stop:async()=>{},
  pickFolder:async()=>({cancelled:false,uri:'content://tree/Music',name:'Musik'}),listFolder:async()=>({files:await window.__list()}),readChunk:async o=>window.__read(o.uri,o.offset,o.length),
  cacheFile:async o=>{const r=await window.__cache(o.uri,o.name,o.size);if(r.err){const e=new Error(r.err);if(r.code)e.code=r.code;throw e}return r}}}};},PORT);
await pg.goto(`http://127.0.0.1:${PORT}/index_ueberarbeitet.html`,{waitUntil:'load'});await pg.waitForTimeout(1000);
const ev=(f,a)=>pg.evaluate(f,a);const rows=()=>pg.evaluate(()=>[...document.querySelectorAll('#pl-list .pl-row')].length);
await ev(()=>Player.open());await pg.waitForTimeout(300);
await ev(()=>Player.pickFolder());await pg.waitForTimeout(2500);   // Liste da, Tags gelesen
T('Ordner mit 5 Titeln geladen',(await ev(()=>Player.list().length))===5);
// 1) direkter Weg
ST.reads.length=0;ST.cacheCalls.length=0;ST.ranges=0;
await ev(()=>document.querySelectorAll('#pl-list .pl-row')[2].click());await pg.waitForTimeout(2500);
const s1=await ev(()=>({st:Player.state(),src:Player.audio.src,dur:Player.audio.duration}));
T('Direkter Weg: großer Titel (WAV, 90 s) spielt über die Datei-URL, nicht über einen Blob',s1.st.playing&&s1.st.idx===2&&/^http:\/\/127\.0\.0\.1:\d+\/_cf\//.test(s1.src)&&s1.dur>85,s1);
T('Direkter Weg: die App wurde zum Kopieren aufgerufen (Name und Größe übergeben)',ST.cacheCalls.length===1&&ST.cacheCalls[0][0]==='Album/03 gross.wav'&&ST.cacheCalls[0][1]>15000000,ST.cacheCalls);
const big=ST.reads.filter(r=>r[0]==='03 gross.wav');
T('Direkter Weg: nichts wird in Stücken über die Brücke geladen (höchstens die ersten 3 MB für Tags)',big.every(r=>r[1]+r[2]<=3*1048576),big.slice(0,4));
await ev(()=>Player.seek(60));await pg.waitForTimeout(1200);
const p1=await ev(()=>Player.audio.currentTime);T('Direkter Weg: Spulen auf 60 s klappt sofort (Bereichsabfrage)',p1>59&&p1<64&&ST.ranges>0,{p1,r:ST.ranges});
// 2) Rückfall: Kopieren schlägt fehl
ST.cache='fail';ST.reads.length=0;ST.cacheCalls.length=0;
await ev(()=>document.querySelectorAll('#pl-list .pl-row')[0].click());await pg.waitForTimeout(2500);
const s2=await ev(()=>({st:Player.state(),src:Player.audio.src}));
T('Kopieren schlägt fehl → alter Weg: Titel spielt über Blob',s2.st.playing&&s2.st.idx===0&&/^blob:/.test(s2.src),s2);
// 3) nicht vorhanden (ältere App-Hülle): einmal versuchen, dann nie wieder
ST.cache='unimpl';ST.cacheCalls.length=0;
await ev(()=>document.querySelectorAll('#pl-list .pl-row')[1].click());await pg.waitForTimeout(2000);
await ev(()=>document.querySelectorAll('#pl-list .pl-row')[3].click());await pg.waitForTimeout(2000);
await ev(()=>document.querySelectorAll('#pl-list .pl-row')[4].click());await pg.waitForTimeout(2000);
T('Ältere App-Hülle (Methode fehlt): nur ein Versuch, danach wird der direkte Weg nicht mehr probiert',ST.cacheCalls.length===1&&(await ev(()=>Player.state().playing)),ST.cacheCalls);
// 4) Datei-URL liefert Fehler → einmaliger Rückfall auf den alten Weg
ST.cache='bad';await pg.reload({waitUntil:'load'});await pg.waitForTimeout(1500);await ev(()=>Player.open());await ev(()=>Player.pickFolder());await pg.waitForTimeout(3000);
ST.cacheCalls.length=0;
await ev(()=>document.querySelectorAll('#pl-list .pl-row')[3].click());await pg.waitForTimeout(3500);
const s4=await ev(()=>({st:Player.state(),src:Player.audio.src,bad:Player.list()[3].bad}));
T('Datei-URL nicht lesbar → Rückfall auf den alten Weg, Titel spielt trotzdem',s4.st.playing&&s4.st.idx===3&&/^blob:/.test(s4.src)&&!s4.bad,s4);
T('Rückfall nur einmal je Titel (kein Endlos-Laden)',ST.cacheCalls.length===1,ST.cacheCalls);
// 5) alter Weg: Fortschritt, Abbruch beim Wechsel, Ruhe des Hintergrund-Scans
await pg.reload({waitUntil:'load'});await pg.waitForTimeout(1500);ST.cache='fail';ST.delay=120;ST.reads.length=0;
await ev(()=>Player.open());await ev(()=>Player.pickFolder());await pg.waitForTimeout(400);
await ev(()=>document.querySelectorAll('#pl-list .pl-row')[2].click());   // großer Titel: 8 Stücke à 120 ms
await pg.waitForTimeout(500);
const sub=await ev(()=>document.getElementById('pl-sub').textContent);
T('Alter Weg: während des Ladens steht „Lädt … x %“ im Player',/^Lädt … \d+ %$/.test(sub),sub);
const tClick=Date.now();const rd0=ST.reads.filter(r=>r[0]==='03 gross.wav').length;
await ev(()=>document.querySelectorAll('#pl-list .pl-row')[0].click());await pg.waitForTimeout(2500);   // anderer Titel gewählt → Laden des großen bricht ab
const rdBig=ST.reads.filter(r=>r[0]==='03 gross.wav').length;
T('Wechsel während des Ladens: das große Laden bricht ab (weit weniger als alle 8 Stücke gelesen)',rdBig<8&&rdBig-rd0<=2,{rd0,rdBig});
T('Nach dem Wechsel spielt der gewählte Titel',(await ev(()=>Player.state())).idx===0&&(await ev(()=>Player.state().playing)));
// Scan ruht beim Laden: neue Sitzung, Klick sofort nach dem Hinzufügen
await pg.reload({waitUntil:'load'});await pg.waitForTimeout(1500);ST.reads.length=0;ST.delay=150;
await ev(()=>Player.open());await ev(()=>Player.pickFolder());await pg.waitForTimeout(250);
const tA=Date.now();await ev(()=>document.querySelectorAll('#pl-list .pl-row')[2].click());
await pg.waitForFunction(()=>Player.audio.src&&Player.audio.readyState>=2,null,{timeout:20000});const tB=Date.now();
const during=ST.reads.filter(r=>r[3]>tA+300&&r[3]<tB-300&&r[0]!=='03 gross.wav');
T('Beim Laden eines Titels ruht der Hintergrund-Scan (keine Lese-Aufrufe anderer Titel mitten im Laden)',during.length===0,during.slice(0,5));
T('Keine Seitenfehler',errs.length===0,errs.slice(0,3));
console.log(`\nplayer6_test: ${ok} ok, ${bad} fehlgeschlagen`);await b.close();srv.close();process.exit(bad?1:0)})().catch(e=>{console.log('FAIL Absturz',e.message);process.exit(2)});
