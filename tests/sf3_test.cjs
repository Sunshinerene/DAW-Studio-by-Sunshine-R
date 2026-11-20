const http=require('http'),fs=require('fs'),path=require('path');const {chromium}=require('playwright');const W=process.argv[2];
const srv=http.createServer((q,r)=>{const f=path.join(W,decodeURIComponent(q.url.split('?')[0]).replace(/^\//,''));fs.readFile(f,(e,d)=>{if(e){r.writeHead(404);r.end();return;}r.writeHead(200,{'content-type':f.endsWith('.html')?'text/html; charset=utf-8':'application/octet-stream'});r.end(d);});});
(async()=>{await new Promise(r=>srv.listen(0,'127.0.0.1',r));const port=srv.address().port;const b=await chromium.launch();const pg=await(await b.newContext()).newPage();const errs=[];pg.on('pageerror',e=>errs.push(e.message));
await pg.route(/^https?:\/\/(?!127\.0\.0\.1)/,r=>r.abort());await pg.goto(`http://127.0.0.1:${port}/index_ueberarbeitet.html`,{waitUntil:'load'});await pg.waitForTimeout(500);
const r=await pg.evaluate(async(port)=>{const out={sf3:SpessaEngine.sf3Supported()};
 const buf=await (await fetch(`http://127.0.0.1:${port}/fake.sf3`)).arrayBuffer();
 try{const id=await sfImportFile(new File([buf],'fake.sf3'));out.import='ok';out.sf3flag=SF_LIB.fonts[id].parsed.sf3;out.presets=SF_LIB.fonts[id].parsed.presets.length;out.voice=sfVoiceSource({font:id,bank:0,preset:0});}catch(e){out.import='Fehler: '+e.message;}
 const b2=await (await fetch(`http://127.0.0.1:${port}/test.sf2`)).arrayBuffer();try{const id=await sfImportFile(new File([b2],'test.sf2'));out.sf2='ok';out.sf2flag=SF_LIB.fonts[id].parsed.sf3;}catch(e){out.sf2='Fehler '+e.message;}
 return out;},port);
console.log(JSON.stringify(r));console.log('Skriptfehler:',errs.filter(e=>!/tailwind|JSZip/i.test(e)).join('|')||'keine');await b.close();srv.close();})();
