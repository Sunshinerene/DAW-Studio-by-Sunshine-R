
    /**
     * ============================================================================
     * SUNO STEM STUDIO PRO – COMPLETE MULTI-TRACK & MIDI BROWSER DAW ENGINE
     * ============================================================================
     */

    const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const SCALES = {
      chromatic:     [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
      major:         [0, 2, 4, 5, 7, 9, 11],
      minor:         [0, 2, 3, 5, 7, 8, 10],
      harmonicMinor: [0, 2, 3, 5, 7, 8, 11],
      phrygian:      [0, 1, 3, 5, 7, 8, 10],
      pentatonic:    [0, 3, 5, 7, 10]
    };

    // Dynamische Spur-Vorlagen (werden NUR auf ausdrücklichen Wunsch des Nutzers erstellt)
    const TRACK_TEMPLATES = {
      audio: { defaultName: 'Audio Spur',       type: 'audio', color: '#f59e0b', vol: 0.92, lowCut: false, vocalCleanup: false, badge: 'Audio',      editTab: 'mixer'  },
      midi:  { defaultName: 'MIDI Synth',       type: 'midi',  color: '#c084fc', vol: 0.80, lowCut: false, vocalCleanup: false, badge: 'Piano Roll', editTab: 'midi'   },
      mic:   { defaultName: 'Mic / Vocal Rec',  type: 'mic',   color: '#fb7185', vol: 1.00, lowCut: true,  vocalCleanup: true,  badge: 'Mic Rec',    editTab: 'vocals' },
      kick:  { defaultName: 'Own Kick / Perc',  type: 'kick',  color: '#0ea5e9', vol: 1.00, lowCut: false, vocalCleanup: false, badge: 'SC Trigger', editTab: 'drums'  },
      bass:  { defaultName: 'Own Bass / 808',   type: 'bass',  color: '#10b981', vol: 0.92, lowCut: false, vocalCleanup: false, badge: 'Sub/808',    editTab: 'drums'  },
      fx:    { defaultName: 'FX & Transitions', type: 'fx',    color: '#22d3ee', vol: 0.85, lowCut: false, vocalCleanup: false, badge: 'Riser/Imp',  editTab: 'drums'  }
    };

    const EXTRA_COLORS = ['#f59e0b', '#38bdf8', '#34d399', '#a855f7', '#fb7185', '#22d3ee', '#818cf8', '#f97316'];

    // Central DAW Application State (startet komplett leer ohne vordefinierte Spuren)
    const dawState = {
      bpm: 144,
      isPlaying: false,
      isLooping: true,
      metronomeOn: false,
      playheadSec: 0,
      startOffsetMs: 0,
      activeTab: 'midi',
      masterGainVal: 0.95,
      masterTrimDb: 0,
      limiterDb: -1,
      markers: [],
      project: null,

      // Arrangement Sections (Total = 24 Bars)
      sections: [
        { id: 'intro',   name: 'Intro',           bars: 4, color: '#64748b' },
        { id: 'verse',   name: 'Verse / Build-Up',bars: 4, color: '#f59e0b' },
        { id: 'drop',    name: 'Drop / Hook',     bars: 8, color: '#10b981' },
        { id: 'break',   name: 'Break',           bars: 4, color: '#a855f7' },
        { id: 'outro',   name: 'Outro',           bars: 4, color: '#38bdf8' }
      ],

      // Dynamic Track List & AudioBuffers
      tracks: [],
      buffers: {},
      activeMidiTrackId: null,
      recordingMicTrackId: null,
      pendingAudioTargetTrackId: null,

      // Low-End & Sidechain Parameters
      lowCutFreq: 115,
      kickTuneHz: 52,
      kickPunch: 80,
      kickDecayMs: 240,
      bassMode: 'rolling',
      bassGlide: false,
      bassDrive: 40,
      scDepth: 60,
      scReleaseMs: 95,
      lastDuckTime: 0,
      lastDuckDb: 0,

      // 16-Step Sequencer Patterns (starten leer)
      seqKick: new Array(16).fill(0),
      seqBass: new Array(16).fill(0),
      seqBassPitch: new Array(16).fill(0),
      seqHat:  new Array(16).fill(0),
      seqFx:   new Array(16).fill(0),
      autoDropFx: true,
      currentStep16: -1,

      // Vocal Rack Parameters
      vocalRackActive: true,
      vocalHpfHz: 95,
      vocalDeHarshDb: 4.5,
      vocalPresenceDb: 3.0,
      vocalDeEssDb: 3.5,
      vocalCompRatio: 4.0,
      vocalReverbWet: 0.22,

      // Mic Recording State
      isRecordingMic: false,
      micCountIn: true,
      micRecStartTime: 0,

      // MIDI Editor & Synth State (startet leer)
      midiGridStep: 2,
      midiRoot: 5,
      midiScale: 'minor',
      midiRecArmed: false,
      midiNotes: [],
      stepVelocities: new Array(32).fill(108),

      // MIDI Synth Engine Params
      synthPreset: 'supersaw',
      synthCutoff: 3200,
      synthRes: 2.8,
      synthDetune: 26,
      synthAttackMs: 10,
      synthReleaseMs: 220,
      synthScAmount: 60
    };

    function renumberTracks() {
      dawState.tracks.forEach((t, idx) => {
        t.num = String(idx + 1).padStart(2, '0');
      });
    }

    function getActiveMidiTrack() {
      let tr = dawState.tracks.find(t => t.id === dawState.activeMidiTrackId && t.type === 'midi');
      if (!tr) {
        tr = dawState.tracks.find(t => t.type === 'midi') || null;
        dawState.activeMidiTrackId = tr ? tr.id : null;
      }
      return tr;
    }

    function syncActiveMidiTrackFromState() {
      const tr = getActiveMidiTrack();
      if (tr) {
        tr.midiNotes = JSON.parse(JSON.stringify(dawState.midiNotes));
        tr.stepVelocities = [...dawState.stepVelocities];
      }
    }

    function selectMidiTrackForEditor(trackId) {
      const tr = dawState.tracks.find(t => t.id === trackId && t.type === 'midi');
      if (!tr) return;
      syncActiveMidiTrackFromState();
      dawState.activeMidiTrackId = tr.id;
      dawState.midiNotes = JSON.parse(JSON.stringify(tr.midiNotes || []));
      dawState.stepVelocities = Array.isArray(tr.stepVelocities) && tr.stepVelocities.length === 32
        ? [...tr.stepVelocities]
        : new Array(32).fill(108);
      drawPianoRoll();
      drawVelocityLane();
      renderMultiTrackLanes();
    }

    function createTrack(kind = 'audio', customName = '', opts = {}) {
      const tpl = TRACK_TEMPLATES[kind] || TRACK_TEMPLATES.audio;
      const sameTypeCount = dawState.tracks.filter(t => t.type === tpl.type).length;
      const id = `trk_${tpl.type}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
      const name = (customName && customName.trim())
        ? customName.trim().slice(0, 32)
        : (sameTypeCount === 0 ? tpl.defaultName : `${tpl.defaultName} ${sameTypeCount + 1}`);

      const tr = {
        id,
        num: '01',
        name,
        type: tpl.type,
        color: opts.color || (tpl.type === 'audio' ? EXTRA_COLORS[dawState.tracks.length % EXTRA_COLORS.length] : tpl.color),
        vol: tpl.vol,
        pan: 0,
        mute: false,
        solo: false,
        lowCut: opts.lowCut !== undefined ? opts.lowCut : tpl.lowCut,
        vocalCleanup: opts.vocalCleanup !== undefined ? opts.vocalCleanup : tpl.vocalCleanup,
        badge: opts.badge || tpl.badge,
        editTab: opts.editTab || tpl.editTab,
        sectionClips: { intro: true, verse: true, drop: true, break: true, outro: true },
        fx: []
      };

      if (tpl.type === 'midi') {
        tr.midiNotes = opts.midiNotes ? JSON.parse(JSON.stringify(opts.midiNotes)) : [];
        tr.stepVelocities = new Array(32).fill(108);
      }

      dawState.tracks.push(tr);
      renumberTracks();

      if (audioEngine.ctx) {
        audioEngine.ensureTrackNode(tr);
        audioEngine.syncAudioParams();
      }

      if (tpl.type === 'midi') {
        syncActiveMidiTrackFromState();
        dawState.activeMidiTrackId = tr.id;
        dawState.midiNotes = JSON.parse(JSON.stringify(tr.midiNotes));
        dawState.stepVelocities = [...tr.stepVelocities];
      }

      return tr;
    }

    function deleteTrack(trackId) {
      const idx = dawState.tracks.findIndex(t => t.id === trackId);
      if (idx === -1) return;
      const removed = dawState.tracks[idx];
      if (typeof window.__dawPushUndo === 'function') window.__dawPushUndo();

      if (dawState.isRecordingMic && dawState.recordingMicTrackId === trackId) {
        audioEngine.stopMicRecording();
      }

      dawState.tracks.splice(idx, 1);
      delete dawState.buffers[trackId];

      if (audioEngine.channelNodes && audioEngine.channelNodes[trackId]) {
        try { audioEngine.channelNodes[trackId].fader.disconnect(); } catch (_) {}
        delete audioEngine.channelNodes[trackId];
      }

      if (dawState.activeMidiTrackId === trackId) {
        const nextMidi = dawState.tracks.find(t => t.type === 'midi') || null;
        dawState.activeMidiTrackId = nextMidi ? nextMidi.id : null;
        dawState.midiNotes = nextMidi ? JSON.parse(JSON.stringify(nextMidi.midiNotes || [])) : [];
        dawState.stepVelocities = (nextMidi && nextMidi.stepVelocities) ? [...nextMidi.stepVelocities] : new Array(32).fill(108);
      }

      renumberTracks();
      audioEngine.syncAudioParams();
      renderMultiTrackLanes();
      renderVerticalMixer();
      updateAudioToMidiDropdown();
      drawPianoRoll();
      drawVelocityLane();
      document.getElementById('status-subtitle').textContent = dawState.tracks.length
        ? `${dawState.tracks.length} Spur(en) aktiv`
        : 'Leeres Projekt – Spur erstellen oder Datei laden';
      toast(`Spur „${removed.name}“ gelöscht.`, 'info');
    }
