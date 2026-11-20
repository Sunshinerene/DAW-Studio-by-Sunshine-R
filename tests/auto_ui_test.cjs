const http=require('http'),fs=require('fs'),path=require('path');const {chromium}=require('playwright');
const WORK=process.argv[2];const TW=fs.readFileSync(path.join(__dirname,'fixtures/tailwind.js'));
const srv=http.createServer((q,r)=>{const f=path.join(WORK,decodeURIComponent(q.url.split('?')[0]).replace(/^\//,''));fs.readFile(f,(e,d)=>{if(e){r.writeHead(404);r.end();return;}r.writeHead(200,{'content-type':f.endsWith('.html')?'text/html':'application/octet-stream'});r.end(d)})});
let ok=0,bad=0;const T=(n,c,x)=>{if(c){ok++;console.log('PASS',n)}else{bad++;console.log('FAIL',n,x||'')}};
(async()=>{await new Promise(r=>srv.listen(0,'127.0.0.1',r));const port=srv.address().port;const b=await chromium.launch();
const ctx=await b.newContext({viewport:{width:393,height:852},isMobile:true,hasTouch:true});await ctx.addInitScript(()=>{try{localStorage.setItem('sunshine.home','off')}catch(_){}});const pg=await ctx.newPage();const errs=[];pg.on('pageerror',e=>errs.push(e.message));
await pg.route(/cdn\.tailwindcss\.com/,r=>r.fulfill({status:200,contentType:'application/javascript',body:TW}));
await pg.route(/^https?:\/\/(?!127\.0\.0\.1|cdn\.tailwindcss\.com)/,r=>r.abort());
await pg.goto(`http://127.0.0.1:${port}/index_ueberarbeitet.html`,{waitUntil:'load'});await pg.waitForTimeout(1200);
const SHOT=path.join(__dirname,'../dist/_shots');const ev=(f,a)=>pg.evaluate(f,a);
await ev(async()=>{await audioEngine.ensureCtx();const sr=44100;const b=audioEngine.ctx.createBuffer(1,sr*30,sr),d=b.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=0.4*Math.sin(2*Math.PI*220*i/sr)*(0.5+0.5*Math.sin(i/sr*2));
 const t=createTrack('audio','Gesang');dawState.buffers[t.id]=b;window.__tid=t.id;audioEngine.ensureTrackNode(t);const m=createTrack('midi','Keys');window.__mid=m.id;renderMultiTrackLanes();
 const i=document.getElementById('input-bpm');i.value=120;i.dispatchEvent(new Event('change',{bubbles:true}))});
const cbox=()=>pg.locator('#ce-canvas').boundingBox();const X=t=>ev(t=>ClipEditor.timeToX(t),t);
const click=async(x,y)=>{const b=await cbox();await pg.mouse.click(b.x+x,b.y+y);await pg.waitForTimeout(90)};
const mouse=async(x1,y1,x2,y2)=>{const b=await cbox();await pg.mouse.move(b.x+x1,b.y+y1);await pg.mouse.down();await pg.mouse.move(b.x+(x1+x2)/2,b.y+(y1+y2)/2,{steps:4});await pg.mouse.move(b.x+x2,b.y+y2,{steps:4});await pg.mouse.up();await pg.waitForTimeout(90)};
const act=async n=>{await pg.tap(`#clip-editor [data-ce="${n}"]`);await pg.waitForTimeout(110)};
const pts=k=>ev(k=>JSON.parse(JSON.stringify(AutoModel.get(dawState.tracks.find(t=>t.id===__tid),k))),k);
const geo=()=>ev(()=>({h:ClipEditor.state.h,pps:ClipEditor.state.pps}));
await ev(()=>ClipEditor.open(__tid));await pg.waitForTimeout(500);
T('Modus-Schalter Clips/Automation',await pg.locator('#ce-modes [data-ce-mode]').count()===2);
T('Clip-Werkzeuge sichtbar, Automationsleiste verborgen',await pg.locator('#ce-tools').isVisible()&&!await pg.locator('#ce-autorow').isVisible());
await pg.tap('[data-ce-mode="auto"]');await pg.waitForTimeout(200);
T('Automation: Parameterleiste sichtbar, Clip-Werkzeuge weg',await pg.locator('#ce-autorow').isVisible()&&!await pg.locator('#ce-tools').isVisible());
T('Drei Parameter (Lautstärke, Pan, Filter)',await pg.locator('#ce-autorow [data-ce-param]').count()===3);
T('Ansicht zeigt die ganze Zeitleiste',await ev(()=>ClipEditor.state.pps*audioEngine.getTotalArrangementBars()*2<=ClipEditor.state.w+2));
const G=await geo(),top=40,hh=G.h-30-20,mid=top+hh/2;
// Punkt setzen
await click(await X(4),mid-hh/4);let p=await pts('vol');
T('Tippen setzt Punkt bei 4 s',p.length===1&&Math.abs(p[0].t-4)<0.01,JSON.stringify(p));
T('…Wert ≈ 1,5 (obere Hälfte)',Math.abs(p[0].v-1.5)<0.08,JSON.stringify(p));
await click(await X(2),mid);p=await pts('vol');
T('2. Punkt, Zeit-sortiert, Wert rastet auf 1,0 (0 dB) ein',p.length===2&&p[0].t<p[1].t&&p[0].v===1,JSON.stringify(p));
// Ziehen
await mouse(await X(4),mid-hh/4,await X(6),mid+hh/4);p=await pts('vol');
T('Punkt ziehen ändert Zeit (6 s) und Wert (<1)',p.length===2&&Math.abs(p[1].t-6)<0.01&&p[1].v<0.7,JSON.stringify(p));
await ev(()=>{window.__dawUndo();ClipEditor.sync()});p=await pts('vol');
T('Rückgängig stellt die alte Position wieder her',Math.abs(p[1].t-4)<0.01&&p[1].v>1.3,JSON.stringify(p));
// Anzeige
T('Info nennt Parameter',/Lautstärke/.test(await pg.locator('#ce-info').innerText()));
// Löschen
await click(await X(4),mid-hh/4);
T('Auswahl aktiviert „Punkt löschen“',await ev(()=>!document.querySelector('[data-ce="ap-del"]').disabled));
await act('ap-del');p=await pts('vol');T('Punkt gelöscht',p.length===1,JSON.stringify(p));
await click(await X(8),mid-hh/3);await pg.keyboard.press('Delete');await pg.waitForTimeout(100);p=await pts('vol');
T('Entf löscht den gewählten Punkt',p.length===1);
// Parameter wechseln
await pg.tap('[data-ce-param="pan"]');await pg.waitForTimeout(150);await click(await X(3),mid);const pp=await pts('pan');
T('Pan: eigener Satz Punkte, Mitte = 0',pp.length===1&&pp[0].v===0&&(await pts('vol')).length===1,JSON.stringify(pp));
await pg.tap('[data-ce-param="filt"]');await pg.waitForTimeout(150);await click(await X(5),top+hh*0.25);const pf=await pts('filt');
T('Filter: Wert 0…1 (oberes Viertel ≈ 0,75)',pf.length===1&&Math.abs(pf[0].v-0.75)<0.08,JSON.stringify(pf));
T('Parameterknöpfe mit Kurve markiert',await ev(()=>document.querySelector('[data-ce-param="vol"]').style.borderColor!==''));
await pg.screenshot({path:SHOT+'/auto_editor.png'});
// Leeren + Undo, an/aus
await pg.tap('[data-ce-param="vol"]');await pg.waitForTimeout(100);await act('ap-clear');T('Kurve leeren',(await pts('vol')).length===0);
await ev(()=>{window.__dawUndo();ClipEditor.sync()});T('…rückgängig',(await pts('vol')).length===1);
await act('ap-on');T('Automation aus',await ev(()=>dawState.tracks.find(t=>t.id===__tid).autoOff)===true);
T('…Knopf zeigt „aus“',/aus/.test(await pg.locator('[data-ce="ap-on"]').innerText()));await act('ap-on');
T('…wieder an',await ev(()=>dawState.tracks.find(t=>t.id===__tid).autoOff)===undefined);
// Wiedergabe mit Automation
const play=await ev(async()=>{try{audioEngine.seek(0);await audioEngine.play();await new Promise(r=>setTimeout(r,600));audioEngine.stop(false);return 'ok'}catch(e){return 'ERR '+e.message}});
T('Wiedergabe mit Automation ohne Fehler',play==='ok',play);
// MIDI-Spur
await pg.selectOption('#ce-track',await ev(()=>__mid));await pg.waitForTimeout(200);
T('MIDI-Spur im Automations-Modus: kein Sperr-Hinweis',!await pg.locator('#ce-msg').isVisible());
await pg.tap('[data-ce-param="vol"]');await click(await X(2),mid);
T('…Punkte lassen sich setzen',await ev(()=>AutoModel.get(dawState.tracks.find(t=>t.id===__mid),'vol').length)===1);
await pg.tap('[data-ce-mode="clips"]');await pg.waitForTimeout(150);
T('Zurück in Clip-Modus: Hinweis für MIDI wieder da',await pg.locator('#ce-msg').isVisible());
// Projekt-Roundtrip
const rt=await ev(()=>{const j=JSON.stringify(dawState.tracks);const arr=JSON.parse(j);return arr.find(t=>t.id===__tid).auto.filt.length});
T('Automation steckt im Projekt-JSON',rt===1);
await act('close');
T('Keine Skriptfehler',errs.length===0,errs.join(' | '));
console.log(`\n${ok} bestanden, ${bad} fehlgeschlagen`);await b.close();srv.close();
})();
