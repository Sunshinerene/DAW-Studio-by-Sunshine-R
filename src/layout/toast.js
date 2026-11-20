    /**
     * ============================================================================
     * NON-BLOCKING TOAST NOTIFICATIONS
     * ============================================================================
     */
    function toast(msg, type = 'info') {
      const container = document.getElementById('toast-container');
      const el = document.createElement('div');
      const palette = {
        info:    'bg-daw-surface border-cyan-500/50 text-cyan-100',
        success: 'bg-emerald-950/95 border-emerald-500/60 text-emerald-100',
        warn:    'bg-amber-950/95 border-amber-500/60 text-amber-100',
        error:   'bg-rose-950/95 border-rose-500/60 text-rose-100'
      };
      el.className = `pointer-events-auto px-3.5 py-2.5 rounded-xl border shadow-2xl text-xs font-medium backdrop-blur-md transition-all duration-300 translate-y-2 opacity-0 ${palette[type] || palette.info}`;
      el.textContent = msg;
      container.appendChild(el);
      requestAnimationFrame(() => el.classList.remove('translate-y-2', 'opacity-0'));
      setTimeout(() => {
        el.classList.add('translate-y-2', 'opacity-0');
        setTimeout(() => el.remove(), 300);
      }, 3600);
    }
