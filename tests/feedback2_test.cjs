// 1.40: Feedback liegt über dem Player, Knopf im Player, Kategorie „Player“ + Bericht; Vorschau beim Einstellen zeigt nur die bediente Zeile
const http=require('http'),fs=require('fs'),path=require('path');const {chromium}=require('playwright');
const WORK=process.argv[2];
const srv=http.createServer((q,r)=>{const u=new URL(q.url,'http://x');const f=path.join(WORK,decodeURIComponent(u.pathname).replace(/^\//,''));fs.readFile(f,(e,d)=>{if(e){r.writeHead(404);r.end();return}
 r.writeHead(200,{'content-type':/\.html$/.test(f)?'text/html':/\.js$/.test(f)?'application/javascript':'application/octet-stream'});r.end(d)})});
let ok=0,bad=0;const T=(n,c,x)=>{if(c){ok++;console.log('PASS',n)}else{bad++;console.log('FAIL',n,x===undefined?'':JSON.stringify(x))}};
(async()=>{await new Promise(r=>srv.listen(0,'127.0.0.1',r));const port=srv.address().port;const b=await chromium.launch();
const ctx=await b.newContext({viewport:{width:393,height:852},isMobile:true,hasTouch:true});const pg=await ctx.newPage();const errs=[];pg.on('pageerror',e=>errs.push(e.message));
await pg.route(/^https?:\/\/(?!127\.0\.0\.1)/,r=>r.abort());
await pg.addInitScript(()=>{try{if(!sessionStorage.__i){sessionStorage.__i=1;localStorage.setItem('sunshine.home','off');localStorage.setItem('sunshine.news','{"seen":"1.48"}');localStorage.setItem('sunshine.fx',JSON.stringify({v:2,on:true,edge:'glow',full:'aurora',k:50,react:true}))}}catch(_){}});
await pg.goto(`http://127.0.0.1:${port}/index_ueberarbeitet.html`,{waitUntil:'load'});await pg.waitForTimeout(1200);
const ev=(f,a)=>pg.evaluate(f,a);
// ---- Ebenen
const z=await ev(()=>{const g=n=>parseInt(getComputedStyle(document.documentElement).getPropertyValue(n));return {p:g('--z-player'),o:g('--z-over-player'),f:g('--z-feedback'),h:g('--z-help')}});
T('Ebenen: Player < Optionen-über-Player < Feedback < Hilfe',z.p<z.o&&z.o<z.f&&z.f<z.h,z);
// ---- Feedback-Knopf im Player
await ev(()=>Player.open());await pg.waitForTimeout(300);
T('Player hat einen Feedback-Knopf in der Kopfzeile',await ev(()=>!!document.querySelector('#pl-root [data-pl="fb"]')));
await ev(()=>document.querySelector('#pl-root [data-pl="fb"]').click());await pg.waitForTimeout(300);
const vis=await ev(()=>{const r=document.getElementById('fb-root');if(!r)return null;const e=document.elementFromPoint(innerWidth/2,innerHeight/2);return {open:true,top:!!(e&&r.contains(e)),area:document.getElementById('fb-area').value}});
T('Feedback aus dem Player ist sichtbar (oberstes Element liegt im Feedback-Fenster)',vis&&vis.open&&vis.top,vis);
T('Betrifft steht auf „Player“',vis&&vis.area==='Player',vis);
const rep=await ev(()=>Feedback.compose());
T('Bericht enthält Abschnitt „Player“ mit Liste, Wiedergabe und Klang',/--- Player ---/.test(rep)&&/Liste: 0 Titel/.test(rep)&&/Wiedergabe: pausiert/.test(rep)&&/Klang: /.test(rep),rep);
T('Kategorie „Player & Klang“ in der Auswahl',await ev(()=>[...document.querySelectorAll('#fb-area option')].some(o=>/Player/.test(o.textContent))));
await ev(()=>Feedback.close());
// ---- aus den Optionen heraus (über dem Player)
await ev(()=>document.querySelector('#pl-root [data-pl="opts"]').click());await pg.waitForTimeout(500);
T('Optionen liegen über dem Player',await ev(()=>{const m=document.getElementById('settings-modal');if(!m)return false;const e=document.elementFromPoint(innerWidth/2,innerHeight/2);return m.contains(e)}));
await ev(()=>document.querySelector('[data-fb-open]').click());await pg.waitForTimeout(300);
const v2=await ev(()=>{const r=document.getElementById('fb-root');const e=document.elementFromPoint(innerWidth/2,innerHeight/2);return {has:!!r,top:!!(r&&e&&r.contains(e)),area:document.getElementById('fb-area').value,txt:Feedback.compose()}});
T('Optionen → Feedback öffnet sichtbar über Player und Optionen',v2.has&&v2.top,v2);
T('Aus den Optionen im Player erkennt „automatisch“ den Player',/Bereich: Player/.test(v2.txt)||v2.area==='Player',v2.area);
await ev(()=>Feedback.close());await pg.waitForTimeout(100);
T('Nach dem Schließen ist die Optionen-Ansicht wieder oben',await ev(()=>{const m=document.getElementById('settings-modal');const e=document.elementFromPoint(innerWidth/2,innerHeight/2);return !!m&&m.contains(e)}));
// Bereich wird bei jedem Öffnen neu erkannt (nicht hängen geblieben)
await ev(()=>{document.getElementById('settings-modal').remove();Player.close();});await pg.waitForTimeout(200);
await ev(()=>Feedback.open());T('Außerhalb des Players: Bereich nicht mehr „Player“',await ev(()=>document.getElementById('fb-area').value==='auto'&&!/--- Player ---/.test(Feedback.compose())));
await ev(()=>Feedback.close());
// ---- Vorschau beim Einstellen
await ev(()=>document.querySelector('#btn-settings').click());await pg.waitForTimeout(500);
await ev(()=>document.querySelector('[data-fx-edge="beam"]').click());await pg.waitForTimeout(150);
const pk=await ev(()=>{const m=document.getElementById('settings-modal'),p=m.firstElementChild;const cs=getComputedStyle(p);return {peek:m.classList.contains('peek'),clip:p.style.clipPath,op:cs.opacity}});
T('Umstellen eines Effekts: Fenster bleibt voll deckend, nur die bediente Zeile ist sichtbar (clip-path)',pk.peek&&/inset\(/.test(pk.clip)&&pk.op==='1',pk);
await pg.waitForTimeout(1900);
const pk2=await ev(()=>{const m=document.getElementById('settings-modal');return {peek:m.classList.contains('peek'),clip:m.firstElementChild.style.clipPath}});
T('Nach der Vorschau ist das Fenster wieder ganz da',!pk2.peek&&pk2.clip==='',pk2);
// Regler
await ev(()=>{const s=document.querySelector('[data-fx-k]');s.scrollIntoView({block:'center'});});await pg.waitForTimeout(200);
await ev(()=>{const s=document.querySelector('[data-fx-k]');s.value='80';s.dispatchEvent(new Event('input',{bubbles:true}))});
const pk3=await ev(()=>{const m=document.getElementById('settings-modal');return {peek:m.classList.contains('peek'),clip:m.firstElementChild.style.clipPath}});
T('Regler ziehen: Zeile bleibt sichtbar, Rest ausgeblendet',pk3.peek&&/inset\(/.test(pk3.clip),pk3);
await ev(()=>{const s=document.querySelector('[data-fx-k]');s.dispatchEvent(new Event('change',{bubbles:true}))});await pg.waitForTimeout(100);
T('Regler loslassen: Fenster wieder ganz',await ev(()=>{const m=document.getElementById('settings-modal');return !m.classList.contains('peek')&&m.firstElementChild.style.clipPath===''}));
// Design-Regler (Optionen-Basis)
const dr=await ev(()=>{const m=document.getElementById('settings-modal');const s=m.querySelector('[data-range="blur"]');if(!s)return null;s.scrollIntoView({block:'center'});s.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}));const a=m.classList.contains('peek')&&/inset\(/.test(m.firstElementChild.style.clipPath);s.dispatchEvent(new PointerEvent('pointerup',{bubbles:true}));return {a,b:!m.classList.contains('peek')}});
T('Design-Regler: gleiche ruhige Vorschau',dr&&dr.a&&dr.b,dr);
T('Keine Seitenfehler',errs.length===0,errs);
console.log(`\n${ok} bestanden, ${bad} fehlgeschlagen`);await b.close();srv.close();process.exit(bad?1:0)})();
