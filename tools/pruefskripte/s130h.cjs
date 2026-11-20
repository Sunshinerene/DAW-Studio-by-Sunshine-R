const http=require('http'),fs=require('fs'),path=require('path');const {chromium}=require('playwright');const cp=require('child_process');
const WORK='../../dist';const SH=process.env.SHOTS;
const FX='/tmp/fx129_t';fs.mkdirSync(FX,{recursive:true});const files=[];
for(let i=1;i<=6;i++){const f=FX+`/Titel ${i}.mp3`;if(!fs.existsSync(f))cp.execSync(`ffmpeg -y -loglevel error -f lavfi -i "sine=frequency=${200+i*90}:duration=40" -c:a libmp3lame -metadata artist="Künstler ${i}" -metadata title="Ein sehr langer Titelname Nummer ${i}" "${f}"`);files.push(f)}
const srv=http.createServer((q,r)=>{const u=new URL(q.url,'http://x');const f=path.join(WORK,decodeURIComponent(u.pathname).replace(/^\//,''));fs.readFile(f,(e,d)=>{if(e){r.writeHead(404);r.end();return;}r.writeHead(200,{'content-type':/\.html$/.test(f)?'text/html':/\.js$/.test(f)?'application/javascript':'application/octet-stream'});r.end(d)})});
(async()=>{await new Promise(r=>srv.listen(0,'127.0.0.1',r));const port=srv.address().port;const b=await chromium.launch();
const ctx=await b.newContext({viewport:{width:+(process.env.W||393),height:+(process.env.H||852)},isMobile:true,hasTouch:true,deviceScaleFactor:1});const pg=await ctx.newPage();pg.on('pageerror',e=>console.log('ERR',e.message));
await pg.route(/^https?:\/\/(?!127\.0\.0\.1)/,r=>r.abort());
await pg.addInitScript(()=>{try{if(!sessionStorage.__i){sessionStorage.__i=1;localStorage.setItem('sunshine.home','off');localStorage.setItem('sunshine.news','{"seen":"1.29"}');}}catch(_){}});
await pg.addStyleTag?0:0;await pg.goto(`http://127.0.0.1:${port}/index_ueberarbeitet.html`,{waitUntil:'load'});await pg.waitForTimeout(1500);
await pg.addStyleTag({content:'#toast-container{display:none!important}'});const th=process.env.TH||'aurora';await pg.evaluate(t=>document.documentElement.setAttribute('data-theme',t),th);
const N=+(process.env.NP||5);
for(let i=1;i<=N;i++){await pg.evaluate(async i=>{await Home.createProject({name:'Projekt '+i+' – Sommer Hymne',bpm:100+i*5,root:0,scale:'minor',grid:2,arr:'std',click:false,loop:true,start:'midi',notes:'',cv:null});},i);await pg.waitForTimeout(400)}
if(process.env.PLAY){await pg.evaluate(()=>Player.open());await pg.waitForTimeout(300);await pg.setInputFiles('#pl-file',files);await pg.waitForTimeout(1800);await pg.evaluate(()=>document.querySelectorAll('#pl-list .pl-row')[0].click());await pg.waitForTimeout(1200);await pg.evaluate(()=>Player.close());await pg.waitForTimeout(300);}
await pg.evaluate(()=>Home.open());await pg.waitForTimeout(2200);
const name=process.env.NAME||'h';
await pg.screenshot({path:SH+'/'+name+'.png'});
const m=await pg.evaluate(()=>{const sc=document.querySelector('.hm-scroll');return {fit:document.getElementById('home-root').dataset.fit,sh:sc.scrollHeight,ch:sc.clientHeight,items:document.querySelectorAll('#hm-list .hm-item').length,all:!document.getElementById('hm-all').hidden}});console.log(JSON.stringify(m));
if(process.env.BIG){await pg.evaluate(()=>Home.openAll());await pg.waitForTimeout(900);await pg.screenshot({path:SH+'/'+name+'_big.png'});}
await b.close();srv.close()})();
