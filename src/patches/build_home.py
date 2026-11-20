# ---------- Schritt 6: Startseite & Projektverwaltung ----------
HOME_JS=rd('src/layout/startseite/home.js')
h=once(h,"      markers: [],\n","      markers: [],\n      project: null,\n",'hm-state')
h=once(h,"</head>","""<script>try{if(localStorage.getItem('sunshine.home')!=='off'){document.documentElement.classList.add('home-pending');setTimeout(function(){document.documentElement.classList.remove('home-pending')},6000)}}catch(e){}</script>
<style>html.home-pending body>*:not(#home-root){visibility:hidden}</style>
</head>""",'hm-head')
h=once(h,"  window.__dawPushUndo = pushUndo;","  window.__dawPushUndo = pushUndo; window.__dawClearHistory = function () { undoStack.length = 0; redoStack.length = 0; updateUndoBtn(); };",'hm-hist')
h=once(h,"    $('btn-save-project')?.addEventListener('click', saveNamedProject);\n    $('btn-open-projects')?.addEventListener('click', openProjectLibrary);","    $('btn-save-project')?.addEventListener('click', () => (window.Home && window.Home.save) ? window.Home.save() : saveNamedProject());\n    $('btn-open-projects')?.addEventListener('click', () => (window.Home && window.Home.open) ? window.Home.open() : openProjectLibrary());",'hm-btns')
