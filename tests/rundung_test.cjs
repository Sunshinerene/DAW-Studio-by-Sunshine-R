// 1.37: „Rundung“ (Eckig / Normal / Extra rund) und Linien-Icons gelten in DAW, Startseite, Player, Dockbars, Feedback, Hilfe, Cover
const http=require('http'),fs=require('fs'),path=require('path');const {chromium}=require('playwright');
const WORK=process.argv[2];
const srv=http.createServer((q,r)=>{const u=new URL(q.url,'http://x');const f=path.join(WORK,decodeURIComponent(u.pathname).replace(/^\//,''));fs.readFile(f,(e,d)=>{if(e){r.writeHead(404);r.end();return}
 r.writeHead(200,{'content-type':/\.html$/.test(f)?'text/html':/\.js$/.test(f)?'application/javascript':'application/octet-stream'});r.end(d)})});
let ok=0,bad=0;const T=(n,c,x)=>{if(c){ok++;console.log('PASS',n)}else{bad++;console.log('FAIL',n,x===undefined?'':JSON.stringify(x))}};
const VIEWS={
 daw:async pg=>{},
 home:async pg=>{await pg.evaluate(()=>Home.open())},
 'home-alle':async pg=>{await pg.evaluate(()=>{Home.open();Home.openAll()})},
 player:async pg=>{await pg.evaluate(()=>Player.open())},
 feedback:async pg=>{await pg.evaluate(()=>Feedback.open())},
 hilfe:async pg=>{await pg.evaluate(()=>Help.openManual())},
 cover:async pg=>{await pg.evaluate(()=>Cover.open&&Cover.open())}};
// erlaubt: bewusst feste Formen (Schalter, Farbpunkte, Rahmen/Kopfleiste mit eigener Eckig-Regel)
const ALLOW=/^(i|header|span\.cv-box|span\.cv-ph|section#pl-snd|div\.hm-big)\b/;
(async()=>{await new Promise(r=>srv.listen(0,'127.0.0.1',r));const port=srv.address().port;const b=await chromium.launch();
const open=async(mode,theme,view)=>{const ctx=await b.newContext({viewport:{width:393,height:852},isMobile:true,hasTouch:true,reducedMotion:'reduce'});
 await ctx.addInitScript(([t,m])=>{try{localStorage.setItem('sunshine.home','off');localStorage.setItem('sunshine.theme',t);localStorage.setItem('sunshine.ui',JSON.stringify({radius:m}));localStorage.setItem('sunshine.news','{"seen":"9.99"}');localStorage.setItem('sunshine.intro','{"on":false}')}catch(_){}},[theme,mode]);
 const pg=await ctx.newPage();pg.__ctx=ctx;pg.__errs=[];pg.on('pageerror',e=>pg.__errs.push(e.message));await pg.route(/^https?:\/\/(?!127\.0\.0\.1)/,r=>r.abort());
 await pg.goto(`http://127.0.0.1:${port}/index_ueberarbeitet.html`,{waitUntil:'load'});await pg.waitForTimeout(900);await VIEWS[view](pg);await pg.waitForTimeout(500);return pg};
const rad=(pg,sel)=>pg.evaluate(s=>{const e=document.querySelector(s);return e?parseFloat(getComputedStyle(e).borderTopLeftRadius):null},sel);
// ---- Faktoren
for(const [m,rk,pill] of [['sharp',.45,'8px'],['normal',1,'999px'],['round',1.45,'999px']]){const pg=await open(m,'aurora','daw');
 const t=await pg.evaluate(()=>{const cs=getComputedStyle(document.documentElement);return [cs.getPropertyValue('--rk').trim(),cs.getPropertyValue('--r-pill').trim()]});
 T(`Faktor ${m}: --rk=${rk}, Pille=${pill}`,+t[0]===rk&&t[1]===pill,t);await pg.__ctx.close()}
// ---- Player-Knopf folgt der Einstellung
const px={};for(const m of ['sharp','normal','round']){const pg=await open(m,'aurora','player');px[m]=await rad(pg,'#pl-root .pl-btn');await pg.__ctx.close()}
T('Player-Knopf: Eckig < Normal < Extra rund (6 / 14 / 20 px)',Math.round(px.sharp)===6&&px.normal===14&&Math.round(px.round)===20,px);
// ---- Startseite: Pillen
const hp={};for(const m of ['sharp','normal','round']){const pg=await open(m,'studio','home');hp[m]=await rad(pg,'#hm-fb');await pg.__ctx.close()}
T('Startseiten-Pille: Eckig = eckig, Normal/Rund = Pille',hp.sharp<=9&&hp.normal>=100&&hp.round>=100,hp);
// ---- Dock-Tasten (Kreis wird Quadrat mit Rundung)
{const pg=await open('sharp','aurora','player');const r=await rad(pg,'#pl-root .pl-play');T('Player: Play-Taste im Modus Eckig kein Kreis',r<=9,r);await pg.__ctx.close()}
{const pg=await open('normal','aurora','player');const r=await rad(pg,'#pl-root .pl-play');T('Player: Play-Taste im Modus Normal weiter ein Kreis',/^(50|32|\d{2,})/.test(String(r))&&r>=30,r);await pg.__ctx.close()}
// ---- Audit: nichts Rundes in Eckig
for(const th of ['aurora','studio','liquid']) for(const v of Object.keys(VIEWS)){
 const pg=await open('sharp',th,v);
 const bad2=await pg.evaluate(()=>{const res=[];const tag=e=>e.tagName.toLowerCase()+(e.id?'#'+e.id:'')+(e.classList.length?'.'+[...e.classList].slice(0,2).join('.'):'');
  document.querySelectorAll('body *').forEach(e=>{const r=e.getBoundingClientRect();if(r.width<14||r.height<14)return;const cs=getComputedStyle(e);if(cs.visibility==='hidden'||cs.display==='none'||+cs.opacity===0)return;
   const v=parseFloat(cs.borderTopLeftRadius)||0;const bg=cs.backgroundColor!=='rgba(0, 0, 0, 0)'||cs.backgroundImage!=='none'||parseFloat(cs.borderTopWidth)>0||cs.boxShadow!=='none';if(!bg||v<=12)return;
   const top=document.elementFromPoint(Math.min(innerWidth-1,Math.max(0,r.left+r.width/2)),Math.min(innerHeight-1,Math.max(0,r.top+r.height/2)));if(!top||!(e===top||e.contains(top)))return;res.push(tag(e)+' '+Math.round(v))});return res});
 const rest=bad2.filter(s=>!ALLOW.test(s));
 T(`Eckig ${th}/${v}: keine runden Formen übrig`,rest.length===0,rest.slice(0,6));await pg.__ctx.close()}
// ---- Icons
{const pg=await open('normal','aurora','feedback');
 const f=await pg.evaluate(()=>({mail:!!document.querySelector('[data-fb="mail"] .ic-w'),share:!!document.querySelector('[data-fb="share"] .ic-w'),file:!!document.querySelector('[data-fb="file"] .ic-w'),copy:!!document.querySelector('[data-fb="copy"] .ic-w'),cat:document.querySelectorAll('.fb-cats .ic-w').length}));
 T('Feedback: Knöpfe und Arten zeigen Linien-Icons statt Emoji',f.mail&&f.share&&f.file&&f.copy&&f.cat>=2,f);await pg.__ctx.close()}
{const pg=await open('normal','aurora','daw');
 const f=await pg.evaluate(async()=>{BigWin.open('midi');await new Promise(r=>setTimeout(r,400));return {bw:document.querySelectorAll('.bw-ic .ic-w').length,card:(()=>{const d=document.createElement('div');d.className='hp-new';d.innerHTML='<span class="tx"><b>👀 Test</b></span>';document.body.appendChild(d);Icons.apply(d);return !!d.querySelector('b .ic-w')})()}});
 T('Großfenster-Titel und „Bald in der App“-Karte nutzen Linien-Icons',f.bw>=1&&f.card,f);await pg.__ctx.close()}
{const pg=await open('normal','aurora','daw');await pg.evaluate(()=>{const u=JSON.parse(localStorage.getItem('sunshine.ui')||'{}');u.icons=false;localStorage.setItem('sunshine.ui',JSON.stringify(u));window.__sunUi(u)});
 const e=await pg.evaluate(()=>document.documentElement.getAttribute('data-icons'));T('Umschalter „Emoji statt Linien-Icons“ bleibt wirksam',e==='emoji',e);await pg.__ctx.close()}
console.log(`\n${ok} bestanden, ${bad} fehlgeschlagen`);await b.close();srv.close();process.exit(bad?1:0)})();
