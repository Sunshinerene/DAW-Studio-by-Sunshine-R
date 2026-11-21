const http=require('http'),fs=require('fs'),path=require('path');const {chromium}=require('playwright');
const WORK=process.argv[2];const TW=fs.readFileSync(path.join(__dirname,'fixtures/tailwind.js'));
const srv=http.createServer((q,r)=>{const f=path.join(WORK,decodeURIComponent(q.url.split('?')[0]).replace(/^\//,''));fs.readFile(f,(e,d)=>{if(e){r.writeHead(404);r.end();return;}r.writeHead(200,{'content-type':f.endsWith('.html')?'text/html; charset=utf-8':'application/octet-stream'});r.end(d)})});
let ok=0,bad=0;const T=(n,c,x)=>{if(c){ok++;console.log('PASS',n)}else{bad++;console.log('FAIL',n,x||'')}};
(async()=>{await new Promise(r=>srv.listen(0,'127.0.0.1',r));const port=srv.address().port;const b=await chromium.launch();
const ctx=await b.newContext({viewport:{width:393,height:852},deviceScaleFactor:1.5,isMobile:true,hasTouch:true});await ctx.addInitScript(()=>{try{localStorage.setItem('sunshine.home','off')}catch(_){}});const pg=await ctx.newPage();const errs=[];pg.on('pageerror',e=>errs.push(e.message));
await pg.route(/cdn\.tailwindcss\.com/,r=>r.fulfill({status:200,contentType:'application/javascript',body:TW}));
await pg.route(/^https?:\/\/(?!127\.0\.0\.1|cdn\.tailwindcss\.com)/,r=>r.abort());   // KEIN Internet: Laden muss sauber scheitern
await pg.goto(`http://127.0.0.1:${port}/index_ueberarbeitet.html`,{waitUntil:'load'});await pg.waitForTimeout(1000);
await pg.evaluate(()=>document.getElementById('btn-settings').click());await pg.waitForSelector('#settings-modal');
T('KI-Bereich sichtbar',await pg.locator('#bp-status').count()===1);
T('Status anfangs: noch nicht geladen',/Noch nicht geladen/.test(await pg.textContent('#bp-status')),await pg.textContent('#bp-status'));
await pg.locator('#bp-status').scrollIntoViewIfNeeded();await pg.screenshot({path:process.argv[3]});
await pg.tap('[data-bp-load]');await pg.waitForTimeout(3500);
const txt=await pg.textContent('#bp-status');
T('Ohne Internet: sauberer Fehler statt Absturz ('+txt.slice(0,90)+'…)',/Fehler/.test(txt));
T('Fehlertext nennt Lösungsweg',/TensorFlow|Internet|Dateien/.test(txt));
T('Weiterhin bedienbar (Dialog offen)',await pg.locator('#settings-modal').count()===1);
// Audio→MIDI mit KI ohne Internet -> Fallback, kein Crash
const r=await pg.evaluate(async()=>{await audioEngine.ensureCtx();const sr=44100,n=sr*3,x=new Float32Array(n);for(let i=0;i<n;i++)x[i]=.4*Math.sin(2*Math.PI*261.63*i/sr)+.3*Math.sin(2*Math.PI*329.63*i/sr)+.3*Math.sin(2*Math.PI*392*i/sr);
 const ab=audioEngine.ctx.createBuffer(1,n,sr);ab.copyToChannel(x,0);const tr=createTrack('audio','Keys');dawState.buffers[tr.id]=ab;
 document.getElementById('select-a2m-mode').value='ai';let e=null;try{await extractMidiFromStem(tr.id)}catch(er){e=er.message}return {e,n:dawState.midiNotes.length}});
T('A2M „KI“ ohne Internet: kein Absturz',r.e===null,r.e);
T('Skriptfehler: keine',errs.filter(e=>!/JSZip/i.test(e)).length===0,errs.join('|'));
console.log(`\n${ok} bestanden, ${bad} fehlgeschlagen`);await b.close();srv.close();process.exit(bad?1:0)})();
