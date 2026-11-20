const http=require('http'),fs=require('fs'),path=require('path');const {chromium}=require('playwright');
const WORK=process.argv[2];const TW=fs.readFileSync(path.join(__dirname,'fixtures/tailwind.js'));
const srv=http.createServer((q,r)=>{const f=path.join(WORK,decodeURIComponent(q.url.split('?')[0]).replace(/^\//,''));fs.readFile(f,(e,d)=>{if(e){r.writeHead(404);r.end();return;}r.writeHead(200,{'content-type':f.endsWith('.html')?'text/html':'application/octet-stream'});r.end(d)})});
let ok=0,bad=0;const T=(n,c,x)=>{if(c){ok++;console.log('PASS',n)}else{bad++;console.log('FAIL',n,x||'')}};
(async()=>{await new Promise(r=>srv.listen(0,'127.0.0.1',r));const port=srv.address().port;const b=await chromium.launch();
const ctx=await b.newContext({viewport:{width:393,height:852},deviceScaleFactor:1,isMobile:true,hasTouch:true});await ctx.addInitScript(()=>{try{localStorage.setItem('sunshine.home','off')}catch(_){}});const pg=await ctx.newPage();const errs=[];pg.on('pageerror',e=>errs.push(e.message));
await pg.route(/cdn\.tailwindcss\.com/,r=>r.fulfill({status:200,contentType:'application/javascript',body:TW}));
await pg.route(/^https?:\/\/(?!127\.0\.0\.1|cdn\.tailwindcss\.com)/,r=>r.abort());
await pg.goto(`http://127.0.0.1:${port}/index_ueberarbeitet.html`,{waitUntil:'load'});await pg.waitForTimeout(1000);
await pg.evaluate(async()=>{await audioEngine.ensureCtx();createTrack('midi','A');createTrack('midi','B');createTrack('midi','C');renderMultiTrackLanes();});
T('Nav sichtbar (mobil)',await pg.locator('#bottom-nav').isVisible());
T('5 Einträge (Spuren+4 Tabs)',(await pg.locator('#bottom-nav > button').count())===5);
const fixedBottom=await pg.evaluate(()=>{const r=document.getElementById('bottom-nav').getBoundingClientRect();return Math.round(innerHeight-r.bottom)});
T('Nav schwebt am unteren Rand ('+fixedBottom+'px)',fixedBottom>=0&&fixedBottom<=24);
for(const t of ['drums','vocals','mixer','midi']){
  await pg.tap(`#bottom-nav [data-tab="${t}"]`);await pg.waitForTimeout(500);
  const st=await pg.evaluate(t=>({vis:!document.getElementById('tab-panel-'+t).classList.contains('hidden'),others:['midi','drums','vocals','mixer'].filter(x=>x!==t&&!document.getElementById('tab-panel-'+x).classList.contains('hidden')).length,active:dawState.activeTab,fw:document.querySelector(`#bottom-nav [data-tab="${t}"]`).classList.contains('font-bold')}),t);
  T(`Tab „${t}“ zeigt Panel`,st.vis&&st.others===0&&st.active===t&&st.fw,JSON.stringify(st));}
// scrolled down to dock?
await pg.waitForTimeout(600);
const sy=await pg.evaluate(()=>scrollY);T('Tab-Wechsel scrollt zum Dock (scrollY='+Math.round(sy)+')',sy>100);
// erneut tippen klappt ein
await pg.tap('#bottom-nav [data-tab="midi"]');await pg.waitForTimeout(200);
T('Zweiter Tipp klappt Panel ein',await pg.evaluate(()=>document.getElementById('tab-panel-midi').classList.contains('hidden')&&dawState.dockCollapsed===true));
await pg.tap('#btn-nav-tracks');await pg.waitForTimeout(900);
const trTop=await pg.evaluate(()=>{const s=document.getElementById('multitrack-lanes').closest('section').getBoundingClientRect().top;const h=document.querySelector('header').getBoundingClientRect().bottom;return [Math.round(s),Math.round(h)]});
T('„Spuren“ scrollt zur Spurliste unter den Header '+trTop,trTop[0]>=trTop[1]-20&&trTop[0]<=trTop[1]+60);
// letzte Inhalte nicht verdeckt: Body-Padding
T('Platz unter dem Inhalt für die Nav',await pg.evaluate(()=>parseFloat(getComputedStyle(document.body).paddingBottom)>=88));
// Desktop: Tabs wieder im Dock
await pg.setViewportSize({width:1100,height:800});await pg.waitForTimeout(400);
T('Desktop: Nav ausgeblendet',await pg.locator('#bottom-nav').isHidden());
T('Desktop: Tabs zurück im Dock mit Langtext',await pg.evaluate(()=>{const b=document.querySelector('.dock-tab-btn[data-tab="drums"]');return !b.closest('#bottom-nav')&&/Drum-, 808/.test(b.textContent)}));
await pg.tap('.dock-tab-btn[data-tab="mixer"]');await pg.waitForTimeout(300);
T('Desktop: Tab-Klick funktioniert noch',await pg.evaluate(()=>dawState.activeTab==='mixer'&&!document.getElementById('tab-panel-mixer').classList.contains('hidden')));
await pg.setViewportSize({width:393,height:852});await pg.waitForTimeout(400);
T('Zurück auf Mobil: Nav wieder da',await pg.locator('#bottom-nav').isVisible()&&(await pg.locator('#bottom-nav > button').count())===5);
T('Keine Skriptfehler',errs.filter(e=>!/JSZip/i.test(e)).length===0,errs.join('|'));
console.log(`\n${ok} bestanden, ${bad} fehlgeschlagen`);await b.close();srv.close();process.exit(bad?1:0)})();
