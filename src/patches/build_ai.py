import os
# S (Wurzel des Pakets) wird von build.py gesetzt
rd=lambda p:open(S+p,encoding='utf8').read()
import importlib.util as _iu
_sp=_iu.spec_from_file_location('grundgeruest',S+'src/kern/grundgeruest.py');_gm=_iu.module_from_spec(_sp);_sp.loader.exec_module(_gm)
h=_gm.zusammenbauen(rd)

# ---------- Schritt 2: Transport, Fenster ----------
def once(h,old,new,tag):
    assert h.count(old)==1,(tag,h.count(old))
    return h.replace(old,new,1)
css=rd('src/layout/ui2/ui2.css')
h=once(h,'</head>','<style id="sunshine-ui2">\n'+css+'\n</style>\n</head>','css')
exec(open(S+'src/patches/build_clips.py',encoding='utf8').read())
exec(open(S+'src/patches/build_autosave.py',encoding='utf8').read())
exec(open(S+'src/patches/build_mix.py',encoding='utf8').read())
exec(open(S+'src/patches/build_creative.py',encoding='utf8').read())
exec(open(S+'src/patches/build_home.py',encoding='utf8').read())
tag='<script>\n/* ===== Sunshine@R · Design-Auswahl & Optionen ===== */'
assert tag in h
blk='<script>\n/* ===== Sunshine@R · KI-Rechenkern ===== */\n'+rd('src/ki/studioai_core.js')+'\n</script>\n<script>\n'+rd('src/ki/studioai_ui.js')+'\n</script>\n<script>\n'+rd('src/ki/studioai_assistant.js')+'\n</script>\n<script>\n'+rd('src/layout/ui2/ui2_transport.js')+'\n</script>\n<script>\n'+rd('src/layout/ui2/ui2_windows.js')+'\n</script>\n<script>\n'+'\n</script>\n<script>\n'+MIX_CORE_JS+'\n</script>\n<script>\n'+CREATIVE_CORE_JS+'\n</script>\n<script>\n'+rd('src/audio/clips/clip_editor.js')+'\n</script>\n<script>\n'+MIX_UI_JS+'\n</script>\n<script>\n'+AUTOSAVE_JS+'\n</script>\n'+('<script>\n'+CREATIVE_UI_JS+'\n</script>\n' if CREATIVE_UI_JS else '')+'<script>\n'+HOME_JS+'\n</script>\n'
h=h.replace(tag,blk+tag,1)
exec(open(S+'src/patches/build_polish.py',encoding='utf8').read())
exec(open(S+'src/patches/build_tw.py',encoding='utf8').read())
os.makedirs(S+'dist',exist_ok=True)
open(S+'dist/index_ueberarbeitet.html','w',encoding='utf8',newline='').write(h)
print('gebaut',len(h))
