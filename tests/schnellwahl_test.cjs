/* 1.45: Schnellwahl – nach oben wischen auf der Dockbar öffnet die sechs Zentrale-Tasten (DAW, Player, Startseite) */
const http=require('http'),fs=require('fs'),path=require('path');const {chromium}=require('playwright');
const WORK=process.argv[2];
const srv=http.createServer((q,r)=>{const f=path.join(WORK,decodeURIComponent(q.url.split('?')[0]).replace(/^\//,''));fs.readFile(f,(e,d)=>{if(e){r.writeHead(404);r.end();return;}r.writeHead(200,{'content-type':f.endsWith('.html')?'text/html':'application/octet-stream'});r.end(d)})});
let ok=0,bad=0;const T=(n,c,x)=>{if(c){ok++;console.log('PASS',n)}else{bad++;console.log('FAIL',n,x===undefined?'':JSON.stringify(x))}};
(async()=>{await new Promise(r=>srv.listen(0,'127.0.0.1',r));const port=srv.address().port;const b=await chromium.launch();
const mk=async(pre)=>{const ctx=await b.newContext({viewport:{width:393,height:854},isMobile:true,hasTouch:true});const pg=await ctx.newPage();pg.errs=[];pg.on('pageerror',e=>pg.errs.push(e.message));await pg.route(/^https?:\/\/(?!127\.0\.0\.1)/,r=>r.abort());
 await pg.addInitScript(p=>{try{if(!sessionStorage.__i){sessionStorage.__i=1;localStorage.setItem('sunshine.home','off');localStorage.setItem('sunshine.news','{"seen":"9.99"}');if(p)for(const k in p)localStorage.setItem(k,p[k])}}catch(e){}},pre||null);
 await pg.goto(`http://127.0.0.1:${port}/index_ueberarbeitet.html`,{waitUntil:'load'});await pg.waitForTimeout(1100);pg.cdp=await pg.context().newCDPSession(pg);return pg};
/* echte Touch-Geste über CDP: von (x,y) nach (x+dx,y+dy) in 8 Schritten */
const drag=async(pg,x,y,dx,dy)=>{const c=pg.cdp,t=(type,px,py)=>c.send('Input.dispatchTouchEvent',{type,touchPoints:type==='touchEnd'?[]:[{x:px,y:py}]});await t('touchStart',x,y);for(let i=1;i<=8;i++){await t('touchMove',x+dx*i/8,y+dy*i/8);await pg.waitForTimeout(16)}await t('touchEnd');await pg.waitForTimeout(250)};
const ctr=(pg,sel)=>pg.evaluate(s=>{const r=document.querySelector(s).getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2,t:r.top,l:r.left,w:r.width,h:r.height}},sel);
const open=pg=>pg.evaluate(()=>Zentrale.sheet.isOpen());
const tilesOf=pg=>pg.evaluate(()=>[...document.querySelectorAll('#zt-sheet .zt-b')].map(b=>b.dataset.zt).join(','));

/* ---------- DAW ---------- */
let pg=await mk();
T('DAW: Strich „Schnellwahl“ sichtbar über der Dockbar',await pg.evaluate(()=>{const g=document.getElementById('zt-grip'),n=document.getElementById('bottom-nav').getBoundingClientRect();if(!g||g.hidden)return false;const r=g.getBoundingClientRect();return Math.abs(r.top-n.top)<3&&Math.abs((r.left+r.right)/2-(n.left+n.right)/2)<3&&r.width>=44&&r.height>=14}));
T('Schnellwahl ist zu Beginn zu',!(await open(pg)));
let d=await ctr(pg,'#bottom-nav');
await drag(pg,d.x,d.y,0,-90);
T('DAW: Wisch nach oben auf der Leiste öffnet die Schnellwahl',await open(pg));
T('Sechs Tasten: Startseite · DAW · Player · Feedback · Optionen · Anleitung',(await tilesOf(pg))==='home,daw,player,fb,opts,help',await tilesOf(pg));
T('Fenster sitzt direkt über der Leiste, gleiche Breite, innerhalb des Bildschirms',await pg.evaluate(()=>{const c=document.querySelector('#zt-sheet .zts-card').getBoundingClientRect(),n=document.getElementById('bottom-nav').getBoundingClientRect();return c.bottom<=n.top+1&&n.top-c.bottom<24&&Math.abs(c.width-n.width)<2&&c.top>=0&&c.left>=0&&c.right<=innerWidth+1}));
T('Tasten groß genug zum Tippen (≥ 64 px hoch, ≥ 90 px breit)',await pg.evaluate(()=>[...document.querySelectorAll('#zt-sheet .zt-b')].every(b=>{const r=b.getBoundingClientRect();return r.height>=64&&r.width>=90})));
T('Eigene Ansicht (DAW) ist markiert',await pg.evaluate(()=>document.querySelector('#zt-sheet .zt-b.on').dataset.zt==='daw'));
T('Die Seite dahinter wurde beim Wischen nicht gescrollt',await pg.evaluate(()=>window.scrollY===0&&document.scrollingElement.scrollTop===0));
let c=await ctr(pg,'#zt-sheet .zts-card');
await drag(pg,c.x,c.t+20,0,90);
T('Nach unten wischen auf dem Fenster schließt es',!(await open(pg)));
await drag(pg,d.x,d.y,0,-90);await pg.evaluate(()=>0);
await pg.mouse.click(10,60);await pg.waitForTimeout(200);
T('Tippen neben das Fenster schließt es',!(await open(pg)));
await drag(pg,d.x,d.y,0,-90);
await pg.keyboard.press('Escape');await pg.waitForTimeout(150);
T('Esc schließt die Schnellwahl',!(await open(pg)));
await drag(pg,d.x,d.y,0,-90);
T('Android-Zurück schließt zuerst die Schnellwahl',await pg.evaluate(()=>{const r=window.__androidBack();return r===true&&!Zentrale.sheet.isOpen()}));
// Tippen auf den Strich
const g=await ctr(pg,'#zt-grip');await pg.touchscreen.tap(g.x,g.y+2);await pg.waitForTimeout(250);
T('Tipp auf den Strich öffnet die Schnellwahl',await open(pg));
await pg.touchscreen.tap(g.x,g.y+2);await pg.waitForTimeout(250);
T('…und ein zweiter Tipp schließt sie wieder',!(await open(pg)));
// waagerechtes Wischen blättert weiter, öffnet nichts
await drag(pg,d.x+80,d.y,-160,0);
T('Waagerecht wischen öffnet nichts (blättert nur)',!(await open(pg)));
// Positionsleiste: senkrechtes Wischen darauf öffnet nichts
const sl=await pg.evaluate(()=>{const s=document.querySelector('#bottom-nav input[type=range]');if(!s)return null;const r=s.getBoundingClientRect();return r.width>0?{x:r.left+r.width/2,y:r.top+r.height/2}:null});
if(sl){await drag(pg,sl.x,sl.y,0,-80);T('Senkrechtes Wischen auf der Positionsleiste öffnet nichts',!(await open(pg)))}
// Tasten: Player
await pg.evaluate(()=>TpDock.go('tp',true));await pg.waitForTimeout(300);
d=await ctr(pg,'#bottom-nav');await drag(pg,d.x,d.y,0,-90);
await pg.tap('#zt-sheet [data-zt="player"]');await pg.waitForTimeout(500);
T('Taste „Player“: Player öffnet, Schnellwahl schließt',await pg.evaluate(()=>Player.isOpen()&&!Zentrale.sheet.isOpen()));

/* ---------- Player ---------- */
T('Player: Strich sitzt über der Player-Leiste',await pg.evaluate(()=>{const g=document.getElementById('zt-grip'),n=document.getElementById('pl-dock').getBoundingClientRect();if(!g||g.hidden)return false;const r=g.getBoundingClientRect();return Math.abs(r.top-n.top)<3&&Math.abs((r.left+r.right)/2-(n.left+n.right)/2)<3}));
d=await ctr(pg,'#pl-dock');await drag(pg,d.x,d.y,0,-90);
T('Player: Wisch nach oben öffnet die Schnellwahl, „Player“ ist markiert',await open(pg)&&await pg.evaluate(()=>document.querySelector('#zt-sheet .zt-b.on').dataset.zt==='player'));
T('Player: Fenster über der Leiste und über dem Player (Ebene)',await pg.evaluate(()=>{const s=document.getElementById('zt-sheet'),p=document.getElementById('pl-root');return +getComputedStyle(s).zIndex>+getComputedStyle(p).zIndex}));
await pg.tap('#zt-sheet [data-zt="home"]');await pg.waitForTimeout(600);
T('Taste „Startseite“ aus dem Player: Startseite offen, Player zu',await pg.evaluate(()=>Home.isOpen()&&!Player.isOpen()&&!Zentrale.sheet.isOpen()));

/* ---------- Startseite ---------- */
T('Startseite: „by Sunshine@R“ steht unter dem Logo',await pg.evaluate(()=>{const e=document.querySelector('#home-root .hm-by');return !!e&&/by\s+Sunshine@R/.test(e.textContent)&&e.getBoundingClientRect().height>5}));
T('Startseite: Strich sitzt über der Startseiten-Leiste',await pg.evaluate(()=>{const g=document.getElementById('zt-grip'),n=document.getElementById('hm-dock').getBoundingClientRect();if(!g||g.hidden)return false;const r=g.getBoundingClientRect();return Math.abs(r.top-n.top)<3}));
d=await ctr(pg,'#hm-dock');await drag(pg,d.x,d.y,0,-90);
T('Startseite: Wisch nach oben öffnet die Schnellwahl, „Startseite“ ist markiert',await open(pg)&&await pg.evaluate(()=>document.querySelector('#zt-sheet .zt-b.on').dataset.zt==='home'));
await pg.tap('#zt-sheet [data-zt="daw"]');await pg.waitForTimeout(600);
T('Taste „DAW“ aus der Startseite: DAW vorn, Schnellwahl zu',await pg.evaluate(()=>!Home.isOpen()&&!Player.isOpen()&&!Zentrale.sheet.isOpen()));
// Optionen / Anleitung über die Schnellwahl
d=await ctr(pg,'#bottom-nav');await drag(pg,d.x,d.y,0,-90);
await pg.tap('#zt-sheet [data-zt="opts"]');await pg.waitForTimeout(700);
T('Taste „Optionen“ öffnet die Optionen und schließt die Schnellwahl',await pg.evaluate(()=>!!document.getElementById('settings-modal')&&!Zentrale.sheet.isOpen()));
T('Strich verschwindet, solange ein Fenster darüberliegt',await pg.evaluate(async()=>{await new Promise(r=>setTimeout(r,800));const g=document.getElementById('zt-grip');return g.hidden}));
await pg.evaluate(()=>{const m=document.getElementById('settings-modal');m&&m.remove()});await pg.waitForTimeout(800);
T('…und kommt zurück, wenn das Fenster zu ist',await pg.evaluate(()=>!document.getElementById('zt-grip').hidden));
T('Ohne Dockbar (breiter Bildschirm) kein Strich',await (async()=>{const p2=await mk();await p2.setViewportSize({width:1200,height:800});await p2.waitForTimeout(1200);const r=await p2.evaluate(()=>{const g=document.getElementById('zt-grip');return !g||g.hidden});await p2.context().close();return r})());
T('Keine JS-Fehler',pg.errs.length===0,pg.errs.slice(0,3));
console.log(`\n${ok} ok / ${bad} fail`);await b.close();srv.close();process.exit(bad?1:0)})();
