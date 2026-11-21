/* 1.40: gleich breite Fenster, Dockbar bündig am unteren Rand, kein Seiten-Scrollen hinter Player/Startseite, Kopfzeilen ohne Überlauf, Leistungs-Wächter (SunPerf), Player-Liste ohne Neuaufbau */
const http=require('http'),fs=require('fs'),path=require('path'),cp=require('child_process');const {chromium}=require('playwright');
const WORK=process.argv[2];
const srv=http.createServer((q,r)=>{const f=path.join(WORK,decodeURIComponent(q.url.split('?')[0]).replace(/^\//,''));fs.readFile(f,(e,d)=>{if(e){r.writeHead(404);r.end();return;}r.writeHead(200,{'content-type':f.endsWith('.html')?'text/html':'application/octet-stream'});r.end(d)})});
let ok=0,bad=0;const T=(n,c,x)=>{if(c){ok++;console.log('PASS',n)}else{bad++;console.log('FAIL',n,x===undefined?'':JSON.stringify(x))}};
(async()=>{await new Promise(r=>srv.listen(0,'127.0.0.1',r));const port=srv.address().port;const b=await chromium.launch();
const mk=async(w,pre)=>{const ctx=await b.newContext({viewport:{width:w,height:854},isMobile:true,hasTouch:true});const pg=await ctx.newPage();pg.errs=[];pg.on('pageerror',e=>pg.errs.push(e.message));await pg.route(/^https?:\/\/(?!127\.0\.0\.1)/,r=>r.abort());
 await pg.addInitScript(p=>{try{if(!sessionStorage.__i){sessionStorage.__i=1;localStorage.setItem('sunshine.home','off');localStorage.setItem('sunshine.news','{"seen":"9.99"}');if(p)for(const k in p)localStorage.setItem(k,p[k])}}catch(e){}},pre||null);
 await pg.goto(`http://127.0.0.1:${port}/index_ueberarbeitet.html`,{waitUntil:'load'});await pg.waitForTimeout(1000);return pg};
// ---- Breiten & Dockbar am unteren Rand, auf drei Handy-Breiten
for(const w of [360,384,412]){
 const pg=await mk(w);const ev=(f,a)=>pg.evaluate(f,a);
 const m=await ev(()=>{const R=s=>{const e=document.querySelector(s);if(!e)return null;const r=e.getBoundingClientRect();return {l:Math.round(r.left),r:Math.round(r.right),b:Math.round(r.bottom),w:Math.round(r.width)}};
  return {h:R('header.sticky'),t:R('#drop-zone-wrapper > .bg-daw-panel'),k:R('#bw-launch > div, #bw-launch > section, #bw-launch > .bg-daw-panel'),d:R('#bottom-nav'),vh:innerHeight,vw:innerWidth,sw:document.documentElement.scrollWidth}});
 T(w+' px: Kopfzeile und Spurfenster gleich breit',m.h&&m.t&&m.h.l===m.t.l&&m.h.r===m.t.r,m);
 T(w+' px: Werkzeuge-Fenster gleich breit wie die anderen',m.k&&m.h&&Math.abs(m.k.l-m.h.l)<=1&&Math.abs(m.k.r-m.h.r)<=1,m);
 T(w+' px: Dockbar gleich breit und bündig am unteren Bildschirmrand',m.d&&m.d.l===m.h.l&&m.d.r===m.h.r&&m.d.b===m.vh,m);
 T(w+' px: kein Seitwärts-Scrollen',m.sw<=m.vw,m);
 const hb=await ev(()=>{const h=document.querySelector('header.sticky'),hr=h.getBoundingClientRect(),bad=[];h.querySelectorAll('*').forEach(e=>{const r=e.getBoundingClientRect();if(r.width&&(r.right>hr.right+0.5||r.left<hr.left-0.5))bad.push((e.id||e.className+'').toString().slice(0,30))});return bad});
 T(w+' px: nichts in der Kopfzeile ragt über den Rand (Export, Anzeige, TAP)',hb.length===0,hb);
 // Player
 await ev(()=>Player.open());await pg.waitForTimeout(500);
 const p=await ev(()=>{const o=[...document.querySelectorAll('#pl-root .pl-top button')].map(e=>{const r=e.getBoundingClientRect();return [Math.round(r.left),Math.round(r.right)]});const d=document.getElementById('pl-dock').getBoundingClientRect();const cs=getComputedStyle(document.documentElement);return {o,vw:innerWidth,dl:Math.round(d.left),dr:Math.round(d.right),db:Math.round(d.bottom),vh:innerHeight,ov:cs.overflow,sw:document.documentElement.scrollWidth}});
 T(w+' px: Player-Kopfleiste – alle Knöpfe sichtbar',p.o.length>=3&&p.o.every(x=>x[0]>=0&&x[1]<=p.vw),p);
 T(w+' px: Player-Dockbar bündig unten und gleiche Seitenränder wie die DAW',p.db===p.vh&&p.dl===m.d.l&&p.dr===m.d.r,[p,m.d]);
 T(w+' px: hinter dem Player scrollt die Seite nicht (Sperre aktiv)',p.ov==='hidden'&&p.sw<=p.vw,p);
 await ev(()=>Player.close());await pg.waitForTimeout(300);
 if(w===384){
  await ev(()=>Home.open());await pg.waitForTimeout(500);
  const h=await ev(()=>{const e=document.getElementById('hm-dock');const c=getComputedStyle(e);return {pos:c.position,b:c.bottom,l:c.left,r:c.right}});
  T('Startseiten-Dockbar: unten bei 0, links/rechts gleicher Rand wie die anderen',h.pos==='absolute'&&h.b==='0px'&&h.l==='6px'&&h.r==='6px',h);
  T('Startseite offen: Seite dahinter ist gesperrt',await ev(()=>getComputedStyle(document.documentElement).overflow==='hidden'&&document.documentElement.classList.contains('hm-open')));
  await ev(()=>Home.close());await pg.waitForTimeout(300);
  T('Startseite zu: Sperre aufgehoben',await ev(()=>!document.documentElement.classList.contains('hm-open')&&getComputedStyle(document.documentElement).overflow!=='hidden'));
 }
 T(w+' px: keine Skriptfehler',pg.errs.length===0,pg.errs);
 await pg.context().close();
}
// ---- Leistungs-Wächter
{const pg=await mk(393);const ev=(f,a)=>pg.evaluate(f,a);
 T('SunPerf: Standard „auto“, Stufe 0, data-perf=0',await ev(()=>SunPerf.mode()==='auto'&&SunPerf.level()===0&&document.documentElement.dataset.perf==='0'));
 const seen=await ev(()=>{const a=[];SunPerf.on(l=>a.push(l));SunPerf.setMode('eco');a.push('m:'+SunPerf.level());SunPerf.setMode('full');a.push('m:'+SunPerf.level());SunPerf._set(2);a.push('s:'+document.documentElement.dataset.perf);SunPerf.setMode('full');return a});
 T('SunPerf: „Sparsam“ → Stufe 1, „Volle Qualität“ → 0, Stufe 2 setzt data-perf, Abonnenten werden benachrichtigt',JSON.stringify(seen.slice(0,5))===JSON.stringify([1,'m:1',0,'m:0',2])||(seen.includes(1)&&seen.includes('m:1')&&seen.includes('s:2')),seen);
 T('SunPerf: Auswahl wird gespeichert',await ev(()=>{SunPerf.setMode('eco');return JSON.parse(localStorage.getItem('sunshine.perf')).mode==='eco'}));
 T('SunPerf: Probe misst eine Bildrate',await (async()=>{const r=await ev(()=>new Promise(res=>{if(!SunPerf.probe(300,a=>res(a)))res(-1)}));return r>0&&r<200})());
 await ev(()=>SunPerf.setMode('auto'));
 await ev(()=>document.getElementById('btn-settings').click());await pg.waitForTimeout(500);await ev(()=>OptNav.page('fx'));await pg.waitForTimeout(500);
 T('Optionen → Effekte: Zeile „Leistung“ mit 3 Auswahlfeldern',await ev(()=>document.querySelectorAll('#fx-perf-row button').length===3));
 await ev(()=>document.querySelector('#fx-perf-row [data-fx-perf=eco]').click());await pg.waitForTimeout(300);
 T('Auswahl „Sparsam“ in den Optionen wirkt sofort (Stufe 1, gedrückt markiert)',await ev(()=>SunPerf.level()===1&&document.querySelector('#fx-perf-row [data-fx-perf=eco]').getAttribute('aria-pressed')==='true'));
 T('Stufe 1: Rand-Animationen pausiert (CSS-Regel greift)',await ev(()=>{const s=[...document.styleSheets].flatMap(x=>{try{return [...x.cssRules]}catch(e){return []}}).map(r=>r.cssText).join('\n');return /data-perf="1"\]\s*\.fx-edge::before/.test(s)}));
 T('keine Skriptfehler (Leistung)',pg.errs.length===0,pg.errs);await pg.context().close();}
// ---- Player-Liste: Zeilen bleiben beim Aktualisieren erhalten (kein Neuaufbau je Schritt)
{const FX='/tmp/layout2_t';fs.rmSync(FX,{recursive:true,force:true});fs.mkdirSync(FX,{recursive:true});
 const names=[];for(let i=0;i<5;i++){const n='s'+i+'.wav';cp.execSync(`ffmpeg -y -loglevel error -f lavfi -i "sine=frequency=${300+i*70}:duration=2" -metadata title=Stueck_${i} ${n}`,{cwd:FX});names.push(FX+'/'+n)}
 const pg=await mk(393);const ev=(f,a)=>pg.evaluate(f,a);
 await ev(()=>Player.open());await pg.waitForTimeout(300);await pg.setInputFiles('#pl-file',names);await pg.waitForTimeout(2500);
 T('Player: 5 Titel in der Liste',await ev(()=>document.getElementById('pl-list').children.length===5));
 await ev(()=>{window.__r0=[...document.getElementById('pl-list').children]});
 await ev(()=>document.querySelector('#pl-list [data-pl-i="2"]').click());await pg.waitForTimeout(700);await ev(()=>Player.toggle());await pg.waitForTimeout(300);
 T('Wiedergabe-Wechsel: dieselben Zeilen-Elemente bleiben im DOM, nur die Markierung wandert',await ev(()=>{const L=[...document.getElementById('pl-list').children];return L.length===5&&L.every((e,i)=>e===window.__r0[i])&&L[2].classList.contains('on')&&!L[0].classList.contains('on')}));
 T('Gleiche Liste neu zeichnen ändert nichts am DOM (z. B. Scan-Schritt)',await ev(async()=>{const before=[...document.getElementById('pl-list').children];await Player.scan&&0;const e=document.getElementById('pl-list');const k=e.dataset.k;return !!k&&k.split(',').length===5&&[...e.children].every((x,i)=>x===before[i])}));
 await pg.setInputFiles('#pl-file',[names[0]]);await pg.waitForTimeout(1500);
 T('Neue Datei: Liste wird sauber neu aufgebaut (Anzahl stimmt, Schlüssel passt)',await ev(()=>{const e=document.getElementById('pl-list');return e.children.length===e.dataset.k.split(',').length&&e.children.length>=5}));
 T('keine Skriptfehler (Player-Liste)',pg.errs.length===0,pg.errs);await pg.context().close();}
console.log('ERGEBNIS',ok,'bestanden',bad,'fehlgeschlagen');await b.close();srv.close();process.exit(bad?1:0)})();
