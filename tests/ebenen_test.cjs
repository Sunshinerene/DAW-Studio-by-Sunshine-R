// Ebenen (z-index): Jede Fenster-/Leisten-Ebene hat im Browser genau den Wert wie in 1.33 (Vorlage: fixtures/ebenen.json),
// die benannten Werte stehen an EINER Stelle, und im Code stehen keine losen Ebenen-Zahlen ab 40 mehr.
// Aufruf: node ebenen_test.cjs <dist>            – prüfen
//         node ebenen_test.cjs <dist> --schreiben – Vorlage neu schreiben (nur wenn die Ebenen bewusst geändert wurden)
const http=require('http'),fs=require('fs'),path=require('path');const {chromium}=require('playwright');
const WORK=process.argv[2],WRITE=process.argv.includes('--schreiben');const TW=fs.readFileSync(path.join(__dirname,'fixtures/tailwind.js'));
const FIX=path.join(__dirname,'fixtures/ebenen.json');
const srv=http.createServer((q,r)=>{const f=path.join(WORK,decodeURIComponent(q.url.split('?')[0]).replace(/^\//,''));fs.readFile(f,(e,d)=>{if(e){r.writeHead(404);r.end();return;}r.writeHead(200,{'content-type':f.endsWith('.html')?'text/html':'application/octet-stream'});r.end(d)})});
let ok=0,bad=0;const T=(n,c,x)=>{if(c){ok++;console.log('PASS',n)}else{bad++;console.log('FAIL',n,x||'')}};
// Zustände, in denen die Fenster entstehen; danach werden alle Elemente mit Ebene gesammelt
const OPEN=[
 ['home',()=>Home.open()],['home-alle',()=>{Home.open();Home.openAll()}],['player',()=>Player.open()],['hilfe',()=>Help.openManual()],['feedback',()=>Feedback.open()],
 ['cover',()=>Cover.open&&Cover.open()],['intro',()=>Intro.show&&Intro.show()]
];
const collect=()=>{const o={};document.querySelectorAll('*').forEach(e=>{const cs=getComputedStyle(e);const z=cs.zIndex;if(z==='auto')return;const n=+z;if(!(n>=40))return;const k=e.id?'#'+e.id:(e.className&&e.className.baseVal===undefined&&String(e.className).trim()?e.tagName.toLowerCase()+'.'+String(e.className).trim().split(/\s+/).filter(c=>!/^z-/.test(c)).slice(0,3).join('.'):e.tagName.toLowerCase());o[k]=z});return o};
(async()=>{await new Promise(r=>srv.listen(0,'127.0.0.1',r));const port=srv.address().port;const b=await chromium.launch();
const got={};
for(const th of ['aurora','liquid','classic']){
 for(const [name,fn] of [['start',()=>{}],['optionen',null]].concat(OPEN)){
  const ctx=await b.newContext({viewport:{width:393,height:852},isMobile:true,hasTouch:true,reducedMotion:'reduce'});await ctx.addInitScript(t=>{try{localStorage.setItem('sunshine.home','off');localStorage.setItem('sunshine.theme',t);localStorage.setItem('sunshine.intro','{"on":false}');localStorage.setItem('sunshine.news','{"seen":"9.99"}')}catch(_){}},th);
  const pg=await ctx.newPage();await pg.route(/cdn\.tailwindcss\.com/,r=>r.fulfill({status:200,contentType:'application/javascript',body:TW}));await pg.route(/^https?:\/\/(?!127\.0\.0\.1|cdn\.tailwindcss\.com)/,r=>r.abort());
  await pg.goto(`http://127.0.0.1:${port}/index_ueberarbeitet.html`,{waitUntil:'load'});await pg.waitForTimeout(700);
  try{if(fn)await pg.evaluate(fn);else{await pg.evaluate(()=>document.getElementById('btn-settings').click())}}catch(e){}
  await pg.waitForTimeout(400);
  const r=await pg.evaluate(collect);Object.keys(r).forEach(k=>{got[th+'|'+k]=r[k]});await ctx.close();
 }
}
if(WRITE){fs.writeFileSync(FIX,JSON.stringify(got,null,1));console.log('Vorlage geschrieben:',Object.keys(got).length,'Einträge');process.exit(0)}
const want=JSON.parse(fs.readFileSync(FIX,'utf8'));
const diff=Object.keys(want).filter(k=>got[k]!==want[k]).map(k=>k+': soll '+want[k]+', ist '+got[k]);
T('Alle '+Object.keys(want).length+' Fenster-/Leisten-Ebenen haben denselben Wert wie in 1.33',diff.length===0,diff.slice(0,6).join(' · '));
T('Mindestens 30 Ebenen-Einträge erfasst (Test ist nicht leer)',Object.keys(want).length>=30,String(Object.keys(want).length));
const html=fs.readFileSync(path.join(WORK,'index_ueberarbeitet.html'),'utf8').replace(/<script type="text\/plain"[\s\S]*?<\/script>/g,'');
const loose=(html.match(/z-index\s*:\s*(?:4\d|[5-9]\d|\d{3,})\b/g)||[]);
T('Keine losen Ebenen-Zahlen ab 40 mehr im Code (alles über var(--z-…))',loose.length<=0,loose.slice(0,5).join(' '));
const root=await (async()=>{const ctx=await b.newContext();const pg=await ctx.newPage();await pg.route(/cdn\.tailwindcss\.com/,r=>r.fulfill({status:200,contentType:'application/javascript',body:TW}));await pg.route(/^https?:\/\/(?!127\.0\.0\.1|cdn\.tailwindcss\.com)/,r=>r.abort());await pg.goto(`http://127.0.0.1:${port}/index_ueberarbeitet.html`,{waitUntil:'load'});const v=await pg.evaluate(()=>{const cs=getComputedStyle(document.documentElement),o={};['header','bigwin','nav','mini','menu','fab','fab-panel','dialog','dialog-2','dialog-3','editor','dialog-4','window','window-2','sheet','news','player','over-player','feedback','help','toast','intro','max'].forEach(n=>o[n]=+cs.getPropertyValue('--z-'+n));return o});await ctx.close();return v})();
const vals=Object.values(root);
T('Ebenen-Liste: 23 benannte Werte, alle gesetzt, streng aufsteigend',vals.length===23&&vals.every(Number.isFinite)&&vals.every((v,i)=>i===0||v>vals[i-1]),JSON.stringify(root));
console.log(`\nebenen_test: ${ok} ok, ${bad} fehlgeschlagen`);await b.close();srv.close();process.exit(bad?1:0)})().catch(e=>{console.log('FAIL Absturz',e.message);process.exit(2)});
