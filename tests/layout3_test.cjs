/* 1.41: Dockbars rasten immer auf ganzen Seiten, gleiche Bauweise in DAW/Player/Startseite, Seiten der Rand-Effekte, Player-Kopfzeile + „+ Dateien“ im Listenfenster */
const http=require('http'),fs=require('fs'),path=require('path');const {chromium}=require('playwright');
const WORK=process.argv[2];
const srv=http.createServer((q,r)=>{const f=path.join(WORK,decodeURIComponent(q.url.split('?')[0]).replace(/^\//,''));fs.readFile(f,(e,d)=>{if(e){r.writeHead(404);r.end();return;}r.writeHead(200,{'content-type':f.endsWith('.html')?'text/html':'application/octet-stream'});r.end(d)})});
let ok=0,bad=0;const T=(n,c,x)=>{if(c){ok++;console.log('PASS',n)}else{bad++;console.log('FAIL',n,x===undefined?'':JSON.stringify(x))}};
(async()=>{await new Promise(r=>srv.listen(0,'127.0.0.1',r));const port=srv.address().port;const b=await chromium.launch();
const mk=async(w,pre)=>{const ctx=await b.newContext({viewport:{width:w,height:854},isMobile:true,hasTouch:true});const pg=await ctx.newPage();pg.errs=[];pg.on('pageerror',e=>pg.errs.push(e.message));await pg.route(/^https?:\/\/(?!127\.0\.0\.1)/,r=>r.abort());
 await pg.addInitScript(p=>{try{if(!sessionStorage.__i){sessionStorage.__i=1;localStorage.setItem('sunshine.home','off');localStorage.setItem('sunshine.news','{"seen":"9.99"}');if(p)for(const k in p)localStorage.setItem(k,p[k])}}catch(e){}},pre||null);
 await pg.goto(`http://127.0.0.1:${port}/index_ueberarbeitet.html`,{waitUntil:'load'});await pg.waitForTimeout(1000);return pg};
const settled=async(pg,sel)=>{await pg.waitForTimeout(900);return pg.evaluate(s=>{const e=document.querySelector(s);const w=e.clientWidth;const n=Math.round(e.scrollLeft/w);return {off:Math.abs(e.scrollLeft-n*w),n}},sel)};
const half=(pg,sel)=>pg.evaluate(s=>{const e=document.querySelector(s);e.style.scrollSnapType='none';e.scrollLeft=e.clientWidth*1.5},sel);
const swipe=async(pg,sel,dx)=>{const cdp=await pg.context().newCDPSession(pg);const r=await pg.evaluate(s=>{const e=document.querySelector(s).getBoundingClientRect();return {x:e.left+e.width/2,y:e.top+e.height/2}},sel);
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:r.x,y:r.y}]});for(let i=1;i<=10;i++){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:r.x+dx*i/10,y:r.y}]});await new Promise(a=>setTimeout(a,16))}await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]})};

// ---------- Punkt 5: Dockbar ----------
let pg=await mk(384);const ev=(f,a)=>pg.evaluate(f,a);
T('DAW-Leiste: Punkte mittig unten, 3 Stück, antippbar',await ev(()=>{const d=document.querySelector('#bottom-nav .td-dots2');if(!d)return false;const r=d.getBoundingClientRect(),n=document.getElementById('bottom-nav').getBoundingClientRect();return d.children.length===3&&Math.abs((r.left+r.right)/2-(n.left+n.right)/2)<3&&r.bottom<=n.bottom+1}));
T('DAW-Leiste: Pfeile ausgeblendet (wie im Player), bleiben im Dokument',await ev(()=>{const a=document.getElementById('btn-td-zt');return !!a&&getComputedStyle(a).display==='none'&&!!document.getElementById('btn-td-tabs')}));
await pg.tap('#bottom-nav [data-td-go="tabs"]');await pg.waitForTimeout(700);
T('Punkt „Bereiche“ tippen → Bereichs-Seite, Punkt markiert',await ev(()=>{const n=document.getElementById('bottom-nav');return n.dataset.pane==='tabs'&&n.querySelector('[data-td-go="tabs"]').classList.contains('on')}));
await pg.tap('#bottom-nav [data-td-go="tp"]');await pg.waitForTimeout(700);
let s=await settled(pg,'#bottom-nav .td-scroll');T('DAW-Leiste steht nach Punkt-Tipp auf ganzer Seite',s.off<=2&&s.n===0,s);
await half(pg,'#bottom-nav .td-scroll');s=await settled(pg,'#bottom-nav .td-scroll');T('DAW-Leiste: halb stehengebliebene Seite rastet von selbst ein',s.off<=2,s);
T('DAW-Leiste: nur die aktive Seite bedienbar (inert) nach dem Einrasten',await ev(()=>{const n=document.getElementById('bottom-nav'),i=n.dataset.pane;const ps=[...n.querySelectorAll('.td-pane')];const idx=['tp','tabs','zt'].indexOf(i);return ps.every((p,k)=>p.hasAttribute('inert')===(k!==idx))}));
for(let i=0;i<2;i++)await swipe(pg,'#bottom-nav .td-scroll',-260);await pg.waitForTimeout(1100);
s=await settled(pg,'#bottom-nav .td-scroll');T('Echtes Wischen ×2 endet auf ganzer Seite (Zentrale)',s.off<=2&&s.n===2,s);
// Transport-Seite wie im Player
await ev(()=>TpDock.go('tp',true));await pg.waitForTimeout(500);
const o=await ev(()=>{const x=id=>{const e=document.getElementById(id);if(!e)return null;const r=e.getBoundingClientRect();return Math.round(r.left)};return ['btn-loop','btn-td-start','btn-play','btn-stop','btn-metronome'].map(x)});
T('Transport-Seite: Reihenfolge Loop · Anfang · Play · Stopp · Klick (links→rechts)',o.every(v=>v!==null)&&o.every((v,i)=>i===0||v>o[i-1]),o);
T('Transport-Seite hat Positionsleiste wie Player/Startseite',await ev(()=>{const k=document.querySelector('#bottom-nav .td-seekhost .hd-seek');if(!k)return false;const r=k.getBoundingClientRect();return r.height>10&&r.width>200&&!!k.querySelector('input[type=range]')}));
T('Taste „Zum Anfang“ springt an den Anfang',await ev(async()=>{try{audioEngine.seek=(t)=>{window.__sk=t}}catch(e){}document.getElementById('btn-td-start').click();return window.__sk===0}));
// Höhe gleich in DAW / Player / Startseite
const hh=await ev(async()=>{const h={};h.daw=Math.round(document.getElementById('bottom-nav').getBoundingClientRect().height);Player.open();await new Promise(r=>setTimeout(r,500));h.pl=Math.round(document.getElementById('pl-dock').getBoundingClientRect().height);Player.close();Home.open();await new Promise(r=>setTimeout(r,700));h.hm=Math.round(document.getElementById('hm-dock').getBoundingClientRect().height);Home.close();return h});
T('Dockbars in DAW, Player und Startseite gleich hoch',Math.abs(hh.daw-hh.pl)<=1&&Math.abs(hh.daw-hh.hm)<=1,hh);
// Player + Startseite: halbe Seite rastet ein
await ev(()=>Player.open());await pg.waitForTimeout(500);
await half(pg,'#pl-dkscroll');s=await settled(pg,'#pl-dkscroll');T('Player-Dockbar: halb stehengebliebene Seite rastet von selbst ein',s.off<=2,s);
T('Player-Dockbar: alle Seiten außer der aktiven inert nach dem Einrasten',await ev(()=>{const n=+document.getElementById('pl-dkscroll').dataset.pane;return ['pl-dkp-ctl','pl-dkp-snd','pl-dkp-zt'].every((id,i)=>document.getElementById(id).hasAttribute('inert')===(i!==n))}));
await ev(()=>{Player.close();Home.open()});await pg.waitForTimeout(800);
await half(pg,'#hm-dkscroll');s=await settled(pg,'#hm-dkscroll');T('Startseiten-Dockbar: halb stehengebliebene Seite rastet von selbst ein',s.off<=2,s);
await ev(()=>Home.close());

// ---------- Punkt 6: Seiten der Fenster ----------
await pg.close();
pg=await mk(384,{'sunshine.fx':JSON.stringify({v:2,on:true,edge:'glow',full:'off',k:60,mode:'static'})});const e2=(f,a)=>pg.evaluate(f,a);
T('Rand-Effekte: Standard „nur unten“ für Fenster',await e2(()=>FX.sides()==='b'&&document.documentElement.getAttribute('data-fx-sides')==='b'));
T('Glühen unten: Fenster (Klang-/Spurfenster) leuchten nur unten',await e2(()=>{const w=document.querySelector('#drop-zone-wrapper > .bg-daw-panel');if(!w)return false;const sh=getComputedStyle(w,'::after').boxShadow;return /inset/.test(sh)&&!/rgba?\([^)]*\) 0px 0px 28px/.test(sh)}));
T('Kopfleiste und untere Leiste folgen ebenfalls den Seiten (1.46: kein voller Rand mehr)',await e2(()=>{const h=document.querySelector('header.sticky'),n=document.getElementById('bottom-nav');return h.classList.contains('fx-edge')&&n.classList.contains('fx-edge')&&!/0px 0px 28px/.test(getComputedStyle(h,'::after').boxShadow)&&!/0px 0px 28px/.test(getComputedStyle(n,'::after').boxShadow)}));
await e2(()=>FX.set({edge:'beam'},false));await pg.waitForTimeout(200);
T('Ring-Stile: Ausschnitt nur an den gewählten Seiten',await e2(()=>{const w=document.querySelector('#drop-zone-wrapper > .bg-daw-panel');const c=getComputedStyle(w,'::after').clipPath;return /polygon/.test(c)}));
await e2(()=>FX.set({sides:'trbl'},false));await pg.waitForTimeout(100);
T('Alle vier Seiten → Attribut entfällt, altes Aussehen',await e2(()=>!document.documentElement.hasAttribute('data-fx-sides')&&getComputedStyle(document.querySelector('#drop-zone-wrapper > .bg-daw-panel'),'::after').clipPath==='none'));
await e2(()=>FX.set({sides:'tl'},false));
T('Seiten Oben+Links → Attribut „t l“',await e2(()=>document.documentElement.getAttribute('data-fx-sides')==='t l'));
await e2(()=>FX.set({sides:''},false));T('Leere Auswahl fällt auf „unten“ zurück',await e2(()=>FX.sides()==='b'));
await e2(()=>FX.set({sides:'b',edge:'line'},false));await pg.waitForTimeout(100);
T('Linie: ohne „Oben“ wandert sie am unteren Rand',await e2(()=>{const a=getComputedStyle(document.querySelector('#drop-zone-wrapper > .bg-daw-panel'),'::after');return a.bottom==='0px'&&a.top!=='0px'}));
// Optionen: Reihe mit vier Tasten
await e2(()=>document.getElementById('btn-settings').click());await pg.waitForTimeout(500);
T('Optionen → Effekte: „Seiten der Fenster“ mit 4 Tasten',await e2(()=>document.querySelectorAll('#fx-sides-row [data-fx-side]').length===4&&document.querySelector('#fx-sides-row [data-fx-side=b]').getAttribute('aria-pressed')==='true'));
await e2(()=>document.querySelector('#fx-sides-row [data-fx-side=l]').click());await pg.waitForTimeout(150);
T('Taste „Links“ dazuschalten → Seiten „b l“ (Reihenfolge fest)',await e2(()=>FX.sides()==='bl'&&document.documentElement.getAttribute('data-fx-sides')==='b l'));
await e2(()=>{document.querySelector('#fx-sides-row [data-fx-side=l]').click();document.querySelector('#fx-sides-row [data-fx-side=b]').click()});await pg.waitForTimeout(150);
T('Letzte Seite lässt sich nicht abschalten',await e2(()=>FX.sides()==='b'));
await e2(()=>document.getElementById('settings-modal').querySelector('button[aria-label*="chließen"], [data-close], #btn-close-settings')&&0);

// ---------- 1.42: Seiten gelten überall ----------
await e2(()=>FX.set({edge:'glow',sides:'t'},false));await pg.waitForTimeout(250);
const topOnly=sel=>e2(s=>{const q=document.querySelector(s);if(!q||!q.classList.contains('fx-edge'))return 'kein fx-edge: '+s;const parts=getComputedStyle(q,'::after').boxShadow.split(/,(?![^(]*\))/).map(x=>x.trim()).filter(x=>!/^rgba\(0, 0, 0, 0\)/.test(x));if(!parts.length)return 'kein Schein: '+s;return parts.every(x=>{const m=x.match(/ (-?\d+)px (-?\d+)px/);return m&&+m[1]===0&&+m[2]>0})?'ok':'andere Seite: '+s+' '+parts.join(';')},sel);
for(const sel of ['header.sticky','#bottom-nav','#drop-zone-wrapper > .bg-daw-panel','#bw-launch .bw-lcard']){const r=await topOnly(sel);T('Nur „Oben“: '+sel+' leuchtet nur oben',r==='ok',r)}
await e2(()=>document.querySelector('[data-bw-open="midi"]').click());await pg.waitForTimeout(500);
T('Nur „Oben“: großes Werkzeug-Fenster trägt den Rand (ohne Flächen-Effekt)',await e2(()=>{const w=document.getElementById('bw-root');return w.classList.contains('fx-edge')&&getComputedStyle(w,'::before').display==='none'}));
await e2(()=>BigWin.close());await pg.waitForTimeout(300);
T('Dialoge ohne feste Kennung bekommen den Fenster-Rand (Overlay „fixed inset-0“)',await e2(async()=>{const o=document.createElement('div');o.className='fixed inset-0 z-[var(--z-dialog)] bg-black/70 flex items-center justify-center';o.innerHTML='<div class="w-72 h-40 bg-slate-900 rounded-2xl">x</div>';document.body.appendChild(o);await new Promise(r=>setTimeout(r,60));const ok=o.firstElementChild.classList.contains('fx-win');o.remove();return ok}));
T('Dialog (Optionen) mit „Oben“: Schein nur oben',await e2(()=>{document.getElementById('btn-settings').click();return new Promise(r=>setTimeout(()=>{const w=document.querySelector('#settings-modal .fx-win');const v=w?getComputedStyle(w):null;const parts=v?v.boxShadow.split(/,(?![^(]*\))/).map(x=>x.trim()).filter(x=>!/^rgba\(0, 0, 0, 0\)/.test(x)&&!/^rgba\(0, 0, 0, 0\.55\)/.test(x)):[];r(!!w&&parts.length>0&&parts.every(x=>{const m=x.match(/ (-?\d+)px (-?\d+)px/);return m&&+m[1]===0&&+m[2]<0}))},500))}));
await e2(()=>{const m=document.getElementById('settings-modal');const x=m&&m.querySelector('[data-close],#btn-close-settings,button[aria-label*="chließen"]');x&&x.click()});
await pg.close();
pg=await mk(384,{'sunshine.fx':JSON.stringify({v:2,on:true,edge:'glow',full:'off',k:60,mode:'static',sides:'t'})});
await pg.evaluate(()=>{Player.open()});await pg.waitForTimeout(700);await pg.evaluate(()=>document.getElementById('pl-root').classList.add('pl-has'));await pg.waitForTimeout(800);
T('Player: Kopfzeile, Klang-Fenster, Listenfenster und Dockbar tragen den Rand',await pg.evaluate(()=>['#pl-root .pl-top','#pl-root .pl-snd','#pl-root .pl-lh','#pl-root .pl-dock'].every(q=>{const e=document.querySelector(q);return e&&e.classList.contains('fx-edge')})));
T('Player mit „Oben“: Listenfenster leuchtet nur oben',await pg.evaluate(()=>{const parts=getComputedStyle(document.querySelector('#pl-root .pl-lh'),'::after').boxShadow.split(/,(?![^(]*\))/).map(x=>x.trim()).filter(x=>!/^rgba\(0, 0, 0, 0\)/.test(x));return parts.length>0&&parts.every(x=>{const m=x.match(/ (-?\d+)px (-?\d+)px/);return m&&+m[1]===0&&+m[2]>0})}));
await pg.close();
pg=await mk(384,{'sunshine.home':'on','sunshine.fx':JSON.stringify({v:2,on:true,edge:'glow',full:'off',k:60,mode:'static',sides:'t'})});
T('Startseite: Karten, „Neues Projekt“, leere Liste und Dockbar tragen den Rand',await pg.evaluate(()=>['#home-root .hm-cta','#home-root .hm-empty','#hm-dock'].every(q=>{const e=document.querySelector(q);return e&&e.classList.contains('fx-edge')})));

// ---------- Punkt 7: Player-Kopfzeile ----------
await pg.close();
pg=await mk(384);const e3=(f,a)=>pg.evaluate(f,a);
await e3(()=>{Player.open()});await pg.waitForTimeout(600);
await e3(()=>document.getElementById('pl-root').classList.add('pl-has'));
T('Player: Titel „Player“ mittig in der Kopfzeile',await e3(()=>{const h=document.querySelector('#pl-root .pl-top h2').getBoundingClientRect();return Math.abs((h.left+h.right)/2-innerWidth/2)<=2}));
T('Player: „+ Dateien“ nicht mehr oben, sondern im Listenfenster',await e3(()=>!document.querySelector('#pl-root .pl-top [data-pl=add]')&&!!document.querySelector('#pl-root .pl-lh [data-pl=add]')&&getComputedStyle(document.querySelector('#pl-root .pl-lh [data-pl=add]')).display!=='none'));
T('Player: Listenfenster ist eine Karte (Rahmen + Hintergrund) mit Zahl, Dateien und Aktionen',await e3(()=>{const l=document.querySelector('#pl-root .pl-lh');const c=getComputedStyle(l);return parseFloat(c.borderTopWidth)>=1&&l.querySelector('#pl-count')&&l.querySelectorAll('.pl-lhb .pl-link').length===3}));
T('Player: Kopfzeile ohne Überlauf',await e3(()=>{const t=document.querySelector('#pl-root .pl-top').getBoundingClientRect();return t.left>=0&&t.right<=innerWidth&&document.documentElement.scrollWidth<=innerWidth}));
T('Player: „+ Dateien“ öffnet weiterhin die Dateiauswahl',await e3(()=>{let hit=false;const o=HTMLInputElement.prototype.click;HTMLInputElement.prototype.click=function(){if(this.type==='file')hit=true};document.querySelector('#pl-root .pl-lh [data-pl=add]').click();HTMLInputElement.prototype.click=o;return hit}));
for(const th of ['aurora','neon','studio','liquid','classic']){await e3(t=>document.documentElement.setAttribute('data-theme',t),th);await pg.waitForTimeout(150);
 T('Player-Kopfzeile im Design „'+th+'“: Rahmen/Hintergrund gesetzt, Titel mittig',await e3(()=>{const t=document.querySelector('#pl-root .pl-top'),c=getComputedStyle(t),h=document.querySelector('#pl-root .pl-top h2').getBoundingClientRect();return c.backgroundImage!=='none'&&parseFloat(c.borderLeftWidth)>=1&&Math.abs((h.left+h.right)/2-innerWidth/2)<=2}))}
T('Keine JS-Fehler',pg.errs.length===0,pg.errs.slice(0,3));
console.log(`\n${ok} ok / ${bad} fail`);await b.close();srv.close();process.exit(bad?1:0)})();
