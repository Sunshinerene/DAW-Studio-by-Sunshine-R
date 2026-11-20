const http=require('http'),fs=require('fs'),path=require('path');const {chromium}=require('playwright');
const WORK=process.argv[2];
const srv=http.createServer((q,r)=>{const f=path.join(WORK,decodeURIComponent(q.url.split('?')[0]).replace(/^\//,''));fs.readFile(f,(e,d)=>{if(e){r.writeHead(404);r.end();return;}r.writeHead(200,{'content-type':/\.html$/.test(f)?'text/html':/\.js$/.test(f)?'application/javascript':'application/octet-stream'});r.end(d)})});
let ok=0,bad=0;const T=(n,c,x)=>{if(c){ok++;console.log('PASS',n)}else{bad++;console.log('FAIL',n,x===undefined?'':JSON.stringify(x))}};
(async()=>{await new Promise(r=>srv.listen(0,'127.0.0.1',r));const port=srv.address().port;const b=await chromium.launch();
const mk=async(vp,dock,mobile)=>{const ctx=await b.newContext({viewport:vp,isMobile:!!mobile,hasTouch:!!mobile});const pg=await ctx.newPage();pg.__errs=[];pg.on('pageerror',e=>pg.__errs.push(e.message));await pg.route(/^https?:\/\/(?!127\.0\.0\.1)/,r=>r.abort());
 await pg.addInitScript(d=>{try{if(!sessionStorage.__i){sessionStorage.__i=1;localStorage.setItem('sunshine.home','off');localStorage.setItem('sunshine.news','{"seen":"9.99"}');if(d)localStorage.setItem('sunshine.dock',d)}}catch(e){}},dock||null);
 await pg.goto(`http://127.0.0.1:${port}/index_ueberarbeitet.html`,{waitUntil:'load'});await pg.waitForTimeout(1200);return pg};
let pg=await mk({width:393,height:852},null,true);const ev=(f,a)=>pg.evaluate(f,a);
T('Standard: Modus „big“, Startleiste mit 4 Knöpfen sichtbar, Dock-Bereich ausgeblendet',await ev(()=>{const l=document.getElementById('bw-launch');const d=document.querySelector('.bw-dock');return DockWin.mode==='big'&&document.documentElement.dataset.dock==='big'&&l&&!l.hidden&&l.querySelectorAll('[data-bw-open]').length===4&&getComputedStyle(d).display==='none'}));
T('Kein Bereich liegt offen im Hauptfenster (Piano Roll nicht sichtbar)',await ev(()=>{const c=document.getElementById('piano-roll-canvas');return c.getBoundingClientRect().width===0}));
await ev(()=>document.querySelector('[data-bw-open="midi"]').click());await pg.waitForTimeout(500);
const w1=await ev(()=>{const r=document.getElementById('bw-root'),p=document.getElementById('tab-panel-midi'),c=document.getElementById('piano-roll-canvas'),h=document.querySelector('header').getBoundingClientRect();return {vis:!r.hidden,inside:p.parentNode.id==='bw-body',cw:Math.round(c.getBoundingClientRect().width),ch:Math.round(c.getBoundingClientRect().height),top:Math.round(r.getBoundingClientRect().top),hb:Math.round(h.bottom),title:r.querySelector('[data-bw-title]').textContent,open:DockWin.isOpen('midi')}});
T('MIDI-Fenster öffnet: Panel im Fenster, Piano Roll hat Größe, Fenster beginnt unter der Kopfleiste',w1.vis&&w1.inside&&w1.cw>300&&w1.ch>300&&w1.top>=w1.hb-1&&/MIDI/.test(w1.title)&&w1.open,w1);
T('Transport bleibt erreichbar (Play-Knopf nicht verdeckt)',await ev(()=>{const b=document.getElementById('btn-play').getBoundingClientRect();const e=document.elementFromPoint(b.left+b.width/2,b.top+b.height/2);return !!e&&(e.id==='btn-play'||!!e.closest('#btn-play'))}));
T('Piano Roll wird gezeichnet (Canvas hat Inhalt)',await ev(()=>{const c=document.getElementById('piano-roll-canvas');const d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let n=0;for(let i=3;i<d.length;i+=4*97)if(d[i]>0)n++;return n>50}));
// Gruppen
const g=async n=>{await ev(n=>document.querySelector(`[data-mseg="${n}"]`).click(),n);await pg.waitForTimeout(150);return ev(()=>{const v=id=>{const e=document.getElementById(id);return !!e&&e.getBoundingClientRect().width>0&&getComputedStyle(e).display!=='none'};return {trans:!!document.querySelector('[data-trans="12"]')&&document.querySelector('[data-trans="12"]').getBoundingClientRect().width>0,arp:v('btn-apply-arp'),quant:v('btn-midi-quantize'),a2m:v('btn-extract-midi'),syn:v('sl-m-cutoff'),pr:v('piano-roll-canvas'),rec:v('btn-midi-rec-arm')}})};
const g1=await g(1);T('Gruppe „Raster“: Transponieren sichtbar, andere Werkzeuge verborgen, Piano Roll sichtbar',g1.trans&&!g1.arp&&!g1.quant&&!g1.a2m&&!g1.syn&&g1.pr,g1);
const g2=await g(2);T('Gruppe „Tonart“: Quantisieren sichtbar',g2.quant&&!g2.arp&&!g2.trans&&g2.pr,g2);
const g3=await g(3);T('Gruppe „Generator“: Arpeggio/Pattern sichtbar',g3.arp&&!g3.quant&&g3.pr,g3);
const g4=await g(4);T('Gruppe „Audio→MIDI“: Extraktor sichtbar',g4.a2m&&!g4.arp&&g4.pr,g4);
const g5=await g(5);T('Gruppe „Klang“: Synth-Regler und MIDI-Rec sichtbar, Piano Roll bleibt',g5.syn&&g5.rec&&g5.pr&&!g5.a2m,g5);
await g(1);
T('Gewählte Gruppe wird gemerkt',await ev(()=>localStorage.getItem('sunshine.midigroup')==='1'));
// Piano Roll bedienbar
const nn=await ev(()=>{const t=dawState.tracks.find(x=>x.type==='midi');return t?t.id:null});
const note=await pg.evaluate(()=>{const c=document.getElementById('piano-roll-canvas');const r=c.getBoundingClientRect();return {x:r.left+r.width*0.5,y:r.top+r.height*0.5}});
const before=await ev(()=>(dawState.midiNotes||[]).length);
await pg.mouse.click(note.x,note.y);await pg.waitForTimeout(300);
T('Piano Roll im Fenster ist bedienbar (Klick setzt eine Note)',await ev(b=>(dawState.midiNotes||[]).length>b,before),[before,await ev(()=>(dawState.midiNotes||[]).length)]);
// Umschalten über untere Leiste
await ev(()=>document.querySelector('#bottom-nav [data-tab="mixer"]').click());await pg.waitForTimeout(500);
const w2=await ev(()=>({cur:BigWin.current(),midiHome:document.getElementById('tab-panel-midi').closest('.dock-win')!==null,mixIn:document.getElementById('tab-panel-mixer').parentNode.id==='bw-body',mw:Math.round(document.getElementById('mixer-container')?document.getElementById('mixer-container').getBoundingClientRect().width:-1)}));
T('Untere Leiste: Mixer ersetzt den Editor, Editor-Panel ist zurück im Dock',w2.cur==='mixer'&&w2.midiHome&&w2.mixIn,w2);
await ev(()=>document.querySelector('#btn-nav-tracks').click());await pg.waitForTimeout(300);
T('„Spuren“ schließt das Fenster, alle Panels wieder im Dock',await ev(()=>{const r=document.getElementById('bw-root');return r.hidden&&BigWin.current()===null&&['midi','drums','vocals','mixer'].every(k=>!!document.getElementById('tab-panel-'+k).closest('.dock-win'))}));
await ev(()=>document.querySelector('[data-bw-open="drums"]').click());await pg.waitForTimeout(400);
await ev(()=>document.querySelector('[data-bw-open="drums"]').click());await pg.waitForTimeout(200);
T('Zweiter Tipp auf denselben Knopf schließt',await ev(()=>BigWin.current()===null));
await ev(()=>document.querySelector('[data-bw-open="vocals"]').click());await pg.waitForTimeout(300);
T('Android-Zurück schließt zuerst das Fenster',await ev(()=>{const r=window.__androidBack();return r===true&&BigWin.current()===null}));
await ev(()=>document.querySelector('[data-bw-open="midi"]').click());await pg.waitForTimeout(300);
await pg.keyboard.press('Escape');await pg.waitForTimeout(200);
T('Escape schließt das Fenster',await ev(()=>BigWin.current()===null));
// Optionen: Modus wechseln
await ev(()=>{document.querySelector('#btn-settings').click()});await pg.waitForTimeout(500);
await ev(()=>{const s=document.querySelector('[data-dockmode]');s.value='windows';s.dispatchEvent(new Event('change',{bubbles:true}))});await pg.waitForTimeout(400);
T('Optionen → „Untereinander“: Startleiste weg, Dock wieder sichtbar, Mode gespeichert',await ev(()=>{const d=document.querySelector('.bw-dock');return DockWin.mode==='windows'&&document.getElementById('bw-launch').hidden&&getComputedStyle(d).display!=='none'&&JSON.parse(localStorage.getItem('sunshine.dock')).mode==='windows'}));
await ev(()=>{const s=document.querySelector('[data-dockmode]');s.value='tabs';s.dispatchEvent(new Event('change',{bubbles:true}))});await pg.waitForTimeout(300);
T('Optionen → „Reiter“ funktioniert weiterhin',await ev(()=>DockWin.mode==='tabs'));
await ev(()=>{const s=document.querySelector('[data-dockmode]');s.value='big';s.dispatchEvent(new Event('change',{bubbles:true}))});await pg.waitForTimeout(300);
T('Zurück auf „Großes Fenster“',await ev(()=>DockWin.mode==='big'&&!document.getElementById('bw-launch').hidden));
T('Keine Seitenfehler (Handy)',pg.__errs.length===0,pg.__errs);
// Migration
const m1=await mk({width:393,height:852},'{"mode":"windows","open":{"midi":true}}',true);
T('Migration: gespeicherter alter Standard „windows“ → „big“',await m1.evaluate(()=>DockWin.mode==='big'));
const m2=await mk({width:393,height:852},'{"mode":"tabs"}',true);
T('Migration: bewusst gewählte Reiter bleiben',await m2.evaluate(()=>DockWin.mode==='tabs'&&!document.querySelector('.bw-dock').hidden&&getComputedStyle(document.querySelector('.bw-dock')).display!=='none'));
const m3=await mk({width:393,height:852},'{"mode":"windows","v":2,"open":{"midi":true}}',true);
T('Migration: neue Version mit „windows“ bleibt „windows“',await m3.evaluate(()=>DockWin.mode==='windows'));
// Desktop
const dk=await mk({width:1200,height:800},null,false);
await dk.evaluate(()=>document.querySelector('[data-bw-open="mixer"]').click());await dk.waitForTimeout(500);
T('Desktop: Reiter-Chips im Fenster sichtbar, Wechsel zu Drums',await dk.evaluate(async()=>{const c=document.querySelectorAll('[data-bw-go]');const vis=c[0].getBoundingClientRect().width>0;document.querySelector('[data-bw-go="drums"]').click();await new Promise(r=>setTimeout(r,300));return c.length===4&&vis&&BigWin.current()==='drums'}));
T('Desktop: USB-MIDI-Knopf bleibt erreichbar (im MIDI-Fenster)',await dk.evaluate(async()=>{document.querySelector('[data-bw-go="midi"]').click();await new Promise(r=>setTimeout(r,300));const w=document.getElementById('btn-connect-webmidi').getBoundingClientRect();return w.width>0&&!!document.getElementById('btn-connect-webmidi').closest('#bw-root')}));
T('Keine Seitenfehler (Desktop)',dk.__errs.length===0,dk.__errs);
console.log(`\n${ok} bestanden, ${bad} fehlgeschlagen`);await b.close();srv.close();process.exit(bad?1:0)})();
