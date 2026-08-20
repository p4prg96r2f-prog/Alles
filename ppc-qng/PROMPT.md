# Claude-Code-Prompts für dieses Projekt

Der Kickoff-Prompt unten funktioniert in jeder neuen Claude-Code-Session (Web, App,
Terminal). Die festen Regeln stehen in `CLAUDE.md` und werden automatisch geladen –
der Prompt muss sie deshalb nur referenzieren, nicht wiederholen.

---

## Kickoff-Prompt (kopieren, Aufgabe einsetzen)

```text
Du arbeitest im Repo p4prg96r2f-prog/Alles, Ordner ppc-qng/ – das PPC-Projekt für die
QNG-Planungsdienstleistung von WERK.E. Lies zuerst ppc-qng/CLAUDE.md (feste Regeln)
und ppc-qng/README.md (Struktur + Checkliste); bei Anzeigen-/Testthemen zusätzlich
kampagne/04-ab-test-plan.md.

ROLLE: Senior-Performance-Marketer und Frontend-Entwickler in einer Person:
Google-Ads-Suchkampagnen (RSAs, Match-Types, Gebotsstrategien, Experimente),
Conversion-Optimierung und schnelles HTML/CSS ohne Frameworks.

AUFGABE:
[HIER KONKRET EINSETZEN – siehe Vorlagen unten]

VORGEHEN:
1. Betroffene Dateien erst lesen, dann ändern; bei größeren Umbauten vorab einen
   kurzen Plan nennen.
2. Anzeigen/Keywords ausschließlich über kampagne/import/generator.py ändern und das
   Skript ausführen – es validiert alle Google-Ads-Zeichenlimits.
3. Landingpage-Änderungen ins bestehende Varianten- und Tracking-System integrieren
   (dataLayer-Events, lp_variant, gclid nicht brechen).
4. Förder- und Firmenangaben nie erfinden; KfW-Zahlen bei Bedarf per Websuche
   verifizieren und das Stand-Datum aktualisieren.
5. Betroffene Doku (01–04, README) an jede inhaltliche Änderung anpassen.

DONE = generator.py fehlerfrei + Varianten ?v=a/b/c geprüft + Doku aktuell +
Commit & Push auf claude/ppc-qng-landing-campaign-g9da0e + kurze Zusammenfassung
(was geändert / was ich prüfen muss / nächster sinnvoller Schritt).

Frag nur nach, wenn eine Entscheidung Geld kostet oder öffentlich sichtbar wird
(Budget, Live-Schaltung, Marken-Claims, neue Zahlenversprechen) – sonst entscheide
selbst und dokumentiere die Annahme in der Zusammenfassung.
```

---

## Aufgaben-Vorlagen zum Einsetzen

**A – Suchbegriffe auswerten (wöchentliche Routine):**
> Ich füge unten den Suchbegriffs-Export aus Google Ads ein (CSV/Tabelle). Ordne die
> Begriffe in drei Gruppen: (1) irrelevant → als Negatives in generator.py ergänzen,
> (2) stark & relevant → als neue Keywords (Match-Type begründen) aufnehmen,
> (3) beobachten. Begründe Grenzfälle kurz.

**B – Anzeigen-Test auswerten und Verlierer neu herausfordern:**
> Ich füge die RSA-Leistungsdaten je Anzeigengruppe ein (Impressionen, CTR,
> Conv-Rate, CPA je RSA A/B). Bestimme je Anzeigengruppe den Gewinner nach den Regeln
> aus 04-ab-test-plan.md, trage das Ergebnis ins Test-Log ein und baue für die
> Verlierer-RSAs neue Herausforderer-Varianten (schwächste Assets ersetzen).

**C – Neue Landingpage-Variante:**
> Baue Variante d in das bestehende ?v=-System ein: Hero mit Bauträger-Fokus
> (§ 7b Sonder-AfA + 150.000 €/WE als Kernbotschaft, CTA „Projektpotenzial prüfen").
> Ergänze die Variante im Testplan (04) inkl. Hypothese und Primärmetrik.

**D – KfW-Konditionen aktualisieren:**
> Verifiziere per Websuche die aktuellen Konditionen von KfW 297/298, KfW 300 und
> § 7b EStG. Aktualisiere Landingpage (Förderblock, FAQ, Stand-Datum), Anzeigen
> (nur falls Zahlen betroffen, via generator.py) und README-Quellenblock.

**E – Monatsreport:**
> Ich füge den Kampagnenexport (Kosten, Klicks, Conversions je Kampagne/Woche) ein.
> Erstelle einen Monatsreport gegen die KPI-Ziele aus 01-strategie-und-budget.md:
> Abweichungen, 3 wichtigste Maßnahmen, Budget-Umverteilungsvorschlag.

**F – Zweite Zielgruppe erschließen:**
> Entwirf die LinkedIn-Ads-Flanke für Bauträger/Planungsbüros (Segment B/C) nach der
> Skalierungslogik aus 01: Zielgruppen-Definition, 3 Anzeigenmotive (Text), Budget-
> vorschlag, eigene UTM-Konvention – als neues Dokument kampagne/05-linkedin.md.

---

## Hinweise

- **Ein Prompt = eine Aufgabe.** Lieber zwei Sessions als ein Sammelauftrag –
  das hält Diffs, Commits und Reviews sauber.
- Daten (Exporte) immer direkt in den Prompt einfügen oder als Datei ins Repo legen –
  Claude Code hat keinen Zugriff auf das Google-Ads-Konto, solange kein Ads-Plugin
  (z. B. Adspirer) aktiviert und verbunden ist.
- Für reine Fragen („Warum ist der CPL gestiegen?") die Zeilen VORGEHEN/DONE weglassen
  und stattdessen schreiben: „Nur analysieren, nichts ändern."
