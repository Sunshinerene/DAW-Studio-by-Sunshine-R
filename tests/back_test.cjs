const http=require('http'),fs=require('fs'),path=require('path');const {chromium}=require('playwright');
const WORK=process.argv[2];const TW=fs.readFileSync(path.join(__dirname,'fixtures/tailwind.js'));
const srv=http.createServer((q,r)=>{const f=path.join(WORK,decodeURIComponent(q.url.split('?')[0]).replace(/^\//,''));fs.readFile(f,(e,d)=>{if(e){r.writeHead(404);r.end();return;}r.writeHead(200,{'content-type':f.endsWith('.html')?'text/html':'application/octet-stream'});r.end(d)})});
let ok=0,bad=0;const T=(n,c,x)=>{if(c){ok++;console.log('PASS',n)}else{bad++;console.log('FAIL',n,x||'')}};
(async()=>{await new Promise(r=>srv.listen(0,'127.0.0.1',r));const port=srv.address().port;const b=await chromium.launch();
const ctx=await b.newContext({viewport:{width:393,height:852},isMobile:true,hasTouch:true});const pg=await ctx.newPage();const errs=[];pg.on('pageerror',e=>errs.push(e.message));
const ext=[];await pg.route(/^https?:\/\/(?!127\.0\.0\.1)/,r=>{ext.push(r.request().url());r.abort()});
await pg.addInitScript(()=>{if(!localStorage.getItem('sunshine.home'))localStorage.setItem('sunshine.home','on')});
await pg.goto(`http://127.0.0.1:${port}/index_ueberarbeitet.html`,{waitUntil:'load'});

const SHOT=path.join(__dirname,'../dist/_shots');const ev=(f,a)=>pg.evaluate(f,a);const back=()=>ev(()=>window.__androidBack());
await pg.waitForTimeout(900);
// ---- Offline
const nonFont=ext.filter(u=>!/fonts\.(googleapis|gstatic)\.com/.test(u));
T('Offline: Tailwind & JSZip kommen aus der App (keine Anfrage an cdn.tailwindcss.com / cdnjs)',!ext.some(u=>/tailwindcss|cdnjs/.test(u)),ext.join(' '));
T('Offline: Seite ist gestylt (vorberechnetes Tailwind-CSS eingebaut, kein Laufzeit-Skript, JSZip da)',await ev(async()=>!window.tailwind&&!!document.getElementById('tw-precompiled')&&document.getElementById('tw-precompiled').textContent.length>20000&&!document.querySelector('script[src*=tailwind]')&&!!(await SunLazy.zip())&&getComputedStyle(document.getElementById('btn-play')).borderRadius!=='0px'));
T('Einzige externe Anfragen: Schriftarten (fallen ohne Netz auf Systemschrift zurück)',nonFont.length===0,nonFont.join(' '));
// ---- Zurück-Taste
T('Startseite ohne Projekt: Zurück → false (App geht in den Hintergrund)',await ev(()=>Home.isOpen())&&await back()===false);
await pg.tap('#hm-new');await pg.waitForTimeout(350);
T('Neues-Projekt-Dialog offen → Zurück schließt ihn (true)',await ev(()=>!!document.querySelector('.hm-sheet-bg'))&&await back()===true&&await ev(()=>!document.querySelector('.hm-sheet-bg')));
await pg.tap('#hm-new');await pg.waitForTimeout(350);await pg.fill('#pf-name','Back Test');await pg.tap('#pf-ok');await pg.waitForTimeout(700);
T('Projekt angelegt, DAW sichtbar',await ev(()=>!Home.isOpen()&&dawState.project&&dawState.project.name==='Back Test'));
await pg.tap('#btn-menu');await pg.waitForTimeout(250);
T('Menü offen → Zurück schließt es',await back()===true&&await ev(()=>document.getElementById('file-menu').hidden));
await ev(()=>SunshineTheme.open());await pg.waitForTimeout(350);
T('Optionen offen → Zurück schließt sie',await ev(()=>!!document.getElementById('settings-modal'))&&await back()===true&&await ev(()=>!document.getElementById('settings-modal')));
await ev(()=>CreativeUI.openKey());await pg.waitForTimeout(350);
T('Tonart-&-Tempo-Blatt offen → Zurück schließt es',await ev(()=>{const r=document.getElementById('kt-root');return !!r&&!r.hidden})&&await back()===true&&await ev(()=>{const r=document.getElementById('kt-root');return !r||r.hidden||r.getBoundingClientRect().height===0}));
await ev(()=>SunshineTheme.open());await pg.waitForTimeout(300);await ev(()=>CreativeUI.openMarkers());await pg.waitForTimeout(300);
const cnt=()=>ev(()=>['settings-modal','mk-root'].filter(i=>{const e=document.getElementById(i);return e&&!e.hidden&&e.getBoundingClientRect().height>0}).length);
const c0=await cnt();const r1=await back();const c1=await cnt();const r2=await back();await pg.waitForTimeout(200);const c2=await cnt();
T('Zwei Ebenen offen (Optionen + Marker): jedes Zurück schließt genau eine',c0===2&&r1===true&&c1===1&&r2===true&&c2===0,[c0,c1,c2].join());
T('Nichts offen in der DAW → Zurück öffnet die Startseite (true)',await back()===true&&await ev(()=>Home.isOpen()));
T('Startseite mit Projekt: Zurück → zurück in die DAW (true)',await back()===true&&await ev(()=>!Home.isOpen()));
T('Keine JS-Fehler',errs.length===0,errs.join('|'));
console.log(`\n${ok} ok, ${bad} fehlgeschlagen`);await b.close();srv.close();process.exit(bad?1:0)})();
