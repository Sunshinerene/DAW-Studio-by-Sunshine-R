
/* Branding: PNG-Icon als Favicon/Startbildschirm-Icon, sobald assets/sunshine-r-app-icon.png vorhanden ist (sonst bleibt das eingebaute SVG-Icon). */
(function () {
  var icon = 'assets/sunshine-r-app-icon.png', im = new Image();
  im.onload = function () {
    document.querySelectorAll('link[rel="icon"],link[rel="apple-touch-icon"]').forEach(function (l) { l.type = 'image/png'; l.href = icon; });
  };
  im.src = icon;
})();
