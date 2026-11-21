const http=require('http'),fs=require('fs'),path=require('path');const {chromium}=require('playwright');
const WORK=process.argv[2];const TW=fs.readFileSync(path.join(__dirname,'fixtures/tailwind.js'));
const srv=http.createServer((q,r)=>{const f=path.join(WORK,decodeURIComponent(q.url.split('?')[0]).replace(/^\//,''));fs.readFile(f,(e,d)=>{if(e){r.writeHead(404);r.end();return;}r.writeHead(200,{'content-type':f.endsWith('.html')?'text/html':'application/octet-stream'});r.end(d)})});
let ok=0,bad=0;const T=(n,c,x)=>{if(c){ok++;console.log('PASS',n)}else{bad++;console.log('FAIL',n,x||'')}};
(async()=>{await new Promise(r=>srv.listen(0,'127.0.0.1',r));const port=srv.address().port;const b=await chromium.launch();
const ctx=await b.newContext({viewport:{width:393,height:852},isMobile:true,hasTouch:true});await ctx.addInitScript(()=>{try{localStorage.setItem('sunshine.home','off')}catch(_){}});const pg=await ctx.newPage();const errs=[];pg.on('pageerror',e=>errs.push(e.message));
await pg.route(/cdn\.tailwindcss\.com/,r=>r.fulfill({status:200,contentType:'application/javascript',body:TW}));
const NET=[];let MODE={};
await pg.addInitScript(()=>{try{Object.defineProperty(navigator,'gpu',{value:{},configurable:true})}catch(e){}});
const WEBLLM=`export const prebuiltAppConfig={model_list:[{model_id:'Qwen2.5-0.5B-Instruct-q4f16_1-MLC'},{model_id:'Llama-3.2-1B-Instruct-q4f16_1-MLC'}]};
export async function CreateMLCEngine(id,o){o.initProgressCallback({progress:0.5,text:'half'});o.initProgressCallback({progress:1,text:'done'});
 globalThis.__llmCalls=(globalThis.__llmCalls||0);
 return {chat:{completions:{create:async(req)=>{globalThis.__llmCalls++;const u=req.messages[req.messages.length-1].content;let out;
  if(/Drums stumm/.test(u))out={actions:[{cmd:'mute',track:1,on:true}],reply:'Drums sind stumm.'};
  else if(/gefährlich/.test(u))out={actions:[{cmd:'mute',track:2,on:true},{cmd:'reset'},{cmd:'bpm',value:500},{cmd:'vol',track:99,db:50},{cmd:'delete'}],reply:''};
  else if(/Frage/.test(u))out={actions:[],reply:'Das weiß ich nicht genau.'};
  else out='ich bin kein json';
  return {choices:[{message:{content:typeof out==='string'?out:JSON.stringify(out)}}]}}}},unload:async()=>{}}}
export async function deleteModelAllInfoInCache(){globalThis.__llmDeleted=true}`;
await pg.route(/cdn\.jsdelivr\.net\/npm\/@mlc-ai\/web-llm/,r=>r.fulfill({status:200,contentType:'application/javascript',headers:{'access-control-allow-origin':'*'},body:WEBLLM}));
const CORS={'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'*'};
await pg.route(/api\.anthropic\.com|openrouter\.ai|generativelanguage\.googleapis\.com/,async r=>{const q=r.request();if(q.method()==='OPTIONS'){await r.fulfill({status:204,headers:CORS});return}
 const u=q.url(),h=q.headers(),body=q.postData()||'';NET.push({u,h,body});
 if(MODE.fail){await r.fulfill({status:401,contentType:'application/json',headers:CORS,body:JSON.stringify({error:{message:'invalid key'}})});return}
 const txt=MODE.text!==undefined?MODE.text:JSON.stringify({actions:[{cmd:'bpm',value:99}],reply:'Tempo 99 gesetzt.'});
 let j;if(/anthropic/.test(u))j={content:[{type:'text',text:txt}]};else if(/openrouter/.test(u))j={choices:[{message:{content:txt}}]};else j={candidates:[{content:{parts:[{text:txt}]}}]};
 await r.fulfill({status:200,contentType:'application/json',headers:CORS,body:JSON.stringify(j)})});
await pg.route(/^https?:\/\/(?!127\.0\.0\.1|cdn\.tailwindcss\.com|cdn\.jsdelivr\.net\/npm\/@mlc-ai|api\.anthropic\.com|openrouter\.ai|generativelanguage\.googleapis\.com)/,r=>r.abort());
await pg.goto(`http://127.0.0.1:${port}/index_ueberarbeitet.html`,{waitUntil:'load'});await pg.waitForTimeout(1200);
const n=()=>pg.evaluate(()=>dawState.tracks.length);

const SHOT=path.join(__dirname,'../dist/_shots');const ev=(f,a)=>pg.evaluate(f,a);
await ev(async()=>{await audioEngine.ensureCtx();createTrack('audio','Drums');createTrack('audio','Lead Vocals');createTrack('midi','Melodie');renderMultiTrackLanes();});
const lastBot=()=>ev(()=>{const m=SunshineAI.messages.filter(x=>x.role==='bot');if(!m.length)return '';const x=m[m.length-1];return (x.html+' '+(x.tag||'')).replace(/<[^>]+>/g,' ').replace(/\s+/g,' ')});
const ask=async t=>{await ev(t=>window.SunshineAI.ask(t),t);await pg.waitForTimeout(80)};
const cfg=(f)=>ev(f=>{const c=JSON.parse(localStorage.getItem('sunshine.assistant')||'{}');c.local=c.local||{};c.online=c.online||{keys:{},models:{}};f(c);localStorage.setItem('sunshine.assistant',JSON.stringify(c))},f.toString()?f:f);
T('Assistent-Modul geladen',await ev(()=>typeof SunshineAI.ask==='function'&&typeof SunshineAI.openChat==='function'));
T('Standardmäßig nichts aktiv',await ev(()=>!SunshineAI.available()));
// Menü + Chat öffnen
await pg.tap('#btn-menu');await pg.waitForTimeout(200);
T('Menüpunkt „💬 Assistent“',await pg.locator('#btn-chat').isVisible());
await pg.tap('#btn-chat');await pg.waitForTimeout(300);
T('Chat-Dialog offen',await pg.locator('#chat-modal').isVisible());
// 1) Regeln – offline, kein Netz
await pg.fill('#ch-in','Tempo 125');await pg.tap('button[data-ch="send"]');await pg.waitForTimeout(250);
T('Regel „Tempo 125“ setzt BPM',await ev(()=>dawState.bpm)===125);
T('…ohne Netzwerkzugriff',NET.length===0&&await ev(()=>!globalThis.__llmCalls));
T('Antwort zeigt Quelle „Regeln“',/Regeln/.test(await lastBot())&&/✓/.test(await lastBot()));
// 2) Nicht verstanden, nichts aktiv
await pg.fill('#ch-in','Mach den Drumsound irgendwie wärmer');await pg.press('#ch-in','Enter');await pg.waitForTimeout(250);
T('Unverstandenes → freundlicher Hinweis, kein Netz',/nicht verstanden/.test(await lastBot())&&NET.length===0);
// 3) Löschen blockiert
const n0=await ev(()=>dawState.tracks.length);
await ask('Lösche alles bitte');T('„Lösche alles“ wird abgelehnt',/nicht per Sprache/.test(await lastBot())&&await ev(()=>dawState.tracks.length)===n0);
// 4) Einrichten über Optionen
await pg.tap('#chat-modal [data-close]');
await pg.evaluate(()=>document.getElementById('btn-settings').click());await pg.waitForTimeout(300);
T('Optionen: Button „Assistent einrichten“',await pg.locator('button[data-ai-settings]').count()===1);
await pg.locator('button[data-ai-settings]').scrollIntoViewIfNeeded();await pg.tap('button[data-ai-settings]');await pg.waitForTimeout(300);
T('Einrichtungs-Dialog offen, Optionen zu',await pg.locator('#assistant-settings').isVisible()&&await pg.locator('#settings-modal').count()===0);
T('Schlüsselfeld ist ein Passwortfeld',await ev(()=>document.getElementById('as-o-key').type)==='password');
await pg.screenshot({path:SHOT+'/ai_chat_settings.png'});
// 5) Lokales Modell laden (Mock)
await pg.locator('#as-l-on').check();
await pg.tap('button[data-as2="l-load"]');await pg.waitForFunction(()=>/Bereit/.test(document.getElementById('as-l-status').textContent),null,{timeout:15000});
T('Lokales Modell „bereit“ (passende Modell-ID gewählt)',/Qwen2\.5-0\.5B/.test(await ev(()=>document.getElementById('as-l-status').textContent)));
T('Einstellung gespeichert',await ev(()=>JSON.parse(localStorage.getItem('sunshine.assistant')).local.enabled)===true);
await pg.tap('#assistant-settings [data-close]');
await ask('Bitte die Drums stumm schalten');
T('Lokales Modell: „Drums stumm“ → Spur 1 stumm',await ev(()=>dawState.tracks[0].mute)===true&&/Lokal/.test(await lastBot()));
await ev(()=>{dawState.tracks[0].mute=false});
await ask('gefährlich');
const bpm0=await ev(()=>dawState.bpm),tr1=await ev(()=>dawState.tracks.length);
T('Unerlaubte Befehle verworfen (reset/delete/bpm 500/vol 99)',await ev(()=>dawState.bpm)===bpm0&&await ev(()=>dawState.tracks.length)===tr1);
T('…erlaubter Befehl daraus lief trotzdem (mute Spur 2)',await ev(()=>dawState.tracks[1].mute)===true);
T('…Antwort nennt ✗ für verworfene',(await lastBot()).includes('✗'));
await ev(()=>{dawState.tracks[1].mute=false});
await ask('Frage zum Mixen');T('Lokale Antwort ohne Aktion wird angezeigt',/weiß ich nicht/.test(await lastBot()));
await ask('Irgendwas Unklares');T('Nicht-JSON vom Modell → Hinweis, kein Absturz',/nicht verstanden/.test(await lastBot()));
// 6) Online
const setOnline=async(prov,key,ctx,model)=>{await ev(([prov,key,ctx,model])=>{const c=JSON.parse(localStorage.getItem('sunshine.assistant'));c.local.enabled=false;c.online.enabled=true;c.online.provider=prov;c.online.keys[prov]=key;c.online.ctx=ctx;if(model)c.online.models[prov]=model;localStorage.setItem('sunshine.assistant',JSON.stringify(c))},[prov,key,ctx,model])};
await setOnline('anthropic','sk-ant-test',true);NET.length=0;
await ask('Kannst du das Tempo ändern?');
T('Anthropic: genau 1 Anfrage',NET.length===1&&/api\.anthropic\.com\/v1\/messages/.test(NET[0].u));
T('…mit x-api-key und Browser-Direktzugriff-Header',NET[0].h['x-api-key']==='sk-ant-test'&&NET[0].h['anthropic-dangerous-direct-browser-access']==='true'&&!!NET[0].h['anthropic-version']);
T('…Modell claude-haiku-5-5',JSON.parse(NET[0].body).model==='claude-haiku-5-5');
T('…Projekt-Überblick enthalten (Spurnamen)',/Drums/.test(NET[0].body)&&/Lead Vocals/.test(NET[0].body));
T('Online-Antwort führt Aktion aus (Tempo 99)',await ev(()=>dawState.bpm)===99&&/Online/.test(await lastBot()));
await setOnline('anthropic','sk-ant-test',false);NET.length=0;await ask('Wie wird der Mix besser?');
T('Ohne „Projekt-Überblick“: keine Spurnamen im Request',NET.length===1&&!/Drums|Lead Vocals/.test(NET[0].body)&&!/Tempo 99/.test(NET[0].body.replace(/Sag|Wie wird/g,'')));
await setOnline('openrouter','sk-or-test',true);NET.length=0;await ask('Frage eins');
T('OpenRouter: Bearer-Schlüssel + URL',NET.length===1&&/openrouter\.ai\/api\/v1\/chat\/completions/.test(NET[0].u)&&NET[0].h.authorization==='Bearer sk-or-test');
await setOnline('gemini','AIza-test',true);NET.length=0;await ask('Frage zwei');
T('Gemini: x-goog-api-key, Schlüssel nicht in der URL',NET.length===1&&/generativelanguage\.googleapis\.com\/v1beta\/models\/gemini-flash-latest:generateContent$/.test(NET[0].u)&&NET[0].h['x-goog-api-key']==='AIza-test'&&!/AIza/.test(NET[0].u));
// Fehler & Freitext
MODE={fail:true};await ask('Frage drei');T('HTTP 401 → verständliche Fehlermeldung',/HTTP 401/.test(await lastBot())&&/invalid key/.test(await lastBot()));
MODE={text:'Nutze den Auto-Mix im KI-Assistenten.'};await ask('Frage vier');T('Freitext-Antwort (kein JSON) wird angezeigt',/Auto-Mix im KI-Assistenten/.test(await lastBot()));
MODE={text:'```json\n{"actions":[{"cmd":"tab","tab":"mixer"}],"reply":"Mixer."}\n```'};await ask('Frage fünf');T('Markdown-Zaun um JSON wird verstanden',await ev(()=>dawState.activeTab)==='mixer');
MODE={text:JSON.stringify({actions:[{cmd:'reset'}],reply:'ok'})};const n1=await ev(()=>dawState.tracks.length);await ask('Frage sechs');T('Online: „reset“-Befehl wird nie ausgeführt',await ev(()=>dawState.tracks.length)===n1&&/nicht erlaubt/.test(await lastBot()));
MODE={};
// Rangfolge: Regel schlägt Online
NET.length=0;await ask('Tempo 111');T('Regeln haben Vorrang (kein Netz)',await ev(()=>dawState.bpm)===111&&NET.length===0);
// Verbindungstest
await ev(()=>SunshineAI.openChatSettings());await pg.waitForTimeout(200);
await pg.tap('button[data-as2="o-test"]');await pg.waitForFunction(()=>/Verbindung funktioniert/.test(document.getElementById('as-o-res').textContent),null,{timeout:10000});
T('„Verbindung testen“ meldet Erfolg',true);
await pg.selectOption('#as-o-prov','anthropic');await pg.waitForTimeout(100);
T('Anbieterwechsel lädt dessen Schlüssel',await ev(()=>document.getElementById('as-o-key').value)==='sk-ant-test');
await pg.screenshot({path:SHOT+'/ai_chat_online.png'});
// Modell entfernen
await pg.tap('button[data-as2="l-del"]');await pg.waitForTimeout(150);
T('Modell entfernen setzt Status zurück + löscht Cache',/Noch nicht geladen/.test(await ev(()=>document.getElementById('as-l-status').textContent))&&await ev(()=>!!globalThis.__llmDeleted));
await pg.tap('#assistant-settings [data-close]');
// Sprachsteuerung → Assistent
await ev(()=>{dawState.metronomeOn=false;const c=JSON.parse(localStorage.getItem('sunshine.ui')||'{}');c.voice=true;localStorage.setItem('sunshine.ui',JSON.stringify(c));document.dispatchEvent(new CustomEvent('sunshine-ui'))});
MODE={text:JSON.stringify({actions:[{cmd:'metronome',on:true}],reply:'Klick an.'})};
const vr=await ev(()=>window.SunshineVoice.handle('Hilf mir mal ein bisschen weiter, mein Lieber'));await pg.waitForTimeout(400);
T('Sprachbefehl ohne Regel → an Assistenten übergeben',vr.ok&&/Assistenten/.test(vr.msg));
T('…und dort ausgeführt (Metronom an)',await ev(()=>dawState.metronomeOn)===true);
// Chat-Dialog mit offenem Verlauf – Screenshot
await ev(()=>SunshineAI.openChat());await pg.waitForTimeout(250);await pg.screenshot({path:SHOT+'/ai_chat_dialog.png'});
T('Chat zeigt Verlauf',await ev(()=>document.querySelectorAll('#ch-msgs > div').length)>=10);
console.log('  Verlauf:',await ev(()=>SunshineAI.messages.length),'Nachrichten');
// Reload: Schlüssel bleibt
await pg.reload({waitUntil:'load'});await pg.waitForTimeout(1000);
T('Einstellungen überleben Neustart',await ev(()=>JSON.parse(localStorage.getItem('sunshine.assistant')).online.keys.anthropic)==='sk-ant-test');
T('Keine Skriptfehler',errs.length===0,errs.join(' | '));
console.log(`\n${ok} bestanden, ${bad} fehlgeschlagen`);await b.close();srv.close();process.exit(bad?1:0)})();
