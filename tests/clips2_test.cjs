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
// ===== Modell: Hüllkurve über Offline-Rendering =====
const R=await ev(async()=>{await audioEngine.ensureCtx();const sr=44100;
 const mk=(len)=>{const b=audioEngine.ctx.createBuffer(1,sr*len,sr);b.getChannelData(0).fill(1);return b};
 async function render(clips,xf){const t=createTrack('audio','T');dawState.buffers[t.id]=mk(20);t.clips=clips.map((c,i)=>Object.assign({id:'k'+i,src:t.id,offset:0},c));if(xf===false)t.xfade=false;
  const off=new OfflineAudioContext(1,sr*12,sr),dst=off.createGain();dst.connect(off.destination);ClipModel.scheduleOffline(off,t,dst,12);
  const r=await off.startRendering(),d=r.getChannelData(0);return at=>d[Math.round(at*sr)]}
 const out={};let f=await render([{start:0,dur:6,fi:1,fo:1,g:0.5}]);out.fi=[f(0.5),f(2),f(5.5),f(5.99)];out.g=f(3);
 f=await render([{start:0,dur:4},{start:3,dur:4}]);out.xf=[f(2),f(3.5),f(5)];
 f=await render([{start:0,dur:4},{start:3,dur:4}],false);out.noxf=f(3.5);
 f=await render([{start:0,dur:10},{start:3,dur:2}]);out.inner=f(4);
 out.pts=ClipModel.envPoints(4,1,1,1,0,4);out.pts2=ClipModel.envPoints(4,1,1,1,0.5,4);out.pts3=ClipModel.envPoints(4,1,1,1,0,2);
 return out});
const near=(a,b,e=0.06)=>Math.abs(a-b)<e;
T('Einblenden: bei 0,5 s halber Pegel (×0,5 Clip-Pegel)',near(R.fi[0],0.25),R.fi[0]);
T('Clip-Pegel 0,5 gilt auf dem Plateau',near(R.g,0.5),R.g);
T('Ausblenden: bei 5,5 s halber Pegel, am Ende ~0',near(R.fi[2],0.25)&&R.fi[3]<0.02,JSON.stringify(R.fi));
T('Überblendung: Summe in der Überlappung bleibt ≈1',near(R.xf[1],1,0.08)&&near(R.xf[0],1)&&near(R.xf[2],1),JSON.stringify(R.xf));
T('Überblenden aus: Überlappung addiert sich (≈2)',near(R.noxf,2),R.noxf);
T('Innen liegender Clip: keine Überblendung (Summe 2)',near(R.inner,2),R.inner);
T('Hüllkurve: 4 Punkte 0→1→1→0',JSON.stringify(R.pts)==='[[0,0],[1,1],[3,1],[4,0]]',JSON.stringify(R.pts));
T('Start mitten im Fade: Anfangspegel 0,5',near(R.pts2[0][1],0.5)&&R.pts2[0][0]===0.5,JSON.stringify(R.pts2));
T('Abgeschnitten (Loop-Ende): kurzer Ausblend am Schnitt',R.pts3[R.pts3.length-1][0]===2&&R.pts3[R.pts3.length-1][1]===0,JSON.stringify(R.pts3));
// ===== Modell: Operationen =====
const M=await ev(()=>{const t=createTrack('audio','Ops');dawState.buffers[t.id]=audioEngine.ctx.createBuffer(1,44100*10,44100);
 t.clips=[{id:'a',src:t.id,offset:0,start:0,dur:2},{id:'b',src:t.id,offset:2,start:2,dur:2},{id:'c',src:t.id,offset:4,start:4,dur:2,g:0.7,fi:0.3,fo:0.4}];
 const o={};ClipModel.ripple(t,['b']);o.rip=t.clips.map(c=>[c.id,c.start]);
 const t3=createTrack('audio','Ops3');dawState.buffers[t3.id]=audioEngine.ctx.createBuffer(1,44100*10,44100);t3.clips=[{id:'l',src:t3.id,offset:0,start:0,dur:2}];const n=ClipModel.loopTo(t3,t3.clips[0],7);o.loop=[n,t3.clips.map(c=>[+c.start.toFixed(2),+c.dur.toFixed(2)])];
 const t2=createTrack('audio','Ops2');dawState.buffers[t2.id]=audioEngine.ctx.createBuffer(1,44100*10,44100);t2.clips=[{id:'x',src:t2.id,offset:0,start:0,dur:6,g:0.5,fo:1}];
 ClipModel.split(t2,3);o.split=t2.clips.map(c=>[c.start,c.dur,c.g,c.fo||0]);
 ClipModel.copy(t,[t.clips.find(c=>c.g===0.7).id]);const made=ClipModel.paste(t,9);o.paste=[made[0].g,made[0].fi,made[0].fo];return o});
T('Lücke schließen: spätere Clips rücken nach',JSON.stringify(M.rip)==='[["a",0],["c",2]]',JSON.stringify(M.rip));
T('Schleife: Clip [0,2] bis 7 s → 3 Kopien (2,4,6 s), letzte 1 s',M.loop[0]===3&&JSON.stringify(M.loop[1].slice(0,4))==='[[0,2],[2,2],[4,2],[6,1]]',JSON.stringify(M.loop));
T('Teilen: Pegel beidseitig, Ausblenden nur rechts',JSON.stringify(M.split)==='[[0,3,0.5,0],[3,3,0.5,1]]',JSON.stringify(M.split));
T('Einfügen übernimmt Pegel und Fades',M.paste[0]===0.7&&M.paste[1]===0.3&&M.paste[2]===0.4,JSON.stringify(M.paste));
// ===== Editor =====
await ev(async()=>{const sr=44100;const b=audioEngine.ctx.createBuffer(1,sr*12,sr),d=b.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=0.6*Math.sin(2*Math.PI*220*i/sr);
 const t=createTrack('audio','Edit');dawState.buffers[t.id]=b;window.__tid=t.id;audioEngine.ensureTrackNode(t);renderMultiTrackLanes();
 const i=document.getElementById('input-bpm');i.value=120;i.dispatchEvent(new Event('change',{bubbles:true}))});
const cbox=()=>pg.locator('#ce-canvas').boundingBox();const X=t=>ev(t=>ClipEditor.timeToX(t),t);
const mouse=async(x1,y1,x2,y2)=>{const b=await cbox();await pg.mouse.move(b.x+x1,b.y+y1);await pg.mouse.down();await pg.mouse.move(b.x+(x1+x2)/2,b.y+(y1+y2)/2,{steps:4});await pg.mouse.move(b.x+x2,b.y+y2,{steps:4});await pg.mouse.up();await pg.waitForTimeout(80)};
const click=async(x,y)=>{const b=await cbox();await pg.mouse.click(b.x+x,b.y+y);await pg.waitForTimeout(90)};
const tool=async n=>{await pg.tap(`[data-ce-tool="${n}"]`);await pg.waitForTimeout(40)};
const act=async n=>{await pg.tap(`#clip-editor [data-ce="${n}"]`);await pg.waitForTimeout(110)};
const clips=()=>ev(()=>{const t=dawState.tracks.find(t=>t.id===__tid);return JSON.parse(JSON.stringify(ClipModel.list(t)))});
await ev(()=>ClipEditor.open(__tid));await pg.waitForTimeout(500);
T('Vier Werkzeuge (inkl. Schleife)',await pg.locator('#ce-tools [data-ce-tool]').count()===4);
T('Eigenschaften-Zeile erst bei Auswahl',!await pg.locator('#ce-props').isVisible());
// Teilen in 3 Clips
await ev(()=>{const t=dawState.tracks.find(t=>t.id===__tid);window.__dawPushUndo();ClipModel.split(t,4);ClipModel.split(t,8);ClipEditor.sync();ClipEditor.draw()});
await ev(()=>{ClipEditor.state.view=0;ClipEditor.state.pps=25;ClipEditor.state.dirty=true});await pg.waitForTimeout(100);
let cl=await clips();T('3 Clips à 4 s',cl.length===3);
// Auswahl
await tool('move');await click(await X(2),150);
T('Auswahl zeigt Pegel/Fade-Regler',await pg.locator('#ce-props').isVisible());
// Pegel per Regler
await pg.locator('#ce-gain').evaluate(el=>{el.value=0.5;el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}))});await pg.waitForTimeout(100);
cl=await clips();T('Clip-Pegel 0,5 gesetzt (nur gewählter Clip)',cl[0].g===0.5&&cl[1].g==null,JSON.stringify(cl.map(c=>c.g)));
T('Pegel-Anzeige in dB',/−6\.0 dB/.test(await pg.locator('#ce-gv').innerText()),await pg.locator('#ce-gv').innerText());
await pg.locator('#ce-fi').evaluate(el=>{el.value=1;el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}))});await pg.waitForTimeout(100);
cl=await clips();T('Einblenden 1 s gesetzt',cl[0].fi===1,JSON.stringify(cl[0]));
await ev(()=>window.__dawUndo());await ev(()=>ClipEditor.sync());cl=await clips();T('Rückgängig nimmt Fade zurück',!cl[0].fi&&cl[0].g===0.5,JSON.stringify(cl[0]));
// Fade-Griff ziehen (oben links am gewählten Clip → nach rechts)
await ev(()=>{ClipEditor.state.sel=null;ClipEditor.state.multi=[]});await click(await X(2),150);
const hx=await X(cl[0].start),y=30+8+12;await mouse(hx+1,y,await X(1.5),y);
cl=await clips();T('Fade-Griff ziehen setzt Einblenden ≈1,5 s',Math.abs((cl[0].fi||0)-1.5)<0.1,JSON.stringify(cl[0]));
const ox=await X(cl[0].start+cl[0].dur);await mouse(ox-1,y,await X(3),y);cl=await clips();
T('Ausblend-Griff ziehen: Ausblenden ≈1 s',Math.abs((cl[0].fo||0)-1)<0.1,JSON.stringify(cl[0]));
await pg.screenshot({path:SHOT+'/clip_fades.png'});
// Mehrfachauswahl
await act('multi');T('Mehrfach-Modus aktiv',await ev(()=>ClipEditor.state.multiMode));
await click(await X(6),150);await click(await X(10),150);
T('3 Clips ausgewählt (1 + 2 getippt)',await ev(()=>{const e=ClipEditor.state;return 1+e.multi.length})===3);
T('Info zeigt „3 Clips ausgewählt“',/3 Clips ausgewählt/.test(await pg.locator('#ce-info').innerText()));
await act('multi');
// Gruppe verschieben
await act('all');T('„Alle wählen“ wählt 3',await ev(()=>1+ClipEditor.state.multi.length)===3);
const s0=(await clips()).map(c=>c.start);await mouse(await X(6),150,(await X(6))+40,150);
const s1=(await clips()).map(c=>c.start);
T('Gruppe zusammen verschoben (gleiche Differenz > 0)',s1.every((v,i)=>Math.abs(v-s0[i]-(s1[0]-s0[0]))<1e-6)&&s1[0]-s0[0]>0.5,JSON.stringify([s0,s1]));
// Duplizieren der Gruppe
await act('dup');cl=await clips();T('Duplizieren der Gruppe → 6 Clips',cl.length===6,String(cl.length));
await ev(()=>window.__dawUndo());await ev(()=>ClipEditor.sync());
// Löschen + Lücke schließen
await ev(()=>{const t=dawState.tracks.find(t=>t.id===__tid);const e=ClipEditor.state;e.sel=ClipModel.list(t)[1].id;e.multi=[];ClipEditor.sync()});
const before=await clips();await act('ripple');cl=await clips();
T('Löschen + Lücke zu: 2 Clips, hinterer rückt auf',cl.length===2&&Math.abs(cl[1].start-(before[2].start-before[1].dur))<0.01,JSON.stringify([before.map(c=>c.start),cl.map(c=>c.start)]));
await ev(()=>window.__dawUndo());await ev(()=>ClipEditor.sync());
// Überblenden-Schalter
const xf0=await ev(()=>dawState.tracks.find(t=>t.id===__tid).xfade);await act('xfade');
T('Überblenden-Schalter kippt',(await ev(()=>dawState.tracks.find(t=>t.id===__tid).xfade))===false&&xf0!==false);await act('xfade');
// Schleife-Werkzeug
await ev(()=>{const t=dawState.tracks.find(t=>t.id===__tid);t.clips=[{id:'only',src:t.id,offset:0,start:0,dur:2}];ClipEditor.state.sel=null;ClipEditor.state.multi=[];ClipEditor.state.view=0;ClipEditor.state.pps=25;ClipEditor.state.dirty=true;ClipEditor.sync()});
await tool('loop');await click(await X(1),150);const ex=await X(2);
await mouse(ex-6,150,await X(7),150);cl=await clips();
T('Schleife: Rand über das Ende ziehen → Wiederholungen bis 7 s',cl.length===4&&Math.abs(cl[3].start+cl[3].dur-7)<0.01,JSON.stringify(cl.map(c=>[c.start,c.dur])));
await ev(()=>window.__dawUndo());await ev(()=>ClipEditor.sync());cl=await clips();T('…rückgängig → wieder 1 Clip',cl.length===1);
// Vorschau-Zeichnung ohne Fehler & Screenshot mit Mehrfachauswahl
await ev(()=>{const t=dawState.tracks.find(t=>t.id===__tid);t.clips=[{id:'p1',src:t.id,offset:0,start:0,dur:4,fi:0.8,fo:0.5,g:0.6},{id:'p2',src:t.id,offset:4,start:3.2,dur:4},{id:'p3',src:t.id,offset:8,start:9,dur:3}];const e=ClipEditor.state;e.sel='p1';e.multi=['p3'];e.dirty=true;ClipEditor.sync()});await pg.waitForTimeout(200);
await pg.screenshot({path:SHOT+'/clip_editor_v2.png'});
// Wiedergabe-Smoke: Spur mit Fades/Überblendung spielt ohne Fehler und Export läuft
const play=await ev(async()=>{try{audioEngine.seek(0);await audioEngine.play();await new Promise(r=>setTimeout(r,700));audioEngine.stop(false);return 'ok'}catch(e){return 'ERR '+e.message}});
T('Wiedergabe mit Fades/Überblendung ohne Fehler',play==='ok',play);
await act('close');
T('Keine Skriptfehler',errs.length===0,errs.join(' | '));
console.log(`\n${ok} bestanden, ${bad} fehlgeschlagen`);await b.close();srv.close();
})();
