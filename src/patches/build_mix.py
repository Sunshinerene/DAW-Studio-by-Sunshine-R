# ---------- Schritt 5: Automation, Lautheit, Export-Umbau ----------
# Spurkette: Automations-Knoten
# Export-Umbau
MIX_CORE_JS=rd('src/audio/mixer/mix_core.js'); MIX_UI_JS=rd('src/audio/mixer/mix_ui.js')+'\n</script>\n<script>\n'+rd('src/audio/export/export_ui.js')
