const http=require('http'),fs=require('fs'),path=require('path');const {chromium}=require('playwright');
const WORK=process.argv[2];
const srv=http.createServer((q,r)=>{const u=new URL(q.url,'http://x');const f=path.join(WORK,decodeURIComponent(u.pathname).replace(/^\//,''));fs.readFile(f,(e,d)=>{if(e){r.writeHead(404);r.end();return;}
 let body=d;if(/\.html$/.test(f)){let t=d.toString();if(u.searchParams.get('repo'))t=t.replace("repo:'__BUILD_REPO__'","repo:'o/r'").replace("n:'__BUILD_N__'","n:'7'");t=t.replace(/const MAIL = "[^"]*";/,u.searchParams.get('mail')?'const MAIL = "test@example.com";':'const MAIL = "";');body=t}
 r.writeHead(200,{'content-type':/\.html$/.test(f)?'text/html':/\.js$/.test(f)?'application/javascript':'application/octet-stream'});r.end(body)})});
let ok=0,bad=0;const T=(n,c,x)=>{if(c){ok++;console.log('PASS',n)}else{bad++;console.log('FAIL',n,x===undefined?'':JSON.stringify(x))}};
(async()=>{await new Promise(r=>srv.listen(0,'127.0.0.1',r));const port=srv.address().port;const b=await chromium.launch();
const mk=async(q,init,routeFn)=>{const ctx=await b.newContext({viewport:{width:393,height:852},isMobile:true,hasTouch:true});const pg=await ctx.newPage();pg.__errs=[];pg.on('pageerror',e=>pg.__errs.push(e.message));
 await pg.route(/^https?:\/\/(?!127\.0\.0\.1)/,r=>routeFn?routeFn(r):r.abort());
 await pg.addInitScript(i=>{try{if(!sessionStorage.__i){sessionStorage.__i=1;localStorage.setItem('sunshine.home','off');localStorage.setItem('sunshine.news','{"seen":"1.44"}');if(i)Object.keys(i).forEach(k=>localStorage.setItem(k,i[k]))}}catch(e){}},init||null);
 await pg.goto(`http://127.0.0.1:${port}/index_ueberarbeitet.html${q||''}`,{waitUntil:'load'});await pg.waitForTimeout(1200);return pg};
let pg=await mk('',{'sunshine.player':'{"bg":true,"vol":1}'},null);const ev=(f,a)=>pg.evaluate(f,a);
const cp=require('child_process');const FX='/tmp/fx129_t';fs.rmSync(FX,{recursive:true,force:true});fs.mkdirSync(FX,{recursive:true});
const files=[['eins',300],['zwei',400]].map(([n,f])=>{cp.execSync(`ffmpeg -y -loglevel error -f lavfi -i "sine=frequency=${f}:duration=20" -c:a libmp3lame -metadata title=${n} -metadata artist=Band_A "${n}.mp3"`,{cwd:FX});return FX+'/'+n+'.mp3'});
// --- Leiste mit vier Seiten (ab 1.40 mit Zentrale)
const a=await ev(()=>{const n=document.getElementById('bottom-nav');return {on:n.classList.contains('td-on'),panes:n.querySelectorAll('.td-scroll>*').length,pl:!!n.querySelector('.td-pl'),sw:['btn-td-tabs','btn-td-tp','btn-td-pl','btn-td-back'].map(i=>!!document.getElementById(i)),pane:n.dataset.pane,btns:[...n.querySelectorAll('.td-pl [data-hd]')].map(b=>b.dataset.hd).join(),h:n.getBoundingClientRect().height}});
T('DAW-Leiste hat vier Seiten (Transport, Bereiche, Player, Zentrale)',a.on&&a.panes===4&&a.pl&&a.pane==='tp',a);
T('Player-Seite: Zufall/Zurück/Play/Weiter/Wiederholen wie im Player',a.btns==='shuffle,prev,toggle,next,repeat',a);
T('Leiste nicht höher als 110 px',a.h<=110,a);
await ev(()=>TpDock.go('pl',true));await pg.waitForTimeout(500);
T('Seite wechselt auf Player, andere Seiten inert',await ev(()=>{const n=document.getElementById('bottom-nav');return n.dataset.pane==='pl'&&n.querySelector('.td-tp').hasAttribute('inert')&&!n.querySelector('.td-pl').hasAttribute('inert')}));
T('Player-Seite: Tasten im Bildschirm und ≥ 40 px',await ev(()=>[...document.querySelectorAll('#bottom-nav .td-pl [data-hd]')].every(b=>{const r=b.getBoundingClientRect();return r.height>=40&&r.left>=0&&r.right<=innerWidth})));
await ev(()=>TpDock.go('tp',true));await pg.waitForTimeout(400);
// --- DAW-Tasten im gleichen Stil
T('DAW-Tasten: Symbole per CSS-Maske, keine Beschriftung sichtbar, gleiche Höhe wie Player-Tasten',await ev(()=>{const s=id=>getComputedStyle(document.getElementById(id));const p=document.querySelector('#bottom-nav .td-pl .hd-ic');const hp=p.getBoundingClientRect().height;return ['btn-stop','btn-loop','btn-metronome'].every(i=>s(i).fontSize==='0px'&&Math.abs(document.getElementById(i).getBoundingClientRect().height-hp)<=6)}));
// --- Auto-Umschaltung
await ev(()=>Player.open());await pg.waitForTimeout(300);
await pg.setInputFiles('#pl-file',files);await pg.waitForTimeout(1500);
// Optionen-Knopf
T('Player: Optionen-Knopf vorhanden',await ev(()=>!!document.querySelector('#pl-root [data-pl="opts"]')));
await ev(()=>document.querySelector('#pl-root [data-pl="opts"]').click());await pg.waitForTimeout(500);
T('Optionen öffnen sich über dem Player',await ev(()=>{const m=document.getElementById('settings-modal'),p=document.getElementById('pl-root');const mz=+getComputedStyle(m).zIndex,pz=+getComputedStyle(p).zIndex;return !m.classList.contains('hidden')&&mz>pz}));
await ev(()=>{const m=document.getElementById('settings-modal');const c=m.querySelector('[data-close],#btn-close-settings,.close');if(c)c.click();else m.classList.add('hidden')});await pg.waitForTimeout(300);
// Fester Kopf
await ev(()=>document.querySelectorAll('#pl-list .pl-row')[0].click());await pg.waitForTimeout(1200);
T('Player: Cover/Titel-Bereich ist fest (außerhalb des Scrollbereichs)',await ev(()=>{const f=document.getElementById('pl-fixed'),b=document.querySelector('#pl-root .pl-body');return !!f&&!!b&&!b.contains(f)&&f.getBoundingClientRect().bottom<innerHeight*0.45}));
T('Player: Körper scrollt, Kopf bleibt',await ev(()=>{const b=document.querySelector('#pl-root .pl-body'),f=document.getElementById('pl-fixed');const t0=f.getBoundingClientRect().top;b.scrollTop=9999;return (b.scrollTop>0||b.scrollHeight<=b.clientHeight)&&Math.abs(f.getBoundingClientRect().top-t0)<1}));
await ev(()=>Player.close());await pg.waitForTimeout(700);
T('Player läuft → Leiste springt zur Player-Seite',await ev(()=>document.getElementById('bottom-nav').dataset.pane==='pl'),await ev(()=>document.getElementById('bottom-nav').dataset.pane));
T('Mini-Leiste des Players ist bei aktiver DAW-Leiste ausgeblendet',await ev(()=>{const m=document.getElementById('pl-mini');return !m||getComputedStyle(m).display==='none'||m.getBoundingClientRect().height===0}));
await ev(()=>Player.toggle&&Player.toggle());await pg.waitForTimeout(300);
await ev(()=>document.getElementById('btn-play').click());await pg.waitForTimeout(900);
T('DAW startet → Leiste springt zurück zum Transport',await ev(()=>document.getElementById('bottom-nav').dataset.pane==='tp'),await ev(()=>[document.getElementById('bottom-nav').dataset.pane,Player.state().playing]));
await ev(()=>document.getElementById('btn-stop').click());
// --- Optionen: Tasten passend + Scrollbalken
T('Option „Tasten passend zum Leistenstil“ standardmäßig aus',await ev(()=>!TpDock.icons()&&document.documentElement.dataset.dockicons!=='on'));
await ev(()=>{TpDock.setKind('neon');TpDock.setIcons(true)});await pg.waitForTimeout(200);
T('Option an → data-dockicons=on und Tasten bekommen Leistenstil',await ev(()=>{const el=document.querySelector('#bottom-nav .td-pl .hd-play');return document.documentElement.dataset.dockicons==='on'&&getComputedStyle(el).borderTopWidth!=='0px'}));
await ev(()=>TpDock.setIcons(false));await pg.waitForTimeout(100);
T('Option aus → Attribut weg',await ev(()=>document.documentElement.dataset.dockicons!=='on'));
T('Scrollbalken standardmäßig ausgeblendet',await ev(()=>{const b=document.querySelector('#pl-root .pl-body');return !TpDock.scrollbars()&&document.documentElement.dataset.sb!=='show'&&(getComputedStyle(b).scrollbarWidth==='none'||b.offsetWidth===b.clientWidth)}));
await ev(()=>TpDock.setScrollbars(true));await pg.waitForTimeout(100);
T('Option „Scrollbalken anzeigen“ setzt data-sb=show',await ev(()=>document.documentElement.dataset.sb==='show'));
await ev(()=>TpDock.setScrollbars(false));
T('Vier Leistenstile setzen data-dock',await ev(()=>['glass','flat','neon','plain'].every(k=>{TpDock.setKind(k);return document.documentElement.dataset.dock===k})));
T('Keine JavaScript-Fehler',pg.__errs.length===0,pg.__errs);
console.log(`\n${ok} bestanden, ${bad} fehlgeschlagen`);await b.close();srv.close();process.exit(bad?1:0)})().catch(e=>{console.error(e);process.exit(2)});
