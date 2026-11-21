/* Rand-Effekte 2: Voreinstellungen, 8 Rand-Stile, Bewegung (Animiert/Zur Musik/Starr), Tempo, Ansichten (DAW/Player/Startseite), Orte */
const http=require('http'),fs=require('fs'),path=require('path');const {chromium}=require('playwright');
const WORK=process.argv[2];
const srv=http.createServer((q,r)=>{const f=path.join(WORK,decodeURIComponent(q.url.split('?')[0]).replace(/^\//,''));fs.readFile(f,(e,d)=>{if(e){r.writeHead(404);r.end();return;}r.writeHead(200,{'content-type':f.endsWith('.html')?'text/html':'application/octet-stream'});r.end(d)})});
let ok=0,bad=0;const T=(n,c,x)=>{if(c){ok++;console.log('PASS',n)}else{bad++;console.log('FAIL',n,x||'')}};
(async()=>{await new Promise(r=>srv.listen(0,'127.0.0.1',r));const port=srv.address().port;const b=await chromium.launch();
const mk=async(pre)=>{const ctx=await b.newContext({viewport:{width:393,height:852},isMobile:true,hasTouch:true});const pg=await ctx.newPage();pg.errs=[];pg.on('pageerror',e=>pg.errs.push(e.message));await pg.route(/^https?:\/\/(?!127\.0\.0\.1)/,r=>r.abort());
 await pg.addInitScript(p=>{localStorage.setItem('sunshine.home','off');localStorage.setItem('sunshine.news','{"seen":"9.99"}');if(p)for(const k in p)localStorage.setItem(k,p[k])},pre||null);await pg.goto(`http://127.0.0.1:${port}/index_ueberarbeitet.html`,{waitUntil:'load'});await pg.waitForTimeout(1100);return pg};
const pg=await mk();const ev=(f,a)=>pg.evaluate(f,a);
const aft=(sel,prop)=>ev(([s,p])=>{const e=document.querySelector(s);return getComputedStyle(e,'::after')[p]},[sel,prop]);
// ---- Standard
T('Standard: Bewegung „Animiert“, Tempo 100 %, keine Voreinstellung gewählt, alle drei Orte an',await ev(()=>{const f=FX.get();return f.mode==='anim'&&f.speed===100&&f.preset===''&&f.daw&&f.player&&f.home&&document.documentElement.dataset.fxMode==='anim'}));
T('FX-Schnittstelle kennt 8 Rand-Stile, 3 Bewegungen, 8 Voreinstellungen',await ev(()=>FX.edges.length===8&&FX.modes.length===3&&FX.presets.length===8));
// ---- Alle Rand-Stile: erwartete Animation
await ev(()=>FX.set({on:true,full:'off',mode:'anim'},false));
const want={glow:'fx-breathe',beam:'fx-spin',line:'fx-sweep',dual:'fx-spin',rainbow:'fx-spin',dash:'fx-spin',frame:'fx-breathe'};const badE=[];
for(const e in want){await ev(e=>FX.set({edge:e},false),e);await pg.waitForTimeout(120);const an=await aft('#bottom-nav','animationName'),c=await aft('#bottom-nav','content');if(an!==want[e]||c==='none'||c==='normal')badE.push(e+':'+an+'/'+c)}
T('Jeder Rand-Stil zeichnet einen ::after mit der passenden Animation (Glühen, Strahl, Linie, Doppelstrahl, Regenbogen, Lauflinien, Rahmen)',badE.length===0,badE.join(' | '));
await ev(()=>FX.set({edge:'rainbow'},false));
T('Ring-Stile sind als Rahmen maskiert (nur die Kante leuchtet, Inhalt bleibt frei)',await ev(()=>{const c=getComputedStyle(document.querySelector('header.sticky'),'::after');return /exclude|xor/.test(c.webkitMaskComposite+c.maskComposite)&&c.pointerEvents==='none'}));
// ---- kein Überstand mit den neuen Stilen
const over=[];for(const e of ['dual','rainbow','dash','frame'])for(const f of ['off','aurora','eq']){await ev(([e,f])=>FX.set({edge:e,full:f,k:100},false),[e,f]);await pg.waitForTimeout(200);const m=await ev(()=>({sx:scrollX,sw:document.documentElement.scrollWidth,iw:innerWidth}));if(m.sx!==0||m.sw>m.iw)over.push([e,f,JSON.stringify(m)])}
T('Neue Rand-Stile: kein seitlicher Überstand (12 Kombinationen)',over.length===0,over.join('|'));
// ---- Modi
await ev(()=>FX.set({edge:'beam',full:'off',mode:'static'},false));await pg.waitForTimeout(150);
T('Starr: keine Animation am Rand',(await aft('#bottom-nav','animationName'))==='none');
await ev(()=>FX.set({mode:'music'},false));await pg.waitForTimeout(250);
T('Zur Musik, ohne Musik: Rand ruht (Animation pausiert, data-fx-live=0)',(await aft('#bottom-nav','animationPlayState'))==='paused'&&await ev(()=>document.documentElement.dataset.fxLive==='0'));
await ev(()=>{audioEngine.masterAnalyser={frequencyBinCount:128,getByteFrequencyData(a){for(let i=0;i<a.length;i++)a[i]=230}};dawState.isPlaying=true});await pg.waitForTimeout(900);
T('Zur Musik, mit Musik: Animation läuft, Pegel-Stufe >0',(await aft('#bottom-nav','animationPlayState'))==='running'&&await ev(()=>parseFloat(document.documentElement.style.getPropertyValue('--fx-lvl'))>0));
await ev(()=>{audioEngine.masterAnalyser={frequencyBinCount:128,getByteFrequencyData(a){a.fill(0)}}});await pg.waitForTimeout(500);
T('Stille: Pegel-Stufe fällt auf 0',await ev(()=>parseFloat(document.documentElement.style.getPropertyValue('--fx-lvl'))===0));
await ev(()=>{dawState.isPlaying=false;FX.set({mode:'anim'},false)});await pg.waitForTimeout(150);
T('Animiert: läuft immer (auch ohne Musik)',(await aft('#bottom-nav','animationPlayState'))==='running');
T('Pegel-Messung läuft nur im Modus „Zur Musik“ (kein Dauer-Takt sonst)',await ev(()=>{const a=SunTick.count();FX.set({mode:'music'},false);const b=SunTick.count();FX.set({mode:'anim'},false);const c=SunTick.count();return b===a+1&&c===a}));
// ---- Tempo
await ev(()=>FX.set({edge:'beam',speed:200},false));await pg.waitForTimeout(120);
T('Tempo 200 %: Strahl läuft doppelt so schnell (3,5 s statt 7 s)',(await aft('#bottom-nav','animationDuration'))==='3.5s'||(await aft('#bottom-nav','animationDuration'))==='3.500s',await aft('#bottom-nav','animationDuration'));
await ev(()=>FX.set({speed:50},false));await pg.waitForTimeout(120);
T('Tempo 50 %: 14 s',(await aft('#bottom-nav','animationDuration'))==='14s',await aft('#bottom-nav','animationDuration'));
await ev(()=>FX.set({speed:100},false));
// ---- Voreinstellungen
await ev(()=>{FX.set({on:false,preset:''},false);document.getElementById('btn-settings').click()});await pg.waitForTimeout(500);await ev(()=>OptNav.page('fx'));await pg.waitForTimeout(500);
T('Optionen: 8 Voreinstellungen, 8 Rand-Stile, 3 Bewegungen, Tempo-Regler, 3 Orte',await ev(()=>{const s=document.getElementById('fx-sec');return s.querySelectorAll('#fx-preset-row button').length===8&&s.querySelectorAll('#fx-edge-row button').length===8&&s.querySelectorAll('#fx-mode-row button').length===3&&!!s.querySelector('[data-fx-s]')&&s.querySelectorAll('[data-fx-where]').length===3}));
await ev(()=>document.querySelector('[data-fx-preset=club]').click());await pg.waitForTimeout(300);
T('Voreinstellung „Club“: schaltet Effekte ein und setzt Rand, Fläche, Stärke, Bewegung, Tempo',await ev(()=>{const f=FX.get();return f.on&&f.preset==='club'&&f.edge==='dual'&&f.full==='eq'&&f.k===70&&f.mode==='music'&&f.speed===110&&document.querySelector('[data-fx-on]').checked&&document.querySelector('[data-fx-preset=club]').getAttribute('aria-pressed')==='true'&&document.querySelector('[data-fx-k]').value==='70'&&document.getElementById('fx-s-v').textContent==='110%'}));
T('Voreinstellung wird gespeichert',await ev(()=>{const o=JSON.parse(localStorage.getItem('sunshine.fx'));return o.preset==='club'&&o.mode==='music'&&o.speed===110&&o.edge==='dual'}));
await ev(()=>document.querySelector('[data-fx-edge=frame]').click());await pg.waitForTimeout(200);
T('Eigene Änderung (anderer Rand) hebt die Voreinstellung auf',await ev(()=>FX.get().preset===''&&document.querySelector('[data-fx-preset=club]').getAttribute('aria-pressed')==='false'));
await ev(()=>document.querySelector('button[data-fx-mode=static]').click());await pg.waitForTimeout(200);
T('Optionen: Bewegung „Starr“ wählbar, Anzeige zieht nach',await ev(()=>FX.get().mode==='static'&&document.querySelector('button[data-fx-mode=static]').getAttribute('aria-pressed')==='true'&&document.documentElement.dataset.fxMode==='static'),await ev(()=>JSON.stringify([FX.get().mode,document.querySelector('button[data-fx-mode=static]').getAttribute('aria-pressed'),document.documentElement.dataset.fxMode])));
const allOk=await ev(()=>{const bad=[];for(const id of FX.presets){FX.preset(id);const f=FX.get();if(!f.on||f.preset!==id||!FX.edges.includes(f.edge)||!FX.fulls.includes(f.full)||!FX.modes.includes(f.mode))bad.push(id)}return bad.join(',')});
T('Alle Voreinstellungen ergeben gültige Werte',allOk==='',allOk);
// ---- Ansichten: Startseite / Player
await ev(()=>{const m=document.getElementById('settings-modal');if(m)m.remove();FX.set({on:true,edge:'beam',full:'off',mode:'anim',preset:''},false)});
await ev(()=>Home.open());await pg.waitForTimeout(1200);
T('Startseite offen: Ansicht „home“, Karten/Knöpfe tragen Rand-Effekt',await ev(()=>document.documentElement.dataset.fxView==='home'&&document.querySelectorAll('#home-root .fx-edge').length>=3&&document.querySelectorAll('.fx-h').length>=3));
T('Startseite: ihr Rand läuft, der DAW-Rand darunter ruht',await ev(()=>{const h=document.querySelector('.fx-h'),d=document.querySelector('header.sticky');return getComputedStyle(h,'::after').animationPlayState==='running'&&getComputedStyle(d,'::after').animationPlayState==='paused'}));
await ev(()=>Home.close());await pg.waitForTimeout(300);
await ev(()=>Player.open());await pg.waitForTimeout(1200);
T('Player offen: Ansicht „player“, Kopfzeile und Klang-Bereich tragen Rand-Effekt, ihr Rand läuft, DAW ruht',await ev(()=>{const p=document.querySelectorAll('.fx-p'),d=document.querySelector('header.sticky');return document.documentElement.dataset.fxView==='player'&&p.length>=2&&getComputedStyle(p[0],'::after').animationPlayState==='running'&&getComputedStyle(d,'::after').animationPlayState==='paused'}));
// ---- Orte
await ev(()=>FX.set({player:false},false));await pg.waitForTimeout(150);
T('„Player“ abgewählt: Player-Ränder verschwinden, DAW/Startseite bleiben',await ev(()=>{const p=document.querySelector('.fx-p'),d=document.querySelector('header.sticky');return getComputedStyle(p,'::after').display==='none'&&getComputedStyle(d,'::after').display!=='none'}));
await ev(()=>{FX.set({player:true},false);Player.close()});await pg.waitForTimeout(300);
await ev(()=>FX.set({daw:false},false));await pg.waitForTimeout(150);
T('„DAW“ abgewählt: Kopfleiste/Bereiche ohne Rand-Effekt',await ev(()=>getComputedStyle(document.querySelector('header.sticky'),'::after').display==='none'));
await ev(()=>FX.set({daw:true},false));
// ---- Dockbar-Effekt ersetzt den Rand-Effekt der DAW-Leiste
await ev(()=>DockFx.set({on:true}));await pg.waitForTimeout(300);
T('Dockbar-Effekt an: Rand-Effekt der DAW-Leiste weicht (kein Doppel-Effekt), Kopfleiste bleibt',await ev(()=>getComputedStyle(document.querySelector('#bottom-nav'),'::after').display==='none'&&getComputedStyle(document.querySelector('header.sticky'),'::after').display!=='none'));
await ev(()=>DockFx.set({on:false}));
// ---- Aus: nichts mehr
await ev(()=>FX.set({on:false},false));await pg.waitForTimeout(200);
T('Hauptschalter aus: kein Pegel-Takt, kein Pseudo-Effekt',await ev(()=>{const c=getComputedStyle(document.querySelector('header.sticky'),'::after').content;return (c==='none'||c==='normal')&&document.documentElement.dataset.fxLive==='0'}));
// ---- Altes Format wird gelesen
const pg2=await mk({'sunshine.fx':JSON.stringify({v:2,on:true,edge:'beam',full:'eq',k:40,react:true})});
T('Gespeicherte Einstellungen aus 1.37 (ohne Modus/Tempo) laden mit Standardwerten',await pg2.evaluate(()=>{const f=FX.get();return f.on&&f.edge==='beam'&&f.full==='eq'&&f.mode==='anim'&&f.speed===100&&f.preset===''&&document.documentElement.dataset.fxMode==='anim'}));
const pg3=await mk({'sunshine.fx':JSON.stringify({v:2,on:true,edge:'xyz',mode:'??',speed:9999,preset:'nix'})});
T('Kaputte Werte → Standard / begrenzt',await pg3.evaluate(()=>{const f=FX.get();return f.edge==='glow'&&f.mode==='anim'&&f.speed===200&&f.preset===''}));
T('Keine JS-Fehler',pg.errs.length===0&&pg2.errs.length===0&&pg3.errs.length===0,[pg,pg2,pg3].map(p=>p.errs.join('|')).join(' // '));
console.log(`\n${ok} bestanden, ${bad} fehlgeschlagen`);await b.close();srv.close();process.exit(bad?1:0)})();
