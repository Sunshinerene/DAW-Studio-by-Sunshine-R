const http=require('http'),fs=require('fs'),path=require('path');const {chromium}=require('playwright');
const WORK=process.argv[2];const TW=fs.readFileSync(path.join(__dirname,'fixtures/tailwind.js'));const JSZ=fs.readFileSync('/opt/npm-tools/node_modules/jszip/dist/jszip.min.js','utf8');
const srv=http.createServer((q,r)=>{const f=path.join(WORK,decodeURIComponent(q.url.split('?')[0]).replace(/^\//,''));fs.readFile(f,(e,d)=>{if(e){r.writeHead(404);r.end();return;}r.writeHead(200,{'content-type':f.endsWith('.html')?'text/html':f.endsWith('.js')?'application/javascript':'application/octet-stream'});r.end(d)})});
let ok=0,bad=0;const T=(n,c,x)=>{if(c){ok++;console.log('PASS',n)}else{bad++;console.log('FAIL',n,x===undefined?'':JSON.stringify(x))}};
(async()=>{await new Promise(r=>srv.listen(0,'127.0.0.1',r));const port=srv.address().port;const b=await chromium.launch();
const open=async(w,h,mobile)=>{const ctx=await b.newContext({viewport:{width:w,height:h},isMobile:mobile,hasTouch:mobile});await ctx.addInitScript(()=>{try{if(!sessionStorage.__i){sessionStorage.__i=1;localStorage.setItem('sunshine.home','off');localStorage.setItem('sunshine.news','{"seen":"1.43"}')}}catch(_){}});const pg=await ctx.newPage();pg.__errs=[];pg.on('pageerror',e=>pg.__errs.push(e.message));
await pg.route(/cdn\.tailwindcss\.com/,r=>r.fulfill({status:200,contentType:'application/javascript',body:TW}));await pg.route(/cdnjs\.cloudflare\.com.*jszip/,r=>r.fulfill({status:200,contentType:'application/javascript',body:JSZ}));await pg.route(/^https?:\/\/(?!127\.0\.0\.1|cdn\.tailwindcss\.com|cdnjs)/,r=>r.abort());
await pg.goto(`http://127.0.0.1:${port}/index_ueberarbeitet.html`,{waitUntil:'load'});await pg.waitForTimeout(1300);return pg};
let pg=await open(393,852,true);const ev=(f,a)=>pg.evaluate(f,a);
const where=()=>ev(()=>({inNav:!!document.querySelector('#bottom-nav .td-tp #btn-play'),inHeader:!!document.querySelector('header #btn-play'),ids:['btn-stop','btn-loop','btn-metronome'].every(i=>!!document.querySelector('#bottom-nav .td-tp #'+i)),tabs:document.querySelectorAll('#bottom-nav .td-tabs .dock-tab-btn').length,hasSpuren:!!document.querySelector('#bottom-nav .td-tabs #btn-nav-tracks')}));
const w1=await where();T('Handy: Play/Stopp/Loop/Klick liegen in der unteren Leiste, nicht im Kopf',w1.inNav&&!w1.inHeader&&w1.ids,w1);
T('Untere Leiste: Spuren + 4 Bereiche auf der zweiten Seite',w1.tabs===4&&w1.hasSpuren,w1);
T('Start: Transport-Seite aktiv, andere Seite inert',await ev(()=>{const n=document.getElementById('bottom-nav');return n.dataset.pane==='tp'&&document.querySelector('.td-tabs').hasAttribute('inert')&&!document.querySelector('.td-tp').hasAttribute('inert')}));
T('Transport-Knöpfe sichtbar und gut tippbar (≥ 40 px, wie in Player und Startseite, innerhalb des Bildschirms)',await ev(()=>['btn-play','btn-stop','btn-loop','btn-metronome','btn-td-start'].every(i=>{const r=document.getElementById(i).getBoundingClientRect();return r.height>=40&&r.width>=40&&r.left>=0&&r.right<=innerWidth})));
T('Kopfbereich ist niedriger geworden (Transport-Zeile entfällt)',await ev(()=>document.querySelector('header').getBoundingClientRect().height<230));
// Funktion: Loop-Knopf unten schaltet
const l0=await ev(()=>document.getElementById('btn-loop').textContent.trim());await pg.tap('#btn-loop');await pg.waitForTimeout(200);const l1=await ev(()=>document.getElementById('btn-loop').textContent.trim());T('Loop-Knopf in der Leiste funktioniert',l0!==l1,[l0,l1]);await pg.tap('#btn-loop');
// Umschalter
await pg.tap('#bottom-nav [data-td-go="tabs"]');await pg.waitForTimeout(700);
T('Umschalter-Tipp zeigt Spuren/Editor/Drums/Vocal/Mixer',await ev(()=>{const n=document.getElementById('bottom-nav'),s=document.querySelector('.td-scroll');return n.dataset.pane==='tabs'&&s.scrollLeft>s.clientWidth*0.9&&document.querySelector('.td-tp').hasAttribute('inert')&&!document.querySelector('.td-tabs').hasAttribute('inert')}));
T('Knöpfe der zweiten Seite sichtbar im Bildschirm',await ev(()=>['btn-nav-tracks'].concat([...document.querySelectorAll('.td-tabs .dock-tab-btn')].map(x=>x.id||'')).length>=1&&[...document.querySelectorAll('.td-tabs button:not(.td-sw)')].every(x=>{const r=x.getBoundingClientRect();return r.width>40&&r.left>=0&&r.right<=innerWidth})));
await ev(()=>{const t=document.querySelector('.dock-tab-btn[data-tab=drums]');t.click()});await pg.waitForTimeout(400);
T('Bereichs-Knopf funktioniert weiterhin (Drums aktiv)',await ev(()=>document.querySelector('.dock-tab-btn[data-tab=drums]').classList.contains('active')||document.querySelector('.dock-tab-btn[data-tab=drums]').getAttribute('aria-selected')==='true'||!!document.getElementById('tab-panel-drums')&&!document.getElementById('tab-panel-drums').classList.contains('hidden')));
// zurück per Pfeil
await pg.tap('#bottom-nav [data-td-go="tp"]');await pg.waitForTimeout(700);T('Punkt „Transport“ bringt den Transport wieder',await ev(()=>document.getElementById('bottom-nav').dataset.pane==='tp'&&document.querySelector('.td-scroll').scrollLeft<4));
// Wisch (Scroll) setzt Zustand
await ev(()=>{const s=document.querySelector('.td-scroll');s.scrollTo({left:s.clientWidth,behavior:'auto'})});await pg.waitForTimeout(400);
T('Wisch (Scrollen) wechselt die Seite und aktualisiert inert/Zustand',await ev(()=>document.getElementById('bottom-nav').dataset.pane==='tabs'&&!document.querySelector('.td-tabs').hasAttribute('inert')));
await ev(()=>{const s=document.querySelector('.td-scroll');s.scrollTo({left:0,behavior:'auto'})});await pg.waitForTimeout(400);
T('Wisch zurück',await ev(()=>document.getElementById('bottom-nav').dataset.pane==='tp'));
// Rundgang
await ev(()=>TpDock.go('tabs',true));await pg.waitForTimeout(200);await ev(()=>TpDock.reveal());await pg.waitForTimeout(200);T('Rundgang/Reveal blendet die Transport-Seite ein',await ev(()=>TpDock.state().pane==='tp'));
// Live
await ev(()=>{document.getElementById('icon-pause').classList.remove('hidden')});await pg.waitForTimeout(150);T('Wiedergabe: Umschalter leuchtet (td-live)',await ev(()=>document.getElementById('bottom-nav').classList.contains('td-live')));
await ev(()=>{document.getElementById('icon-pause').classList.add('hidden')});await pg.waitForTimeout(150);T('Pause: Leuchten aus',await ev(()=>!document.getElementById('bottom-nav').classList.contains('td-live')));
// Cover-Größen im angedockten Hochformat
const sz={};for(const k of ['s','m','l']){await ev(k=>{const r=Cover.generate({title:'T',artist:'A',style:'sun'});Cover.applyTo(dawState.project,{cover:r.cover,thumb:r.thumb});Cover.settings&&0;const s=JSON.parse(localStorage.getItem('sunshine.cover')||'{}');s.size=k;localStorage.setItem('sunshine.cover',JSON.stringify(s));location.hash='';},k);}
// Größen über Optionen
await ev(()=>document.getElementById('btn-settings').click());await pg.waitForTimeout(500);await ev(()=>OptNav.page('look'));await pg.waitForTimeout(300);
T('Optionen: Schalter „Transport in der unteren Leiste“ vorhanden',await ev(()=>{const s=document.getElementById('td-sec');return !!s&&s.offsetHeight>0&&!!s.querySelector('[data-td-on]')&&s.querySelector('[data-td-on]').checked}));
T('Optionen: 5 Leistenstile wählbar, Auswahl wirkt sofort und wird gemerkt',await ev(()=>{const s=document.getElementById('td-sec');const b=[...s.querySelectorAll('[data-td-kind]')];if(b.length!==5)return false;b.find(x=>x.dataset.tdKind==='neon').click();const ok=document.documentElement.getAttribute('data-dock')==='neon'&&JSON.parse(localStorage.getItem('sunshine.tpdock')).kind==='neon'&&b.find(x=>x.dataset.tdKind==='neon').getAttribute('aria-checked')==='true';b.find(x=>x.dataset.tdKind==='auto').click();return ok&&!document.documentElement.hasAttribute('data-dock')}));
for(const k of ['s','m','l']){await ev(k=>document.querySelector('[data-cv-size="'+k+'"]').click(),k);await pg.waitForTimeout(500);sz[k]=await ev(()=>Math.round(document.querySelector('#cv-slot .cv-box').getBoundingClientRect().width))}
T('Cover-Größen im Hochformat mit Leiste unten: S < M < L, L ≥ 76',sz.s<sz.m&&sz.m<sz.l&&sz.l>=76,sz);
await ev(()=>document.querySelector('[data-cv-size=m]').click());await pg.waitForTimeout(400);
T('Cover überdeckt weder Titel noch Zeitanzeige',await ev(()=>{const c=document.querySelector('#cv-slot .cv-box').getBoundingClientRect();return ![...document.querySelectorAll('header button:not(#cv-slot),header h1,header .font-mono,header #status-subtitle')].some(e=>{if(e.closest('#cv-slot'))return false;const q=e.getBoundingClientRect();return q.width>2&&q.right>c.left+1&&q.left<c.right-1&&q.bottom>c.top+1&&q.top<c.bottom-1})}));
// Abschalten
await ev(()=>{const c=document.querySelector('[data-td-on]');c.click()});await pg.waitForTimeout(500);
const w2=await where();T('Abgeschaltet: Transport wieder im Kopfbereich, Leiste wie früher',w2.inHeader&&!w2.inNav&&w2.tabs===0&&await ev(()=>document.querySelectorAll('#bottom-nav>button').length===5&&!document.querySelector('.td-scroll')&&!document.documentElement.classList.contains('tp-dock')),w2);
T('Abgedockt: ebenfalls keine Dauerschleife',await ev(async()=>{let n=0;const o=new MutationObserver(m=>n+=m.length);o.observe(document.documentElement,{attributes:true,attributeFilter:['style','class']});await new Promise(r=>setTimeout(r,2500));o.disconnect();return n<=3}));
T('Einstellung gespeichert (aus)',await ev(()=>JSON.parse(localStorage.getItem('sunshine.tpdock')).on===false));
T('Abgedockt (Leerlauf): keine Dauerschleife an <html>',await ev(async()=>{let n=0;const o=new MutationObserver(m=>n+=m.length);o.observe(document.documentElement,{attributes:true,attributeFilter:['style','class']});await new Promise(r=>setTimeout(r,2500));o.disconnect();return n<=3}));
await ev(()=>{document.querySelector('[data-td-on]').click()});await pg.waitForTimeout(500);
const w3=await where();T('Wieder an: Transport erneut unten',w3.inNav&&!w3.inHeader&&w3.tabs===4,w3);
// Breiter Bildschirm
await pg.setViewportSize({width:1100,height:800});await pg.waitForTimeout(700);
const w4=await where();T('Breite Ansicht (>760 px): Transport bleibt im Kopf, keine Leiste',w4.inHeader&&!w4.inNav&&await ev(()=>getComputedStyle(document.getElementById('bottom-nav')).display==='none'||document.getElementById('bottom-nav').hidden),w4);
T('Breite Ansicht: Dock-Tabs wieder in ihrer Gruppe',await ev(()=>document.querySelectorAll('#bottom-nav .dock-tab-btn').length===0&&document.querySelectorAll('.dock-tab-btn').length===4));
await pg.setViewportSize({width:393,height:852});await pg.waitForTimeout(800);
const w5=await where();T('Zurück auf Handy-Breite: wieder angedockt',w5.inNav&&!w5.inHeader&&w5.tabs===4,w5);
// Tastatur-Kürzel / Sprachbefehle nutzen dieselben Knöpfe
await ev(()=>{const m=document.getElementById('settings-modal');if(m)m.remove()});await pg.waitForTimeout(200);await ev(()=>{window.__pn=0;document.getElementById('btn-play').addEventListener('click',()=>window.__pn++)});await ev(()=>document.getElementById('btn-play').click());await pg.waitForTimeout(300);T('Per ID erreichbar: Play-Knopf (Kürzel/Sprachbefehle) löst aus',await ev(()=>window.__pn>=1));
T('Keine Seitenfehler',pg.__errs.length===0,pg.__errs);
// Querformat-Handy (> 760): unverändert
const pg2=await open(900,420,true);const w6=await pg2.evaluate(()=>({inHeader:!!document.querySelector('header #btn-play'),nav:document.getElementById('bottom-nav').hidden}));T('Querformat 900 px: wie bisher (Transport im Kopf)',w6.inHeader&&w6.nav,w6);
T('Keine Seitenfehler (Querformat)',pg2.__errs.length===0,pg2.__errs);
console.log(`\n${ok} bestanden, ${bad} fehlgeschlagen`);await b.close();srv.close();process.exit(bad?1:0)})();
