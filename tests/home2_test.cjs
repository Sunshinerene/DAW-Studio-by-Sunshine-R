const http=require('http'),fs=require('fs'),path=require('path');const {chromium}=require('playwright');
const WORK=process.argv[2];
const srv=http.createServer((q,r)=>{const u=new URL(q.url,'http://x');const f=path.join(WORK,decodeURIComponent(u.pathname).replace(/^\//,''));fs.readFile(f,(e,d)=>{if(e){r.writeHead(404);r.end();return;}
 let body=d;if(/\.html$/.test(f)){let t=d.toString();if(u.searchParams.get('repo'))t=t.replace("repo:'__BUILD_REPO__'","repo:'o/r'").replace("n:'__BUILD_N__'","n:'7'");t=t.replace(/const MAIL = "[^"]*";/,u.searchParams.get('mail')?'const MAIL = "test@example.com";':'const MAIL = "";');body=t}
 r.writeHead(200,{'content-type':/\.html$/.test(f)?'text/html':/\.js$/.test(f)?'application/javascript':'application/octet-stream'});r.end(body)})});
let ok=0,bad=0;const T=(n,c,x)=>{if(c){ok++;console.log('PASS',n)}else{bad++;console.log('FAIL',n,x===undefined?'':JSON.stringify(x))}};
(async()=>{await new Promise(r=>srv.listen(0,'127.0.0.1',r));const port=srv.address().port;const b=await chromium.launch();
const mk=async(q,init,routeFn)=>{const ctx=await b.newContext({viewport:{width:393,height:852},isMobile:true,hasTouch:true});const pg=await ctx.newPage();pg.__errs=[];pg.on('pageerror',e=>pg.__errs.push(e.message));
 await pg.route(/^https?:\/\/(?!127\.0\.0\.1)/,r=>routeFn?routeFn(r):r.abort());
 await pg.addInitScript(i=>{try{if(!sessionStorage.__i){sessionStorage.__i=1;localStorage.setItem('sunshine.home','off');localStorage.setItem('sunshine.news','{"seen":"1.49"}');if(i)Object.keys(i).forEach(k=>localStorage.setItem(k,i[k]))}}catch(e){}},init||null);
 await pg.goto(`http://127.0.0.1:${port}/index_ueberarbeitet.html${q||''}`,{waitUntil:'load'});await pg.waitForTimeout(1200);return pg};
let pg=await mk('',{'sunshine.player':'{"bg":true,"vol":1}'},null);const ev=(f,a)=>pg.evaluate(f,a);
await pg.addStyleTag({content:'#toast-container{display:none!important}'});
const cp=require('child_process');const FX='/tmp/fx130_t';fs.rmSync(FX,{recursive:true,force:true});fs.mkdirSync(FX,{recursive:true});
const files=[['eins',300],['zwei',400]].map(([n,f])=>{cp.execSync(`ffmpeg -y -loglevel error -f lavfi -i "sine=frequency=${f}:duration=20" -c:a libmp3lame -metadata title=${n} -metadata artist=Band_A "${n}.mp3"`,{cwd:FX});return FX+'/'+n+'.mp3'});
// 5 Projekte anlegen
for(let i=1;i<=5;i++){await ev(async i=>{await Home.createProject({name:'Projekt '+i,bpm:100+i,root:0,scale:'minor',grid:2,arr:'std',click:false,loop:true,start:'empty',notes:'',cv:null})},i);await pg.waitForTimeout(250)}
await ev(()=>Home.open());await pg.waitForTimeout(900);
const noScroll=()=>ev(()=>{const s=document.querySelector('.hm-scroll');return s.scrollHeight<=s.clientHeight+1});
T('Startseite ohne Player: passt ohne Scrollen',await noScroll(),await ev(()=>{const s=document.querySelector('.hm-scroll');return [s.scrollHeight,s.clientHeight,document.getElementById('home-root').dataset.fit]}));
T('Startseite: nur die letzten 3 Projekte, „Alle 5“ sichtbar',await ev(()=>document.querySelectorAll('#hm-list .hm-item:not([style*="display: none"])').length>=2&&!document.getElementById('hm-all').hidden&&/5/.test(document.getElementById('hm-all').textContent)));
// Player abspielen, zurück zur Startseite
await ev(()=>{Home.close();Player.open()});await pg.waitForTimeout(300);await pg.setInputFiles('#pl-file',files);await pg.waitForTimeout(1500);
await ev(()=>document.querySelectorAll('#pl-list .pl-row')[0].click());await pg.waitForTimeout(1200);
const hPl=await ev(()=>document.getElementById('pl-dock').getBoundingClientRect().height);
await ev(()=>{Player.close();Home.open()});await pg.waitForTimeout(1500);
T('Startseite mit laufendem Player + Dockbar: passt ohne Scrollen',await noScroll(),await ev(()=>{const s=document.querySelector('.hm-scroll');return [s.scrollHeight,s.clientHeight,document.getElementById('home-root').dataset.fit]}));
const g=await ev(()=>{const r=s=>document.querySelector(s).getBoundingClientRect(),st=r('#hm-stage'),dk=r('#hm-dock'),sc=r('.hm-scroll');return {stageBottom:st.bottom,dockTop:dk.top,dockH:dk.height,scBottom:sc.bottom,stageTop:st.top,vh:innerHeight,stageH:st.height}});
T('Cover/Equalizer sitzt direkt über der Dockbar (Abstand ≤ 16 px) und unter dem Scrollbereich',g.dockTop-g.stageBottom<=16&&g.dockTop-g.stageBottom>=0&&g.scBottom<=g.stageTop+1,g);
T('Bühne ist niedrig (≤ 150 px)',g.stageH<=150,g);
const hHome=g.dockH;
T('Dockbar-Höhe niedrig (≤ 92 px) im Player und auf der Startseite',hPl<=92&&hHome<=92,{hPl,hHome});
T('Dockbar-Höhe in Player und Startseite gleich (±2 px)',Math.abs(hPl-hHome)<=2,{hPl,hHome});
const hBar=await ev(()=>document.getElementById('bottom-nav').getBoundingClientRect().height);
T('…und auch die DAW-Leiste ist gleich hoch (±2 px)',Math.abs(hBar-hHome)<=2,{hBar,hHome});
// Titel unter dem Cover, ✕ blendet aus
T('Titelzeile liegt unter dem Cover (Quelle, Titel, ✕)',await ev(()=>{const c=document.querySelector('#hm-stage .hm-cap');return !!c&&!!c.querySelector('.hd-src')&&/eins/.test(c.querySelector('.hd-title').textContent)&&!!c.querySelector('.hd-x')}));
// Große Ansicht
await ev(()=>Home.openAll());await pg.waitForTimeout(600);
T('Große Ansicht: eigenes Fenster mit Abstand (Rand oben und seitlich > 0), Startseite verkleinert',await ev(()=>{const b=document.querySelector('.hm-big').getBoundingClientRect(),r=document.getElementById('home-root');return b.top>30&&b.left>=8&&b.right<=innerWidth-8&&r.classList.contains('hm-depth')&&getComputedStyle(r).transform!=='none'}));
T('Große Ansicht: alle 5 Projekte, kein Scrollbalken sichtbar',await ev(()=>{const l=document.getElementById('hm-biglist');return l.querySelectorAll('.hm-item').length===5&&(getComputedStyle(l).scrollbarWidth==='none'||l.offsetWidth===l.clientWidth)}));
await pg.keyboard.press('Escape');await pg.waitForTimeout(500);
T('Escape schließt die große Ansicht',await ev(()=>!document.querySelector('.hm-big-bg')&&!document.getElementById('home-root').classList.contains('hm-depth')));
// Designs: Karten/CTA folgen dem Design
const looks=await ev(()=>{const o={};for(const t of ['aurora','studio','neon','liquid','classic']){document.documentElement.dataset.theme=t;const c=getComputedStyle(document.querySelector('#hm-new')),k=getComputedStyle(document.querySelector('#hm-import'));o[t]=[c.backgroundImage.slice(0,40),k.borderRadius,k.borderTopColor]}return o});
T('Startseite: Karten/Knöpfe sehen je Design verschieden aus (5 Designs, 5 Varianten)',new Set(Object.values(looks).map(v=>v.join('|'))).size===5,looks);
await ev(()=>{document.documentElement.dataset.theme='aurora'});
// Projekt öffnen aus der großen Ansicht
await ev(()=>Home.openAll());await pg.waitForTimeout(500);
await ev(()=>document.querySelector('#hm-biglist .hm-item').click());await pg.waitForTimeout(1200);
T('Projekt aus der großen Ansicht öffnen schließt Ansicht und Startseite',await ev(()=>!document.querySelector('.hm-big-bg')&&document.getElementById('home-root').hidden&&!!dawState.project));
T('Keine JavaScript-Fehler',pg.__errs.length===0,pg.__errs);
console.log(`\n${ok} bestanden, ${bad} fehlgeschlagen`);await b.close();srv.close();process.exit(bad?1:0)})().catch(e=>{console.error(e);process.exit(2)});
