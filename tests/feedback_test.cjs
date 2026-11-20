const http=require('http'),fs=require('fs'),path=require('path');const {chromium}=require('playwright');
const WORK=process.argv[2];
const srv=http.createServer((q,r)=>{const u=new URL(q.url,'http://x');const f=path.join(WORK,decodeURIComponent(u.pathname).replace(/^\//,''));fs.readFile(f,(e,d)=>{if(e){r.writeHead(404);r.end();return;}
 let body=d;if(/\.html$/.test(f)){let t=d.toString();if(u.searchParams.get('repo'))t=t.replace("repo:'__BUILD_REPO__'","repo:'o/r'").replace("n:'__BUILD_N__'","n:'7'");t=t.replace(/const MAIL = "[^"]*";/,u.searchParams.get('mail')?'const MAIL = "test@example.com";':'const MAIL = "";');body=t}
 r.writeHead(200,{'content-type':/\.html$/.test(f)?'text/html':/\.js$/.test(f)?'application/javascript':'application/octet-stream'});r.end(body)})});
let ok=0,bad=0;const T=(n,c,x)=>{if(c){ok++;console.log('PASS',n)}else{bad++;console.log('FAIL',n,x===undefined?'':JSON.stringify(x))}};
(async()=>{await new Promise(r=>srv.listen(0,'127.0.0.1',r));const port=srv.address().port;const b=await chromium.launch();
const mk=async(q,init,routeFn)=>{const ctx=await b.newContext({viewport:{width:393,height:852},isMobile:true,hasTouch:true});const pg=await ctx.newPage();pg.__errs=[];pg.on('pageerror',e=>pg.__errs.push(e.message));
 await pg.route(/^https?:\/\/(?!127\.0\.0\.1)/,r=>routeFn?routeFn(r):r.abort());
 await pg.addInitScript(i=>{try{if(!sessionStorage.__i){sessionStorage.__i=1;localStorage.setItem('sunshine.home','off');localStorage.setItem('sunshine.news','{"seen":"1.30"}');if(i)Object.keys(i).forEach(k=>localStorage.setItem(k,i[k]))}}catch(e){}},init||null);
 await pg.goto(`http://127.0.0.1:${port}/index_ueberarbeitet.html${q||''}`,{waitUntil:'load'});await pg.waitForTimeout(1200);return pg};
let pg=await mk('?mail=1');const ev=(f,a)=>pg.evaluate(f,a);
// ---------- Feedback
T('Module vorhanden',await ev(()=>!!window.Feedback&&!!window.Preview));
await ev(()=>document.querySelector('#btn-menu').click());await pg.waitForTimeout(300);
T('Datei-Menü enthält „Feedback senden“',await ev(()=>!!document.getElementById('btn-feedback')));
await ev(()=>document.getElementById('btn-feedback').click());await pg.waitForTimeout(300);
T('Dialog öffnet mit 5 Arten, Beschreibung, Betrifft, Kontakt, 2 Häkchen',await ev(()=>{const r=document.getElementById('fb-root');return !!r&&r.querySelectorAll('[data-cat]').length===5&&!!r.querySelector('#fb-text')&&!!r.querySelector('#fb-area')&&!!r.querySelector('#fb-contact')&&r.querySelectorAll('.fb-ck input').length===2}));
await pg.fill('#fb-text','Der Mixer springt beim Öffnen zurück.\nZweite Zeile.');await pg.fill('#fb-contact','tester@example.org');
await ev(()=>document.querySelector('[data-cat="idea"]').click());
const c1=await ev(()=>Feedback.compose());
T('Text enthält Art, Bereich, Beschreibung, Kontakt, Version und Gerät',/Art: 💡 Idee/.test(c1)&&/Bereich: /.test(c1)&&/Mixer springt/.test(c1)&&/tester@example.org/.test(c1)&&/Version 1\.\d+/.test(c1)&&/Gerät: /.test(c1)&&/Fehlerprotokoll \(/.test(c1),c1.slice(0,300));
await ev(()=>{const c=document.getElementById('fb-log');c.click()});await ev(()=>{const c=document.getElementById('fb-dev');c.click()});
const c2=await ev(()=>Feedback.compose());
T('Häkchen aus → Fehlerprotokoll und Geräteangaben fehlen im Text',!/Fehlerprotokoll/.test(c2)&&!/Gerät:/.test(c2)&&/Mixer springt/.test(c2));
T('Vorschau „Das wird gesendet“ zeigt denselben Text',await ev(()=>document.getElementById('fb-pre').textContent===Feedback.compose()));
T('Entwurf wird gespeichert',await ev(()=>/Mixer springt/.test(JSON.parse(localStorage.getItem('sunshine.feedback')).text)));
// E-Mail
const mail=await ev(()=>{window.__hrefs=[];const o=HTMLAnchorElement.prototype.click;HTMLAnchorElement.prototype.click=function(){window.__hrefs.push(this.href)};document.querySelector('[data-fb="mail"]').click();HTMLAnchorElement.prototype.click=o;return window.__hrefs});
T('E-Mail: mailto-Link mit Empfänger, Betreff und Text',mail.length===1&&/^mailto:test@example\.com\?subject=/.test(mail[0])&&/body=/.test(mail[0])&&decodeURIComponent(mail[0]).includes('Mixer springt'),mail);
await pg.fill('#fb-text','Langer Text. '.repeat(400));await ev(()=>{document.getElementById('fb-log').click();document.getElementById('fb-dev').click()});
const lm=await ev(()=>{const m=Feedback.mailtoUrl();return {len:m.url.length,cut:m.cut}});
T('Langer Bericht: mailto bleibt unter 2000 Zeichen und wird als gekürzt markiert',lm.len<=2000&&lm.cut,lm);
// Teilen
await ev(()=>{window.__sh=[];navigator.share=async d=>{window.__sh.push(d)}});await ev(()=>document.querySelector('[data-fb="share"]').click());await pg.waitForTimeout(300);
T('Teilen: Systemdialog bekommt Betreff und Text',await ev(()=>window.__sh.length===1&&window.__sh[0].title==='Feedback Sunshine@R DAW Studio'&&/Langer Text/.test(window.__sh[0].text)));
await ev(()=>{window.Capacitor={isNativePlatform:()=>true,Plugins:{Share:{share:async d=>{window.__cs=d}}}}});await ev(()=>document.querySelector('[data-fb="share"]').click());await pg.waitForTimeout(300);
T('Teilen in der Android-App nutzt das Share-Plugin',await ev(()=>!!window.__cs&&/Feedback/.test(window.__cs.title)));
await ev(()=>{delete window.Capacitor;window.saveOrShareBlob=async(b,n)=>{window.__file={n,size:b.size,type:b.type}}});await ev(()=>document.querySelector('[data-fb="file"]').click());await pg.waitForTimeout(300);
T('Als Datei: .txt wird erzeugt',await ev(()=>window.__file&&/^sunshine-feedback-.*\.txt$/.test(window.__file.n)&&window.__file.size>200),await ev(()=>window.__file));
await pg.fill('#fb-text','');
await ev(()=>{window.__toasts=[];const o=window.toast;window.toast=(m,k)=>{window.__toasts.push(m)}});
await ev(()=>document.querySelector('[data-fb="share"]').click());await pg.waitForTimeout(200);
T('Leerer Text: wird nicht gesendet, Hinweis erscheint',await ev(()=>window.__toasts.some(t=>/beschreiben/.test(t))&&window.__sh.length===1));
await ev(()=>Feedback.close());
// Ohne Adresse
const p2=await mk('');T('Ohne Empfänger-Adresse: E-Mail-Knopf markiert, Hinweis erklärt Alternativen',await p2.evaluate(()=>{Feedback.open();return document.querySelector('[data-fb="mail"]').hasAttribute('data-nomail')&&/keine Empfänger-Adresse/i.test(document.getElementById('fb-note').textContent)&&Feedback.mail()===''}));
// Bereich automatisch
T('Bereich „automatisch“ erkennt geöffnetes Fenster',await ev(async()=>{BigWin.open('mixer');await new Promise(r=>setTimeout(r,200));Feedback.open();return /Bereich: Mixer/.test(Feedback.compose())}));
await ev(()=>{Feedback.close();BigWin.close()});
// Entwurf überlebt Neustart
await pg.reload({waitUntil:'load'});await pg.waitForTimeout(1000);
T('Nach Neustart: Entwurf noch da',await ev(()=>{Feedback.open();return document.getElementById('fb-text').value.length>=0&&JSON.parse(localStorage.getItem('sunshine.feedback')).cat==='idea'}));
T('Android-Zurück schließt den Dialog',await ev(()=>{const r=window.__androidBack();return r===true&&!document.getElementById('fb-root')}));
// Optionen + Startseite
await ev(()=>{document.querySelector('#btn-settings').click()});await pg.waitForTimeout(500);
T('Optionen: Abschnitt „Feedback & Vorschau“ mit beiden Knöpfen',await ev(()=>{const s=document.getElementById('fb-sec');return !!s&&!!s.querySelector('[data-fb-open]')&&!!s.querySelector('[data-fb-prev]')}));
await ev(()=>document.querySelector('[data-fb-open]').click());await pg.waitForTimeout(300);
T('Optionen → „Feedback senden“ öffnet den Dialog',await ev(()=>!!document.getElementById('fb-root')));
await ev(()=>Feedback.close());
await ev(()=>{Home.open()});await pg.waitForTimeout(500);
await ev(()=>document.getElementById('hm-fb').click());await pg.waitForTimeout(300);
T('Startseite: „💬 Feedback“ öffnet den Dialog',await ev(()=>!!document.getElementById('fb-root')));
await ev(()=>Feedback.close());
// ---------- Vorschau
T('Startseite zeigt die eingebaute Vorschau-Karte',await ev(()=>{const c=document.querySelector('#hm-update [data-pv-card]');return !!c&&/Bald in der App/.test(c.textContent)&&/Dockbar/.test(c.textContent)}));
await ev(()=>document.querySelector('[data-pv="more"]').click());await pg.waitForTimeout(300);
T('„Mehr“ öffnet „Was ist neu“ mit Vorschau-Abschnitt oben',await ev(()=>{const n=document.getElementById('nw-root');return !!n&&!!n.querySelector('.nw-e.pv')&&n.querySelector('.nw-body').firstElementChild.classList.contains('pv')}));
await ev(()=>document.querySelector('#nw-root [data-nw-x]').click());
await ev(()=>{Home.open()});await pg.waitForTimeout(300);
await ev(()=>document.querySelector('[data-pv="no"]').click());await pg.waitForTimeout(300);
T('„Ausblenden“ versteckt die Karte dauerhaft',await ev(()=>!document.querySelector('#hm-update [data-pv-card]')&&Preview._state().seen===Preview.hash()));
await pg.reload({waitUntil:'load'});await pg.waitForTimeout(1000);await ev(()=>Home.open());await pg.waitForTimeout(400);
T('Nach Neustart bleibt sie ausgeblendet',await ev(()=>!document.querySelector('#hm-update [data-pv-card]')));
T('Parser: Titel und Stichpunkte, Kommentare ignoriert',await ev(()=>{const p=Preview.parse('# Vorschau\n<!-- x -->\n## 1.18 in Arbeit\n- **Neu** A\n* B\n\ntext');return p.title==='1.18 in Arbeit'&&p.items.length===2&&p.items[0]==='Neu A'}));
// Live aus dem Repo
const md='# Vorschau\n## Version 1.99 – in Arbeit\n### Kommt definitiv\n- Live-Punkt Eins\n### Zum Testen\n- Live-Punkt Zwei\n### Ideen\n- Live-Punkt Drei\n';let hits=[];
const p3=await mk('?repo=1',null,r=>{const u=r.request().url();hits.push(u);if(/raw\.githubusercontent\.com\/o\/r\/main\/VORSCHAU\.md/.test(u))r.fulfill({status:200,contentType:'text/plain',headers:{'access-control-allow-origin':'*'},body:md});else r.abort()});
const f3=await p3.evaluate(async()=>{const r=await Preview.fetch(true);return {r,d:Preview.data()}});
T('Live: VORSCHAU.md wird von GitHub geholt und ersetzt die eingebaute',f3.r.ok&&f3.d.title==='Version 1.99 – in Arbeit'&&f3.d.items.length===3&&f3.d.kinds.join()==='bald,test,idee'&&hits.some(u=>/\/o\/r\/main\/VORSCHAU\.md/.test(u)),f3);
await p3.evaluate(()=>Home.open());await p3.waitForTimeout(500);
T('Live: Karte zeigt die neuen Punkte (neuer Inhalt = wieder sichtbar)',await p3.evaluate(()=>{const c=document.querySelector('#hm-update [data-pv-card]');return !!c&&/Live-Punkt Eins/.test(c.textContent)}));

T('Vorschau: Gruppen „Kommt / Zum Testen / Idee“ erscheinen mit Markierung in „Was ist neu“',await p3.evaluate(()=>{const h=Preview.section();return /Kommt<\/span> Live-Punkt Eins/.test(h)&&/Zum Testen<\/span> Live-Punkt Zwei/.test(h)&&/Idee<\/span> Live-Punkt Drei/.test(h)}));
// Veraltete Datei im Repo (nennt nicht neuere Version als die App) wird ignoriert
const pOld=await mk('?repo=1',null,r=>{if(/VORSCHAU\.md/.test(r.request().url()))r.fulfill({status:200,contentType:'text/plain',headers:{'access-control-allow-origin':'*'},body:'# Vorschau\n## Version 1.20 – in Arbeit\n- Alter Text\n- Noch älterer Text\n'});else r.abort()});
const fo=await pOld.evaluate(async()=>{const r=await Preview.fetch(true);return {r,d:Preview.data()}});
T('Veraltete Vorschau im Repo (Version ≤ App) wird ignoriert – eingebauter Text bleibt',fo.r.ok&&fo.d.title!=='Version 1.20 – in Arbeit'&&!fo.d.items.some(x=>/Alter Text/.test(x))&&/1\.\d+/.test(fo.d.title)&&fo.d.items.length>=3,fo);
const eq=await pOld.evaluate(()=>{const v=window.SUNSHINE_BUILD.v;return v});
T('Version der App ist bekannt',/^1\.\d+/.test(eq),eq);
await p3.reload({waitUntil:'load'});await p3.waitForTimeout(900);
T('Live-Stand wird gemerkt (offline weiterhin sichtbar)',await p3.evaluate(()=>Preview.data().items[0]==='Live-Punkt Eins'));
// Fehlerfälle
hits=[];const p4=await mk('?repo=1',null,r=>r.fulfill({status:404,body:'nf'}));
const f4=await p4.evaluate(async()=>{const r=await Preview.fetch(true);return {r,d:Preview.data()}});
T('404/Fehler: eingebaute Vorschau bleibt, kein Absturz',!f4.r.ok&&f4.d.items.length>=1&&p4.__errs.length===0,f4);
const f5=await pg.evaluate(async()=>{const r=await Preview.fetch(true);return r});
T('Ohne Repo-Angabe (Entwicklungsversion): kein Netzabruf',f5.ok===false);
const p6=await mk('?repo=1',null,r=>{const u=r.request().url();if(/raw\.githubusercontent/.test(u))r.fulfill({status:200,contentType:'text/plain',body:'# Vorschau\n'});else r.abort()});
T('Leere Datei im Repo: Vorschau-Karte verschwindet',await p6.evaluate(async()=>{await Preview.fetch(true);Home.open();await new Promise(r=>setTimeout(r,400));return Preview.data().items.length===0&&!document.querySelector('#hm-update [data-pv-card]')}));
T('Keine Seitenfehler',pg.__errs.length===0&&p3.__errs.length===0&&p6.__errs.length===0,[pg.__errs,p3.__errs,p6.__errs]);
console.log(`\n${ok} bestanden, ${bad} fehlgeschlagen`);await b.close();srv.close();process.exit(bad?1:0)})();
