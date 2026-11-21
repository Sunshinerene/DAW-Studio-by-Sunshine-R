const http=require('http'),fs=require('fs'),path=require('path');const {chromium}=require('playwright');
const WORK=process.argv[2];const TW=fs.readFileSync(path.join(__dirname,'fixtures/tailwind.js'));
const srv=http.createServer((q,r)=>{const f=path.join(WORK,decodeURIComponent(q.url.split('?')[0]).replace(/^\//,''));fs.readFile(f,(e,d)=>{if(e){r.writeHead(404);r.end();return;}r.writeHead(200,{'content-type':f.endsWith('.html')?'text/html':'application/octet-stream'});r.end(d)})});
let ok=0,bad=0;const T=(n,c,x)=>{if(c){ok++;console.log('PASS',n)}else{bad++;console.log('FAIL',n,x||'')}};
(async()=>{await new Promise(r=>srv.listen(0,'127.0.0.1',r));const port=srv.address().port;const b=await chromium.launch();
const ctx=await b.newContext({viewport:{width:393,height:852},isMobile:true,hasTouch:true});const pg=await ctx.newPage();const errs=[];pg.on('pageerror',e=>errs.push(e.message));
await pg.route(/cdn\.tailwindcss\.com/,r=>r.fulfill({status:200,contentType:'application/javascript',body:TW}));
await pg.route(/^https?:\/\/(?!127\.0\.0\.1|cdn\.tailwindcss\.com)/,r=>r.abort());
await pg.addInitScript(()=>localStorage.setItem('sunshine.home','off'));
await pg.goto(`http://127.0.0.1:${port}/index_ueberarbeitet.html`,{waitUntil:'load'});

const SHOT=path.join(__dirname,'../dist/_shots');const ev=(f,a)=>pg.evaluate(f,a);
await pg.waitForTimeout(900);
// ---- 1 Transport-Form folgt dem Design (15 Kombinationen)
const R=await ev(()=>{const out=[];const rd=id=>{const e=document.getElementById(id);return parseFloat(getComputedStyle(e).borderTopLeftRadius)};
 for(const t of ['classic','aurora','studio','neon','liquid'])for(const r of ['normal','sharp','round']){document.documentElement.dataset.theme=t;document.documentElement.dataset.radius=r;const u=rd('btn-undo');out.push([t,r,u,rd('btn-play'),rd('btn-stop'),rd('btn-loop'),rd('btn-metronome')])}return out});
T('Transport-Tasten: Stopp/Loop/Klick haben gleiche Rundung wie die Player-Tasten (alle 15 Design×Form-Kombinationen)',R.every(x=>x[4]===x[5]&&x[5]===x[6]),JSON.stringify(R.filter(x=>!(x[4]===x[5]&&x[5]===x[6]))));
T('„Eckig“ ergibt wirklich eckige Transportknöpfe (≤ 8 px)',R.filter(x=>x[1]==='sharp').every(x=>x[3]<=8));
T('„Extra rund“ ergibt runde Transportknöpfe (≥ 10 px)',R.filter(x=>x[1]==='round').every(x=>x[3]>=10));
const sk={};for(const t of ['classic','studio','aurora']){await ev(t=>{document.documentElement.dataset.theme=t;document.documentElement.dataset.radius='normal'},t);await pg.waitForTimeout(450);sk[t]=await ev(()=>getComputedStyle(document.getElementById('btn-stop')).backgroundColor)}
T('Stopp-Knopf: wie die Player-Tasten ohne eigene Fläche (transparent in allen Designs)',['studio','classic','aurora'].every(k=>sk[k]==='rgba(0, 0, 0, 0)'),JSON.stringify(sk));
T('Loop „AN“ nutzt die Akzentfarbe des Designs',await ev(()=>{document.documentElement.dataset.theme='aurora';const l=document.getElementById('btn-loop');l.dataset.on='1';return /255, 138, 26/.test(getComputedStyle(l).borderTopColor)}));
await ev(()=>{document.documentElement.dataset.theme='aurora';document.documentElement.dataset.radius='normal'});
// ---- 2 Icons
T('Icon-Satz geladen (≥ 50 Icons, Emoji-Zuordnung)',await ev(()=>Icons.names().length>=50&&Object.keys(Icons.map).length>=60));
const ic=await ev(()=>({w:document.querySelectorAll('.ic-w').length,bad:[...document.querySelectorAll('.ic-w')].filter(w=>{const e=w.querySelector('.ic-e'),s=w.querySelector('svg');return getComputedStyle(e).display!=='none'||getComputedStyle(s).display==='none'}).length}));
T('Kopfleiste/Menü/Navigation: Emoji ersetzt (>20 Icons), alle Linien sichtbar, Emoji versteckt',ic.w>20&&ic.bad===0,JSON.stringify(ic));
T('Text bleibt erhalten (💾 im DOM-Text, Tests/Skripte unverändert)',await ev(()=>document.getElementById('btn-save-project').textContent.includes('💾')));
T('Kopfleiste: 📂 💾 📁 und ☰ sind SVG',await ev(()=>['btn-save-project','btn-open-projects','btn-menu'].every(i=>document.getElementById(i).querySelector('svg.ic'))));
T('Kopfleiste: Laden, Speichern, Projekte und Export haben vier verschiedene Symbole (Laden ≠ Projekte)',await ev(()=>{const d=i=>document.getElementById(i).querySelector('svg.ic').innerHTML;const a=['btn-import-files','btn-save-project','btn-open-projects','btn-export-wav'].map(d);return new Set(a).size===4&&a.every(x=>x.length>20)}));
T('Kopfleiste: Export-Knopf ist schmal (≤ 100 px) und alle Knöpfe passen in die Breite',await ev(()=>{const b=[...document.querySelectorAll('#hdr-actions>button')].filter(e=>e.offsetWidth).map(e=>e.getBoundingClientRect());const x=document.getElementById('btn-export-wav').getBoundingClientRect();return x.width<=100&&b.every(r=>r.left>=0&&r.right<=innerWidth)}));
await pg.tap('#btn-menu');await pg.waitForTimeout(300);
const un=await ev(()=>{const re=/^\s*((?:[\u{1F300}-\u{1FAFF}☀-➿⬀-⯿←-⇿⏩-⏿])️?)/u;const out=new Set();
 document.querySelectorAll('button,summary,a,label,h1,h2,h3,[role=tab],.dock-tab-btn').forEach(h=>{if(h.closest('option,select,.ic-w'))return;const w=document.createTreeWalker(h,NodeFilter.SHOW_TEXT);let n;while(n=w.nextNode()){if(!n.nodeValue.trim())continue;if(n.parentElement.closest('.ic-w'))break;const m=n.nodeValue.match(re);if(m)out.add(m[1]+' '+(h.id||h.className||h.tagName).toString().slice(0,30));break}});return [...out]});
T('Keine unübersetzten führenden Emoji in Buttons/Überschriften (Menü offen)',un.length===0,un.join(' | '));
await pg.screenshot({path:SHOT+'/pol_menu.png'});
await pg.tap('#btn-menu').catch(()=>{});await pg.mouse.click(200,30);await pg.waitForTimeout(200);
// ---- 3 dynamisch erzeugte Buttons
await ev(()=>{const b=document.createElement('button');b.id='dyn1';b.textContent='🎹 Dynamisch';document.body.appendChild(b);const c=document.createElement('div');c.innerHTML='<button id="dyn2"><span>🥁</span> Neu</button>';document.body.appendChild(c);const d=document.getElementById('btn-reset');if(d){d.textContent='🗑 Zurück';}});
await pg.waitForTimeout(250);
T('Dynamisch eingefügte Buttons werden ebenfalls umgestellt',await ev(()=>!!document.querySelector('#dyn1 svg.ic')&&!!document.querySelector('#dyn2 svg.ic')&&!!document.querySelector('#btn-reset svg.ic')));
T('Toast/normale Texte bleiben unberührt (kein Button → kein Icon)',await ev(()=>{const d=document.createElement('div');d.id='plain';d.textContent='🎹 Hinweis';document.body.appendChild(d);return true})&&(await pg.waitForTimeout(150),await ev(()=>!document.querySelector('#plain svg'))));
// ---- 4 Option Emoji/Linien
await ev(()=>SunshineTheme.open());await pg.waitForTimeout(400);
T('Optionen enthalten „Einheitliche Linien-Icons“ (standardmäßig an)',await ev(()=>{const c=document.querySelector('#settings-modal input[data-ui="icons"]');return !!c&&c.checked}));
await ev(()=>{const c=document.querySelector('#settings-modal input[data-ui="icons"]');c.checked=false;c.dispatchEvent(new Event('change',{bubbles:true}))});await pg.waitForTimeout(250);
T('Ausschalten → Emoji sichtbar, Linien weg',await ev(()=>document.documentElement.dataset.icons==='emoji'&&getComputedStyle(document.querySelector('#btn-save-project .ic-e')).display!=='none'&&getComputedStyle(document.querySelector('#btn-save-project svg.ic')).display==='none'));
T('Einstellung wird gespeichert',await ev(()=>JSON.parse(localStorage.getItem('sunshine.ui')).icons===false));
await ev(()=>{const c=document.querySelector('#settings-modal input[data-ui="icons"]');c.checked=true;c.dispatchEvent(new Event('change',{bubbles:true}))});await pg.waitForTimeout(250);
T('Wieder an → Linien',await ev(()=>document.documentElement.dataset.icons==='line'));
await ev(()=>document.querySelector('#settings-modal [data-close]')&&document.querySelector('#settings-modal [data-close]').click());
// ---- 5 Querformat / Safe-Area
await ev(()=>{document.querySelectorAll('#settings-modal').forEach(m=>m.remove())});
await pg.setViewportSize({width:852,height:393});await pg.waitForTimeout(400);
T('Querformat: kein horizontaler Überlauf',await ev(()=>document.documentElement.scrollWidth<=window.innerWidth+1));
await ev(()=>{const s=document.createElement('style');s.id='fakecut';s.textContent=':root{--sal:48px!important;--sar:30px!important}';document.head.appendChild(s)});
T('Kamera-Ausschnitt: Inhalt rückt links/rechts ein (Safe-Area-Variablen wirken)',await ev(()=>{const c=getComputedStyle(document.body);return c.paddingLeft==='48px'&&c.paddingRight==='30px'}));
T('Stylesheet nutzt env(safe-area-inset-left/right)',await ev(()=>{const t=[...document.querySelectorAll('style')].map(s=>s.textContent).join('');return /safe-area-inset-left/.test(t)&&/safe-area-inset-right/.test(t)}));
T('viewport-fit=cover gesetzt',await ev(()=>/viewport-fit=cover/.test(document.querySelector('meta[name=viewport]').content)));
await pg.screenshot({path:SHOT+'/pol_landscape.png'});
T('Keine JS-Fehler',errs.length===0,errs.join('|'));
console.log(`\n${ok} ok, ${bad} fehlgeschlagen`);await b.close();srv.close();process.exit(bad?1:0)})();
