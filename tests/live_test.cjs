const http=require('http'),fs=require('fs'),path=require('path'),crypto=require('crypto');const {chromium}=require('playwright');
const WORK=process.argv[2];const SHOT=path.join(__dirname,'../dist/_shots');
const base=fs.readFileSync(path.join(WORK,'index_ueberarbeitet.html'),'utf8');
const SW=fs.readFileSync(path.join(__dirname,'../src/android/sw.js'),'utf8');
const NAT='abcdef123456';
const fill=(t,n)=>t.split('__BUILD_N__').join(String(n)).split('__BUILD_REPO__').join('foo/bar').split('__BUILD_TIME__').join('2026-11-18').split('__BUILD_NATIVE__').join(NAT);
const ver=(t,v,extra)=>{let x=t.replace("v:'1.49'","v:'"+v+"'");if(extra)x=x.replace('</head>',extra+'</head>');return x};
let S={build:fill(base,5),buildN:5,live:ver(base,'9.15','<script>window.__liveMark=1</script>'),nat:NAT};
const sha=t=>crypto.createHash('sha256').update(t).digest('hex');
let rawHits=0,rawOverride=null;
const srv=http.createServer((q,r)=>{const u=decodeURIComponent(q.url.split('?')[0]);
 if(u==='/'||u==='/index.html'){r.writeHead(200,{'content-type':'text/html'});return r.end(S.build)}
 if(u==='/sw.js'){r.writeHead(200,{'content-type':'text/javascript'});return r.end(SW)}
 if(u==='/build.json'){r.writeHead(200,{'content-type':'application/json'});return r.end(JSON.stringify({n:String(S.buildN),nat:S.nat,repo:'foo/bar'}))}
 const f=path.join(WORK,u.replace(/^\//,''));fs.readFile(f,(e,d)=>{if(e){r.writeHead(404);r.end();return}r.writeHead(200,{'content-type':f.endsWith('.js')?'text/javascript':f.endsWith('.css')?'text/css':'application/octet-stream'});r.end(d)})});
let ok=0,bad=0;const T=(n,c,x)=>{if(c){ok++;console.log('PASS',n)}else{bad++;console.log('FAIL',n,x===undefined?'':JSON.stringify(x))}};
const REL=(liveHtml,over)=>JSON.stringify({tag_name:'build-9',name:'Build 9',published_at:'2026-11-19T10:00:00Z',body:'- Neu: Testpunkt A\n- Neu: Testpunkt B\n<!-- sunshine:'+JSON.stringify(Object.assign({v:'9.15',sha:'deadbeef',path:'www/index.html',h:sha(liveHtml),nat:NAT},over||{}))+' -->',html_url:'https://github.com/foo/bar/releases/tag/build-9',assets:[{name:'Sunshine-R-DAW-v9.apk',browser_download_url:'https://github.com/foo/bar/releases/download/build-9/Sunshine-R-DAW-v9.apk',size:50000000}]});
(async()=>{await new Promise(r=>srv.listen(0,'127.0.0.1',r));const port=srv.address().port,URL0=`http://127.0.0.1:${port}/index.html`;const b=await chromium.launch();
const ctx=await b.newContext({viewport:{width:393,height:852},isMobile:true,hasTouch:true});
const pg=await ctx.newPage();const errs=[];pg.on('pageerror',e=>errs.push(e.message));
let relBody=REL(S.live);
await pg.route(/^https?:\/\/(?!127\.0\.0\.1)/,r=>r.abort());
await pg.route('https://api.github.com/**',r=>r.fulfill({status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:relBody}));
await pg.route('https://raw.githubusercontent.com/**',r=>{rawHits++;r.fulfill({status:200,contentType:'text/plain',headers:{'access-control-allow-origin':'*'},body:rawOverride!==null?rawOverride:S.live})});
await pg.addInitScript(()=>{try{if(!sessionStorage.__init){sessionStorage.__init=1;localStorage.setItem('sunshine.home','off');localStorage.setItem('sunshine.news',JSON.stringify({seen:'1.49'}))}}catch(e){}});
const ev=(f,a)=>pg.evaluate(f,a);
const load=async()=>{await pg.goto(URL0,{waitUntil:'load'});await pg.waitForTimeout(3500)};
await load();
// ---- 1 Grundzustand
T('Gebaute Version: Build 5, Version 1.49, Hülle gesetzt',await ev(()=>Update.build()===5&&SUNSHINE_BUILD.v==='1.49'&&SUNSHINE_BUILD.nat==='abcdef123456'));
T('Live-Updates möglich (Service Worker unterstützt)',await ev(()=>Live.supported()),await ev(()=>Live.why()));
T('Service Worker registriert',await ev(async()=>!!(await navigator.serviceWorker.getRegistration())));
// ---- 2 Release prüfen
const c1=await ev(()=>Update.check());
T('Release-Text: Notizen ohne Marker, Live-Paket erkannt',c1.ok&&/Testpunkt A/.test(c1.latest.notes)&&!/sunshine:/.test(c1.latest.notes)&&c1.latest.live&&c1.latest.live.v==='9.15',c1);
T('Angebot: Live-Oberfläche 1.49 (Hülle gleich)',await ev(()=>Live.offer(Update.check&&Update._state().latest).kind==='live'));
await ev(()=>{Home.open()});await pg.waitForTimeout(500);
T('Startseite: Karte „Neue Oberfläche 1.49 bereit“ mit Notiz',await ev(()=>{const e=document.querySelector('#hm-update [data-card="live"]');return !!e&&/9\.15/.test(e.textContent)&&/Testpunkt A/.test(e.textContent)}));
await pg.screenshot({path:path.join(SHOT,'lv_home.png')});
// ---- 3 Laden
await ev(()=>document.querySelector('#hm-update [data-up="live"]').click());await pg.waitForTimeout(1200);
T('Download: Cache enthält Seite + Meta (pending), Tokens ersetzt',await ev(async()=>{const m=await Live._readMeta();const c=await caches.open('sunshine-live');const p=await c.match('/__live/page');const t=p?await p.text():'';return !!m&&m.status==='pending'&&m.v==='9.15'&&/n:'5'/.test(t)&&!/__BUILD_N__/.test(t)&&/nat:'abcdef123456'/.test(t)}));
T('Karte wechselt zu „geladen – Neu starten“',await ev(()=>{const e=document.querySelector('#hm-update [data-card="ready"]');return !!e&&/9\.15/.test(e.textContent)}));
await pg.screenshot({path:path.join(SHOT,'lv_ready.png')});
// ---- 4 Neustart → Live-Seite
await load();
T('Nach Neustart läuft die Live-Oberfläche (Version 1.49, Marker)',await ev(()=>SUNSHINE_BUILD.v==='9.15'&&window.__liveMark===1&&Update.build()===5),await ev(()=>SUNSHINE_BUILD.v));
T('Start bestätigt: Meta „ok“',await ev(async()=>(await Live._readMeta()).status==='ok'));
T('Optionen zeigen „Live“',await (async()=>{await ev(()=>document.getElementById('btn-menu').click());await pg.waitForTimeout(150);await ev(()=>document.getElementById('btn-settings').click());await pg.waitForTimeout(500);return ev(()=>/Live \(/.test(document.querySelector('[data-lv-ver]').textContent))})());
await pg.screenshot({path:path.join(SHOT,'lv_opt.png')});
T('Gleiche Version wird nicht erneut angeboten',await ev(async()=>{const r=await Update.check();return Live.offer(r.latest).kind==='none'}));
// ---- 5 Zurücksetzen
await ev(()=>document.querySelector('[data-lv-reset]').click());await pg.waitForTimeout(3500);
T('„Zurücksetzen“ → eingebaute Version 1.49, Cache leer',await ev(async()=>SUNSHINE_BUILD.v==='1.49'&&!(await Live._readMeta())&&!window.__liveMark));
// ---- 6 APK-Update ändert Hülle → Live-Kopie verworfen
await ev(async()=>{await Update.check();await Live.download(Update._state().latest,{})});
S.buildN=6;S.build=fill(base,6);await load();
T('Neue APK (Build 6): eingebaute Seite, Live-Kopie gelöscht',await ev(async()=>Update.build()===6&&SUNSHINE_BUILD.v==='1.49'&&!window.__liveMark&&!(await Live._readMeta())));
S.buildN=5;S.build=fill(base,5);await load();
// ---- 7 Prüfsumme falsch
rawOverride=S.live+'\n<!-- manipuliert -->';
const e1=await ev(async()=>{try{await Update.check();await Live.download(Update._state().latest,{});return 'ok'}catch(e){return e.message}});
T('Falsche Prüfsumme → verworfen, nichts gespeichert',/Prüfsumme/.test(e1)&&!(await ev(()=>Live._readMeta())),e1);
rawOverride=null;
// ---- 8 Fremde Hülle → APK nötig
relBody=REL(S.live,{nat:'999999999999'});
T('Andere App-Hülle → kein Live-Update, APK nötig',await ev(async()=>{const r=await Update.check();const o=Live.offer(r.latest);return o.kind==='apk'}));
relBody=REL(S.live);
// ---- 9 Defekte Oberfläche → Rückfall
const broken=ver(base,'9.16','').replace('id="btn-menu"','id="btn-menux"');
rawOverride=broken;relBody=REL(broken,{v:'9.16'});
await ev(async()=>{const r=await Update.check();await Live.download(r.latest,{})});
await load();await pg.waitForTimeout(1500);
T('Defekte Live-Oberfläche → automatischer Rückfall auf eingebaute Version',await ev(async()=>SUNSHINE_BUILD.v==='1.49'&&(await Live._readMeta()).status==='bad'&&Live._state().bad.v==='9.16'),await ev(async()=>[SUNSHINE_BUILD.v,(await Live._readMeta())]));
T('Defekte Version wird nicht erneut angeboten',await ev(async()=>{const r=await Update.check();return Live.offer(r.latest).kind==='none'}));
// ---- 10 Startversuche-Grenze im Service Worker
await ev(()=>Live.reset({reload:false}));
rawOverride=null;relBody=REL(S.live);
await ev(async()=>{const r=await Update.check();await Live.download(r.latest,{});const m=await Live._readMeta();m.boots=2;await Live._writeMeta(m)});
await pg.goto(URL0,{waitUntil:'load'});await pg.waitForTimeout(800);
T('3. unbestätigter Start → Service Worker liefert eingebaute Seite und sperrt',await ev(async()=>{const m=await Live._readMeta();return SUNSHINE_BUILD.v==='1.49'&&m.status==='bad'}));
await ev(()=>Live.reset({reload:false}));
// ---- 11 Watchdog im Kopf der Seite (Oberfläche startet, bestätigt aber nie)
const hang=ver(base,'9.17','').replace('setTimeout(health, 2500);','');
rawOverride=hang;relBody=REL(hang,{v:'9.17'});
await ev(async()=>{const r=await Update.check();await Live.download(r.latest,{})});
await pg.goto(URL0,{waitUntil:'load'});
T('Live-Seite 1.49 geladen',await ev(()=>SUNSHINE_BUILD.v==='9.17'));
await pg.waitForTimeout(17500);
T('Watchdog: nach 15 s ohne Bestätigung → zurück auf eingebaute Version',await ev(async()=>SUNSHINE_BUILD.v==='1.49'&&(await Live._readMeta()).status==='bad'),await ev(()=>SUNSHINE_BUILD.v));
T('Keine JS-Fehler',errs.length===0,errs);
console.log('\n'+ok+' ok, '+bad+' fehlgeschlagen');await b.close();srv.close();process.exit(bad?1:0)})();
