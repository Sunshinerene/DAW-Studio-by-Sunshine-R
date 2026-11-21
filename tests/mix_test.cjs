const http=require('http'),fs=require('fs'),path=require('path');const {chromium}=require('playwright');
const WORK=process.argv[2];const TW=fs.readFileSync(path.join(__dirname,'fixtures/tailwind.js'));
const srv=http.createServer((q,r)=>{const f=path.join(WORK,decodeURIComponent(q.url.split('?')[0]).replace(/^\//,''));fs.readFile(f,(e,d)=>{if(e){r.writeHead(404);r.end();return;}r.writeHead(200,{'content-type':f.endsWith('.html')?'text/html':'application/octet-stream'});r.end(d)})});
let ok=0,bad=0;const T=(n,c,x)=>{if(c){ok++;console.log('PASS',n)}else{bad++;console.log('FAIL',n,x||'')}};
(async()=>{await new Promise(r=>srv.listen(0,'127.0.0.1',r));const port=srv.address().port;const b=await chromium.launch();
const ctx=await b.newContext({viewport:{width:393,height:852},isMobile:true,hasTouch:true});await ctx.addInitScript(()=>{try{localStorage.setItem('sunshine.home','off')}catch(_){}});const pg=await ctx.newPage();const errs=[];pg.on('pageerror',e=>errs.push(e.message));
await pg.route(/cdn\.tailwindcss\.com/,r=>r.fulfill({status:200,contentType:'application/javascript',body:TW}));
await pg.route(/^https?:\/\/(?!127\.0\.0\.1|cdn\.tailwindcss\.com)/,r=>r.abort());
await pg.goto(`http://127.0.0.1:${port}/index_ueberarbeitet.html`,{waitUntil:'load'});await pg.waitForTimeout(1200);
const SHOT=path.join(__dirname,'../dist/_shots');const ev=(f,a)=>pg.evaluate(f,a);
T('AutoModel/Loudness geladen',await ev(()=>!!window.AutoModel&&!!window.Loudness));
// Knoten in der Spurkette
const nodes=await ev(async()=>{await audioEngine.ensureCtx();const sr=44100;const b=audioEngine.ctx.createBuffer(1,sr*50,sr),d=b.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=0.2*Math.sin(2*Math.PI*440*i/sr);
 const t=createTrack('audio','Ton');dawState.buffers[t.id]=b;window.__tid=t.id;audioEngine.ensureTrackNode(t);
 const i=document.getElementById('input-bpm');i.value=120;i.dispatchEvent(new Event('change',{bubbles:true}));
 const n=audioEngine.channelNodes[t.id];return [!!n.autoGain,!!n.panAuto,!!n.filtAuto]});
T('Spurkette hat Auto-Pegel, Auto-Pan, Auto-Filter',nodes.every(Boolean),JSON.stringify(nodes));
const rms=(r,ch,t0,t1)=>{};
async function render(opts){return ev(async(o)=>{const buf=await window.__exportMix(Object.assign({returnBuffer:true},o||{}));const sr=buf.sampleRate;const L=buf.getChannelData(0),R=buf.numberOfChannels>1?buf.getChannelData(1):L;
 const rm=(d,t)=>{const a=Math.floor((t-0.05)*sr),b=Math.floor((t+0.05)*sr);let s=0;for(let i=a;i<b;i++)s+=d[i]*d[i];return Math.sqrt(s/(b-a))};
 return {len:buf.length/sr,sr,L:[0.5,1,2,3,4,5,6].map(t=>rm(L,t)),R:[0.5,1,2,3,4,5,6].map(t=>rm(R,t))}},opts)}
// Basis ohne Automation
const base=await render();
T('Export liefert Puffer ohne Datei/UI (returnBuffer)',base.len>40&&base.L[2]>0.05,JSON.stringify(base.L));
// Pegel-Automation
await ev(()=>{const t=dawState.tracks.find(t=>t.id===__tid);AutoModel.add(t,'vol',0,1);AutoModel.add(t,'vol',4,0.5);AutoModel.add(t,'vol',6,0)});
const av=await render();const r=(a,i)=>a[i]/base.L[i];
T('Pegel-Automation: bei 2 s ≈ 0,75 (linear 1→0,5)',Math.abs(r(av.L,2)-0.75)<0.05,r(av.L,2));
T('…bei 4 s ≈ 0,5, bei 5 s ≈ 0,25',Math.abs(r(av.L,4)-0.5)<0.05&&Math.abs(r(av.L,5)-0.25)<0.05,[r(av.L,4),r(av.L,5)]);
T('…ab 6 s stumm',av.L[6]<0.005,av.L[6]);
// Bypass
await ev(()=>{dawState.tracks.find(t=>t.id===__tid).autoOff=true});const ab=await render();
T('Automation „aus“ → Pegel wie ohne',Math.abs(r(ab.L,4)-1)<0.03,r(ab.L,4));
await ev(()=>{const t=dawState.tracks.find(t=>t.id===__tid);delete t.autoOff;AutoModel.clear(t,'vol');AutoModel.add(t,'pan',0,0);AutoModel.add(t,'pan',1,0);AutoModel.add(t,'pan',3,1)});
const ap=await render();
T('Pan-Automation: Anfang Mitte (L≈R)',Math.abs(ap.L[0]-ap.R[0])<0.01,[ap.L[0],ap.R[0]]);
T('…bei 3 s+ ganz rechts (links ≈ 0)',ap.L[4]<0.01&&ap.R[4]>0.05,[ap.L[4],ap.R[4]]);
await ev(()=>{const t=dawState.tracks.find(t=>t.id===__tid);AutoModel.clear(t,'pan');AutoModel.add(t,'filt',0,0);AutoModel.add(t,'filt',2,1)});
const af=await render();
T('Filter-Automation: Anfang offen, bei 3 s Hochpass 8 kHz dämpft 440 Hz stark',af.L[0]>base.L[0]*0.9&&af.L[4]<base.L[4]*0.05,[af.L[0]/base.L[0],af.L[4]/base.L[4]]);
await ev(()=>AutoModel.clear(dawState.tracks.find(t=>t.id===__tid)));
// Bereich
const rg=await render({startSec:2,endSec:5});
T('Bereichs-Render: 3 s lang',Math.abs(rg.len-3)<0.02,rg.len);
// Live: Knoten werden beim Abspielen gefahren und beim Stopp zurückgesetzt
const live=await ev(async()=>{const t=dawState.tracks.find(t=>t.id===__tid);AutoModel.add(t,'vol',0,0.3);AutoModel.add(t,'vol',100,0.3);audioEngine.seek(1);await audioEngine.play();await new Promise(r=>setTimeout(r,500));const v1=audioEngine.channelNodes[t.id].autoGain.gain.value;audioEngine.stop(false);await new Promise(r=>setTimeout(r,200));const v2=audioEngine.channelNodes[t.id].autoGain.gain.value;AutoModel.clear(t);return [v1,v2]});
T('Live: Auto-Pegel 0,3 beim Spielen',Math.abs(live[0]-0.3)<0.02,live[0]);
T('Live: nach Stopp zurück auf 1',Math.abs(live[1]-1)<0.02,live[1]);
// Lautheit: EBU-Tech-3341-Fall: 997 Hz, −23 dBFS stereo = −23,0 LUFS
const L1=await ev(async()=>{const sr=48000,n=sr*20,b=new AudioBuffer({length:n,numberOfChannels:2,sampleRate:sr}),a=Math.pow(10,-23/20);for(let c=0;c<2;c++){const d=b.getChannelData(c);for(let i=0;i<n;i++)d[i]=a*Math.sin(2*Math.PI*997*i/sr)}return await Loudness.measure(b)});
T('Messung: 997 Hz / −23 dBFS stereo = −23,0 LUFS (±0,1)',Math.abs(L1.integrated+23)<0.1,L1.integrated);
T('…Sample-Peak −23 dBFS',Math.abs(L1.samplePeakDb+23)<0.1,L1.samplePeakDb);
const L2=await ev(async()=>{const sr=44100,n=sr*30,b=new AudioBuffer({length:n,numberOfChannels:2,sampleRate:sr}),a=Math.pow(10,-23/20);for(let c=0;c<2;c++){const d=b.getChannelData(c);for(let i=0;i<sr*10;i++)d[i]=a*Math.sin(2*Math.PI*997*i/sr)}return await Loudness.measure(b)});
T('Gating: 10 s Ton + 20 s Stille → weiter −23 LUFS (±0,15)',Math.abs(L2.integrated+23)<0.15,L2.integrated);
const L3=await ev(async()=>{const sr=48000,n=sr*10,b=new AudioBuffer({length:n,numberOfChannels:1,sampleRate:sr}),a=Math.pow(10,-26/20);const d=b.getChannelData(0);for(let i=0;i<n;i++)d[i]=a*Math.sin(2*Math.PI*997*i/sr);return await Loudness.measure(b)});
T('Mono-Datei: Kanalsummen nach BS.1770 → −26 dBFS = −29,0 LUFS',Math.abs(L3.integrated+29.0)<0.15,L3.integrated);
// Master-Trim wirkt im Export
const T0=await ev(async()=>{const t=dawState.tracks.find(t=>t.id===__tid);const b=await __exportMix({returnBuffer:true,endSec:20});return (await Loudness.measure(b)).integrated});
await ev(()=>{dawState.masterTrimDb=-6});
const T1=await ev(async()=>{const b=await __exportMix({returnBuffer:true,endSec:20});return (await Loudness.measure(b)).integrated});
T('Master-Trim −6 dB senkt die gemessene Lautheit um ≈ 6 LU',Math.abs((T0-T1)-6)<0.4,[T0,T1]);
await ev(()=>{dawState.masterTrimDb=0});
// WAV-Export (alter Weg) unverändert
await ev(()=>{window.__blob=null;window.saveOrShareBlob=async(b,n)=>{window.__blob=b.size;return 'saved'}});
await pg.evaluate(()=>{window.__exportMix()});await pg.waitForTimeout(6000);
T('Master-WAV-Export schreibt weiterhin eine Datei',(await ev(()=>window.__blob))>100000,await ev(()=>window.__blob));
T('Keine Skriptfehler',errs.length===0,errs.join(' | '));
console.log(`\n${ok} bestanden, ${bad} fehlgeschlagen`);await b.close();srv.close();
})();
