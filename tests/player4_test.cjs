const http=require('http'),fs=require('fs'),path=require('path');const {chromium}=require('playwright');
const WORK=process.argv[2];
const srv=http.createServer((q,r)=>{const u=new URL(q.url,'http://x');const f=path.join(WORK,decodeURIComponent(u.pathname).replace(/^\//,''));fs.readFile(f,(e,d)=>{if(e){r.writeHead(404);r.end();return;}
 let body=d;if(/\.html$/.test(f)){let t=d.toString();if(u.searchParams.get('repo'))t=t.replace("repo:'__BUILD_REPO__'","repo:'o/r'").replace("n:'__BUILD_N__'","n:'7'");t=t.replace(/const MAIL = "[^"]*";/,u.searchParams.get('mail')?'const MAIL = "test@example.com";':'const MAIL = "";');body=t}
 r.writeHead(200,{'content-type':/\.html$/.test(f)?'text/html':/\.js$/.test(f)?'application/javascript':'application/octet-stream'});r.end(body)})});
let ok=0,bad=0;const T=(n,c,x)=>{if(c){ok++;console.log('PASS',n)}else{bad++;console.log('FAIL',n,x===undefined?'':JSON.stringify(x))}};
(async()=>{await new Promise(r=>srv.listen(0,'127.0.0.1',r));const port=srv.address().port;const b=await chromium.launch();
const mk=async(q,init,routeFn)=>{const ctx=await b.newContext({viewport:{width:393,height:852},isMobile:true,hasTouch:true});const pg=await ctx.newPage();pg.__errs=[];pg.on('pageerror',e=>pg.__errs.push(e.message));
 await pg.route(/^https?:\/\/(?!127\.0\.0\.1)/,r=>routeFn?routeFn(r):r.abort());
 await pg.addInitScript(i=>{try{if(!sessionStorage.__i){sessionStorage.__i=1;localStorage.setItem('sunshine.home','off');localStorage.setItem('sunshine.news','{"seen":"1.48"}');if(i)Object.keys(i).forEach(k=>localStorage.setItem(k,i[k]))}}catch(e){}},init||null);
 await pg.goto(`http://127.0.0.1:${port}/index_ueberarbeitet.html${q||''}`,{waitUntil:'load'});await pg.waitForTimeout(1200);return pg};
let pg=await mk('',{ 'sunshine.player':'{"bg":true,"vol":1}','sunshine.cover':'{"fx":"ring"}' },null);const ev=(f,a)=>pg.evaluate(f,a);
const cp=require('child_process');const FX='/tmp/fx127_t';fs.rmSync(FX,{recursive:true,force:true});fs.mkdirSync(FX,{recursive:true});
const files=[['eins',300],['zwei',400]].map(([n,f])=>{cp.execSync(`ffmpeg -y -loglevel error -f lavfi -i "sine=frequency=${f}:duration=20" -c:a libmp3lame -metadata title=${n} -metadata artist=Band_A "${n}.mp3"`,{cwd:FX});return FX+'/'+n+'.mp3'});
const SH=process.env.SHOTS;const shot=async n=>{if(SH)await pg.screenshot({path:SH+'/'+n+'.png'})};
// Start: Startseite offen, noch nichts läuft
await ev(()=>Home.open());await pg.waitForTimeout(700);
T('Startseite: keine Playbar, solange nichts läuft (Dockbar mit Klang + Zentrale bleibt)',await ev(()=>!(window.HmDock&&HmDock.state().visible)));
T('Alte Equalizer-Animation ist entfernt',await ev(()=>!document.getElementById('hm-eq')));
await shot('home_idle');
// Player füllen und abspielen, Player schließen
await ev(()=>Home.close());await ev(()=>Player.open());await pg.waitForTimeout(300);
await pg.setInputFiles('#pl-file',files);await pg.waitForTimeout(1500);
await ev(()=>document.querySelectorAll('#pl-list .pl-row')[0].click());await pg.waitForTimeout(1200);
await ev(()=>Player.close());await ev(()=>Home.open());await pg.waitForTimeout(900);
const a=await ev(()=>{const d=document.getElementById('hm-dock'),r=d.getBoundingClientRect();return {vis:HmDock.state().visible,mode:HmDock.mode(),bottom:r.bottom,vh:innerHeight,src:document.getElementById('hd-src').textContent,title:document.getElementById('hd-title').textContent,btn:[...document.querySelectorAll('#hd-ctl [data-hd]')].map(b=>b.dataset.hd),playing:Player.state().playing,cover:!!document.querySelector('#hm-cvhost .cv-b'),stage:!document.getElementById('hm-stage').hidden}});
T('Player läuft → Dockbar erscheint unten auf der Startseite',a.vis&&a.mode==='player'&&a.bottom<=a.vh&&a.bottom>a.vh-24,a);
T('Quelle „Player“, Titel „eins“, Tasten Zufall/Zurück/Play/Weiter/Wiederholen',a.src==='Player'&&a.title==='eins'&&a.btn.join()==='shuffle,prev,toggle,next,repeat',a);
T('Cover mit Equalizer-Bühne sichtbar',a.cover&&a.stage,a);
await shot('home_player');
// Steuerung
await pg.click('#hm-dock [data-hd=toggle]');await pg.waitForTimeout(500);T('Pause über die Startseiten-Dockbar',await ev(()=>!Player.state().playing));
await pg.click('#hm-dock [data-hd=toggle]');await pg.waitForTimeout(500);T('Play über die Startseiten-Dockbar',await ev(()=>Player.state().playing));
await pg.click('#hm-dock [data-hd=next]');await pg.waitForTimeout(900);T('Weiter → zweiter Titel, Anzeige folgt',await ev(()=>Player.state().idx===1&&document.getElementById('hd-title').textContent==='zwei'));
await pg.click('#hm-dock [data-hd=shuffle]');await pg.waitForTimeout(400);T('Zufall schaltet um',await ev(()=>Player.state().shuffle&&document.querySelector('#hm-dock [data-hd=shuffle]').getAttribute('aria-pressed')==='true'));
await pg.click('#hm-dock [data-hd=shuffle]');
await pg.click('#hm-dock [data-hd=repeat]');await pg.waitForTimeout(300);T('Wiederholen schaltet um',await ev(()=>Player.state().repeat==='all'));
await pg.click('#hm-dock [data-hd=repeat]');await pg.click('#hm-dock [data-hd=repeat]');
await ev(()=>{const s=document.getElementById('hd-seek');s.value=500;s.dispatchEvent(new Event('input',{bubbles:true}))});await pg.waitForTimeout(400);
T('Zeitleiste der Dockbar springt im Titel',await ev(()=>{const s=Player.state();return s.time>6&&s.time<14}),await ev(()=>Player.state()));
// Equalizer wird wirklich auf der Startseite gezeichnet
const px=await ev(()=>{const c=document.getElementById('hm-viz'),g=c.getContext('2d');const d=g.getImageData(0,0,c.width,c.height).data;let n=0;for(let i=3;i<d.length;i+=4)if(d[i]>8)n++;return {n,w:c.width,h:c.height,att:PlSound.view().c===c}});
T('Equalizer zeichnet auf der Startseite',px.n>200&&px.att,px);
// Titel tippen → Player
await pg.click('#hm-stage .hd-open');await pg.waitForTimeout(500);T('Tipp auf den Titel öffnet den Player',await ev(()=>Player.isOpen()));
const pv=await ev(()=>PlSound.view().c&&PlSound.view().c.id);T('Player nimmt die Anzeige wieder für sich',pv==='pl-viz',pv);
await ev(()=>Player.close());await pg.waitForTimeout(700);T('Zurück auf der Startseite: Anzeige wieder dort',await ev(()=>PlSound.view().c.id==='hm-viz'));
// Ausblenden
await pg.click('#hm-stage .hd-x');await pg.waitForTimeout(600);T('✕ pausiert und blendet die Playbar aus',await ev(()=>!HmDock.state().visible&&!Player.state().playing));
// DAW
await ev(()=>{Home.close()});await pg.waitForTimeout(300);
await ev(()=>{document.getElementById('btn-play').click()});await pg.waitForTimeout(900);
const dp=await ev(()=>({on:dawState.isPlaying,ph:dawState.playheadSec}));
await ev(()=>Home.open());await pg.waitForTimeout(900);
const d2=await ev(()=>{const d=document.getElementById('hm-dock');return {vis:HmDock.state().visible,mode:HmDock.mode(),src:document.getElementById('hd-src').textContent,btn:[...document.querySelectorAll('#hd-ctl [data-hd]')].map(b=>b.dataset.hd),playing:dawState.isPlaying,tm:document.getElementById('hd-cur').textContent}});
T('DAW läuft, Startseite geöffnet: Wiedergabe wird nicht mehr gestoppt',d2.playing,{dp,d2});
T('DAW → Dockbar mit DAW-Tasten (Loop/Anfang/Play/Stopp/Metronom)',d2.vis&&d2.mode==='daw'&&d2.src==='DAW'&&d2.btn.join()==='loop,start,toggle,stop,metro',d2);
await shot('home_daw');
await pg.click('#hm-dock [data-hd=toggle]');await pg.waitForTimeout(500);T('Pause der DAW über die Startseite',await ev(()=>!dawState.isPlaying));
T('Nach Pause bleibt die DAW-Leiste (Fortsetzen möglich)',await ev(()=>!document.getElementById('hm-dock').hidden&&HmDock.mode()==='daw'));
await pg.click('#hm-dock [data-hd=toggle]');await pg.waitForTimeout(600);T('Play der DAW über die Startseite',await ev(()=>dawState.isPlaying));
await pg.click('#hm-dock [data-hd=stop]');await pg.waitForTimeout(700);T('Stopp der DAW: Playbar verschwindet',await ev(()=>!dawState.isPlaying&&!HmDock.state().visible));
// Wechsel: DAW läuft, Player startet → DAW pausiert, Leiste wechselt
await ev(()=>Home.close());await ev(()=>document.getElementById('btn-play').click());await pg.waitForTimeout(600);
await ev(()=>{Player.play&&Player.play()});await pg.waitForTimeout(900);await ev(()=>Home.open());await pg.waitForTimeout(700);
T('Player startet während die DAW läuft: Leiste zeigt den Player, DAW ist angehalten',await ev(()=>HmDock.mode()==='player'&&!dawState.isPlaying&&Player.state().playing),await ev(()=>({m:HmDock.mode(),d:dawState.isPlaying,p:Player.state().playing})));
// Themes: Leiste wie Player-Leiste
for(const th of ['aurora','studio','neon','liquid','classic']){
 const r=await ev(t=>{document.documentElement.setAttribute('data-theme',t);const a=getComputedStyle(document.querySelector('#hm-dock')),n=getComputedStyle(document.getElementById('bottom-nav'));return {pr:a.borderRadius,nr:n.borderRadius,pb:a.borderTopColor,nb:n.borderTopColor}},th);
 T('Startseiten-Dockbar '+th+': Rundung wie die DAW-Leiste',r.pr===r.nr,r);
 await pg.waitForTimeout(200);await shot('home_'+th);}
await ev(()=>document.documentElement.setAttribute('data-theme','aurora'));
for(const k of ['glass','flat','neon','plain']){const r=await ev(k=>{TpDock.setKind(k);const a=getComputedStyle(document.querySelector('#hm-dock')),p=document.querySelector('#pl-dock')&&getComputedStyle(document.querySelector('#pl-dock'));return {at:document.documentElement.getAttribute('data-dock'),bg:a.backgroundColor,pbg:p&&p.backgroundColor,r:a.borderRadius,pr:p&&p.borderRadius}},k);T('Leistenstil '+k+' gilt auch für die Startseiten-Dockbar',r.at===k&&(!r.pbg||(r.bg===r.pbg&&r.r===r.pr)),r)}
await ev(()=>TpDock.setKind('auto'));
// Scrollbereich nicht verdeckt
T('Liste endet oberhalb von Cover-Bühne und Dockbar (nichts wird verdeckt)',await ev(()=>{const s=document.querySelector('.hm-scroll').getBoundingClientRect(),st=document.getElementById('hm-stage').getBoundingClientRect(),d=document.getElementById('hm-dock').getBoundingClientRect();return s.bottom<=st.top+1&&st.bottom<=d.top+1}),await ev(()=>{const s=document.querySelector('.hm-scroll').getBoundingClientRect(),st=document.getElementById('hm-stage').getBoundingClientRect(),d=document.getElementById('hm-dock').getBoundingClientRect();return [s.bottom,st.top,st.bottom,d.top]}));
T('Keine JavaScript-Fehler',pg.__errs.length===0,pg.__errs);
console.log(`\n${ok} bestanden, ${bad} fehlgeschlagen`);await b.close();srv.close();process.exit(bad?1:0)})().catch(e=>{console.error(e);process.exit(2)});
