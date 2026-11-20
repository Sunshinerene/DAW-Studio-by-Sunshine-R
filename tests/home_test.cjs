const http=require('http'),fs=require('fs'),path=require('path');const {chromium}=require('playwright');
const WORK=process.argv[2];const TW=fs.readFileSync(path.join(__dirname,'fixtures/tailwind.js'));
const srv=http.createServer((q,r)=>{const f=path.join(WORK,decodeURIComponent(q.url.split('?')[0]).replace(/^\//,''));fs.readFile(f,(e,d)=>{if(e){r.writeHead(404);r.end();return;}r.writeHead(200,{'content-type':f.endsWith('.html')?'text/html':'application/octet-stream'});r.end(d)})});
let ok=0,bad=0;const T=(n,c,x)=>{if(c){ok++;console.log('PASS',n)}else{bad++;console.log('FAIL',n,x||'')}};
(async()=>{await new Promise(r=>srv.listen(0,'127.0.0.1',r));const port=srv.address().port;const b=await chromium.launch();
const ctx=await b.newContext({viewport:{width:393,height:852},isMobile:true,hasTouch:true});const pg=await ctx.newPage();const errs=[];pg.on('pageerror',e=>errs.push(e.message));
await pg.route(/cdn\.tailwindcss\.com/,r=>r.fulfill({status:200,contentType:'application/javascript',body:TW}));
await pg.route(/^https?:\/\/(?!127\.0\.0\.1|cdn\.tailwindcss\.com)/,r=>r.abort());
await pg.goto(`http://127.0.0.1:${port}/index_ueberarbeitet.html`,{waitUntil:'load'});
const SHOT=path.join(__dirname,'../dist/_shots');const ev=(f,a)=>pg.evaluate(f,a);
const vis=s=>pg.evaluate(s=>{const e=document.querySelector(s);return !!e&&!e.hidden&&e.getBoundingClientRect().height>0},s);
const open=()=>ev(()=>{const t=document.getElementById('toast-container');if(t)t.style.display='none';Home.open()});
// ---- Start
await pg.waitForTimeout(800);
T('Startseite erscheint beim Start',await vis('#home-root'));
T('Logo (16:9-Banner) geladen und sichtbar, Wortmarke ausgeblendet',await ev(()=>{const l=document.getElementById('hm-logo'),i=l.querySelector('img'),r=i.getBoundingClientRect();return l.classList.contains('ok')&&r.width>120&&r.height>60&&getComputedStyle(l.querySelector('.hm-wm')).display==='none'}));
T('Leerer Zustand: Hinweis, kein „Weiter“, kein Zurück-Knopf',await ev(()=>!!document.querySelector('.hm-empty')&&!document.getElementById('hm-resume-cur')&&document.getElementById('hm-back').hidden));
T('„home-pending“ wurde entfernt (keine blockierte DAW)',await ev(()=>!document.documentElement.classList.contains('home-pending')));
await pg.waitForTimeout(900);
T('Alte Hintergrund-Animation ist entfernt (kein #hm-eq), solange nichts läuft keine Bühne und keine Dockbar',await ev(()=>!document.getElementById('hm-eq')&&(!document.getElementById('hm-dock')||document.getElementById('hm-dock').hidden)&&document.getElementById('hm-stage').hidden));
await pg.screenshot({path:SHOT+'/home_empty.png'});
// ---- Neues Projekt
await pg.tap('#hm-new');await pg.waitForTimeout(400);T('Neues-Projekt-Dialog öffnet mit Vorschlag „Neues Projekt“',await ev(()=>document.getElementById('pf-name').value==='Neues Projekt'));
await pg.screenshot({path:SHOT+'/home_form.png'});
await pg.fill('#pf-name','Test Alpha');await pg.fill('#pf-bpm','132');await pg.dispatchEvent('#pf-bpm','input');
await pg.selectOption('#pf-root','9');await pg.selectOption('#pf-scale','major');
await pg.tap('[data-seg="grid"] [data-v="4"]');await pg.tap('[data-seg="arr"] [data-v="short"]');await pg.tap('label.hm-sw:has(#pf-click)');await pg.tap('[data-seg="start"] [data-v="midi"]');await pg.tap('[data-th="neon"]');await pg.fill('#pf-notes','Ersatz-Notiz');
T('Design-Chip wendet Neon sofort an',await ev(()=>document.documentElement.getAttribute('data-theme')==='neon'));
await pg.tap('#pf-ok');await pg.waitForTimeout(900);
const s1=await ev(()=>({home:!document.getElementById('home-root').hidden,name:dawState.project&&dawState.project.name,bpm:dawState.bpm,inp:document.getElementById('input-bpm').value,root:dawState.midiRoot,sc:dawState.midiScale,rs:document.getElementById('select-midi-root').value,grid:dawState.midiGridStep,bars:dawState.sections.reduce((a,s)=>a+s.bars,0),met:dawState.metronomeOn,metCls:document.getElementById('btn-metronome').className.includes('amber'),tr:dawState.tracks.map(t=>t.type).join(),sub:document.getElementById('status-subtitle').textContent,notes:dawState.project.notes,hist:document.getElementById('btn-undo').className.includes('opacity-40')}));
T('Projekt angelegt: Startseite zu, Name & Notiz',!s1.home&&s1.name==='Test Alpha'&&s1.notes==='Ersatz-Notiz',JSON.stringify(s1));
T('Einstellungen übernommen: 132 BPM, A Dur, Raster 1/8, 16 Takte, Klick an',s1.bpm===132&&s1.inp==='132'&&s1.root===9&&s1.rs==='9'&&s1.sc==='major'&&s1.grid===4&&s1.bars===16&&s1.met&&s1.metCls,JSON.stringify(s1));
T('Start mit MIDI-Spur: genau 1 MIDI-Spur',s1.tr==='midi',s1.tr);
T('Statuszeile zeigt „Projekt: Test Alpha“, Undo leer',s1.sub==='Projekt: Test Alpha'&&s1.hist,JSON.stringify(s1));
T('Projekt sofort in der Bibliothek',await ev(async()=>{await Home.refreshList();return Home.items().some(m=>m.name==='Test Alpha'&&m.bpm===132)}));
// ---- Zurück zur Startseite über Menü
await pg.tap('#btn-menu');await pg.waitForTimeout(200);T('Menü hat 🏠 Startseite und 📁 Projekt-Einstellungen oben',await ev(()=>{const m=document.getElementById('file-menu'),b=[...m.querySelectorAll('.fm-item')];return b[0].id==='btn-home'&&b[1].id==='btn-project-settings'}));
await pg.tap('#btn-home');await pg.waitForTimeout(900);
T('Startseite wieder offen mit „Weiter: Test Alpha“',await vis('#home-root')&&await ev(()=>/Weiter: Test Alpha/.test(document.getElementById('hm-resume').innerText)));
const card=await ev(()=>document.querySelector('.hm-item').innerText.replace(/\s+/g,' '));T('Karte zeigt BPM, Tonart, Spuren',/132 BPM/.test(card)&&/A Dur/.test(card)&&/1 Spur/.test(card)&&/OFFEN/.test(card),card);
await pg.screenshot({path:SHOT+'/home_with_project.png'});
await pg.tap('#hm-back');T('Zurück-Knopf schließt',!(await vis('#home-root')));
// ---- Audio hinzufügen, zweites Projekt anlegen
await ev(async()=>{await audioEngine.ensureCtx();const ctx=audioEngine.ctx,b=ctx.createBuffer(2,44100*3,44100);for(let c=0;c<2;c++){const d=b.getChannelData(c);for(let i=0;i<d.length;i++)d[i]=.3*Math.sin(2*Math.PI*220*i/44100)}const t=createTrack('audio','Basslinie');dawState.buffers[t.id]=b;audioEngine.ensureTrackNode(t);renderMultiTrackLanes();});
await open();await pg.waitForTimeout(1500);
T('Geändertes Projekt wurde beim Verlassen automatisch gesichert (Audio in Meta)',await ev(async()=>{await Home.refreshList();const m=Home.items().find(x=>x.name==='Test Alpha');return m&&m.audio===1&&m.tracks===2}));
await pg.tap('#hm-new');await pg.waitForTimeout(300);T('Name wird eindeutig vorgeschlagen',await ev(()=>document.getElementById('pf-name').value==='Neues Projekt'));
await pg.fill('#pf-name','Zweites');await pg.tap('#pf-ok');await pg.waitForTimeout(900);
const s2=await ev(()=>({tr:dawState.tracks.length,buf:Object.keys(dawState.buffers).length,bpm:dawState.bpm,name:dawState.project.name,bars:dawState.sections.reduce((a,s)=>a+s.bars,0),mk:dawState.markers.length}));
T('Neues Projekt ist sauber (0 Spuren, 0 Puffer, 128 BPM, 24 Takte)',s2.tr===0&&s2.buf===0&&s2.bpm===128&&s2.bars===24&&s2.name==='Zweites',JSON.stringify(s2));
// ---- Projekt öffnen (Audio kommt zurück)
await open();await pg.waitForTimeout(700);
await pg.tap('.hm-item:has-text("Test Alpha")');await pg.waitForTimeout(1500);
const s3=await ev(()=>({name:dawState.project.name,bpm:dawState.bpm,tr:dawState.tracks.length,buf:Object.keys(dawState.buffers).length,len:Object.values(dawState.buffers)[0]&&Object.values(dawState.buffers)[0].length,inp:document.getElementById('input-bpm').value,root:document.getElementById('select-midi-root').value,sub:document.getElementById('status-subtitle').textContent,home:document.getElementById('home-root').hidden}));
T('Projekt „Test Alpha“ geöffnet: BPM, Spuren, Audio (132300 Samples), Bedienelemente synchron',s3.name==='Test Alpha'&&s3.bpm===132&&s3.tr===2&&s3.buf===1&&s3.len===132300&&s3.inp==='132'&&s3.root==='9'&&s3.home,JSON.stringify(s3));
T('Statuszeile aktualisiert',s3.sub==='Projekt: Test Alpha');
// ---- Menü einer Karte: umbenennen, duplizieren, löschen
await open();await pg.waitForTimeout(700);
await pg.tap('.hm-item:has-text("Zweites") [data-more]');await pg.waitForTimeout(250);await pg.tap('[data-a="ren"]');await pg.waitForTimeout(250);
await pg.fill('#hm-pi','Drittes');await pg.tap('.hm-sheet [data-ok]');await pg.waitForTimeout(700);
T('Umbenennen: Liste zeigt „Drittes“, „Zweites“ weg',await ev(()=>Home.items().some(m=>m.name==='Drittes')&&!Home.items().some(m=>m.name==='Zweites')));
await pg.tap('.hm-item:has-text("Drittes") [data-more]');await pg.waitForTimeout(250);await pg.tap('[data-a="dup"]');await pg.waitForTimeout(900);
T('Duplizieren: „Drittes Kopie“ vorhanden, anderes id',await ev(()=>{const a=Home.items().find(m=>m.name==='Drittes'),b=Home.items().find(m=>m.name==='Drittes Kopie');return a&&b&&a.id!==b.id}));
await pg.tap('.hm-item:has-text("Drittes Kopie") [data-more]');await pg.waitForTimeout(250);await pg.tap('[data-a="del"]');await pg.waitForTimeout(250);
T('Löschen verlangt Bestätigung (Sheet mit Name)',await ev(()=>/Drittes Kopie/.test(document.querySelector('.hm-sheet').innerText)&&!!document.querySelector('.hm-sheet .dng')));
await pg.tap('.hm-sheet .dng');await pg.waitForTimeout(800);
T('Gelöscht: nicht mehr in Liste und nicht in der Datenbank',await ev(async()=>!Home.items().some(m=>m.name==='Drittes Kopie')&&await new Promise(r=>{const q=indexedDB.open('SunshineRStemStudioProjects',1);q.onsuccess=()=>{const g=q.result.transaction('projects').objectStore('projects').getAll();g.onsuccess=()=>r(!g.result.some(x=>x.name==='Drittes Kopie'))}})));
await pg.tap('.hm-item:has-text("Drittes") [data-more]');await pg.waitForTimeout(250);await pg.tap('[data-a="del"]');await pg.waitForTimeout(250);await pg.tap('.hm-sheet [data-x]');await pg.waitForTimeout(200);
T('Abbrechen beim Löschen lässt das Projekt',await ev(()=>Home.items().some(m=>m.name==='Drittes')));
// Suche/Sortierung ab 5 Projekten
for(let i=0;i<3;i++){await ev(async()=>{const id=Home.items()[0].id;await Home.duplicateProject(id)});}await ev(()=>Home.refreshList());await pg.waitForTimeout(700);
T('Ab 4 Projekten: Startseite zeigt nur die letzten 3, „Alle“-Knopf erscheint',await ev(()=>document.querySelectorAll('#hm-list .hm-item').length)===3&&await vis('#hm-all'));
await pg.tap('#hm-all');await pg.waitForTimeout(700);
T('„Alle“ öffnet große Ansicht mit allen Projekten, Suche und Sortierung',await ev(()=>document.querySelectorAll('#hm-biglist .hm-item').length===Home.items().length&&!!document.querySelector('.hm-big #hm-q')&&!!document.querySelector('.hm-big #hm-sort')&&document.getElementById('home-root').classList.contains('hm-depth')));
await pg.fill('#hm-q','alpha');await pg.waitForTimeout(150);T('Suche filtert',await ev(()=>document.querySelectorAll('#hm-biglist .hm-item').length)===await ev(()=>Home.items().filter(m=>/alpha/i.test(m.name)).length));
await pg.fill('#hm-q','');await pg.selectOption('#hm-sort','name');await pg.waitForTimeout(150);
T('A–Z sortiert',await ev(()=>{const n=[...document.querySelectorAll('#hm-biglist .hm-item .hm-info b')].map(b=>b.firstChild.textContent);return JSON.stringify(n)===JSON.stringify([...n].sort((a,b)=>a.localeCompare(b,'de')))}));
await pg.screenshot({path:SHOT+'/home_list.png'});
await pg.tap('.hm-big [data-x].hm-pill-x');await pg.waitForTimeout(500);T('Große Ansicht schließt, Startseite ohne Abstandseffekt',await ev(()=>!document.querySelector('.hm-big-bg')&&!document.getElementById('home-root').classList.contains('hm-depth')));
await pg.tap('#hm-back').catch(()=>{});
// ---- Projekt-Einstellungen später
await ev(()=>Home.close());await pg.tap('#btn-menu');await pg.waitForTimeout(200);await pg.tap('#btn-project-settings');await pg.waitForTimeout(400);
T('Projekt-Einstellungen zeigen aktuelle Werte',await ev(()=>document.getElementById('pf-bpm').value==='132'||document.getElementById('pf-bpm').value==String(dawState.bpm)));
await pg.screenshot({path:SHOT+'/home_edit.png'});
await pg.fill('#pf-bpm','140');await pg.dispatchEvent('#pf-bpm','input');await pg.selectOption('#pf-root','2');await pg.fill('#pf-notes','neu');await pg.tap('#pf-ok');await pg.waitForTimeout(700);
T('Später geändert: 140 BPM (Eingabefeld + State), D, Notiz',await ev(()=>dawState.bpm===140&&document.getElementById('input-bpm').value==='140'&&dawState.midiRoot===2&&dawState.project.notes==='neu'));
await pg.tap('#btn-menu');await pg.waitForTimeout(200);await pg.tap('#btn-project-settings');await pg.waitForTimeout(300);
await pg.tap('#pf-saveas');await pg.waitForTimeout(300);await pg.fill('#hm-pi','Variante B');await pg.tap('.hm-sheet [data-ok]');await pg.waitForTimeout(900);
T('„Speichern unter“ legt neues Projekt an und macht es aktuell',await ev(async()=>{await Home.refreshList();return dawState.project.name==='Variante B'&&Home.items().some(m=>m.name==='Variante B'&&m.bpm===140)}));
// 💾 speichert still unter dem aktuellen Namen
await ev(()=>{dawState.bpm=100});const t0=await ev(()=>Home.items().find(m=>m.name==='Variante B').updatedAt);await pg.waitForTimeout(50);await pg.tap('#btn-save-project');await pg.waitForTimeout(900);
const sv=await ev(async()=>{await Home.refreshList();const m=Home.items().find(x=>x.name==='Variante B');return {bpm:m.bpm,sheet:!!document.querySelector('.hm-sheet')}});T('💾: Projekt aktualisiert (100 BPM), keine Rückfrage',sv.bpm===100&&!sv.sheet,JSON.stringify(sv));
// ---- Reset ohne Projekt → 💾 fragt nach Namen
await ev(()=>{dawState.project=null});await pg.tap('#btn-save-project');await pg.waitForTimeout(400);T('Ohne Projekt fragt 💾 nach einem Namen',await ev(()=>!!document.getElementById('hm-pi')));
await pg.fill('#hm-pi','Frisch gespeichert');await pg.tap('.hm-sheet [data-ok]');await pg.waitForTimeout(900);T('… und legt es an',await ev(()=>dawState.project&&dawState.project.name==='Frisch gespeichert'));
// ---- Sitzungs-Wiederherstellung über die Startseite
await ev(async()=>{await Autosave.saveNow(true)});
const pg2=await ctx.newPage();const errs2=[];pg2.on('pageerror',e=>errs2.push(e.message));await pg2.route(/cdn\.tailwindcss\.com/,r=>r.fulfill({status:200,contentType:'application/javascript',body:TW}));await pg2.route(/^https?:\/\/(?!127\.0\.0\.1|cdn\.tailwindcss\.com)/,r=>r.abort());
await pg2.route(/sunshine-r-daw-studio-logo/,r=>r.abort());await pg2.goto(`http://127.0.0.1:${port}/index_ueberarbeitet.html`,{waitUntil:'load'});await pg2.waitForTimeout(3600);
const rs=await pg2.evaluate(()=>({home:!document.getElementById('home-root').hidden,go:!!document.getElementById('hm-resume-go'),txt:(document.getElementById('hm-resume')||{}).innerText,offer:!!document.getElementById('as-offer')}));
T('Neustart: Startseite bietet letzte Sitzung an, kein zweiter Wiederherstellungs-Dialog',rs.home&&rs.go&&!rs.offer&&/Frisch gespeichert/.test(rs.txt),JSON.stringify(rs));
T('Fehlt die Logo-Datei: Wortmarke als Ersatz',await pg2.evaluate(()=>{const l=document.getElementById('hm-logo');return !l.classList.contains('ok')&&getComputedStyle(l.querySelector('.hm-wm')).display!=='none'&&l.querySelector('.hm-wm').getBoundingClientRect().height>40}));
await pg2.screenshot({path:SHOT+'/home_session.png'});
await pg2.tap('#hm-resume-go');await pg2.waitForTimeout(1800);
const rr=await pg2.evaluate(()=>({home:document.getElementById('home-root').hidden,tr:dawState.tracks.length,name:dawState.project&&dawState.project.name,buf:Object.keys(dawState.buffers).length}));
T('Sitzung fortgesetzt (Spuren, Audio, Projektname)',rr.home&&rr.tr===2&&rr.buf===1&&rr.name==='Frisch gespeichert',JSON.stringify(rr));
// „Beim Start anzeigen“ ausschalten
await pg2.reload({waitUntil:'load'});await pg2.waitForTimeout(1200);await pg2.evaluate(()=>{document.getElementById('hm-auto').click()});await pg2.reload({waitUntil:'load'});await pg2.waitForTimeout(3300);
const off=await pg2.evaluate(()=>({home:!document.getElementById('home-root').hidden,pend:document.documentElement.classList.contains('home-pending'),offer:!!document.getElementById('as-offer'),ls:localStorage.getItem('sunshine.home')}));
T('„Beim Start anzeigen“ aus: keine Startseite, DAW direkt bedienbar, alter Autosave-Dialog kommt zurück',!off.home&&!off.pend&&off.ls==='off'&&off.offer,JSON.stringify(off));
await pg2.evaluate(()=>{const o=document.getElementById('as-offer');o&&o.querySelector('[data-as="no"]').click()});
await pg2.evaluate(()=>Home.open());await pg2.waitForTimeout(500);T('Startseite weiter über Menü/Logo erreichbar',await pg2.evaluate(()=>!document.getElementById('home-root').hidden));
T('Keine Seitenfehler (beide Seiten)',errs.length===0&&errs2.length===0,errs.concat(errs2).join('|'));
// Themes & Desktop
await pg2.evaluate(()=>localStorage.setItem('sunshine.home','on'));
for(const t of ['aurora','liquid','studio','classic']){await pg2.evaluate(t=>SunshineTheme.apply(t),t);await pg2.waitForTimeout(350);await pg2.screenshot({path:SHOT+'/home_theme_'+t+'.png'});}
await pg2.setViewportSize({width:1280,height:900});await pg2.evaluate(()=>SunshineTheme.apply('aurora'));await pg2.waitForTimeout(500);await pg2.screenshot({path:SHOT+'/home_desktop.png'});
await pg.evaluate(async()=>{await Home.createProject({name:'Breitentest mit einem sehr langen Projektnamen'});await new Promise(r=>setTimeout(r,400));Home.open();await new Promise(r=>setTimeout(r,500))});
T('Startseite lässt sich nicht seitlich verschieben (scrollWidth = Breite, scrollLeft bleibt 0)',await ev(()=>{const s=document.querySelector('.hm-scroll');s.scrollLeft=60;const r=document.getElementById('home-root');r.scrollLeft=60;return s.scrollWidth<=s.clientWidth&&s.scrollLeft===0&&r.scrollLeft===0&&getComputedStyle(s).overflowX==='hidden'}));
T('Auch mit Projektliste: nichts ragt seitlich über den Inhalt hinaus',await ev(()=>{const s=document.querySelector('.hm-scroll');return s.scrollWidth===s.clientWidth}));
console.log(`\n${ok} bestanden, ${bad} fehlgeschlagen`);await b.close();srv.close();process.exit(bad?1:0)})();
