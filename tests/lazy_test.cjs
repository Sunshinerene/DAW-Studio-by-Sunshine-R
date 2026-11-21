// Nachladen der ZIP-Bibliothek (SunLazy.zip): erst bei Bedarf, einmal, mit CDN-Rückfall, erneuter Versuch nach Fehlschlag
const http=require('http'),fs=require('fs'),path=require('path');const {chromium}=require('playwright');
const WORK=process.argv[2];const TW=fs.readFileSync(path.join(__dirname,'fixtures/tailwind.js'));
const JSZ=fs.readFileSync('/opt/npm-tools/node_modules/jszip/dist/jszip.min.js','utf8');
const srv=http.createServer((q,r)=>{const f=path.join(WORK,decodeURIComponent(q.url.split('?')[0]).replace(/^\//,''));fs.readFile(f,(e,d)=>{if(e){r.writeHead(404);r.end();return;}r.writeHead(200,{'content-type':f.endsWith('.html')?'text/html':'application/octet-stream'});r.end(d)})});
let ok=0,bad=0;const T=(n,c,x)=>{if(c){ok++;console.log('PASS',n)}else{bad++;console.log('FAIL',n,x||'')}};
(async()=>{await new Promise(r=>srv.listen(0,'127.0.0.1',r));const port=srv.address().port;const b=await chromium.launch();
const html=fs.readFileSync(path.join(WORK,'index_ueberarbeitet.html'),'utf8');
T('Seite bindet JSZip nicht mehr beim Start ein (kein <script src> darauf)',!/<script[^>]+src="[^"]*jszip/i.test(html));
T('SunLazy.zip kennt lokale Kopie und CDN-Rückfall',/assets\/vendor\/jszip-3\.10\.1\.min\.js/.test(html)&&/cdnjs\.cloudflare\.com\/ajax\/libs\/jszip/.test(html));
async function open(setup){const ctx=await b.newContext({viewport:{width:393,height:852},isMobile:true,hasTouch:true});await ctx.addInitScript(()=>{try{localStorage.setItem('sunshine.home','off');localStorage.setItem('sunshine.intro','{"on":false}')}catch(_){}});
 const pg=await ctx.newPage();const errs=[],reqs=[];pg.on('pageerror',e=>errs.push(e.message));pg.on('request',r=>{if(/jszip/i.test(r.url()))reqs.push(r.url())});
 await pg.route(/cdn\.tailwindcss\.com/,r=>r.fulfill({status:200,contentType:'application/javascript',body:TW}));
 await setup(pg);return {pg,errs,reqs,ctx}}
const offlineExceptLocal=async pg=>{await pg.route(/^https?:\/\/(?!127\.0\.0\.1|cdn\.tailwindcss\.com)/,r=>r.abort())};
// 1) Normalfall
{const {pg,errs,reqs,ctx}=await open(offlineExceptLocal);
 await pg.goto(`http://127.0.0.1:${port}/index_ueberarbeitet.html`,{waitUntil:'domcontentloaded'});await pg.waitForTimeout(300);
 T('Direkt nach dem Start: keine Anfrage nach JSZip, window.JSZip noch nicht da',reqs.length===0&&await pg.evaluate(()=>!window.JSZip),reqs.join(','));
 const r=await pg.evaluate(async()=>{const a=SunLazy.zip(),b=SunLazy.zip();const Z=await a;const z=new Z();z.file('a.txt','x');const blob=await z.generateAsync({type:'uint8array'});const z2=await Z.loadAsync(blob);return {same:a===b,fn:typeof Z==='function'&&typeof Z.loadAsync==='function',glob:window.JSZip===Z,read:await z2.file('a.txt').async('string'),n:SunLazy.started().length}});
 T('SunLazy.zip(): liefert JSZip, zweiter Aufruf teilt dasselbe Versprechen',r.same&&r.fn&&r.glob&&r.n===1,JSON.stringify(r));
 T('ZIP schreiben und wieder lesen funktioniert',r.read==='x');
 await pg.waitForTimeout(500);
 T('Genau eine Anfrage nach JSZip, lokal aus der App (kein CDN)',reqs.length===1&&/assets\/vendor\/jszip/.test(reqs[0]),reqs.join(','));
 T('Keine Seitenfehler',errs.length===0,errs.join('|'));await ctx.close()}
// 2) Vorabladen im Leerlauf (ohne Nutzung)
{const {pg,errs,reqs,ctx}=await open(offlineExceptLocal);
 await pg.goto(`http://127.0.0.1:${port}/index_ueberarbeitet.html`,{waitUntil:'load'});await pg.waitForTimeout(6000);
 T('Ohne Nutzung wird JSZip nach dem Start einmal im Leerlauf nachgeladen',await pg.evaluate(()=>!!window.JSZip)&&reqs.length===1,reqs.join(','));await ctx.close()}
// 3) lokale Kopie fehlt → CDN-Rückfall
{const {pg,errs,reqs,ctx}=await open(async pg=>{await pg.route(/assets\/vendor\/jszip/,r=>r.abort());await pg.route(/cdnjs\.cloudflare\.com.*jszip/,r=>r.fulfill({status:200,contentType:'application/javascript',body:JSZ}));await pg.route(/^https?:\/\/(?!127\.0\.0\.1|cdn\.tailwindcss\.com|cdnjs\.cloudflare\.com)/,r=>r.abort())});
 await pg.goto(`http://127.0.0.1:${port}/index_ueberarbeitet.html`,{waitUntil:'domcontentloaded'});
 const r=await pg.evaluate(async()=>{const Z=await SunLazy.zip();return typeof Z.loadAsync});
 T('Lokale Kopie nicht erreichbar → CDN-Rückfall liefert JSZip',r==='function'&&reqs.some(u=>/cdnjs/.test(u)),reqs.join(','));await ctx.close()}
// 4) beides fehlt → Fehler, später erneuter Versuch klappt
{const {pg,errs,reqs,ctx}=await open(async pg=>{await pg.route(/assets\/vendor\/jszip|cdnjs\.cloudflare\.com.*jszip/,r=>r.abort());await pg.route(/^https?:\/\/(?!127\.0\.0\.1|cdn\.tailwindcss\.com|cdnjs\.cloudflare\.com)/,r=>r.abort())});
 await pg.goto(`http://127.0.0.1:${port}/index_ueberarbeitet.html`,{waitUntil:'domcontentloaded'});
 const f=await pg.evaluate(async()=>{try{await SunLazy.zip();return 'ok'}catch(e){return 'fehler:'+(e&&e.message||e)}});
 T('Beides nicht erreichbar → klarer Fehler, kein Hängen',/^fehler:/.test(f),f);
 T('Nach Fehlschlag ist nichts zwischengespeichert (spätere Versuche möglich)',await pg.evaluate(()=>SunLazy.started().length===0));
 const m=await pg.evaluate(async()=>{try{await Backup.make({});return 'kein Fehler'}catch(e){return String(e&&e.message)}});
 T('Backup.make ohne ZIP-Bibliothek: verständliche Meldung statt Absturz',/ZIP-Modul/.test(m),m);
 await pg.unroute(/assets\/vendor\/jszip|cdnjs\.cloudflare\.com.*jszip/);
 const g=await pg.evaluate(async()=>{try{return typeof (await SunLazy.zip()).loadAsync}catch(e){return 'fehler'}});
 T('Erneuter Versuch nach Rückkehr des Netzes gelingt',g==='function',g);
 await ctx.close()}
console.log(`\nlazy_test: ${ok} ok, ${bad} fehlgeschlagen`);await b.close();srv.close();process.exit(bad?1:0)})().catch(e=>{console.log('FAIL Absturz',e.message);process.exit(2)});
