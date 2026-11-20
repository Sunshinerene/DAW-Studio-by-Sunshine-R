const http=require('http'),fs=require('fs'),path=require('path');const {chromium}=require('playwright');
const TW=fs.readFileSync(path.join(__dirname,'../../tests/fixtures/tailwind.js'));
const srv=http.createServer((q,r)=>{const f=path.join(__dirname,'../../dist',decodeURIComponent(q.url.split('?')[0]).replace(/^\//,''));fs.readFile(f,(e,d)=>{if(e){r.writeHead(404);r.end();return;}r.writeHead(200,{'content-type':f.endsWith('.html')?'text/html':'application/octet-stream'});r.end(d)})});
(async()=>{await new Promise(r=>srv.listen(0,'127.0.0.1',r));const port=srv.address().port;const b=await chromium.launch();
const ctx=await b.newContext({viewport:{width:393,height:852},isMobile:true,hasTouch:true});const pg=await ctx.newPage();
await pg.route(/cdn\.tailwindcss\.com/,r=>r.fulfill({status:200,contentType:'application/javascript',body:TW}));
await pg.route(/^https?:\/\/(?!127\.0\.0\.1|cdn\.tailwindcss\.com)/,r=>r.abort());
await pg.addInitScript(()=>{try{localStorage.setItem('sunshine.home','off');localStorage.setItem('sunshine.news','{"seen":"1.30"}')}catch(_){}});
await pg.coverage.startJSCoverage({resetOnNavigation:false});await pg.coverage.startCSSCoverage({resetOnNavigation:false});
await pg.goto(`http://127.0.0.1:${port}/index_ueberarbeitet.html`,{waitUntil:'load'});await pg.waitForTimeout(3000);
const js=await pg.coverage.stopJSCoverage(),css=await pg.coverage.stopCSSCoverage();
const h=fs.readFileSync(path.join(__dirname,'../../dist/index_ueberarbeitet.html'),'utf8');
// Bytes genutzt: Union der gedeckten Bereiche
function covBytes(e){const a=new Uint8Array(e.source.length);for(const f of e.functions){for(const r of f.ranges){a.fill(r.count>0?1:0,r.startOffset,r.endOffset)}}let u=0;for(const v of a)u+=v;return u}
// Pro Skript-Block (Marker im Text)
const per=[];for(const e of js){if(!/index_ueberarbeitet/.test(e.url))continue;const t=e.source;const u=covBytes(e);per.push({len:t.length,used:u,head:t.slice(0,80).replace(/\s+/g,' ')})}
per.sort((a,b)=>b.len-a.len);
let T=0,U=0;per.forEach(p=>{T+=p.len;U+=p.used});console.log('JS gesamt',T,'beim Start ausgeführt',U,Math.round(U/T*100)+'%');
per.slice(0,22).forEach(p=>console.log(String(p.len).padStart(7),String(Math.round(p.used/p.len*100)).padStart(3)+'%',p.head.slice(0,70)));
let cT=0,cU=0;for(const e of css){const a=new Uint8Array(e.text.length);for(const r of e.ranges)a.fill(1,r.start,r.end);let u=0;for(const v of a)u+=v;cT+=e.text.length;cU+=u;}
console.log('CSS gesamt',cT,'genutzt (beim Start sichtbar/angewandt)',cU,Math.round(cU/cT*100)+'%');
await b.close();srv.close()})();
