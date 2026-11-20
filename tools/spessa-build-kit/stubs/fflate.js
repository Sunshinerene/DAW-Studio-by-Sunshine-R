// Platzhalter, falls das Paket "fflate" nicht installiert ist (XMF-Dateien gehen dann nicht).
const nope = () => { throw new Error("XMF/komprimierte MIDI-Container brauchen das Paket 'fflate' (siehe README)."); };
export const inflateSync = nope; export const unzipSync = nope; export const zipSync = nope; export const deflateSync = nope;
