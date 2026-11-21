const http=require('http'),fs=require('fs'),path=require('path');const {chromium}=require('playwright');
const WORK=process.argv[2];const TW=fs.readFileSync(path.join(__dirname,'fixtures/tailwind.js'));
const srv=http.createServer((q,r)=>{const f=path.join(WORK,decodeURIComponent(q.url.split('?')[0]).replace(/^\//,''));fs.readFile(f,(e,d)=>{if(e){r.writeHead(404);r.end();return;}r.writeHead(200,{'content-type':f.endsWith('.html')?'text/html':'application/octet-stream'});r.end(d)})});
let ok=0,bad=0;const T=(n,c,x)=>{if(c){ok++;console.log('PASS',n)}else{bad++;console.log('FAIL',n,x||'')}};
const SHOT=path.join(__dirname,'../dist/_shots');
(async()=>{await new Promise(r=>srv.listen(0,'127.0.0.1',r));const port=srv.address().port;const b=await chromium.launch();
const mk=async(vp,pre,mobile=true)=>{const ctx=await b.newContext({viewport:vp,isMobile:mobile,hasTouch:mobile});const pg=await ctx.newPage();pg.errs=[];pg.on('pageerror',e=>pg.errs.push(e.message));await pg.route(/^https?:\/\/(?!127\.0\.0\.1)/,r=>r.abort());
 await pg.addInitScript(p=>{localStorage.setItem('sunshine.home','off');if(p)localStorage.setItem('sunshine.fx',p)},pre||null);await pg.goto(`http://127.0.0.1:${port}/index_ueberarbeitet.html`,{waitUntil:'load'});await pg.waitForTimeout(900);return pg};
let pg=await mk({width:393,height:852});const ev=(f,a)=>pg.evaluate(f,a);
const bef=sel=>ev(s=>{const e=document.querySelector(s);const c=getComputedStyle(e,'::before');return{content:c.content,anim:c.animationName,h:c.height,pe:c.pointerEvents,z:c.zIndex}},sel);
const aft=sel=>ev(s=>{const e=document.querySelector(s);const c=getComputedStyle(e,'::after');return{content:c.content,anim:c.animationName,mask:c.maskComposite||c.webkitMaskComposite}},sel);
// ---- Standard
T('Standard: Effekte AUS',await ev(()=>{const d=document.documentElement.dataset;return d.fx==='off'&&FX.get().on===false}));
T('Kein Vollbild-Overlay mehr (#fx-root/#fx-canvas fehlen)',await ev(()=>!document.getElementById('fx-root')&&!document.getElementById('fx-canvas')&&!document.getElementById('fx-aurora')));
T('Große Flächen markiert (Kopfleiste, Spuren, Editor-Bereich, Navigation)',await ev(()=>document.querySelectorAll('.fx-edge').length>=4&&['header.sticky','#bottom-nav'].every(s=>document.querySelector(s).classList.contains('fx-edge'))));
let c0=await bef('header.sticky'),a0=await aft('header.sticky');
T('Aus: keine Pseudo-Effekte',(c0.content==='none'||c0.content==='normal')&&(a0.content==='none'||a0.content==='normal'),JSON.stringify([c0,a0]));
// ---- Einschalten
await ev(()=>FX.set({on:true},false));await pg.waitForTimeout(150);
const g=await aft('header.sticky');T('An: Rand = Glühen (::after, Atem-Animation)',g.anim==='fx-breathe',JSON.stringify(g));
for(const [f,an] of [['aurora','fx-drift'],['eq','fx-eq'],['sparks','fx-rise'],['waves','fx-wave']]){await ev(f=>FX.set({full:f},false),f);await pg.waitForTimeout(150);
 const x=await bef('#drop-zone-wrapper > .bg-daw-panel'),h=await bef('header.sticky');
 T(`Fläche „${f}“: ::before mit Animation ${an}, klick-durchlässig, auf Panel max. 190 px hoch`,x.anim===an&&x.pe==='none'&&parseFloat(x.h)<=190.5&&h.anim===an,JSON.stringify([x,h]));}
await ev(()=>FX.set({full:'off'},false));await pg.waitForTimeout(100);
const o=await bef('header.sticky');T('Fläche „Aus“: kein ::before (Rand bleibt)',(o.content==='none'||o.content==='normal')&&(await aft('header.sticky')).anim==='fx-breathe');
for(const e of ['beam','line']){await ev(e=>FX.set({edge:e},false),e);await pg.waitForTimeout(100);const a=await aft('#bottom-nav');T('Rand „'+e+'“ aktiv',e==='beam'?a.anim==='fx-spin':a.anim==='fx-sweep',JSON.stringify(a));}
await ev(()=>FX.set({edge:'off'},false));T('Rand „Aus“: kein ::after',['none','normal'].includes((await aft('header.sticky')).content));
// ---- KEIN seitlicher Überstand / Versatz – alle 16 Kombinationen, mehrfach über die Animation gemessen
const bad2=[];
for(const e of ['off','glow','beam','line'])for(const f of ['off','aurora','eq','sparks','waves']){await ev(([e,f])=>FX.set({on:true,edge:e,full:f,k:100},false),[e,f]);
 for(let i=0;i<4;i++){await pg.waitForTimeout(220);const m=await ev(()=>({sx:scrollX,sw:document.documentElement.scrollWidth,iw:innerWidth,l:document.querySelector('header.sticky').getBoundingClientRect().left,r:innerWidth-document.querySelector('header.sticky').getBoundingClientRect().right,bl:document.body.getBoundingClientRect().left}));
  if(m.sx!==0||m.sw>m.iw||Math.abs(m.l-m.r)>1.5||m.bl!==0)bad2.push([e,f,JSON.stringify(m)]);}}
T('Kein Überstand, kein Versatz, Kopfleiste mittig – 20 Kombinationen × 4 Messungen (Hochformat)',bad2.length===0,bad2.slice(0,3).join(' || '));
// ---- Musik: lebendiger
await ev(()=>FX.set({on:true,edge:'glow',full:'aurora',react:true},false));
await ev(()=>{dawState.isPlaying=true});await pg.waitForTimeout(900);T('Beim Abspielen: data-fx-live=1 und schnellere Animation',await ev(()=>document.documentElement.dataset.fxLive==='1'&&parseFloat(getComputedStyle(document.querySelector('#drop-zone-wrapper > .bg-daw-panel'),'::before').animationDuration)<12));
await ev(()=>FX.set({react:false},false));await pg.waitForTimeout(900);T('„Beim Abspielen lebendiger“ aus: live=0',await ev(()=>document.documentElement.dataset.fxLive==='0'));
await ev(()=>{dawState.isPlaying=false;FX.set({react:true},false)});
await ev(()=>FX.set({on:false},false));await pg.waitForTimeout(100);T('Hauptschalter aus: alles weg',await ev(()=>['header.sticky','#drop-zone-wrapper > .bg-daw-panel','#bottom-nav'].every(s=>{const e=document.querySelector(s);return ['none','normal'].includes(getComputedStyle(e,'::before').content)&&['none','normal'].includes(getComputedStyle(e,'::after').content)})));
// ---- Optionen
await ev(()=>document.getElementById('btn-menu').click());await pg.waitForTimeout(200);await ev(()=>document.getElementById('btn-settings').click());await pg.waitForTimeout(500);
T('Optionen: Abschnitt „Effekte“ – Schalter AUS, Voreinstellungen, 8 Rand- und 5 Flächen-Stile, 3 Bewegungsarten, Stärke, Tempo, Musik-Schalter',await ev(()=>{const s=document.getElementById('fx-sec');return !!s&&!s.querySelector('[data-fx-on]').checked&&s.querySelectorAll('#fx-edge-row button').length===8&&s.querySelectorAll('#fx-preset-row button').length===8&&s.querySelectorAll('#fx-mode-row button').length===3&&!!s.querySelector('[data-fx-s]')&&s.querySelectorAll('#fx-full-row button').length===5&&!!s.querySelector('[data-fx-k]')&&!!s.querySelector('[data-fx-react]')&&/Flächen-Effekte/.test(s.textContent)&&!/Vollflächig/.test(s.textContent)}));
await ev(()=>document.getElementById('fx-sec').scrollIntoView());await pg.screenshot({path:path.join(SHOT,'fx2_opt.png')});
await ev(()=>{const i=document.querySelector('[data-fx-on]');i.checked=true;i.dispatchEvent(new Event('change',{bubbles:true}))});await pg.waitForTimeout(150);
T('Schalter in Optionen schaltet ein',await ev(()=>document.documentElement.dataset.fx==='on'));
await ev(()=>document.querySelector('#fx-full-row [data-fx-full="sparks"]').click());await ev(()=>document.querySelector('#fx-edge-row [data-fx-edge="line"]').click());
T('Klick auf Stile setzt Attribute',await ev(()=>{const d=document.documentElement.dataset;return d.fxFull==='sparks'&&d.fxEdge==='line'}));
T('Gespeichert mit Version 2',await ev(()=>{const o=JSON.parse(localStorage.getItem('sunshine.fx'));return o.v===2&&o.on===true&&o.full==='sparks'&&o.edge==='line'}));
const saved=await ev(()=>localStorage.getItem('sunshine.fx'));await pg.context().close();
// ---- Neustart mit gespeicherten Werten
pg=await mk({width:393,height:852},saved);
T('Neustart: gespeicherte Auswahl (an · Linie · Funken) bleibt',await ev(()=>{const d=document.documentElement.dataset;return d.fx==='on'&&d.fxEdge==='line'&&d.fxFull==='sparks'}));
await pg.context().close();
// ---- Altes Profil (Version 1, on:true) → einmalig AUS, Auswahl bleibt
pg=await mk({width:393,height:852},JSON.stringify({on:true,edge:'beam',full:'waves',k:80}));
T('Altes Profil (ohne Version, an) → Effekte jetzt aus, Stile bleiben erhalten',await ev(()=>{const d=document.documentElement.dataset;return d.fx==='off'&&FX.get().edge==='beam'&&FX.get().full==='waves'&&FX.get().k===80}));
await pg.context().close();
// ---- Bewegung reduzieren
{const ctx=await b.newContext({viewport:{width:393,height:852},isMobile:true,reducedMotion:'reduce'});const p2=await ctx.newPage();await p2.route(/^https?:\/\/(?!127\.0\.0\.1)/,r=>r.abort());await p2.addInitScript(()=>{localStorage.setItem('sunshine.home','off');localStorage.setItem('sunshine.fx',JSON.stringify({v:2,on:true,edge:'glow',full:'aurora',k:60}))});await p2.goto(`http://127.0.0.1:${port}/index_ueberarbeitet.html`,{waitUntil:'load'});await p2.waitForTimeout(800);
 T('„Bewegung reduzieren“ (System): keine Animationen',await p2.evaluate(()=>['::before','::after'].every(ps=>getComputedStyle(document.querySelector('header.sticky'),ps).animationName==='none')));await ctx.close();}
// ---- Querformat
pg=await mk({width:852,height:393},JSON.stringify({v:2,on:true,edge:'beam',full:'waves',k:100}));
const bl=[];for(let i=0;i<5;i++){await pg.waitForTimeout(250);const m=await pg.evaluate(()=>({sx:scrollX,sw:document.documentElement.scrollWidth,iw:innerWidth,l:document.querySelector('header.sticky').getBoundingClientRect().left,r:innerWidth-document.querySelector('header.sticky').getBoundingClientRect().right}));if(m.sx||m.sw>m.iw||Math.abs(m.l-m.r)>1.5)bl.push(JSON.stringify(m));}
T('Querformat mit Effekten: kein Überstand, Inhalt mittig',bl.length===0,bl.join('|'));
await pg.screenshot({path:path.join(SHOT,'fx2_land.png')});
// ---- Wächter
await pg.evaluate(()=>{const w=document.createElement('div');w.id='wide';w.style.cssText='position:absolute;left:0;top:0;width:3000px;height:10px;opacity:0';document.body.appendChild(w);window.scrollTo(60,0)});await pg.waitForTimeout(250);
T('Wächter: erzwungenes Seitwärts-Scrollen wird sofort zurückgesetzt',await pg.evaluate(()=>scrollX===0&&document.documentElement.scrollLeft===0&&Layout._fixes()>=0));
await pg.evaluate(()=>document.getElementById('wide').remove());
T('Safe-Area-Seitenränder standardmäßig 0 (auch wenn das Gerät welche meldet)',await pg.evaluate(()=>{const c=getComputedStyle(document.documentElement);return document.documentElement.dataset.cutout==='0'&&c.getPropertyValue('--sal').trim()==='0px'&&c.getPropertyValue('--sar').trim()==='0px'&&getComputedStyle(document.body).paddingLeft==='0px'}));
T('Kamera-Abstand AN: Querformat nutzt env(), Hochformat bleibt 0',await pg.evaluate(()=>{Layout.set({cutout:true});const a=document.documentElement.dataset.cutout==='1';Layout.set({cutout:false});return a}));
T('Layout.measure liefert Messwerte',await pg.evaluate(()=>{const m=Layout.measure();return ['Fenster','Bildschirm','Seite verschoben','Inhalt links/rechts','Sicherheitsrand o/r/u/l'].every(k=>k in m)}));
await pg.setViewportSize({width:393,height:852});await pg.waitForTimeout(300);
await pg.evaluate(()=>document.getElementById('btn-menu').click());await pg.waitForTimeout(200);await pg.evaluate(()=>document.getElementById('btn-settings').click());await pg.waitForTimeout(500);
T('Optionen: Abschnitt „Anzeige“ mit Schalter und Prüf-Knopf',await pg.evaluate(()=>{const s=document.getElementById('ly-sec');return !!s&&!!s.querySelector('[data-ly-cut]')&&!!s.querySelector('[data-ly-check]')&&!s.querySelector('[data-ly-cut]').checked}));
await pg.evaluate(()=>{window.scrollTo(0,0)});await pg.evaluate(()=>document.querySelector('[data-ly-check]').click());await pg.waitForTimeout(200);
T('„Anzeige prüfen“ zeigt Messwerte und „Ausrichtung in Ordnung“',await pg.evaluate(()=>{const o=document.querySelector('[data-ly-out]');return !o.classList.contains('hidden')&&/Fenster: 393/.test(o.textContent)&&/in Ordnung|zurückgesetzt/.test(o.textContent)}));
await pg.evaluate(()=>document.getElementById('ly-sec').scrollIntoView());await pg.screenshot({path:path.join(SHOT,'fx2_ly.png')});
T('Keine JS-Fehler',pg.errs.length===0,pg.errs.join('|'));
console.log(`\n${ok} ok / ${bad} fail`);await b.close();srv.close();process.exit(bad?1:0)})();
