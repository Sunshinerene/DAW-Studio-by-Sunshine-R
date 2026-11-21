const http=require('http'),fs=require('fs'),path=require('path');const {chromium}=require('playwright');
const WORK=process.argv[2];const SHOT=path.join(__dirname,'../dist/_shots');
const srv=http.createServer((q,r)=>{const f=path.join(WORK,decodeURIComponent(q.url.split('?')[0]).replace(/^\//,''));fs.readFile(f,(e,d)=>{if(e){r.writeHead(404);r.end();return;}r.writeHead(200,{'content-type':f.endsWith('.html')?'text/html':f.endsWith('.js')?'text/javascript':f.endsWith('.css')?'text/css':'application/octet-stream'});r.end(d)})});
let ok=0,bad=0;const T=(n,c,x)=>{if(c){ok++;console.log('PASS',n)}else{bad++;console.log('FAIL',n,x===undefined?'':JSON.stringify(x))}};
(async()=>{await new Promise(r=>srv.listen(0,'127.0.0.1',r));const port=srv.address().port;const b=await chromium.launch();
const U=`http://127.0.0.1:${port}/index_ueberarbeitet.html`;
const mk=async(init,opts)=>{const ctx=await b.newContext(Object.assign({viewport:{width:393,height:852},isMobile:true,hasTouch:true,acceptDownloads:true},opts||{}));const pg=await ctx.newPage();pg.errs=[];pg.on('pageerror',e=>pg.errs.push(e.message));
 await pg.route(/^https?:\/\/(?!127\.0\.0\.1)/,r=>r.abort());
 if(init)await pg.addInitScript(init);
 await pg.goto(U,{waitUntil:'load'});await pg.waitForTimeout(1300);return pg};
const seed=async pg=>pg.evaluate(async()=>{const db=await new Promise((res,rej)=>{const q=indexedDB.open('SunshineRStemStudioProjects',1);q.onupgradeneeded=()=>{if(!q.result.objectStoreNames.contains('projects'))q.result.createObjectStore('projects',{keyPath:'id'})};q.onsuccess=()=>res(q.result);q.onerror=()=>rej(q.error)});await new Promise((res,rej)=>{const t=db.transaction('projects','readwrite');t.objectStore('projects').put({id:'p1',name:'Test'});t.oncomplete=res;t.onerror=()=>rej(t.error)});db.close();return 1});
const openOpt=async pg=>{await pg.evaluate(()=>document.getElementById('btn-menu').click());await pg.waitForTimeout(150);await pg.evaluate(()=>document.getElementById('btn-settings').click());await pg.waitForTimeout(500)};

// ================= NEWS
let pg=await mk(()=>{try{localStorage.setItem('sunshine.home','off')}catch(e){}});   // Bestandsnutzer (hat schon sunshine.*-Einstellung)
let r=await pg.evaluate(()=>({v:News.version(),n:News.list().length,top:News.list()[0],has:News.hasUnseen()}));
T('Changelog eingebettet: 45 Abschnitte, oben 1.44 mit Titel und Punkten',r.n===45&&r.top.v==="1.44"&&/MP3/.test(r.top.title)&&r.top.items.length>=3&&r.top.date==='2026-11-21',r);
T('Bestandsnutzer: Neuerungen ungelesen',r.has);
await pg.evaluate(()=>Home.open());await pg.waitForTimeout(500);
T('Startseite: Karte „Neu in Version 1.44“',await pg.evaluate(()=>{const e=document.querySelector('#hm-update [data-nw-card]');return !!e&&/Version 1\.44/.test(e.textContent)}));
await pg.screenshot({path:path.join(SHOT,'v114_homecard.png')});
await pg.evaluate(()=>document.querySelector('#hm-update [data-nw="open"]').click());await pg.waitForTimeout(300);
T('„Ansehen“ öffnet „Was ist neu“ mit allen Versionen',await pg.evaluate(()=>{const e=document.getElementById('nw-root');return !!e&&e.querySelectorAll(".nw-e:not(.pv)").length===45&&/installiert/.test(e.textContent)&&e.querySelector('.nw-tag.nw-neu')}));
await pg.screenshot({path:path.join(SHOT,'v114_news.png')});
T('Android-Zurück schließt „Was ist neu“',await pg.evaluate(()=>{const x=window.__androidBack();return x===true&&!document.getElementById('nw-root')}));
T('Nach dem Ansehen gilt es als gelesen (Karte weg)',await pg.evaluate(()=>{Home.close();Home.open();return !News.hasUnseen()&&!document.querySelector('#hm-update [data-nw-card]')}));
await pg.evaluate(()=>{News._reset('1.14');Home.close();Home.open()});await pg.waitForTimeout(300);
await pg.evaluate(()=>document.querySelector('#hm-update [data-nw="ok"]').click());
T('„OK“ markiert gelesen',await pg.evaluate(()=>!News.hasUnseen()&&!document.querySelector('#hm-update [data-nw-card]')));
await pg.evaluate(()=>Home.close());
await openOpt(pg);await pg.evaluate(()=>document.querySelector('[data-nw-open]').click());await pg.waitForTimeout(300);
T('Optionen → „Was ist neu?“ öffnet das Protokoll',await pg.evaluate(()=>!!document.getElementById('nw-root')));
await pg.evaluate(()=>News.close());
T('Keine JS-Fehler (News)',pg.errs.length===0,pg.errs);await pg.context().close();
// frische Installation
pg=await mk();
T('Frische Installation: keine „Neu in…“-Karte, Merker = aktuelle Version',await pg.evaluate(()=>{Home.open();return News._state().seen==='1.44'&&!document.querySelector('#hm-update [data-nw-card]')}));
await pg.context().close();

// ================= WÖCHENTLICHE SICHERUNG (Browser: Erinnerung)
pg=await mk(()=>{try{localStorage.setItem('sunshine.home','off');localStorage.setItem('sunshine.news','{"seen":"1.16"}')}catch(e){}});
T('Erster Start: Merker „letzte Sicherung“ = jetzt (erste Fälligkeit in 7 Tagen)',await pg.evaluate(()=>{const w=Update._state().weekly;return w.on===true&&Math.abs(Date.now()-w.last)<20000&&!Update.weeklyDue()}));
await seed(pg);
await pg.evaluate(()=>Update._setWeekly({last:Date.now()-8*864e5}));
T('8 Tage her → fällig',await pg.evaluate(()=>Update.weeklyDue()));
let wr=await pg.evaluate(()=>Update.weeklyTick());
T('Browser ohne Dateizugriff → keine stille Sicherung, Erinnerung gesetzt',wr.ran&&wr.result.ok===false&&await pg.evaluate(()=>Update._state().weekly.pending===true),wr);
await pg.evaluate(()=>Home.open());await pg.waitForTimeout(400);
T('Startseite: Karte „Wöchentliche Sicherung fällig“',await pg.evaluate(()=>/Wöchentliche Sicherung fällig/.test(document.getElementById('hm-update').textContent)));
await pg.screenshot({path:path.join(SHOT,'v114_weekly.png')});
await pg.evaluate(()=>document.querySelector('#hm-update [data-wk="later"]').click());
T('„Morgen“ blendet die Karte aus',await pg.evaluate(()=>!document.querySelector('#hm-update [data-card="wk"]')&&Update._state().weekly.snooze>Date.now()));
await pg.evaluate(()=>{Update._setWeekly({snooze:0});Home.close();Home.open()});await pg.waitForTimeout(300);
const dl=pg.waitForEvent('download',{timeout:15000});
await pg.evaluate(()=>document.querySelector('#hm-update [data-wk="now"]').click());const d=await dl;
T('„Sichern“ erzeugt die ZIP-Sicherung',/^Sunshine-Sicherung-.*\.zip$/.test(d.suggestedFilename()),d.suggestedFilename());await pg.waitForTimeout(800);
T('Danach: Karte weg, „letzte Sicherung“ aktualisiert',await pg.evaluate(()=>{const w=Update._state().weekly;return !w.pending&&Date.now()-w.last<30000&&!document.querySelector('#hm-update [data-card="wk"]')}));
await pg.evaluate(()=>Home.close());await openOpt(pg);
T('Optionen: Schalter + Status „Letzte Sicherung“',await pg.evaluate(()=>{const i=document.querySelector('[data-wk-info]');return document.querySelector('[data-wk-on]').checked&&/Letzte Sicherung: \d\d\.\d\d\.\d{4}/.test(i.textContent)}));
await pg.evaluate(()=>{const c=document.querySelector('[data-wk-on]');c.checked=false;c.dispatchEvent(new Event('change',{bubbles:true}))});
T('Ausschalten wird gespeichert; dann nie fällig',await pg.evaluate(()=>{Update._setWeekly({last:Date.now()-30*864e5});return Update._state().weekly.on===false&&!Update.weeklyDue()}));
T('Keine JS-Fehler (Wochensicherung)',pg.errs.length===0,pg.errs);await pg.context().close();
// ohne Daten: nichts fällig
pg=await mk(()=>{try{localStorage.setItem('sunshine.home','off');localStorage.setItem('sunshine.news','{"seen":"1.16"}');localStorage.setItem('sunshine.update',JSON.stringify({weekly:{on:true,last:1}}))}catch(e){}});
await pg.evaluate(async()=>{for(const n of ['SunshineRStemStudioProjects','SunshineHome','SunshineAutosave']){await new Promise(r=>{const q=indexedDB.deleteDatabase(n);q.onsuccess=q.onerror=q.onblocked=()=>r()})}});
wr=await pg.evaluate(()=>Update.weeklyTick());
T('Ohne Projekte/Daten: keine Sicherung, kein Alarm',wr.ran===false&&await pg.evaluate(()=>!Update._state().weekly.pending),wr);
await pg.context().close();
// stille Sicherung mit (nachgebautem) Dateizugriff der Android-App
pg=await mk(()=>{try{localStorage.setItem('sunshine.home','off');localStorage.setItem('sunshine.news','{"seen":"1.16"}');window.__fs={w:[],d:[]};window.Capacitor={isNativePlatform:()=>true,Plugins:{Filesystem:{writeFile:async o=>{window.__fs.w.push({p:o.path,dir:o.directory,rec:o.recursive,len:o.data.length});return {uri:'file://x'}},readdir:async()=>({files:['Sunshine-Sicherung-20260101-0000.zip','Sunshine-Sicherung-20260102-0000.zip','Sunshine-Sicherung-20260103-0000.zip','Sunshine-Sicherung-20260104-0000.zip','Sunshine-Sicherung-20260105-0000.zip','fremd.txt'].map(name=>({name}))}),deleteFile:async o=>{window.__fs.d.push(o.path)}}}}}catch(e){}});
await seed(pg);await pg.evaluate(()=>Update._setWeekly({last:Date.now()-9*864e5,on:true}));
wr=await pg.evaluate(()=>Update.weeklyTick());
const fs1=await pg.evaluate(()=>window.__fs);
T('Android: still nach Documents/SunshineDAW/Sicherung geschrieben (rekursiv, Base64)',wr.ran&&wr.result.ok&&fs1.w.length===1&&/^SunshineDAW\/Sicherung\/Sunshine-Sicherung-.*\.zip$/.test(fs1.w[0].p)&&fs1.w[0].dir==='DOCUMENTS'&&fs1.w[0].rec===true&&fs1.w[0].len>100,[wr,fs1]);
T('Rotation: nur die letzten 4 bleiben (älteste gelöscht, Fremdes unberührt)',fs1.d.length===1&&/20260101/.test(fs1.d[0]),fs1.d);
T('Danach nicht mehr fällig, keine Karte',await pg.evaluate(()=>!Update.weeklyDue()&&!Update._state().weekly.pending));
T('Keine JS-Fehler (stille Sicherung)',pg.errs.length===0,pg.errs);await pg.context().close();

// ================= STABILITÄT
pg=await mk(()=>{try{localStorage.setItem('sunshine.home','off');localStorage.setItem('sunshine.news','{"seen":"1.16"}');localStorage.setItem('sunshine.alive',JSON.stringify({alive:true,t:Date.now()-3600e3,mb:412}))}catch(e){}});
T('Vorheriger Start unerwartet beendet → erkannt + im Protokoll',await pg.evaluate(()=>{const c=Health.previousCrash();return !!c&&c.mb===412&&Health.errors().some(e=>/unerwartet/.test(e.m)&&/412/.test(e.m))}));
T('Neuer Start gilt als „läuft“, nach pagehide als sauber',await pg.evaluate(()=>{const a=()=>JSON.parse(localStorage.getItem('sunshine.alive'));const x=a().alive===true;window.dispatchEvent(new Event('pagehide'));return x&&a().alive===false}));
await pg.evaluate(()=>{window.dispatchEvent(new ErrorEvent('error',{message:'Boom Test',filename:'http://x/app.js',lineno:7}));window.dispatchEvent(new ErrorEvent('error',{message:'Boom Test',filename:'http://x/app.js',lineno:7}));window.dispatchEvent(new ErrorEvent('error',{message:'ResizeObserver loop completed with undelivered notifications.'}))});
Promise.resolve();await pg.evaluate(()=>{Promise.reject(new Error('Nope Test'))});await pg.waitForTimeout(200);
r=await pg.evaluate(()=>Health.errors());
T('Fehlerprotokoll: Fehler gesammelt, Wiederholung gezählt, ResizeObserver ignoriert, Promise-Fehler erfasst',r.some(e=>e.m==='Boom Test'&&e.c===2&&e.s==='app.js:7')&&!r.some(e=>/ResizeObserver/.test(e.m))&&r.some(e=>/Promise: Nope Test/.test(e.m)),r);
T('Bericht enthält Version, Gerät, Speicher und Fehler',await pg.evaluate(()=>{const t=Health.report();return /Version 1\.44/.test(t)&&/Gerät:/.test(t)&&/Audio im Speicher/.test(t)&&/Boom Test/.test(t)}));
r=await pg.evaluate(()=>{dawState.buffers.__t1={length:44100*300,numberOfChannels:2,duration:300};dawState.buffers.__t2={length:44100*300,numberOfChannels:2,duration:300};return Health.memory()});
T('Speicherschätzung: 2 × 300 s Stereo = 202 MB (Float32)',r.mb===202&&r.tracks>=2&&r.level==='ok',r);
r=await pg.evaluate(()=>{Object.defineProperty(navigator,'deviceMemory',{get:()=>2,configurable:true});return Health.memory().level});
T('Wenig Gerätespeicher (2 GB): schon 202 MB-Stufe „ok“, 3 Puffer → „warn“',r==='ok'&&await pg.evaluate(()=>{dawState.buffers.__t3={length:44100*300,numberOfChannels:2,duration:300};return Health.memory().level==='warn'}));
await pg.evaluate(()=>{window.__toasts=[];const o=window.toast;window.toast=(m,k)=>{window.__toasts.push(m);try{o&&o(m,k)}catch(e){}};Health.watch()});
T('Warnung als Hinweis eingeblendet',await pg.evaluate(()=>window.__toasts.some(m=>/Viel Audio im Arbeitsspeicher/.test(m))));
await openOpt(pg);
T('Optionen „Stabilität & Leistung“: Speicher, Protokoll, Hinweis auf unerwartetes Ende',await pg.evaluate(()=>{const s=document.getElementById('hl-sec').textContent;return /MB/.test(s)&&/Fehlerprotokoll/.test(s)&&/vermutlich unerwartet/.test(s)&&/Einträge/.test(s)}));
await pg.evaluate(()=>document.getElementById('hl-sec').scrollIntoView());await pg.screenshot({path:path.join(SHOT,'v114_health.png')});
await pg.evaluate(()=>{const c=document.querySelector('[data-hl-perf]');c.checked=true;c.dispatchEvent(new Event('change',{bubbles:true}))});
T('Sparmodus: Attribut gesetzt, Unschärfe/Schatten aus, gemerkt',await pg.evaluate(()=>document.documentElement.getAttribute('data-perf')==='on'&&localStorage.getItem('sunshine.perf')==='1'&&getComputedStyle(document.querySelector('header.sticky')).backdropFilter==='none'));
await pg.evaluate(()=>document.querySelector('[data-hl-fps]').click());await pg.waitForTimeout(2600);
T('Anzeige-Test liefert Bilder/s',await pg.evaluate(()=>/Bilder\/s/.test(document.querySelector('[data-hl-fpsres]').textContent)));
await pg.evaluate(()=>document.querySelector('[data-hl-clear]').click());
T('Protokoll leeren',await pg.evaluate(()=>Health.errors().length===0));
await pg.reload({waitUntil:'load'});await pg.waitForTimeout(500);
T('Sparmodus bleibt nach Neustart (schon vor dem ersten Bild)',await pg.evaluate(()=>document.documentElement.getAttribute('data-perf')==='on'));
T('Keine JS-Fehler (Stabilität; nur der absichtliche Test-Fehler)',pg.errs.length===1&&pg.errs[0]==='Nope Test',pg.errs);await pg.context().close();
console.log('\n'+ok+' ok, '+bad+' fehlgeschlagen');await b.close();srv.close();process.exit(bad?1:0)})();
