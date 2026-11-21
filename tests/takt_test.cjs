const http=require('http'),fs=require('fs'),path=require('path');const {chromium}=require('playwright');
const WORK=process.argv[2];const TW=fs.readFileSync(path.join(__dirname,'fixtures/tailwind.js'));
const srv=http.createServer((q,r)=>{const f=path.join(WORK,decodeURIComponent(q.url.split('?')[0]).replace(/^\//,''));fs.readFile(f,(e,d)=>{if(e){r.writeHead(404);r.end();return;}r.writeHead(200,{'content-type':f.endsWith('.html')?'text/html':'application/octet-stream'});r.end(d)})});
let ok=0,bad=0;const T=(n,c,x)=>{if(c){ok++;console.log('PASS',n)}else{bad++;console.log('FAIL',n,x===undefined?'':JSON.stringify(x))}};
(async()=>{await new Promise(r=>srv.listen(0,'127.0.0.1',r));const port=srv.address().port;const b=await chromium.launch();
const ctx=await b.newContext({viewport:{width:393,height:852},isMobile:true,hasTouch:true});await ctx.addInitScript(()=>{try{localStorage.setItem('sunshine.home','off');localStorage.setItem('sunshine.news','{"seen":"1.42"}')}catch(_){}
 window.__raf=0;window.__rn={};const r=window.requestAnimationFrame;window.requestAnimationFrame=function(f){return r.call(window,function(t){window.__raf++;const k=f.name||String(f).replace(/\s+/g,' ').slice(0,60);window.__rn[k]=(window.__rn[k]||0)+1;return f(t)})};
 window.__iv=0;const si=window.setInterval;window.setInterval=function(...a){window.__iv++;return si.apply(this,a)};
 window.__mo=0;const MO=window.MutationObserver;window.MutationObserver=function(cb){window.__mo++;return new MO(cb)};window.MutationObserver.prototype=MO.prototype});
const pg=await ctx.newPage();const errs=[];pg.on('pageerror',e=>errs.push(String(e.message||e)));
await pg.route(/cdn\.tailwindcss\.com/,r=>r.fulfill({status:200,contentType:'application/javascript',body:TW}));await pg.route(/^https?:\/\/(?!127\.0\.0\.1|cdn\.tailwindcss\.com)/,r=>r.abort());
await pg.goto(`http://127.0.0.1:${port}/index_ueberarbeitet.html`,{waitUntil:'load'});await pg.waitForTimeout(3500);
const ev=(f,a)=>pg.evaluate(f,a);
// ---- SunTick
T('SunTick vorhanden, Raster 250 ms',await ev(()=>!!window.SunTick&&SunTick.BASE===250));
T('SunTick.every: Aufgabe läuft im Raster (≈500 ms → 3–4 Läufe in 2 s), stop beendet sie',await ev(async()=>{let n=0;const h=SunTick.every(400,()=>n++);await new Promise(r=>setTimeout(r,2100));const a=n;SunTick.stop(h);await new Promise(r=>setTimeout(r,1100));return a>=3&&a<=5&&n===a}));
T('SunTick: 400 ms → 500 ms, 700 ms → 750 ms (Rundung aufs Raster)',await ev(async()=>{const t0=performance.now();const ts=[];const h=SunTick.every(700,()=>ts.push(performance.now()-t0));await new Promise(r=>setTimeout(r,2400));SunTick.stop(h);const d=ts[1]-ts[0];return ts.length>=2&&d>=700&&d<=820}));
T('SunTick: Fehler in einer Aufgabe stoppen die anderen nicht',await ev(async()=>{const w=console.warn;console.warn=()=>{};let n=0;const a=SunTick.every(250,()=>{throw new Error('x')}),c=SunTick.every(250,()=>n++);await new Promise(r=>setTimeout(r,1100));SunTick.stop(a);SunTick.stop(c);console.warn=w;return n>=3}));
T('SunTick.rate: Takt zur Laufzeit ändern',await ev(async()=>{let n=0;const h=SunTick.every(250,()=>n++);await new Promise(r=>setTimeout(r,1100));const a=n;SunTick.rate(h,1000);n=0;await new Promise(r=>setTimeout(r,2300));SunTick.stop(h);return a>=3&&n>=1&&n<=3}));
T('SunTick im Hintergrund: normale Aufgaben ruhen, {hidden:true} laufen; beim Zurückkehren holen normale sofort nach',await ev(async()=>{let a=0,c=0;const t1=SunTick.every(250,()=>a++),t2=SunTick.every(250,()=>c++,{hidden:true});
 Object.defineProperty(document,'hidden',{get:()=>true,configurable:true});document.dispatchEvent(new Event('visibilitychange'));const a0=a;await new Promise(r=>setTimeout(r,1300));const aHid=a-a0,cHid=c;
 Object.defineProperty(document,'hidden',{get:()=>false,configurable:true});document.dispatchEvent(new Event('visibilitychange'));const a1=a;SunTick.stop(t1);SunTick.stop(t2);return aHid===0&&cHid>=3&&a1===a0+1}));
T('SunTick: ohne Aufgaben steht der Takt still (keine Zähler übrig)',await ev(()=>{const base=SunTick.count();const h=SunTick.every(250,()=>{});const m=SunTick.count()===base+1;SunTick.stop(h);return m&&SunTick.count()===base}));
// ---- SunDOM
T('SunDOM.mount: Platzhalter-Element wird genau einmal bestückt',await ev(async()=>{let n=0;SunDOM.mount('zz-test-sec',el=>{n++;el.textContent='x'});const d=document.createElement('div');d.id='zz-test-sec';document.body.appendChild(d);await new Promise(r=>setTimeout(r,100));const w=document.createElement('div');w.innerHTML='<p><span id="zz-test-sec"></span></p>';document.body.appendChild(w);await new Promise(r=>setTimeout(r,100));const n1=n;d.remove();w.remove();return n1===2}));
T('SunDOM.on: Hook für Selektor feuert für neue Teilbäume',await ev(async()=>{let n=0;SunDOM.on('.zz-hook',()=>n++);const d=document.createElement('div');d.innerHTML='<i class="zz-hook"></i>';document.body.appendChild(d);await new Promise(r=>setTimeout(r,100));d.remove();return n===1}));
await pg.evaluate(()=>document.getElementById('btn-settings').click());await pg.waitForSelector('#settings-modal');await pg.waitForTimeout(900);
{const r=await ev(()=>{const ids=['fx-sec','ly-sec','up-sec','hl-sec','sv-sec','fb-sec','pl-sec','in-sec','cv-sec','td-sec'];return ids.filter(i=>{const e=document.getElementById(i);return !(e&&e.children.length>0)})});
T('Optionsmenü: alle zehn Modul-Abschnitte werden beim Öffnen bestückt',r.length===0,r);}
await pg.evaluate(()=>{const m=document.getElementById('settings-modal');const c=m&&m.querySelector('[data-close],button[aria-label*="chließ"]');if(c)c.click();else if(m)m.remove()});await pg.waitForTimeout(600);
// ---- Zählwerte der Seite
const cnt=await ev(()=>({mo:window.__mo,iv:window.__iv}));
T('Beobachter: nur noch 12 statt 21 (11 Abschnitts-Beobachter → 1)',cnt.mo<=12,cnt);
T('setInterval beim Laden: nur noch die Audio-Zeitgeber (≤ 3)',cnt.iv<=3,cnt);
// ---- Animations-Loop im Leerlauf
await pg.waitForTimeout(800);
await ev(()=>{window.__raf=0});await pg.waitForTimeout(3000);const idleRaf=await ev(()=>window.__raf);
T('Leerlauf: Zeichenschleife ruht (≤ 2 Frames/s statt 60)',idleRaf<=6,idleRaf);
await ev(async()=>{await audioEngine.ensureCtx();const c=audioEngine.ctx,sr=c.sampleRate;const bf=c.createBuffer(1,sr*4,sr);const d=bf.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=0.3*Math.sin(2*Math.PI*220*i/sr);const t=createTrack('audio','T');dawState.buffers[t.id]=bf;audioEngine.ensureTrackNode(t);renderMultiTrackLanes()});
await ev(()=>{window.__raf=0;document.getElementById('btn-play').click()});await pg.waitForTimeout(1500);
const playRaf=await ev(()=>({raf:window.__raf,playing:dawState.isPlaying,clock:document.getElementById('lcd-time')?document.getElementById('lcd-time').textContent:null}));
T('Beim Abspielen läuft die Schleife sofort wieder (≥ 30 Frames in 1,5 s)',playRaf.playing&&playRaf.raf>=30,playRaf);
await ev(()=>document.getElementById('btn-stop').click());await pg.waitForTimeout(1200);await ev(()=>{window.__raf=0;window.__rn={}});await pg.waitForTimeout(2500);
T('Nach Stopp ruht sie wieder',(await ev(()=>window.__raf))<=6,await ev(()=>({raf:window.__raf,rn:window.__rn,pl:dawState.isPlaying,tab:dawState.activeTab})));
await ev(()=>{window.__raf=0;audioEngine.play()});await pg.waitForTimeout(1500);
T('Programmatisches Abspielen (ohne Tipp) wird vom Takt bemerkt (Schleife läuft in ≤ 1,5 s wieder)',(await ev(()=>window.__raf))>=20,await ev(()=>window.__raf));
await ev(()=>audioEngine.stop(true));
T('Keine Seitenfehler',errs.length===0,errs.slice(0,3));
console.log(`\ntakt_test: ${ok} ok, ${bad} fehlgeschlagen`);await b.close();srv.close();process.exit(bad?1:0)})().catch(e=>{console.log('FAIL Absturz',e.stack||e.message);process.exit(2)});
