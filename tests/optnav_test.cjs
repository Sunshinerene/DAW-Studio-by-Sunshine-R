const http=require('http'),fs=require('fs'),path=require('path');const {chromium}=require('playwright');
const WORK=process.argv[2];
const srv=http.createServer((q,r)=>{const f=path.join(WORK,decodeURIComponent(q.url.split('?')[0]).replace(/^\//,''));fs.readFile(f,(e,d)=>{if(e){r.writeHead(404);r.end();return;}r.writeHead(200,{'content-type':/\.html$/.test(f)?'text/html':/\.js$/.test(f)?'application/javascript':'application/octet-stream'});r.end(d)})});
let ok=0,bad=0;const T=(n,c,x)=>{if(c){ok++;console.log('PASS',n)}else{bad++;console.log('FAIL',n,x===undefined?'':JSON.stringify(x))}};
(async()=>{await new Promise(r=>srv.listen(0,'127.0.0.1',r));const port=srv.address().port;const b=await chromium.launch();
const mk=async(init)=>{const ctx=await b.newContext({viewport:{width:393,height:852},isMobile:true,hasTouch:true});const pg=await ctx.newPage();pg.__errs=[];pg.on('pageerror',e=>pg.__errs.push(e.message));
 await pg.route(/^https?:\/\/(?!127\.0\.0\.1)/,r=>r.abort());
 await pg.addInitScript(i=>{try{if(!sessionStorage.__i){sessionStorage.__i=1;localStorage.setItem('sunshine.home','off');localStorage.setItem('sunshine.news','{"seen":"1.30"}');if(i)Object.keys(i).forEach(k=>localStorage.setItem(k,i[k]))}}catch(e){}},init||null);
 await pg.goto(`http://127.0.0.1:${port}/index_ueberarbeitet.html`,{waitUntil:'load'});await pg.waitForTimeout(1200);return pg};
const openOpt=async pg=>{await pg.tap('#btn-menu');await pg.tap('#btn-settings');await pg.waitForTimeout(450)};
const vis=(pg,s)=>pg.locator(s).first().isVisible();
// ---- Test-Umgebung (webdriver) → flache alte Liste
let pg=await mk();await openOpt(pg);
T('Automatisierte Tests: flache Liste (keine Kategorien)',!await pg.locator('#on-home').count()&&await vis(pg,'#up-sec')&&await vis(pg,'#theme-grid'));
await pg.close();
// ---- Kategorien aktiv
pg=await mk({'sunshine.optnav':'on'});const ev=(f,a)=>pg.evaluate(f,a);await openOpt(pg);
T('Übersicht: 6 Kategorien-Karten',await pg.locator('#on-home .on-card').count()===6);
T('Übersicht: Suchfeld sichtbar, keine Zurück-Leiste',await vis(pg,'#on-q')&&!await vis(pg,'.on-back'));
T('Übersicht: Einzel-Bereiche noch zu (Updates, Design, Speicher)',!await vis(pg,'#up-sec')&&!await vis(pg,'#theme-grid')&&!await vis(pg,'#sv-sec'));
T('Karten zeigen Kurztext (aktuelles Design, Speicher)',await ev(()=>{const t=document.querySelector('[data-on-go=look]').textContent;return /Aurora|Studio|Neon|Liquid|Klassisch/.test(t)&&/Arbeitsspeicher/.test(document.querySelector('[data-on-go=perf]').textContent)}));
T('Alle 19 Einheiten verteilt, keine Seite „Weiteres“',await ev(()=>document.querySelectorAll('.on-unit').length===19&&!document.querySelector('[data-on-page=more]')),await ev(()=>document.querySelectorAll('.on-unit').length));
T('Jeder Bereich genau einmal vorhanden',await ev(()=>['hp-sec','theme-grid','fx-sec','ly-sec','up-sec','hl-sec','sv-sec','fb-sec'].every(i=>document.querySelectorAll('#'+i).length===1)));
const expect={look:['#theme-grid','#opt-dockmode','[data-accent-auto]','[data-radius=round]'],fx:['#fx-sec','#ly-sec'],sound:['[data-spessa]','[data-bp-load]','[data-ai-settings]','[data-ui=voice]'],perf:['#hl-sec','#sv-sec'],data:['#up-sec','#up-sec input'],help:['#hp-sec','#fb-sec']};
for(const k of Object.keys(expect)){await pg.tap(`[data-on-go=${k}]`);await pg.waitForTimeout(250);
 const a=await Promise.all(expect[k].map(s=>vis(pg,s)));
 T(`Kategorie „${k}“: Inhalt sichtbar, Zurück-Leiste da, Übersicht zu`,a.every(Boolean)&&await vis(pg,'.on-back')&&!await vis(pg,'#on-home'),a);
 await pg.tap('[data-on-back]');await pg.waitForTimeout(150);}
T('Zurück: wieder Übersicht mit Suche',await vis(pg,'#on-home')&&await vis(pg,'#on-q'));
// ---- Funktion in Seiten
await pg.tap('[data-on-go=perf]');await pg.waitForTimeout(200);
const before=await ev(()=>!!document.querySelector('#sv-sec input[type=checkbox]').checked);
await pg.locator('#sv-sec input[type=checkbox]').first().tap();await pg.waitForTimeout(250);
T('Schalter in Unterseite funktioniert (Speicher-Sparer)',await ev(()=>!!document.querySelector('#sv-sec input[type=checkbox]').checked)!==before);
await pg.locator('#sv-sec input[type=checkbox]').first().tap();await pg.waitForTimeout(150);
await pg.tap('[data-on-back]');
await pg.tap('[data-on-go=data]');await pg.waitForTimeout(200);
await pg.locator('#up-sec button',{hasText:'Was ist neu'}).first().tap();await pg.waitForTimeout(400);
T('Knopf in Unterseite funktioniert („Was ist neu?“ öffnet)',await vis(pg,'#nw-root'));
await ev(()=>document.querySelector('#nw-root [data-nw-close],#nw-root button')&&window.News&&News.close&&News.close());await pg.waitForTimeout(200);
await ev(()=>{const r=document.getElementById('nw-root');if(r)r.remove()});
// ---- Design-Wechsel baut Fenster neu auf: Seite bleibt
await pg.tap('[data-on-back]');await pg.tap('[data-on-go=look]');await pg.waitForTimeout(200);
await pg.locator('[data-theme-id=studio]').tap();await pg.waitForTimeout(600);
T('Design-Wechsel: Fenster neu aufgebaut, Seite „Design“ bleibt',await ev(()=>SunshineTheme.get()==='studio'&&OptNav.page()==='look')&&await vis(pg,'#theme-grid')&&await vis(pg,'.on-back'),await ev(()=>OptNav.page()));
await pg.locator('[data-theme-id=aurora]').tap();await pg.waitForTimeout(500);
// ---- Suche
await pg.tap('[data-on-back]');
await pg.fill('#on-q','update');await pg.waitForTimeout(250);
T('Suche „update“: Updates-Bereich da, Übersicht weg, Löschen-Knopf',await vis(pg,'#up-sec')&&!await vis(pg,'#on-home')&&await vis(pg,'[data-on-clear]'));
T('Suche „update“: Design-Raster ausgeblendet',!await vis(pg,'#theme-grid'));
await pg.fill('#on-q','xyzzyq');await pg.waitForTimeout(200);
T('Suche ohne Treffer: Hinweis „Nichts gefunden“',await vis(pg,'#on-empty'));
await pg.fill('#on-q','farbe');await pg.waitForTimeout(200);
T('Suche „farbe“ findet Akzentfarbe (Design)',await vis(pg,'[data-accent-auto]'));
await pg.fill('#on-q','sicherung wöchentlich');await pg.waitForTimeout(200);
T('Suche mit zwei Wörtern (alle müssen passen)',await vis(pg,'#up-sec')&&!await vis(pg,'#fx-sec'));
await pg.tap('[data-on-clear]');await pg.waitForTimeout(200);
T('Suche leeren: wieder Übersicht',await vis(pg,'#on-home')&&await ev(()=>document.getElementById('on-q').value===''));
// ---- Zurück-Taste (Android) und Escape
await pg.tap('[data-on-go=fx]');await pg.waitForTimeout(150);
const r1=await ev(()=>window.__androidBack());
T('Android-Zurück auf Unterseite: zurück zur Übersicht, Fenster bleibt offen',r1===true&&await vis(pg,'#on-home')&&await vis(pg,'#settings-modal'));
const r2=await ev(()=>window.__androidBack());await pg.waitForTimeout(250);
T('Android-Zurück auf Übersicht: Optionen schließen',r2===true&&!await pg.locator('#settings-modal').count());
await openOpt(pg);await pg.tap('[data-on-go=perf]');await pg.waitForTimeout(150);await pg.keyboard.press('Escape');await pg.waitForTimeout(200);
T('Escape auf Unterseite: zurück zur Übersicht (Fenster offen)',await vis(pg,'#on-home')&&await vis(pg,'#settings-modal'));
T('Neu geöffnet: immer Übersicht',await(async()=>{await pg.tap('#settings-modal [data-close]');await pg.waitForTimeout(250);await openOpt(pg);return await vis(pg,'#on-home')&&await ev(()=>OptNav.page()===null)})());
// ---- Kopfzeile bleibt beim Scrollen sichtbar
await pg.tap('[data-on-go=data]');await pg.waitForTimeout(200);
await ev(()=>{const s=document.querySelector('#settings-modal [role=dialog]');s.scrollTop=s.scrollHeight});await pg.waitForTimeout(200);
T('Lange Seite: Zurück-Leiste bleibt oben sichtbar (sticky)',await ev(()=>{const h=document.getElementById('on-head').getBoundingClientRect(),d=document.querySelector('#settings-modal [role=dialog]').getBoundingClientRect();return Math.abs(h.top-d.top)<24&&h.height>40}));
T('Keine Seitenfehler',pg.__errs.length===0,pg.__errs);
await pg.screenshot({path:'/tmp/optnav_final.png'});
console.log(`\n${ok} bestanden, ${bad} fehlgeschlagen`);await b.close();srv.close();process.exit(bad?1:0)})();
