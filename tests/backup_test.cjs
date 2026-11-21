const http=require('http'),fs=require('fs'),path=require('path');const {chromium}=require('playwright');
const WORK=process.argv[2];const TW=fs.readFileSync(path.join(__dirname,'fixtures/tailwind.js'));
const srv=http.createServer((q,r)=>{const f=path.join(WORK,decodeURIComponent(q.url.split('?')[0]).replace(/^\//,''));fs.readFile(f,(e,d)=>{if(e){r.writeHead(404);r.end();return;}r.writeHead(200,{'content-type':f.endsWith('.html')?'text/html':'application/octet-stream'});r.end(d)})});
let ok=0,bad=0;const T=(n,c,x)=>{if(c){ok++;console.log('PASS',n)}else{bad++;console.log('FAIL',n,x||'')}};
const SHOT=path.join(__dirname,'../dist/_shots');
(async()=>{await new Promise(r=>srv.listen(0,'127.0.0.1',r));const port=srv.address().port;const b=await chromium.launch();
const mk=async()=>{const ctx=await b.newContext({viewport:{width:393,height:852},isMobile:true,hasTouch:true,acceptDownloads:true});const pg=await ctx.newPage();pg.errs=[];pg.on('pageerror',e=>pg.errs.push(e.message));pg.on('dialog',d=>d.accept());await pg.route(/^https?:\/\/(?!127\.0\.0\.1)/,r=>r.abort());await pg.addInitScript(()=>localStorage.setItem('sunshine.home','off'));await pg.goto(`http://127.0.0.1:${port}/index_ueberarbeitet.html`,{waitUntil:'load'});await pg.waitForTimeout(900);return pg};
// Testdaten wie ein echtes Projekt: verschachtelt, Float32-Audio, Blob, Date, Map, NaN, Feld "$t", out-of-line-Schlüssel
const SEED=async()=>{
 const open=(n,v,up)=>new Promise((res,rej)=>{const q=indexedDB.open(n,v);q.onupgradeneeded=()=>up(q.result);q.onsuccess=()=>res(q.result);q.onerror=()=>rej(q.error)});
 const put=(db,s,v,k)=>new Promise((res,rej)=>{const t=db.transaction(s,'readwrite');k===undefined?t.objectStore(s).put(v):t.objectStore(s).put(v,k);t.oncomplete=res;t.onerror=()=>rej(t.error)});
 const a=await open('SunshineRStemStudioProjects',1,d=>d.createObjectStore('projects',{keyPath:'id'}));
 const L=44100*2,ch=new Float32Array(L);for(let i=0;i<L;i++)ch[i]=Math.sin(i/37)*.5;
 await put(a,'projects',{id:'p1',name:'Song Ä',updatedAt:1700000000000,payload:{state:{bpm:144,tracks:[{id:1,color:'#fff',name:'Drums'}],nan:NaN,inf:Infinity,u:undefined,$t:'echt',d:new Date(1700000000123)},buffers:{t1:{sampleRate:44100,length:L,channels:[ch]}},blob:new Blob(['hallo'],{type:'text/plain'}),m:new Map([['a',1],[2,{x:1}]]),s:new Set([1,2,3]),ab:new Uint8Array([1,2,3]).buffer}});
 await put(a,'projects',{id:'p2',name:'Zwei',updatedAt:1700000100000,payload:{state:{bpm:90,tracks:[]},buffers:{}}});
 a.close();
 const h=await open('SunshineHome',1,d=>d.createObjectStore('idx',{keyPath:'id'}));await put(h,'idx',{id:'p1',meta:{bpm:144}});h.close();
 const s=await open('SunshineAutosave',1,d=>{d.createObjectStore('meta');d.createObjectStore('buf')});await put(s,'meta',{name:'Auto',savedAt:5},'current');await put(s,'buf',new Float32Array([1.5,2.5,3.5]),'t1');s.close();
 const x=await open('sunshine-soundfonts',1,d=>d.createObjectStore('sf',{keyPath:'id'}));await put(x,'sf',{id:'big',data:new Uint8Array(1000).buffer});x.close();
 localStorage.setItem('sunshine.fx','{"v":2,"on":true}');localStorage.setItem('fremd','nicht sichern');
};
const READ=async()=>{
 const open=n=>new Promise((res,rej)=>{const q=indexedDB.open(n);q.onsuccess=()=>res(q.result);q.onerror=()=>rej(q.error)});
 const get=(db,s,k)=>new Promise((res,rej)=>{const q=db.transaction(s).objectStore(s).get(k);q.onsuccess=()=>res(q.result);q.onerror=()=>rej(q.error)});
 const a=await open('SunshineRStemStudioProjects');const p1=await get(a,'projects','p1'),p2=await get(a,'projects','p2');a.close();
 const ch=p1.payload.buffers.t1.channels[0];let ok=ch instanceof Float32Array&&ch.length===88200;for(let i=0;i<88200&&ok;i+=997)if(Math.abs(ch[i]-Math.sin(i/37)*.5)>1e-6)ok=false;
 const bt=await p1.payload.blob.text();
 const h=await open('SunshineHome');const hi=await get(h,'idx','p1');h.close();
 const s=await open('SunshineAutosave');const me=await get(s,'meta','current'),bu=await get(s,'buf','t1');s.close();
 const st=p1.payload.state;
 return{name:p1.name,bpm:st.bpm,nan:Number.isNaN(st.nan),inf:st.inf===Infinity,hasU:('u' in st),t:st.$t,date:st.d instanceof Date&&st.d.getTime()===1700000000123,audio:ok,blob:bt,blobType:p1.payload.blob.type,map:p1.payload.m instanceof Map&&p1.payload.m.get('a')===1&&p1.payload.m.get(2).x===1,set:p1.payload.s instanceof Set&&p1.payload.s.size===3,ab:Array.from(new Uint8Array(p1.payload.ab)).join(),p2:p2&&p2.name,idx:hi&&hi.meta.bpm,meta:me&&me.name,buf:bu instanceof Float32Array&&Array.from(bu).join(),ls:localStorage.getItem('sunshine.fx'),fremd:localStorage.getItem('fremd')};
};
let pg=await mk();const ev=(f,a)=>pg.evaluate(f,a);
await ev(SEED);
const res=await ev(async()=>{const r=await Backup.make({});const ab=await r.blob.arrayBuffer();let s='';const u=new Uint8Array(ab);for(let i=0;i<u.length;i+=32768)s+=String.fromCharCode.apply(null,u.subarray(i,i+32768));return{b64:btoa(s),name:r.name,records:r.records,dbs:r.dbs,bytes:r.bytes,man:r.manifest}});
T('Sicherung erstellt: 3 Standard-Datenbanken (ohne SoundFonts), 5 Datensätze',res.dbs===3&&res.records===5&&!res.man.dbs.some(d=>/soundfonts/.test(d.name)),JSON.stringify([res.dbs,res.records,res.man.dbs.map(d=>d.name)]));
T('Dateiname Sunshine-Sicherung-YYYYMMDD-HHMM.zip',/^Sunshine-Sicherung-\d{8}-\d{4}\.zip$/.test(res.name),res.name);
T('Manifest: Format 1, Einstellungen sunshine.* ja, „fremd“ nein',res.man.format===1&&res.man.ls['sunshine.fx']&&!('fremd' in res.man.ls));
const all=await ev(async()=>{const r=await Backup.make({all:true});return{dbs:r.dbs}});T('„Auch große Zusatzdaten“: SoundFonts dabei (mind. 4 Datenbanken, Player-Sitzung zählt mit)',all.dbs>=4,JSON.stringify(all));
const zipOk=await ev(async b64=>{const bin=atob(b64),u=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)u[i]=bin.charCodeAt(i);await SunLazy.zip();const z=await JSZip.loadAsync(u);return{n:Object.keys(z.files).length,bin:Object.keys(z.files).filter(f=>f.startsWith('bin/')).length}},res.b64);
T('ZIP lesbar, Binärdaten (Audio, Blob, Buffer) liegen als eigene Dateien',zipOk.n>8&&zipOk.bin>=5,JSON.stringify(zipOk));
const orig=await ev(READ);
T('Ausgangsdaten vollständig lesbar (Selbsttest)',orig.audio&&orig.blob==='hallo'&&orig.map&&orig.date&&orig.nan,JSON.stringify(orig));
await pg.context().close();
// ---- Neues Gerät: leerer Speicher → Wiederherstellen
pg=await mk();
T('Neues Gerät: noch keine Projekt-Datenbank',await pg.evaluate(async()=>!(await indexedDB.databases()).some(d=>d.name==='SunshineRStemStudioProjects')));
const rr=await pg.evaluate(async b64=>{const bin=atob(b64),u=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)u[i]=bin.charCodeAt(i);const f=new File([u],'s.zip');const ins=await Backup.inspect(f);const r=await Backup.restore(f);return{r,ins:ins.man.records}},res.b64);
T('Wiederherstellen: 5 Datensätze, 3 Datenbanken, Einstellungen',rr.r.records===5&&rr.r.dbs===3&&rr.r.settings>=1,JSON.stringify(rr));
const back=await pg.evaluate(READ);
const diffs=Object.keys(orig).filter(k=>k!=='fremd'&&JSON.stringify(orig[k])!==JSON.stringify(back[k]));
T('Alle Werte identisch nach Wiederherstellung (Float32-Audio, Blob, Date, Map, Set, NaN, Feld „$t“, out-of-line-Schlüssel, Einstellungen)',diffs.length===0&&back.fremd===null,JSON.stringify(diffs.map(k=>[k,orig[k],back[k]])));
// ---- Zusammenführen: vorhandenes Projekt wird überschrieben, anderes bleibt
await pg.evaluate(async()=>{const o=await new Promise(r=>{const q=indexedDB.open('SunshineRStemStudioProjects');q.onsuccess=()=>r(q.result)});await new Promise(r=>{const t=o.transaction('projects','readwrite');t.objectStore('projects').put({id:'p2',name:'GEÄNDERT'});t.objectStore('projects').put({id:'p3',name:'Neu lokal'});t.oncomplete=r});o.close()});
await pg.evaluate(async b64=>{const bin=atob(b64),u=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)u[i]=bin.charCodeAt(i);await Backup.restore(new File([u],'s.zip'))},res.b64);
T('Zusammenführen: p2 zurück auf „Zwei“, lokales p3 bleibt',await pg.evaluate(async()=>{const o=await new Promise(r=>{const q=indexedDB.open('SunshineRStemStudioProjects');q.onsuccess=()=>r(q.result)});const g=k=>new Promise(r=>{const q=o.transaction('projects').objectStore('projects').get(k);q.onsuccess=()=>r(q.result)});const a=await g('p2'),c=await g('p3');o.close();return a.name==='Zwei'&&c&&c.name==='Neu lokal'}));
// ---- Fehlerfälle
const errs2=await pg.evaluate(async()=>{const o={};try{await Backup.restore(new File([new Uint8Array([1,2,3])],'x.zip'))}catch(e){o.junk=e.message}
 await SunLazy.zip();const z=new JSZip();z.file('hallo.txt','x');try{await Backup.restore(new File([await z.generateAsync({type:'uint8array'})],'y.zip'))}catch(e){o.nomf=e.message}
 const z2=new JSZip();z2.file('manifest.json',JSON.stringify({format:99,dbs:[]}));try{await Backup.restore(new File([await z2.generateAsync({type:'uint8array'})],'z.zip'))}catch(e){o.fmt=e.message}return o});
T('Fehlerfälle: kaputte Datei / kein Manifest / fremdes Format → klare Meldung',/ZIP/.test(errs2.junk)&&/manifest/.test(errs2.nomf)&&/format/i.test(errs2.fmt),JSON.stringify(errs2));
await pg.context().close();
// ---- Bedienung über Optionen: Sichern → Download, Wiederherstellen → Neuladen
pg=await mk();await pg.evaluate(SEED);
await pg.evaluate(()=>document.getElementById('btn-menu').click());await pg.waitForTimeout(200);await pg.evaluate(()=>document.getElementById('btn-settings').click());await pg.waitForTimeout(500);
await pg.evaluate(()=>document.getElementById('up-sec').scrollIntoView());
const [dl]=await Promise.all([pg.waitForEvent('download',{timeout:20000}),pg.evaluate(()=>document.querySelector('[data-bk-make]').click())]);
const fp=await dl.path();const sz=fs.statSync(fp).size;
T('Optionen → „Alles sichern“ lädt eine ZIP herunter',/^Sunshine-Sicherung-.*\.zip$/.test(dl.suggestedFilename())&&sz>300000,dl.suggestedFilename()+' '+sz);
await pg.waitForTimeout(500);
T('Statusanzeige nennt Datensätze und Dateinamen',await pg.evaluate(()=>/Gesichert: 5 Datensätze aus 3 Datenbanken/.test(document.querySelector('[data-bk-out]').textContent)));
await pg.screenshot({path:path.join(SHOT,'bk_opt.png')});
const keepZip=fs.readFileSync(fp);await pg.context().close();
pg=await mk();await pg.evaluate(()=>document.getElementById('btn-menu').click());await pg.waitForTimeout(200);await pg.evaluate(()=>document.getElementById('btn-settings').click());await pg.waitForTimeout(500);
const zp=path.join(__dirname,'../dist/_shots/_restore.zip');fs.writeFileSync(zp,keepZip);
const nav=pg.waitForNavigation({timeout:15000});
await pg.setInputFiles('[data-bk-file]',zp);await nav;await pg.waitForTimeout(800);
const back2=await pg.evaluate(READ);
T('Optionen → Wiederherstellen (Datei wählen, bestätigen) → App lädt neu, Daten da',back2.audio&&back2.name==='Song Ä'&&back2.blob==='hallo'&&back2.p2==='Zwei',JSON.stringify(back2).slice(0,200));
T('Nach dem Neuladen zeigt die Startseiten-Liste die Projekte (Home liest Datenbank)',await pg.evaluate(async()=>{Home.open();await new Promise(r=>setTimeout(r,800));const n=document.querySelectorAll('#hm-list .hm-item').length;Home.close();return n>=2}));
const si=await pg.evaluate(()=>Backup.storageInfo());T('Speicher-Info (Nutzung/Quota)',typeof si.usage==='number'&&typeof si.quota==='number');
T('Keine JS-Fehler',pg.errs.length===0,pg.errs.join('|'));
console.log(`\n${ok} ok / ${bad} fail`);await b.close();srv.close();process.exit(bad?1:0)})();
