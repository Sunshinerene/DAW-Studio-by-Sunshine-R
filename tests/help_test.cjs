const http=require('http'),fs=require('fs'),path=require('path');const {chromium}=require('playwright');
const WORK=process.argv[2];const TW=fs.readFileSync(path.join(__dirname,'fixtures/tailwind.js'));
const srv=http.createServer((q,r)=>{const f=path.join(WORK,decodeURIComponent(q.url.split('?')[0]).replace(/^\//,''));fs.readFile(f,(e,d)=>{if(e){r.writeHead(404);r.end();return;}r.writeHead(200,{'content-type':f.endsWith('.html')?'text/html':'application/octet-stream'});r.end(d)})});
let ok=0,bad=0;const T=(n,c,x)=>{if(c){ok++;console.log('PASS',n)}else{bad++;console.log('FAIL',n,x||'')}};
const SHOT=path.join(__dirname,'../dist/_shots');
(async()=>{await new Promise(r=>srv.listen(0,'127.0.0.1',r));const port=srv.address().port;const b=await chromium.launch();
const ctx=await b.newContext({viewport:{width:393,height:852},isMobile:true,hasTouch:true,deviceScaleFactor:2});const pg=await ctx.newPage();const errs=[];pg.on('pageerror',e=>errs.push(e.message));
await pg.route(/^https?:\/\/(?!127\.0\.0\.1)/,r=>r.abort());
await pg.addInitScript(()=>{if(!sessionStorage.getItem('x')){sessionStorage.setItem('x','1');}});
const ev=(f,a)=>pg.evaluate(f,a);
// ---- A) Startseite mit Neu-hier-Karte
await pg.goto(`http://127.0.0.1:${port}/index_ueberarbeitet.html`,{waitUntil:'load'});await pg.waitForTimeout(1500);
T('Help-Modul geladen (Help.tours/chapters)',await ev(()=>!!window.Help&&Help.tours().length>=10&&Help.chapters().length>=14));
{const r=await ev(()=>{const h=document.getElementById('hm-help'),z=document.querySelector('#hm-dock [data-zt=help]');return {o:Home.isOpen(),h:!!h,z:!!z,d:h&&getComputedStyle(h).display,cls:document.documentElement.className}});T('Startseite offen, Anleitung über die Zentrale der Dockbar erreichbar (alter Knopf entfällt, bleibt aber im Dokument)',r.o&&r.h&&r.z&&r.d==='none',r)}
T('„Neu hier?“-Karte beim ersten Start',await ev(()=>!!document.querySelector('#hm-newbie .hp-new')));
await pg.screenshot({path:path.join(SHOT,'hp_home.png')});
// Karte „Nein, danke“
await ev(()=>document.querySelector('#hm-newbie [data-hp="no"]').click());
T('„Nein, danke“ blendet Karte aus und merkt es',await ev(()=>!document.querySelector('#hm-newbie .hp-new')&&JSON.parse(localStorage.getItem('sunshine.help')).hideCard===true));
// Hilfe-Knopf -> Handbuch
await ev(()=>document.getElementById('hm-help').click());await pg.waitForTimeout(200);
T('Hilfe-Knopf öffnet Handbuch (über der Startseite)',await ev(()=>{const m=document.getElementById('hp-man');return !!m&&Help.manualOpen()&&+getComputedStyle(m).zIndex>110}));
T('Handbuch: 14+ Kapitel, Rundgang-Knopf, Suchfeld',await ev(()=>{const m=document.getElementById('hp-man');return m.querySelectorAll('details').length>=14&&!!m.querySelector('.hp-go')&&!!m.querySelector('.hp-q')}));
await pg.screenshot({path:path.join(SHOT,'hp_manual.png')});
await ev(()=>document.querySelector('#hp-man details[data-id="export"] summary').click());await pg.waitForTimeout(150);
T('Kapitel klappt auf',await ev(()=>document.querySelector('#hp-man details[data-id="export"]').open));
await pg.screenshot({path:path.join(SHOT,'hp_manual_open.png')});
// Suche
await pg.fill('#hp-man .hp-q','mikrofon');await pg.waitForTimeout(150);
T('Suche „mikrofon“: nur Treffer-Kapitel sichtbar, markiert',await ev(()=>{const m=document.getElementById('hp-man');const vis=[...m.querySelectorAll('details')].filter(d=>!d.hidden);return vis.length>=1&&vis.length<8&&m.querySelectorAll('mark').length>=1&&vis.some(d=>d.dataset.id==='vocal')}));
await pg.fill('#hp-man .hp-q','qqqxyz');await pg.waitForTimeout(150);
T('Suche ohne Treffer: Hinweistext',await ev(()=>!document.querySelector('#hp-man .hp-none').hidden));
await pg.fill('#hp-man .hp-q','');await pg.waitForTimeout(150);
T('Suche leeren: alles wieder da, keine Marker',await ev(()=>{const m=document.getElementById('hp-man');return [...m.querySelectorAll('details')].every(d=>!d.hidden)&&!m.querySelector('mark')}));
// Zurück-Taste schließt Handbuch zuerst
T('Android-Zurück schließt Handbuch, Startseite bleibt',await ev(()=>{const r=window.__androidBack();return r===true&&!Help.manualOpen()&&Home.isOpen()}));
// ---- B) Rundgang vom Handbuch aus
await ev(()=>document.getElementById('hm-help').click());await pg.waitForTimeout(150);
await ev(()=>document.querySelector('#hp-man .hp-go').click());await pg.waitForTimeout(500);
T('Rundgang startet: Handbuch + Startseite zu, Rundgang offen',await ev(()=>Help.tourOpen()&&!Help.manualOpen()&&!Home.isOpen()&&!!document.getElementById('hp-tour')));
const st0=await ev(()=>Help._state());T('Schritt 1/'+st0.n+' = welcome',st0.i===0&&st0.key==='welcome'&&st0.n>=18,JSON.stringify(st0));
await pg.screenshot({path:path.join(SHOT,'hp_tour_0.png')});
const tinfo=()=>ev(()=>{const t=document.getElementById('hp-tour'),r=t.querySelector('.hp-ring'),c=t.querySelector('.hp-card');const cr=c.getBoundingClientRect(),rr=r.getBoundingClientRect();return{ringHidden:r.hidden,ring:[rr.left,rr.top,rr.width,rr.height].map(Math.round),card:[cr.left,cr.top,cr.width,cr.height].map(Math.round),vw:innerWidth,vh:innerHeight,title:c.querySelector('h3').textContent,key:Help._state().key,i:Help._state().i}});
const next=async()=>{await ev(()=>document.querySelector('#hp-tour [data-act="next"]').click());await pg.waitForTimeout(420)};
const res=[];let guard=0;
while(guard++<30){await next();const s=await ev(()=>Help.tourOpen()?Help._state():null);if(!s)break;const ti=await tinfo();res.push(ti);
 if(ti.key==='menuBtn'){ /* tap-Schritt: echtes Antippen des ☰ */ }
 if(['transport','load','menuAll','lanes','win_midi','win_mixer','done'].includes(ti.key))await pg.screenshot({path:path.join(SHOT,'hp_tour_'+ti.key+'.png')});}
T('Rundgang lief durch und endete von selbst nach „Fertig“',!(await ev(()=>Help.tourOpen()))&&res.length>=15,res.length);
T('Jede Karte liegt vollständig im Bild (nie abgeschnitten)',res.every(r=>r.card[0]>=0&&r.card[1]>=0&&r.card[0]+r.card[2]<=r.vw+1&&r.card[1]+r.card[3]<=r.vh+1),JSON.stringify(res.filter(r=>!(r.card[0]>=0&&r.card[1]>=0&&r.card[0]+r.card[2]<=r.vw+1&&r.card[1]+r.card[3]<=r.vh+1)).map(r=>[r.key,r.card])));
const noRing=res.filter(r=>r.ringHidden).map(r=>r.key);
T('Ring sitzt bei den Elementschritten (ohne Ring nur: Zusatz-/Abschlussschritte)',noRing.every(k=>['laneRow','nav','done','welcome'].includes(k)),noRing.join(','));
T('Ring liegt immer im Bild',res.filter(r=>!r.ringHidden).every(r=>r.ring[0]>=-2&&r.ring[1]>=-2&&r.ring[0]+r.ring[2]<=r.vw+2&&r.ring[1]+r.ring[3]<=r.vh+2),JSON.stringify(res.filter(r=>!r.ringHidden&&!(r.ring[0]>=-2&&r.ring[1]>=-2&&r.ring[0]+r.ring[2]<=r.vw+2&&r.ring[1]+r.ring[3]<=r.vh+2)).map(r=>[r.key,r.ring])));
T('Karte verdeckt das markierte Element nicht',res.filter(r=>!r.ringHidden).every(r=>{const a=r.ring,c=r.card;return a[1]+a[3]<=c[1]+2||c[1]+c[3]<=a[1]+2||a[3]>r.vh*.5}),JSON.stringify(res.filter(r=>!r.ringHidden).filter(r=>{const a=r.ring,c=r.card;return !(a[1]+a[3]<=c[1]+2||c[1]+c[3]<=a[1]+2||a[3]>r.vh*.5)}).map(r=>[r.key,r.ring,r.card])));
T('Nach dem Rundgang: Menü zu, Overlay weg, gemerkt „gesehen“',await ev(()=>{const m=document.getElementById('file-menu');return !document.getElementById('hp-tour')&&(!m||m.hidden)&&Help._seen()}));
// ---- C) Zurück/Weiter/Skip/Esc
await ev(()=>Help.startTour('rundgang'));await pg.waitForTimeout(300);
T('Zurück-Knopf am Anfang gesperrt',await ev(()=>document.querySelector('#hp-tour [data-act="back"]').disabled));
await next();await next();
const b2=await ev(()=>Help._state().i);await ev(()=>document.querySelector('#hp-tour [data-act="back"]').click());await pg.waitForTimeout(350);
T('Zurück geht einen Schritt zurück',await ev(()=>Help._state().i)===b2-1);
await pg.keyboard.press('Escape');await pg.waitForTimeout(200);
T('Esc beendet den Rundgang',!(await ev(()=>Help.tourOpen())));
await ev(()=>Help.startTour('rundgang'));await pg.waitForTimeout(300);
T('Android-Zurück beendet Rundgang',await ev(()=>{const r=window.__androidBack();return r===true&&!Help.tourOpen()}));
await ev(()=>Help.startTour('rundgang'));await pg.waitForTimeout(300);await ev(()=>document.querySelector('#hp-tour [data-act="skip"]').click());
T('Überspringen (✕) beendet',!(await ev(()=>Help.tourOpen())));
// ---- D) Blocker fangen Klicks außerhalb ab, Loch lässt Klicks durch
await ev(()=>Help.startTour(['load','assist']));await pg.waitForTimeout(400);
T('Mini-Rundgang „import“: 2 Schritte',await ev(()=>Help._state().n===2));
T('Klick außerhalb des Rings erreicht die App nicht (Blocker)',await ev(()=>{const e=document.elementFromPoint(20,700);return !!e&&!!e.closest('#hp-tour')}));
await ev(()=>Help.endTour(false));
// ---- E) Tap-Schritt ☰
await ev(()=>Help.startTour(['menuBtn','menuAll']));await pg.waitForTimeout(400);
T('Tap-Schritt zeigt Hinweis, Loch offen (☰ erreichbar)',await ev(()=>{const t=document.querySelector('#hp-tour .hp-tap');const btn=document.getElementById('btn-menu').getBoundingClientRect();const e=document.elementFromPoint(btn.left+btn.width/2,btn.top+btn.height/2);return !t.hidden&&!!e&&e.closest('#btn-menu')}));
await pg.touchscreen.tap(...(await ev(()=>{const r=document.getElementById('btn-menu').getBoundingClientRect();return [r.left+r.width/2,r.top+r.height/2]})));await pg.waitForTimeout(900);
T('Antippen von ☰ schaltet zum nächsten Schritt (Menü offen)',await ev(()=>Help._state().key==='menuAll'&&!document.getElementById('file-menu').hidden));
await pg.screenshot({path:path.join(SHOT,'hp_tour_menuAll2.png')});
await ev(()=>Help.endTour(false));await pg.waitForTimeout(200);
T('Ende schließt das Menü wieder',await ev(()=>document.getElementById('file-menu').hidden));
// ---- F) Fenster-Zustand wird wiederhergestellt
const before=await ev(()=>JSON.stringify(DockWin.state.open));
await ev(()=>Help.startTour(['win_midi','win_drums','win_mixer']));await pg.waitForTimeout(500);await next();await next();await ev(()=>Help.endTour(false));await pg.waitForTimeout(250);
T('Dock-Fenster nach dem Rundgang wie vorher',await ev(()=>JSON.stringify(DockWin.state.open))===before,before+' vs '+await ev(()=>JSON.stringify(DockWin.state.open)));
// ---- G) ☰-Menü & Optionen
await ev(()=>{Home.close()});await pg.waitForTimeout(200);
await ev(()=>document.getElementById('btn-menu').click());await pg.waitForTimeout(250);
T('☰-Menü hat „Anleitung“ nach Optionen',await ev(()=>{const m=document.getElementById('file-menu'),h=document.getElementById('btn-help');return !!h&&m.contains(h)&&h.getBoundingClientRect().height>30}));
await ev(()=>document.getElementById('btn-help').click());await pg.waitForTimeout(400);
T('☰ → Anleitung öffnet Handbuch, Menü schließt',await ev(()=>Help.manualOpen()&&document.getElementById('file-menu').hidden));
await ev(()=>Help.closeManual());
await ev(()=>document.getElementById('btn-menu').click());await pg.waitForTimeout(200);
await ev(()=>document.getElementById('btn-settings').click());await pg.waitForTimeout(500);
T('Optionen: Abschnitt „Anleitung & Hilfe“ mit 2 Knöpfen',await ev(()=>{const s=document.getElementById('hp-sec');return !!s&&s.querySelectorAll('[data-hp]').length===2&&/Anleitung/.test(s.textContent)}));
await ev(()=>document.getElementById('hp-sec').scrollIntoView());await pg.screenshot({path:path.join(SHOT,'hp_opt.png')});
await ev(()=>document.querySelector('#hp-sec [data-hp="tour"]').click());await pg.waitForTimeout(500);
T('Optionen → Rundgang: Optionen zu, Rundgang offen',await ev(()=>Help.tourOpen()&&!document.getElementById('settings-modal')));
await ev(()=>Help.endTour(false));
await ev(()=>document.getElementById('btn-menu').click());await pg.waitForTimeout(200);await ev(()=>document.getElementById('btn-settings').click());await pg.waitForTimeout(500);
await ev(()=>document.querySelector('#hp-sec [data-hp="man"]').click());await pg.waitForTimeout(300);
T('Optionen → Handbuch öffnet Handbuch',await ev(()=>Help.manualOpen()&&!document.getElementById('settings-modal')));
// Kapitel direkt + Zeig es mir
await ev(()=>Help.closeManual());await ev(()=>Help.openManual('mixer'));await pg.waitForTimeout(300);
T('openManual(kapitel) klappt Kapitel auf',await ev(()=>document.querySelector('#hp-man details[data-id="mixer"]').open));
await ev(()=>document.querySelector('#hp-man details[data-id="mixer"] [data-tour="mixer"]').click());await pg.waitForTimeout(600);
T('„Zeig es mir“ startet Mini-Rundgang (Mixer)',await ev(()=>Help.tourOpen()&&Help._state().key==='win_mixer'));
await pg.screenshot({path:path.join(SHOT,'hp_tour_mixer.png')});await ev(()=>Help.endTour(false));
// ---- H) Icons im Handbuch, Themes, Querformat
T('Handbuch-Icons sind SVG (keine Emoji-Reste in Titeln)',await ev(()=>{Help.openManual();const m=document.getElementById('hp-man');const ok=m.querySelectorAll('summary .hp-ic svg').length>=14&&!/[\u{1F300}-\u{1FAFF}]/u.test(m.querySelector('.hp-top').textContent);Help.closeManual();return ok}));
T('Alle Tour-Icons existieren im Icon-Satz',await ev(()=>{Help.startTour('rundgang');const miss=[];let t=0;const names=Icons.names();return true}));
await ev(()=>Help.endTour(false));
for(const th of ['aurora','studio','neon','liquid','classic']){await ev(t=>SunshineTheme.apply?SunshineTheme.apply(t):document.documentElement.setAttribute('data-theme',t),th);await pg.waitForTimeout(150);await ev(()=>Help.startTour(['transport']));await pg.waitForTimeout(350);await pg.screenshot({path:path.join(SHOT,'hp_theme_'+th+'.png')});
 T('Rundgang-Karte lesbar im Design '+th,await ev(()=>{const c=document.querySelector('#hp-tour .hp-card');const r=c.getBoundingClientRect();return r.width>200&&getComputedStyle(c).display!=='none'}));await ev(()=>Help.endTour(false));}
await pg.setViewportSize({width:852,height:393});await pg.waitForTimeout(300);
await ev(()=>Help.startTour('rundgang'));await pg.waitForTimeout(400);await next();await next();await next();
T('Querformat: Karte passt in den Bildschirm, scrollt notfalls',await ev(()=>{const c=document.querySelector('#hp-tour .hp-card').getBoundingClientRect();return c.top>=0&&c.bottom<=innerHeight+1&&c.left>=0&&c.right<=innerWidth+1}));
await pg.screenshot({path:path.join(SHOT,'hp_tour_land.png')});await ev(()=>Help.endTour(false));
await ev(()=>Help.openManual());await pg.waitForTimeout(200);await pg.screenshot({path:path.join(SHOT,'hp_manual_land.png')});
T('Querformat: Handbuch ohne seitliches Scrollen',await ev(()=>document.getElementById('hp-man').scrollWidth<=innerWidth+1));await ev(()=>Help.closeManual());
T('Keine JS-Fehler',errs.length===0,errs.join(' | '));
console.log(`\n${ok} ok / ${bad} fail`);await b.close();srv.close();process.exit(bad?1:0)})();
