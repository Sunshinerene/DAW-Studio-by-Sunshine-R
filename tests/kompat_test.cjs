// Kompatibilität: Daten, die die ALTE Version geschrieben hat, müssen in der NEUEN Version gefunden werden.
// Aufruf: node tests/kompat_test.cjs <dist-neu> <ordner-mit-alter-index_ueberarbeitet.html>   (nicht Teil von runall.sh)
const http=require('http'),fs=require('fs'),path=require('path'),os=require('os');const {chromium}=require('playwright');
const NEU=process.argv[2],ALT=process.argv[3];if(!ALT||!fs.existsSync(path.join(ALT,'index_ueberarbeitet.html'))){console.log('übersprungen: kein Ordner mit alter Version angegeben');process.exit(0)}
const TW=fs.readFileSync(path.join(__dirname,'fixtures/tailwind.js'));const SF=fs.readFileSync(path.join(__dirname,'fixtures/test.sf2'));
const PORT=47311;const ud=fs.mkdtempSync(path.join(os.tmpdir(),'kompat-'));
const serve=dir=>new Promise(r=>{const s=http.createServer((q,res)=>{const u=decodeURIComponent(q.url.split('?')[0]);if(u==='/test.sf2'){res.writeHead(200);res.end(SF);return}const f=path.join(dir,u.replace(/^\//,''));fs.readFile(f,(e,d)=>{if(e){res.writeHead(404);res.end();return}res.writeHead(200,{'content-type':f.endsWith('.html')?'text/html':'application/octet-stream'});res.end(d)})});s.listen(PORT,'127.0.0.1',()=>r(s))});
let ok=0,bad=0;const T=(n,c,x)=>{if(c){ok++;console.log('PASS',n)}else{bad++;console.log('FAIL',n,x||'')}};
const open=async()=>{const c=await chromium.launchPersistentContext(ud,{viewport:{width:393,height:852}});const pg=c.pages()[0]||await c.newPage();const errs=[];pg.on('pageerror',e=>errs.push(String(e.message||e)));
 await pg.route(/cdn\.tailwindcss\.com/,r=>r.fulfill({status:200,contentType:'application/javascript',body:TW}));await pg.route(/^https?:\/\/(?!127\.0\.0\.1|cdn\.tailwindcss\.com)/,r=>r.abort());
 await pg.goto(`http://127.0.0.1:${PORT}/index_ueberarbeitet.html`,{waitUntil:'load'});await pg.waitForTimeout(2500);return {c,pg,errs}};
(async()=>{
 // ---- Phase A: alte Version schreibt
 let s=await serve(ALT);let {c,pg,errs}=await open();const ev=(f,a)=>pg.evaluate(f,a);
 const verA=await ev(()=>SUNSHINE_BUILD.v);console.log('Alt-Version:',verA);
 await ev(()=>{localStorage.setItem('sunshine.home','off');localStorage.setItem('sunshine.theme','neon');localStorage.setItem('sunshine.tpdock',JSON.stringify({on:true,kind:'neon',icons:true,sb:false}));localStorage.setItem('sunshine.layout',JSON.stringify({cutout:true}));localStorage.setItem('sunshine.live',JSON.stringify({on:false,bad:'x9'}));localStorage.setItem('sunshine.news',JSON.stringify({seen:'1.30'}));localStorage.setItem('sunshine.help',JSON.stringify({seen:true}))});
 await pg.reload({waitUntil:'load'});await pg.waitForTimeout(2500);
 await ev(async()=>{await Home.createProject({name:'Altes Projekt'});await new Promise(r=>setTimeout(r,500))});
 await ev(async()=>{await audioEngine.ensureCtx();const cx=audioEngine.ctx,sr=cx.sampleRate;const b=cx.createBuffer(1,sr,sr);const d=b.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=0.4*Math.sin(2*Math.PI*330*i/sr);const t=createTrack('audio','Alt-Spur');dawState.buffers[t.id]=b;audioEngine.ensureTrackNode(t);renderMultiTrackLanes()});
 await ev(async()=>{const ok=await Home.persistCurrent();await new Promise(r=>setTimeout(r,500));return ok});
 await ev(async()=>{await Autosave.saveNow(true)});
 const sfid=await ev(async()=>{const by=await (await fetch('/test.sf2')).arrayBuffer();return await sfImportFile(new File([by],'alt.sf2'))});
 await ev(async()=>{await new Promise((res,rej)=>{const r=indexedDB.open('sunshine-player',1);r.onupgradeneeded=()=>{try{r.result.createObjectStore('kv')}catch(_){}};r.onsuccess=()=>{const t=r.result.transaction('kv','readwrite');t.objectStore('kv').put({x:42},'k1');t.oncomplete=()=>{r.result.close();res()}};r.onerror=()=>rej(r.error)});
   await new Promise((res,rej)=>{const r=indexedDB.open('SunshineStemCache',1);r.onupgradeneeded=()=>{try{r.result.createObjectStore('stems',{keyPath:'id'})}catch(_){}};r.onsuccess=()=>{const t=r.result.transaction('stems','readwrite');t.objectStore('stems').put({id:'s1',name:'alt.wav',size:3});t.oncomplete=()=>{r.result.close();res()}};r.onerror=()=>rej(r.error)})});
 T('Alt: SoundFont importiert, Projekt liegt in der Bibliothek',!!sfid&&await ev(async()=>{await Home.refreshList();return Home.items().some(i=>i.name==='Altes Projekt')}));
 await c.close();s.close();
 // ---- Phase B: neue Version liest
 s=await serve(NEU);({c,pg,errs}=await open());const ev2=(f,a)=>pg.evaluate(f,a);
 const verB=await ev2(()=>SUNSHINE_BUILD.v);console.log('Neu-Version:',verB);T('Neue Version ist neuer als die alte',verA!==verB&&!!verB,verA+' / '+verB);
 const dattr=await ev2(()=>['data-theme','data-dock','data-dockicons'].map(a=>a+'='+document.documentElement.getAttribute(a)).join(' '));T('Design (neon) und Leisten-Icons aus altem Speicher übernommen',/data-theme=neon/.test(dattr)&&/data-dockicons=on/.test(dattr),dattr);
 T('Layout-Option (Kamera-Ausschnitt) aus altem Speicher übernommen',await ev2(()=>document.documentElement.getAttribute('data-cutout')==='1'));
 T('Live-Update-Einstellung (aus, gesperrte Version x9) gelesen',await ev2(()=>{const l=window.Live&&Live._state&&Live._state();return l?(l.on===false&&l.bad==='x9'):JSON.parse(localStorage.getItem('sunshine.live')).bad==='x9'}));
 await ev2(async()=>{await Home.refreshList();});await pg.waitForTimeout(500);
 T('Projektbibliothek: „Altes Projekt“ ist da',await ev2(()=>Home.items().some(i=>i.name==='Altes Projekt')),await ev2(()=>JSON.stringify(Home.items().map(i=>i.name))));
 T('Projekt lässt sich öffnen (Spur „Alt-Spur“ mit Audio)',await ev2(async()=>{const it=Home.items().find(i=>i.name==='Altes Projekt');await Home.openProject(it.id);await new Promise(r=>setTimeout(r,800));return dawState.tracks.some(t=>t.name==='Alt-Spur')&&Object.keys(dawState.buffers).length>=1}),await ev2(()=>JSON.stringify({tr:dawState.tracks.map(t=>t.name),b:Object.keys(dawState.buffers).length,proj:dawState.project&&dawState.project.name})));
 T('Autosave-Stand der alten Version lesbar (1 Audiospur)',await ev2(async()=>{const p=await Autosave._peek();return !!p&&p.audio>=1&&Array.isArray(p.bufferIds)&&p.bufferIds.length>=1}),await ev2(async()=>JSON.stringify(Object.keys((await Autosave._peek()||{}))))); 
 T('SoundFont der alten Version steht in der Liste',await ev2(async()=>{const l=await sfListInstalled();return l.some(m=>/alt/i.test(m.name||''))}),await ev2(async()=>JSON.stringify((await sfListInstalled()).map(m=>m.name))));
 T('Player-Datenbank: alter Eintrag lesbar',await ev2(async()=>(await SunIDB.tx('player','kv','readonly',s=>s.get('k1'))).x===42));
 T('Stem-Cache: alter Eintrag lesbar',await ev2(async()=>(await SunIDB.tx('stems','stems','readonly',s=>s.get('s1'))).name==='alt.wav'));
 T('Neue Version schreibt weiter in dieselben Datenbanken (Autosave, Projekte)',await ev2(async()=>{await Autosave.saveNow(true);const p=await Autosave._peek();await Home.createProject({name:'Neues Projekt'});await Home.refreshList();return !!p&&Home.items().length>=2}));
 T('Keine Seitenfehler',errs.length===0,errs.join(' | ').slice(0,300));
 await c.close();s.close();fs.rmSync(ud,{recursive:true,force:true});
 console.log(`\nkompat_test: ${ok} ok, ${bad} fehlgeschlagen`);process.exit(bad?1:0)})().catch(e=>{console.log('FAIL Absturz',e.stack||e.message);process.exit(2)});
