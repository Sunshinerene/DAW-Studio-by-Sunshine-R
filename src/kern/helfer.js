    /**
     * ============================================================================
     * WEB AUDIO API DSP & REAL-TIME LOOKAHEAD SCHEDULER ENGINE
     * ============================================================================
     */
    /* Globaler HTML-Escaper. Vorher gab es escapeText nur lokal im letzten Script-Block,
       dadurch warf openTrackFxRack() einen ReferenceError und das Fenster wurde nie angezeigt. */
    function escapeText(value) {
      return String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
    }
