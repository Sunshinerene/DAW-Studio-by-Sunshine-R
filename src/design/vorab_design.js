/* Design vor dem ersten Zeichnen setzen (kein Aufblitzen) */
    window.__sunUi=function(u){var d=document.documentElement,s=d.style;u=u||{};
      d.setAttribute('data-glass',u.glass===false?'off':'on');d.setAttribute('data-glow',u.glow===false?'off':'on');d.setAttribute('data-large',u.large?'1':'0');d.setAttribute('data-icons',u.icons===false?'emoji':'line');
      var m=/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(u.accent||'');
      if(m){var r=parseInt(m[1],16),g=parseInt(m[2],16),bl=parseInt(m[3],16),hi=function(c){return Math.round(c+(255-c)*.38)},lum=(.299*r+.587*g+.114*bl)/255;
        s.setProperty('--acc',u.accent);s.setProperty('--acc-rgb',r+','+g+','+bl);s.setProperty('--acc-hi','rgb('+hi(r)+','+hi(g)+','+hi(bl)+')');s.setProperty('--acc-ink',lum>.58?'#1a1206':'#ffffff');d.setAttribute('data-accent','1');}
      else{d.removeAttribute('data-accent');['--acc','--acc-rgb','--acc-hi','--acc-ink'].forEach(function(k){s.removeProperty(k)});}
      var k=typeof u.glassK==='number'?u.glassK/40:1;if(k===1)s.removeProperty('--glass-k');else s.setProperty('--glass-k',String(k));
      if(typeof u.blur==='number'){d.setAttribute('data-blur','1');s.setProperty('--user-blur',u.blur+'px');}else{d.removeAttribute('data-blur');s.removeProperty('--user-blur');}
      d.setAttribute('data-radius',u.radius==='sharp'||u.radius==='round'?u.radius:'normal');};
    (function(){try{var t=localStorage.getItem('sunshine.theme');if(['aurora','studio','neon','classic','liquid'].indexOf(t)<0)t='aurora';var d=document.documentElement;d.setAttribute('data-theme',t);
    window.__sunUi(JSON.parse(localStorage.getItem('sunshine.ui')||'{}'));
    var m={aurora:'#0B0E27',studio:'#14161A',neon:'#05060B',classic:'#090c12',liquid:'#1B1D2B'}[t];document.addEventListener('DOMContentLoaded',function(){var x=document.querySelector('meta[name="theme-color"]');if(x)x.setAttribute('content',m)});}catch(e){document.documentElement.setAttribute('data-theme','aurora')}})();
    