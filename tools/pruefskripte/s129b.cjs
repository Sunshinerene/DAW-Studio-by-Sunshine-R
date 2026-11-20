const http=require('http'),fs=require('fs'),path=require('path');const {chromium}=require('playwright');const cp=require('child_process');
const WORK='../../dist';const SH=process.env.SHOTS;
const FX='/tmp/fx129_t';fs.mkdirSync(FX,{recursive:true});const files=[];
for(let i=1;i<=6;i++){const f=FX+`/Titel ${i}.mp3`;if(!fs.existsSync(f))cp.execSync(`ffmpeg -y -loglevel error -f lavfi -i "sine=frequency=${200+i*90}:duration=40" -c:a libmp3lame -metadata artist="Künstler ${i}" -metadata title="Ein sehr langer Titelname Nummer ${i}" "${f}"`);files.push(f)}
const srv=http.createServer((q,r)=>{const u=new URL(q.url,'http://x');const f=path.join(WORK,decodeURIComponent(u.pathname).replace(/^\//,''));fs.readFile(f,(e,d)=>{if(e){r.writeHead(404);r.end();return;}r.writeHead(200,{'content-type':/\.html$/.test(f)?'text/html':/\.js$/.test(f)?'application/javascript':'application/octet-stream'});r.end(d)})});
(async()=>{await new Promise(r=>srv.listen(0,'127.0.0.1',r));const port=srv.address().port;const b=await chromium.launch();
const ctx=await b.newContext({viewport:{width:393,height:852},isMobile:true,hasTouch:true,deviceScaleFactor:2});const pg=await ctx.newPage();pg.on('pageerror',e=>console.log('ERR',e.message));
await pg.route(/^https?:\/\/(?!127\.0\.0\.1)/,r=>r.abort());
await pg.addInitScript(()=>{try{if(!sessionStorage.__i){sessionStorage.__i=1;localStorage.setItem('sunshine.home','off');localStorage.setItem('sunshine.news','{"seen":"1.29"}');}}catch(_){}});
await pg.goto(`http://127.0.0.1:${port}/index_ueberarbeitet.html`,{waitUntil:'load'});await pg.waitForTimeout(1500);
await pg.evaluate(t=>document.documentElement.setAttribute('data-theme',t),process.env.TH||'aurora');
if(process.env.KIND)await pg.evaluate(k=>TpDock.setKind(k),process.env.KIND);if(process.env.ICONS)await pg.evaluate(()=>TpDock.setIcons(true));
await pg.evaluate(()=>Player.open());await pg.waitForTimeout(300);await pg.setInputFiles('#pl-file',files);await pg.waitForTimeout(2000);
await pg.evaluate(()=>document.querySelectorAll('#pl-list .pl-row')[0].click());await pg.waitForTimeout(1500);
await pg.screenshot({path:SH+'/'+(process.env.NAME||'p')+'.png'});
await pg.evaluate(()=>{document.getElementById('pl-root').querySelector('.pl-body').scrollTop=400});await pg.waitForTimeout(400);await pg.screenshot({path:SH+'/'+(process.env.NAME||'p')+'_s.png'});
const m=await pg.evaluate(()=>{const r=s=>document.querySelector(s).getBoundingClientRect();return {fixedBottom:r('.pl-fixed').bottom,bodyTop:r('.pl-body').top,bodyH:r('.pl-body').height,dockTop:r('#pl-dock').top,hero:r('.pl-hero').height,scroll:document.querySelector('.pl-body').scrollTop}});console.log(JSON.stringify(m));
await b.close();srv.close()})();
