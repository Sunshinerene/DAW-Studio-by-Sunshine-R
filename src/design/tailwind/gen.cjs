// Erzeugt vorberechnetes Tailwind-CSS aus allen Klassen-Kandidaten einer HTML-Datei.
// Aufruf: node gen.cjs <html> <tailwind.js> <out.css>
const fs=require('fs'), path=require('path');
const {chromium}=require(path.join(process.env.NODE_PATH||'', 'playwright'));
const [html,twjs,out]=process.argv.slice(2);
let src=fs.readFileSync(html,'utf8');
// Config aus der HTML ziehen
const m=src.match(/tailwind\.config\s*=\s*(\{[\s\S]*?\n\s{4}\});/); if(!m) throw new Error('config nicht gefunden');
const cfg=m[1];
const toks=new Set();
(src.match(/[^<>"'`\s]*[^<>"'`\s:]/g)||[]).forEach(t=>{ if(t.length<=90) toks.add(t); });
// zusätzlich an Trennzeichen zerlegen, die in JS-Strings Klassen verketten
(src.match(/[A-Za-z0-9_\-:\[\]\/\.%#!]+/g)||[]).forEach(t=>{ if(t.length<=90) toks.add(t); });
console.log('Kandidaten:',toks.size);
(async()=>{
  const b=await chromium.launch(); const p=await b.newPage();
  const page=`<!doctype html><html class="dark"><head><meta charset=utf-8><script>${fs.readFileSync(twjs,'utf8').replace(/<\/script/gi,'<\\/script')}</script><script>tailwind.config=${cfg};</script></head><body><div id=x></div></body></html>`;
  fs.writeFileSync('/tmp/tw_page.html',page);
  await p.goto('file:///tmp/tw_page.html');
  p.on('pageerror',e=>console.log('pageerror:',e.message.slice(0,160)));
  const all=[...toks]; const CH=1500; const size=()=>p.evaluate(()=>[...document.querySelectorAll('style')].reduce((a,s)=>a+s.textContent.length,0));
  for(let i=0;i<all.length;i+=CH){
    await p.evaluate(t=>{const d=document.createElement('div');d.className=t.join(' ');document.body.appendChild(d);},all.slice(i,i+CH));
    let last=-1; for(let k=0;k<20;k++){ await p.waitForTimeout(250); const n=await size(); if(n===last)break; last=n; }
  }
  const css=await p.evaluate(()=>[...document.querySelectorAll('style')].map(s=>s.textContent).join('\n'));
  fs.writeFileSync(out,css); console.log('CSS bytes',css.length);
  await b.close();
})();
