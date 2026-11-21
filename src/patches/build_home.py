# ---------- Schritt 6: Startseite & Projektverwaltung ----------
HOME_JS=rd('src/layout/startseite/home.js')
h=once(h,"</head>","""<script>try{var _sv=localStorage.getItem('sunshine.start');var _h=(_sv==='home'||_sv==='daw'||_sv==='player')?_sv==='home':localStorage.getItem('sunshine.home')!=='off';if(_h){document.documentElement.classList.add('home-pending');setTimeout(function(){document.documentElement.classList.remove('home-pending')},6000)}else if(_sv==='player'){document.documentElement.classList.add('pl-pending');setTimeout(function(){document.documentElement.classList.remove('pl-pending')},4000)}}catch(e){}</script>
<style>html.home-pending body>*:not(#home-root){visibility:hidden}html.pl-pending body>*:not(#pl-root){visibility:hidden}</style>
</head>""",'hm-head')
