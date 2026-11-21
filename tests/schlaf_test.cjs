/* 1.48: Schlaf-Timer im Player (Mond-Knopf, Zeit/„Nach diesem Titel“, Ausblenden, Aus) */
const http=require('http'),fs=require('fs'),path=require('path');const {chromium}=require('playwright');
const WORK=process.argv[2];
const srv=http.createServer((q,r)=>{const f=path.join(WORK,decodeURIComponent(q.url.split('?')[0]).replace(/^\//,''));fs.readFile(f,(e,d)=>{if(e){r.writeHead(404);r.end();return;}r.writeHead(200,{'content-type':f.endsWith('.html')?'text/html':f.endsWith('.js')?'application/javascript':'application/octet-stream'});r.end(d)})});
let ok=0,bad=0;const T=(n,c,x)=>{if(c){ok++;console.log('PASS',n)}else{bad++;console.log('FAIL',n,x===undefined?'':JSON.stringify(x))}};
const wav=(sec,hz)=>{const sr=8000,n=Math.round(sr*sec),b=Buffer.alloc(44+n*2);b.write('RIFF',0);b.writeUInt32LE(36+n*2,4);b.write('WAVEfmt ',8);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);b.writeUInt32LE(sr,24);b.writeUInt32LE(sr*2,28);b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(n*2,40);for(let i=0;i<n;i++)b.writeInt16LE(Math.round(9000*Math.sin(2*Math.PI*hz*i/sr)),44+i*2);return b};
(async()=>{await new Promise(r=>srv.listen(0,'127.0.0.1',r));const port=srv.address().port;const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});
const ctx=await b.newContext({viewport:{width:393,height:852},isMobile:true,hasTouch:true});await ctx.addInitScript(()=>{try{localStorage.setItem('sunshine.home','off');localStorage.setItem('sunshine.news','{"seen":"9.99"}')}catch(_){}});
const pg=await ctx.newPage();const errs=[];pg.on('pageerror',e=>errs.push(e.message));
await pg.route(/^https?:\/\/(?!127\.0\.0\.1)/,r=>r.abort());
await pg.goto(`http://127.0.0.1:${port}/index_ueberarbeitet.html`,{waitUntil:'load'});await pg.waitForTimeout(1200);
const ev=(f,a)=>pg.evaluate(f,a);
await ev(()=>Player.open());await pg.waitForTimeout(400);
await pg.setInputFiles('#pl-file',[{name:'a-eins.wav',mimeType:'audio/wav',buffer:wav(6,440)},{name:'b-zwei.wav',mimeType:'audio/wav',buffer:wav(5,660)}]);await pg.waitForTimeout(900);
const base=await ev(()=>SunTick.count());
T('Mond-Knopf in der Player-Kopfzeile, Timer aus',await ev(()=>{const b=document.querySelector('#pl-root .pl-top [data-pl=sleep]');return !!b&&b.getAttribute('aria-pressed')==='false'&&b.querySelector('b').hidden&&b.getBoundingClientRect().width>=36}));
T('Ohne Timer: Lautstärke und Ausblend-Regler voll',await ev(()=>Player.audio.volume===1&&PlSound.fadeNow()===1&&Player.sleepState()===null));
// Auswahlfenster
await pg.tap('#pl-root [data-pl=sleep]');await pg.waitForTimeout(250);
T('Antippen öffnet das Auswahlfenster „Schlaf-Timer“',await ev(()=>{const r=document.getElementById('pl-rc');return !r.hidden&&!!r.querySelector('[aria-label="Schlaf-Timer"]')}));
T('Auswahl: 15/30/45/60/90 Minuten und „Nach diesem Titel“ (ohne „ausschalten“)',await ev(()=>{const v=[...document.querySelectorAll('#pl-rc [data-sl]')].map(x=>x.dataset.sl);return v.join()==='15,30,45,60,90,track'}));
await pg.tap('#pl-rc [data-sl="15"]');await pg.waitForTimeout(250);
let s=await ev(()=>Player.sleepState());
T('15 Minuten gewählt: Timer läuft (≈ 900 s), Fenster zu',!!s&&s.mode==='time'&&s.mins===15&&s.left>880&&s.left<=900&&await ev(()=>document.getElementById('pl-rc').hidden),s);
T('Mond leuchtet, Zahl „15“ am Knopf',await ev(()=>{const b=document.querySelector('#pl-root [data-pl=sleep]');return b.getAttribute('aria-pressed')==='true'&&!b.querySelector('b').hidden&&b.querySelector('b').textContent==='15'}));
const on=await ev(()=>SunTick.count());
await pg.tap('#pl-root [data-pl=sleep]');await pg.waitForTimeout(250);
T('Offen bei laufendem Timer: aktive Zeile markiert und „Timer ausschalten“ da',await ev(()=>{const r=document.getElementById('pl-rc');return !!r.querySelector('.pl-rrow.on [data-sl="15"]')&&!!r.querySelector('[data-sl="0"]')&&/Aktiv/.test(r.textContent)}));
await pg.tap('#pl-rc [data-sl="30"]');await pg.waitForTimeout(250);
T('Neu wählen ersetzt den Timer (30 Min., nur ein Taktgeber)',await ev(()=>Player.sleepState().mins===30)&&(await ev(()=>SunTick.count()))===on,[on,await ev(()=>SunTick.count())]);
// Ablauf mit Ausblenden
await ev(()=>Player.play());await pg.waitForTimeout(700);
T('Wiedergabe läuft',await ev(()=>!Player.audio.paused));
await ev(()=>Player._sleepAt(8));await pg.waitForTimeout(1600);
const f1=await ev(()=>({f:PlSound.fadeNow(),v:Player.audio.volume,p:Player.audio.paused}));
T('Letzte 20 s: Ausblenden läuft (Regler < 1, Wiedergabe weiter)',f1.f<0.6&&f1.f>0.05&&!f1.p,f1);
await ev(()=>Player._sleepAt(0.2));await pg.waitForTimeout(1500);
const f2=await ev(()=>({f:PlSound.fadeNow(),v:Player.audio.volume,p:Player.audio.paused,s:Player.sleepState(),h:document.querySelector('#pl-root [data-pl=sleep] b').hidden}));
T('Zeit um: Wiedergabe angehalten, Timer weg, Lautstärke wieder voll',f2.p&&f2.s===null&&f2.f===1&&f2.v===1&&f2.h,f2);
T('Taktgeber nach Ablauf gestoppt',(await ev(()=>SunTick.count()))===base,[base,await ev(()=>SunTick.count())]);
await ev(()=>Player.play());await pg.waitForTimeout(500);
T('Danach spielt der Player wieder normal (nicht stumm)',await ev(()=>!Player.audio.paused&&Player.audio.volume===1&&PlSound.fadeNow()===1));
// Ausschalten
await ev(()=>Player.sleep(45));await pg.tap('#pl-root [data-pl=sleep]');await pg.waitForTimeout(250);await pg.tap('#pl-rc [data-sl="0"]');await pg.waitForTimeout(250);
T('„Timer ausschalten“: Timer weg, Mond aus, Taktgeber gestoppt',await ev(()=>Player.sleepState()===null&&document.querySelector('#pl-root [data-pl=sleep]').getAttribute('aria-pressed')==='false')&&(await ev(()=>SunTick.count()))===base);
// Nach diesem Titel
await ev(()=>{Player.pause();Player.audio.currentTime=0});await pg.waitForTimeout(200);
await pg.tap('#pl-root [data-pl=sleep]');await pg.waitForTimeout(250);await pg.tap('#pl-rc [data-sl="track"]');await pg.waitForTimeout(250);
T('„Nach diesem Titel“ gewählt, Zahl „1“ am Mond',await ev(()=>{const s=Player.sleepState();return s&&s.mode==='track'&&document.querySelector('#pl-root [data-pl=sleep] b').textContent==='1'}));
await ev(()=>Player.play());await pg.waitForTimeout(600);
await ev(()=>{Player.audio.currentTime=Math.max(0,Player.audio.duration-0.4)});await pg.waitForTimeout(2200);
const t1=await ev(()=>({st:Player.state(),sl:Player.sleepState()}));
T('Titel zu Ende: Wiedergabe angehalten, nächster Titel (Nr. 2) bereit, Timer weg',t1.st.idx===1&&!t1.st.playing&&t1.sl===null,t1);
await ev(()=>Player.play());await pg.waitForTimeout(500);
T('Danach spielt Titel 2 ganz normal',await ev(()=>!Player.audio.paused&&Player.state().idx===1));
await ev(()=>Player.pause());
// Kopfzeile bei schmalen Breiten
for(const w of [393,360,320]){await pg.setViewportSize({width:w,height:780});await pg.waitForTimeout(400);
 const r=await ev(()=>{const bs=[...document.querySelectorAll('#pl-root .pl-top button')].map(e=>e.getBoundingClientRect());const h=document.querySelector('#pl-root .pl-top h2').getBoundingClientRect();
  const hit=(a,c)=>a.left<c.right-0.5&&c.left<a.right-0.5&&a.top<c.bottom&&c.top<a.bottom;let ov=false;for(let i=0;i<bs.length;i++){if(hit(bs[i],h))ov=true;for(let j=i+1;j<bs.length;j++)if(hit(bs[i],bs[j]))ov=true}
  return {n:bs.length,inside:bs.every(x=>x.left>=0&&x.right<=innerWidth),ov,sw:document.documentElement.scrollWidth<=innerWidth}});
 T(w+' px: Kopfzeile – alle Knöpfe sichtbar, nichts überlappt, kein Überlauf',r.n>=4&&r.inside&&!r.ov&&r.sw,r)}
T('Keine JS-Fehler',errs.length===0,errs.slice(0,3));
console.log(`\n${ok} ok / ${bad} fail`);await b.close();srv.close();process.exit(bad?1:0)})();
