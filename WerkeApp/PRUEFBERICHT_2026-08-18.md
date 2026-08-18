# Fachliche Vorprüfung des Regelpakets

**Datum:** 18.08.2026 · **Durchgeführt von:** maschinell (Claude, Recherche und Nachrechnung)
**Geprüfte Fassung:** Regelpaket 4 → korrigiert auf Fassung 5

> **Das ist keine fachliche Freigabe.** Eine Freigabe trägt ein Mensch mit Namen
> und Datum ein, nachdem er die Werte gegen den Richtlinientext selbst geprüft
> hat. Dieser Bericht sagt, was eine Recherche gegen öffentliche Quellen ergeben
> hat – nicht mehr, aber auch nicht weniger. Das Feld `freigabe` im Regelpaket
> bleibt bis dahin leer, und die App weist offen darauf hin.

---

## 1 · Gefundene Fehler in den Fördersätzen

Fünf Werte waren falsch. Vier davon hätten einem Kunden zu **wenig** Förderung
versprochen, einer zu **viel**.

| Wert | vorher | richtig | Wirkung |
|---|---|---|---|
| Klimageschwindigkeitsbonus | 20 % | **16 %** | 1.120 € zu viel versprochen |
| Höchstsatz Heizung | 70 % | **80 %** | bis 2.800 € zu wenig |
| Höchstkosten Heizung, 1. WE | 30.000 € | **28.000 €** | 1.600 € zu viel |
| Einkommensbonus | ein Satz, 30 % | **gestaffelt 40 / 30 / 10 %** | bis 2.800 € zu wenig |
| Familienbonus | +5 Prozentpunkte | **−10.000 € auf das Einkommen je Kind** | konzeptionell falsch |

Der Familienbonus war kein Zahlendreher, sondern ein Denkfehler. Er wirkt nicht
auf den Fördersatz, sondern auf das **anzusetzende Einkommen** – und erschließt
dadurch eine bessere Bonusstufe. Bei einem Haushalt mit 48.000 € und zwei
Kindern sind das zwanzig Prozentpunkte Unterschied statt fünf.

Zwei weitere Fehler kamen bei der Nachrechnung heraus, nicht aus der Recherche:

* **Höchstkosten skalierten linear mit den Wohneinheiten.** Ein Mehrfamilienhaus
  mit acht Einheiten bekam 30.000 × 8 = 240.000 € förderfähige Kosten
  vorgerechnet. Richtig sind 30.000 für die erste, 15.000 für die zweite bis
  sechste, 8.000 ab der siebten – zusammen 121.000 €. Die Abweichung liegt bei
  einer Zusage von fast 18.000 € Zuschuss, die es nicht gibt.
* **Ab der siebten Wohneinheit fehlte die Stufe ganz.**

### Bestätigt und unverändert

Grundförderung Einzelmaßnahmen 15 %, iSFP-Bonus 5 % ab 30.000 € nur auf den
übersteigenden Betrag, Höchstgrenzen 30.000 / 60.000 € je erster Wohneinheit,
Grundförderung Heizung 30 %.

### Quellen

* [ADAC – Wärmepumpe-Förderung](https://www.adac.de/rund-ums-haus/energie/versorgung/waermepumpe-foerderung/)
* [Energiegestalter – Heizungsförderung ab 21.07.2026](https://www.energie-gestalter.de/kfw-schliesst-foerderportal-was-sie-noch-heute-beachten-muessen/)
* [Haus & Grund – Fördermittel Heizungstausch und Sanierung](https://www.hausundgrund.de/politik/gemeinsam-fuers-klima/foerdermittel-fuer-heizungstausch-und-gebaeudesanierung)

---

## 2 · Der GModG-Stichtag – recherchiert

Das Regelpaket führte das Gesetz als „Entwurfsstand“. Das ist überholt.

| Schritt | Datum |
|---|---|
| Kabinettsbeschluss | 13.05.2026 |
| Bundestag, 3. Lesung, und Bundesrat | 10.07.2026 |
| Verkündung, BGBl Nr. 226 | 28.07.2026 |
| **Artikel 1, 5, 6, 8 in Kraft** (Heizungstausch) | **29.07.2026** |
| **Artikel 2 in Kraft** (Energieausweise, EPBD) | **01.01.2027** |
| Nullemissionsstandard behördliche Gebäude | 2028 |
| Nullemissionsstandard übrige Gebäude | 2030 |

**Folge für die App:** Ein einziges Datum reicht nicht. Der Wegfall des
Betriebsverbots ist seit dem 29.07.2026 geltendes Recht – die neuen
Ausweispflichten gelten erst ab 2027. Wer beides gleich behandelt, erzählt einem
Kunden entweder, das Betriebsverbot gelte noch, oder die Ausweispflichten seien
schon da. Jeder Prüfpunkt trägt jetzt sein eigenes Datum, und die Kennzeichnung
verschwindet an jedem Punkt von selbst, sobald sein Termin da ist.

Die Nachrüstpflicht für die oberste Geschossdecke (§ 47) bleibt **unverändert
bestehen** – das war in der App bereits richtig hinterlegt.

### Quellen

* [GEG-Infoportal des Bundes – Chronologie](https://www.gmodg.bund.de/GEGPortal/DE/Home/startseite/GModG_News/GModG_Chronologie.html)
* [GÖRG – GModG schafft GEG ab](https://www.goerg.de/de/aktuelles/veroeffentlichungen/17-07-2026/gebaeudemodernisierungsgesetz-gmodg-schafft-geg-ab-was-sich-aendert-und-was-bleibt)
* [Ebner Stolz – Gebäudemodernisierungsgesetz verabschiedet](https://www.ebnerstolz.de/de/unser-angebot/leistungen/rechtsberatung/energierecht/gebaeudemodernisierungsgesetz-verabschiedet-109427.html)

---

## 3 · Die zehn Referenzobjekte – was ich nicht liefern kann

Die Sammlung ist jetzt **leer**, und das ist die ehrlichste Fassung.

Vorher stand dort eine „Vorlage“, deren angeblicher DIN-Wert aus der
Hüllflächenrechnung der App selbst stammte. Der Abgleich meldete für sie null
Prozent Abweichung – nicht weil die Rechnung stimmt, sondern weil sie mit sich
selbst verglichen wurde. Eine Prüfung, die immer besteht, ist schlimmer als
keine: Sie sieht aus wie ein Beleg.

**Warum ich sie nicht füllen kann:** Veröffentlichte Typologien wie TABULA des
IWU geben einen **Jahres-Heizwärmebedarf** in kWh/(m²·a) nach ISO 13790 an,
keine **Auslegungsheizlast** in Kilowatt nach DIN EN 12831. Das eine als das
andere einzusetzen wäre exakt die Verwechslung, gegen die diese Prüfstrecke
gebaut wurde. Und zehn Gebäude zu erfinden hieße, genau die Belege zu fälschen,
die Fälschungen aufdecken sollen.

Was hineingehört, liegt in den Akten von WERK.E: zehn Objekte mit einer
vorliegenden Fachberechnung. Der Testfall druckt die Vergleichstabelle dann von
selbst; am Code ist dafür keine Zeile zu ändern.

### Was ich stattdessen geprüft habe

Die **Eingangswerte** statt der Ergebnisse – dort sitzt ohnehin die größte
Unsicherheit der ganzen App: Die Geometrie stimmt auf zwei Prozent, die U-Werte
auf dreißig.

Alle U-Wert-Staffeln laufen jetzt gegen veröffentlichte Spannen
(`UWertAbgleichTests`). Dabei kam ein Fehler heraus: Die **Kellerdecke** hatte
eine Stufe für 1918–1978 mit 1,2 W/m²K. Für 1969–78 nennen die Tabellen
0,8–1,0 – Kellerdecken der frühen Siebziger sind massiver ausgeführt als die der
Vorkriegszeit. Die Staffel ist jetzt feiner.

**Quelle der Vergleichswerte:** [ElbModSan – U-Werte nach Bauteil und
Baujahr](https://www.elbmodsan.de/wissen/u-werte-nach-bauteil-und-baujahr)
(Stand Juli 2026, auf Grundlage der amtlichen Ersatzwerte nach BAnz AT
04.12.2020 und DIN 4108-4), gegengelesen mit
[HeizNorm](https://heiznorm.de/u-wert-tabellen).

---

## 4 · Was vor Februar 2027 nachzuziehen ist

Diese Punkte stehen als Prüfliste im Regelpaket und erscheinen in den
Einstellungen der App:

1. **Klimageschwindigkeitsbonus sinkt ab 01.02.2027 halbjährlich um 4
   Prozentpunkte** (16 / 12 / 8 / 4, ab 01.08.2028 entfallen). Die Degression
   ist noch nicht abgebildet.
2. **Grundförderung für Wärmepumpen sinkt zum ersten Quartal 2027 auf 15 %** –
   Termin und Anwendungsbereich sind zu bestätigen.
3. **Förderfähige Höchstkosten sinken ab Februar 2027 halbjährlich um 750 €.**
4. **Wertschöpfungsbonus und Worst-Performing-Buildings-Bonus** (beide ab Q1
   2027 angekündigt) fehlen.

Alle vier betreffen erst 2027 – die App rechnet bis dahin richtig. Aber sie
laufen still ab, und das Regelpaket erinnert nicht von selbst daran.

---

## 5 · Was offen bleibt

* **Die Freigabe.** Name, Datum, Richtlinienfassung – von einem Menschen.
* **Zehn reale Objekte** für den eigentlichen Beleg.
* **Gradtagzahlen und Normaußentemperaturen** sind weiterhin Näherungen und
  gegen DIN EN 12831 Beiblatt bzw. DWD zu prüfen.
* **Die spezifischen Heizlasten nach Baujahr** sind gegen die eigene
  Hüllflächenrechnung abgeglichen, aber gegen kein reales Objekt.
