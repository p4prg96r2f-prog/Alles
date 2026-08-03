# Aktien-Screener: „Magic Formula Plus"

Ein Werkzeug, um **qualitativ gute Unternehmen zu günstigen Preisen** zu finden –
inspiriert von Joel Greenblatts Magic Formula, erweitert um Filter gegen
Value Traps (billige Aktien, die zurecht billig sind).

> ⚠️ **Das ist keine Anlageberatung.** Der Screener ist Schritt 1 von 3:
> Er filtert mechanisch vor. Kaufen solltest du erst nach der Handarbeit
> (siehe Checkliste unten) – und grundsätzlich nur als Beimischung zu einem
> breit gestreuten Welt-ETF.

## Schnellstart

```bash
# Einmalig: Pakete installieren
pip install -r requirements.txt

# Einmalig: Aktienlisten (S&P 500, DAX, MDAX, EURO STOXX 50) laden
python3 screener.py --universum-aktualisieren

# Screening starten
python3 screener.py --universum europa        # DAX + MDAX + EURO STOXX 50
python3 screener.py --universum usa           # S&P 500 (dauert ~15 Min)
python3 screener.py --universum alle          # alles zusammen
python3 screener.py --tickers meine_liste.txt # eigene Liste, ein Ticker pro Zeile
```

Nützliche Optionen:

| Option | Bedeutung | Standard |
|---|---|---|
| `--top 30` | Anzahl Zeilen in der Konsolen-Tabelle | 25 |
| `--min-marktkap 5` | Mindestgröße in Mrd. (€/$) | 1 |
| `--cache-tage 7` | Wie lange geladene Daten wiederverwendet werden | 3 |
| `--limit 20` | Nur die ersten N Aktien (zum Ausprobieren) | – |

Die vollständigen Ergebnisse (alle Aktien, alle Kennzahlen, Ausschlussgründe)
landen als CSV in `ergebnisse/` – Semikolon-getrennt, öffnet sich direkt in Excel.

## Was der Screener misst

**Qualität – ist die Firma großartig?**

| Kennzahl | Bedeutung | Filter |
|---|---|---|
| ROCE (Kapitalrendite) | EBIT ÷ eingesetztes Kapital – wie gut macht die Firma aus Kapital Gewinn? | ≥ 15 % |
| Umsatzwachstum | Durchschnitt der letzten ~4 Jahre | > 0 % |
| Nettoschulden/EBITDA | Wie viele Jahresgewinne bräuchte es, um die Schulden zu tilgen? | ≤ 3 |
| FCF-Historie | Free Cashflow sollte fast jedes Jahr positiv sein | max. 1 negatives Jahr |

**Bewertung – ist sie günstig?**

| Kennzahl | Bedeutung | Filter |
|---|---|---|
| Gewinnrendite | EBIT ÷ Unternehmenswert (Kehrwert eines schuldenbereinigten KGV) | ≥ 5 % |
| FCF-Rendite | Free Cashflow ÷ Marktkapitalisierung – die „ehrliche" Dividende | ≥ 3 % |

**Ranking:** Wie bei Greenblatt wird jede Aktie einmal nach Qualität (ROCE) und
einmal nach Bewertung (Gewinnrendite) platziert; die Summe beider Plätze ist der
**Magic-Rang**. Ganz oben stehen Firmen, die *gleichzeitig* gut und günstig sind.

**Automatisch aussortiert:** Banken, Versicherer, Versorger und Immobilienfirmen
(deren Bilanzen machen EBIT/ROCE unbrauchbar – das macht Greenblatt genauso)
sowie Aktien mit Währungsmix oder Datenlücken. Der Grund steht im CSV.

## Wichtig: „0 Kandidaten" ist ein normales Ergebnis

Wenn keine Aktie alle Filter besteht, ist der Markt gerade teuer – dann ist
Warten die richtige Strategie („There are no called strikes in investing").
Die Rangliste zeigt trotzdem die relativ attraktivsten Werte. Wer mehr Treffer
will, kann einzelne Schwellen bewusst lockern – aber wissen, was man aufgibt.

## Die Handarbeit: Checkliste vor jedem Kauf

Der Screener findet *Kandidaten*, keine Käufe. Für jeden Kandidaten:

1. **Warum ist die Aktie günstig?** Es gibt immer einen Grund. Gut: vorübergehendes
   Problem (schwaches Quartal, Branchenpanik). Schlecht: strukturelles Problem
   (schrumpfender Markt, kaputtes Geschäftsmodell). Wenn du keinen Grund findest,
   hast du nicht genug gesucht.
2. **Gibt es einen Burggraben?** Marke, Netzwerkeffekt, Wechselkosten oder
   Kostenvorteil, der Konkurrenten 10 Jahre draußen hält. Ohne Burggraben frisst
   der Wettbewerb die hohe Kapitalrendite wieder auf.
3. **Wächst der Markt der Firma langfristig?** Vervielfachen kann sich nur, wer
   über Jahrzehnte reinvestieren kann.
4. **Ist das Management ehrlich und beteiligt?** Geschäftsberichte der letzten
   3–5 Jahre lesen: Wurde gehalten, was versprochen war? Halten Vorstände selbst
   Aktien?
5. **Sicherheitsmarge:** Kaufe nur deutlich unter deinem geschätzten fairen Wert
   (Faustregel: mindestens 30 % Abschlag). Frage umgekehrt: Welches Wachstum
   preist der aktuelle Kurs ein – und ist das realistisch zu schaffen?

## Grenzen des Werkzeugs

- **Datenqualität:** Yahoo Finance ist kostenlos und meist gut, aber nicht
  fehlerfrei. Kennzahlen eines Kandidaten immer in einer zweiten Quelle
  gegenprüfen (Geschäftsbericht, aktienfinder.net, marketscreener.com).
- **Rückspiegel:** Alle Kennzahlen beschreiben die Vergangenheit. Der Screener
  sieht weder eine Übernahme noch einen Skandal von morgen.
- **Steuern & Kosten:** Häufiges Umschichten kostet in Deutschland ~26 %
  Abgeltungsteuer auf realisierte Gewinne. Lieber selten und überzeugt handeln.
- **Disziplin schlägt Formel:** Die Strategie funktioniert historisch nur für
  die, die sie auch in schwachen Jahren durchhalten. 5+ Jahre Horizont, sonst
  gar nicht anfangen.

## Technische Hinweise

- Geladene Daten werden in `cache/` zwischengespeichert (Standard: 3 Tage gültig).
  Ein abgebrochener Lauf kann einfach neu gestartet werden und überspringt
  bereits geladene Aktien.
- Hinter einem Firmen-/Cloud-Proxy schaltet das Skript automatisch auf einen
  kompatiblen HTTP-Modus um (Meldung „nutze requests-Fallback" ist normal).
- Bei Yahoo-Rate-Limits wartet das Skript automatisch und versucht es erneut.
