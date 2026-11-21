/* 1.40: Zentrale-Seite in allen Dockbars, Navigation, alte Knöpfe entfallen, Startseiten-Dock wischbar, Startansicht-Option */
const http=require('http'),fs=require('fs'),path=require('path'),cp=require('child_process');const {chromium}=require('playwright');
const WORK=process.argv[2];
const srv=http.createServer((q,r)=>{const f=path.join(WORK,decodeURIComponent(q.url.split('?')[0]).replace(/^\//,''));fs.readFile(f,(e,d)=>{if(e){r.writeHead(404);r.end();return;}r.writeHead(200,{'content-type':f.endsWith('.html')?'text/html':'application/octet-stream'});r.end(d)})});
let ok=0,bad=0;const T=(n,c,x)=>{if(c){ok++;console.log('PASS',n)}else{bad++;console.log('FAIL',n,x===undefined?'':JSON.stringify(x))}};
(async()=>{await new Promise(r=>srv.listen(0,'127.0.0.1',r));const port=srv.address().port;const b=await chromium.launch();
const mk=async(w,pre,keep)=>{const ctx=keep||await b.newContext({viewport:{width:w,height:854},isMobile:w<700,hasTouch:w<700});const pg=await ctx.newPage();pg.errs=[];pg.on('pageerror',e=>pg.errs.push(e.message));await pg.route(/^https?:\/\/(?!127\.0\.0\.1)/,r=>r.abort());
 await pg.addInitScript(p=>{try{if(!sessionStorage.__i){sessionStorage.__i=1;localStorage.setItem('sunshine.news','{"seen":"9.99"}');if(p)for(const k in p)localStorage.setItem(k,p[k])}}catch(e){}},pre===undefined?{'sunshine.home':'off'}:pre);
 await pg.goto(`http://127.0.0.1:${port}/index_ueberarbeitet.html`,{waitUntil:'load'});await pg.waitForTimeout(1000);return pg};
const swipe=async(pg,sel,dx)=>{const cdp=await pg.context().newCDPSession(pg);const r=await pg.evaluate(s=>{const e=document.querySelector(s).getBoundingClientRect();return {x:e.left+e.width/2,y:e.top+e.height/2}},sel);
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:r.x,y:r.y}]});for(let i=1;i<=12;i++){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:r.x+dx*i/12,y:r.y}]});await new Promise(a=>setTimeout(a,16))}await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await pg.waitForTimeout(500);await cdp.detach()};
const vis=(pg,sel)=>pg.evaluate(s=>{const e=document.querySelector(s);if(!e)return null;const c=getComputedStyle(e),r=e.getBoundingClientRect();return c.display!=='none'&&c.visibility!=='hidden'&&r.width>0&&r.height>0},sel);
const wavs=()=>{const FX='/tmp/zent_t';fs.rmSync(FX,{recursive:true,force:true});fs.mkdirSync(FX,{recursive:true});const o=[];for(let i=0;i<3;i++){const n='z'+i+'.wav';cp.execSync(`ffmpeg -y -loglevel error -f lavfi -i "sine=frequency=${300+i*90}:duration=20" -metadata title=Zent_${i} ${n}`,{cwd:FX});o.push(FX+'/'+n)}return o};

// ================= DAW (Handy)
{const pg=await mk(384);const ev=(f,a)=>pg.evaluate(f,a);
 const d=await ev(()=>{const sc=document.querySelector('#bottom-nav .td-scroll');return {panes:sc?sc.querySelectorAll(':scope>.td-pane').length:0,zt:[...document.querySelectorAll('#bottom-nav .td-zt .zt-b')].map(b=>b.dataset.zt),cur:(document.querySelector('#bottom-nav .zt-b.on')||{}).dataset&&document.querySelector('#bottom-nav .zt-b.on').dataset.zt,sw:!!document.getElementById('btn-td-zt')&&!!document.getElementById('btn-td-back2'),dots:document.querySelectorAll('#btn-td-tp .td-dots i, #btn-td-back2 .td-dots i').length}});
 T('DAW-Leiste hat 3 Seiten (Transport · Bereiche · Zentrale) – keine Player-Seite mehr',d.panes===3,d);
 T('Zentrale in der DAW: 6 Tasten in fester Reihenfolge, „DAW“ markiert',JSON.stringify(d.zt)===JSON.stringify(['home','daw','player','fb','opts','help'])&&d.cur==='daw',d);
 T('Pfeil-Tasten zur Zentrale und zurück sind da (3 Punkte)',d.sw&&d.dots>=3,d);
 // Wischen bis zur Zentrale (2x) und zurück
 await ev(()=>document.querySelector('#bottom-nav .td-scroll').scrollLeft=0);await pg.waitForTimeout(200);
 for(let i=0;i<2;i++)await swipe(pg,'#bottom-nav .td-scroll',-260);
 T('Zweimal nach links wischen → Zentrale-Seite',await ev(()=>{const s=document.querySelector('#bottom-nav .td-scroll');return Math.round(s.scrollLeft/s.clientWidth)===2&&document.getElementById('bottom-nav').dataset.pane==='zt'}));
 await ev(()=>document.getElementById('btn-td-back2').click());await pg.waitForTimeout(600);
 T('Pfeil links bringt zurück zu den Bereichen (Pfeile bleiben im Dokument bedienbar)',await ev(()=>document.getElementById('bottom-nav').dataset.pane==='tabs'));
 T('Keine Player-Steuerung in der DAW-Leiste',await ev(()=>!document.querySelector('#bottom-nav [data-hd=shuffle],#bottom-nav [data-hd=prev],#bottom-nav [data-hd=next]')));
 await ev(()=>document.getElementById('btn-td-zt').click());await pg.waitForTimeout(600);
 T('Pfeil rechts führt zur Zentrale',await ev(()=>document.getElementById('bottom-nav').dataset.pane==='zt'));
 // alte Menüpunkte entfallen
 await ev(()=>document.getElementById('btn-menu').click());await pg.waitForTimeout(300);
 const mv=await ev(()=>['#btn-home','#btn-player','#btn-feedback','#btn-settings','#btn-export-midi','#btn-project-settings'].map(s=>{const e=document.querySelector('#file-menu '+s);if(!e)return s+':fehlt';const c=getComputedStyle(e);return s+':'+(c.display==='none'?'weg':'da')}));
 T('☰-Menü: Startseite/Player/Feedback/Optionen entfallen (Zentrale ersetzt sie), .MID-Export & Projekt-Einstellungen bleiben',mv.slice(0,4).every(x=>/weg|fehlt/.test(x))&&mv.slice(4).every(x=>/da|fehlt/.test(x)),mv);
 await ev(()=>document.getElementById('btn-menu').click());await pg.waitForTimeout(200);
 // Navigation
 await ev(()=>document.querySelector('#bottom-nav [data-zt=player]').click());await pg.waitForTimeout(500);
 T('Zentrale → Player öffnet den Player',await ev(()=>Player.isOpen()&&!Home.isOpen()&&document.documentElement.classList.contains('pl-open')));
 T('Im Player: Zentrale-Seite ist die 3. Seite (keine DAW-Steuerung im Player); „Player“ markiert',await ev(()=>{const ids=[...document.querySelectorAll('#pl-dkscroll>.pl-dk-pane')].map(e=>e.id);return JSON.stringify(ids)===JSON.stringify(['pl-dkp-ctl','pl-dkp-snd','pl-dkp-zt'])&&!document.querySelector('#pl-root [data-hd=loop]')&&document.querySelector('#pl-dkp-zt .zt-b.on').dataset.zt==='player'}));
 await ev(()=>{document.getElementById('pl-dkscroll').scrollLeft=2*document.getElementById('pl-dkscroll').clientWidth});await pg.waitForTimeout(300);
 await ev(()=>document.querySelector('#pl-dkp-zt [data-zt=home]').click());await pg.waitForTimeout(700);
 T('Player-Zentrale → Startseite: Player zu, Startseite offen',await ev(()=>!Player.isOpen()&&Home.isOpen()&&document.documentElement.classList.contains('hm-open')&&!document.documentElement.classList.contains('pl-open')));
 await ev(()=>document.querySelector('#hm-dock [data-zt=daw]').click());await pg.waitForTimeout(600);
 T('Startseiten-Zentrale → DAW: beides zu',await ev(()=>!Player.isOpen()&&!Home.isOpen()&&!document.documentElement.classList.contains('hm-open')));
 await ev(()=>{const s=document.querySelector('#bottom-nav .td-scroll');s.scrollLeft=3*s.clientWidth});await pg.waitForTimeout(300);
 await ev(()=>document.querySelector('#bottom-nav [data-zt=fb]').click());await pg.waitForTimeout(500);
 T('Zentrale → Feedback öffnet das Feedback-Fenster',await ev(()=>!!document.getElementById('fb-root')&&!document.getElementById('fb-root').hidden));
 await pg.keyboard.press('Escape');await pg.waitForTimeout(300);
 await ev(()=>document.querySelector('#bottom-nav [data-zt=opts]').click());await pg.waitForTimeout(600);
 T('Zentrale → Optionen öffnet die Optionen',await ev(()=>!!document.getElementById('settings-modal')));
 await ev(()=>{const m=document.getElementById('settings-modal');if(m)m.remove()});
 await ev(()=>document.querySelector('#bottom-nav [data-zt=help]').click());await pg.waitForTimeout(600);
 T('Zentrale → Anleitung öffnet das Handbuch',await ev(()=>Help.manualOpen()));
 T('keine Skriptfehler (DAW-Zentrale)',pg.errs.length===0,pg.errs);await pg.context().close();}

// ================= Player
{const pg=await mk(384);const ev=(f,a)=>pg.evaluate(f,a);
 await ev(()=>Player.open());await pg.waitForTimeout(500);
 const o=await ev(()=>({close:getComputedStyle(document.querySelector('#pl-root [data-pl=close]')).display,fb:getComputedStyle(document.querySelector('#pl-root [data-pl=fb]')).display,opts:getComputedStyle(document.querySelector('#pl-root [data-pl=opts]')).display,add:getComputedStyle(document.querySelector('#pl-root .pl-lh [data-pl=add]')).display,top:!!document.querySelector('#pl-root .pl-top [data-pl=add]')}));
 T('Player: „Zurück“, Feedback- und Optionen-Knopf oben entfallen, „Dateien“ sitzt im Listenfenster',o.close==='none'&&o.fb==='none'&&o.opts==='none'&&o.add!=='none'&&!o.top,o);
 T('Player-Dock: 3 Punkte, erste Seite aktiv',await ev(()=>document.querySelectorAll('#pl-dkdots button').length===3&&document.querySelector('#pl-dkdots button.on').dataset.dk==='0'));
 await swipe(pg,'#pl-dkp-ctl .pl-ctl',-260);
 T('Player-Dock lässt sich auf der Tastenreihe wischen (→ Klang)',await ev(()=>document.getElementById('pl-dkscroll').dataset.pane==='1'));
 for(const sel of ['#pl-dkp-snd .pl-chips','#pl-dkp-zt .zt'])if(await ev(()=>document.getElementById('pl-dkscroll').dataset.pane)!=='2'){await ev(()=>{const k=document.getElementById('pl-dkscroll');k.style.scrollBehavior='auto'});await swipe(pg,sel,-300)}
 T('…weiter bis zur Zentrale (3. Seite)',await ev(()=>document.getElementById('pl-dkscroll').dataset.pane==='2'));
 await ev(()=>document.querySelector('#pl-dkdots [data-dk="0"]').click());await pg.waitForTimeout(700);
 await ev(()=>document.querySelector('#pl-dkdots [data-dk="2"]').click());await pg.waitForTimeout(700);
 T('Punkt antippen springt zur Zentrale',await ev(()=>document.getElementById('pl-dkscroll').dataset.pane==='2'));
 await ev(()=>document.querySelector('#pl-dkdots [data-dk="1"]').click());await pg.waitForTimeout(600);
 await ev(()=>document.querySelector('#pl-dkp-snd [data-pl-preset=techno]').click());await pg.waitForTimeout(300);
 T('Klang-Seite: Voreinstellung wählbar',await ev(()=>Player.settings().preset==='techno'));
 T('keine Skriptfehler (Player)',pg.errs.length===0,pg.errs);await pg.context().close();}

// ================= Startseite
{const pg=await mk(384);const ev=(f,a)=>pg.evaluate(f,a);
 await ev(()=>Home.open());await pg.waitForTimeout(700);
 const h=await ev(()=>({st:HmDock.state(),vis:['#hm-back','#hm-fb','#hm-help','#hm-opts','#hm-player'].map(s=>getComputedStyle(document.querySelector(s)).display),imp:getComputedStyle(document.querySelector('#hm-import')).display,dock:!!document.getElementById('hm-dock')&&!document.getElementById('hm-dock').hidden,bar:document.querySelector('#hm-dock').getBoundingClientRect().bottom,vh:innerHeight}));
 T('Startseite: Dockbar ist immer da; ohne Wiedergabe nur Klang + Zentrale, Start auf der Zentrale',h.dock&&JSON.stringify(h.st.panes)===JSON.stringify(['snd','zt'])&&h.st.pane==='zt'&&h.st.visible===false,h.st);
 T('Startseite: „Projekt“, Feedback, Anleitung, Optionen- und Player-Knopf entfallen; „Stems laden“ bleibt',h.vis.every(x=>x==='none')&&h.imp!=='none',h);
 T('Startseiten-Dock liegt bündig am unteren Rand',h.bar===h.vh,h);
 await ev(()=>HmDock.goPane('snd',true));await pg.waitForTimeout(300);
 await ev(()=>document.querySelector('#hm-dock [data-hm-preset=bass]').click());await pg.waitForTimeout(300);
 T('Startseite → Klang-Seite stellt „Mehr Bass“ ein (wirkt auch im Player)',await ev(()=>Player.settings().preset==='bass'&&document.querySelector('#hm-dock [data-hm-preset=bass]').classList.contains('on')));
 await ev(()=>Home.close());await pg.waitForTimeout(300);
 // Wiedergabe starten (Player) und Startseite öffnen
 await ev(()=>Player.open());await pg.waitForTimeout(300);await pg.setInputFiles('#pl-file',wavs());await pg.waitForTimeout(2500);
 await ev(()=>document.querySelector('#pl-list [data-pl-i="0"]').click());await pg.waitForTimeout(900);
 await ev(()=>{Player.close();Home.open()});await pg.waitForTimeout(1000);
 const p=await ev(()=>({st:HmDock.state(),ids:[...document.querySelectorAll('#hm-dkscroll>.zt-pane')].map(e=>e.className.replace('zt-pane','').trim())}));
 T('Läuft der Player: Seiten = Playbar · Klang · DAW-Steuerung · Zentrale, Start auf der Playbar',p.st.mode==='player'&&p.st.visible&&JSON.stringify(p.st.panes)===JSON.stringify(['play','snd','daw','zt'])&&p.st.pane==='play',p);
 await swipe(pg,'#hm-dkscroll .hd-ctl',-260);
 T('Startseiten-Dock lässt sich wischen (→ Klang)',await ev(()=>HmDock.state().pane==='snd'));
 await ev(()=>Player.pause&&Player.pause());
 T('keine Skriptfehler (Startseite)',pg.errs.length===0,pg.errs);await pg.context().close();}

// ================= Startansicht
{const ctx=await b.newContext({viewport:{width:384,height:854},isMobile:true,hasTouch:true});
 let pg=await mk(384,{},ctx);const ev=(f,a)=>pg.evaluate(f,a);
 T('Neu installiert (nichts gespeichert): Startseite beim Start',await ev(()=>Home.isOpen()&&Home.startView()==='home'));
 await ev(()=>Home.close());await pg.waitForTimeout(300);
 await ev(()=>document.getElementById('btn-settings').click());await pg.waitForTimeout(500);
 T('Optionen: „Beim Start öffnen“ mit 3 Auswahlfeldern, „Startseite“ gewählt',await ev(()=>document.querySelectorAll('#st-sec [data-sv]').length===3&&document.querySelector('#st-sec [data-sv=home]').getAttribute('aria-checked')==='true'));
 await ev(()=>document.querySelector('#st-sec [data-sv=daw]').click());await pg.waitForTimeout(200);
 T('„DAW“ wählen speichert und stellt den alten Schalter mit um',await ev(()=>localStorage.getItem('sunshine.start')==='daw'&&localStorage.getItem('sunshine.home')==='off'));
 await pg.close();
 // neuer Start (gleicher Speicher): keine Startseite
 const pg2=await ctx.newPage();pg2.errs=[];pg2.on('pageerror',e=>pg2.errs.push(e.message));await pg2.route(/^https?:\/\/(?!127\.0\.0\.1)/,r=>r.abort());await pg2.addInitScript(()=>{try{localStorage.setItem('sunshine.news','{"seen":"9.99"}')}catch(e){}});
 await pg2.goto(`http://127.0.0.1:${port}/index_ueberarbeitet.html`,{waitUntil:'load'});await pg2.waitForTimeout(1200);
 T('Start mit „DAW“: weder Startseite noch Player offen',await pg2.evaluate(()=>!Home.isOpen()&&!Player.isOpen()&&!document.documentElement.classList.contains('home-pending')));
 await pg2.evaluate(()=>Home.setStartView('player'));
 await pg2.reload({waitUntil:'load'});await pg2.waitForTimeout(1500);
 T('Start mit „Player“: Player ist offen, Startseite nicht',await pg2.evaluate(()=>Player.isOpen()&&!Home.isOpen()&&!document.documentElement.classList.contains('pl-pending')));
 await pg2.evaluate(()=>Player.close());
 await pg2.evaluate(()=>Home.setStartView('home'));
 await pg2.reload({waitUntil:'load'});await pg2.waitForTimeout(1200);
 T('Start mit „Startseite“: Startseite offen; Schalter „Beim Start anzeigen“ gesetzt',await pg2.evaluate(()=>Home.isOpen()&&document.getElementById('hm-auto').checked));
 T('Start mit „Startseite“: Zentrale-Seite sofort in der Dockbar (auch ohne vorheriges Öffnen)',await pg2.evaluate(()=>!!document.querySelector('#hm-dock [data-zt=help]')&&HmDock.state().pane==='zt'));
 await pg2.evaluate(()=>{const a=document.getElementById('hm-auto');a.checked=false;a.dispatchEvent(new Event('change'))});
 T('Schalter „Beim Start anzeigen“ aus → Startansicht DAW (alte Bedienung bleibt gültig)',await pg2.evaluate(()=>Home.startView()==='daw'&&localStorage.getItem('sunshine.home')==='off'));
 T('keine Skriptfehler (Startansicht)',pg2.errs.length===0,pg2.errs);await ctx.close();}
// Altbestand: nur „sunshine.home = off“ gespeichert → DAW
{const pg=await mk(384,{'sunshine.home':'off'});T('Altbestand (sunshine.home=off ohne Startansicht) → DAW',await pg.evaluate(()=>Home.startView()==='daw'&&!Home.isOpen()));await pg.context().close();}

// ================= Großer Bildschirm: DAW unverändert (kein Dock, Menüpunkte bleiben)
{const pg=await mk(1200);const ev=(f,a)=>pg.evaluate(f,a);
 T('Desktop: keine Dock-Seiten in der DAW',await ev(()=>!document.querySelector('#bottom-nav .td-scroll')));
 await ev(()=>document.getElementById('btn-menu').click());await pg.waitForTimeout(300);
 T('Desktop: ☰-Menü behält Startseite, Player, Feedback, Optionen',await ev(()=>['#btn-home','#btn-player','#btn-feedback','#btn-settings'].every(s=>{const e=document.querySelector('#file-menu '+s);return e&&getComputedStyle(e).display!=='none'})));
 await ev(()=>document.getElementById('btn-menu').click());
 await ev(()=>Player.open());await pg.waitForTimeout(500);
 T('Desktop: Player hat trotzdem die Zentrale (Navigation) – Zurück-Knopf entfällt',await ev(()=>!!document.querySelector('#pl-dkp-zt .zt-b')&&getComputedStyle(document.querySelector('#pl-root [data-pl=close]')).display==='none'));
 T('keine Skriptfehler (Desktop)',pg.errs.length===0,pg.errs);await pg.context().close();}

console.log('ERGEBNIS',ok,'bestanden',bad,'fehlgeschlagen');await b.close();srv.close();process.exit(bad?1:0)})();
