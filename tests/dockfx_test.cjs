/* Dockbar-Effekte (eigene Einstellungen, getrennt vom Cover) + erweiterte Cover-Einstellungen (Tempo, Linienstärke, Farbe, Bewegung) */
const http=require('http'),fs=require('fs'),path=require('path');const {chromium}=require('playwright');
const WORK=process.argv[2];
const srv=http.createServer((q,r)=>{const f=path.join(WORK,decodeURIComponent(q.url.split('?')[0]).replace(/^\//,''));fs.readFile(f,(e,d)=>{if(e){r.writeHead(404);r.end();return;}r.writeHead(200,{'content-type':f.endsWith('.html')?'text/html':'application/octet-stream'});r.end(d)})});
let ok=0,bad=0;const T=(n,c,x)=>{if(c){ok++;console.log('PASS',n)}else{bad++;console.log('FAIL',n,x||'')}};
(async()=>{await new Promise(r=>srv.listen(0,'127.0.0.1',r));const port=srv.address().port;const b=await chromium.launch();
const mk=async(pre)=>{const ctx=await b.newContext({viewport:{width:393,height:852},isMobile:true,hasTouch:true});const pg=await ctx.newPage();pg.errs=[];pg.on('pageerror',e=>pg.errs.push(e.message));await pg.route(/^https?:\/\/(?!127\.0\.0\.1)/,r=>r.abort());
 await pg.addInitScript(p=>{localStorage.setItem('sunshine.home','off');localStorage.setItem('sunshine.news','{"seen":"9.99"}');if(p)for(const k in p)localStorage.setItem(k,p[k])},pre||null);await pg.goto(`http://127.0.0.1:${port}/index_ueberarbeitet.html`,{waitUntil:'load'});await pg.waitForTimeout(1200);return pg};
let pg=await mk();const ev=(f,a)=>pg.evaluate(f,a);
// ---- Standard: alles aus, nichts im DOM
T('Standard: Dock-Effekt AUS, keine Zeichenfläche an der Dockbar, nichts gespeichert',await ev(()=>!DockFx.get().on&&document.querySelectorAll('.cv-rim').length===0&&document.documentElement.dataset.dockfx==='off'&&localStorage.getItem('sunshine.dockfx')===null));
// ---- Optionen
await ev(()=>document.getElementById('btn-settings').click());await pg.waitForTimeout(500);await ev(()=>OptNav.page('fx'));await pg.waitForTimeout(500);
T('Optionen → Effekte: Abschnitt „Dockbar-Effekt“ (Schalter, 14 Effekte, Stärke, Bewegung, Farbe, 5 Regler, 3 Orte, Vorschau)',await ev(()=>{const s=document.getElementById('dfx-sec');return !!s&&s.offsetHeight>0&&!s.querySelector('[data-df-on]').checked&&s.querySelectorAll('[data-df-fxv]').length===14&&s.querySelectorAll('[data-df-gain]').length===3&&s.querySelectorAll('[data-df-mode]').length===3&&s.querySelectorAll('[data-df-color]').length===4&&s.querySelectorAll('[data-df-rng]').length===5&&s.querySelectorAll('[data-df-where]').length===3&&!!s.querySelector('[data-df-pv] canvas.cv-rim')}));
T('Vorschau zeichnet (Beispiel-Beat) – auch bei ausgeschaltetem Effekt',await (async()=>{await pg.waitForTimeout(900);return ev(()=>{const c=document.querySelector('[data-df-pv] canvas.cv-rim');const d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let s=0;for(let i=3;i<d.length;i+=4)s+=d[i];return s>0})})());
// ---- Einschalten
await ev(()=>{const c=document.querySelector('[data-df-on]');c.checked=true;c.dispatchEvent(new Event('change',{bubbles:true}))});await pg.waitForTimeout(400);
T('Einschalten: Zeichenfläche an der DAW-Dockbar, Auswahl gespeichert',await ev(()=>{const n=document.querySelector('#bottom-nav .cv-rim');return !!n&&JSON.parse(localStorage.getItem('sunshine.dockfx')).on===true&&document.documentElement.dataset.dockfx==='on'}));
T('Zeichenfläche deckt die Leiste genau ab und fängt keine Berührungen ab',await ev(()=>{const n=document.querySelector('#bottom-nav .cv-rim'),h=document.querySelector('#bottom-nav'),r=n.getBoundingClientRect(),q=h.getBoundingClientRect();return Math.abs(r.width-q.width)<=2&&Math.abs(r.height-q.height)<=2&&getComputedStyle(n).pointerEvents==='none'}));
// Einstellungen schließen, damit die Leiste frei liegt
await ev(()=>{const m=document.getElementById('settings-modal');if(m)m.remove()});await pg.waitForTimeout(300);
const px=()=>ev(()=>{const c=document.querySelector('#bottom-nav .cv-rim'),x=c.getContext('2d'),d=x.getImageData(0,0,c.width,c.height).data;let s=0,h=0;for(let i=3;i<d.length;i+=4){s+=d[i];h=(h*31+d[i]+d[i-1]*7)|0}const m=x.getImageData(c.width>>1,c.height>>1,1,1).data[3];return{s,h,ctr:m,w:c.width,hgt:c.height}});
await ev(()=>DockFx.set({fx:'ring',mode:'anim'}));await pg.waitForTimeout(900);
const a1=await px();await pg.waitForTimeout(260);const a2=await px();
T('Ring: zeichnet am Rand der Leiste, Mitte bleibt frei',a1.s>0&&a1.ctr===0,JSON.stringify(a1));
T('Bewegung „Animiert“: Bild ändert sich von selbst (Beispiel-Beat, ohne Musik)',a1.h!==a2.h,JSON.stringify([a1,a2]));
await ev(()=>DockFx.set({mode:'static'}));await pg.waitForTimeout(700);
const s1=await px();await pg.waitForTimeout(600);const s2=await px();
T('Bewegung „Starr“: Bild steht still und ist sichtbar',s1.s>0&&s1.h===s2.h,JSON.stringify([s1,s2]));
await ev(()=>DockFx.set({mode:'music'}));await pg.waitForTimeout(700);
const m1=await px();await pg.waitForTimeout(500);const m2=await px();
T('Bewegung „Zur Musik“: ohne Musik ruhig (Bild unverändert), Schleife schläft',m1.h===m2.h&&!(await ev(()=>Object.values(DockFx.needs()).some(Boolean))),JSON.stringify([m1,m2]));
await ev(()=>{audioEngine.masterAnalyser={frequencyBinCount:128,getByteFrequencyData(a){const t=performance.now()/90;for(let i=0;i<a.length;i++)a[i]=Math.max(0,Math.min(255,140+110*Math.sin(t+i*.4)))}};dawState.isPlaying=true});await pg.waitForTimeout(1100);
const p1=await px();await pg.waitForTimeout(240);const p2=await px();
T('Zur Musik: mit Musik reagiert der Effekt (Bild ändert sich, Leiste meldet „braucht Takt“)',p1.s>0&&p1.h!==p2.h&&(await ev(()=>DockFx.needs().daw===true)),JSON.stringify([p1,p2]));
await ev(()=>{dawState.isPlaying=false});await pg.waitForTimeout(1500);
const q1=await px();await pg.waitForTimeout(400);const q2=await px();
T('Musik aus: Effekt klingt aus und steht dann still',q1.h===q2.h,JSON.stringify([q1,q2]));
// ---- Farbmodi
const col=async c=>{await ev(c=>DockFx.set({mode:'static',color:c,fx:'frame',bright:100,trans:0}),c);await pg.waitForTimeout(500);return ev(()=>{const k=document.querySelector('#bottom-nav .cv-rim'),d=k.getContext('2d').getImageData(0,0,k.width,k.height).data;let r=0,g=0,bl=0,n=0;for(let i=0;i<d.length;i+=4)if(d[i+3]>40){r+=d[i];g+=d[i+1];bl+=d[i+2];n++}return n?[r/n,g/n,bl/n].map(Math.round):[0,0,0]})};
const ca=await col('accent'),cb=await col('second'),cr=await col('rainbow');
const dist=(x,y)=>Math.abs(x[0]-y[0])+Math.abs(x[1]-y[1])+Math.abs(x[2]-y[2]);
T('Farbe: „Akzent“, „Zweitfarbe“ und „Regenbogen“ sehen verschieden aus',dist(ca,cb)>40&&dist(ca,cr)>20&&dist(cb,cr)>20,JSON.stringify([ca,cb,cr]));
// ---- Getrennt vom Cover
await ev(()=>DockFx.set({fx:'aura',mode:'anim',color:'theme',speed:160,thick:150}));
T('Dock-Einstellungen ändern das Cover nicht (eigener Speicher)',await ev(()=>{const c=JSON.parse(localStorage.getItem('sunshine.cover')||'{}'),d=JSON.parse(localStorage.getItem('sunshine.dockfx'));return c.fx===undefined&&Cover.settings().fx==='ring'&&Cover.settings().speed===100&&d.fx==='aura'&&d.speed===160&&d.thick===150}));
await ev(()=>Cover.set('fx','dots'));
T('… und umgekehrt: Cover ändern lässt die Dockbar in Ruhe',await ev(()=>DockFx.get().fx==='aura'&&Cover.settings().fx==='dots'));
await ev(()=>Cover.set('fx','ring'));
// ---- Orte
await ev(()=>DockFx.set({daw:false}));await pg.waitForTimeout(300);
T('„DAW“ abgewählt: Zeichenfläche an der DAW-Leiste verschwindet, Rand-Effekt der Leiste wieder zuständig',await ev(()=>!document.querySelector('#bottom-nav .cv-rim')&&document.documentElement.dataset.dockfx==='off'));
await ev(()=>DockFx.set({daw:true}));await pg.waitForTimeout(300);
// ---- Player-Leiste
await ev(()=>{Player.open()});await pg.waitForTimeout(1200);
T('Player geöffnet: auch seine Leiste bekommt den Effekt, die DAW-Leiste schläft',await ev(()=>!!document.querySelector('#pl-dock .cv-rim')&&DockFx.needs().daw===false));
await ev(()=>{Player.close()});await pg.waitForTimeout(500);
// ---- Zurücksetzen
await ev(()=>document.getElementById('btn-settings').click());await pg.waitForTimeout(500);await ev(()=>OptNav.page('fx'));await pg.waitForTimeout(400);
await ev(()=>document.querySelector('[data-df-reset]').click());await pg.waitForTimeout(300);
T('„Zurücksetzen“: Tempo, Linienstärke, Farbe, Bewegung, Größe zurück auf Standard (Effekt-Wahl bleibt)',await ev(()=>{const d=DockFx.get();return d.speed===100&&d.thick===100&&d.color==='theme'&&d.mode==='music'&&d.reach===100&&d.fx==='aura'}));
// ---- Ausschalten räumt auf
await ev(()=>{const c=document.querySelector('[data-df-on]');c.checked=false;c.dispatchEvent(new Event('change',{bubbles:true}))});await pg.waitForTimeout(400);
T('Ausschalten: keine Zeichenfläche mehr an den Leisten',await ev(()=>document.querySelectorAll('#bottom-nav .cv-rim,#pl-dock .cv-rim').length===0&&!DockFx.get().on));
T('Keine JS-Fehler (Dock)',pg.errs.length===0,pg.errs.join('|'));
await pg.context().close();
// ---- Fehlerhafte gespeicherte Werte → Standard
pg=await mk({'sunshine.dockfx':JSON.stringify({on:true,fx:'quatsch',mode:'x',color:5,speed:'a',thick:9999,reach:-3,daw:'ja'}),'sunshine.cover':JSON.stringify({speed:1,thick:3,color:'?',mode:null,fx:'ring'})});
await pg.waitForTimeout(500);
T('Kaputte Dock-Werte werden bereinigt (Effekt/Modus/Farbe/Zahlen)',await pg.evaluate(()=>{const d=DockFx.get();return d.on===true&&d.fx==='ring'&&d.mode==='music'&&d.color==='theme'&&d.speed===100&&d.thick===220&&d.reach===50&&document.querySelectorAll('#bottom-nav .cv-rim').length===1}));
T('Kaputte Cover-Werte werden bereinigt (Tempo/Linienstärke begrenzt, Farbe/Modus Standard)',await pg.evaluate(()=>{const s=Cover.settings();return s.speed===40&&s.thick===50&&s.color==='theme'&&s.mode==='music'}));
// ---- Cover: erweiterte Einstellungen
await pg.evaluate(()=>document.getElementById('btn-settings').click());await pg.waitForTimeout(500);await pg.evaluate(()=>OptNav.page('look'));await pg.waitForTimeout(500);
T('Cover-Optionen: Tempo, Linienstärke, Farbe (4) und Bewegung (3) zusätzlich zu Größe/Helligkeit/Transparenz',await pg.evaluate(()=>{const s=document.getElementById('cv-sec');return s.querySelectorAll('[data-cv-rng]').length===5&&s.querySelectorAll('[data-cv-color]').length===4&&s.querySelectorAll('[data-cv-mode]').length===3&&s.querySelectorAll('[data-cv-fxv]').length===14}));
await pg.evaluate(()=>{const r=document.querySelector('[data-cv-rng=speed]');r.value=180;r.dispatchEvent(new Event('input',{bubbles:true}));r.dispatchEvent(new Event('change',{bubbles:true}));document.querySelector('[data-cv-mode=static]').click();document.querySelector('[data-cv-color=rainbow]').click()});await pg.waitForTimeout(500);
T('Cover: Tempo 180 %, Bewegung „Starr“, Farbe „Regenbogen“ werden gespeichert und angezeigt',await pg.evaluate(()=>{const c=JSON.parse(localStorage.getItem('sunshine.cover'));return c.speed===180&&c.mode==='static'&&c.color==='rainbow'&&document.querySelector('[data-cv-out=speed]').textContent==='180 %'&&document.querySelector('[data-cv-mode=static]').classList.contains('on')}));
T('Cover-Änderungen berühren den Dock-Speicher nicht',await pg.evaluate(()=>DockFx.get().speed===100));
T('Keine JS-Fehler (Cover)',pg.errs.length===0,pg.errs.join('|'));
console.log(`\n${ok} bestanden, ${bad} fehlgeschlagen`);await b.close();srv.close();process.exit(bad?1:0)})();
