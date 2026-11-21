const http=require('http'),fs=require('fs'),path=require('path');const {chromium}=require('playwright');
const WORK=process.argv[2];
const srv=http.createServer((q,r)=>{const u=new URL(q.url,'http://x');const f=path.join(WORK,decodeURIComponent(u.pathname).replace(/^\//,''));fs.readFile(f,(e,d)=>{if(e){r.writeHead(404);r.end();return;}
 let body=d;if(/\.html$/.test(f)){let t=d.toString();if(u.searchParams.get('repo'))t=t.replace("repo:'__BUILD_REPO__'","repo:'o/r'").replace("n:'__BUILD_N__'","n:'7'");t=t.replace(/const MAIL = "[^"]*";/,u.searchParams.get('mail')?'const MAIL = "test@example.com";':'const MAIL = "";');body=t}
 r.writeHead(200,{'content-type':/\.html$/.test(f)?'text/html':/\.js$/.test(f)?'application/javascript':'application/octet-stream'});r.end(body)})});
let ok=0,bad=0;const T=(n,c,x)=>{if(c){ok++;console.log('PASS',n)}else{bad++;console.log('FAIL',n,x===undefined?'':JSON.stringify(x))}};
(async()=>{await new Promise(r=>srv.listen(0,'127.0.0.1',r));const port=srv.address().port;const b=await chromium.launch();
const mk=async(q,init,routeFn)=>{const ctx=await b.newContext({viewport:{width:393,height:852},isMobile:true,hasTouch:true});const pg=await ctx.newPage();pg.__errs=[];pg.on('pageerror',e=>pg.__errs.push(e.message));
 await pg.route(/^https?:\/\/(?!127\.0\.0\.1)/,r=>routeFn?routeFn(r):r.abort());
 await pg.addInitScript(i=>{try{if(!sessionStorage.__i){sessionStorage.__i=1;localStorage.setItem('sunshine.home','off');localStorage.setItem('sunshine.news','{"seen":"1.48"}');if(i)Object.keys(i).forEach(k=>localStorage.setItem(k,i[k]))}}catch(e){}},init||null);
 await pg.goto(`http://127.0.0.1:${port}/index_ueberarbeitet.html${q||''}`,{waitUntil:'load'});await pg.waitForTimeout(1200);return pg};
let pg=await mk('',{ 'sunshine.player':'{"bg":true,"vol":1}','sunshine.cover':'{"fx":"ring"}' },null);const ev=(f,a)=>pg.evaluate(f,a);

const cp=require('child_process');const FX='/tmp/fx126_t';fs.rmSync(FX,{recursive:true,force:true});fs.mkdirSync(FX+'/Album',{recursive:true});
const sh=c=>cp.execSync(c,{cwd:FX,stdio:'pipe'});
const M='-metadata artist=Band_A -metadata album=Album_X';
[['01 eins',300],['02 zwei',400],['03 drei',500]].forEach(([n,f])=>sh(`ffmpeg -y -loglevel error -f lavfi -i "sine=frequency=${f}:duration=6" -c:a libmp3lame ${M} -metadata title="${n.slice(3)}" "Album/${n}.mp3"`));
const files=['01 eins','02 zwei','03 drei'].map(n=>FX+'/Album/'+n+'.mp3');
await ev(()=>Player.open());await pg.waitForTimeout(300);
// ---- Layout: Dockbar unten, Cover+Equalizer oben
const lay=await ev(()=>{const r=e=>document.querySelector(e).getBoundingClientRect(),d=r('#pl-dock'),h=r('#pl-hero'),t=r('#pl-title'),l=r('.pl-lh');return {dockB:d.bottom,vh:innerHeight,heroTop:h.top,heroBottom:h.bottom,titleTop:t.top,seekIn:!!document.querySelector('#pl-dock #pl-seek'),playIn:!!document.querySelector('#pl-dock [data-pl=toggle]'),nextIn:!!document.querySelector('#pl-dock [data-pl=next]'),shufIn:!!document.querySelector('#pl-dock [data-pl=shuffle]'),vizIn:!!document.querySelector('#pl-hero canvas#pl-viz'),cvIn:!!document.querySelector('#pl-hero #pl-cv'),lh:l.top}});
T('Dockbar sitzt am unteren Bildschirmrand',lay.dockB<=lay.vh+1&&lay.dockB>lay.vh-24,lay);
T('Play, Zurück/Weiter, Zufall, Wiederholen und Zeitleiste liegen in der Dockbar',lay.seekIn&&lay.playIn&&lay.nextIn&&lay.shufIn,lay);
T('Equalizer-Fläche und Cover teilen sich einen Bereich oben (Hero)',lay.vizIn&&lay.cvIn&&lay.heroTop<200&&lay.titleTop>=lay.heroBottom-4,lay);
// ---- Dockbar = gleiche Gestaltung wie untere Leiste der DAW
for(const th of ['aurora','studio','neon','liquid','classic']){
 const r=await ev(t=>{document.documentElement.setAttribute('data-theme',t);const a=getComputedStyle(document.querySelector('#pl-dock')),n=document.getElementById('bottom-nav');const b=n?getComputedStyle(n):null;return {pr:a.borderRadius,nr:b&&b.borderRadius,pb:a.borderTopColor,nb:b&&b.borderTopColor,navOn:!!n&&n.classList.contains('td-on')}},th);
 T('Dockbar '+th+': Rundung und Randfarbe wie die DAW-Leiste',r.navOn&&r.pr===r.nr&&r.pb===r.nb,r)}
await ev(()=>document.documentElement.setAttribute('data-theme','aurora'));
// ---- Leistenstile
for(const k of ['glass','flat','neon','plain']){
 const r=await ev(k=>{TpDock.setKind(k);const a=getComputedStyle(document.querySelector('#pl-dock')),n=getComputedStyle(document.getElementById('bottom-nav'));return {at:document.documentElement.getAttribute('data-dock'),pr:a.borderRadius,nr:n.borderRadius,pbg:a.backgroundColor+a.backgroundImage,nbg:n.backgroundColor+n.backgroundImage,ls:JSON.parse(localStorage.getItem('sunshine.tpdock')).kind}},k);
 T('Leistenstil '+k+': gesetzt, gespeichert, Player-Dockbar und DAW-Leiste gleich',r.at===k&&r.ls===k&&r.pr===r.nr&&r.pbg===r.nbg,r)}
await ev(()=>TpDock.setKind('auto'));T('Leistenstil „Wie das Design“ entfernt das Attribut',await ev(()=>!document.documentElement.hasAttribute('data-dock')));
// ---- Sitzung: Dateien laden, Titel 2 wählen, Position
await pg.setInputFiles('#pl-file',files);await pg.waitForTimeout(1500);
await ev(()=>document.querySelectorAll('#pl-list .pl-row')[1].click());await pg.waitForTimeout(1200);
await ev(()=>Player.seek(2.5));await pg.waitForTimeout(400);await ev(()=>Player.pause());await pg.waitForTimeout(300);
await ev(()=>Player._persistNow());await pg.waitForTimeout(300);
const before=await ev(()=>({st:Player.state(),n:Player.list().length}));
T('Vor dem Neustart: Titel 2 gewählt, Position ≈ 2,5 s',before.st.idx===1&&Math.abs(before.st.time-2.5)<0.7,before);
await pg.reload({waitUntil:'load'});await pg.waitForTimeout(1500);
const after=await ev(()=>({st:Player.state(),L:Player.list(),off:document.getElementById('pl-offbar'),mini:document.getElementById('pl-mini')}));
T('Nach Neustart: Liste (3 Titel) und gewählter Titel 2 sind wieder da, noch nicht verbunden',after.L.length===3&&after.st.idx===1&&after.L.every(x=>x.off)&&after.L[1].title==='zwei'&&after.L[1].artist==='Band_A',after);
await ev(()=>Player.open());await pg.waitForTimeout(400);
const ui=await ev(()=>({bar:!document.getElementById('pl-offbar').hidden,txt:document.getElementById('pl-offbar').textContent,title:document.getElementById('pl-title').textContent,cur:document.getElementById('pl-cur').textContent,dur:document.getElementById('pl-dur').textContent,rows:document.querySelectorAll('#pl-list .pl-row.off').length,cvHas:document.querySelector('#pl-cv .cv-pv').classList.contains('has')}));
T('Titelkarte zeigt den letzten Titel, Position und Länge',ui.title==='zwei'&&/0:0[23]/.test(ui.cur)&&/0:06/.test(ui.dur)&&ui.rows===3&&ui.cvHas,ui);
T('Hinweisleiste „Letzte Sitzung“ mit Schaltfläche zum Verbinden',ui.bar&&/Letzte Sitzung/.test(ui.txt)&&/zwei/.test(ui.txt),ui.txt);
T('Mini-Leiste erscheint für nicht verbundene Titel nicht',await ev(()=>{Player.close();const m=document.getElementById('pl-mini');return !m||m.hidden}));
await ev(()=>Player.open());
await ev(()=>Player.toggle());await pg.waitForTimeout(500);
T('Play auf nicht verbundenem Titel: kein Fehler, Hinweis bleibt',await ev(()=>!Player.state().playing&&!document.getElementById('pl-offbar').hidden)&&pg.__errs.length===0,pg.__errs);
// ---- Erneut verbinden (Ordner wählen): Zuordnung über Dateinamen
await pg.setInputFiles('#pl-dir',FX+'/Album');await pg.waitForTimeout(2200);
const re=await ev(()=>({st:Player.state(),L:Player.list(),bar:document.getElementById('pl-offbar').hidden,t:document.getElementById('pl-title').textContent}));
T('Nach dem Ordner-Wählen: alle 3 Titel verbunden, Titel 2 ausgewählt',re.L.length===3&&re.L.every(x=>!x.off)&&re.st.idx===1&&re.t==='zwei'&&re.bar,re);
T('Play war angetippt: nach dem Verbinden läuft der Titel ab der gemerkten Stelle (nicht von vorn)',re.st.playing&&re.st.time>2.4&&re.st.time<6,re.st);
await ev(()=>Player.pause());
// ---- Verlauf
const rc=await ev(()=>Player.recents());T('Verlauf: Ordner „Album“ gemerkt (3 Titel)',rc.length===1&&rc[0].name==='Album'&&rc[0].count===3,rc);
await ev(()=>document.querySelector('[data-pl=recent]').click());await pg.waitForTimeout(250);
const sh1=await ev(()=>{const r=document.getElementById('pl-rc');return {vis:!r.hidden,rows:r.querySelectorAll('.pl-rrow').length,txt:r.textContent}});
T('Verlauf-Fenster listet den Ordner',sh1.vis&&sh1.rows===1&&/Album/.test(sh1.txt)&&/3 Titel/.test(sh1.txt),sh1);
await ev(()=>document.querySelector('[data-rcclose]').click());T('Verlauf-Fenster schließt',await ev(()=>document.getElementById('pl-rc').hidden));
// zweiter Ordner → Verlauf mit 2 Einträgen, neuester zuerst
fs.mkdirSync(FX+'/Zweiter',{recursive:true});fs.copyFileSync(files[0],FX+'/Zweiter/a.mp3');
await ev(()=>Player.clear());await pg.setInputFiles('#pl-dir',FX+'/Zweiter');await pg.waitForTimeout(1200);
const rc2=await ev(()=>Player.recents());T('Verlauf: 2 Ordner, neuester zuerst',rc2.length===2&&rc2[0].name==='Zweiter'&&rc2[1].name==='Album',rc2);
await pg.reload({waitUntil:'load'});await pg.waitForTimeout(1200);
T('Verlauf überlebt den Neustart',await ev(()=>Player.recents().length===2));
// Auswahl ohne Freigabe (Android-Weg): Hinweis + Dialog öffnet sich
await ev(()=>{delete window.showDirectoryPicker;window.__dirClicks=0;const i=document.getElementById('pl-dir')||(Player.open(),document.getElementById('pl-dir'));i.addEventListener('click',e=>{window.__dirClicks++;e.preventDefault()})});
await ev(()=>{Player.open();document.querySelector('[data-pl=recent]').click()});await pg.waitForTimeout(250);
await ev(()=>document.querySelector('[data-rc]').click());await pg.waitForTimeout(300);
T('Verlauf antippen ohne Freigabe: Ordner-Dialog wird geöffnet',await ev(()=>window.__dirClicks===1));
await ev(()=>{document.querySelector('[data-pl=recent]').click()});await pg.waitForTimeout(200);
await ev(()=>document.querySelector('[data-rcx]').click());await pg.waitForTimeout(300);
T('Eintrag aus dem Verlauf entfernen',await ev(()=>Player.recents().length===1));
// Fake-Handle (nicht klonbar) – Verlauf bleibt trotzdem erhalten
await ev(()=>{Player.addFolder([{name:'x.mp3',key:'x.mp3',sub:'Fake',size:10,get:async()=>new Blob([])}],'FakeDir',{kind:'directory',name:'FakeDir',queryPermission(){}})});await pg.waitForTimeout(500);
T('Nicht speicherbarer Ordner-Zugriff: Verlauf funktioniert weiter (ohne Freigabe)',await ev(()=>{const r=Player.recents();return r[0]&&r[0].name==='FakeDir'}));

// ---- Szenario B: neu starten, nur „Dateien wählen“ in der Hinweisleiste (ohne Play) → pausiert an der Stelle
await ev(()=>Player.clear());await pg.setInputFiles('#pl-file',files);await pg.waitForTimeout(1500);
await ev(()=>document.querySelectorAll('#pl-list .pl-row')[2].click());await pg.waitForTimeout(1000);await ev(()=>Player.seek(3.2));await pg.waitForTimeout(300);await ev(()=>Player.pause());await ev(()=>Player._persistNow());
await pg.reload({waitUntil:'load'});await pg.waitForTimeout(1300);await ev(()=>Player.open());await pg.waitForTimeout(300);
await ev(()=>{window.__fileClicks=0;const f=document.getElementById('pl-file');f.addEventListener('click',e=>{window.__fileClicks++;e.preventDefault()})});
await ev(()=>document.querySelector('[data-pl=relink]').click());T('„Dateien wählen“ öffnet die Dateiauswahl',await ev(()=>window.__fileClicks===1));
await pg.setInputFiles('#pl-file',[files[2],files[0],files[1]]);await pg.waitForTimeout(2000);
const rb=await ev(()=>({st:Player.state(),L:Player.list().map(x=>x.title+':'+x.off)}));
T('Neu wählen in anderer Reihenfolge: Titel 3 ("drei") wieder ausgewählt, pausiert, ≈ 3,2 s',rb.L.length===3&&rb.L.every(x=>/false$/.test(x))&&rb.st.time>2.4&&rb.st.time<4&&!rb.st.playing,rb);
// Liste leeren löscht die Sitzung
await ev(()=>Player.clear());await pg.waitForTimeout(900);await pg.reload({waitUntil:'load'});await pg.waitForTimeout(1200);
T('Liste leeren: nach Neustart ist der Player leer',await ev(()=>Player.list().length===0&&!Player.state().playing));
T('Keine JavaScript-Fehler',pg.__errs.length===0,pg.__errs);

console.log(`\n${ok} bestanden, ${bad} fehlgeschlagen`);await b.close();srv.close();process.exit(bad?1:0)})().catch(e=>{console.error(e);process.exit(2)});
