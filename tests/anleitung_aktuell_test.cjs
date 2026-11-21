/* 1.47: Rundgang und Handbuch sind auf dem Stand der App – neue Kapitel/Schritte, keine veralteten Aussagen, Optionen-Pfade stimmen */
const http=require('http'),fs=require('fs'),path=require('path');const {chromium}=require('playwright');
const WORK=process.argv[2];
const srv=http.createServer((q,r)=>{const f=path.join(WORK,decodeURIComponent(q.url.split('?')[0]).replace(/^\//,''));fs.readFile(f,(e,d)=>{if(e){r.writeHead(404);r.end();return;}r.writeHead(200,{'content-type':f.endsWith('.html')?'text/html':'application/octet-stream'});r.end(d)})});
let ok=0,bad=0;const T=(n,c,x)=>{if(c){ok++;console.log('PASS',n)}else{bad++;console.log('FAIL',n,x===undefined?'':JSON.stringify(x))}};
(async()=>{await new Promise(r=>srv.listen(0,'127.0.0.1',r));const port=srv.address().port;const b=await chromium.launch();
const mk=async(vp,touch)=>{const ctx=await b.newContext({viewport:vp,isMobile:touch,hasTouch:touch});const pg=await ctx.newPage();pg.errs=[];pg.on('pageerror',e=>pg.errs.push(e.message));await pg.route(/^https?:\/\/(?!127\.0\.0\.1)/,r=>r.abort());
 await pg.addInitScript(()=>{try{if(!sessionStorage.__i){sessionStorage.__i=1;localStorage.setItem('sunshine.home','off');localStorage.setItem('sunshine.news','{"seen":"9.99"}');localStorage.setItem('sunshine.optnav','on')}}catch(e){}});
 await pg.goto(`http://127.0.0.1:${port}/index_ueberarbeitet.html`,{waitUntil:'load'});await pg.waitForTimeout(1400);return pg};
let pg=await mk({width:393,height:852},true);const ev=(f,a)=>pg.evaluate(f,a);
// ---- Kapitel und Touren
const ch=await ev(()=>Help.chapters()),tours=await ev(()=>Help.tours());
T('Kapitel-IDs eindeutig, Zentrale & Schnellwahl und Labor sind eigene Kapitel',new Set(ch).size===ch.length&&ch.includes('zentrale')&&ch.includes('labor'),ch);
T('Neue Mini-Rundgänge: zentrale, player, cover, labor',['zentrale','player','cover','labor'].every(t=>tours.includes(t)),tours);
// ---- Handbuch-Text
await ev(()=>Help.openManual());await pg.waitForTimeout(300);
const man=await ev(()=>document.getElementById('hp-man').textContent.replace(/\s+/g,' '));
const must=['Schnellwahl','Zentrale','Labor (Beta)','Dockbar-Effekt','Seiten der Fenster','Leistungs-Wächter','Beim Start öffnen','MP3','128, 192 oder 320','eigener Ordner-Dialog','Listenfenster','Leistung & Speicher','Titel als Spur'];
const miss=must.filter(m=>!man.includes(m));T('Handbuch nennt alle neuen Funktionen',miss.length===0,miss);
const stale=['MP3</b> kann die App nicht','kann die App nicht erzeugen','folgt mit dem nächsten App-Update','bleibt nur, bis du die App schließt','Spur kann die App nicht','Player-Seite','Playbar der DAW','vier Seiten','Stabilität & Leistung → Sparmodus'].filter(m=>man.includes(m));
T('Keine veralteten Aussagen mehr im Handbuch',stale.length===0,stale);
T('Handbuch: Menüpunkte „Feedback senden“ und Zentrale statt ☰ am Handy erklärt',/Feedback senden/.test(man)&&/Zentrale/.test(man));
// ---- Optionen-Pfade im Handbuch/Rundgang existieren wirklich
await ev(()=>Help.closeManual());
const real=await ev(()=>{document.getElementById('btn-settings')&&document.getElementById('btn-settings').click();return null});
await pg.waitForTimeout(500);
const names=await ev(async()=>{const set=new Set();document.querySelectorAll('#on-home .on-card b,#on-home .on-card .on-t,#on-home .on-card strong').forEach(e=>set.add(e.textContent.trim()));
 [...document.querySelectorAll('[data-on-go]')].forEach(c=>{const t=c.querySelector('b,strong,.on-t,span');if(t)set.add(t.textContent.trim())});
 for(const c of [...document.querySelectorAll('[data-on-go]')].map(c=>c.dataset.onGo)){OptNav.open(c);await new Promise(r=>setTimeout(r,200));document.querySelectorAll('#settings-modal .on-unit:not([hidden]) *').forEach(e=>{if(e.children.length===0&&/^(H[1-6]|DIV|SPAN)$/.test(e.tagName)&&e.textContent.trim().length>2&&e.textContent.trim().length<45)set.add(e.textContent.trim())})}
 return [...set]});
const html=await ev(()=>{Help.openManual();const t=document.getElementById('hp-man').innerHTML;Help.closeManual();return t});
const txt=html.replace(/<[^>]+>/g,' ').replace(/&amp;/g,'&').replace(/\s+/g,' ');
const paths=[...txt.matchAll(/Optionen → ([^→.;:,()„“]+?)(?= →|[.;:,()„“]| und | oder |$)/g)].map(m=>m[1].trim().replace(/\s+/g,' '));
const lc=names.map(n=>n.toLowerCase());const unknown=[...new Set(paths)].filter(p=>!lc.some(n=>n===p.toLowerCase()||n.startsWith(p.toLowerCase())||p.toLowerCase().startsWith(n)));
console.log('  Pfade:',JSON.stringify([...new Set(paths)]),'| Namen:',names.length);
T('Alle „Optionen → …“-Pfade im Handbuch beginnen mit einer echten Kategorie/Überschrift (mind. 10 Pfade geprüft)',unknown.length===0&&paths.length>=10&&names.length>=15,{unknown,n:paths.length,names:names.length});
// ---- Rundgang: neue Schritte
await ev(()=>Help.startTour('rundgang'));await pg.waitForTimeout(300);
const keys=await ev(async()=>{const k=[];for(let i=0;i<40;i++){const s=Help._state();k.push(s.key);if(s.i>=s.n-1)break;document.querySelector('#hp-tour [data-act="next"]').click();await new Promise(r=>setTimeout(r,350))}return k});
T('Rundgang (Handy) führt durch Cover, Schnellwahl und Player',['cover','schnell','player','nav'].every(k=>keys.includes(k))&&keys[keys.length-1]==='done',keys);
T('Reihenfolge: Schnellwahl nach der unteren Leiste, Player kurz vor dem Ende',keys.indexOf('schnell')===keys.indexOf('nav')+1&&keys.indexOf('player')===keys.length-2,keys);
await ev(()=>Help.endTour(false));
for(const [t,want] of [['zentrale',['schnell','player','settings']],['player',['player']],['cover',['cover']],['labor',['settings']]]){
 await ev(t=>Help.startTour(t),t);await pg.waitForTimeout(500);
 const st=await ev(()=>({n:Help._state().n,key:Help._state().key,ring:!!document.querySelector('#hp-tour .hp-ring, #hp-tour .hp-hole')||!!document.getElementById('hp-tour')}));
 T('Mini-Rundgang „'+t+'“ startet mit '+want.length+' Schritt(en)',st.n===want.length&&st.key===want[0]&&st.ring,st);await ev(()=>Help.endTour(false));}
// ---- Schnellwahl-Schritt hebt den Strich/Leiste hervor, Player-Schritt die Player-Taste
await ev(()=>Help.startTour('zentrale'));await pg.waitForTimeout(500);
T('Schritt „Schnellwahl“ zielt auf Strich oder Dockbar (sichtbar im Bildschirm)',await ev(()=>{const r=document.querySelector('#hp-tour .hp-ring');if(!r)return false;const b=r.getBoundingClientRect();return b.width>10&&b.height>5&&b.bottom<=innerHeight+2}));
await ev(()=>document.querySelector('#hp-tour [data-act="next"]').click());await pg.waitForTimeout(700);
T('Schritt „Player“ zeigt die Player-Taste der Zentrale',await ev(()=>{const r=document.querySelector('#hp-tour .hp-ring');const t=document.querySelector('#bottom-nav [data-zt=player]');if(!r||!t)return false;const a=r.getBoundingClientRect(),c=t.getBoundingClientRect();return Math.abs((a.left+a.width/2)-(c.left+c.width/2))<30&&Math.abs((a.top+a.height/2)-(c.top+c.height/2))<30}));
await ev(()=>Help.endTour(false));
T('Keine JS-Fehler (Handy)',pg.errs.length===0,pg.errs.slice(0,3));
// ---- großer Bildschirm: Schritte ohne Dockbar werden übersprungen, Player über das ☰-Menü
const pd=await mk({width:1280,height:800},false);const evd=(f,a)=>pd.evaluate(f,a);
const kd=await evd(async()=>{Help.startTour('rundgang');await new Promise(r=>setTimeout(r,400));const k=[];for(let i=0;i<40;i++){const s=Help._state();k.push(s.key);if(s.i>=s.n-1)break;document.querySelector('#hp-tour [data-act="next"]').click();await new Promise(r=>setTimeout(r,350))}return k});
T('Großer Bildschirm: „Schnellwahl“ entfällt, „Player“ bleibt (über ☰)',!kd.includes('schnell')&&kd.includes('player')&&kd.includes('cover')&&kd[kd.length-1]==='done',kd);
T('Keine JS-Fehler (Desktop)',pd.errs.length===0,pd.errs.slice(0,3));
console.log(`\n${ok} ok / ${bad} fail`);await b.close();srv.close();process.exit(bad?1:0)})();
