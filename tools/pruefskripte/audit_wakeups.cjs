// Zählt Timer-/Frame-Aufrufe im Leerlauf (Aufwachvorgänge pro Sekunde) – je Herkunft. Aufruf: node audit_wakeups.cjs [dist] [hidden] [home]
const http=require('http'),fs=require('fs'),path=require('path');const {chromium}=require('playwright');
const WORK=path.resolve(__dirname,process.argv[2]||'../../dist'),HID=process.argv.includes('hidden'),HOME=process.argv.includes('home');
const TW=fs.readFileSync(path.join(__dirname,'../../tests/fixtures/tailwind.js'));
const srv=http.createServer((q,r)=>{const f=path.join(WORK,decodeURIComponent(q.url.split('?')[0]).replace(/^\//,''));fs.readFile(f,(e,d)=>{if(e){r.writeHead(404);r.end();return}r.writeHead(200,{'content-type':f.endsWith('.html')?'text/html':'application/octet-stream'});r.end(d)})});
(async()=>{await new Promise(r=>srv.listen(0,'127.0.0.1',r));const port=srv.address().port;const b=await chromium.launch();
const ctx=await b.newContext({viewport:{width:393,height:852},isMobile:true,hasTouch:true});const pg=await ctx.newPage();
await pg.route(/cdn\.tailwindcss\.com/,r=>r.fulfill({status:200,contentType:'application/javascript',body:TW}));await pg.route(/^https?:\/\/(?!127\.0\.0\.1|cdn\.tailwindcss\.com)/,r=>r.abort());
await pg.addInitScript(([home])=>{window.__w={};window.__on=false;const where=()=>{const s=(new Error().stack||'').split('\n');for(const l of s.slice(2)){if(/index_ueberarbeitet|<anonymous>/.test(l)&&!/__w|wrap/.test(l)){const m=l.match(/:(\d+):\d+\)?$/);return m?m[1]:'?'}}return '?'};
window.__t=[];const cnt=(k)=>{if(window.__on){window.__w[k]=(window.__w[k]||0)+1;window.__t.push(performance.now())}};
const wrap=(name)=>{const o=window[name];window[name]=function(f,ms,...a){if(typeof f!=='function')return o.call(this,f,ms,...a);const w=f.name||(String(f).replace(/\s+/g,' ').slice(0,60)),k=name+'@'+w+(ms!==undefined&&name!=='requestAnimationFrame'?'/'+ms:'');const g=function(...x){cnt(k);return f.apply(this,x)};return o.call(this,g,ms,...a)}};
wrap('setInterval');wrap('setTimeout');wrap('requestAnimationFrame');
const MO=window.MutationObserver;window.MutationObserver=function(cb){const k='MO@'+where();return new MO(function(...x){cnt(k);return cb.apply(this,x)})};window.MutationObserver.prototype=MO.prototype;
try{localStorage.setItem('sunshine.home',home?'on':'off');localStorage.setItem('sunshine.news','{"seen":"1.31"}')}catch(_){}},[HOME]);
await pg.goto(`http://127.0.0.1:${port}/index_ueberarbeitet.html`,{waitUntil:'load'});await pg.waitForTimeout(3500);
if(HID)await pg.evaluate(()=>{Object.defineProperty(document,'hidden',{get:()=>true,configurable:true});Object.defineProperty(document,'visibilityState',{get:()=>'hidden',configurable:true});document.dispatchEvent(new Event('visibilitychange'))});
await pg.waitForTimeout(800);await pg.evaluate(()=>{window.__w={};window.__on=true});await pg.waitForTimeout(6000);
const T0=await pg.evaluate(()=>{window.__on=false;return window.__t});const w=await pg.evaluate(()=>window.__w);T0.sort((a,b)=>a-b);let cl=0,last=-1e9;T0.forEach(x=>{if(x-last>12)cl++;last=x});const rows=Object.entries(w).sort((a,b)=>b[1]-a[1]);let tot=0;rows.forEach(r=>tot+=r[1]);
console.log(JSON.stringify({modus:(HID?'hidden ':'')+(HOME?'home':'daw'),proSekunde:+(tot/6).toFixed(1),aufwachenProSekunde:+(cl/6).toFixed(1),quellen:rows.map(([k,v])=>[k,+(v/6).toFixed(2)])}));await b.close();srv.close()})();
