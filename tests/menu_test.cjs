const http=require('http'),fs=require('fs'),path=require('path');const {chromium}=require('playwright');
const WORK=process.argv[2];const TW=fs.readFileSync(path.join(__dirname,'fixtures/tailwind.js'));
const srv=http.createServer((q,r)=>{const f=path.join(WORK,decodeURIComponent(q.url.split('?')[0]).replace(/^\//,''));fs.readFile(f,(e,d)=>{if(e){r.writeHead(404);r.end();return;}r.writeHead(200,{'content-type':f.endsWith('.html')?'text/html':'application/octet-stream'});r.end(d)})});
let ok=0,bad=0;const T=(n,c,x)=>{if(c){ok++;console.log('PASS',n)}else{bad++;console.log('FAIL',n,x||'')}};
(async()=>{await new Promise(r=>srv.listen(0,'127.0.0.1',r));const port=srv.address().port;const b=await chromium.launch();
for(const mobile of [true,false]){
const ctx=await b.newContext(mobile?{viewport:{width:393,height:852},deviceScaleFactor:1.5,isMobile:true,hasTouch:true,acceptDownloads:true}:{viewport:{width:1280,height:800},acceptDownloads:true});await ctx.addInitScript(()=>{try{localStorage.setItem('sunshine.home','off')}catch(_){}});const pg=await ctx.newPage();const errs=[];pg.on('pageerror',e=>errs.push(e.message));
await pg.route(/cdn\.tailwindcss\.com/,r=>r.fulfill({status:200,contentType:'application/javascript',body:TW}));
await pg.route(/^https?:\/\/(?!127\.0\.0\.1|cdn\.tailwindcss\.com)/,r=>r.abort());
await pg.goto(`http://127.0.0.1:${port}/index_ueberarbeitet.html`,{waitUntil:'load'});await pg.waitForTimeout(1000);
const tag=mobile?'[mobil] ':'[desktop] ';
await pg.evaluate(async()=>{await audioEngine.ensureCtx();const t=createTrack('midi','MIDI Synth');t.midiNotes=[{id:1,pitch:60,start:0,dur:2,vel:100}];renderMultiTrackLanes();});
T(tag+'Menü zu am Anfang',await pg.locator('#file-menu').isHidden());
await pg.click('#btn-menu');
T(tag+'Menü offen',await pg.locator('#file-menu').isVisible());
T(tag+'aria-expanded true',(await pg.getAttribute('#btn-menu','aria-expanded'))==='true');
for(const id of ['btn-export-midi','btn-settings','btn-reset'])T(tag+id+' im Menü sichtbar',await pg.locator('#file-menu #'+id).isVisible());
for(const id of ['btn-undo','btn-import-files','btn-save-project','btn-open-projects','btn-export-wav','btn-menu'])T(tag+id+' in Leiste sichtbar',await pg.locator('#'+id).isVisible());
// Escape
await pg.keyboard.press('Escape');T(tag+'Escape schließt',await pg.locator('#file-menu').isHidden());
// Außenklick
await pg.click('#btn-menu');await pg.mouse.click(mobile?200:640,mobile?30:600);T(tag+'Außenklick schließt',await pg.locator('#file-menu').isHidden());
// Optionen
await pg.click('#btn-menu');await pg.click('#file-menu #btn-settings');await pg.waitForTimeout(300);
T(tag+'Optionen-Dialog öffnet',await pg.locator('#settings-modal').count()>0);
T(tag+'Menü schließt nach Optionen',await pg.locator('#file-menu').isHidden());
await pg.evaluate(()=>document.getElementById('settings-modal')?.remove());
// .MID Export -> Download
await pg.click('#btn-menu');
const dl=pg.waitForEvent('download',{timeout:4000}).catch(()=>null);
await pg.click('#file-menu #btn-export-midi');const d=await dl;
T(tag+'.MID-Export löst Download aus',!!d, 'kein Download');
// Reset zweistufig
await pg.click('#btn-menu');await pg.click('#file-menu #btn-reset');
T(tag+'Reset 1. Tipp: Menü bleibt offen',await pg.locator('#file-menu').isVisible());
T(tag+'Reset 1. Tipp: Rückfrage',/Wirklich/.test(await pg.textContent('#btn-reset')));
T(tag+'Reset 1. Tipp: Spuren noch da',(await pg.evaluate(()=>dawState.tracks.length))===1);
await pg.click('#file-menu #btn-reset');await pg.waitForTimeout(200);
T(tag+'Reset 2. Tipp: Projekt leer',(await pg.evaluate(()=>dawState.tracks.length))===0);
T(tag+'Reset 2. Tipp: Menü zu',await pg.locator('#file-menu').isHidden());
// Undo bringt zurück
await pg.click('#btn-undo');await pg.waitForTimeout(200);
T(tag+'Zurück holt Spur wieder',(await pg.evaluate(()=>dawState.tracks.length))===1);
// Header-Höhe
const hh=await pg.evaluate(()=>document.querySelector('header').getBoundingClientRect().height);console.log(tag+'Header-Höhe px:',Math.round(hh));
T(tag+'keine Seitenfehler',errs.filter(e=>!/JSZip/i.test(e)).length===0,errs.join('|'));
if(mobile){await pg.click('#btn-menu');await pg.waitForTimeout(200);await pg.screenshot({path:process.argv[3]||'/tmp/menu_open.png'});}
await ctx.close();}
console.log(`\n${ok} bestanden, ${bad} fehlgeschlagen`);await b.close();srv.close();process.exit(bad?1:0)})();
