# Protokolle der Fünf-Plan-Prüfung vom 26.08.2026
Der Lauf brach in der Behebungsphase ab. Diese Befunde sind NICHT behoben,
soweit der letzte Abschnitt nichts anderes sagt.



## Protokoll 1

Tab 1507704195 (Chrome) ließ sich am Ende nicht mehr schließen und bleibt mit dem Lauf offen.

**PROTOKOLL — 260514 Dumach 1, A1 hoch, 1 Blatt, Live-Seite**
1. Ablage ohne Eingabe: Urteil „Die Unterlagen sind für die Berechnung geeignet" nach rund 2 Min (15:15:50→15:17:50), 8 Lesungen. Zerlegung sichtbar: Raumliste → zweite Lesung → Zusatzangaben → Feld 1/Feld 2 → Feld 1 Hälfte 1/Hälfte 2. Keine Zu-groß-Meldung, Maßstab 1:100 belegt.
2. Zahlen: 3 Geschosse, 25 Räume, 370,44 m². Handzählung im Textstand des PDF: EG 12 + OG 11 + DG 2 = 25, Summe 370,44 m² — jede Einzelfläche stimmt. Fenster 7 (siehe K4).
3. Rückfragen: 8, davon 7 mit Wert-Vorschlag und gleichwertigem [Übernehmen]/[Ablehnen] je ein Klick. 1 ohne Vorschlag (Baujahr) — mit begründeter Ausnahme und sofortigem Feld. Vorschlagspflicht formal erfüllt.
4. Alle 7 übernommen → 22,45 kW · 60,6 W/m² · Transmission 17.376 W · Lüftung 5.074 W · Ampel „Mit Einschränkung belastbar, 0 Fehler, 1 offene Frage, 2 Hinweise".
5. Handprobe EG Kochen/Essen/Wohnen 39,24 m²: AW 15,09·1,10·30,7 = 509,6 W + Fe 6,54·2,90·30,7 = 582,2 W + KD 39,24·1,10·15,3 = 660,4 W + Lüftung 0,34·0,5·102,02·30,7 = 532,4 W = 2.284,6 W gegen 2.287 W im Bericht → 0,1 %. Rechenkern sauber.
6. Berichte: Druck 192.707 Z., intern 248.362 Z. Beide ohne undefined/NaN/Infinity/„Warnung". Druck ohne Konfidenz/Spanne/BEG (je 0×), intern mit 6/15/6 — wie gefordert. Keine Konsolenfehler.
7. Unterschreibbar? **Nein.** Die Gebäudesumme ist plausibel, die Herleitung im Druckbericht ist es nicht (B2) und die Raumwerte tragen nicht (B4, M3).

**BEFUNDE**
- **B1 Blocker** — Ablehnen bringt kein Feld. Frage „Fläche": Felder vorher 0, nachher 0, dazu der Text „der Wert kommt aus dem Feld darunter". Gilt für alle kb-Fragen. Ursache: `src/app.js:7986` rendert nur `if (f.eingabe && vorschlagFeldZeigen(f))`; `eingabe:` existiert im ganzen app.js nur 7×, u. a. NICHT bei `id:"flaeche"` (7673) und `id:"we"` (7703). Punkt (a) bestätigt und breiter als gemeldet.
- **B2 Blocker** — Der Druckbericht verschweigt die Baujahr-Annahme. „Annahme", „angenommen", „1969", „Typologie" kommen 0× vor; Kap. 4 listet U 1,00/0,50/1,00/2,80 nur mit „als ganze Zahl angesetzt". Die Oberfläche sagt dazu: Klasse bis 1859 ergäbe 40,58 kW statt 22,45 kW (+81 %). Die Rückfragenkarte verspricht ausdrücklich „beides steht im Bericht".
- **B3 Blocker** — Rückfrage „Fläche" erfindet 10 Abweichungen durch reinen Namensabgleich: „Für 'Bad' 9,04 gelesen, im Plan steht 9,39", „Flur 7,52 vs 5,94", „Kochen/Essen 21,62 vs 29,84". Beide Zahlen stehen im Plan, es sind verschiedene Räume in verschiedenen Wohnungen. Dazu der Satz „Es gilt die Zahl aus dem Plan" — die Flächen selbst blieben zum Glück korrekt.
- **B4 Blocker** — Der übernommene DG-Vorschlag ändert die strittige Größe nicht: „DG 14,68 × 11,01 m, Umfang 51,38 m" (= 133,6 m² Fassade bei 2,60 m), die DG-Räume tragen nach dem Übernehmen weiter 17,6 + 10,0 = 27,6 m² Außenwand. Der Vorschlag sagt es selbst („Die Wandlängen bleiben unverändert"), die Frage verschwindet trotzdem aus der Liste. Größenordnung der Lücke: (133,6−27,6)·1,10·30,7 ≈ 3,6 kW ≈ +16 % auf das Ergebnis.
- **B5 Blocker** — Die Selbstprüfung prüft andere Flächen als der Bericht rechnet: Befund „29,18 m² Fenster auf 215,93 m² Fassade, das sind 14 Prozent"; im Rechenmodell stehen 45,8 m² Fenster und 316,2 m² Fassade (Summe über alle Raumbauteile). Der grüne Haken belegt damit Zahlen, die nicht im Ergebnis stehen.
- **M mittel** — Vier Wohnungen (WHG1–WHG4 stehen im Plan) landen in einer einzigen Einheit „WE 1"; die Selbstprüfung meldet dazu „Alle Räume sind zugeordnet". Der Lüftungsberechnung fehlt der Einheitenbezug, den die Frage `id:"we"` selbst einfordert.
- **M mittel** — „TRH" wird Raumart „wohnen", θi 20 °C statt Treppenhaus. `src/modul_ki.js:471` kennt `\bth\b`, `:814` die Kurzform „TH" — „TRH" fällt durch beide Raster. Betrifft 2×9,94 m².
- **M mittel** — Gleiche Räume, ungleiche Hülle: DG Studio 45,96 m² → 1.981 W (AW 17,6, kein Fenster) gegen DG Studio 45,96 m² → 2.404 W (AW 10,0 + Fe 7,7); EG TRH 303 W gegen OG TRH 584 W. EG Kochen 29,84 m² bekommt 51,7 m² Außenwand — bei 2,60 m sind das 19,9 m, also fast der ganze Raumumfang, obwohl der Raum an Flur, HWR und Bad grenzt — und liegt mit 3.096 W über dem größeren 39,24-m²-Raum mit 2.287 W.
- **M mittel** — Baujahr steht doppelt: Der Rückfall „Bestandsklasse 1969 bis 1978" ist übernommen, die harte Sperre „Aus welchem Jahr stammt das Gebäude? · ohne Antwort entsteht keine belastbare Zahl" bleibt als einzige offene Frage stehen. Gleichzeitig meldet die Seite „Pflichtangaben: Alle liegen vor" und der Bericht erzeugt sich mit `sperren: []`. Drei Aussagen, drei Richtungen.
- **M mittel** — ΦT innen ist in allen 25 Zeilen der Raumtabelle 0, obwohl θi zwischen 15 °C (HWR), 20 °C und 24 °C (Bad) springt. Kein Raum trägt ein Innenbauteil.
- **M mittel** — Zeitstempel in UTC: Übernehmen/Ablehnen vermerkt „2026-08-26 13:27", tatsächlich 15:27 MESZ. `src/app.js:10948` (und 10921) nutzen `toISOString()`. Der Vermerk wandert mit ins Dokument.
- **K klein** — „Raumliste unvollständig" bleibt als Rückfrage („12 Räume angekommen, danach bricht die Antwort ab … mindestens ein Teil blieb unvollständig"), obwohl die zusammengeführte Liste mit 25/25 gegen den Plan vollständig ist. Falscher Alarm nach erfolgreicher Zerlegung.
- **K klein** — Zwei Zahlenwidersprüche im Text: „Die Summe der Raumheizlasten … ist größer als die Gebäudeheizlast" — beide sind 22,45 kW; und „100 Prozent der Fensterfläche (29,19 von 29,18 m²)", Zähler über Nenner.
- **K klein** — Kachel „FENSTER ERFASST 7" neben dem Hinweis, dass 100 % der Fensterfläche angenommen ist; nur 5 von 25 Räumen tragen überhaupt Fenster (1/1/2/2/1), beide DG-Studios und alle Bäder außer einem gehen leer aus.
- **K klein** — Analysekosten erscheinen nur während des Laufs („ca. 0,29 $" bei 6 von 8 Lesungen), nach dem Urteil ist die Endsumme nirgends mehr abrufbar und wird auch nicht im Projekt gespeichert. Budget gehalten, aber nicht belegbar.
- **K klein** — Der Wechsel zwischen Rückfragen friert den Tab messbar ein: 1.836 ms, 1.893 ms, 3.990 ms synchron um `.click()` gemessen. Bei Last aus Parallel-Tabs lief eine Auswertung in den 45-s-Timeout.
- **K klein** — `?frisch=1` räumt den alten Stand nicht weg; das Banner „Ein nicht abgeschlossener Stand liegt vor" stand über den ganzen Lauf mit fremdem Projektnamen über der Seite. Nachgestellt und nicht reproduziert: der erste Versuch (15:14) starb mitten in der Analyse samt Tab — vermutlich Speicherdruck durch vier Parallel-Tabs, beim zweiten Anlauf trat es nicht wieder auf.

## Protokoll 2

**PROTOKOLL — BV 2-0887 Ziolkowski, LIVE amazing-axolotl-219e82.netlify.app, zwei Läufe hintereinander**
Lauf A 15:15:26 abgelegt → 15:17:40 Urteil (2:14 min, 11 Lesungen, zuletzt abgelesen 0,39 $). Lauf B 15:33:55 → 15:35:47 (1:52 min, 11 Lesungen, zuletzt 0,44 $). Davor ein Fehlstart über 0,24 $, weil ein fremder Vorgang meinen Tab schloss — Gesamtausgabe für dieses Blatt daher rund 1,2 $ und damit über der 1-$-Marke. Kein Zugangscode wurde abgefragt (Schlüssel lag im Browser).
Urteil, nachgezählt am Blatt: 3 Geschosse, 13 Räume, 188,04 m² — in beiden Läufen identisch und deckungsgleich mit den Stempeln (KG 17,99+21,20; EG 12,16+2,17+13,41+16,20+12,10+18,68; OG 14,35+11,78+10,81+18,60+18,59). Fenster: Kennzahl 6 (A) bzw. 10 (B), tatsächlich angesetzt 11 bzw. 14 Bauteile, Fensterfläche aber 21,07 vs. 21,08 m².
Rückfragen: A fünf, B vier; ohne Vorschlag genau eine (Baujahr in A, mit ausdrücklicher Begründung). Übernehmen ein Klick, Ablehnen ein Klick, gleichwertig platziert.
Nach Annahme aller Vorschläge (Baujahr in A von mir mit 2022 eingetragen, in B vom Werkzeug selbst gesetzt): 6,92 kW · 36,8 W/m² · Ampel grün „Belastbar" · 0 Fehler · 3 Hinweise — in beiden Läufen.
Handprobe OG KIND I: AW 25,02·(0,27+0,10)·30,7 K = 284 W; Fenster 3,10·1,40·30,7 = 133 W; Dach 18,60·0,34·27,6 K (Spitzboden −7,6 °C) = 175 W; Lüftung 0,34·0,5·18,60·2,52·30,7 = 245 W → 837 W. Werkzeug: 837 W. Deckungsgleich.
Berichte: Druckfassung beider Läufe frei von undefined, NaN, Infinity, [object Object], „Warnung", Konfidenz, Spanne und BEG. Interne Fassung führt Konfidenz/Spanne/BEG erwartungsgemäß; „Warnung" nur in Klassennamen, nicht im Text.

**BEFUNDE**
1 · BLOCKER · Druckfassung Abschnitt 2 „Außenmaße EG 8,00 × 6,00 m": falsch. Die senkrechte Maßkette lautet 1,00 + 5,50 + 6,00 = 12,50 m; das OG liest dasselbe Werkzeug korrekt als 8,00 × 12,50. Zustandsfeld: „8 m mal 6 m („3.50 + 8.00 / 6.00")" — die waagerechte Kette wird addiert, die senkrechte nicht. Im unterschriebenen Bericht stehen damit 48 m² Grundfläche neben 74,72 m² Raumfläche desselben Geschosses. Beide Läufe.
2 · BLOCKER-nah · Der Vorschlag „8,00 × 6,00 m übernehmen" meldet „1 Geschoss mit den abgelesenen Außenmaßen belegt", wirkt aber nicht: umfangsabgleich EG bleibt art „hochrechnung", U_soll 41,16 m, Wandlänge WOHNEN 11,55 m, Heizlast unverändert. Die vom Werkzeug selbst genannte Abhilfe greift nicht. Beide Läufe.
3 · BLOCKER-nah · Raumweise Heizlast nicht reproduzierbar: KG KELLER 480 → 431 W (−10 %), KG FLUR 446 → 495 W (+11 %), EG WOHNEN 712 → 753 W, EG ESSEN 638 → 674 W, EG GAST 515 → 491 W; OG in allen fünf Räumen identisch. Gebäudewert stabil (6.922 → 6.919 W, 0,04 %). Genau diese Spalte nennt der Bericht „maßgebend für die Auslegung der Heizflächen".
4 · mittel · Rückfrage „Beheizt oder unbeheizt: KELLERGESCHOSS": Vorschlagszeile und Knopf lauten „0,00 Räume als richtig anerkennen". Betroffen sind 2 Räume mit 39,19 m². Beide Läufe.
5 · mittel · Punkt (a) BESTÄTIGT: nach „Ablehnen, selbst eintragen" steht „der Wert kommt aus dem Feld darunter" und die Meldung „Das Feld für den eigenen Wert steht jetzt darunter." Darunter stehen nur drei Knöpfe, kein Feld. Bei dieser Frage ist die Antwort eine Wahl, kein Wert — der Vermerktext passt nicht zum Fragetyp.
6 · mittel · Zeitstempel der Ablehnung „2026-08-26 13:24" bei Ortszeit 15:24 (UTC statt Ortszeit), während der Wiederherstellungs-Balken derselben Seite „15:14" zeigt.
7 · mittel · Lauf A sperrt mit „Auf den Blättern steht kein Datum, aus dem sich das Baujahr ableiten ließe." Auf Blatt 1 steht handschriftlich „17.05.2022" neben den Unterschriften; Lauf B liest es und setzt „Baujahr 2022 aus dem Plandatum angenommen". Dieselbe Datei, zwei verschiedene Aussagen, einmal mit Sperre.
8 · mittel · Kennzahl „FENSTER ERFASST" untertreibt und schwankt: 6 bzw. 10 bei 11 bzw. 14 gerechneten Fensterbauteilen; auf dem Blatt sind 11 Öffnungen.
9 · mittel · Selbstprüfung „Vergleich mehrerer Maßketten": „6 Maßketten weichen um 1749,2 Prozent voneinander ab (34,9 bis 645,7 Pixel je Meter) … Solange das nicht geklärt ist, ist keine Fläche belastbar." Diese Zeile läuft als bloßer Hinweis, die Ampel steht auf grün/„Belastbar".
10 · mittel · Raum „KELLER" (herkunft.art_gelesen „Keller", art_angenommen true) wird als Raumart „wohnen" mit 20 °C geführt; daten_raumarten.js kennt „nebenraum" mit 15 °C. In der Druckfassung erscheint KG KELLER mit θi 20 ohne Vermerk.
11 · mittel · Die hochgerechneten EG-Außenwandflächen (90,3 m² von 183,9 m²) sind in der Druckfassung nirgends als Annahme gekennzeichnet; die Sternfußnote in 5.1 deckt allein die Bodenplatte ab. Nur die interne Fassung nennt die Hochrechnung.
12 · klein · Druckfassung 5.1 und Ergebnisseite: „Die Heizlast des Gebäudes ist deshalb nicht die Summe der Raumheizlasten, sondern 6.922 W" — die Summenzeile derselben Tabelle zeigt 6.922 W (Lauf B: 6.919 gegen 6.919).
13 · klein · Abschnitt 2.1 nennt „Bauteiltypen 6 Typen", Abschnitt 4 führt 5 auf; „Kellerwand gegen Erdreich" erscheint in 5.2 und Anlage 1, hat in Abschnitt 4 aber keine Zeile. Ebendort: „Ihr U-Wert ist als ganze Zahl angesetzt" — 0,27 ist keine ganze Zahl.
14 · klein · Abschnitt 3.3, Spalte „Stufe e": beide Zeilen tragen die Beschriftung „Anzahl exponierter Fassaden nicht eingetragen", obwohl daraus 0,00 bzw. 0,03 abgeleitet wird.
15 · klein · Lauf A meldet „Wir brauchen noch 5 Angaben", obwohl nur 4 Themen offen waren: das Baujahr steht zweimal in der Liste (Sperre und Rückfallvermerk); eine Eingabe schließt beide (5 → 3).
16 · klein · Der Maßstab „M. 1:100" steht sechsmal im Klartext unter den Zeichnungen; die Auswertung meldet „Aus dem Dokument war nichts zu holen. Die Auslese unten liest nur das Schriftfeld." Vorbelegt wurde nichts.
17 · klein · Die Analysekosten stehen nur während des Laufs im Fortschrittsfeld; danach sind sie weder in der Oberfläche noch im Bericht auffindbar — je Auftrag fehlt die Endsumme. Ebenso bleibt meta.plz leer, obwohl die Annahme mit „PLZ 33100" begründet ist.
18 · klein · Punkt (b) unverändert: der Verteilfaktor stützt sich weiter auf ein einziges Gebäude — hier sogar nur auf ein einziges Geschoss desselben Hauses (Formfaktor 4,762 m je √m², am OG gemessen, aufs EG übertragen; das Werkzeug schreibt das selbst als Annahme aus).

**Urteil aus Bearbeitersicht:** Nach kurzer Prüfung NICHT unterschreibbar. Allein Befund 1 genügt: die Druckfassung nennt eine Geschossabmessung, die der Flächenangabe desselben Berichts widerspricht — das fällt jedem Prüfer auf. Rechenkern und Berichtstext sind dagegen sauber; die Handprobe stimmt auf 0,5 W, die Druckfassung ist textlich makellos.

## Protokoll 3

PROTOKOLL — „Bauantrag Soethe 1312.2021.pdf" (6 S. A3, Vektor, keine Flächenstempel), Live-Lauf gegen https://amazing-axolotl-219e82.netlify.app, Deploy-Hash 991536a6… (um 15:13 byte-gleich mit dem lokalen Bau; der lokale Bau steht seit 15:42 auf 132a7f1e… — ein Parallellauf hat neu gebaut. Ich habe **nichts** gebaut und **nichts** geändert, damit der Bau nicht mit fremden Zwischenständen kollidiert).
1 Ablegen 15:14:12 → Auswertung fertig 15:19:20 = **5 min 08 s**, 6 Blätter, **15 Lesungen**, nichts eingetippt (Zugangscode lag im Browser vor). Kosten: nicht bezifferbar, das Werkzeug schreibt keinen Verbrauch mit (B14).
2 Zahlen stimmen: Geschosse 2 ✓ · Räume 13 ✓ (Plan: EG Technik/HWR, Wohnen/Essen, WC, Diele, Windfang/Garderobe, Vorrat, Kochen; OG Bad, Kind 1, Kind 2, Flur, Gast/Büro, Ankleide/Schlafen) · Fenster 11 ✓ · beheizte Fläche „–".
3 Rückfragen: 22, davon **20 mit Vorschlag**, [übernehmen] und [Ablehnen, selbst eintragen] gleich groß in einer Zeile, je ein Klick. **2 ohne Vorschlag** („Bauteile im Projekt", „Bauteile je Raum"), beide Sperre, beide ohne Eingabefeld.
4 Alle 18 Vorschläge angenommen → **6,65 kW · 43,2 W/m² auf 153,96 m²** (Transmission 4.600 W, Lüftung 2.047 W), Ampel **„Belastbar · 0 Fehler · 3 Hinweise"**.
5 Handrechnung: Rechenkern **exakt**. Wohnen/Essen 19,60·0,37·30,7=222,6 (Tool 223) + 8,82·1,40·30,7=379,1 (379) + 18,29·0,37·15,3=103,5 (104) + 0,34·23,777·30,7=248,2 (248) = 953,8 W = Tool 953,78. Kind 2 ebenso auf 1 W genau. Die Formel stimmt, die Eingangsgrößen nicht (B4–B6, B8).
6 Berichte: Druckfassung 186.830 Zeichen, 0× undefined/NaN/Infinity/„Warnung"/Konfidenz/Spanne/BEG ✓. Interne Fassung 250.494 Zeichen, Konfidenz 7 / Spanne 15 / BEG 5 (dort erwünscht); die 2 Treffer „null" sind das deutsche Wort. **Beide Fassungen technisch sauber.**
7 Nach kurzer Prüfung unterschreibbar? **Nein** — das Deckblatt nennt ein falsches Objekt, und die Ampel steht grün auf 13 verteilten Flächen.

BEFUNDE
B1 BLOCKER · Bericht Kap. „Diese Berechnung steht auf 3 Annahmen" — erfundene Herkunft: „Der Ort ‚Paderborn' steht im Schriftfeld des Plans; eine Postleitzahl steht dort nicht." Im PDF: **0× Paderborn, 18× 37696, 18× Marienmünster**. p.meta.ort kommt aus dem Briefkopf, p.meta.plz ist leer, p.meta.strasse = „Flur 12" (Flurstück, keine Straße). Deckblatt und Kolumnentitel: „Norm-Heizlast Flur 12, Paderborn". Folge: θe −10,7 statt −11,6 °C (eigene Tabelle, DATEN_KLIMA.findePlz('37696')) → Δθ 30,7 statt 31,6 K, Ergebnis rund 2,9 % zu klein.
B2 BLOCKER · src/kerne/kern_massstabsprobe.js:328–336 — die Maßstabsprobe hebt ihre Sperre mit dem Satz „13 Flächen sind von Hand eingetragen, keine einzige ist im Bild abgegriffen" auf. Keine einzige wurde eingetragen: alle 13 tragen `A_annahme:true` und stammen aus dem Verteil-Vorschlag. `fh.hand` zählt übernommene Vorschläge als Handeingabe.
B3 BLOCKER · Ampel „Belastbar · 0 Fehler", obwohl 100 % der Raumflächen Verteilwerte sind — Tool-Wortlaut selbst: „VERTEILUNG, kein gemessener Raumwert", Spanne je Raum 2,41 bis 25,99 m². Die Druckfassung enthält „Annahme"/„angenommen" **0×**.
B4 BLOCKER · src/app.js ~5863 — Phantom-Keller: Zone „Unbeheizter Keller" 4,7 °C und „Kellerdecke" 74,83 m² über alle 7 EG-Räume, obwohl der Schnitt (S. 4: ±0,00 / −0,22 / −0,37) keinen Keller zeigt. Ein Keller wird nur dann nicht angelegt, wenn das unterste Geschoss selbst das KG ist; bei Bodenplatte auf Erdreich greift die Prüfung nicht. Anteil 424 W = 6,4 %; steht auch in der Druckfassung, Kap. 2.
B5 MITTEL · Fensterflächen aus Fassaden-Maßketten statt aus den Fensterangaben, Höhe pauschal 1,40 m, Kennzeichnung trotzdem `breite_quelle:"bemasst"`. Kind 1: breite_m 2,70 (Wandabschnitt aus „4.55 / 2.70 / 4.55") × 1,40 = 3,78 m²; der Plan schreibt 90/2.10 = 1,89 m². Summe 35,81 m² = 23 % der Grundfläche und 1.539 W = 23 % der Heizlast.
B6 MITTEL · Gebäudekontur mischt Innen- und Außenmaß. OG „11,2 m mal 8,3 m = 92,96 m²": 11,20 ist das lichte Innenmaß, 8,30 das Außenmaß (linke Kette 30|2.93|13|1.10|13|3.41|30 = 8,30). Richtig außen 11,80 × 8,30 = 97,94 m². EG nimmt 11,80 × 7,50 = 88,50 m², obwohl 7,50 nur die zurückspringende linke Seite ist (rechts 8,30).
B7 MITTEL · **Offener Punkt (a) bestätigt**: nach [Ablehnen, selbst eintragen] beim Flächen-Vorschlag steht auf der ganzen Seite kein Eingabefeld (`input|select|textarea` = 1, und das ist die Dateiauswahl), obwohl Vermerk und Meldung beide sagen „das Feld für den eigenen Wert steht jetzt darunter". Die Frage ist eine Sperre; Rückweg nur über „Doch noch einmal ansehen".
B8 MITTEL · **Offener Punkt (b) bestätigt**, im Tool wörtlich: „Median über 1 Räume dieser Raumart aus 1 Gebäude des Prüfsatzes. Nur EIN Gebäude belegt diese Zeile." Ergebnis: OG Kind 1 = Kind 2 = Gast/Büro = Ankleide/Schlafen = exakt 16,02 m²; EG Kochen 18,71 > Wohnen/Essen 18,29 (im Plan ist Wohnen/Essen mit Abstand der größte Raum); Windfang/Garderobe 14,69 m² gegen nachgemessene ~4,7 m² (3,08 × 1,54); Technik/HWR 4,02 m² gegen nachgemessene ~7,8 m² (2,40 × 3,26).
B9 MITTEL · Selbstprüfung widerspricht sich in einer Ansicht: Hinweis „7 Maßketten weichen um 242 Prozent voneinander ab" und Blattbefunde „im Bild gemessen 1:126.9 / 1:115.2 — das Blatt liegt nicht in Originalgröße vor" stehen neben dem grünen „Der Maßstabsvermerk und die gemessene Maßkette stimmen auf 0 Prozent überein. Damit ist ausgeschlossen, dass die Unterlage nachträglich verkleinert wurde." Alle 6 Seiten sind exakt A3 (1190,64 × 841,919 pt) — die Messung ist die falsche Angabe. Dazu eine in sich widersprüchliche Zeile: „Einstufung: kein Maßstab beteiligt. Der Maßstab ist durch eine Probe belegt."
B10 MITTEL · Frage 2 „Bauteile im Projekt" begründet den fehlenden Vorschlag mit „weil hier zwei bezifferte Angaben aus verschiedenen Quellen gegeneinander stehen" — es steht nichts gegeneinander, es ist überhaupt kein Bauteil angelegt. Derselbe Block schließt mit „Deshalb steht hier ein leeres Feld" — ein Feld gibt es nicht. Gleiches Muster bei Frage 6 „Bauteile je Raum".
B11 KLEIN · src/app.js:10910, 10932, 10950 — Vermerk-Zeitstempel in UTC (`toISOString().slice(0,16)`): die Ablehnung wurde um 15:29 Ortszeit als „2026-08-26 13:29" vermerkt, während der Bericht 26.08.2026 lokal datiert.
B12 KLEIN · Zählwerte mit zwei Nachkommastellen und falschem Numerus: „17,00 Fenster als richtig anerkennen", „1,00 Bereich", „1,00 Bauteile". Zusätzlich nennt die Frage 17 Fenster, Kontrollblatt und Modell führen 11.
B13 KLEIN · Die Liste „… ist kein Raum — entfernen" bricht nach 8 von 13 Räumen ab (Fließtext endet auf „…"); Kind 1, Kind 2, Gast/Büro, Ankleide/Schlafen und Flur lassen sich dort nicht entfernen.
B14 KLEIN · Kein Verbrauch mitgeschrieben — weder in `p.plan.seiten` noch sonst im Projekt steht ein Feld für Lesungen, Token oder Kosten. Ein Lauf lässt sich weder budgetieren noch nachrechnen (hier: 15 Lesungen für 6 Blätter).
B15 KLEIN · Der Zwischenspeicher hat nur einen Slot je Browser: mein frischer Lauf bot durchgehend das Projekt eines fremden Laufs an („Werkvertragsverzeichnung BV 2-0887 Ziolkowski"), auch mit `?frisch=1`. Zwei Kollegen an einem Rechner überschreiben sich gegenseitig.

## Protokoll 4

**PROTOKOLL — P2211 Baugenehmigung Grundrisse (9 S., reiner Scan, A3), live gegen amazing-axolotl-219e82.netlify.app**

**Budget:** Werkzeug veranschlagte für alle 9 Blätter **1,31 $** — über der 1-$-Grenze. Ich habe daher die drei nachweislich raumfreien Blätter (Katasterauszug, amtl. Lageplan, doppelter Lageplan) entfernt; die Schätzung sank korrekt auf **0,87 $ / 6 Blätter**. Tatsächlich liefen **28 Lesungen** statt der aus „drei bis vier je Blatt" folgenden ≤24 → real ≈ 1,0 $. Der tatsächliche Betrag wird nirgends ausgewiesen.

**Zeit/Lesungen:** Ablegen 15:15:41, 9 Blätter in ~10 s als „Scan, A3 quer" erkannt. Analyse 15:20:10 → ~15:24:40 = **4 min 30 s** (angesagt 3 min).

**Urteil vs. Nachzählung von Hand:** Geschosse 3 / **wahr 2**. Räume 23 / **wahr 25**. Fläche 414,3 m² / **wahr 465,8 m²** (−11 %). Fenster „9 erfasst", die Selbstprüfung nennt an anderer Stelle 26. Abgleich geht exakt auf: es fehlen EG Büro 24,14 + Flur 7,83 und OG Büro 13,15 + Büro 25,52 (70,6 m²), dafür sind „Eingang 1,5 m²" (Vordach, außen) und ein Dublett „OG1 · Büro 17,5" zu viel (19,0 m²). 465,8 − 70,6 + 19,0 = 414,2 ✓.

**Rückfragen:** 14 Stück, **jede mit Vorschlag — keine ohne** (Vorschlagspflicht hält). Übernehmen ist ein Klick, Ablehnen daneben.

**Alle Vorschläge angenommen →** 15,85 kW, 38,3 W/m², **Ampel bleibt „Nicht belastbar", 2 Fehler**, 2 Fragen, die ihre eigenen Vorschläge nicht schließen können.

**Handprobe Halle (θi 15 °C, ΔT 25,2 K):** Außenwand 120,6 × 0,38 × 25,2 = 1.154,7 (Werkzeug 1.155) · Fenster 5,3 × 1,40 × 25,2 = 187,0 (188) · Kellerdecke 89,8 × 0,45 × 10,1 = 408,1 (408) · Lüftung 0,34 × 159,3 × 25,2 = 1.364,9 (1.365) · Σ 3.116. **Die Arithmetik stimmt auf das Watt — die Eingangsgrößen nicht.**

**BEFUNDE**

**Blocker**
1. Rückfragekarte „Flächensumme EG und OG", nach *Ablehnen, selbst eintragen*: Vermerk sagt „der Wert kommt aus dem Feld darunter" — **es gibt kein Feld**, nur drei Knöpfe. Frage danach unbeantwortbar. Offener Punkt (a) **bestätigt**.
2. Phantom-Geschoss **OG1** aus dem Blattnamen „Obergeschoss1" (Blatt 6) — enthält ein Dublett-Büro 17,49 m². Überlebt auch das Übernehmen von „2,00 Ebenen als richtig anerkennen".
3. Sidebar/Bericht Abschnitt 5: **„Unbeheizter Keller 4,9 °C" und „Unbeheizter Dachraum −7,2 °C"** existieren nicht (Schnitt A_A: Bodenplatte auf Erdreich, Flachdach). Die Halle rechnet 408 W gegen eine erfundene Kellerdecke.
4. Zwei echte Räume je Geschoss fehlen, zwei erfundene sind drin (s. o.) → Fläche und Heizlast systematisch zu niedrig.
5. **Übernehmen ohne Wirkung:** Außenwände OG von hochgerechnet 66,27 m auf gemessen 77,08 m (+16 %) angenommen → Transmission bleibt exakt 8.700 W, Heizlast exakt 15,85 kW. Ebenso „16,00 Räume" und „228,12 m² (OG1)": Frage bleibt offen, nur die Herkunftszeile ändert sich.
6. Raumbuch: **Halle mit θi 15,0 °C** (Hallen-Ansatz nach Namen) — Blatt 5 zeigt einen Versammlungs-/Schulungsraum mit ~40 Stühlen, korrekt wären 20 °C.
7. Druckfassung erscheint in **drei Anläufen nicht**; Status bleibt „Der Bericht wird aufgebaut …", kein Abbruch, keine Meldung. *Nicht sauber isoliert:* im selben Browser liefen Fremd-Sitzungen, eine hat meinen Berichts-Tab überschrieben.

**Mittel**
8. Schnitt Blatt 9: Maßkette **3,40 / 0,40 / 3,80** steht zweimal im Bild, dazu OKFF 110,29 müNN — Werkzeug behauptet „der Schnitt gibt weder eine lichte Höhe noch zwei Fertigfußbodenkoten her" und nimmt **3,55 m** an (+4,7 % Heizlast laut eigener Gegenrechnung).
9. Rückfrage 1: Blätter 3/7/8/9 werden „nach dem Namen des Blattes" als Grundriss geführt — der Name stammt aus der **PDF-Datei** („…Grundrisse.pdf"), nicht aus dem Schriftfeld, das dort „Lageplan", „Ansicht", „Schnitt" nennt.
10. Halle: 5,3 m² Fenster gegen ~36 m² in Ansicht Westen. Der Vorschlag zur Fenster-Frage lautet „Stand bestätigen — passt so" und **widerspricht dem eigenen Befund** („Öffnungen im Raumbuch sind zu klein", Faktor 2,16).
11. Ablehn-Vermerk datiert **13:32 bei Ortszeit 15:32** (UTC), während die Stand-Karte „15:14" lokal zeigt. Der Vermerk geht in den Bericht.

**Klein**
12. Stückzahlen mit zwei Nachkommastellen: „16,00 Räume", „1,00 Bereich", „2,00 Ebenen".
13. Interne Fassung: doppelter Satzpunkt, 5×, z. B. „…nahe der Straße an.. Im Kontrollblatt".
14. Interne Fassung: fehlendes Leerzeichen vor der Einheit — „15,85kW" (2×), „38,3W/m²".
15. Rückfragekarte zeigt **zwei identische** Knöpfe „Entscheiden und mit Vermerk bestätigen".
16. Karte „Ein nicht abgeschlossener Stand liegt vor" (Fremdprojekt) steht die ganze Sitzung über dem eigenen, fertig geladenen Projekt.
17. Widerspruch: „20 nachgewiesen · 3 aus der Auslese erkannt" vs. „23 Flächen sind im Plan angeschrieben und abgelesen".
18. Fortschritt „1 von 6 Blättern" bei bereits 19 von 28 Lesungen; Berichtsaufbau ~2 min ohne Anzeige und ohne Timeout.

**Gut:** Rechenkern exakt; Außenkontur 357,53 m² gegen meine 15,55 × 22,98 = 357,34 m²; Bauherr, Projektnummer P2211, Adresse und θe −10,2 °C korrekt aus dem Schriftfeld; „Luftraum" richtig als Beschriftung verworfen; Maßstabs-Widersprüche korrekt zu Hinweisen abgestuft, weil keine Fläche am Maßstab hängt; Bericht sagt selbst „Nicht belastbar … nicht zur Auslegung geeignet"; kein undefined/NaN/Infinity, kein „Warnung" für Nicht-Fehler.

**Bearbeitersicht: nein, nicht unterschreibbar.** Drei Geschosse statt zwei, ein Keller und ein Dachraum, die es nicht gibt, 11 % fehlende Fläche und eine Halle auf 15 °C — und die Ampel sagt das auch selbst. Die Selbstprüfung ist ehrlich und findet das meiste davon; unbrauchbar macht es, dass die angebotenen Vorschläge diese Fehler nicht beheben können und ein Ablehnen in einer Sackgasse endet.

## Protokoll 5

PROTOKOLL Hasenberg 10 (2 Blätter, Vektor) — LIVE, echter Endpunkt, nichts eingetippt
Ablage → Urteil 2:59 min · 13 Endpunkt-Lesungen · Kosten 0,5143 $ (im Budget; Anzeige nur während des Laufs).
Urteil: Geschosse 2 ✓ · Räume 12 ✗ (Plan: 20 = 14 EG + 6 OG) · Fläche 181,15 m² ✗ (Stempelsumme 280,76 m²) · Fenster 5 ✗ · θe −10,7 °C ✓ · 1 WE statt 2 (Plan: 193,16 + 80,84 m²). Erstwert 13,69 kW / 75,6 W/m².
Rückfragen: 9, **jede** mit Vorschlag, 0 ohne. Übernehmen und Ablehnen gleich groß, je ein Klick.
Alle Vorschläge angenommen → **7,01 kW · 38,7 W/m² · Ampel rot**, 3 Fragen bleiben offen.
Handprobe „Kind I" (A 15,42, h 2,60): AW 9,60·0,38·30,7=111,99 W · Fe 2,57·1,40·30,7=110,46 W · Dach 15,42·0,30·27,63=127,82 W · ΦV 0,34·20,046·30,7=209,24 W · Σ 559,51 W = Werkzeugwert. Rechenkern stimmt exakt; der Fehler sitzt in der Eingangsgröße.
Berichte: Druckfassung ohne undefined/NaN/Infinity/„Warnung"/Konfidenz/Spanne/BEG ✓, mit Entwurfs- und Nichtbestanden-Vermerk. Interne Fassung ebenfalls sauber, trägt den Fehlbefund. Bau nach `python3 build.py`: grün (5b ohne Befund).
Regressionsfall: **stimmt nicht mehr** — 12 statt 20 Räume, 13,69 statt ~21 kW.

BEFUNDE
1 BLOCKER · 8 EG-Räume fehlen (WC, Abst., Kochen/Essen, Wohnen, Schlafen, Büro I, HWR, Flur; 99,61 m²). Werkzeug benennt sie selbst („Es fehlen 8 Räume"), ergänzt sie nicht. Fundstelle: Rückfrage „Räume laut Zählung fehlen".
2 BLOCKER · Baujahr-Vorschlag „2025" (= Blattdatum) mit Wirkung „ändert die Heizlast nicht spürbar"; gemessen 13,69 → 7,01 kW (−48,8 %), U-Werte 1,00→0,28. Widerspricht dem eigenen Fragetext („um ein Vielfaches zu klein"). Fundstelle: Rückfrage 1.
3 BLOCKER · Angenommener Außenmaß-Vorschlag bleibt folgenlos: `vorschlagAussenmasse` schreibt `ziel.geschossmasse`, ruft aber kein `bauteileErgaenzen()` — `src/app.js:7185–7196`; der Handweg `src/app.js:10473` ruft es und warnt im Kommentar genau davor. Gemessen: 7,01 kW / 4.515 W vor und nach, Toast meldet trotzdem Erfolg.
4 BLOCKER · Maßketten-Rechenfehler: Herkunft nennt „1,945 + 5,56 + 7,90 + 3,545" = 18,95 m, verwendet werden 20,85 m; Umfang 62,76 statt 58,96 m (+6,4 %). Fundstelle: Rückfrage „Außenwände EG und OG".
5 MITTEL · „Stand bestätigen — passt so" als Ein-Klick-Vorschlag für zwei Befunde, die das Werkzeug selbst als Fehler führt, mit der Herkunft „es liegt keine Gegenzahl vor, die ihm widerspricht" — die Gegenzahl steht drei Zeilen darüber.
6 MITTEL · **Offener Punkt (a) bestätigt:** Ablehnen des Flächen-Vorschlags zeigt kein Eingabefeld, obwohl Vermerk und Meldung eines ankündigen. Ursache: `src/app.js:7987` verlangt `f.eingabe && vorschlagFeldZeigen(f)`; `f.eingabe` ist leer, weil `zs.filter(z => z.frage)` bei dieser Gruppe nichts liefert (`src/app.js:6734`).
7 MITTEL · Ablehnungs-Vermerk trägt UTC statt Ortszeit: „2026-08-26 13:27" bei lokal 15:27 — `src/app.js:10951` (`toISOString`), zudem ISO- statt deutsches Datumsformat.
8 MITTEL · Banner „Ein nicht abgeschlossener Stand liegt vor" bleibt über Ablage, Auswertung, Rückfragen und Bericht stehen; „Daran weiterarbeiten" würde die fertige Rechnung ersetzen. `?frisch=1` unterdrückt ihn nicht.
9 MITTEL · Abgeschnittener Auftraggeber „Christina Herzog u." steht ohne Kennzeichnung im Druckbericht, obwohl die Rückfrage dazu offen ist.
10 MITTEL · „14,00 Räume übernehmen" löst die eigene Sperre nicht auf und trägt keinen Raum nach — die Frage steht danach unverändert in der Liste.
11 KLEIN · Dezimalpunkt statt Komma: „69.4 Pixel je Meter" — `src/kerne/kern_massstab.js:1170, 1282, 1365, 1439, 1450, 1545` (`toFixed(1)`).
12 KLEIN · Anzahlen mit zwei Nachkommastellen: „14,00 Räume", „1,00 Bereich als richtig anerkennen".
13 KLEIN · Kleinschreibung nach Punkt: „Es fehlen 8 Räume. im Kontrollblatt gezählt …" (auch so im internen Bericht).
14 KLEIN · Zwei wortgleiche Absätze auf der Karte „Außenwände EG und OG"; keiner nennt sein Geschoss.
15 KLEIN · „Analysekosten bisher ca. …" verschwindet nach dem Lauf; die Gesamtkosten (0,51 $) stehen nirgends.
16 KLEIN · `python3 build.py` brach einmal in neun Läufen ab: „Berichtsmodul: T30 deckende Geschossflächen müssen als dieselbe Größe benannt sein" (`src/modul_bericht.js:5867`), Exit 1. **Caveat:** parallele Sitzungen bauten im selben Verzeichnis; in Ruhe nachprüfen.
17 **Offener Punkt (b) bestätigt, per Quelltext, nicht durch diesen Lauf** (der Plan hat kein Treppenhaus, alle 12 Räume trugen Stempel): `src/kerne/kern_flaeche.js:168` `treppenhaus {wert:1.06, n:3, g:1}` — ein Gebäude. Ebenso `buero` (n=4, g=1), `lager_beheizt` (n=1), `nebenraum` (n=1): vier von neun Raumarten auf einem Gebäude, zwei davon auf einem einzigen Raum. Das Modul sagt es selbst an und weitet die Spanne, der Punktwert bleibt.

Bearbeitersicht: **nicht unterschreibbar.** Die Ampel steht zu Recht rot, und die Prosa ist außergewöhnlich ehrlich — aber wer den grünen Knöpfen folgt, landet bei 7,01 kW für ein 281-m²-Sanierungshaus, also rund einem Drittel des Richtwerts, und drei der vier Blocker entstehen genau auf diesem Weg.

Hinweise zur Umgebung: Chrome war mit Parallel-Sitzungen geteilt; beim Aufräumen habe ich versehentlich vier fremde Tabs geschlossen. Der beim Start verworfene Zwischenstand („Sanierung von einem WHS", 20 Räume, 6 Blätter, 15:07) liegt gesichert unter dem localStorage-Schlüssel `werke_hl_sicherung_backup_vor_test_20260826`. Mein Prüf-Tab (1507704201) steht noch offen, um keine weitere Tab-Verwechslung auszulösen.

## Protokoll 6

Build green (64 Schritte, 5b ohne Befund, 2e/2dg grün), `api/WERKE_Heizlast_Web.zip` neu gebaut. **Nicht abgelegt** — Deploy gehört dem Parallellauf.

**1 Ablehnen ohne Eingabefeld (Punkt a, alle 5 Pläne)** → `src/app.js:7987` rendert nur `if (f.eingabe && …)`; `eingabe:` fehlte bei `id:"flaeche"` und `id:"we"`, der Vermerk versprach trotzdem ein Feld → neue `raumfelder()` baut je Raum ein Feld über denselben Datenweg wie das Raumbuch (`data-liste="raeume"`), `data-rf-render` zeichnet danach neu; `antwortweg(f)` sagt nur dann „Feld darunter", wenn eines dasteht, sonst „über die Knöpfe/Wege darunter" → **Browser, Soethe-Echtlauf**: vor Ablehnen 1 Feld auf der Seite, nach Ablehnen 15 (14 Raumfelder, Beschriftung „EG Technik/HWR — Grundfläche in m²"); Eintragen der 14 Werte: 26 → 18 Fragen, Sperre weg, 14 → 0 Räume ohne Fläche, 5.926 W gerechnet.
**2 Sackgasse bei Entscheidungsfragen (p2-1, p4-5)** → derselbe Text an Fragen, die gar keinen Zahlenwert nehmen → Wortlaut folgt jetzt dem Fragetyp → Browser: „kb_raeume_EG" nach Ablehnen: „…; beantwortet wird sie über die Knöpfe darunter." bei 0 Feldern und 2 Knöpfen.
**3 Liste bricht nach 8 von 13 Räumen ab (p1-B13)** → `ohneA.slice(0, 8)` → Begrenzung entfernt → Browser: 14 von 14 „ist kein Raum — entfernen"-Knöpfe.
**4 „17,00 Fenster", „0,00 Räume", „1,00 Bereich", „2,00 Ebenen" (p1-B12, p2-12, p3-12, p4-4)** → `vorschlagAusZeilen` formatierte jede Zahl mit `fmt(wert, 2)` und hängte die rohe Einheit an → neues `MODUL_KONTROLLBLATT.mengeText()` (eine Quelle, dieselbe Einzahltabelle, die der Bau in 3aa schon prüft), Stückzahlen werden gerundet → Browser: „18 Fenster als richtig anerkennen", „7 Räume als richtig anerkennen"; 7 neue Selbsttests.
**5 Erfundener Grund an Sperren ohne Gegenzahl (p1-B10)** → fester Text „zwei bezifferte Angaben stehen gegeneinander", auch bei 0 Bauteilen; dazu „Deshalb steht hier ein leeres Feld" ohne Feld → Grund wird aus `ist`/`soll` abgeleitet → Lauf Soethe: „Bauteile im Projekt" sagt jetzt „…keine zweite, unabhängige Angabe dagegen … ein Vorschlag wäre geraten. Beantwortet wird sie über die Knöpfe darunter."
**6 Zwei wortgleiche Knöpfe (p2-15) und zwei wortgleiche Absätze ohne Geschoss (p3-14)** → `zs.forEach` gab jeder gesperrten Zeile denselben Knopftext, `texte: zs.map(z => z.text)` dedupliziert nichts → bei mehr als einer Zeile trägt Knopf und Absatz den Zeilentitel, Wort-für-Wort-Doppel fällt weg → „Entscheiden und mit Vermerk bestätigen: Außenwände in EG/OG gegen den Umfang", Absätze verschieden (`gleich? false`).
**7 Zeitstempel in UTC (p1-B11, p2-11, p3-7, p4-6, p5-M)** → 7× `toISOString()` in `app.js`, `modul_kontrollblatt.js`, `kern_pruefung.js` → `ortszeitStempel()` (Form bleibt sortierbar, weil `kern_pruefung:155` sie wieder parst), Anzeige über `zeitDe()` deutsch → Browser um 16:19 Ortszeit: Vermerk „26.08.2026 16:19" statt „2026-08-26 14:19".
**8 Dezimalpunkt „69.4 Pixel je Meter", „1:126.9" (p3-11)** → `kern_massstab.js` hatte kein `de()`, 42 benutzersichtbare `toFixed()` → deutsche Zahlform, Selbsttest 192 Prüfungen grün.
**9 Doppelter Satzpunkt „…an.. Im" (p2-13) und Kleinschreibung „Es fehlen 8 Räume. im Kontrollblatt" (p3-13)** → Zeilentexte werden aus festem Satz + kleingeschriebener Quelle gefügt (`modul_kontrollblatt.js:1063` u. a.) → `satzform()` in `zeile()`, dem einen Nadelöhr; Abkürzungen („z. B.", „u. a.") bleiben unangetastet → 64 echte Zeilentexte aus vier Echtläufen: 0 doppelte Punkte, 0 Kleinschreibung nach Punkt.
**10 „15,85kW", „38,3W/m²" (p2-14)** → `kennzahl()` setzte die Einheit ohne Trenner, zu `.kze` existiert überhaupt keine Regel → geschütztes Leerzeichen, Selbsttest T30b.
**11 „Wir brauchen noch 5 Angaben" bei 4 Themen (p4-15)** → Baujahr stand als Sperre UND als Annahmenkarte in der Liste; für die Höhe gab es die Regel schon → Annahmenkarte bleibt draußen, solange die Frage zur selben Sache offen ist → Probe: mit erzwungener Baujahr-Sperre steht `annahme_baujahr` nicht mehr in der Liste, ohne Sperre bleibt sie (Ziolkowski unverändert 4 Fragen).
**12 Rückfall gegen Wiederkehr** → `validierung/vorschlagspflicht_test.js` prüft jetzt über vier Echtlauf-Stände: kein Vermerk verspricht ein Feld, das die Frage nicht hat; die Flächensperre zeigt je Raum ein Feld und einen Entfernen-Knopf; kein Knopf trägt eine Stückzahl mit Nachkommastellen. 120 → 182 Prüfungen; gegengeprüft, dass der Wächter beißt (Feld testweise entfernt → rot, danach wieder grün).

**Bewusst nicht gebaut** (Ursache liegt außerhalb Bedienung/Ausgabe oder gehört dem Parallellauf): tote Übernehmen-Knöpfe, die keine Bauteile neu bilden (p3-3 `vorschlagAussenmasse` ohne `bauteileErgaenzen`, p2-5, p4-2, p5-B4) — sie greifen in den Rechenweg; Ampel „Belastbar" trotz 100 % Verteilflächen und fehlendem Wort „Annahme" in der Druckfassung (p1-B2/B3, p5-B2) — das ist die Bewertungslogik, nicht der Text; Phantom-Keller/-Dachraum, falsches Objekt im Deckblatt, Fensterflächen, „TRH"/„KELLER"-Raumart; „Raumliste unvollständig" trotz vollständiger Liste (p5-K); Analysekosten-Endsumme (p1-B14, p3-15, p4-17, p5-K) — braucht eine Verbrauchsablage im Projekt, kein Textfehler; Ein-Slot-Zwischenspeicher und `?frisch=1` (p1-B15, p3-8, p5-K); Einfrieren beim Fragenwechsel (p5-K). Nicht reproduziert: p2-7 (Druckfassung erschien nicht) — der Prüfer nennt selbst Fremdsitzungen im selben Browser.

**Umgebung:** Prüfung lief lokal gegen `http://localhost:8731/pruef_bedienung.html` — eine **zusätzliche** Datei im Wurzelverzeichnis des schon laufenden Messstands; nichts Bestehendes überschrieben, `index.html` unberührt. Mein Eintrag in `~/Desktop/Claude/.claude/launch.json` ist wieder entfernt, der eigene Server gestoppt. Ein Chrome-Tab mit dem Prüfstand bleibt offen (kein fremder Tab geschlossen). `mcp__Control_Chrome__execute_javascript` meldet durchgehend „Chrome is not running", obwohl `list_tabs` läuft — dort fehlt vermutlich „Allow JavaScript from Apple Events".