// Baut out/spessa.bundle.js aus dem SpessaSynth-Quellcode.
// Läuft mit Bun (Bun.build). Ist node_modules/fflate bzw. node_modules/stb-vorbis vorhanden, werden die echten Pakete benutzt (→ SF3 / XMF),
// sonst kleine Platzhalter (→ Bundle funktioniert, aber ohne SF3).
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const core = join(here, "spessasynth_core-master", "src", "index.ts");
if (typeof Bun === "undefined") { console.error("FEHLER: Bitte mit Bun starten:  npx --yes bun build.mjs"); process.exit(1); }
if (!existsSync(core)) {
  console.error("FEHLER: Ordner 'spessasynth_core-master' fehlt.\nEntpacke spessasynth_core-master.zip so, dass der Ordner direkt neben build.mjs liegt.");
  process.exit(1);
}
const hasPkg = n => existsSync(join(here, "node_modules", n, "package.json"));
const real = { fflate: hasPkg("fflate"), "stb-vorbis": hasPkg("stb-vorbis") };
console.log(`fflate:     ${real.fflate ? "echtes Paket" : "Platzhalter (XMF aus)"}`);
console.log(`stb-vorbis: ${real["stb-vorbis"] ? "echtes Paket (SF3 an)" : "Platzhalter (SF3 aus)"}`);

const stubs = { fflate: join(here, "stubs", "fflate.js"), "stb-vorbis": join(here, "stubs", "stb-vorbis.js") };
const res = await Bun.build({
  entrypoints: [join(here, "entry.ts")],
  format: "iife", target: "browser", minify: true,
  plugins: [{ name: "stubs", setup(b) {
    b.onResolve({ filter: /^(fflate|stb-vorbis)$/ }, a => real[a.path] ? undefined : { path: stubs[a.path] });
  } }]
});
if (!res.success) { for (const l of res.logs) console.error(String(l)); console.error("BUILD FEHLGESCHLAGEN"); process.exit(1); }
let code = await res.outputs[0].text();
code = code.replaceAll("</script", "<\\/script").replaceAll("<!--", "<\\!--");
const header = `/*SPESSA_BUILD fflate=${real.fflate} vorbis=${real["stb-vorbis"]}*/`;
mkdirSync(join(here, "out"), { recursive: true });
writeFileSync(join(here, "out", "spessa.bundle.js"), header + code);
console.log(`OK: out/spessa.bundle.js (${Math.round((header.length + code.length) / 1024)} KB), SF3 ${real["stb-vorbis"] ? "AN" : "AUS"}`);
