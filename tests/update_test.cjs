const http=require('http'),fs=require('fs'),path=require('path');const {chromium}=require('playwright');
const WORK=process.argv[2];const TW=fs.readFileSync(path.join(__dirname,'fixtures/tailwind.js'));
const srv=http.createServer((q,r)=>{const f=path.join(WORK,decodeURIComponent(q.url.split('?')[0]).replace(/^\//,''));fs.readFile(f,(e,d)=>{if(e){r.writeHead(404);r.end();return;}r.writeHead(200,{'content-type':f.endsWith('.html')?'text/html':'application/octet-stream'});r.end(d)})});
let ok=0,bad=0;const T=(n,c,x)=>{if(c){ok++;console.log('PASS',n)}else{bad++;console.log('FAIL',n,x||'')}};
const SHOT=path.join(__dirname,'../dist/_shots');
const html=fs.readFileSync(path.join(WORK,'index_ueberarbeitet.html'),'utf8');
const srv2=null;
(async()=>{await new Promise(r=>srv.listen(0,'127.0.0.1',r));const port=srv.address().port;const b=await chromium.launch();
const REL=(n,extra)=>JSON.stringify(Object.assign({tag_name:'build-'+n,name:'Sunshine@R Build '+n,published_at:'2026-11-19T10:00:00Z',body:'Neu: Anleitung',html_url:'https://github.com/foo/bar/releases/tag/build-'+n,assets:[{name:'Sunshine-R-DAW-v'+n+'.apk',browser_download_url:'https://github.com/foo/bar/releases/download/build-'+n+'/Sunshine-R-DAW-v'+n+'.apk',size:52000000}]},extra||{}));
const mk=async({build,repo,api,status,pre,home})=>{const ctx=await b.newContext({viewport:{width:393,height:852},isMobile:true,hasTouch:true,acceptDownloads:true});const pg=await ctx.newPage();pg.errs=[];pg.api=0;pg.opened=[];pg.on('pageerror',e=>pg.errs.push(e.message));pg.on('dialog',d=>d.accept());
 await pg.route(/^https?:\/\/(?!127\.0\.0\.1)/,r=>r.abort());
 if(api!==undefined)await pg.route('https://api.github.com/**',r=>{pg.api++;r.fulfill({status:status||200,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:api})});
 if(build!==undefined)await pg.route(/index_ueberarbeitet\.html/,async r=>{const resp=await r.fetch();let t=await resp.text();t=t.split('__BUILD_N__').join(String(build)).split('__BUILD_REPO__').join(repo).split('__BUILD_TIME__').join('2026-11-19');r.fulfill({response:resp,body:t,headers:Object.assign({},resp.headers(),{'content-type':'text/html'})})});
 await pg.addInitScript(([h,p])=>{if(h!==false)localStorage.setItem('sunshine.home',h?'on':'off');localStorage.setItem('sunshine.news',JSON.stringify({seen:'1.44'}));if(p)localStorage.setItem('sunshine.update',p);window.open=(u)=>{(window.__opened=window.__opened||[]).push(u);return null}},[home?true:false,pre||null]);
 await pg.goto(`http://127.0.0.1:${port}/index_ueberarbeitet.html`,{waitUntil:'load'});await pg.waitForTimeout(900);return pg};
const openOpt=async pg=>{await pg.evaluate(()=>document.getElementById('btn-menu').click());await pg.waitForTimeout(200);await pg.evaluate(()=>document.getElementById('btn-settings').click());await pg.waitForTimeout(500)};
// ---- A) Entwicklungsversion (Tokens nicht ersetzt)
let pg=await mk({});const ev=(f,a)=>pg.evaluate(f,a);
T('Ohne Build-Einträge: Update.build()=0, kein Repo',await ev(()=>Update.build()===0&&Update.repo()===''));
T('check() meldet verständlich „Entwicklungsversion“',await ev(async()=>{const r=await Update.check();return r.ok===false&&/Entwicklungsversion/.test(r.error)}));
await openOpt(pg);
T('Optionen: Abschnitt „Updates & Datensicherung“ (Version, Suchen, Auto, Sichern, Wiederherstellen, Speicher)',await ev(()=>{const s=document.getElementById('up-sec');return !!s&&/Entwicklungsversion/.test(s.textContent)&&['[data-up-check]','[data-up-auto]','[data-bk-make]','[data-bk-restore]','[data-bk-file]','[data-st-persist]'].every(x=>!!s.querySelector(x))}));
T('Auto-Prüfung standardmäßig an',await ev(()=>document.querySelector('[data-up-auto]').checked));
await ev(()=>document.querySelector('[data-up-check]').click());await pg.waitForTimeout(300);
T('Knopf „Nach Updates suchen“ zeigt Hinweis statt Fehler',await ev(()=>{const r=document.querySelector('[data-up-res]');return !r.classList.contains('hidden')&&/Entwicklungsversion/.test(r.textContent)}));
T('Gerätespeicher-Zeile gefüllt',await ev(()=>document.querySelector('[data-st-info]').textContent!=='…'));
await ev(()=>document.getElementById('up-sec').scrollIntoView());await pg.screenshot({path:path.join(SHOT,'up_opt.png')});
await pg.context().close();
// ---- B) Gebaute Version, neueres Release
pg=await mk({build:5,repo:'foo/bar',api:REL(7),home:true});
T('Token-Ersetzung wie im Workflow: Build 5, Repo foo/bar',await ev(()=>Update.build()===5&&Update.repo()==='foo/bar'));
const r1=await ev(()=>Update.check());
T('Neueres Release (7 > 5) erkannt, APK-Link, Größe',r1.ok&&r1.available&&r1.latest.n===7&&/\.apk$/.test(r1.latest.url)&&r1.latest.size===52000000,JSON.stringify(r1));
await ev(()=>{Home.open()});await pg.waitForTimeout(400);
T('Startseite zeigt Update-Karte „Build 7“',await ev(()=>{const e=document.querySelector('#hm-update .hp-new:not([data-pv-card])');return !!e&&/Build 7/.test(e.textContent)&&/Build 5/.test(e.textContent)}));
await pg.screenshot({path:path.join(SHOT,'up_home.png')});
await ev(()=>document.querySelector('#hm-update [data-up="dl"]').click());
T('„Laden“ öffnet den APK-Download extern',await ev(()=>(window.__opened||[]).some(u=>/build-7\/Sunshine-R-DAW-v7\.apk$/.test(u))));
await ev(()=>document.querySelector('#hm-update [data-up="no"]').click());
T('„Später“ blendet Karte aus und merkt es für diesen Build',await ev(()=>{Home.close();Home.open();return !document.querySelector('#hm-update .hp-new:not([data-pv-card])')&&Update._state().dismissed===7}));
await ev(()=>Home.close());await openOpt(pg);
T('Optionen zeigen Update-Hinweis mit Download-Knopf (vorgemerkt)',await ev(()=>{const r=document.querySelector('[data-up-res]');return !r.classList.contains('hidden')&&/Build 7/.test(r.textContent)&&!!r.querySelector('[data-up-dl]')}));
await pg.context().close();
// ---- C) gleiche Version / Fehler
pg=await mk({build:7,repo:'foo/bar',api:REL(7)});
T('Gleiche Version: kein Update',await pg.evaluate(async()=>{const r=await Update.check();return r.ok&&!r.available}));
await pg.context().close();
pg=await mk({build:7,repo:'foo/bar',api:'{}',status:404});
T('404 überall → „Repository nicht sichtbar, vermutlich privat“',await pg.evaluate(async()=>{const r=await Update.check();return !r.ok&&/privat/.test(r.error)&&/foo\/bar/.test(r.error)}));
await pg.context().close();
{const ctx=await b.newContext({viewport:{width:393,height:852},isMobile:true});const p2=await ctx.newPage();await p2.route(/^https?:\/\/(?!127\.0\.0\.1)/,r=>r.abort());
 await p2.route('https://api.github.com/**',r=>{const u=r.request().url();r.fulfill(/releases\/latest/.test(u)?{status:404,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:'{}'}:{status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:'{"full_name":"foo/bar"}'})});
 await p2.route(/index_ueberarbeitet\.html/,async r=>{const resp=await r.fetch();let t=await resp.text();t=t.split('__BUILD_N__').join('5').split('__BUILD_REPO__').join('foo/bar').split('__BUILD_TIME__').join('x');r.fulfill({response:resp,body:t,headers:Object.assign({},resp.headers(),{'content-type':'text/html'})})});
 await p2.addInitScript(()=>localStorage.setItem('sunshine.home','off'));await p2.goto(`http://127.0.0.1:${port}/index_ueberarbeitet.html`,{waitUntil:'load'});await p2.waitForTimeout(800);
 T('Repo sichtbar, aber keine Release → Hinweis auf Actions/Release-Schritt/Berechtigung',await p2.evaluate(async()=>{const r=await Update.check();return !r.ok&&/noch keine Release/.test(r.error)&&/Workflow permissions/.test(r.error)}));await ctx.close();}
// ---- D) Auto-Prüfung beim Start (6 s), Drosselung 12 h
pg=await mk({build:5,repo:'foo/bar',api:REL(9),home:false});
await pg.waitForTimeout(7000);
T('Auto-Prüfung nach dem Start: 1 Abruf, Hinweis-Toast',pg.api===1&&await pg.evaluate(()=>/Update verfügbar: Build 9/.test(document.getElementById('toast-container')?document.getElementById('toast-container').textContent:'')||Update.isNew()),'api='+pg.api);
const keep=await pg.evaluate(()=>localStorage.getItem('sunshine.update'));await pg.context().close();
pg=await mk({build:5,repo:'foo/bar',api:REL(9),pre:keep,home:false});await pg.waitForTimeout(7000);
T('Zweiter Start innerhalb 12 h: kein neuer Abruf',pg.api===0,'api='+pg.api);await pg.context().close();
{const k=JSON.stringify({auto:false,checked:0,latest:null,dismissed:0});pg=await mk({build:5,repo:'foo/bar',api:REL(9),pre:k,home:false});await pg.waitForTimeout(7000);T('Auto-Prüfung ausgeschaltet: kein Abruf',pg.api===0,'api='+pg.api);await pg.context().close();}
console.log(`\n${ok} ok / ${bad} fail`);await b.close();srv.close();process.exit(bad?1:0)})();
