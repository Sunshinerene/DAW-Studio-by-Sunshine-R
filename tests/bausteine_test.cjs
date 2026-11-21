const http=require('http'),fs=require('fs'),path=require('path');const {chromium}=require('playwright');
const WORK=process.argv[2];const TW=fs.readFileSync(path.join(__dirname,'fixtures/tailwind.js'));
const srv=http.createServer((q,r)=>{const f=path.join(WORK,decodeURIComponent(q.url.split('?')[0]).replace(/^\//,''));fs.readFile(f,(e,d)=>{if(e){r.writeHead(404);r.end();return;}r.writeHead(200,{'content-type':f.endsWith('.html')?'text/html':'application/octet-stream'});r.end(d)})});
let ok=0,bad=0;const T=(n,c,x)=>{if(c){ok++;console.log('PASS',n)}else{bad++;console.log('FAIL',n,x||'')}};
(async()=>{await new Promise(r=>srv.listen(0,'127.0.0.1',r));const port=srv.address().port;const b=await chromium.launch();
const ctx=await b.newContext({viewport:{width:393,height:852},isMobile:true,hasTouch:true});await ctx.addInitScript(()=>{try{localStorage.setItem('sunshine.home','off')}catch(_){}});const pg=await ctx.newPage();const errs=[];pg.on('pageerror',e=>errs.push(String(e.message||e)));
await pg.route(/cdn\.tailwindcss\.com/,r=>r.fulfill({status:200,contentType:'application/javascript',body:TW}));
await pg.route(/^https?:\/\/(?!127\.0\.0\.1|cdn\.tailwindcss\.com)/,r=>r.abort());
await pg.goto(`http://127.0.0.1:${port}/index_ueberarbeitet.html`,{waitUntil:'load'});await pg.waitForTimeout(1500);
const ev=(f,a)=>pg.evaluate(f,a);
// ---- SunUtil
T('Bausteine vorhanden (SunUtil, SunStore, SunIDB)',await ev(()=>!!window.SunUtil&&!!window.SunStore&&!!window.SunIDB));
T('esc: & < > " maskiert, null → leer',await ev(()=>SunUtil.esc('<a href="x">&</a>')==='&lt;a href=&quot;x&quot;&gt;&amp;&lt;/a&gt;'&&SunUtil.esc(null)===''&&SunUtil.esc(5)==='5'));
T("escQ: zusätzlich ' maskiert, esc nicht",await ev(()=>SunUtil.escQ("a'b")==='a&#39;b'&&SunUtil.esc("a'b")==="a'b"));
T('clamp',await ev(()=>SunUtil.clamp(5,0,3)===3&&SunUtil.clamp(-1,0,3)===0&&SunUtil.clamp(2,0,3)===2));
T('safe: gibt Ergebnis zurück, schluckt Fehler',await ev(()=>{const w=console.warn;let n=0;console.warn=()=>n++;const a=SunUtil.safe(()=>7),b=SunUtil.safe(()=>{throw new Error('x')});console.warn=w;return a===7&&b===undefined&&n===1}));
T('say: zeigt einen Toast, wirft nie',await ev(()=>{const c0=document.querySelectorAll('#toast-container > *').length;SunUtil.say('Hallo Test');return document.querySelectorAll('#toast-container > *').length>c0}));
// ---- SunStore
T('SunStore.merge: Standardwerte bleiben bei fehlendem/kaputtem Eintrag',await ev(()=>{localStorage.removeItem('t.k');const o={a:1};SunStore.merge(o,'t.k');localStorage.setItem('t.k','{kaputt');const p={a:2};SunStore.merge(p,'t.k');return o.a===1&&p.a===2}));
T('SunStore.save/merge: Rundlauf, Teilwerte überschreiben nur ihre Felder',await ev(()=>{SunStore.save('t.k',{a:9});const o={a:1,b:2};SunStore.merge(o,'t.k');return o.a===9&&o.b===2}));
T('SunStore.get/set/del/json',await ev(()=>{SunStore.set('t.s','x');const a=SunStore.get('t.s')==='x',b=SunStore.get('t.nix','d')==='d',c=SunStore.get('t.nix')===null;SunStore.del('t.s');SunStore.set('t.j','{"q":1}');const d=SunStore.json('t.j',0).q===1;SunStore.set('t.j','nix');const e=SunStore.json('t.j',5)===5;['t.k','t.j'].forEach(k=>localStorage.removeItem(k));return a&&b&&c&&d&&e&&SunStore.get('t.s')===null}));
T('SunStore bei gesperrtem Speicher: kein Fehler',await ev(()=>{const o=Storage.prototype.getItem,s=Storage.prototype.setItem;Storage.prototype.getItem=()=>{throw new Error('gesperrt')};Storage.prototype.setItem=()=>{throw new Error('gesperrt')};let r;try{r=[SunStore.get('x','d'),SunStore.set('x','1'),SunStore.save('x',{}),SunStore.json('x',3),SunStore.merge({a:1},'x').a]}catch(e){r=null}Storage.prototype.getItem=o;Storage.prototype.setItem=s;return !!r&&r[0]==='d'&&r[1]===false&&r[2]===false&&r[3]===3&&r[4]===1}));
// ---- SunIDB: Namen und Aufbau müssen exakt denen von 1.30 entsprechen (sonst würden alte Daten nicht gefunden)
const want={player:['sunshine-player',{kv:null}],stems:['SunshineStemCache',{stems:'id'}],autosave:['SunshineAutosave',{meta:null,buf:null}],projects:['SunshineRStemStudioProjects',{projects:'id'}],home:['SunshineHome',{idx:'id'}],fonts:['sunshine-soundfonts',{meta:'id',data:null}]};
T('SunIDB.DEFS: sechs Datenbanken mit den bisherigen Namen und Stores',await ev(w=>{const d=SunIDB.DEFS;return Object.keys(w).length===Object.keys(d).length&&Object.keys(w).every(k=>d[k]&&d[k].name===w[k][0]&&JSON.stringify(d[k].stores)===JSON.stringify(w[k][1]))},want));
for(const k of Object.keys(want)){
 const r=await ev(async k=>{const db=await SunIDB.open(k);const o={name:db.name,v:db.version,st:Array.from(db.objectStoreNames).sort(),kp:{}};o.st.forEach(s=>{o.kp[s]=db.transaction(s).objectStore(s).keyPath});return o},k);
 T('SunIDB.open('+k+'): '+want[k][0]+' v1, Stores und Schlüsselfelder wie bisher',r.name===want[k][0]&&r.v===1&&JSON.stringify(r.st)===JSON.stringify(Object.keys(want[k][1]).sort())&&r.st.every(s=>(r.kp[s]||null)===want[k][1][s]),JSON.stringify(r));
}
T('SunIDB.open: zweiter Aufruf liefert dieselbe Verbindung',await ev(async()=>(await SunIDB.open('home'))===(await SunIDB.open('home'))));
T('SunIDB: unbekannte Datenbank → Fehler, nichts zwischengespeichert',await ev(async()=>{let e1=null;try{await SunIDB.open('gibtsnicht')}catch(e){e1=e}return !!e1&&/Unbekannte/.test(e1.message)}));
T('SunIDB.tx: schreiben/lesen/löschen über mehrere Stores (Autosave-Stil)',await ev(async()=>{await SunIDB.tx('autosave',['meta','buf'],'readwrite',(m,b)=>{m.put({x:1},'tk');b.put({y:2},'tb')});const a=await SunIDB.tx('autosave','meta','readonly',s=>s.get('tk'));const c=await SunIDB.tx('autosave','buf','readonly',s=>s.get('tb'));await SunIDB.tx('autosave',['meta','buf'],'readwrite',(m,b)=>{m.delete('tk');b.delete('tb')});const d=await SunIDB.tx('autosave','meta','readonly',s=>s.get('tk'));return a.x===1&&c.y===2&&d===undefined}));
T('SunIDB.tx: Fehler in fn wird als Ablehnung gemeldet',await ev(async()=>{try{await SunIDB.tx('home','idx','readwrite',()=>{throw new Error('boom')});return false}catch(e){return e.message==='boom'}}));
T('SunIDB.tx: keyPath-Store ohne Schlüssel → Fehler (wie bisher)',await ev(async()=>{try{await SunIDB.tx('home','idx','readwrite',s=>s.put({ohne:'id'}));return false}catch(e){return true}}));
// ---- Es darf keine zweite Kopie der Zugriffe mehr geben
const html=fs.readFileSync(path.join(WORK,'index_ueberarbeitet.html'),'utf8');
const stripped=html.replace(/<script type="text\/plain"[\s\S]*?<\/script>/g,'');
const opens=(stripped.match(/indexedDB\.open\(/g)||[]).length;
T('Direkte indexedDB.open-Aufrufe nur noch in SunIDB (1) und Sicherung/Wiederherstellung (4)',opens===5,String(opens));
{const c=r=>(stripped.match(r)||[]).length;const n={clamp:c(/const clamp = \(v, a, b\)/g),esc:c(/const esc = s =>/g),say:c(/const say = \(m, k\)/g),safe:c(/const safe = f =>/g)};
T('Eigene Kopien der Helfer nur noch dort, wo es Absicht ist (5 reine Rechenkerne, Optionsmenü-esc, Assistent-say, Startseiten-safe)',n.clamp<=5&&n.esc<=1&&n.say<=1&&n.safe<=1,JSON.stringify(n));}
T('Keine Seitenfehler beim Laden',errs.length===0,errs.join(' | ').slice(0,300));
console.log(`\nbausteine_test: ${ok} ok, ${bad} fehlgeschlagen`);await b.close();srv.close();process.exit(bad?1:0)})().catch(e=>{console.log('FAIL Absturz',e.message);process.exit(2)});
