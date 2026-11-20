# ---------- Schritt 7: Feinschliff (Icons, Transport-Form, Vollbild) ----------
POLISH_CSS=rd('src/design/polish.css')+'\n'+rd('src/design/effekte/fx.css')+'\n'+rd('src/hilfe/help.css')+'\n'+rd('src/hilfe/news.css')+'\n'+rd('src/hilfe/health.css')+'\n'+rd('src/layout/dock/bigwin.css')+'\n'+rd('src/hilfe/feedback.css')+'\n'+rd('src/layout/optionen/optnav.css')+'\n'+rd('src/audio/player/player.css')+'\n'+rd('src/design/intro/intro.css')+'\n'+rd('src/audio/cover_tags/cover.css')+'\n'+rd('src/layout/dock/tpdock.css')
import re as _re, json as _json
def _parse_changelog(t):
    out=[];cur=None
    for ln in t.splitlines():
        m=_re.match(r'^##\s+(\S+)(?:\s*·\s*(\d{4}-\d{2}-\d{2}))?(?:\s*·\s*(.*))?$',ln.strip())
        if m: cur={'v':m.group(1),'date':m.group(2) or '','title':(m.group(3) or '').strip(),'items':[]};out.append(cur);continue
        m=_re.match(r'^\s*[-*]\s+(.*\S)\s*$',ln)
        if m and cur is not None: cur['items'].append(m.group(1))
    return out
CHANGELOG=_parse_changelog(rd('CHANGELOG.md'));APP_V=CHANGELOG[0]['v']
def _kind(h):
    h=h.lower()
    if _re.search(r'test',h): return 'test'
    if _re.search(r'idee|vielleicht|später|spaeter|denkbar',h): return 'idee'
    return 'bald'
def _parse_preview(t):
    out={'title':'','items':[],'kinds':[]};got=False;kind='bald'
    for ln in t.splitlines():
        ln=ln.strip()
        if not ln or ln.startswith('<!--') or ln.startswith('-->'): continue
        m=_re.match(r'^(#{1,4})\s+(.*\S)\s*$',ln)
        if m:
            if _re.match(r'^Vorschau$',m.group(2),_re.I): continue
            if not got and len(m.group(1))<=2: out['title']=_re.sub(r'^Vorschau\s*[:·-]\s*','',m.group(2));got=True
            elif got: kind=_kind(m.group(2))
            continue
        m=_re.match(r'^[-*]\s+(.*\S)\s*$',ln)
        if m: out['items'].append(_re.sub(r'\*\*(.*?)\*\*',r'\1',m.group(1)));out['kinds'].append(kind)
    return out
PREVIEW=_parse_preview(rd('VORSCHAU.md'))
def _vkey(v): return tuple(int(x) for x in _re.findall(r'\d+',v)[:3])
_pv=_re.search(r'\d+(?:\.\d+)+',PREVIEW['title'] or '')
if _pv and _vkey(_pv.group(0))<=_vkey(APP_V): print('WARNUNG: VORSCHAU.md nennt Version '+_pv.group(0)+' – nicht neuer als die App ('+APP_V+'); bitte aktualisieren.')
FEEDBACK_TO=rd('feedback_to.txt').strip()
assert _re.match(r'^$|^[^\s@<>"\\]+@[^\s@<>"\\]+\.[^\s@<>"\\]+$',FEEDBACK_TO),'feedback_to.txt: keine gültige Adresse'
FB_JS=rd('src/hilfe/feedback.js').replace('/*PREVIEW*/{ "title": "", "items": [], "kinds": [] }/*END*/',_json.dumps(PREVIEW,ensure_ascii=False)).replace("'/*FEEDBACK_TO*/'",_json.dumps(FEEDBACK_TO))
NEWS_JS=rd('src/hilfe/news.js').replace('/*CHANGELOG*/[]/*END*/',_json.dumps(CHANGELOG,ensure_ascii=False))
ICONS_JS=rd('src/design/icons.js')+'\n</script>\n<script>\n'+rd('src/layout/back.js')+'\n</script>\n<script>\n'+rd('src/design/effekte/fx.js')+'\n</script>\n<script>\n'+rd('src/layout/layout.js')+'\n</script>\n<script>\n'+NEWS_JS+'\n</script>\n<script>\n'+rd('src/hilfe/updater.js')+'\n</script>\n<script>\n'+rd('src/hilfe/live.js')+'\n</script>\n<script>\n'+rd('src/hilfe/health.js')+'\n</script>\n<script>\n'+rd('src/projekt/saver.js')+'\n</script>\n<script>\n'+FB_JS+'\n</script>\n<script>\n'+rd('src/layout/dock/bigwin.js')+'\n</script>\n<script>\n'+rd('src/hilfe/help.js')+'\n</script>\n<script>\n'+rd('src/layout/optionen/optnav.js')+'\n</script>\n<script>\n'+rd('src/audio/player/tags.js')+'\n</script>\n<script>\n'+rd('src/audio/player/sound.js')+'\n</script>\n<script>\n'+rd('src/audio/player/player.js')+'\n</script>\n<script>\n'+rd('src/layout/startseite/homedock.js')+'\n</script>\n<script>\n'+rd('src/design/intro/intro.js')+'\n</script>\n<script>\n'+rd('src/audio/cover_tags/cover.js')+'\n</script>\n<script>\n'+rd('src/layout/dock/tpdock.js')
h=once(h,"d.setAttribute('data-large',u.large?'1':'0');","d.setAttribute('data-large',u.large?'1':'0');d.setAttribute('data-icons',u.icons===false?'emoji':'line');",'pl-sunui')
h=once(h,"radius: 'normal', voice: false };","radius: 'normal', voice: false, icons: true };",'pl-defaults')
h=once(h,"${toggle('large', 'Große Bedienelemente', 'Alle Buttons mindestens 44 px hoch – leichter zu treffen.', ui.large)}","${toggle('large', 'Große Bedienelemente', 'Alle Buttons mindestens 44 px hoch – leichter zu treffen.', ui.large)}\n        ${toggle('icons', 'Einheitliche Linien-Icons', 'Ein durchgehender Icon-Satz in der Textfarbe des Designs statt bunter Emoji. Ausschalten = Emoji.', ui.icons)}",'pl-toggle')
h=once(h,"</head>","<script>window.SUNSHINE_BUILD={n:'__BUILD_N__',repo:'__BUILD_REPO__',time:'__BUILD_TIME__',v:'"+APP_V+"',nat:'__BUILD_NATIVE__'};window.__errs=[];window.addEventListener('error',function(e){try{__errs.push({t:Date.now(),m:String(e.message||''),s:String(e.filename||'').split('/').pop()+':'+e.lineno})}catch(x){}});window.addEventListener('unhandledrejection',function(e){try{__errs.push({t:Date.now(),m:'Promise: '+String(e.reason&&e.reason.message||e.reason)})}catch(x){}});try{if(localStorage.getItem('sunshine.perf')==='1')document.documentElement.setAttribute('data-perf','on')}catch(x){}</script>\n<script>(function(){try{setTimeout(function(){if(window.__sunshineBoot||!window.caches)return;caches.open('sunshine-live').then(function(c){return c.match('/__live/meta').then(function(r){return r&&r.json().then(function(m){if(m&&m.status==='pending'){m.status='bad';m.why='boot';return c.put('/__live/meta',new Response(JSON.stringify(m))).then(function(){location.reload()})}})})}).catch(function(){})},15000)}catch(e){}})();</script>\n<script>try{if(window.Capacitor||/; wv\\)/.test(navigator.userAgent))document.documentElement.classList.add('android-app')}catch(e){}</script>\n<script>try{var f=JSON.parse(localStorage.getItem('sunshine.fx')||'{}'),d=document.documentElement,E=['off','glow','beam','line'],F=['off','aurora','eq','sparks','waves'];d.setAttribute('data-fx',f.v===2&&f.on===true?'on':'off');d.setAttribute('data-fx-edge',E.indexOf(f.edge)<0?'glow':f.edge);d.setAttribute('data-fx-full',F.indexOf(f.full)<0?'aurora':f.full);d.style.setProperty('--fx-k',String(Math.max(10,Math.min(100,+f.k||50))/100))}catch(e){}</script>\n<style id=\"sunshine-polish\">\n"+POLISH_CSS+"\n</style>\n</head>",'pl-css')
h=once(h,"<script>\n"+HOME_JS+"\n</script>\n","<script>\n"+HOME_JS+"\n</script>\n<script>\n"+ICONS_JS+"\n</script>\n",'pl-js')
h=once(h,'<script src="https://cdn.tailwindcss.com/3.4.17"></script>','<script src="assets/vendor/tailwind-3.4.17.js"></script>\n  <script>window.tailwind||document.write(\'<script src="https://cdn.tailwindcss.com/3.4.17"><\\/script>\')</script>','pl-tw')
h=once(h,'<script src="https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js"></script>','<script src="assets/vendor/jszip-3.10.1.min.js"></script>\n  <script>window.JSZip||document.write(\'<script src="https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js"><\\/script>\')</script>','pl-zip')
h=once(h,'<div class="text-[11px] font-bold uppercase tracking-wider text-slate-400 mt-4 mb-1">Anpassen</div>','<div id="fx-sec"></div>\n      <div id="ly-sec"></div>\n      <div id="up-sec"></div>\n      <div id="hl-sec"></div>\n      <div id="sv-sec"></div>\n      <div id="fb-sec"></div>\n      <div id="pl-sec"></div>\n      <div id="in-sec"></div>\n      <div id="cv-sec"></div>\n      <div id="td-sec"></div>\n      <div class="text-[11px] font-bold uppercase tracking-wider text-slate-400 mt-4 mb-1">Anpassen</div>','pl-fxsec')
h=once(h,'<div class="text-[11px] font-bold uppercase tracking-wider text-slate-400 mt-3 mb-2">Design</div>','<div id="hp-sec"></div>\n      <div class="text-[11px] font-bold uppercase tracking-wider text-slate-400 mt-3 mb-2">Design</div>','pl-hpsec')
# Name der App: „Sunshine@R DAW Studio“ (ohne „Stem“)
h=h.replace('Sunshine@R Stem DAW Studio','Sunshine@R DAW Studio').replace('STEM DAW STUDIO','DAW STUDIO')
