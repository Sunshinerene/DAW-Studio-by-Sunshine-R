// Platzhalter, falls das Paket "stb-vorbis" nicht installiert ist (SF3-SoundFonts gehen dann nicht).
export const StbVorbis = {
  __stub: true,
  ready: Promise.resolve(),
  decode() { throw new Error("SF3 (komprimierte SoundFont) braucht das Paket 'stb-vorbis' (siehe README). Bitte eine .sf2-Datei verwenden."); }
};
