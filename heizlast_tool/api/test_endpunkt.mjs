/* Prüft die Function ohne echten Modellaufruf. fetch wird ersetzt.
 * Die Function antwortet im Datenstrom, damit sie nicht in die Zeitgrenze der
 * serverlosen Umgebung läuft; Fehler kommen deshalb mit Status 200 im
 * Antwortkörper und nicht mehr als HTTP-Status. */
import handler from "./netlify/functions/plan-auslesen.mjs";

let fehler = 0;
const pruefe = (name, bed, zusatz) => {
  if (bed) console.log("  OK   " + name);
  else { console.log("  FEHL " + name + (zusatz ? ": " + zusatz : "")); fehler++; }
};

const BILD = Buffer.from("x".repeat(2000)).toString("base64");
const anfrage = (body, code) => new Request("https://x/", {
  method: "POST",
  headers: { "content-type": "application/json", ...(code ? { "x-werke-code": code } : {}) },
  body: JSON.stringify(body),
});
/** Antwort einlesen; führende Lebenszeichen werden von JSON.parse übergangen. */
const lies = async (r) => JSON.parse(await r.text());
/** Der Systemtext einer aufgezeichneten Anfrage. Seit der Speicher-Markierung
 *  (cache_control) ist system ein Block-Array, kein nackter Text mehr. */
const systemText = (body) => Array.isArray(body.system)
  ? body.system.map((b) => (b && b.text) || "").join("\n")
  : String(body.system || "");

/** Baut einen Datenstrom im Format der Modellschnittstelle. */
function sseAntwort(ereignisse, status) {
  const text = ereignisse.map((e) => "data: " + JSON.stringify(e) + "\n\n").join("");
  return new Response(new ReadableStream({
    start(c) { c.enqueue(new TextEncoder().encode(text)); c.close(); },
  }), { status: status || 200 });
}
const ERGEBNIS = {
  raeume: [{ bezeichnung: "Wohnen", geschoss: "EG", raumart: "Wohnen", flaeche_m2: 24.5,
             lichte_hoehe_m: null, konfidenz: "sicher", fundstellen: "Raumstempel" }],
  massketten: [{ text: "4,20", bedeutung: "Außenwand Süd", einheit: "m" }],
  befunde: [{ thema: "Geschosshöhe", aussage: "2,75 m", herleitung: "Schnitt", konfidenz: "sicher" }],
  gebaeude: { geschosse: "EG, OG", bauweise: "freistehend", dachform: "Satteldach",
              unbeheizte_bereiche: ["Keller"], plankopf: "M 1:100" },
  luecken: ["U-Werte"], hinweise: [],
};
function stromMitErgebnis(obj, stueckzahl) {
  const j = JSON.stringify(obj);
  const n = stueckzahl || 3;
  const teile = [];
  for (let i = 0; i < n; i++) {
    teile.push(j.slice(Math.floor(j.length * i / n), Math.floor(j.length * (i + 1) / n)));
  }
  return sseAntwort([
    { type: "message_start", message: { model: "claude-opus-5",
        usage: { input_tokens: 6800, cache_creation_input_tokens: 11895,
                 cache_read_input_tokens: 0 } } },
    { type: "content_block_start", index: 0 },
    ...teile.map((t) => ({ type: "content_block_delta", index: 0,
                           delta: { type: "input_json_delta", partial_json: t } })),
    { type: "message_delta", delta: { stop_reason: "tool_use" }, usage: { output_tokens: 2900 } },
  ]);
}

process.env.WERKE_CODE = "geheim123";
process.env.WERKE_ANTHROPIC_KEY = "sk-ant-test-1234567890123456789012345678901234567890";
delete process.env.ANTHROPIC_API_KEY;

console.log("Endpunkt-Test");

// Vorabanfrage: Status 204 ohne Inhalt, sonst verwirft der Browser die
// Erlaubnisköpfe und jeder Aufruf von einer anderen Adresse scheitert.
{
  const v = await handler(new Request("https://x/", { method: "OPTIONS" }));
  const inhalt = await v.text();
  pruefe("Vorabanfrage antwortet mit 204", v.status === 204);
  pruefe("Vorabanfrage sendet keinen Inhalt", inhalt === "", "Inhalt: " + JSON.stringify(inhalt));
  pruefe("Vorabanfrage erlaubt den Ursprung",
    v.headers.get("access-control-allow-origin") === "*");
  pruefe("Vorabanfrage erlaubt den Zugangscode-Kopf",
    (v.headers.get("access-control-allow-headers") || "").includes("x-werke-code"));
}

// --- Zugang -------------------------------------------------------------
let r = await handler(anfrage({ bild: BILD }, "falsch"));
pruefe("falscher Zugangscode wird abgewiesen", r.status === 401);
r = await handler(anfrage({}, "geheim123"));
pruefe("fehlendes Bild wird abgewiesen", r.status === 400);
r = await handler(anfrage({ bild: "x".repeat(9 * 1024 * 1024) }, "geheim123"));
pruefe("zu großes Bild wird abgewiesen", r.status === 413);
{
  /* Die Kennung ist der Arbeitsauftrag an das Werkzeug: es verkleinert das
     Bild selbst und sendet erneut. Ohne maschinenlesbare Kennung bliebe nur
     der Meldungstext, und auf Wortlaute baut kein Selbstloesungspfad. */
  const d = await lies(await handler(
    anfrage({ bild: "x".repeat(9 * 1024 * 1024) }, "geheim123")));
  pruefe("zu großes Bild trägt die Kennung bild_zu_gross",
    d.kennung === "bild_zu_gross" && d.max_mb > 0, JSON.stringify(d));
}

// --- Selbstauskunft ------------------------------------------------------
r = await handler(new Request("https://x/", { method: "GET" }));
const auskunft = await r.json();
pruefe("GET liefert Selbstauskunft", r.status === 200 && !!auskunft.dienst);
pruefe("Selbstauskunft nennt keinen Schlüsselwert",
  !JSON.stringify(auskunft).includes(process.env.WERKE_ANTHROPIC_KEY));
pruefe("eigener Schlüssel hat Vorrang", auskunft.verwendet === "WERKE_ANTHROPIC_KEY");
process.env.ANTHROPIC_API_KEY = "eyJhbGciOiJIUzI1NiJ9.beispiel.eines.hoster.tokens.xxxxxxxxxxxx";
r = await handler(new Request("https://x/", { method: "GET" }));
pruefe("Hoster-Token verdrängt den eigenen nicht",
  (await r.json()).verwendet === "WERKE_ANTHROPIC_KEY");
r = await handler(new Request("https://x/", { method: "DELETE" }));
pruefe("andere Methoden werden abgewiesen", r.status === 405);

// --- erfolgreicher Lauf --------------------------------------------------
const echteFetch = globalThis.fetch;
let gesendet = null;
globalThis.fetch = async (url, opt) => {
  gesendet = { url, headers: opt.headers, body: JSON.parse(opt.body) };
  return stromMitErgebnis(ERGEBNIS, 5);
};
r = await handler(anfrage({ bild: BILD, hinweis: "Testobjekt" }, "geheim123"));
const d = await lies(r);
pruefe("erfolgreiche Auswertung", !!(d.raeume && d.raeume.length === 1), JSON.stringify(d).slice(0, 120));
pruefe("die abgelesene Fläche kommt beim Werkzeug an",
  d.raeume && d.raeume[0].flaeche_m2 === 24.5,
  "gelesen: " + JSON.stringify(d.raeume && d.raeume[0]));
pruefe("kein Schema-Schlüssel enthält Umlaute",
  Object.keys(d.raeume[0]).every((k) => !/[äöüÄÖÜß]/.test(k)),
  Object.keys(d.raeume[0]).join(","));
pruefe("Datenstrom wird korrekt zusammengesetzt", d.befunde && d.befunde[0].herleitung === "Schnitt");
pruefe("Verbrauch wird mitgegeben", d._verbrauch && d._verbrauch.eingabe_token === 6800);
/* Der Prompt-Zwischenspeicher: ohne die beiden Felder kann die Kostenanzeige
   im Werkzeug weder den Schreib-Aufschlag noch die Lese-Ersparnis rechnen. */
pruefe("Zwischenspeicher-Verbrauch wird durchgereicht",
  d._verbrauch && d._verbrauch.cache_schreiben_token === 11895
  && d._verbrauch.cache_lesen_token === 0, JSON.stringify(d._verbrauch));
pruefe("Systemtext trägt die Speicher-Markierung (cache_control ephemeral)",
  Array.isArray(gesendet.body.system)
  && gesendet.body.system.length > 0
  && gesendet.body.system[gesendet.body.system.length - 1].cache_control
  && gesendet.body.system[gesendet.body.system.length - 1].cache_control.type
     === "ephemeral", JSON.stringify(gesendet.body.system).slice(0, 120));
pruefe("Streaming ist angefordert", gesendet.body.stream === true);
pruefe("eigener Schlüssel geht raus",
  gesendet.headers["x-api-key"] === "sk-ant-test-1234567890123456789012345678901234567890");
pruefe("Version wird gesetzt", gesendet.headers["anthropic-version"] === "2023-06-01");
pruefe("Modell stimmt", gesendet.body.model === "claude-sonnet-5");
pruefe("Werkzeug wird erzwungen", gesendet.body.tool_choice.name === "planauswertung");
pruefe("Bild wird als Bildblock gesendet", gesendet.body.messages[0].content[0].type === "image");
pruefe("Projektkontext wird übergeben",
  gesendet.body.messages[0].content[1].text.includes("Testobjekt"));
pruefe("Standardbetrieb ist die Blattkunde",
  gesendet.body.tools[0].input_schema.properties.gebaeude !== undefined);
{
  await handler(anfrage({ bild: BILD, modus: "raeume" }, "geheim123"));
  const eig = gesendet.body.tools[0].input_schema.properties;
  pruefe("Betriebsart Räume nutzt das schlanke Schema",
    !!eig.ist_grundriss && !eig.gebaeude && !eig.befunde);
  /* Die Grenze stieg von 1500 auf 2000, als je Raum die Fensterliste dazukam.
     Gemessen wurden rund 90 Ausgabe-Token je Sekunde; 2000 Token sind also rund
     22 s, und bei gut 30 s bricht die serverlose Umgebung ab. Diese Schranke
     darf deshalb nicht weiter steigen, ohne dass neu gemessen wird. */
  /* 3200 seit dem 22.08.2026. Vorher standen hier 2300, und davon kam beim
     A1-Bogen "Dumach 1" NICHTS an: claude-sonnet-5 denkt voreingestellt, die
     Denk-Token zaehlen gegen max_tokens, und das Denken hatte das Budget
     aufgebraucht, bevor der erste Raum geschrieben war. Mit abgeschaltetem
     Denken steht das Budget wirklich der Antwort zur Verfuegung; die harte
     Schranke ist dann die Laufzeit: rund 150 Token je Sekunde, 3200 Token also
     rund 21 s, und die eigene Frist liegt bei 24 s. Wer sie hebt, muss neu
     messen. */
  pruefe("Betriebsart Räume begrenzt die Antwortlänge",
    gesendet.body.max_tokens <= 3200, "max_tokens: " + gesendet.body.max_tokens);
  /* Der teuerste Einzelbefund dieses Endpunkts: ohne diese Zeile denkt das
     Modell und das Budget ist weg, bevor die Antwort anfaengt. */
  pruefe("Betriebsart Räume denkt nicht",
    gesendet.body.thinking && gesendet.body.thinking.type === "disabled",
    JSON.stringify(gesendet.body.thinking));
  const fl = eig.raeume.items.properties.fensterliste;
  pruefe("Betriebsart Räume liefert die Fenster einzeln",
    !!fl && fl.type === "array");
  /* Seit dem 23.08.2026 fuenf Felder: dazugekommen ist die Bauart. Ohne sie
     bekam ein Dachflaechenfenster die Standardhoehe eines stehenden Fensters,
     und ein Hebe-Schiebe-Element wurde nur ueber ist_fenstertuer erkannt. */
  pruefe("Je Fenster: Lage, Breite, Herkunft der Breite, Bauart, Fenstertür",
    !!fl && ["wand", "breite_m", "breite_quelle", "typ", "ist_fenstertuer"]
      .every((k) => k in fl.items.properties)
    && fl.items.required.length === 5);
  pruefe("Die Bauart kennt genau die drei, die KERN_FENSTER unterscheidet",
    !!fl && JSON.stringify(fl.items.properties.typ.enum)
      === JSON.stringify(["fenster", "fenstertuer", "dachflaechenfenster"]));
  pruefe("Die Breite darf fehlen, statt geraten zu werden",
    !!fl && fl.items.properties.breite_m.anyOf.some((x) => x.type === "null")
    && fl.items.properties.breite_quelle.enum.includes("unbekannt"));
  /* Ein Umlaut in einem Schlüssel oder Aufzählungswert hat hier schon einmal
     still die Verbindung zum Werkzeug getrennt. Deshalb die Gegenprobe. */
  pruefe("Fensterschema bleibt in ASCII",
    !/[^\x00-\x7F]/.test(JSON.stringify(Object.keys(fl.items.properties))
      + JSON.stringify(fl.items.properties.wand.enum)
      + JSON.stringify(fl.items.properties.breite_quelle.enum)));
  pruefe("Der Auftrag erklärt die Fensterliste",
    systemText(gesendet.body).includes("ist_fenstertuer")
    && systemText(gesendet.body).includes("geschaetzte Breite ist schaedlicher"));
  pruefe("Betriebsart Räume weist Schnitte ab",
    systemText(gesendet.body).includes("Ebenen eines Schnittes sind keine Raeume"));
  pruefe("Flächenaufstellungen zählen als Raumquelle",
    systemText(gesendet.body).includes("Wohnflaechenberechnung"));
  await handler(anfrage({ bild: BILD, modus: "hoehen" }, "geheim123"));
  const hh = gesendet.body.tools[0].input_schema.properties;
  pruefe("Betriebsart Höhen nutzt ein eigenes Schema",
    !!hh.ist_schnitt && !!hh.hoehen && !hh.raeume && !hh.gebaeude);
  pruefe("Betriebsart Höhen bleibt kurz", gesendet.body.max_tokens <= 1500);
  pruefe("Betriebsart Höhen trennt lichte Höhe und Geschosshöhe",
    systemText(gesendet.body).includes("Fussboden zu Fussboden"));
  await handler(anfrage({ bild: BILD, modus: "kunde" }, "geheim123"));
  pruefe("Blattkunde führt keine Höhen mehr",
    !gesendet.body.tools[0].input_schema.properties.hoehen);
}

/* --- Betriebsart "bewertung": kein Bild, sondern Zahlen ------------------ */
{
  const PAKET = {
    ergebnis: { gebaeudeheizlast: "9,04 kW" },
    bauteilbilanz: [{ name: "Dachschräge", waermestrom: "1.661 W" }],
    offene_punkte: [{ schluessel: "bt_1", titel: "Aufbau klären" }],
  };
  let r2 = await handler(anfrage({ modus: "bewertung" }, "geheim123"));
  pruefe("Bewertung ohne Zahlenpaket wird abgewiesen", r2.status === 400);
  r2 = await handler(anfrage({ modus: "bewertung", daten: PAKET }, "geheim123"));
  pruefe("Bewertung läuft ohne Bild", r2.status === 200);
  const inhalt = gesendet.body.messages[0].content;
  pruefe("Bewertung sendet keinen Bildblock",
    inhalt.every((x) => x.type === "text"));
  pruefe("Das Zahlenpaket geht mit hinaus",
    inhalt[0].text.includes("1.661 W") && inhalt[0].text.includes("bt_1"));
  const bw = gesendet.body.tools[0].input_schema.properties;
  pruefe("Bewertung nutzt ein eigenes Schema",
    !!bw.kap1_punkte && !!bw.kap6_bewertung && !!bw.offene_punkte
    && !bw.raeume && !bw.ist_grundriss);
  pruefe("Bewertung bleibt im Zeitfenster", gesendet.body.max_tokens <= 2000,
    "max_tokens: " + gesendet.body.max_tokens);
  /* Beim Ablesen ist Denken verlorenes Budget, beim Formulieren nicht. Die
     Bewertung schreibt Fliesstext und behaelt es deshalb. */
  pruefe("Bewertung darf weiter denken", !gesendet.body.thinking,
    JSON.stringify(gesendet.body.thinking));
  pruefe("Bewertungsschema bleibt in ASCII",
    !/[^\x00-\x7F]/.test(JSON.stringify(Object.keys(bw))
      + JSON.stringify(Object.keys(bw.kap1_punkte.items.properties))
      + JSON.stringify(Object.keys(bw.offene_punkte.items.properties))));
  /* Die vier Regeln, ohne die der Text unbrauchbar wird. Sie stehen im
     Auftrag und dürfen bei einer Überarbeitung nicht verlorengehen. */
  pruefe("Der Auftrag verbietet erfundene Zahlen",
    systemText(gesendet.body).includes("Erfinde keine Zahl"));
  pruefe("Der Auftrag verbietet Gedankenstriche als Stilmittel",
    systemText(gesendet.body).includes("Keine Gedankenstriche als Stilmittel"));
  pruefe("Der Auftrag verbietet Geräteempfehlungen",
    systemText(gesendet.body).includes("kein Fabrikat"));
  pruefe("Der Auftrag verbietet Selbstbescheinigung der Förderfähigkeit",
    systemText(gesendet.body).includes("Bescheinige nichts")
    && systemText(gesendet.body).includes("nicht \"ist förderfähig\""));
  pruefe("Der Auftrag verlangt Bedeutung statt Lehrbuch",
    systemText(gesendet.body).includes("was diese Heizlast bedeutet"));
  const gross = { fuellung: "x".repeat(500 * 1024) };
  r2 = await handler(anfrage({ modus: "bewertung", daten: gross }, "geheim123"));
  pruefe("Ein zu großes Zahlenpaket wird abgewiesen", r2.status === 413);
  const d413 = await lies(await handler(
    anfrage({ modus: "bewertung", daten: gross }, "geheim123")));
  pruefe("Das zu große Zahlenpaket trägt die Kennung paket_zu_gross",
    d413.kennung === "paket_zu_gross", JSON.stringify(d413));
}

// --- Fehlerfälle ---------------------------------------------------------
globalThis.fetch = async () => new Response(JSON.stringify(
  { error: { message: "credit balance too low" } }), { status: 400 });
pruefe("Modellfehler wird verständlich gemeldet",
  (await lies(await handler(anfrage({ bild: BILD }, "geheim123")))).fehler.includes("credit balance"));

globalThis.fetch = async () => new Response("{}", { status: 429 });
pruefe("Ratenbegrenzung wird gemeldet",
  (await lies(await handler(anfrage({ bild: BILD }, "geheim123"))))
    .fehler.includes("keine weiteren"));

globalThis.fetch = async () => new Response("{}", { status: 401 });
pruefe("abgelehnter Schlüssel wird gemeldet",
  (await lies(await handler(anfrage({ bild: BILD }, "geheim123")))).fehler.includes("abgelehnt"));

globalThis.fetch = async () => sseAntwort([{ type: "message_start", message: { model: "m" } }]);
pruefe("fehlende Struktur wird gemeldet",
  (await lies(await handler(anfrage({ bild: BILD }, "geheim123"))))
    .fehler.includes("Struktur nicht bedient"));

/* Das Modell antwortet in Prosa statt ueber das Werkzeug. Gemessen an der
   Betriebsart "kunde": dreimal hintereinander kam kein einziger
   Werkzeugbaustein an, 18 Sekunden je Aufruf, und der Kollege erfuhr nur
   "Keine strukturierte Antwort erhalten". Steckt die Struktur im Text, wird
   sie herausgeholt; steckt sie nicht darin, steht wenigstens da, was kam. */
{
  const text = "Hier ist die Auswertung:\n```json\n"
    + JSON.stringify({ ist_grundriss: true, raeume: [
        { bezeichnung: "Wohnen", geschoss: "EG", flaeche_m2: 24.5 } ] })
    + "\n```";
  globalThis.fetch = async () => sseAntwort([
    { type: "message_start", message: { model: "m", usage: { input_tokens: 100 } } },
    { type: "content_block_delta", delta: { type: "text_delta", text: text } },
    { type: "message_delta", delta: { stop_reason: "end_turn" }, usage: { output_tokens: 90 } },
  ]);
  const d = await lies(await handler(anfrage({ bild: BILD, modus: "raeume" }, "geheim123")));
  pruefe("Struktur aus einer Prosa-Antwort wird gerettet",
    (d.raeume || []).length === 1 && d._ausText === true, JSON.stringify(d).slice(0, 160));
}
{
  globalThis.fetch = async () => sseAntwort([
    { type: "message_start", message: { model: "m", usage: { input_tokens: 100 } } },
    { type: "content_block_delta", delta: { type: "text_delta",
      text: "Ich kann auf diesem Blatt keine Raeume erkennen." } },
    { type: "message_delta", delta: { stop_reason: "end_turn" }, usage: { output_tokens: 12 } },
  ]);
  const d = await lies(await handler(anfrage({ bild: BILD, modus: "raeume" }, "geheim123")));
  pruefe("sonst steht wenigstens da, was das Modell stattdessen sagte",
    /keine Raeume erkennen/.test(d.fehler || ""), d.fehler);
  pruefe("und der bezahlte Verbrauch geht trotzdem mit hinaus",
    d._verbrauch && d._verbrauch.ausgabe_token === 12, JSON.stringify(d._verbrauch));
}

globalThis.fetch = async () => sseAntwort([
  { type: "message_start", message: { model: "m" } },
  { type: "content_block_delta", delta: { type: "input_json_delta", partial_json: '{"raeume":[' } },
]);
{
  /* Aus '{"raeume":[' laesst sich noch ein leeres, gueltiges Ergebnis machen.
     Das ist richtig so: der Aufrufer bekommt eine lesbare Antwort und den
     Vermerk, dass sie abgeschnitten ist, statt eines Totalverlusts. */
  const d = await lies(await handler(anfrage({ bild: BILD }, "geheim123")));
  pruefe("abgebrochener Datenstrom wird gerettet statt verworfen",
    !d.fehler && Array.isArray(d.raeume) && d.raeume.length === 0 && !!d._abgeschnitten,
    JSON.stringify(d).slice(0, 200));
}

/* ---- Rettung abgeschnittener Antworten -------------------------------- */
{
  const { jsonNotdurft } = await import("./netlify/functions/plan-auslesen.mjs");

  const abgeschnitten = '{"ist_grundriss":true,"raeume":['
    + '{"bezeichnung":"Wohnen","flaeche_m2":24.5},'
    + '{"bezeichnung":"Küche","flaeche_m2":11.2},'
    + '{"bezeichnung":"Ba';
  const g = jsonNotdurft(abgeschnitten);
  pruefe("abgeschnittene Raumliste: die fertigen Räume bleiben",
    g && g.raeume.length === 2 && g.raeume[1].bezeichnung === "Küche" && g.ist_grundriss === true,
    JSON.stringify(g));

  const g2 = jsonNotdurft('{"a":1,"b":{"c":2,"d":');
  pruefe("abgeschnittener Wert: das Feld davor bleibt",
    g2 && g2.a === 1 && g2.b.c === 2 && g2.b.d === undefined, JSON.stringify(g2));

  const g3 = jsonNotdurft('{"raeume":[{"bezeichnung":"Bad \\"innen\\"","flaeche_m2":4.1},{"bez');
  pruefe("Anführungszeichen im Text verwirren den Schnitt nicht",
    g3 && g3.raeume.length === 1 && g3.raeume[0].bezeichnung === 'Bad "innen"',
    JSON.stringify(g3));

  pruefe("vollständiges JSON wird nicht angefasst",
    jsonNotdurft('{"a":1}') === null);
  pruefe("aus Unsinn entsteht kein Ergebnis", jsonNotdurft("völliger Unfug ohne Klammer") === null);
  pruefe("leere Eingabe bleibt leer", jsonNotdurft("") === null);

  /* Die Gegenprobe, die zaehlt: jedes Praefix einer echten Antwort muss
     entweder null oder ein auswertbares Objekt ergeben -- nie etwas Kaputtes. */
  const voll = JSON.stringify(ERGEBNIS);
  let kaputt = 0, gerettet = 0;
  for (let i = 1; i < voll.length; i++) {
    const o = jsonNotdurft(voll.slice(0, i));
    if (o === null) continue;
    if (typeof o !== "object") { kaputt++; continue; }
    try { JSON.parse(JSON.stringify(o)); gerettet++; } catch (e) { kaputt++; }
  }
  pruefe("jedes Präfix einer echten Antwort ergibt entweder nichts oder Gültiges",
    kaputt === 0 && gerettet > 100, kaputt + " kaputt, " + gerettet + " gerettet");

  /* EIN LEERES OBJEKT IST KEINE RETTUNG.
     GEMESSEN am 22.08.2026: brach der Datenstrom in den ersten Zeichen ab,
     stand in roh_eingabe nur "{". Daraus wurde "{}", der Endpunkt meldete
     Status 200 ohne Fehlerfeld, und die zweite Lesung im Werkzeug las das als
     eine gelungene Zaehlung mit dem Ergebnis null -- "die erste Lesung sieht
     13 Raeume, die zweite 0", an einem vollstaendigen Raumbuch. */
  ["{", '{"', '{"bla', "[", "[[", "{ "].forEach((stueck) => {
    pruefe("ein Abbruch in den ersten Zeichen ist keine Rettung: "
      + JSON.stringify(stueck), jsonNotdurft(stueck) === null,
      JSON.stringify(jsonNotdurft(stueck)));
  });
  pruefe("sobald ein Schlüssel vollständig dasteht, wird gerettet",
    JSON.stringify(jsonNotdurft('{"blattart":"grundriss","raeume_bes'))
      === '{"blattart":"grundriss"}',
    JSON.stringify(jsonNotdurft('{"blattart":"grundriss","raeume_bes')));
}

/* Laengengrenze erreicht und nichts mehr zu retten: der Rat muss stimmen.
   "Bitte erneut versuchen" war falsch, weil es deterministisch scheitert. */
globalThis.fetch = async () => sseAntwort([
  { type: "message_start", message: { model: "m" } },
  { type: "content_block_delta", delta: { type: "input_json_delta", partial_json: "kein json" } },
  { type: "message_delta", delta: { stop_reason: "max_tokens" } },
]);
{
  const d = await lies(await handler(anfrage({ bild: BILD }, "geheim123")));
  pruefe("Längengrenze wird als solche benannt",
    d.fehler && d.fehler.includes("Längengrenze") && !d.fehler.includes("erneut versuchen"),
    d.fehler);
  /* Der Arbeitsauftrag geht an das WERKZEUG (Kennung), nicht an den
     Menschen: die fruehere Bitte "in zwei Haelften ablegen" ist ersetzt
     durch die Selbstzerlegung des Klienten. */
  pruefe("Längengrenze trägt die Kennung laengengrenze",
    d.kennung === "laengengrenze", JSON.stringify(d));
  pruefe("Längengrenze beauftragt nicht mehr den Menschen mit dem Teilen",
    !/Hälften ablegen|einzeln ablegen|von Hand erfassen/.test(d.fehler || ""),
    d.fehler);
  /* Der Aufruf ist bezahlt, auch wenn nichts zu retten war. Ohne message_delta
     kam kein output_tokens an; der Endpunkt schaetzt dann aus dem
     Angekommenen und kennzeichnet die Schaetzung. GEMESSEN am 24.08.2026:
     vier von fuenf kunde-Aufrufen ohne ausgabe_token, Anzeige 0,45 $ bei
     real 0,59 $. */
  pruefe("Längengrenze gibt den bezahlten Verbrauch trotzdem mit hinaus",
    d._verbrauch && d._verbrauch.ausgabe_token > 0
    && d._verbrauch.ausgabe_geschaetzt === true, JSON.stringify(d._verbrauch));
}

/* Die Laufzeitgrenze der Umgebung.
   GEMESSEN am 22.08.2026 gegen den laufenden Endpunkt: derselbe A3-Grundriss
   in der Betriebsart "kunde" wurde nach 31,3 s abgeschnitten und lieferte
   einen VOLLSTAENDIG LEEREN Koerper -- keine Raeume, keine Fehlermeldung.
   Die Funktion setzt sich jetzt eine eigene, kuerzere Frist und rettet, was
   bis dahin angekommen ist. Hier mit 300 ms Frist und einem Datenstrom, der
   sich Zeit laesst, nachgestellt. */
process.env.WERKE_FRIST_MS = "300";
function langsamerStrom(teile, pauseMs) {
  return new Response(new ReadableStream({
    async start(c) {
      const geber = new TextEncoder();
      for (const e of teile) {
        c.enqueue(geber.encode("data: " + JSON.stringify(e) + "\n\n"));
        await new Promise((w) => setTimeout(w, pauseMs));
      }
      c.close();
    },
  }), { status: 200 });
}
{
  const halb = JSON.stringify({ ist_grundriss: true, raeume: [
    { bezeichnung: "Wohnen", geschoss: "EG", raumart: "Wohnen", flaeche_m2: 24.5 },
    { bezeichnung: "Kueche", geschoss: "EG", raumart: "Kueche", flaeche_m2: 12.0 },
    { bezeichnung: "Bad", geschoss: "EG", raumart: "Bad", flaeche_m2: 8.4 } ] });
  globalThis.fetch = async () => langsamerStrom([
    { type: "message_start", message: { model: "m", usage: { input_tokens: 7000 } } },
    { type: "content_block_delta", delta: { type: "input_json_delta",
        partial_json: halb.slice(0, halb.length - 40) } },
    { type: "content_block_delta", delta: { type: "input_json_delta",
        partial_json: halb.slice(halb.length - 40) } },
    { type: "message_delta", delta: { stop_reason: "tool_use" }, usage: { output_tokens: 900 } },
  ], 250);
  const d = await lies(await handler(anfrage({ bild: BILD, modus: "raeume" }, "geheim123")));
  pruefe("nach Ablauf der Frist kommt das bis dahin Gelesene an",
    Array.isArray(d.raeume) && d.raeume.length >= 1, JSON.stringify(d).slice(0, 200));
  pruefe("und der Abbruch wird als Zeitgrenze benannt",
    d._abgeschnitten && d._abgeschnitten.grund === "zeit",
    JSON.stringify(d._abgeschnitten));
  /* DIE ZWEI GRENZEN MUESSEN GETRENNT ABLESBAR SEIN.
     In den Aufzeichnungen vom 25./26.08.2026 stehen drei Lesungen auf
     ausgabe_token EXAKT 2500 -- dem Deckel der Betriebsart "kunde" -- und
     tragen trotzdem grund "zeit", weil die Frist Vorrang hat. Aus der Datei
     allein war nicht zu entscheiden, ob ein hoeherer Deckel oder ein
     kuerzeres Blatt geholfen haette. Deshalb liegen jetzt beide Rohbefunde
     daneben. Faellt das wieder heraus, verdeckt sich die Diagnose selbst. */
  pruefe("beide Grenzen stehen einzeln daneben, nicht nur die gewinnende",
    d._abgeschnitten
    && d._abgeschnitten.frist_abgelaufen === true
    && d._abgeschnitten.deckel_erreicht === false
    && d._abgeschnitten.deckel_token === 3200
    && typeof d._abgeschnitten.sekunden_genau === "number",
    JSON.stringify(d._abgeschnitten));
  pruefe("der Verbrauch nennt die Betriebsart, den Deckel und die Frist",
    d._verbrauch && d._verbrauch.modus === "raeume"
    && d._verbrauch.deckel_token === 3200
    && d._verbrauch.frist_ms === 300
    && typeof d._verbrauch.sekunden === "number",
    JSON.stringify(d._verbrauch));
}
{
  /* DIE ZWEITE MELDESTELLE: der RETTUNGSPFAD.
     Am 27.08.2026 im Echtlauf aufgefallen und teuer: die Zusatzbefunde
     standen im Code, kamen aber leer an. Grund war, dass es ZWEI Stellen
     gibt, die einen Abbruch melden -- die fuer die vollstaendig gelesene
     Antwort (oben) und diese hier fuer die aus Bruchstuecken gerettete.
     Nur die erste war ergaenzt, und ausgerechnet die feuert selten: eine
     an der Uhr abgeschnittene Antwort ist fast immer unvollstaendiges
     JSON und laeuft durch jsonNotdurft. Dieser Test haelt beide zusammen. */
  const halb2 = '{"ist_grundriss":true,"raeume":[{"bezeichnung":"Wohnen",'
    + '"geschoss":"EG","raumart":"Wohnen","flaeche_m2":24.5},'
    + '{"bezeichnung":"Kueche","geschoss":"EG","raumart":"Kue';
  globalThis.fetch = async () => langsamerStrom([
    { type: "message_start", message: { model: "m", usage: { input_tokens: 7000 } } },
    { type: "content_block_delta", delta: { type: "input_json_delta",
        partial_json: halb2 } },
    { type: "content_block_delta", delta: { type: "input_json_delta",
        partial_json: "" } },
  ], 250);
  const d = await lies(await handler(anfrage({ bild: BILD, modus: "raeume" }, "geheim123")));
  pruefe("aus einer abgerissenen Antwort wird gerettet, was dasteht",
    Array.isArray(d.raeume) && d.raeume.length >= 1, JSON.stringify(d).slice(0, 200));
  pruefe("AUCH der Rettungspfad meldet beide Grenzen einzeln",
    d._abgeschnitten && d._abgeschnitten.grund === "zeit"
    && d._abgeschnitten.frist_abgelaufen === true
    && d._abgeschnitten.deckel_erreicht === false
    && d._abgeschnitten.deckel_token === 3200
    && typeof d._abgeschnitten.sekunden_genau === "number",
    JSON.stringify(d._abgeschnitten));
  pruefe("und der Rettungspfad nennt die Betriebsart im Verbrauch",
    d._verbrauch && d._verbrauch.modus === "raeume",
    JSON.stringify(d._verbrauch));
}
{
  /* GEGENPROBE ZUR GEGENPROBE: laeuft ein Aufruf in den DECKEL statt in die
     Uhr, muss deckel_erreicht wahr und frist_abgelaufen falsch sein. Ohne
     diesen Fall koennte deckel_erreicht dauerhaft falsch verdrahtet sein und
     der Test oben wuerde es nicht merken. */
  delete process.env.WERKE_FRIST_MS;
  const voll = JSON.stringify({ ist_grundriss: true, raeume: [
    { bezeichnung: "Wohnen", geschoss: "EG", raumart: "Wohnen", flaeche_m2: 24.5 } ] });
  globalThis.fetch = async () => sseAntwort([
    { type: "message_start", message: { model: "m", usage: { input_tokens: 7000 } } },
    { type: "content_block_delta", delta: { type: "input_json_delta", partial_json: voll } },
    { type: "message_delta", delta: { stop_reason: "max_tokens" }, usage: { output_tokens: 3200 } },
  ]);
  const d = await lies(await handler(anfrage({ bild: BILD, modus: "raeume" }, "geheim123")));
  pruefe("die Laengengrenze wird als solche erkannt, nicht als Zeit",
    d._abgeschnitten && d._abgeschnitten.grund === "max_tokens"
    && d._abgeschnitten.deckel_erreicht === true
    && d._abgeschnitten.frist_abgelaufen === false
    && d._abgeschnitten.stopgrund === "max_tokens",
    JSON.stringify(d._abgeschnitten));
  process.env.WERKE_FRIST_MS = "300";
}
{
  /* Kommt bis zum Ablauf gar nichts, muss es eine Meldung geben statt einer
     leeren Antwort. */
  globalThis.fetch = async () => langsamerStrom([
    { type: "message_start", message: { model: "m" } },
    { type: "content_block_delta", delta: { type: "input_json_delta", partial_json: "" } },
  ], 400);
  const d = await lies(await handler(anfrage({ bild: BILD, modus: "raeume" }, "geheim123")));
  pruefe("ohne jeden Inhalt sagt der Endpunkt, woran es lag",
    d.fehler && /länger/.test(d.fehler), d.fehler);
  pruefe("und der Abbruch trägt die Kennung zeitgrenze",
    d.kennung === "zeitgrenze", JSON.stringify(d));
  pruefe("die Zeitgrenze beauftragt nicht mehr den Menschen mit dem Teilen",
    !/Hälften ablegen|einzeln ablegen/.test(d.fehler || ""), d.fehler);
}
delete process.env.WERKE_FRIST_MS;

globalThis.fetch = async () => sseAntwort([{ type: "error", error: { message: "overloaded" } }]);
pruefe("Fehler im Datenstrom wird gemeldet",
  (await lies(await handler(anfrage({ bild: BILD }, "geheim123")))).fehler.includes("overloaded"));

globalThis.fetch = async () => { throw new Error("Netz weg"); };
pruefe("Netzfehler wird gemeldet",
  (await lies(await handler(anfrage({ bild: BILD }, "geheim123")))).fehler.includes("Netz weg"));

/* Die Huelle, in die das Modell die Antwort manchmal einwickelt.
   GEMESSEN am Blatt "4.1.1.8 BT 2_3_4 - EG": viermal hintereinander kam
   {"planauswertung":{...}} statt des blossen Inhalts. Das Werkzeug liest
   d.raeume; eingewickelt war das Blatt "nichts zurueckgegeben". */
{
  globalThis.fetch = async () => stromMitErgebnis(
    { planauswertung: { ist_grundriss: true, raeume: [
      { bezeichnung: "Wohnen", geschoss: "EG", flaeche_m2: 24.5 } ] } }, 2);
  const d = await lies(await handler(anfrage({ bild: BILD, modus: "raeume" }, "geheim123")));
  pruefe("eine in den Werkzeugnamen eingewickelte Antwort wird ausgepackt",
    d.ist_grundriss === true && (d.raeume || []).length === 1,
    JSON.stringify(d).slice(0, 160));
}
{
  /* Eng gefasst: was NICHT genau so aussieht, bleibt unberuehrt. */
  globalThis.fetch = async () => stromMitErgebnis(
    { ist_grundriss: true, raeume: [], planauswertung: { x: 1 } }, 2);
  const d = await lies(await handler(anfrage({ bild: BILD, modus: "raeume" }, "geheim123")));
  pruefe("eine echte Antwort wird nicht versehentlich ausgepackt",
    d.ist_grundriss === true && !!d.planauswertung, JSON.stringify(d).slice(0, 160));
}

/* Wiederholen genau dort, wo es hilft. Eine Ueberlastung ist voruebergehend,
   ein abgelehnter Schluessel nicht. */
{
  let rufe = 0;
  globalThis.fetch = async () => {
    rufe++;
    if (rufe === 1) return new Response('{"error":{"message":"overloaded"}}', { status: 529 });
    return stromMitErgebnis({ ist_grundriss: true, raeume: [
      { bezeichnung: "Bad", geschoss: "EG", flaeche_m2: 8.4 } ] }, 2);
  };
  const d = await lies(await handler(anfrage({ bild: BILD, modus: "raeume" }, "geheim123")));
  pruefe("eine Ueberlastung wird selbst wiederholt", rufe === 2 && (d.raeume || []).length === 1,
    "Aufrufe: " + rufe + " " + JSON.stringify(d.fehler || ""));
}
{
  let rufe = 0;
  globalThis.fetch = async () => {
    rufe++;
    return new Response('{"error":{"message":"invalid key"}}', { status: 401 });
  };
  const d = await lies(await handler(anfrage({ bild: BILD, modus: "raeume" }, "geheim123")));
  pruefe("ein abgelehnter Schlüssel wird NICHT wiederholt", rufe === 1 && !!d.fehler,
    "Aufrufe: " + rufe);
}
{
  let rufe = 0;
  globalThis.fetch = async () => {
    rufe++;
    return new Response('{"error":{"message":"rate"}}', { status: 429 });
  };
  const d = await lies(await handler(anfrage({ bild: BILD, modus: "raeume" }, "geheim123")));
  pruefe("nach zwei Anläufen ist Schluss und der Kollege erfährt es",
    rufe === 2 && /zweiter Anlauf/.test(d.fehler || ""), "Aufrufe: " + rufe + " " + d.fehler);
}

/* Ein Grundriss darf nicht daran scheitern, dass die Aussenanlage daneben
   liegt oder die Raeume unbeschriftet sind. */
{
  globalThis.fetch = async (url, opt) => {
    gesendet = { url, headers: opt.headers, body: JSON.parse(opt.body) };
    return stromMitErgebnis({ ist_grundriss: true, raeume: [] }, 2);
  };
  await handler(anfrage({ bild: BILD, modus: "raeume" }, "geheim123"));
  const auftrag = systemText(gesendet.body);
  pruefe("der Auftrag laesst Aussenanlage und Grundriss auf einem Blatt zu",
    /Aussenanlage/.test(auftrag) && /Bordanlage|Lageplan/.test(auftrag));
  pruefe("unbeschriftete Raeume machen aus einem Grundriss keinen Nicht-Grundriss",
    /nicht beschriftet/.test(auftrag));
  pruefe("der teuerste Fehler steht im Auftrag benannt",
    /teuerste Fehler/.test(auftrag));
}

/* ---------------------------------------------------------------------------
 * Die zweite Lesung: Betriebsart "gegenprobe"
 * ---------------------------------------------------------------------------
 * Sie ist nur so lange eine Probe, wie sie nichts von der ersten Lesung
 * weiss. Diese Pruefungen halten genau das fest -- eine spaetere Bequemlichkeit
 * ("wir geben ihr den Kontext mit, dann wird sie genauer") wuerde den ganzen
 * Zweck aufheben, und zwar lautlos.
 * ------------------------------------------------------------------------- */
{
  globalThis.fetch = async (url, opt) => {
    gesendet = { url, headers: opt.headers, body: JSON.parse(opt.body) };
    return stromMitErgebnis({
      blattart: "grundriss", raeume_beschriftet: 6,
      raumnamen: ["Wohnen", "Küche", "Bad", "Flur", "Kind", "Schlafen"],
      fenster_gesamt: 7,
      ebenen: [{ bezeichnung: "EG", gezeichnet: true, raeume_beschriftet: 6,
                 raumnamen: ["Wohnen", "Küche", "Bad", "Flur", "Kind", "Schlafen"],
                 fenster: 7, aussen_breite_m: 11.95, aussen_tiefe_m: 9.4,
                 aussen_wortlaut: "11,95" }],
      unbeheizt_benannt: [], unbeheizt_unbenannt: 0,
      nordpfeil: { vorhanden: true, richtung: "oben" },
    }, 2);
  };
  const d = await lies(await handler(anfrage(
    { bild: BILD, modus: "gegenprobe", hinweis: "Wohnhaus Ziolkowski, Baujahr 1936" },
    "geheim123")));
  pruefe("die Gegenprobe liefert ihre Zaehlung zurueck",
    d.ebenen[0].raumnamen.length === 6, JSON.stringify(d).slice(0, 120));
  pruefe("die Gegenprobe liefert die Aussenbemassung JE EBENE mit",
    d.ebenen && d.ebenen[0] && d.ebenen[0].aussen_breite_m === 11.95);

  const auftrag = systemText(gesendet.body);
  const text = gesendet.body.messages[0].content
    .filter((x) => x.type === "text").map((x) => x.text).join(" ");
  pruefe("die Gegenprobe bekommt einen ZAEHL-Auftrag, keinen Ausleseauftrag",
    /Zaehlaufgabe/.test(auftrag) && !/Lies diesen Grundriss aus/.test(text), text);
  pruefe("UNABHAENGIGKEIT: kein Projektkontext geht mit hinaus",
    !/Ziolkowski|Baujahr/.test(text) && !/Ziolkowski/.test(auftrag), text);
  pruefe("UNABHAENGIGKEIT: das Ergebnis der ersten Lesung geht nicht mit hinaus",
    !/raeume|flaeche_m2/i.test(text), text);
  pruefe("die Gegenprobe denkt nicht mit; das Budget gehoert der Antwort",
    gesendet.body.thinking && gesendet.body.thinking.type === "disabled");
  pruefe("die Gegenprobe bleibt kurz und damit im Zeitfenster",
    gesendet.body.max_tokens === 1200, String(gesendet.body.max_tokens));
  pruefe("die Gegenprobe fragt nach dem, was die offenen Fragen beantwortet",
    ["raumnamen", "fenster_gesamt", "ebenen", "unbeheizt_benannt", "nordpfeil"]
      .every((k) => gesendet.body.tools[0].input_schema.required.indexOf(k) >= 0));
  /* KEINE ZAHL NEBEN DER LISTE. Neun echte Lesungen desselben Blattes haben
     gezeigt, dass die Namensliste reproduzierbar ist und die Zahl daneben
     nicht (11 · 11 · 13 · 14 · 14 gegen neunmal dieselben 13 Namen). Zwei
     Schaetzer derselben Groesse, von denen einer nicht belegbar ist, sind
     eine Fehlalarmmaschine. Das Feld ist deshalb weg und darf nicht
     zurueckkommen. */
  pruefe("die Gegenprobe fragt NICHT nach einer Raumzahl neben der Liste",
    !("raeume_beschriftet" in gesendet.body.tools[0].input_schema.properties)
    && !("raeume_beschriftet" in gesendet.body.tools[0].input_schema
          .properties.ebenen.items.properties));
  /* Die Zahlen gehoeren der EBENE und nicht dem Blatt. Ein A3-Bogen traegt
     drei Grundrisse; eine Zahl je Blatt waere fuer jedes einzelne Geschoss
     falsch. Am echten Blatt "BV 2-0887 Ziolkowski" gelernt. */
  pruefe("die Gegenprobe zaehlt JE EBENE, nicht je Blatt",
    ["raumnamen", "fenster", "aussen_breite_m",
     "aussen_tiefe_m"]
      .every((k) => gesendet.body.tools[0].input_schema
        .properties.ebenen.items.required.indexOf(k) >= 0));
  pruefe("die Gegenprobe fragt NICHT nach Flaechen; sie zaehlt, sie wertet nicht aus",
    !("flaeche_m2" in gesendet.body.tools[0].input_schema.properties));
  /* DIE ANSICHT LIEFERT AUCH DIE GROESSE. Sie ist die einzige Zeichnung, die
     eine Oeffnung in wahrer Groesse zeigt; der Grundriss zeigt die Hoehe nie.
     Gefragt wird nach ANTEILEN an der Fassadenbreite und nicht nach Metern:
     ein Anteil im Bild ist ablesbar, ein Meterwert waere geraten. */
  const ans = gesendet.body.tools[0].input_schema.properties.ansichten;
  pruefe("die Ansicht liefert je Oeffnung ein Mass, nicht nur eine Zahl",
    !!ans && ["fassade", "fenster", "breite_bezug_m", "oeffnungen"]
      .every((k) => ans.items.required.indexOf(k) >= 0));
  /* Die Fassadenbezeichnung braucht einen Beleg: den Wortlaut der
     Beschriftung. Gemessen am 24.08.2026: "Fassade West" gemeldet, auf dem
     Blatt gibt es nur Nord/Ost/Sued. */
  pruefe("die Ansicht muss den Wortlaut ihrer Beschriftung mitliefern",
    !!ans && ans.items.required.indexOf("fassade_wortlaut") >= 0
    && ans.items.properties.fassade_wortlaut.anyOf
      .some((x) => x.type === "null"));
  pruefe("die Oeffnung wird als Anteil gemessen, nicht in Metern",
    !!ans && ["breite_anteil", "hoehe_anteil", "geschoss", "ist_tuer"]
      .every((k) => k in ans.items.properties.oeffnungen.items.properties)
    && !("breite_m" in ans.items.properties.oeffnungen.items.properties));
  pruefe("die Fassadenbreite darf fehlen, statt geraten zu werden",
    !!ans && ans.items.properties.breite_bezug_m.anyOf
      .some((x) => x.type === "null"));
  pruefe("der Auftrag verlangt eine ganze Oeffnungsliste oder gar keine",
    systemText(gesendet.body).includes("LEERE Liste"));
}

delete process.env.WERKE_CODE;
r = await handler(anfrage({ bild: BILD }, "geheim123"));
pruefe("ohne gesetzten Code bleibt der Endpunkt zu", r.status === 401);

globalThis.fetch = echteFetch;
console.log(fehler === 0 ? "\nAlle Prüfungen bestanden." : "\n" + fehler + " Prüfungen fehlgeschlagen.");
process.exit(fehler === 0 ? 0 : 1);
