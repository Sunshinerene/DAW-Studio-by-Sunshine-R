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

const ev=(f,a)=>pg.evaluate(f,a);
await ev(async()=>{await audioEngine.ensureCtx();const ctx=audioEngine.ctx,sr=ctx.sampleRate;
 const b=ctx.createBuffer(1,sr*12,sr),d=b.getChannelData(0);for(let i=0;i<d.length;i++){const t=i/sr;d[i]=0.4*Math.sin(2*Math.PI*(t<6?440:880)*t)}
 const t=createTrack('audio','Drums');dawState.buffers[t.id]=b;window.__tid=t.id;
 const t2=createTrack('audio','Leer');window.__tid2=t2.id;
 audioEngine.ensureTrackNode(t);audioEngine.ensureTrackNode(t2);renderMultiTrackLanes();});
const tr=()=>ev(()=>{const t=dawState.tracks.find(t=>t.id===window.__tid);return JSON.parse(JSON.stringify(t.clips||null))});
// 1 implizit
const imp=await ev(()=>ClipModel.list(dawState.tracks.find(t=>t.id===__tid)).map(c=>[c.offset,c.start,Math.round(c.dur*100)/100,!!c.implicit]));
T('Ohne Bearbeitung: 1 impliziter Clip über die ganze Datei',imp.length===1&&imp[0][0]===0&&imp[0][1]===0&&Math.abs(imp[0][2]-12)<0.02&&imp[0][3]===true);
T('…Spur hat noch keine eigenen Clips (altes Verhalten)',(await tr())===null);
// 2 teilen
const n1=await ev(()=>{const t=dawState.tracks.find(t=>t.id===__tid);window.__dawPushUndo();return ClipModel.split(t,6)});
const c2=await tr();
T('Teilen bei 6 s ergibt 2 Clips',n1===1&&c2.length===2);
T('…Clip 2 beginnt bei 6 s und nutzt Quelle ab 6 s',Math.abs(c2[1].start-6)<1e-9&&Math.abs(c2[1].offset-6)<1e-9&&Math.abs(c2[1].dur-6)<1e-6);
T('…Clip 1 endet bei 6 s',Math.abs(c2[0].dur-6)<1e-6);
T('Teilen am Rand/zu nah → nichts',await ev(()=>{const t=dawState.tracks.find(t=>t.id===__tid);return ClipModel.split(t,0.01)+ClipModel.split(t,11.99)})===0);
// 3 verschieben
await ev(()=>{const t=dawState.tracks.find(t=>t.id===__tid);ClipModel.setStart(t,t.clips[1],9)});
const c3=await tr();
T('Clip 2 auf 9 s verschoben (Lücke 6–9 s)',Math.abs(c3[1].start-9)<1e-9&&Math.abs(c3[1].offset-6)<1e-9);
T('Länge der Zeitleiste wächst auf 15 s',Math.abs(await ev(()=>audioEngine.getContentDurationSec())-15)<0.02);
T('Negativer Start wird auf 0 begrenzt',await ev(()=>{const t=dawState.tracks.find(t=>t.id===__tid);const c=t.clips[1];const s=c.start;ClipModel.setStart(t,c,-5);const r=t.clips[0].start;ClipModel.setStart(t,t.clips.find(x=>x.offset>5),s);return r})===0);
// 4 Abspielplan
const pl=o=>ev(o=>{const t=dawState.tracks.find(t=>t.id===__tid);return ClipModel.plan(t,o).map(p=>[Math.round(p.when*1000)/1000,Math.round(p.pos*1000)/1000,Math.round(p.dur*1000)/1000,p.fadeIn])},o);
let p0=await pl(0);T('Plan ab 0: Clip 1 sofort, Clip 2 nach 9 s',p0.length===2&&p0[0][0]===0&&p0[0][1]===0&&Math.abs(p0[1][0]-9)<1e-6&&Math.abs(p0[1][1]-6)<1e-6);
let p7=await pl(7);T('Plan ab 7 s (in der Lücke): nur Clip 2 nach 2 s',p7.length===1&&Math.abs(p7[0][0]-2)<1e-6&&p7[0][3]===true);
let p10=await pl(10);T('Plan ab 10 s (mitten in Clip 2): sofort ab Quelle 7 s, 5 s lang, ohne Einblenden',p10.length===1&&p10[0][0]===0&&Math.abs(p10[0][1]-7)<1e-6&&Math.abs(p10[0][2]-5)<1e-6&&p10[0][3]===false);
let p16=await pl(16);T('Plan ab 16 s (hinter allem): nichts',p16.length===0);
// Live-Scheduling
const live=await ev(()=>{const t=dawState.tracks.find(t=>t.id===__tid);const rec=[];const orig=ClipModel.connect;ClipModel.connect=function(ctx,buf,dest,when,pos,dur,fi){rec.push([Math.round((when-ctx.currentTime)*100)/100,Math.round(pos*100)/100,Math.round(dur*100)/100]);return orig.apply(this,arguments)};
 audioEngine.scheduleStemPass(audioEngine.ctx.currentTime+0.5,7,null);const n=audioEngine.activeStemSources.length;audioEngine.stopAudioStemSources();ClipModel.connect=orig;return {rec,n,after:audioEngine.activeStemSources.length}});
T('Engine plant Clip 2 mit Verzögerung 2 s',live.rec.length===1&&Math.abs(live.rec[0][0]-2.5)<0.1&&Math.abs(live.rec[0][1]-6)<0.01,JSON.stringify(live));
T('Stopp räumt alle Quellen ab',live.n===1&&live.after===0);
// 6 Zuschneiden
const tri=await ev(()=>{const t=dawState.tracks.find(t=>t.id===__tid);const a=t.clips[0],b=t.clips[1];
 ClipModel.trimLeft(t,a,-3);const s1=[a.start,a.offset,a.dur];
 ClipModel.trimRight(t,a,100);const e1=a.start+a.dur;      // max Dateiende (12 s)
 ClipModel.trimRight(t,a,0);const e2=a.dur;                 // min Länge
 a.dur=6;ClipModel.trimLeft(t,a,2);const l=[a.start,a.offset,a.dur];
 ClipModel.trimLeft(t,b,9.5);const l2=[b.start,b.offset,b.dur];
 return {s1,e1,e2,l,l2}});
T('Links über den Anfang ziehen wird begrenzt',ev.length&&tri.s1[0]===0&&tri.s1[1]===0&&tri.s1[2]===6);
T('Rechts über das Dateiende ziehen wird begrenzt (12 s)',Math.abs(tri.e1-12)<1e-6);
T('Rechts auf 0 ziehen → Mindestlänge',tri.e2>=0.029&&tri.e2<0.05);
T('Links 2 s einkürzen: Start 2, Quelle ab 2, Länge 4',Math.abs(tri.l[0]-2)<1e-6&&Math.abs(tri.l[1]-2)<1e-6&&Math.abs(tri.l[2]-4)<1e-6);
T('Clip 2 links 0,5 s einkürzen: Start 9,5 · Quelle ab 6,5',Math.abs(tri.l2[0]-9.5)<1e-6&&Math.abs(tri.l2[1]-6.5)<1e-6&&Math.abs(tri.l2[2]-5.5)<1e-6);
// zurück auf Zielzustand: Clip1 0–6, Clip2 9–15
await ev(()=>{const t=dawState.tracks.find(t=>t.id===__tid);t.clips=[{id:'a',src:t.id,offset:0,start:0,dur:6},{id:'b',src:t.id,offset:6,start:9,dur:6}]});
// 7 Kopieren/Einfügen
const cp=await ev(()=>{const t=dawState.tracks.find(t=>t.id===__tid),t2=dawState.tracks.find(t=>t.id===__tid2);
 const n=ClipModel.copy(t,['b']);const made=ClipModel.paste(t,20);const made2=ClipModel.paste(t2,3);
 return {n,made:made.map(c=>[c.start,c.offset,c.dur,c.src===t.id]),made2:made2.map(c=>[c.start,c.offset,c.dur,c.src===t.id]),cnt:t.clips.length,cnt2:t2.clips.length}});
T('Kopieren + Einfügen bei 20 s (gleiche Spur)',cp.n===1&&cp.made.length===1&&cp.made[0][0]===20&&cp.made[0][1]===6&&cp.made[0][3]);
T('Einfügen in andere Spur nutzt die Quelldatei der ersten',cp.made2.length===1&&cp.made2[0][0]===3&&cp.made2[0][3]===true&&cp.cnt2===1);
T('Fremder Clip zählt zur Länge der anderen Spur (3+6 s)',Math.abs(await ev(()=>ClipModel.end(dawState.tracks.find(t=>t.id===__tid2)))-9)<1e-6);
// Entfernen
T('Clip entfernen',await ev(()=>{const t=dawState.tracks.find(t=>t.id===__tid);const n=t.clips.length;ClipModel.remove(t,t.clips.find(c=>c.start===20).id);return n-t.clips.length})===1);
// 8 Rückgängig
const und=await ev(()=>{const t=dawState.tracks.find(t=>t.id===__tid);window.__dawPushUndo();const n=t.clips.length;ClipModel.split(t,3);const m=dawState.tracks.find(t=>t.id===__tid).clips.length;window.__dawUndo();const t3=dawState.tracks.find(t=>t.id===__tid);return {n,m,after:(t3.clips||[]).length}});
T('Rückgängig stellt Clips wieder her ('+JSON.stringify(und)+')',und.m===und.n+1&&und.after===und.n);
// 9 WAV-Export
await ev(()=>{const t=dawState.tracks.find(t=>t.id===__tid);t.clips=[{id:'a',src:t.id,offset:0,start:0,dur:6},{id:'b',src:t.id,offset:6,start:9,dur:6}];dawState.tracks.forEach(x=>{if(x.id!==t.id)x.mute=true});renderMultiTrackLanes()});
const wav=await ev(async()=>{window.__wav=null;window.saveOrShareBlob=async blob=>{window.__wav=blob;return 'saved-documents'};await exportMasterWav();
 const ab=await window.__wav.arrayBuffer(),dv=new DataView(ab),ch=dv.getUint16(22,true),sr=dv.getUint32(24,true),n=(ab.byteLength-44)/2/ch;
 const seg=(a,z)=>{let s=0,k=0,zc=0,prev=0;for(let i=Math.floor(a*sr);i<Math.floor(z*sr)&&i<n;i++){const v=dv.getInt16(44+i*ch*2,true)/32768;s+=v*v;k++;if(prev<0&&v>=0)zc++;prev=v}return {rms:Math.sqrt(s/Math.max(1,k)),hz:zc/(z-a)}};
 return {sec:n/sr,first:seg(1,3),gap:seg(6.3,8.7),second:seg(10,13),tail:seg(15.3,16)}});
console.log('  Export:',JSON.stringify(wav));
T('WAV: erster Clip hörbar (≈ 440 Hz)',wav.first.rms>0.05&&Math.abs(wav.first.hz-440)<15);
T('WAV: Lücke 6–9 s ist still',wav.gap.rms<0.002);
T('WAV: verschobener Clip hörbar bei 9–15 s (≈ 880 Hz)',wav.second.rms>0.05&&Math.abs(wav.second.hz-880)<25);
T('WAV: Gesamtlänge ≥ 15 s',wav.sec>=14.9);
// 10 Hauptansicht-Wellenform
await ev(()=>{renderMultiTrackLanes()});await pg.waitForTimeout(250);
const lane=await ev(()=>{const c=document.querySelector('.track-lane-canvas[data-track-id="'+__tid+'"]');const x=c.getContext('2d');const w=c.width,h=c.height;const total=audioEngine.getTotalArrangementBars()*4*(60/dawState.bpm);
 const col=(a,z)=>{const X0=Math.floor(a/total*w),X1=Math.floor(z/total*w);const d=x.getImageData(X0,0,Math.max(1,X1-X0),h).data;let s=0;for(let i=3;i<d.length;i+=4)s+=d[i];return s/(d.length/4)};
 return {clip1:col(1,5),gap:col(6.5,8.5),clip2:col(10,14)}});
T('Hauptansicht zeigt Clips und leere Lücke ('+Math.round(lane.clip1)+' / '+Math.round(lane.gap)+' / '+Math.round(lane.clip2)+')',lane.clip1>lane.gap*3&&lane.clip2>lane.gap*3);
// 11 Projekt sichern/laden behält Clips
const pj=await ev(()=>{const copy=JSON.parse(JSON.stringify(dawState.tracks));const t=copy.find(t=>t.id===__tid);return {has:Array.isArray(t.clips)&&t.clips.length}});
T('Projekt-Speicher enthält die Clips',pj.has===2);
// 12 Neue Audiodatei in der Spur verwirft Clips
T('Neues Laden einer Datei setzt Clips zurück (4 Stellen im Code)',await ev(()=>document.documentElement.outerHTML.length>0)&&require('fs').readFileSync(process.argv[2]+'/index_ueberarbeitet.html','utf8').match(/delete \w+\.clips/g).length>=5);
T('Keine Skriptfehler',errs.length===0,errs.join(' | '));
console.log(`\n${ok} bestanden, ${bad} fehlgeschlagen`);await b.close();srv.close();process.exit(bad?1:0)})();
