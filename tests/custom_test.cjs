const http=require('http'),fs=require('fs'),path=require('path');const {chromium}=require('playwright');
const WORK=process.argv[2];const TW=fs.readFileSync(path.join(__dirname,'fixtures/tailwind.js'));
const srv=http.createServer((q,r)=>{const f=path.join(WORK,decodeURIComponent(q.url.split('?')[0]).replace(/^\//,''));fs.readFile(f,(e,d)=>{if(e){r.writeHead(404);r.end();return;}r.writeHead(200,{'content-type':f.endsWith('.html')?'text/html; charset=utf-8':'application/octet-stream'});r.end(d)})});
let ok=0,bad=0;const T=(n,c,x)=>{if(c){ok++;console.log('PASS',n)}else{bad++;console.log('FAIL',n,x||'')}};
(async()=>{await new Promise(r=>srv.listen(0,'127.0.0.1',r));const port=srv.address().port;const b=await chromium.launch();
const ctx=await b.newContext({viewport:{width:393,height:852},deviceScaleFactor:1.5,isMobile:true,hasTouch:true});await ctx.addInitScript(()=>{try{localStorage.setItem('sunshine.home','off')}catch(_){}});const pg=await ctx.newPage();const errs=[];pg.on('pageerror',e=>errs.push(e.message));
await pg.route(/cdn\.tailwindcss\.com/,r=>r.fulfill({status:200,contentType:'application/javascript',body:TW}));
await pg.route(/^https?:\/\/(?!127\.0\.0\.1|cdn\.tailwindcss\.com)/,r=>r.abort());
await pg.goto(`http://127.0.0.1:${port}/index_ueberarbeitet.html`,{waitUntil:'load'});await pg.waitForTimeout(1000);
await pg.evaluate(async()=>{await audioEngine.ensureCtx();createTrack('midi','A');renderMultiTrackLanes();});
const cs=(sel,prop)=>pg.evaluate(([s,p])=>getComputedStyle(document.querySelector(s))[p],[sel,prop]);
const open=async()=>{await pg.tap('#btn-menu');await pg.tap('#file-menu #btn-settings');await pg.waitForSelector('#settings-modal')};
await open();
T('Anpassen-Bereich vorhanden',await pg.locator('#acc-row').count()===1&&await pg.locator('[data-range="glassK"]').count()===1);
const baseBtn=await cs('#btn-play','backgroundImage');const baseR=await cs('.bg-daw-panel','borderRadius');
// Akzent
await pg.tap('#acc-row [data-accent="#34D399"]');await pg.waitForTimeout(100);
T('Akzent: html[data-accent] gesetzt',await pg.evaluate(()=>document.documentElement.dataset.accent==='1'&&document.documentElement.style.getPropertyValue('--acc')==='#34D399'));
const pb=(await cs('#btn-play','backgroundImage'))+' '+(await cs('#btn-play','backgroundColor'));T('Akzent: Play-Button nutzt Grün',(m=>m&&+m[2]>+m[1]+60&&+m[2]>+m[3]+30)(pb.match(/rgb\((\d+), (\d+), (\d+)\)$/)),pb.slice(0,120));
T('Akzent gespeichert',await pg.evaluate(()=>JSON.parse(localStorage.getItem('sunshine.ui')).accent==='#34D399'));
T('Swatch markiert (aria-pressed)',(await pg.getAttribute('#acc-row [data-accent="#34D399"]','aria-pressed'))==='true');
// Eigene Farbe
await pg.evaluate(()=>{const i=document.querySelector('[data-accent-custom]');i.value='#ff00aa';i.dispatchEvent(new Event('input',{bubbles:true}))});
T('Eigene Farbe wirkt',await pg.evaluate(()=>document.documentElement.style.getPropertyValue('--acc-rgb')==='255,0,170'));
// Transparenz
const rangeSet=(k,v)=>pg.evaluate(([k,v])=>{const i=document.querySelector(`[data-range="${k}"]`);i.value=v;i.dispatchEvent(new Event('input',{bubbles:true}))},[k,v]);
const bgOf=()=>cs('.bg-daw-panel','backgroundColor');
const a0=await bgOf();await rangeSet('glassK',100);await pg.waitForTimeout(80);
const a1=await bgOf();
const alpha=c=>{const m=c.match(/rgba?\(([^)]+)\)/);if(!m)return null;const p=m[1].split(/[ ,\/]+/).filter(Boolean);return p.length>3?+p[3]:1};
T('Transparenz: deckender bei Max ('+a0+' → '+a1+')',alpha(a1)>alpha(a0));
await rangeSet('glassK',8);await pg.waitForTimeout(80);const a2=await bgOf();T('Transparenz: klarer bei Min ('+a2+')',alpha(a2)<alpha(a0));
T('--glass-k gesetzt',await pg.evaluate(()=>document.documentElement.style.getPropertyValue('--glass-k')==='0.2'));
// Blur
await rangeSet('blur',4);await pg.waitForTimeout(80);
const bf=await cs('.bg-daw-panel','backdropFilter');T('Blur 4 px wirkt ('+bf+')',/blur\(4px\)/.test(bf));
// Rundung
await pg.tap('#rad-row [data-radius="sharp"]');await pg.waitForTimeout(500);
const rs=await cs('#multitrack-lanes','borderRadius');const rs2=await pg.evaluate(()=>parseFloat(getComputedStyle(document.querySelector('.rounded-2xl')).borderTopLeftRadius));
T('Rundung eckig ('+rs2+'px)',rs2<=12);
await pg.tap('#rad-row [data-radius="round"]');await pg.waitForTimeout(500);
const rs3=await pg.evaluate(()=>parseFloat(getComputedStyle(document.querySelector('.rounded-2xl')).borderTopLeftRadius));T('Rundung extra rund ('+rs3+'px)',rs3>=30);
// Peek beim Ziehen
await pg.evaluate(()=>document.querySelector('[data-range="blur"]').dispatchEvent(new PointerEvent('pointerdown',{bubbles:true})));
T('Dialog wird beim Ziehen durchsichtig',await pg.evaluate(()=>document.getElementById('settings-modal').classList.contains('peek')));
await pg.evaluate(()=>document.querySelector('[data-range="blur"]').dispatchEvent(new PointerEvent('pointerup',{bubbles:true})));
T('…und danach wieder normal',!(await pg.evaluate(()=>document.getElementById('settings-modal').classList.contains('peek'))));
await pg.screenshot({path:process.argv[3]||'/tmp/custom_dialog.png'});
// Persistenz nach Reload
await pg.reload({waitUntil:'load'});await pg.waitForTimeout(800);
const st1=await pg.evaluate(()=>({d:{...document.documentElement.dataset},st:document.documentElement.getAttribute('style'),ls:localStorage.getItem('sunshine.ui')}));
T('Nach Neustart: alles erhalten',st1.d.accent==='1'&&st1.d.radius==='round'&&st1.d.blur==='1'&&/--glass-k: 0\.2/.test(st1.st),JSON.stringify(st1));
// Reset
await open();await pg.tap('[data-reset-custom]');await pg.waitForTimeout(200);
const st2=await pg.evaluate(()=>({d:{...document.documentElement.dataset},st:document.documentElement.getAttribute('style'),ls:localStorage.getItem('sunshine.ui')}));
T('Zurücksetzen: alles Standard',!st2.d.accent&&st2.d.radius==='normal'&&!st2.d.blur&&!/glass-k/.test(st2.st||''),JSON.stringify(st2));
T('Zurücksetzen: Play wieder Theme-Orange',(await cs('#btn-play','backgroundImage'))===baseBtn);
// alle Themes mit Akzent ohne Fehler
for(const th of ['studio','neon','classic','liquid','aurora']){await pg.tap(`[data-theme-id="${th}"]`);await pg.waitForTimeout(120);await pg.tap('#acc-row [data-accent="#38C8FF"]');await pg.waitForTimeout(60);}
T('Alle Themes + Akzent ohne Fehler',errs.filter(e=>!/JSZip/i.test(e)).length===0,errs.join('|'));
console.log(`\n${ok} bestanden, ${bad} fehlgeschlagen`);await b.close();srv.close();process.exit(bad?1:0)})();
