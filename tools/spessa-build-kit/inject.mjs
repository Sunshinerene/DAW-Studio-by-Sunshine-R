// Setzt out/spessa.bundle.js in die HTML-Datei der DAW ein (ersetzt den Block id="spessa-core-src").
// Aufruf:  node inject.mjs ../index_ueberarbeitet.html
import { copyFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
const here = dirname(fileURLToPath(import.meta.url));
const htmlPath = process.argv[2];
const bundlePath = process.argv[3] || join(here, "out", "spessa.bundle.js");
if (!htmlPath || !existsSync(htmlPath)) { console.error("Aufruf: node inject.mjs <pfad/zur/index_ueberarbeitet.html> [bundle.js]"); process.exit(1); }
if (!existsSync(bundlePath)) { console.error("Bundle fehlt – zuerst bauen (build.mjs)."); process.exit(1); }
const html = readFileSync(htmlPath, "utf8"), bundle = readFileSync(bundlePath, "utf8");
const open = '<script type="text/plain" id="spessa-core-src">';
const a0 = html.indexOf("\n" + open);
const a = a0 < 0 ? -1 : a0 + 1;
if (a < 0) { console.error("In der HTML-Datei fehlt der Block spessa-core-src – falsche Datei?"); process.exit(1); }
const from = a + open.length, b = html.indexOf("</script>", from);
if (b < 0) { console.error("Block nicht abgeschlossen."); process.exit(1); }
if (/<\/script/i.test(bundle)) { console.error("Bundle enthält </script – abgebrochen."); process.exit(1); }
copyFileSync(htmlPath, htmlPath + ".bak");
writeFileSync(htmlPath, html.slice(0, from) + bundle + html.slice(b));
console.log(`OK: Bundle (${Math.round(bundle.length / 1024)} KB) eingesetzt. Sicherung: ${htmlPath}.bak`);
console.log(/^\/\*SPESSA_BUILD[^*]*vorbis=true/.test(bundle) ? "SF3-Unterstützung: AN" : "SF3-Unterstützung: AUS (stb-vorbis nicht installiert)");
