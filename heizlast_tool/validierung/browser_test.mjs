/* ===========================================================================
 * browser_test.mjs — die fertige Einzeldatei in einem echten Browser
 * ===========================================================================
 * Alles andere prueft Bausteine in einer Attrappe. Diese Probe oeffnet das
 * GEBAUTE WERKZEUG in Chromium, klickt die Schrittleiste durch und verlangt:
 *   1. keine Fehler und keine Warnungen in der Konsole,
 *   2. keine unbehandelte Ausnahme,
 *   3. KEIN Netzaufruf -- das Werkzeug rechnet lokal; ein Aufruf hier waere
 *      ein Datenabfluss, den niemand bestellt hat,
 *   4. kein waagerechtes Ueberlaufen auf 390 px Breite,
 *   5. der Fokus laesst sich mit der Tabulatortaste durch die Seite fuehren,
 *   6. die Ergebnisseite zeigt eine Zahl, keinen leeren Platz.
 *
 * Playwright ist nicht Teil des Projekts. Fehlt es, UEBERSPRINGT die Probe
 * mit sichtbarem Vermerk, statt den Bau anzuhalten -- der Bau muss auch auf
 * einem Rechner ohne Browserwerkzeuge durchlaufen. Uebersprungen ist aber
 * NICHT bestanden, und die Ausgabe sagt das.
 *
 * Aufruf:  node validierung/browser_test.mjs [pfad/zur/datei.html]
 * =========================================================================== */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HIER = path.dirname(fileURLToPath(import.meta.url));
const DATEI = process.argv[2] || path.join(HIER, "..", "WERKE_Heizlast_Tool.html");

function raus(o) { console.log(JSON.stringify(o)); process.exit(0); }

if (!fs.existsSync(DATEI)) {
  raus({ ok: false, uebersprungen: false, anzahl: 0,
    fehler: ["Die gebaute Datei fehlt: " + DATEI + " — erst python3 build.py"] });
}

let chromium = null;
for (const ort of ["playwright", "playwright-core",
                   "/opt/node22/lib/node_modules/playwright/index.mjs"]) {
  try { ({ chromium } = await import(ort)); break; } catch (e) { /* weiter */ }
}
if (!chromium) {
  raus({ ok: true, uebersprungen: true, anzahl: 0, fehler: [],
    grund: "Playwright ist nicht installiert. Die Browserprobe wurde "
      + "UEBERSPRUNGEN — das ist nicht dasselbe wie bestanden. "
      + "Einrichten: npm i -D playwright && npx playwright install chromium" });
}

/* Auf diesem Rechner liegt Chromium vorinstalliert; sonst nimmt Playwright
   seine eigene Ablage. Beides wird versucht, bevor die Probe aufgibt. */
const ORTE = [undefined, "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
              "/opt/pw-browsers/chromium/chrome-linux/chrome"];
let browser = null, startFehler = null;
for (const ort of ORTE) {
  try {
    browser = await chromium.launch(ort ? { executablePath: ort } : {});
    break;
  } catch (e) { startFehler = e; }
}
if (!browser) {
  raus({ ok: true, uebersprungen: true, anzahl: 0, fehler: [],
    grund: "Chromium liess sich nicht starten (" + String(startFehler).slice(0, 200)
      + "). UEBERSPRUNGEN, nicht bestanden." });
}

const GERAETE = [
  { name: "desktop", viewport: { width: 1440, height: 900 } },
  { name: "mobil", viewport: { width: 390, height: 844 },
    isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
];

const fehler = [];
let anzahl = 0;
function pruefe(bedingung, text) {
  anzahl++;
  if (!bedingung) fehler.push(text);
}

const messwerte = {};
for (const g of GERAETE) {
  const ctx = await browser.newContext({
    viewport: g.viewport, isMobile: !!g.isMobile, hasTouch: !!g.hasTouch,
    deviceScaleFactor: g.deviceScaleFactor || 1,
  });
  const page = await ctx.newPage();
  const konsole = [], ausnahmen = [], netz = [];
  page.on("console", (m) => {
    if (m.type() === "error" || m.type() === "warning") {
      konsole.push(m.type() + ": " + m.text().slice(0, 300));
    }
  });
  page.on("pageerror", (e) => ausnahmen.push(String(e).slice(0, 400)));
  page.on("request", (r) => {
    const u = r.url();
    if (!/^(file|data|blob):/.test(u)) netz.push(r.method() + " " + u.slice(0, 200));
  });

  await page.goto("file://" + path.resolve(DATEI) + "?demo=1",
    { waitUntil: "load", timeout: 90000 });
  await page.waitForTimeout(3500);

  const seiten = [];
  const n = (await page.$$("#schritte button, #schritte a")).length;
  pruefe(n >= 3, g.name + ": die Schrittleiste hat nur " + n + " Eintraege");
  for (let i = 0; i < n && i < 12; i++) {
    const k = (await page.$$("#schritte button, #schritte a"))[i];
    if (!k) continue;
    const label = ((await k.textContent()) || "").trim().slice(0, 40);
    try { await k.click({ timeout: 5000 }); }
    catch (e) { fehler.push(g.name + ": " + label + " nicht anklickbar"); anzahl++; continue; }
    await page.waitForTimeout(700);
    const z = await page.evaluate(() => ({
      zeichen: (document.querySelector("#inhalt")?.innerHTML || "").length,
      ueberbreit: document.documentElement.scrollWidth > window.innerWidth + 2,
      scrollWidth: document.documentElement.scrollWidth,
    }));
    seiten.push({ label, ...z });
    pruefe(z.zeichen > 300, g.name + ": " + label + " zeichnet fast nichts ("
      + z.zeichen + " Zeichen)");
    pruefe(!z.ueberbreit, g.name + ": " + label + " laeuft waagerecht ueber ("
      + z.scrollWidth + " > " + g.viewport.width + ")");
  }

  /* Die Ergebnisseite muss eine Zahl zeigen. "NaN", "undefined" und ein leerer
     Platz sind die drei Fassungen desselben Fehlers. */
  const ergebnis = await page.evaluate(() => {
    const t = document.querySelector("#inhalt")?.textContent || "";
    return { text: t.slice(0, 4000), hatNaN: /\bNaN\b|undefined/.test(t) };
  });
  pruefe(!ergebnis.hatNaN, g.name + ": auf der Seite steht NaN oder undefined");
  pruefe(/\d+,\d+\s*kW/.test(ergebnis.text) || /\d+\s*W/.test(ergebnis.text),
    g.name + ": auf der Ergebnisseite ist keine Heizlast zu finden");

  /* Tastaturbedienung: der Fokus muss wandern und sichtbar sein. */
  const kette = [];
  for (let i = 0; i < 10; i++) {
    await page.keyboard.press("Tab");
    kette.push(await page.evaluate(() => {
      const a = document.activeElement;
      if (!a || a === document.body) return null;
      const r = a.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    }));
  }
  const erreicht = kette.filter(Boolean).length;
  pruefe(erreicht >= 6, g.name + ": der Fokus erreicht mit der Tabulatortaste "
    + "nur " + erreicht + " sichtbare Bedienelemente");

  pruefe(konsole.length === 0, g.name + ": Konsole meldet " + konsole.length
    + " Fehler oder Warnungen: " + konsole.slice(0, 5).join(" | "));
  pruefe(ausnahmen.length === 0, g.name + ": unbehandelte Ausnahme: "
    + ausnahmen.slice(0, 3).join(" | "));
  pruefe(netz.length === 0, g.name + ": das Werkzeug ruft von selbst das Netz "
    + "auf: " + netz.slice(0, 5).join(" | "));

  messwerte[g.name] = { seiten: seiten.length, konsole: konsole.length,
    ausnahmen: ausnahmen.length, netz: netz.length, fokus: erreicht };
  await ctx.close();
}
await browser.close();

console.log(JSON.stringify({ ok: fehler.length === 0, uebersprungen: false,
  anzahl: anzahl, fehler: fehler, messwerte: messwerte }));
