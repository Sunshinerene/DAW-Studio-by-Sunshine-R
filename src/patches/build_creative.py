# ---------- Schritt 5: Kreativ (Tonart, Transponieren, Beat-Slicer, Import-Assistent, Marker) ----------
CREATIVE_CORE_JS=rd('src/audio/kreativ/creative_core.js')
import os
CREATIVE_UI_JS=rd('src/audio/kreativ/creative_ui.js') if os.path.exists(S+'src/audio/kreativ/creative_ui.js') else ''
