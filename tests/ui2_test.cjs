const http=require('http'),fs=require('fs'),path=require('path');const {chromium}=require('playwright');
const WORK=process.argv[2];const TW=fs.readFileSync(path.join(__dirname,'fixtures/tailwind.js'));
const srv=http.createServer((q,r)=>{const f=path.join(WORK,decodeURIComponent(q.url.split('?')[0]).replace(/^\//,''));fs.readFile(f,(e,d)=>{if(e){r.writeHead(404);r.end();return;}r.writeHead(200,{'content-type':f.endsWith('.html')?'text/html':'application/octet-stream'});r.end(d)})});
let ok=0,bad=0;const T=(n,c,x)=>{if(c){ok++;console.log('PASS',n)}else{bad++;console.log('FAIL',n,x||'')}};
(async()=>{await new Promise(r=>srv.listen(0,'127.0.0.1',r));const port=srv.address().port;const b=await chromium.launch();
const ctx=await b.newContext({viewport:{width:393,height:852},isMobile:true,hasTouch:true});await ctx.addInitScript(()=>{try{localStorage.setItem('sunshine.home','off');if(!sessionStorage.__d){sessionStorage.__d=1;localStorage.setItem('sunshine.dock',JSON.stringify({v:2,mode:'windows'}))}}catch(_){}});const pg=await ctx.newPage();const errs=[];pg.on('pageerror',e=>errs.push(e.message));
await pg.route(/cdn\.tailwindcss\.com/,r=>r.fulfill({status:200,contentType:'application/javascript',body:TW}));
await pg.route(/^https?:\/\/(?!127\.0\.0\.1|cdn\.tailwindcss\.com)/,r=>r.abort());
await pg.goto(`http://127.0.0.1:${port}/index_ueberarbeitet.html`,{waitUntil:'load'});await pg.waitForTimeout(1200);
const n=()=>pg.evaluate(()=>dawState.tracks.length);

const SHOT=path.join(__dirname,'../dist/_shots');const ev=(f,a)=>pg.evaluate(f,a);
const box=id=>pg.locator('#'+id).boundingBox();
await ev(async()=>{await audioEngine.ensureCtx();createTrack('audio','Drums');createTrack('midi','Melodie');renderMultiTrackLanes();});
// ---- Transport ----
const bx=await Promise.all(['btn-play','btn-stop','btn-loop','btn-metronome'].map(box));
console.log('  Größen:',bx.map(b=>Math.round(b.width)+'x'+Math.round(b.height)).join(' '));
T('Stopp/Loop/Klick gleich hoch, Play mindestens so hoch',bx.slice(1).every(b=>Math.abs(b.height-bx[1].height)<=1)&&bx[0].height>=bx[1].height-1);
T('…und gleich breit',bx.slice(1).every(b=>Math.abs(b.width-bx[1].width)<=1));
T('…mindestens 44 px hoch (Handy)',bx[0].height>=44);
const rs=await ev(()=>['btn-play','btn-stop','btn-loop','btn-metronome'].map(i=>getComputedStyle(document.getElementById(i)).borderRadius));
T('…gleiche Rundung',new Set(rs).size===1);
T('Stopp-Knopf trägt Beschriftung',/Stopp/.test(await ev(()=>document.getElementById('btn-stop').textContent)));
T('Loop: Status-Markierung an',await ev(()=>document.getElementById('btn-loop').dataset.on)==='1');
await pg.tap('#btn-loop');await pg.waitForTimeout(100);
T('Loop aus → Markierung aus',await ev(()=>document.getElementById('btn-loop').dataset.on)==='0');
await pg.tap('#btn-metronome');await pg.waitForTimeout(100);
T('Klick an → Markierung an',await ev(()=>document.getElementById('btn-metronome').dataset.on)==='1');
const bx2=await Promise.all(['btn-play','btn-stop','btn-loop','btn-metronome'].map(box));
T('Größen bleiben nach Umschalten gleich',bx2.every((b,i)=>Math.abs(b.width-bx[i].width)<=1&&Math.abs(b.height-bx[i].height)<=1));
await pg.tap('#btn-metronome');await pg.tap('#btn-loop');
await pg.screenshot({path:SHOT+'/ui2_transport.png',clip:{x:0,y:0,width:393,height:330}});
// ---- Zurück / Vor ----
T('Zurück/Vor haben Pfeil-Symbole (SVG)',await ev(()=>!!document.querySelector('#btn-undo svg')&&!!document.querySelector('#btn-redo svg')));
const ub=await box('btn-undo');T('…Symbol gut sichtbar (≥ 20 px)',(await ev(()=>document.querySelector('#btn-undo svg').getBoundingClientRect().width))>=20);
T('Beschriftung bleibt (Zurück / Vor)',/Zurück/.test(await ev(()=>document.getElementById('btn-undo').textContent))&&/Vor/.test(await ev(()=>document.getElementById('btn-redo').textContent)));
// ---- Fenster ----
T('Fenster-Modus Standard',await ev(()=>document.documentElement.dataset.dock)==='windows');
T('4 Fenster mit Kopfzeile',await pg.locator('.dock-win').count()===4&&await pg.locator('.dock-win-head').count()===4);
const vis=id=>pg.locator('#'+id).isVisible();
T('Editor offen, andere zu',await vis('tab-panel-midi')&&!await vis('tab-panel-drums')&&!await vis('tab-panel-vocals')&&!await vis('tab-panel-mixer'));
await pg.locator('.dock-win-head[data-win-toggle="drums"]').scrollIntoViewIfNeeded();
await pg.tap('.dock-win-head[data-win-toggle="drums"]');await pg.waitForTimeout(200);
T('Drums-Fenster öffnet, Editor bleibt offen',await vis('tab-panel-drums')&&await vis('tab-panel-midi'));
await pg.tap('.dock-win-head[data-win-toggle="midi"]');await pg.waitForTimeout(150);
T('Editor einklappen',!await vis('tab-panel-midi')&&await vis('tab-panel-drums'));
await pg.tap('.dock-win-head[data-win-toggle="mixer"]');await pg.waitForTimeout(250);
T('Mixer öffnen zeichnet die Kanalzüge',await ev(()=>document.getElementById('tab-panel-mixer').querySelectorAll('input[type=range]').length)>0);
await pg.tap('.dock-win-head[data-win-toggle="midi"]');await pg.waitForTimeout(300);
const pr=await ev(()=>{const c=document.getElementById('piano-roll-canvas');return c?[c.width,c.height]:[0,0]});
T('Piano-Roll nach erneutem Öffnen sichtbar gezeichnet ('+pr+')',pr[0]>100&&pr[1]>50);
// Zustand merken
await pg.reload({waitUntil:'load'});await pg.waitForTimeout(1200);
T('Zustand bleibt nach Neustart (Editor+Drums+Mixer offen, Vocal zu)',await vis('tab-panel-midi')&&await vis('tab-panel-drums')&&await vis('tab-panel-mixer')&&!await vis('tab-panel-vocals'));
// untere Leiste öffnet Fenster
await ev(()=>DockWin.openAll(false));await pg.waitForTimeout(150);
T('Alle zu möglich',!await vis('tab-panel-midi')&&!await vis('tab-panel-drums')&&!await vis('tab-panel-mixer'));
await pg.tap('#bottom-nav button[data-tab="vocals"]');await pg.waitForTimeout(400);
T('Untere Leiste „Vocal“ öffnet Vocal-Fenster',await vis('tab-panel-vocals'));
await pg.tap('#bottom-nav button[data-tab="drums"]');await pg.waitForTimeout(400);
T('…und „Drums“ zusätzlich (Vocal bleibt)',await vis('tab-panel-drums')&&await vis('tab-panel-vocals'));
await pg.tap('#bottom-nav button[data-tab="drums"]');await pg.waitForTimeout(400);
T('Zweiter Tipp auf „Drums“ lässt es offen (kein Flackern)',await vis('tab-panel-drums'));
// Spuren einklappen
await pg.evaluate(()=>window.scrollTo(0,0));
T('Spuren-Bereich sichtbar',await vis('multitrack-lanes'));
await pg.tap('#mt-collapse');await pg.waitForTimeout(150);
T('Spuren einklappen',!await vis('multitrack-lanes'));
await pg.tap('#mt-collapse');await pg.waitForTimeout(150);
T('Spuren wieder ausklappen',await vis('multitrack-lanes'));
// Reiter-Modus
await pg.tap('#btn-menu');await pg.tap('#btn-settings');await pg.waitForTimeout(250);
T('Optionen: Auswahl der Bereiche-Darstellung (3 Modi)',await pg.locator('select[data-dockmode] option').count()===3);
await pg.selectOption('select[data-dockmode]','tabs');await pg.waitForTimeout(250);
await pg.tap('#settings-modal [data-close]');
T('Reiter-Modus: Fenster-Köpfe weg',!await pg.locator('.dock-win-head').first().isVisible());
const nv=await ev(()=>[...document.querySelectorAll('.dock-tab-panel')].filter(p=>p.offsetParent!==null).length);
T('Reiter-Modus: genau 1 Panel sichtbar ('+nv+')',nv===1);
await pg.locator('select[data-dockmode]').count();
await ev(()=>DockWin.setMode('windows'));await pg.waitForTimeout(200);
T('Zurück in Fenster-Modus',await ev(()=>document.documentElement.dataset.dock)==='windows');
await pg.evaluate(()=>window.scrollTo(0,document.body.scrollHeight));await pg.waitForTimeout(200);
await pg.screenshot({path:SHOT+'/ui2_windows.png'});
T('Keine Skriptfehler',errs.length===0,errs.join(' | '));
console.log(`\n${ok} bestanden, ${bad} fehlgeschlagen`);await b.close();srv.close();process.exit(bad?1:0)})();
