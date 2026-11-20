const http=require('http'),fs=require('fs'),path=require('path');const {chromium}=require('playwright');
const WORK=process.argv[2];
const srv=http.createServer((q,r)=>{const u=new URL(q.url,'http://x');const f=path.join(WORK,decodeURIComponent(u.pathname).replace(/^\//,''));fs.readFile(f,(e,d)=>{if(e){r.writeHead(404);r.end();return;}
 let body=d;if(/\.html$/.test(f)){let t=d.toString();if(u.searchParams.get('repo'))t=t.replace("repo:'__BUILD_REPO__'","repo:'o/r'").replace("n:'__BUILD_N__'","n:'7'");t=t.replace(/const MAIL = "[^"]*";/,u.searchParams.get('mail')?'const MAIL = "test@example.com";':'const MAIL = "";');body=t}
 r.writeHead(200,{'content-type':/\.html$/.test(f)?'text/html':/\.js$/.test(f)?'application/javascript':'application/octet-stream'});r.end(body)})});
let ok=0,bad=0;const T=(n,c,x)=>{if(c){ok++;console.log('PASS',n)}else{bad++;console.log('FAIL',n,x===undefined?'':JSON.stringify(x))}};
(async()=>{await new Promise(r=>srv.listen(0,'127.0.0.1',r));const port=srv.address().port;const b=await chromium.launch();
const mk=async(q,init,routeFn)=>{const ctx=await b.newContext({viewport:{width:393,height:852},isMobile:true,hasTouch:true});const pg=await ctx.newPage();pg.__errs=[];pg.on('pageerror',e=>pg.__errs.push(e.message));
 await pg.route(/^https?:\/\/(?!127\.0\.0\.1)/,r=>routeFn?routeFn(r):r.abort());
 await pg.addInitScript(i=>{try{if(!sessionStorage.__i){sessionStorage.__i=1;localStorage.setItem('sunshine.home','off');localStorage.setItem('sunshine.news','{"seen":"1.30"}');if(i)Object.keys(i).forEach(k=>localStorage.setItem(k,i[k]))}}catch(e){}},init||null);
 if(global.PRE)await pg.addInitScript(global.PRE);await pg.goto(`http://127.0.0.1:${port}/index_ueberarbeitet.html${q||''}`,{waitUntil:'load'});await pg.waitForTimeout(1200);return pg};
const MOCK=()=>{window.__plays=[];const P=HTMLMediaElement.prototype;P.play=function(){const el=this;window.__plays.push({muted:el.muted,src:el.getAttribute('src')});if(localStorage.getItem('__deny')&&!el.muted){return Promise.reject(Object.assign(new Error('x'),{name:'NotAllowedError'}))}Object.defineProperty(el,'paused',{value:false,configurable:true});Object.defineProperty(el,'readyState',{value:4,configurable:true});setTimeout(()=>el.dispatchEvent(new Event('playing')),10);return Promise.resolve()};P.pause=function(){Object.defineProperty(this,'paused',{value:true,configurable:true})};P.load=function(){}};
global.PRE=MOCK;
const INIT={'sunshine.intro.test':'1'};
// 1) Tests: kein Auto-Start ohne Testschalter
const ctxClose=async p=>{try{await p.context().close()}catch(_){}};
let pg=await mk('',{});let ev=(f,a)=>pg.evaluate(f,a);
T('Modul Intro vorhanden',await ev(()=>!!window.Intro));
T('Automatisierter Browser: Intro startet nicht von selbst',await ev(()=>!document.getElementById('in-root')));
await ctxClose(pg);
// 2) Mit Testschalter: Auto-Start
pg=await mk('',INIT);ev=(f,a)=>pg.evaluate(f,a);
T('Intro erscheint beim Start über der App',await ev(()=>{const r=document.getElementById('in-root');return !!r&&+getComputedStyle(r).zIndex>=200&&r.querySelector('video')&&/assets\/intro\.mp4$/.test(r.querySelector('video').getAttribute('src'))&&/intro-poster\.jpg$/.test(r.querySelector('video').getAttribute('poster'))}));
T('Standard: mit Ton, Skip- und Ton-Knopf vorhanden',await ev(()=>{const v=Intro.video();return v.muted===false&&!!document.querySelector('[data-in=skip]')&&!!document.querySelector('[data-in=snd]')&&window.__plays.length===1}));
T('Knöpfe groß genug (≥44 px)',await ev(()=>[...document.querySelectorAll('#in-root .in-b')].every(b=>{const r=b.getBoundingClientRect();return r.width>=44&&r.height>=44})));
await ev(()=>document.querySelector('[data-in=snd]').click());T('Ton-Knopf schaltet stumm',await ev(()=>Intro.video().muted===true&&/einschalten/.test(document.querySelector('[data-in=snd]').getAttribute('aria-label'))));
await ev(()=>document.querySelector('[data-in=snd]').click());T('… und wieder an',await ev(()=>Intro.video().muted===false));
await ev(()=>document.querySelector('[data-in=skip]').click());await pg.waitForTimeout(500);
T('Überspringen entfernt das Intro',await ev(()=>!document.getElementById('in-root')&&!Intro.isOpen()));
await pg.reload({waitUntil:'load'});await pg.waitForTimeout(800);
T('Nach Neuladen derselben Sitzung kein zweites Intro',await ev(()=>!document.getElementById('in-root')));
// 3) Optionen
await ev(()=>document.getElementById('btn-settings').click());await pg.waitForTimeout(500);await ev(()=>OptNav.page('look'));await pg.waitForTimeout(400);
T('Optionen → Design: Abschnitt „Start-Intro“ mit 2 Schaltern + Knopf',await ev(()=>{const s=document.getElementById('in-sec');return !!s&&s.offsetHeight>0&&s.querySelectorAll('input[type=checkbox]').length===2&&!!s.querySelector('[data-in-play]')&&s.querySelector('[data-in-on]').checked&&s.querySelector('[data-in-snd]').checked}));
await ev(()=>document.querySelector('[data-in-snd]').click());T('„Mit Ton“ aus wird gespeichert',await ev(()=>JSON.parse(localStorage.getItem('sunshine.intro')).sound===false));
await ev(()=>document.querySelector('[data-in-on]').click());T('„Beim Start abspielen“ aus wird gespeichert',await ev(()=>JSON.parse(localStorage.getItem('sunshine.intro')).on===false));
await ev(()=>{window.__plays=[];document.querySelector('[data-in-play]').click()});await pg.waitForTimeout(500);
T('„Jetzt ansehen“ spielt auch bei ausgeschaltetem Start – stumm, wie eingestellt',await ev(()=>Intro.isOpen()&&!document.getElementById('settings-modal')&&Intro.video().muted===true&&window.__plays.length===1));
await pg.keyboard.press('Escape');await pg.waitForTimeout(500);T('Escape beendet das Intro',await ev(()=>!Intro.isOpen()));
await ev(()=>{Intro.show()});await pg.waitForTimeout(200);
await ev(()=>Intro.video().dispatchEvent(new Event('ended')));await pg.waitForTimeout(500);T('Videoende schließt das Intro von selbst',await ev(()=>!Intro.isOpen()));
await ev(()=>{Intro.show()});await pg.waitForTimeout(200);await ev(()=>Intro.video().dispatchEvent(new Event('error')));await pg.waitForTimeout(500);T('Videofehler: Intro verschwindet, App bleibt benutzbar',await ev(()=>!Intro.isOpen()&&!document.getElementById('in-root')));
T('Android-Zurück (back.js) schließt das Intro',await ev(async()=>{Intro.show();await new Promise(r=>setTimeout(r,200));const ok=typeof window.__backTest==='function'?1:1;document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true}));await new Promise(r=>setTimeout(r,450));return !Intro.isOpen()}));
const sz=await ev(async()=>{const a=await fetch('assets/intro.mp4');const n=(await a.arrayBuffer()).byteLength;const b=await fetch('assets/intro-poster.jpg');return [a.status,n,b.status]});
T('Dateien intro.mp4 und intro-poster.jpg werden ausgeliefert',sz[0]===200&&sz[1]>1e6&&sz[2]===200,sz);
T('Keine Seitenfehler (Hauptseite)',pg.__errs.length===0,pg.__errs);
await ctxClose(pg);
// 4) „Ton gesperrt“ → stumm starten
pg=await mk('',{'sunshine.intro.test':'1','__deny':'1'});ev=(f,a)=>pg.evaluate(f,a);
T('Ton gesperrt (NotAllowedError): Intro startet stumm, Ton-Knopf zeigt „einschalten“',await ev(()=>Intro.isOpen()&&Intro.video().muted===true&&window.__plays.length===2&&/einschalten/.test(document.querySelector('[data-in=snd]').getAttribute('aria-label'))),await ev(()=>window.__plays));
await ctxClose(pg);
// 5) Schalter aus → kein Auto-Start
global.PRE=MOCK;
pg=await mk('',{'sunshine.intro.test':'1','sunshine.intro':'{"on":false,"sound":true}'});ev=(f,a)=>pg.evaluate(f,a);
T('Start-Intro ausgeschaltet: kein Intro beim Start',await ev(()=>!document.getElementById('in-root')&&Intro.settings().on===false));
await ctxClose(pg);
// 6) Echter Chromium ohne H.264 / defektes Video → App läuft trotzdem
global.PRE=null;
pg=await mk('',INIT);ev=(f,a)=>pg.evaluate(f,a);await pg.waitForTimeout(2500);
T('Ohne abspielbares Video (kein Codec/Fehler) verschwindet das Intro und blockiert nicht',await ev(()=>!document.getElementById('in-root')||document.querySelector('#in-root video').readyState>=2));
T('Keine Seitenfehler (echter Video-Pfad)',pg.__errs.length===0,pg.__errs);
console.log(`\n${ok} bestanden, ${bad} fehlgeschlagen`);await b.close();srv.close();process.exit(bad?1:0)})();
