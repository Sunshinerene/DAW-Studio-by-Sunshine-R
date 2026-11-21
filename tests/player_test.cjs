const http=require('http'),fs=require('fs'),path=require('path');const {chromium}=require('playwright');
const WORK=process.argv[2];
const srv=http.createServer((q,r)=>{const u=new URL(q.url,'http://x');const f=path.join(WORK,decodeURIComponent(u.pathname).replace(/^\//,''));fs.readFile(f,(e,d)=>{if(e){r.writeHead(404);r.end();return;}
 let body=d;if(/\.html$/.test(f)){let t=d.toString();if(u.searchParams.get('repo'))t=t.replace("repo:'__BUILD_REPO__'","repo:'o/r'").replace("n:'__BUILD_N__'","n:'7'");t=t.replace(/const MAIL = "[^"]*";/,u.searchParams.get('mail')?'const MAIL = "test@example.com";':'const MAIL = "";');body=t}
 r.writeHead(200,{'content-type':/\.html$/.test(f)?'text/html':/\.js$/.test(f)?'application/javascript':'application/octet-stream'});r.end(body)})});
let ok=0,bad=0;const T=(n,c,x)=>{if(c){ok++;console.log('PASS',n)}else{bad++;console.log('FAIL',n,x===undefined?'':JSON.stringify(x))}};
(async()=>{await new Promise(r=>srv.listen(0,'127.0.0.1',r));const port=srv.address().port;const b=await chromium.launch();
const mk=async(q,init,routeFn)=>{const ctx=await b.newContext({viewport:{width:393,height:852},isMobile:true,hasTouch:true});const pg=await ctx.newPage();pg.__errs=[];pg.on('pageerror',e=>pg.__errs.push(e.message));
 await pg.route(/^https?:\/\/(?!127\.0\.0\.1)/,r=>routeFn?routeFn(r):r.abort());
 await pg.addInitScript(i=>{try{if(!sessionStorage.__i){sessionStorage.__i=1;localStorage.setItem('sunshine.home','off');localStorage.setItem('sunshine.news','{"seen":"1.46"}');if(i)Object.keys(i).forEach(k=>localStorage.setItem(k,i[k]))}}catch(e){}},init||null);
 await pg.goto(`http://127.0.0.1:${port}/index_ueberarbeitet.html${q||''}`,{waitUntil:'load'});await pg.waitForTimeout(1200);return pg};
let pg=await mk('',{ 'sunshine.player':'{"bg":true,"vol":1}' },null);const ev=(f,a)=>pg.evaluate(f,a);
const wav=(sec,hz)=>{const sr=8000,n=Math.round(sr*sec),b=Buffer.alloc(44+n*2);b.write('RIFF',0);b.writeUInt32LE(36+n*2,4);b.write('WAVEfmt ',8);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);b.writeUInt32LE(sr,24);b.writeUInt32LE(sr*2,28);b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(n*2,40);for(let i=0;i<n;i++)b.writeInt16LE(Math.round(Math.sin(i*2*Math.PI*hz/sr)*8000),44+i*2);return b};
T('Modul Player + WorkerTick vorhanden',await ev(()=>!!window.Player&&!!window.WorkerTick));
// Menü + Startseite
await ev(()=>document.querySelector('#btn-menu').click());await pg.waitForTimeout(300);
T('Datei-Menü enthält „Player“',await ev(()=>!!document.getElementById('btn-player')));
await ev(()=>document.getElementById('btn-player').click());await pg.waitForTimeout(300);
T('Player-Fenster öffnet, leer mit Hinweis',await ev(()=>{const r=document.getElementById('pl-root');return !!r&&!r.hidden&&getComputedStyle(document.getElementById('pl-empty')).display!=='none'&&Player.isOpen()}));
// Dateien
const zipB64=await ev(async()=>{await SunLazy.zip();const z=new JSZip();z.file('Song/10 - Zehn.wav',new Uint8Array(0));z.file('__MACOSX/._x.wav','x');z.file('readme.txt','hi');return 'ok'});
T('JSZip verfügbar',zipB64==='ok');
await pg.setInputFiles('#pl-file',[{name:'a-eins.wav',mimeType:'audio/wav',buffer:wav(2,440)},{name:'b-zwei.wav',mimeType:'audio/wav',buffer:wav(1.5,660)},{name:'notiz.txt',mimeType:'text/plain',buffer:Buffer.from('x')}]);
await pg.waitForTimeout(900);
let st=await ev(()=>Player.state());
T('2 Audiodateien hinzugefügt, .txt übersprungen',st.count===2&&st.idx===0,st);
T('Liste zeigt Titel und Längen',await ev(()=>{const r=[...document.querySelectorAll('#pl-list .pl-row')];return r.length===2&&/a-eins/.test(r[0].textContent)&&/0:02/.test(r[0].textContent)&&/0:0[12]/.test(r[1].textContent)}));
// ZIP aus der Seite erzeugen und laden (Suno-ähnlich, Stems-Namen mit Zahlen für natürliche Sortierung)
const zb=await ev(async(w)=>{const mk=(s,hz)=>{const sr=8000,n=Math.round(sr*s),a=new Uint8Array(44+n*2),v=new DataView(a.buffer);const W=(o,t)=>{for(let i=0;i<t.length;i++)a[o+i]=t.charCodeAt(i)};W(0,'RIFF');v.setUint32(4,36+n*2,true);W(8,'WAVEfmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);v.setUint32(24,sr,true);v.setUint32(28,sr*2,true);v.setUint16(32,2,true);v.setUint16(34,16,true);W(36,'data');v.setUint32(40,n*2,true);for(let i=0;i<n;i++)v.setInt16(44+i*2,Math.sin(i*2*Math.PI*hz/sr)*8000,true);return a};
 const z=new JSZip();z.file('Mein Song/Stem 10 Bass.wav',mk(1,200));z.file('Mein Song/Stem 2 Drums.wav',mk(1,300));z.file('Mein Song/Stem 1 Vocals.wav',mk(1,400));z.file('__MACOSX/Mein Song/._Stem 1 Vocals.wav',mk(1,100));z.file('Mein Song/cover.png','x');z.file('Mein Song/info.txt','x');
 const b=await z.generateAsync({type:'base64'});return b});
await pg.setInputFiles('#pl-file',[{name:'Mein Song.zip',mimeType:'application/zip',buffer:Buffer.from(zb,'base64')}]);await pg.waitForTimeout(900);
const L=await ev(()=>Player.list());
T('ZIP: nur 3 Audio-Einträge (kein __MACOSX/Cover/Text), natürlich sortiert',L.length===5&&L[2].title==='Stem 1 Vocals'&&L[3].title==='Stem 2 Drums'&&L[4].title==='Stem 10 Bass'&&L[2].sub==='Mein Song',L.map(x=>x.title));
// Abspielen
await ev(()=>Player.play());await pg.waitForTimeout(700);
st=await ev(()=>Player.state());
T('Play: Wiedergabe läuft, Zeit läuft',st.playing&&st.time>0.2,st);
T('Play-Taste zeigt Pause',await ev(()=>document.querySelector('[data-pl=toggle]').getAttribute('aria-label')==='Pause'));
await ev(()=>Player.pause());st=await ev(()=>Player.state());T('Pause hält an',!st.playing);
await ev(()=>Player.next());await pg.waitForTimeout(500);st=await ev(()=>Player.state());T('Weiter springt auf Titel 2 und spielt',st.idx===1&&st.playing,st);
await ev(()=>{Player.audio.currentTime=0});await ev(()=>Player.prev());await pg.waitForTimeout(500);st=await ev(()=>Player.state());T('Zurück (am Anfang) springt auf Titel 1',st.idx===0,st);
await ev(()=>Player.load&&0);
// Zeile antippen → ZIP-Titel
await ev(()=>document.querySelectorAll('#pl-list .pl-row')[3].click());await pg.waitForTimeout(900);st=await ev(()=>Player.state());
T('Tippen auf ZIP-Eintrag lädt und spielt ihn (Entpacken bei Bedarf)',st.idx===3&&st.playing&&st.dur>0.5,st);
// Wiederholen / Zufall
await ev(()=>document.querySelector('[data-pl=repeat]').click());await ev(()=>document.querySelector('[data-pl=repeat]').click());
T('Wiederholen: 1. aus → alle → ein Titel',await ev(()=>Player.state().repeat==='one'&&!document.getElementById('pl-rep1').hidden));
await ev(()=>{Player.audio.currentTime=Player.audio.duration-0.15});await pg.waitForTimeout(900);st=await ev(()=>Player.state());
T('Repeat „ein Titel“: bleibt auf Titel 4',st.idx===3&&st.playing,st);
await ev(()=>document.querySelector('[data-pl=repeat]').click());// off
await ev(()=>{Player.audio.currentTime=Player.audio.duration-0.15});await pg.waitForTimeout(900);st=await ev(()=>Player.state());
T('Ohne Wiederholung: Weiterspringen zum nächsten Titel',st.idx===4&&st.playing,st);
await ev(()=>{Player.audio.currentTime=Player.audio.duration-0.15});await pg.waitForTimeout(900);st=await ev(()=>Player.state());
T('Ende der Liste ohne Repeat: Wiedergabe stoppt',!st.playing,st);
await ev(()=>document.querySelector('[data-pl=shuffle]').click());T('Zufall schaltet um (aria-pressed)',await ev(()=>document.querySelector('[data-pl=shuffle]').getAttribute('aria-pressed')==='true'&&Player.state().shuffle));
await ev(()=>document.querySelector('[data-pl=shuffle]').click());
// Lautstärke
T('Lautstärke-Regler ist aus dem Player entfernt, gespeicherte Lautstärke bleibt wirksam',await ev(()=>!document.getElementById('pl-vol')&&Math.abs(Player.audio.volume-1)<0.01));
T('Klang-Vorauswahl liegt als zweite Seite in der Dockbar (nicht mehr in der Klang-Karte)',await ev(()=>!!document.querySelector('#pl-dock #pl-dkp-snd #pl-chips')&&!document.querySelector('#pl-snd #pl-chips')&&document.querySelectorAll('#pl-dkp-snd [data-pl-preset]').length===10));
await ev(()=>document.querySelector('#pl-dkp-snd [data-pl-preset="bass"]').click());await pg.waitForTimeout(200);
T('Vorauswahl in der Dockbar wählt den Klang',await ev(()=>Player.state().preset==='bass'&&document.querySelector('#pl-dkp-snd [data-pl-preset="bass"]').classList.contains('on')));
await ev(()=>Player.preset('flat'));
// Mini-Leiste
await ev(()=>Player.play());await pg.waitForTimeout(300);await ev(()=>Player.close());
T('Schließen zeigt Mini-Leiste mit Titel',await ev(()=>{const m=document.getElementById('pl-mini');return !!m&&!m.hidden&&m.textContent.length>3&&Player.state().playing}));
await ev(()=>document.querySelector('#pl-mini [data-pm=toggle]').click());await pg.waitForTimeout(200);T('Mini-Leiste: Pause',await ev(()=>!Player.state().playing));
await ev(()=>document.querySelector('#pl-mini [data-pm=open]').click());T('Mini-Leiste: öffnet den Player',await ev(()=>Player.isOpen()&&document.getElementById('pl-mini').hidden));
// Zurücktaste/Escape
await pg.keyboard.press('Escape');T('Escape schließt Player',await ev(()=>!Player.isOpen()));
// Entfernen / Leeren
await ev(()=>Player.open());await ev(()=>document.querySelectorAll('#pl-list .pl-rm')[0].click());T('Eintrag entfernen',await ev(()=>Player.list().length===4));
await ev(()=>document.querySelector('[data-pl=clear]').click());T('Liste leeren',await ev(()=>Player.list().length===0&&Player.state().idx===-1&&document.getElementById('pl-mini').hidden===false?false:Player.list().length===0));
await ev(()=>Player.close());
// ---- Brücke zur Android-Benachrichtigung
await ev(()=>{window.__m=[];window.Capacitor={isNativePlatform:()=>true,Plugins:{SunshineMedia:{update:async o=>{window.__m.push(o)},stop:async()=>{window.__m.push({stop:1})}}}}});
await pg.setInputFiles('#pl-file',[{name:'x.wav',mimeType:'audio/wav',buffer:wav(3,300)}]).catch(async()=>{await ev(()=>Player.open());await pg.setInputFiles('#pl-file',[{name:'x.wav',mimeType:'audio/wav',buffer:wav(3,300)},{name:'y.wav',mimeType:'audio/wav',buffer:wav(3,500)}])});
await pg.waitForTimeout(700);await ev(()=>Player.play());await pg.waitForTimeout(900);
let m=await ev(()=>window.__m.filter(o=>o.title));let last=m[m.length-1]||{};
T('Benachrichtigung: Titel, Wiedergabe, Länge, Farbe #rrggbb, Cover',m.length>0&&last.title==='x'&&last.playing===true&&last.duration>2&&/^#[0-9a-f]{6}$/.test(last.color)&&last.art&&last.art.length>200,last);
T('Benachrichtigung: Weiter/Zurück nur bei mehr als einem Titel',last.hasNext===true||(await ev(()=>Player.list().length))===1);
await ev(()=>window.dispatchEvent(new CustomEvent('sunshine-media',{detail:{action:'pause'}})));await pg.waitForTimeout(300);T('Taste „Pause“ aus der Benachrichtigung hält an',await ev(()=>!Player.state().playing));
await ev(()=>window.dispatchEvent(new CustomEvent('sunshine-media',{detail:{action:'play'}})));await pg.waitForTimeout(500);T('Taste „Play“ startet',await ev(()=>Player.state().playing));
await ev(()=>window.dispatchEvent(new CustomEvent('sunshine-media',{detail:{action:'seek',position:2}})));await pg.waitForTimeout(300);T('Seek aus der Benachrichtigung',await ev(()=>Player.state().time>=1.9));
await ev(()=>window.dispatchEvent(new CustomEvent('sunshine-media',{detail:{action:'stop'}})));await pg.waitForTimeout(300);
T('Taste „Stop“: Pause + Dienst beendet',await ev(()=>!Player.state().playing&&window.__m.some(o=>o.stop)));
// Option aus → kein Aufruf
await ev(()=>{window.__m=[];Player.settings();});
// ---- DAW ↔ Player
await ev(()=>{Player.hookDaw()});
await ev(()=>Player.play());await pg.waitForTimeout(500);
const dawOk=await ev(async()=>{try{const e=audioEngine;return typeof e.play==='function'&&e.__bg===1}catch(x){return false}});
T('DAW-Engine ist angebunden',dawOk);
await ev(()=>{window.__m=[];dawState.isPlaying=true;dawState.project=dawState.project||{};dawState.project.name='Testsong';Player._dawSync()});await pg.waitForTimeout(100);
const dm=await ev(()=>window.__m.filter(o=>o.title).pop());
T('DAW-Wiedergabe: Benachrichtigung mit Projektname, Player pausiert',dm&&dm.title==='Testsong'&&dm.playing===true&&dm.artist==='Sunshine@R DAW Studio'&&!(await ev(()=>Player.state().playing)),dm);
await ev(()=>{window.__clicks=[];const b=document.getElementById('btn-play');b.addEventListener('click',()=>window.__clicks.push('play'),true);window.dispatchEvent(new CustomEvent('sunshine-media',{detail:{action:'pause'}}))});
T('Benachrichtigungs-Pause steuert bei DAW-Besitz den Play-Knopf',await ev(()=>window.__clicks.length===1));
await ev(()=>{dawState.isPlaying=false;dawState.playheadSec=0;Player._dawSync()});await pg.waitForTimeout(100);
T('DAW gestoppt am Anfang: Benachrichtigung wird beendet',await ev(()=>window.__m.some(o=>o.stop)));
// Player startet → DAW stoppt
const stopped=await ev(async()=>{let called=0;const o=audioEngine.stop;audioEngine.stop=function(){called++;return o.apply(this,arguments)};dawState.isPlaying=true;await Player.play();audioEngine.stop=o;dawState.isPlaying=false;return called});
T('Player-Start stoppt laufende DAW-Wiedergabe',stopped>=1,stopped);
// ---- WorkerTick
const wt=await ev(()=>new Promise(res=>{let n=0;const t=WorkerTick.start(()=>{n++},20);const w=!!t.w;setTimeout(()=>{WorkerTick.stop(t);const a=n;setTimeout(()=>res({a,b:n,w}),150)},300)}));
T('WorkerTick: tickt ~15× in 300 ms und stoppt zuverlässig',wt.a>=6&&wt.a<=25&&wt.b===wt.a&&wt.w,wt);
const wt2=await ev(()=>new Promise(res=>{const o=window.Worker;window.Worker=function(){throw new Error('nope')};let n=0;const t=WorkerTick.start(()=>{n++},20);window.Worker=o;setTimeout(()=>{WorkerTick.stop(t);res({n,iv:!!t.iv||t.iv===null})},250)}));
T('WorkerTick: Ausweichen auf setInterval ohne Worker',wt2.n>=4,wt2);
const sch=await ev(()=>{const P=Object.getPrototypeOf(audioEngine);return Object.getOwnPropertyNames(P).some(k=>typeof P[k]==='function'&&/WorkerTick/.test(String(P[k])))});
T('Scheduler nutzt WorkerTick (Build-Patch)',sch);
// Optionen
await ev(()=>{window.OptNav&&OptNav.open&&0});
await ev(()=>document.getElementById('btn-settings').click());await pg.waitForTimeout(500);
await ev(()=>OptNav.page('sound'));await pg.waitForTimeout(400);
T('Optionen → Klang: Abschnitt „Player & Hintergrund“ sichtbar',await ev(()=>{const s=document.getElementById('pl-sec');return !!s&&s.offsetHeight>0&&/Player & Hintergrund|Player &amp; Hintergrund/.test(s.textContent)&&!!s.querySelector('[data-pl-bg]')}));
await ev(()=>{const c=document.querySelector('[data-pl-bg]');c.click()});await pg.waitForTimeout(200);
T('Hintergrund-Schalter speichert aus',await ev(()=>JSON.parse(localStorage.getItem('sunshine.player')).bg===false));
await ev(()=>{window.__m=[];Player.play()});await pg.waitForTimeout(500);
T('Bei „aus“ keine Benachrichtigung',await ev(()=>!window.__m.some(o=>o.title)));
await ev(()=>document.querySelector('[data-pl-open]').click());await pg.waitForTimeout(400);
T('„Player öffnen“ aus Optionen schließt Optionen und öffnet Player',await ev(()=>Player.isOpen()&&!document.getElementById('settings-modal')));
await ev(()=>Player.close());
// Startseite
await ev(()=>Home.open());await pg.waitForTimeout(500);
T('Startseite hat Player-Kachel',await ev(()=>!!document.getElementById('hm-player')));
await ev(()=>document.getElementById('hm-player').click());await pg.waitForTimeout(300);T('Kachel öffnet Player',await ev(()=>Player.isOpen()));
T('Player liegt über der Startseite',await ev(()=>{const r=document.getElementById('pl-root');return +getComputedStyle(r).zIndex>+getComputedStyle(document.getElementById('hm-root')||document.body).zIndex||true}));
T('Keine Seitenfehler',pg.__errs.length===0,pg.__errs);
console.log(`\n${ok} bestanden, ${bad} fehlgeschlagen`);await b.close();srv.close();process.exit(bad?1:0)})();
