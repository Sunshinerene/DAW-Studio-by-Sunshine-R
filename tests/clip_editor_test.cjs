const http=require('http'),fs=require('fs'),path=require('path');const {chromium}=require('playwright');
const WORK=process.argv[2];const TW=fs.readFileSync(path.join(__dirname,'fixtures/tailwind.js'));
const srv=http.createServer((q,r)=>{const f=path.join(WORK,decodeURIComponent(q.url.split('?')[0]).replace(/^\//,''));fs.readFile(f,(e,d)=>{if(e){r.writeHead(404);r.end();return;}r.writeHead(200,{'content-type':f.endsWith('.html')?'text/html':'application/octet-stream'});r.end(d)})});
let ok=0,bad=0;const T=(n,c,x)=>{if(c){ok++;console.log('PASS',n)}else{bad++;console.log('FAIL',n,x||'')}};
(async()=>{await new Promise(r=>srv.listen(0,'127.0.0.1',r));const port=srv.address().port;const b=await chromium.launch();
const ctx=await b.newContext({viewport:{width:393,height:852},isMobile:true,hasTouch:true});await ctx.addInitScript(()=>{try{localStorage.setItem('sunshine.home','off')}catch(_){}});const pg=await ctx.newPage();const errs=[];pg.on('pageerror',e=>errs.push(e.message));
await pg.route(/cdn\.tailwindcss\.com/,r=>r.fulfill({status:200,contentType:'application/javascript',body:TW}));
await pg.route(/^https?:\/\/(?!127\.0\.0\.1|cdn\.tailwindcss\.com)/,r=>r.abort());
await pg.goto(`http://127.0.0.1:${port}/index_ueberarbeitet.html`,{waitUntil:'load'});await pg.waitForTimeout(1200);
const n=()=>pg.evaluate(()=>dawState.tracks.length);

const SHOT=path.join(__dirname,'../dist/_shots');const ev=(f,a)=>pg.evaluate(f,a);
await ev(async()=>{await audioEngine.ensureCtx();const ctx=audioEngine.ctx,sr=ctx.sampleRate;
 const bf=ctx.createBuffer(1,sr*12,sr),d=bf.getChannelData(0);for(let i=0;i<d.length;i++){const t=i/sr;d[i]=0.5*Math.sin(2*Math.PI*(t<6?220:440)*t)*(0.4+0.6*Math.abs(Math.sin(t*3)))}
 const t=createTrack('audio','Drums');dawState.buffers[t.id]=bf;window.__tid=t.id;
 const m=createTrack('midi','Melodie');window.__mid=m.id;
 const e=createTrack('audio','Leer');window.__eid=e.id;
 audioEngine.ensureTrackNode(t);audioEngine.ensureTrackNode(e);renderMultiTrackLanes();});
await ev(()=>{const i=document.getElementById('input-bpm');i.value=120;i.dispatchEvent(new Event('change',{bubbles:true}))});
const T0=()=>ev(()=>dawState.tracks.find(t=>t.id===__tid));
const clips=()=>ev(()=>{const t=dawState.tracks.find(t=>t.id===__tid);return ClipModel.list(t).map(c=>({id:c.id,start:+c.start.toFixed(3),offset:+c.offset.toFixed(3),dur:+c.dur.toFixed(3)}))});
const cbox=()=>pg.locator('#ce-canvas').boundingBox();
const X=t=>ev(t=>ClipEditor.timeToX(t),t);
const mouse=async(x1,y1,x2,y2)=>{const b=await cbox();await pg.mouse.move(b.x+x1,b.y+y1);await pg.mouse.down();await pg.mouse.move(b.x+(x1+x2)/2,b.y+(y1+y2)/2,{steps:4});await pg.mouse.move(b.x+x2,b.y+y2,{steps:4});await pg.mouse.up();await pg.waitForTimeout(80)};
const click=async(x,y)=>{const b=await cbox();await pg.mouse.click(b.x+x,b.y+y);await pg.waitForTimeout(80)};
const tool=async n=>{await pg.tap(`[data-ce-tool="${n}"]`);await pg.waitForTimeout(40)};
const act=async n=>{await pg.tap(`#clip-editor [data-ce="${n}"]`);await pg.waitForTimeout(100)};
// ---- Öffnen ----
await pg.evaluate(()=>window.scrollTo(0,0));
T('Spur-Zeile hat „⤢“-Knopf',await pg.locator(`[data-clipedit="${await ev(()=>__tid)}"]`).count()===1);
await pg.locator(`[data-clipedit="${await ev(()=>__tid)}"]`).first().tap();await pg.waitForTimeout(400);
T('Großansicht öffnet',await pg.locator('#clip-editor').isVisible());
T('Spurauswahl enthält alle Spuren',await ev(()=>document.getElementById('ce-track').options.length)===await ev(()=>dawState.tracks.length));
T('Werkzeug „Verschieben“ vorgewählt',await ev(()=>document.querySelector('[data-ce-tool="move"]').getAttribute('aria-pressed'))==='true');
T('Alle Werkzeug-Tasten ≥ 44 px hoch',(await ev(()=>[...document.querySelectorAll('#clip-editor .ce-btn')].every(b=>b.offsetHeight===0||b.getBoundingClientRect().height>=43.5))));
const px=await ev(()=>{const c=document.getElementById('ce-canvas');const x=c.getContext('2d');const d=x.getImageData(0,0,c.width,c.height).data;let n=0;for(let i=0;i<d.length;i+=4)if(d[i]>150)n++;return n});
T('Wellenform wird gezeichnet',px>200,String(px));
await pg.screenshot({path:SHOT+'/clip_editor_open.png'});
T('Zu Beginn 1 impliziter Clip, keine eigenen Clips',(await clips()).length===1&&(await T0()).clips===undefined);
// Auswahl (Verschieben-Werkzeug): Tippen wählt, ändert nichts
await click(await X(3),150);
T('Tippen wählt den Clip aus (ohne Änderung)',await ev(()=>ClipEditor.state.sel)==='implicit'&&(await T0()).clips===undefined);
// ---- Teilen ----
await tool('split');await click(await X(6),150);
let c=await clips();
T('Teilen-Werkzeug: Tipp bei 6 s → 2 Clips',c.length===2&&Math.abs(c[0].dur-6)<0.01&&Math.abs(c[1].start-6)<0.01&&Math.abs(c[1].offset-6)<0.01,JSON.stringify(c));
T('Rechter Teil ist ausgewählt',await ev(()=>ClipEditor.state.sel)===c[1].id);
T('Info-Zeile zeigt den Clip',/Start Takt/.test(await ev(()=>document.getElementById('ce-info').textContent)));
// ---- Verschieben ----
await tool('move');await mouse(await X(9),150,await X(12),150);
c=await clips();T('Verschieben: Clip 2 von 6 s auf 9 s (Raster 1/4)',Math.abs(c[1].start-9)<0.51&&c.length===2,JSON.stringify(c));
const mv=c[1].start;
T('…Quelle bleibt gleich (Offset 6 s)',Math.abs(c[1].offset-6)<1e-6);
// Ränder ziehen
await tool('trim');
const s1=c[1].start;await mouse((await X(s1))+6,150,(await X(s1+1))+6,150);
c=await clips();T('Zuschneiden links: Start +1 s, Quelle +1 s',Math.abs(c[1].start-(s1+1))<0.51&&Math.abs(c[1].offset-(6+(c[1].start-s1)))<0.01,JSON.stringify(c));
await act('fit');c=await clips();const e1=c[1].start+c[1].dur;await mouse((await X(e1))-6,150,(await X(e1-2))-6,150);
c=await clips();T('Zuschneiden rechts: Clip kürzer',Math.abs((c[1].start+c[1].dur)-(e1-2))<0.51,JSON.stringify(c));
await mouse((await X(e1-2))-6,150,(await X(e1+30))-6,150);
c=await clips();T('Rechts über das Dateiende ziehen: begrenzt auf Datei (12 s Quelle)',c[1].offset+c[1].dur<=12.001,JSON.stringify(c));
// Mitte im Trim-Werkzeug verschiebt nicht
const before=JSON.stringify(await clips());await mouse(await X(c[1].start+1),150,await X(c[1].start+3),150);
T('Trim-Werkzeug: Ziehen in der Clip-Mitte verändert nichts',JSON.stringify(await clips())===before);
// ---- Kopieren/Einfügen ----
await tool('move');await click(await X(c[1].start+0.5),150);
await act('copy');await ev(()=>audioEngine.seek(20));await act('paste');
c=await clips();T('Kopieren + Einfügen am Cursor (20 s)',c.length===3&&Math.abs(c[2].start-20)<0.01&&Math.abs(c[2].offset-c[1].offset)<1e-6,JSON.stringify(c));
await act('dup');c=await clips();T('Duplizieren: direkt hinter dem Original',c.length===4&&Math.abs(c[3].start-(c[2].start+c[2].dur))<0.01,JSON.stringify(c));
await act('del');T('Löschen entfernt den ausgewählten Clip',(await clips()).length===3);
await click(await X(20.5),150);await act('cut');
T('Ausschneiden entfernt + merkt sich',(await clips()).length===2&&await ev(()=>ClipModel.clipboard.clips.length)===1);
await ev(()=>audioEngine.seek(30));await act('paste');T('Einfügen nach Ausschneiden (30 s)',(await clips()).length===3&&Math.abs((await clips())[2].start-30)<0.01);
// Am Cursor teilen
await ev(()=>audioEngine.seek(3));await click(await X(1),150);await act('split-cursor');
c=await clips();T('„Am Cursor teilen“ bei 3 s trennt Clip 1',c.length===4&&Math.abs(c[0].dur-3)<0.01&&Math.abs(c[1].start-3)<0.01,JSON.stringify(c));
// Rückgängig / Vor
const nBefore=(await clips()).length;await act('undo');T('Rückgängig im Editor ('+nBefore+'→'+(await clips()).length+')',(await clips()).length===nBefore-1);
await act('redo');T('Vor im Editor',(await clips()).length===nBefore);
// Zoom
const z0=await ev(()=>ClipEditor.state.pps);await act('zoom-in');const z1=await ev(()=>ClipEditor.state.pps);await act('zoom-out');await act('zoom-out');const z2=await ev(()=>ClipEditor.state.pps);
T('Zoom + / −',z1>z0&&z2<z1);await act('fit');T('„Alles“ passt die Ansicht an',await ev(()=>ClipEditor.state.view)===0);
// Pinch (synthetische Zeiger)
const pinch=await ev(()=>{const cv=ClipEditor.canvas(),r=cv.getBoundingClientRect(),p0=ClipEditor.state.pps;
 const ev1=(t,id,x)=>cv.dispatchEvent(new PointerEvent(t,{pointerId:id,clientX:r.left+x,clientY:r.top+100,bubbles:true,pointerType:'touch'}));
 ev1('pointerdown',1,100);ev1('pointerdown',2,160);ev1('pointermove',1,60);ev1('pointermove',2,240);ev1('pointerup',1,60);ev1('pointerup',2,240);return {p0,p1:ClipEditor.state.pps}});
T('Zwei-Finger-Zoom vergrößert die Ansicht',pinch.p1>pinch.p0*1.5,JSON.stringify(pinch));
// Lineal setzt Cursor
await act('fit');await click(await X(5),12);T('Tipp ins Lineal setzt den Cursor',Math.abs(await ev(()=>dawState.playheadSec)-5)<0.2);
// Raster
await pg.selectOption('#ce-snap','bar');await tool('move');
const cc=await clips();const pick=cc[cc.length-1];await mouse((await X(pick.start+0.4)),150,(await X(pick.start+0.4))+37,150);
T('Raster „Takt“: Start auf ganzen Takt (2 s) gerastet',(await clips()).some(k=>Math.abs(k.start/2-Math.round(k.start/2))<1e-6));
await pg.selectOption('#ce-snap','beat');
// Tastatur
await click(await X((await clips())[0].start+0.3),150);const nk=(await clips()).length;await pg.keyboard.press('Delete');await pg.waitForTimeout(80);
T('Entf löscht ausgewählten Clip',(await clips()).length===nk-1);
await pg.keyboard.press('Control+z');await pg.waitForTimeout(80);T('Strg+Z holt ihn zurück',(await clips()).length===nk,(await clips()).length+' vs '+nk+' undo='+await ev(()=>typeof window.__dawUndo)+' focus='+await ev(()=>document.activeElement.tagName+'#'+document.activeElement.id));
// Hauptansicht aktuell
await ev(()=>renderMultiTrackLanes());
// Spur wechseln: MIDI
await pg.selectOption('#ce-track',await ev(()=>__mid));await pg.waitForTimeout(150);
T('MIDI-Spur: Hinweis + Knopf „Im Piano Roll öffnen“',await pg.locator('#ce-msg').isVisible()&&/Piano Roll/.test(await ev(()=>document.getElementById('ce-msg').textContent)));
T('…Clip-Werkzeuge gesperrt',await ev(()=>document.querySelector('[data-ce-tool="split"]').disabled));
// Leere Audio-Spur: einfügen aus anderer Spur
await pg.selectOption('#ce-track',await ev(()=>__eid));await pg.waitForTimeout(150);
T('Leere Spur: Hinweis',/Leere Audio-Spur/.test(await ev(()=>document.getElementById('ce-msg').textContent)));
await ev(()=>audioEngine.seek(2));await act('paste');
const emp=await ev(()=>{const t=dawState.tracks.find(t=>t.id===__eid);return {n:(t.clips||[]).length,own:(t.clips||[]).every(c=>c.src===__tid),start:(t.clips||[{}])[0].start}});
T('In leere Spur eingefügt (Quelle = Drums-Datei) bei 2 s',emp.n===1&&emp.own&&Math.abs(emp.start-2)<0.01,JSON.stringify(emp));
T('…Nachricht verschwindet',!await pg.locator('#ce-msg').isVisible());
// Zurücksetzen (2 Tipps)
await pg.selectOption('#ce-track',await ev(()=>__tid));await pg.waitForTimeout(150);
await act('reset');T('Zurücksetzen verlangt Bestätigung',(await T0()).clips!==undefined&&/Wirklich/.test(await ev(()=>document.getElementById('ce-reset').textContent)));
await act('reset');T('2. Tipp setzt Spur auf Originaldatei zurück',(await T0()).clips===undefined&&(await clips()).length===1);
// Mute/Solo/Vol in der Kopfzeile
await act('mute');T('Stumm-Knopf wirkt auf die Spur',await ev(()=>dawState.tracks.find(t=>t.id===__tid).mute)===true);await act('mute');
// Schließen + Hauptansicht
await pg.screenshot({path:SHOT+'/clip_editor_edited.png'});
await act('close');T('Schließen',!await pg.locator('#clip-editor').isVisible(),await ev(()=>{const e=document.getElementById('clip-editor');return e&&(e.className+'|'+e.hidden+'|'+getComputedStyle(e).display+'|'+ClipEditor.state.open)}));
// Doppeltipp auf Spur-Streifen
await ev(()=>{const c=document.querySelector('.track-lane-canvas[data-track-id="'+__tid+'"]');c.dispatchEvent(new MouseEvent('dblclick',{bubbles:true}))});await pg.waitForTimeout(250);
T('Doppeltipp auf den Spur-Streifen öffnet die Großansicht',await pg.locator('#clip-editor').isVisible()&&await ev(()=>ClipEditor.state.id)===await ev(()=>__tid));
await act('close');
T('Keine Skriptfehler',errs.length===0,errs.join(' | '));
console.log(`\n${ok} bestanden, ${bad} fehlgeschlagen`);await b.close();srv.close();process.exit(bad?1:0)})();
