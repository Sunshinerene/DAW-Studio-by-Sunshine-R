/* ===== Sunshine@R · einheitliche Linien-Icons =====
   Ersetzt führende Emoji in Buttons/Überschriften durch einen SVG-Icon-Satz (Stroke = currentColor, Strichstärke je Design).
   Das Emoji bleibt im DOM (versteckt) → Texte/Tests bleiben gleich; Optionen → „Einheitliche Linien-Icons“ schaltet zurück. */
(function () {
  'use strict';
  const P = {
    folderOpen: '<path d="m6 14 1.5-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.54 6a2 2 0 0 1-1.95 1.5H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H18a2 2 0 0 1 2 2v2"/>',
    save: '<path d="M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/><path d="M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7"/><path d="M7 3v4a1 1 0 0 0 1 1h7"/>',
    folder: '<path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/>',
    download: '<path d="M12 15V3"/><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/>',
    menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
    pencil: '<path d="M21.17 6.81a1 1 0 0 0-3.99-3.99L3.84 16.17a2 2 0 0 0-.5.83l-1.32 4.35a.5.5 0 0 0 .62.62l4.35-1.32a2 2 0 0 0 .83-.5z"/><path d="m15 5 4 4"/>',
    plus: '<path d="M5 12h14M12 5v14"/>',
    piano: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v9M15 4v9M6 13h12M12 13v7"/>',
    dice: '<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M8 8h.01M16 8h.01M12 12h.01M8 16h.01M16 16h.01" stroke-width="2.8"/>',
    sparkles: '<path d="M9.94 15.5A2 2 0 0 0 8.5 14.06l-6.14-1.58a.5.5 0 0 1 0-.96L8.5 9.94A2 2 0 0 0 9.94 8.5l1.58-6.14a.5.5 0 0 1 .96 0l1.58 6.14a2 2 0 0 0 1.44 1.44l6.14 1.58a.5.5 0 0 1 0 .96l-6.14 1.58a2 2 0 0 0-1.44 1.44l-1.58 6.14a.5.5 0 0 1-.96 0z"/><path d="M20 3v4M22 5h-4M4 17v2M5 18H3"/>',
    dna: '<path d="m10 16 1.5 1.5"/><path d="m14 8-1.5-1.5"/><path d="M15 2c-1.8 2-2.52 4-2.81 5.99"/><path d="m16.5 10.5 1 1"/><path d="m17 6-2.89-2.89"/><path d="M2 15c6.67-6 13.33 0 20-6"/><path d="m20 9 .89.89"/><path d="M3.11 14.11 4 15"/><path d="m6.5 12.5 1 1"/><path d="m7 18 2.89 2.89"/><path d="M9 22c1.8-2 2.52-4 2.81-5.99"/>',
    bot: '<path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2M20 14h2M15 13v2M9 13v2"/>',
    brain: '<path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z"/><path d="M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z"/><path d="M15 13a4.5 4.5 0 0 1-3-4 4.5 4.5 0 0 1-3 4"/>',
    drum: '<path d="m2 2 8 8"/><path d="m22 2-8 8"/><ellipse cx="12" cy="9" rx="10" ry="5"/><path d="M7 13.4v7.9M12 14v8M17 13.4v7.9"/><path d="M2 9v8a10 5 0 0 0 20 0V9"/>',
    waves: '<path d="M2 6c.6.5 1.2 1 2.5 1C7 7 7 5 9.5 5c2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/><path d="M2 12c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/><path d="M2 18c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/>',
    burst: '<path d="M12 2v5M12 17v5M2 12h5M17 12h5M5 5l3.5 3.5M15.5 15.5 19 19M19 5l-3.5 3.5M8.5 15.5 5 19"/>',
    tornado: '<path d="M21 4H3M18 8H6M19 12H9M16 16h-6M11 20H9"/>',
    mic: '<path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><path d="M12 19v3"/>',
    slidersV: '<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M2 14h4M10 8h4M18 16h4"/>',
    slidersH: '<path d="M21 4h-7M10 4H3M21 12h-9M8 12H3M21 20h-5M12 20H3M14 2v4M8 10v4M16 18v4"/>',
    home: '<path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .71-1.53l7-6a2 2 0 0 1 2.58 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
    pack: '<path d="M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73z"/><path d="M12 22V12"/><path d="m3.3 7 8.7 5 8.7-5"/>',
    chart: '<path d="M3 3v16a2 2 0 0 0 2 2h16"/><path d="M18 17V9M13 17V5M8 17v-3"/>',
    image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/>',
    headphones: '<path d="M3 14v-2a9 9 0 0 1 18 0v2"/><path d="M21 15.5a2.5 2.5 0 0 1-2.5 2.5H18a1 1 0 0 1-1-1v-4a1 1 0 0 1 1-1h1.5a1.5 1.5 0 0 1 1.5 1.5z"/><path d="M3 15.5A2.5 2.5 0 0 0 5.5 18H6a1 1 0 0 0 1-1v-4a1 1 0 0 0-1-1H4.5A1.5 1.5 0 0 0 3 13.5z"/>',
    note: '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
    wave: '<path d="M2 13a2 2 0 0 0 2-2V7a2 2 0 0 1 4 0v13a2 2 0 0 0 4 0V4a2 2 0 0 1 4 0v13a2 2 0 0 0 4 0v-4a2 2 0 0 1 2-2"/>',
    scissors: '<circle cx="6" cy="6" r="3"/><path d="M8.12 8.12 12 12"/><path d="M20 4 8.12 15.88"/><circle cx="6" cy="18" r="3"/><path d="M14.8 14.8 20 20"/>',
    flag: '<path d="M4 22V4a1 1 0 0 1 .4-.8A6 6 0 0 1 8 2c3 0 5 2 7.33 2q2 0 3.07-.8A1 1 0 0 1 20 4v10a1 1 0 0 1-.4.8A6 6 0 0 1 16 16c-3 0-5-2-8-2a6 6 0 0 0-4 1.53"/>',
    compass: '<circle cx="12" cy="12" r="10"/><path d="m16.24 7.76-1.8 5.41a2 2 0 0 1-1.27 1.27L7.76 16.24l1.8-5.41a2 2 0 0 1 1.27-1.27z"/>',
    chat: '<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>',
    gear: '<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>',
    trash: '<path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
    back: '<path d="m12 19-7-7 7-7"/><path d="M19 12H5"/>',
    search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
    refresh: '<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/>',
    volume: '<path d="M11 4.7 6.5 9H3v6h3.5l4.5 4.3z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/>',
    repeat: '<path d="m17 2 4 4-4 4"/><path d="M3 11v-1a4 4 0 0 1 4-4h14"/><path d="m7 22-4-4 4-4"/><path d="M21 13v1a4 4 0 0 1-4 4H3"/>',
    globe: '<circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/>',
    eraser: '<path d="m7 21-4.3-4.3a1 1 0 0 1 0-1.4l9.6-9.6a1 1 0 0 1 1.4 0l5.6 5.6a1 1 0 0 1 0 1.4L13 21"/><path d="M22 21H7"/><path d="m5 11 9 9"/>',
    film: '<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M7 3v18M3 7.5h4M3 12h18M3 16.5h4M17 3v18M17 7.5h4M17 16.5h4"/>',
    shuffle: '<path d="M2 18h1.4c1.3 0 2.5-.6 3.3-1.7l6.1-8.6c.7-1.1 2-1.7 3.3-1.7H22"/><path d="m18 2 4 4-4 4"/><path d="M2 6h1.9c1.5 0 2.9.9 3.6 2.2"/><path d="M22 18h-5.9c-1.3 0-2.6-.7-3.3-1.8l-.5-.8"/><path d="m18 14 4 4-4 4"/>',
    clipboard: '<rect width="8" height="4" x="8" y="2" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>',
    inbox: '<path d="M12 3v12"/><path d="m8 11 4 4 4-4"/><path d="M8 5H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-4"/>',
    timer: '<path d="M10 2h4M12 14l3-3"/><circle cx="12" cy="14" r="8"/>',
    undo: '<path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>',
    redo: '<path d="m15 14 5-5-5-5"/><path d="M20 9H9.5a5.5 5.5 0 0 0 0 11H13"/>',
    rotate: '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>',
    x: '<path d="M18 6 6 18M6 6l12 12"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    power: '<path d="M12 2v10"/><path d="M18.4 6.6a9 9 0 1 1-12.8 0"/>',
    skipBack: '<path d="M5 4v16"/><path d="M19 20 9 12l10-8z"/>',
    pause: '<path d="M8 5v14M16 5v14"/>',
    leftRight: '<path d="M8 3 4 7l4 4"/><path d="M4 7h16"/><path d="m16 21 4-4-4-4"/><path d="M20 17H4"/>',
    play: '<path d="M6 4v16l14-8z"/>',
    help: '<circle cx="12" cy="12" r="10"/><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3"/><path d="M12 17h.01"/>',
    book: '<path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/>',
    bulb: '<path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6M10 22h4"/>',
    alert: '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4M12 17h.01"/>',
    hand: '<path d="M18 11V6a2 2 0 0 0-4 0M14 10V4a2 2 0 0 0-4 0v2M10 10.5V6a2 2 0 0 0-4 0v8"/><path d="m7 15-1.76-1.76a2 2 0 0 0-2.83 2.82l3.6 3.6C7.5 21.14 9.2 22 12 22h2a8 8 0 0 0 8-8V8a2 2 0 0 0-4 0v3"/>',
    eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    heart: '<path d="M19 14c1.5-1.5 3-3.2 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.8 0-3 .5-4.5 2-1.5-1.5-2.7-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4 3 5.5l7 7z"/>',
    mail: '<rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-10 6L2 7"/>',
    share: '<path d="M7 17 17 7"/><path d="M8 7h9v9"/>',
    fileText: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M16 13H8M16 17H8M10 9H8"/>',
    copy: '<rect width="14" height="14" x="8" y="8" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',
    bug: '<path d="m8 2 1.9 1.9M14.1 3.9 16 2"/><path d="M9 7.1V6a3 3 0 0 1 6 0v1.1"/><path d="M12 20c-3.3 0-6-2.7-6-6v-3a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v3c0 3.3-2.7 6-6 6z"/><path d="M12 20v-9M6.5 13H2M17.5 13H22M3 21c0-2.1 1.7-3.9 3.8-4M20.9 21c0-2.1-1.7-3.9-3.8-4M6 8c-2.1 0-3.9-1.7-4-3.8M18 8c2.1 0 3.9-1.7 4-3.8"/>'
  };
  const MAP = {
    '📂': 'folderOpen', '💾': 'save', '📁': 'folder', '⬇': 'download', '⬇️': 'download', '📥': 'inbox', '☰': 'menu', '✎': 'pencil', '✏': 'pencil', '✏️': 'pencil',
    '➕': 'plus', '🎹': 'piano', '🎲': 'dice', '✨': 'sparkles', '🧬': 'dna', '🤖': 'bot', '🧠': 'brain', '🥁': 'drum', '🌊': 'waves', '💥': 'burst',
    '🌪': 'tornado', '🌪️': 'tornado', '🎙': 'mic', '🎙️': 'mic', '🎤': 'mic', '🎚': 'slidersV', '🎚️': 'slidersV', '🎛': 'slidersH', '🎛️': 'slidersH',
    '🏠': 'home', '📦': 'pack', '📊': 'chart', '🎼': 'wave', '🎵': 'note', '✂': 'scissors', '✂️': 'scissors', '🚩': 'flag', '🧭': 'compass', '💬': 'chat', '🎧': 'headphones', '🖼': 'image', '🖼️': 'image',
    '⚙': 'gear', '⚙️': 'gear', '🗑': 'trash', '🗑️': 'trash', '←': 'back', '🔍': 'search', '♻': 'refresh', '♻️': 'refresh', '🔊': 'volume', '🔁': 'repeat',
    '🌐': 'globe', '🧹': 'eraser', '🎞': 'film', '🎞️': 'film', '🌀': 'shuffle', '📋': 'clipboard', '⏱': 'timer', '⏱️': 'timer',
    '↩': 'undo', '↪': 'redo', '↺': 'rotate', '✕': 'x', '✗': 'x', '✖': 'x', '✓': 'check', '✔': 'check', '✔️': 'check', '☑': 'check', '☑️': 'check',
    '⏻': 'power', '⇤': 'skipBack', '❚': 'pause', '↔': 'leftRight', '↔️': 'leftRight', '☝': 'hand', '☝️': 'hand', '❓': 'help', '📖': 'book', '💡': 'bulb', '👀': 'eye', '❤': 'heart', '❤️': 'heart', '✉': 'mail', '✉️': 'mail', '↗': 'share', '📄': 'fileText', '⎘': 'copy', '🐞': 'bug'
  };
  const EMO = /^\s*((?:[\u{1F300}-\u{1FAFF}]|[☀-➿]|[⬀-⯿]|[←-⇿]|[⌀-⏿])️?)/u;
  const HOST = 'button,summary,a,label,h1,h2,h3,h4,[role="button"],[role="tab"],[role="menuitem"],.nv-ic,.hb-ic,.fm-item,.dock-win-head,.dock-tab-btn,.bw-ic,.nw-v,.hp-new b,.text-base.font-black,.fb-cats span';
  const SKIP = 'option,select,textarea,input,script,style,svg,[contenteditable="true"],.ic-w,.no-ic';
  const NS = 'http://www.w3.org/2000/svg';

  function svgFor(name) {
    const s = document.createElementNS(NS, 'svg');
    s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('class', 'ic'); s.setAttribute('aria-hidden', 'true'); s.setAttribute('focusable', 'false');
    s.innerHTML = P[name];
    return s;
  }
  function convertText(n) {
    const m = EMO.exec(n.nodeValue); if (!m) return false;
    const name = MAP[m[1]] || MAP[m[1].replace(/️$/, '')]; if (!name || !P[name]) return false;
    const p = n.parentElement; if (!p || p.closest(SKIP) || !p.closest(HOST)) return false;
    const rest = n.nodeValue.slice(m[0].length).replace(/^\s+/, '');
    const w = document.createElement('span'); w.className = 'ic-w' + (rest ? ' ic-gap' : ''); w.dataset.e = m[1];
    const e = document.createElement('span'); e.className = 'ic-e'; e.textContent = m[1];
    w.appendChild(svgFor(name)); w.appendChild(e);
    n.parentNode.insertBefore(w, n);
    if (rest) n.nodeValue = rest; else n.parentNode.removeChild(n);
    return true;
  }
  function firstTextNode(el) { // nur führender Text zählt (vor dem ersten Element-Kind mit Text)
    for (let c = el.firstChild; c; c = c.nextSibling) {
      if (c.nodeType === 3) { if (c.nodeValue.trim()) return c; continue; }
      if (c.nodeType === 1) { if (c.classList && c.classList.contains('ic-w')) return null; if (/^(SVG|IMG|CANVAS|INPUT)$/i.test(c.tagName)) continue; const t = firstTextNode(c); return t; }
    }
    return null;
  }
  function apply(root) {
    root = root || document.body; if (!root) return 0; let n = 0;
    const hosts = [];
    if (root.nodeType === 1 && root.matches && root.matches(HOST)) hosts.push(root);
    if (root.querySelectorAll) root.querySelectorAll(HOST).forEach(h => hosts.push(h));
    if (root.nodeType === 3) { if (convertText(root)) n++; return n; }
    // Elemente, die in einem Host liegen (Mutationen innerhalb von Buttons)
    if (!hosts.length && root.closest) { const h = root.closest(HOST); if (h) hosts.push(h); }
    hosts.forEach(h => { if (h.closest(SKIP)) return; const t = firstTextNode(h); if (t && convertText(t)) n++; });
    return n;
  }
  let pend = new Set(), raf = 0;
  function flush() { raf = 0; const L = pend; pend = new Set(); L.forEach(x => { try { if (x.isConnected) apply(x); } catch (_) {} }); }
  function queue(x) { pend.add(x); if (!raf) raf = (window.requestAnimationFrame || setTimeout)(flush); }
  function boot() {
    apply(document.body);
    new MutationObserver(ms => {
      for (const m of ms) {
        if (m.type === 'characterData') { const p = m.target.parentElement; if (p && !p.closest('.ic-w')) { const h = p.closest(HOST); queue(h || p); } continue; }
        m.addedNodes.forEach(a => { if (a.nodeType === 1 && a.classList && a.classList.contains('ic-w')) return; if (a.nodeType === 1 || a.nodeType === 3) queue(a.nodeType === 3 ? (a.parentElement || a) : a); });
      }
    }).observe(document.body, { childList: true, subtree: true, characterData: true });
  }
  window.Icons = { paths: P, map: MAP, apply, names: () => Object.keys(P), svg: name => { const s = svgFor(name); return s.outerHTML; } };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
