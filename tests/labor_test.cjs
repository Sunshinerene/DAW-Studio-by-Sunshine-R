/* 1.47: Labor (Beta) – eigene Optionen-Kategorie; Ideen sind aus, bis man sie einschaltet; Feedback-Knopf pro Idee */
const http=require('http'),fs=require('fs'),path=require('path');const {chromium}=require('playwright');
const WORK=process.argv[2];
const srv=http.createServer((q,r)=>{const f=path.join(WORK,decodeURIComponent(q.url.split('?')[0]).replace(/^\//,''));fs.readFile(f,(e,d)=>{if(e){r.writeHead(404);r.end();return;}r.writeHead(200,{'content-type':f.endsWith('.html')?'text/html':'application/octet-stream'});r.end(d)})});
let ok=0,bad=0;const T=(n,c,x)=>{if(c){ok++;console.log('PASS',n)}else{bad++;console.log('FAIL',n,x===undefined?'':JSON.stringify(x))}};
(async()=>{await new Promise(r=>srv.listen(0,'127.0.0.1',r));const port=srv.address().port;const b=await chromium.launch();
const mk=async(init,keep)=>{const ctx=keep||await b.newContext({viewport:{width:393,height:852},isMobile:true,hasTouch:true});const pg=await ctx.newPage();pg.errs=[];pg.on('pageerror',e=>pg.errs.push(e.message));await pg.route(/^https?:\/\/(?!127\.0\.0\.1)/,r=>r.abort());
 if(!keep)await pg.addInitScript(i=>{try{if(!sessionStorage.__i){sessionStorage.__i=1;localStorage.setItem('sunshine.home','off');localStorage.setItem('sunshine.news','{"seen":"9.99"}');if(i)Object.keys(i).forEach(k=>localStorage.setItem(k,i[k]))}}catch(e){}},init||null);
 await pg.goto(`http://127.0.0.1:${port}/index_ueberarbeitet.html`,{waitUntil:'load'});await pg.waitForTimeout(1100);return pg};
const openOpt=async pg=>{await pg.evaluate(()=>document.getElementById('btn-settings').click());await pg.waitForTimeout(450)};
const vis=(pg,s)=>pg.locator(s).first().isVisible();
// ---- flache Liste (Tests)
let pg=await mk();await openOpt(pg);
T('Flache Liste: Labor-Bereich vorhanden und sichtbar',await vis(pg,'#lab-sec [data-lab-card="native-player"]'));
await pg.close();
// ---- Kategorien
pg=await mk({'sunshine.optnav':'on'});const ev=(f,a)=>pg.evaluate(f,a);await openOpt(pg);
T('Übersicht: 7 Kategorien, „Labor (Beta)“ dabei',await pg.locator('#on-home .on-card').count()===7&&!!(await pg.locator('[data-on-go=lab]').count()));
T('Karte zeigt „alles aus“',await ev(()=>/alles aus/.test(document.querySelector('[data-on-go=lab]').textContent)));
T('Labor-Inhalt zu, solange die Seite nicht offen ist',!await vis(pg,'#lab-sec'));
await pg.tap('[data-on-go=lab]');await pg.waitForTimeout(250);
T('Seite „Labor (Beta)“: Erklärtext und Platzhalter sichtbar',await vis(pg,'#lab-sec')&&await ev(()=>/Alles ist aus/.test(document.getElementById('lab-sec').textContent)&&!!document.querySelector('[data-lab-card="native-player"]')));
T('„Nativer Player“ ist als GEPLANT markiert, Schalter gesperrt, Hinweis auf neue App-Version',await ev(()=>{const c=document.querySelector('[data-lab-card="native-player"]');return /GEPLANT/.test(c.textContent)&&c.querySelector('input').disabled&&/APK/.test(c.textContent)}));
T('Geplante Idee lässt sich nicht einschalten',await ev(()=>Labor.set('native-player',true)===false&&!Labor.isOn('native-player')));
// Feedback pro Idee
await pg.tap('[data-lab-fb="native-player"]');await pg.waitForTimeout(500);
T('Feedback-Knopf öffnet das Feedback mit Bereich „Labor“ und Idee im Text',await ev(()=>{const r=document.getElementById('fb-root');return !!r&&document.getElementById('fb-area').value==='Labor'&&/Labor · Nativer Player/.test(document.getElementById('fb-text').value)}));
await ev(()=>Feedback.close());await pg.waitForTimeout(200);
// Registrierung einer Test-Idee
const calls=await ev(()=>{window.__c=[];Labor.register({id:'t1',title:'Test-Idee',desc:'Nur zum Prüfen',status:'beta',needs:''});Labor.use('t1',on=>window.__c.push(on));return window.__c.slice()});
T('Neue Idee: sofort sichtbar in der offenen Seite, standardmäßig AUS',await ev(()=>{const c=document.querySelector('[data-lab-card="t1"]');return !!c&&!c.querySelector('input').checked&&!Labor.isOn('t1')})&&calls.length===0);
T('Doppelte Registrierung wird abgelehnt',await ev(()=>Labor.register({id:'t1',title:'x'})===false));
await pg.tap('[data-lab-tg="t1"]');await pg.waitForTimeout(250);
T('Einschalten: Labor.isOn, Rückruf mit true, Zähler in der Karte, „Alle ausschalten“ erscheint',await ev(()=>Labor.isOn('t1')&&window.__c.join()==='true'&&!!document.querySelector('[data-lab-off]')&&Labor.active().join()==='t1'));
T('Zustand wird gespeichert',await ev(()=>JSON.parse(localStorage.getItem('sunshine.labor')).on.t1===true));
T('Feedback nennt die eingeschalteten Labor-Ideen',await ev(()=>/Labor eingeschaltet: t1/.test(Feedback.compose({cat:'note',text:'x',area:'Labor',dev:false,log:false}))));
T('Ohne Labor-Ideen steht keine Labor-Zeile im Feedback',await ev(()=>{Labor.set('t1',false);const s=Feedback.compose({cat:'note',text:'x',area:'Labor',dev:false,log:false});Labor.set('t1',true);return !/Labor eingeschaltet/.test(s)}));
await ev(()=>{const o=document.querySelector('[data-lab-off]');o&&o.click()});await pg.waitForTimeout(250);
T('„Alle ausschalten“ schaltet aus, Rückruf mit false, Knopf verschwindet',await ev(()=>!Labor.isOn('t1')&&window.__c[window.__c.length-1]===false&&!document.querySelector('[data-lab-off]')));
// Suche
await pg.tap('[data-on-back]');await pg.waitForTimeout(200);
await pg.fill('#on-q','labor');await pg.waitForTimeout(250);
T('Suche „labor“ findet den Bereich',await ev(()=>!document.getElementById('lab-sec').closest('.on-unit').hidden));
// nach Neuladen bleibt „an“
await ev(()=>{Labor.register({id:'t2',title:'Zweite',desc:'',status:'beta'});Labor.set('t2',true)});
const ctx=pg.context();await pg.close();
const pg2=await mk(null,ctx);
const st2=await pg2.evaluate(()=>JSON.parse(localStorage.getItem('sunshine.labor')));
T('Gespeichert: t2 an nach Neuladen (Schalter-Stand bleibt)',st2.on.t2===true);
const cb=await pg2.evaluate(()=>new Promise(res=>{const got=[];Labor.register({id:'t2',title:'Zweite',desc:'',status:'beta'});Labor.use('t2',on=>got.push(on));setTimeout(()=>res({got,on:Labor.isOn('t2')}),200)}));
T('Neu registrierte Idee, die zuletzt an war, meldet beim Start true',cb.on===true&&cb.got[0]===true,cb);
T('Keine JS-Fehler',pg.errs.length===0&&pg2.errs.length===0,[...pg.errs,...pg2.errs].slice(0,3));
console.log(`\n${ok} ok / ${bad} fail`);await b.close();srv.close();process.exit(bad?1:0)})();
