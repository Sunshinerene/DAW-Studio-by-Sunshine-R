const http=require('http'),fs=require('fs'),path=require('path');const {chromium}=require('playwright');
const WORK=process.argv[2];
const srv=http.createServer((q,r)=>{const f=path.join(WORK,decodeURIComponent(q.url.split('?')[0]).replace(/^\//,''));fs.readFile(f,(e,d)=>{if(e){r.writeHead(404);r.end();return;}r.writeHead(200,{'content-type':/\.html$/.test(f)?'text/html':/\.js$/.test(f)?'application/javascript':'application/octet-stream'});r.end(d)})});
let ok=0,bad=0;const T=(n,c,x)=>{if(c){ok++;console.log('PASS',n)}else{bad++;console.log('FAIL',n,x===undefined?'':JSON.stringify(x))}};
(async()=>{await new Promise(r=>srv.listen(0,'127.0.0.1',r));const port=srv.address().port;const b=await chromium.launch();
const html=fs.readFileSync(path.join(WORK,'index_ueberarbeitet.html'),'utf8');
T('Kein Tailwind-Laufzeit-Skript / keine Konfiguration / kein CDN-Rückfall',!/tailwind-3\.4\.17\.js/.test(html)&&!/tailwind\.config/.test(html)&&!/cdn\.tailwindcss\.com/.test(html));
T('Vorberechnetes CSS ist eingebaut (20–120 KB) und steht am Ende des <head>',(()=>{const i=html.indexOf('<style id="tw-precompiled">'),j=html.indexOf('</style>',i),k=html.indexOf('</head>');return i>0&&j-i>20000&&j-i<120000&&k>j&&html.slice(j,k).trim()==='</style>'})());
T('Vendor-Skript tailwind nicht mehr im Auslieferungsordner nötig (Seite verweist nicht darauf)',!/assets\/vendor\/tailwind/.test(html));
T('Logo kleiner als 400 KB, Icon kleiner als 200 KB',fs.statSync(path.join(WORK,'assets/sunshine-r-daw-studio-logo.png')).size<400e3&&fs.statSync(path.join(WORK,'assets/sunshine-r-app-icon.png')).size<200e3);
for(const vp of [{width:393,height:852},{width:1100,height:760}]){
 const ctx=await b.newContext({viewport:vp});const pg=await ctx.newPage();const errs=[],reqs=[];pg.on('pageerror',e=>errs.push(e.message));pg.on('request',r=>reqs.push(r.url()));
 await pg.route(/^https?:\/\/(?!127\.0\.0\.1)/,r=>r.abort());
 await pg.addInitScript(()=>{try{localStorage.setItem('sunshine.home','off');localStorage.setItem('sunshine.news','{"seen":"9.99"}')}catch(e){}});
 await pg.goto(`http://127.0.0.1:${port}/index_ueberarbeitet.html`,{waitUntil:'load'});await pg.waitForTimeout(1000);
 const r=await pg.evaluate(()=>{const mk=c=>{const d=document.createElement('div');d.className=c;document.body.appendChild(d);const s=getComputedStyle(d);const o={d:s.display,bg:s.backgroundColor,p:s.paddingTop,w:s.width,fs:s.fontSize,c:s.color};d.remove();return o};
  return {flex:mk('flex').d,hidden:mk('hidden').d,p4:mk('p-4').p,daw:mk('bg-daw-panel').bg,arb:getComputedStyle(Object.assign(document.body.appendChild(document.createElement('div')),{className:'max-w-[1800px]'})).maxWidth,txt:mk('text-[9px]').fs,md:mk('grid md:grid-cols-3').d,lg:mk('grid lg:grid-cols-12').d,sm:mk('hidden sm:flex').d,hov:1,dark:mk('dark:text-white').c,tw:!!window.tailwind,btn:getComputedStyle(document.getElementById('btn-play')).borderRadius}});
 T(`(${vp.width}px) Utilities, Arbiträrwerte und eigene daw-Farben sind aktiv`,r.flex==='flex'&&r.hidden==='none'&&r.p4==='16px'&&r.daw!=='rgba(0, 0, 0, 0)'&&r.arb==='1800px'&&r.txt==='9px'&&r.btn!=='0px',r);
 T(`(${vp.width}px) Breakpoint sm (ab 640 px) stimmt`,r.sm===(vp.width>=640?'flex':'none'),r);
 T(`(${vp.width}px) kein window.tailwind, keine Anfrage an Tailwind/CDN, keine Fehler`,!r.tw&&!reqs.some(u=>/tailwind/i.test(u))&&errs.length===0,[reqs.filter(u=>/tailwind/i.test(u)),errs]);
 await ctx.close()}
console.log(`\n${ok} bestanden, ${bad} fehlgeschlagen`);await b.close();srv.close();process.exit(bad?1:0)})();
