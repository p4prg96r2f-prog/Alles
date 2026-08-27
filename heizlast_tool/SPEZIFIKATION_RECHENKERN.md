# Spezifikation Rechenkern — Lücken gegenüber dem Referenzbericht

Abgleich des Referenzberichts `Bericht_Heizlast_Maelzerstr59.pdf` (17 Seiten, Stand 13.08.2026)
mit dem heutigen Rückgabeobjekt von `rechne()` in `src/kerne/kern_heizlast_norm.js`.

Belegquellen dieses Dokuments:

* `~/Desktop/Claude/heizlast_maelzerstr59/modell.py` — geprüftes Rechenmodell
* `~/Desktop/Claude/heizlast_maelzerstr59/stammdaten.py` — Eingangsgrößen mit Konfidenzklassen
* `~/Desktop/Claude/heizlast_maelzerstr59/build_bericht.py` — Formeln der abgeleiteten Berichtsgrößen
* Berichtsseiten 2, 8, 9, 10, 11, 13, 14

Alle im Folgenden genannten Zahlenwerte wurden am 20.08.2026 durch erneutes Ausführen von
`modell.rechne()` reproduziert. Es ist kein Wert geschätzt.

---

## 1 Was der Kern heute liefert

`rechne()` gibt zurück: `ok`, `warnungen`, `klima{theta_e, theta_e_m}`, `norm`, `zonen`,
`zonen_iterationen`, `raeume[]`, `bilanz{}`, `je_geschoss{}`, `je_we{}`, `A_gesamt`, `V_gesamt`,
`phi_raeume_summe`, `phi_gebaeude`, `phi_T_gebaeude`, `phi_V_gebaeude`, `phi_RH_gebaeude`,
`H_T`, `spez_gebaeude`.

Je Raum: `theta_i, A, h, V, bauteile[], phi_T_huelle, phi_T_innen, v_inf, v_min, v_dot,
maßgebend, e, epsilon, n_min, phi_V, phi_RH, f_RH, phi_raum, phi_gebaeude, spez`.

Damit sind aus dem Bericht bereits abgedeckt: Gebäudeheizlast, Summe der Raumheizlasten,
Transmission und Lüftung als Absolutwerte, die vollständige Raumtabelle auf Seite 10 (Spalten
θi, A, h, V, V_Luft, Φ_T Hülle, Φ_T innen, Φ_V, Φ_HL) und die Bauteilbilanz auf Seite 11
in den Spalten Fläche, U und Φ_T.

---

## 2 Fehlende Größen

### G1 — Anteil Transmission und Lüftung in Prozent

| | |
|---|---|
| Einheit | % |
| Wert Referenz | Transmission 71,3 %, Lüftung 28,7 % |
| Formel | `100 · Φ_T,Geb / Φ_HL,Geb` bzw. `100 · Φ_V,Geb / Φ_HL,Geb` |
| Beleg | `build_bericht.py` Z. 207/208; Bericht S. 2, Zeilen „davon Transmission" / „davon Lüftung" |
| Zusätzliche Eingaben | keine |
| Feldname | `anteil_T_prozent`, `anteil_V_prozent`, `anteil_RH_prozent` |

`src/modul_bericht.js` rechnet diese Anteile heute selbst in der Ansicht (Z. 95–98). Sobald das
Kontrollblatt dieselben Zahlen zeigt, gibt es zwei Rechenstellen für denselben Wert. Der Anteil
gehört in den Kern.

### G2 — Spezifische Heizlast bezogen auf die Wohnfläche

| | |
|---|---|
| Einheit | W/m² |
| Wert Referenz | 56,51 W/m², bezogen auf 160,03 m² Wohnfläche |
| Formel | `Φ_HL,Geb / A_WF` = 9.043,9 W / 160,03 m² |
| Beleg | `build_bericht.py` Z. 209; `stammdaten.py` `OBJEKT["wohnflaeche"]` (Klasse A, Wohnflächenberechnung 2020); Bericht S. 2 und S. 13 |
| Zusätzliche Eingaben | `objekt.wohnflaeche` in m² mit Herkunft; optional `wohnflaeche` je Wohneinheit |
| Feldname | `A_wohnflaeche`, `spez_wohnflaeche` |

Das heutige `spez_gebaeude = phi_gebaeude / A_gesamt` benutzt die Summe der Raumgrundflächen
(206,04 m²) und ergibt 43,9 W/m². Das ist eine andere Größe als die 56,5 W/m² des Berichts,
nicht derselbe Wert mit Rundungsfehler. Beide werden gebraucht, dürfen aber nicht denselben
Namen tragen: `spez_gebaeude` umbenennen in `spez_grundflaeche`.

**Folgefehler:** `kern_pruefung.js` Z. 108 vergleicht `e.phi_gebaeude / e.A_gesamt` gegen das
Erwartungsband aus `daten_typologie.js`. IWU-Typologiekennwerte sind Wohnflächenwerte. Solange
der Kern nur die Grundflächensumme kennt, prüft der Quervergleich systematisch gegen den
falschen Bezug und meldet zu niedrige spezifische Lasten. Der Bezug ist mit G2 zu klären.

### G3 — Heizlast je Geschoss als Gebäudeanteil und spezifisch

| | |
|---|---|
| Einheit | W bzw. kW und W/m² |
| Wert Referenz | EG 2.941 W / 42,8 W/m² · OG 2.380 W / 34,7 W/m² · DG 3.723 W / 54,2 W/m² |
| Formel | `Φ_Geb,g = Σ_{i∈g} (Φ_T,Hülle,i + Φ_V,i)`; `spez_g = Φ_Geb,g / A_g` |
| Beleg | `modell.py` `res["phi_geb_"+g]`; `build_bericht.py` Z. 211–213; Bericht S. 2 |
| Zusätzliche Eingaben | keine |
| Feldname | `je_geschoss[g].spez_gebaeude`, `.spez_raum`, `.anteil_prozent`, `.n_raeume`, `.V` |

Zwei Punkte sind heute nicht festgelegt und müssen es werden:

1. Der Bericht weist je Geschoss den **Gebäudeanteil** aus, nicht die Summe der Raumheizlasten.
   Für das EG ist das 2,94 kW gegenüber 2,96 kW. `je_geschoss` hält beide Werte, aber es steht
   nirgends, welcher gedruckt wird. Ohne Festlegung zeigen Kontrollblatt und Bericht
   unterschiedliche Geschosslasten.
2. Die Bezugsfläche im Referenzbericht ist `AGF = A_gesamt / 3` (`build_bericht.py` Z. 162) und
   damit nur zulässig, weil alle drei Geschosse denselben Grundriss haben. Allgemein ist
   `je_geschoss[g].A` zu nehmen; im Referenzfall liefert das denselben Wert 68,68 m².

### G4 — Wärmebrückenanteil an der Heizlast

| | |
|---|---|
| Einheit | W, zusätzlich % |
| Wert Referenz | 814,1 W = 0,81 kW = 9,0 % der Gebäudeheizlast |
| Formel | `Φ_WB = Σ_{k ∈ huelle} A_k · ΔU_WB · (θ_int,i − θ_j,k)` |
| Beleg | `build_bericht.py` Z. 351; Bericht S. 8, Abschnitt „Wärmebrücken" |
| Zusätzliche Eingaben | keine, `norm.delta_u_wb` liegt vor |
| Feldname | `phi_waermebruecken`, `anteil_wb_prozent` |

Die Summe läuft nur über Kategorie `huelle`. `nachbar` und `innen` bekommen den Zuschlag im
Kern nicht, `erdreich` ebenfalls nicht, weil dort das f_g1/f_g2-Verfahren greift. Der
Referenzfall hat kein erdberührtes Bauteil eines beheizten Raums, die Frage ist dort also nicht
entschieden. Für den allgemeinen Fall ist im Kern festzulegen und im Bericht zu benennen, ob
erdberührte Bauteile den pauschalen Zuschlag mittragen.

### G5 — Hüllfläche

| | |
|---|---|
| Einheit | m² |
| Wert Referenz | 383,60 m² gesamt, davon 318,37 m² mit Wärmebrückenzuschlag, 65,28 m² Haustrennwand |
| Formel | `A_Hülle = Σ_{k ∉ innen} A_k`; `A_Hülle,WBZ = Σ_{k ∈ huelle} A_k` |
| Beleg | Bericht S. 11, Summenzeile „Transmission gesamt 383,6" |
| Zusätzliche Eingaben | keine |
| Feldname | `A_huelle`, `A_huelle_mit_wbz`, `bilanz_summe {A, phi}` |

Wird für die Summenzeile der Bauteilbilanz und für die Plausibilitätsprüfung „Rückrechnung H_T"
(Bericht S. 13) gebraucht.

### G6 — Anteil je Bauteilgruppe und flächengewichteter U-Wert

| | |
|---|---|
| Einheit | % bzw. W/(m²·K) |
| Wert Referenz | Dachschräge 25,8 % · Fenster 16,3 % · Giebel 14,8 % · Garten 8,9 % · Straße 8,6 % · Haustrennwand 7,9 % · Kellerdecke 6,6 % · oGD 5,0 % · Drempel 3,5 % · Haustür 2,6 % |
| Formel | `Anteil_k = 100 · Φ_k / Φ_T,Geb`; `U_m,k = Σ(A·U) / Σ A` |
| Beleg | Bericht S. 11, Spalte „Anteil [%]" |
| Zusätzliche Eingaben | keine |
| Feldname | `bilanz[k].anteil_prozent`, `bilanz[k].U_m`, `bilanz[k].n`, `bilanz[k].f_x_m` |

Zusätzlicher Mangel: `bilanz[k].U` übernimmt heute den U-Wert des zuerst getroffenen Bauteils
der Gruppe (`kern_heizlast_norm.js`, Aufbau der Bilanz). Im Referenzobjekt ist das unschädlich,
weil jede Gruppe genau einen U-Wert hat. Sobald eine Gruppe gemischte U-Werte enthält — bei
KI-ausgelesenen Plänen der Normalfall, etwa Fenster verschiedener Baujahre — steht im Bericht
ein Wert, der für die Gruppe nicht gilt. Der flächengewichtete Mittelwert ist zu bilden und als
solcher zu beschriften.

### G7 — Teillastpunkte bei verschiedenen Außentemperaturen

| | |
|---|---|
| Einheit | kW je °C |
| Werte Referenz | −9,6 → 9,04 · −7,0 → 8,25 · −2,0 → 6,72 · 0,0 → 6,11 · 5,0 → 4,58 · 10,0 → 3,06 · 15,0 → 1,53 |
| Formel | `Φ(θ_e,x) = Φ_HL,Geb · (θ_bezug − θ_e,x) / (θ_bezug − θ_e)` mit `θ_bezug = 20 °C` |
| Beleg | `build_bericht.py` Z. 480–483; Bericht S. 11/12, Abschnitt 9 |
| Zusätzliche Eingaben | Liste der Stützstellen; `θ_bezug` (Vorgabe 20 °C); Heizgrenztemperatur nur als Beschriftung |
| Feldname | `teillast: [{theta_e, phi, anteil_prozent, bemerkung}]`, `teillast_bezugstemperatur` |

Zwei Dinge müssen dokumentiert werden, sonst wird die Tabelle falsch gelesen:

* Der Bezug ist die feste Innentemperatur 20 °C, **nicht** die Heizgrenze und nicht die
  gewichtete Raumtemperatur. Mit der Heizgrenze 15 °C als Bezug ergäbe sich bei −7 °C
  8,09 kW statt der ausgewiesenen 8,25 kW.
* Die Zeile „15,0 °C — Heizgrenze" ist eine Beschriftung. Der Wert 1,53 kW ist die lineare
  Fortschreibung bis 15 °C, nicht der tatsächliche Bedarf an der Heizgrenze (der wäre null).
  Entweder bleibt die Formulierung des Referenzberichts erhalten oder sie wird bewusst
  geändert — stillschweigend darf sie sich nicht verschieben.

### G8 — Bilanz der unbeheizten Zonen

| | |
|---|---|
| Einheit | W/K je Wärmestrompfad, °C |
| Werte Referenz | Keller: H_oben 21,2 gegen 20,0 °C, H_Luft 42,2 gegen −9,6 °C, H_Erd 59,6 gegen 7,0 °C → 3,5 °C. Spitzboden: H_unten 7,6 gegen 20,0 °C, H_aussen 155,1 gegen −9,6 °C → −8,2 °C |
| Formel | `θ_u = Σ(H_n · θ_n) / Σ H_n`, `H_n = Σ A · U` ohne Wärmebrückenzuschlag |
| Beleg | `modell.py` `theta_keller()` / `theta_dachraum()`; Bericht S. 10, Abschnitt 6 |
| Zusätzliche Eingaben | je Zonenbauteil eine Pfadbeschriftung, Feld `gruppe` (z. B. „Außenluft", „Erdreich", „beheizte Räume oben") |
| Feldname | `zonen_bilanz: {id: {name, theta, H_gesamt, f_x, gruppen: [{name, H, theta, anteil_prozent}], konvergiert}}` |

`zonenTemperaturen()` rechnet diese Bilanz bereits vollständig, verwirft aber `zufuhr` und die
Hüllanteile und gibt nur die Temperatur zurück. Ohne die Pfadtabelle lässt sich Abschnitt 6 des
Berichts nicht erzeugen, und der Nachweis, dass die Zonentemperatur gerechnet und nicht pauschal
angenommen wurde, fehlt. Genau dieser Nachweis ist der Punkt des Abschnitts.

### G9 — Temperaturkorrekturfaktor f_x

| | |
|---|---|
| Einheit | dimensionslos |
| Werte Referenz | Kellerdecke 0,556 · oberste Geschossdecke 0,953 · Haustrennwand Nr. 61 0,203 |
| Formel | `f_x = (θ_int,i − θ_j) / (θ_int,i − θ_e)` |
| Beleg | `modell.py`, `Bauteil.H()` (dort als `f_k`); Bericht S. 10 nennt 0,56 für die Kellerdecke ausdrücklich gegenüber dem pauschalen 0,5 |
| Zusätzliche Eingaben | keine |
| Feldname | `bauteil.f_x` je Bauteil, `zonen_bilanz[id].f_x` je Zone |

f_x ist die Größe, mit der ein Prüfer den gerechneten Ansatz gegen die pauschalen Tabellenwerte
hält. Der Kern kennt `theta_j` je Bauteil, gibt aber f_x nicht aus.

### G10 — Eindeutige Definition von H_T

| | |
|---|---|
| Einheit | W/K |
| Werte | `Σ A·U_eff·f_x` = 224,76 W/K gegenüber `Φ_T,Geb / (20 − θ_e)` = 217,78 W/K |
| Beleg | beide aus `modell.rechne()` reproduziert; Differenz 7,0 W/K = 3,2 % |
| Zusätzliche Eingaben | keine |
| Feldname | `H_T` (als `Σ A·U_eff·f_x`), zusätzlich `H_T_bezug20` falls beide gebraucht werden |

Der Kern rechnet heute `H_T = phi_T_gebaeude / (20 − theta_e)`. Das ist nur dann dasselbe wie
`Σ A·U_eff·f_x`, wenn alle Räume auf 20 °C liegen. Sobald Bad (24 °C) und Treppenhaus (15 °C)
im Modell sind, gehen die beiden Definitionen auseinander. Der Referenzbericht druckt H_T nicht,
es ist also keine Berichtslücke — aber die Prüfung „Rückrechnung H_T" auf S. 13 braucht den Wert,
und ein Wert mit zwei möglichen Bedeutungen taugt nicht für einen Nachweis. Die gewählte
Definition muss im Bericht mit der Formel danebenstehen.

### G11 — Summe der inneren Übertragung und Bilanzschluss

| | |
|---|---|
| Einheit | W |
| Wert Referenz | Σ Φ_T,innen = 48,5 W; Φ_Raumsumme − Φ_Gebäude = 9.092,5 − 9.043,9 = 48,6 W |
| Formel | `Σ_i Φ_T,innen,i` |
| Beleg | Bericht S. 10, Summenzeile Spalte Φ_T innen („49"); Bericht S. 13, Prüfung „Bilanzschluss" |
| Zusätzliche Eingaben | keine |
| Feldname | `phi_T_innen_gebaeude`, `differenz_raum_gebaeude` |

Siehe Abschnitt 3 — dieser Wert ist mehr als eine Summenzeile, er ist die eigentliche Kontrolle
über die Widerspruchsfreiheit des Raummodells.

### G12 — Volumenstromsumme und Infiltrationsluftwechsel

| | |
|---|---|
| Einheit | m³/h bzw. 1/h |
| Werte Referenz | Σ V̇ = 263,8 m³/h; n_inf = 0,24 1/h bei zwei und mehr exponierten Fassaden, 0,16 1/h bei einer |
| Formel | `n_inf,i = V̇_inf,i / V_i = 2 · n50 · e_i · ε_i`; `n_i = V̇_i / V_i` |
| Beleg | Bericht S. 10 Summenzeile; Bericht S. 8, Abschnitt „Lüftung" nennt 0,24 1/h ausdrücklich |
| Zusätzliche Eingaben | keine |
| Feldname | `v_dot_gesamt`, `raum.n_inf`, `raum.n_effektiv`, `lueftung_maßgebend {n_raeume_min, n_raeume_inf, n_inf_max}` |

Die Aussage des Berichts „die Wahl von n50 hat keinen Einfluss auf das Ergebnis" ist eine
Schlussfolgerung aus diesen Zahlen. Sie lässt sich nur belegen, wenn der Kern sagt, in wie vielen
Räumen der Mindestluftwechsel maßgebend war. `raum.maßgebend` liegt je Raum vor, die
Auswertung über alle Räume fehlt.

### G13 — Klimadatensatz vollständig im Ergebnis

| | |
|---|---|
| Einheit | °C, m ü. NN |
| Werte Referenz | θe −9,6 °C · θe,m 10,1 °C · 140 m ü. NN · Klimazone 6 · PLZ 33098 |
| Beleg | Bericht S. 8, Tabelle „Klima und Innentemperaturen" mit Fundstelle je Zeile |
| Zusätzliche Eingaben | Standorthöhe, Klimazone, PLZ/Ort, Bezeichnung und Stand des Datensatzes |
| Feldname | `klima: {theta_e, theta_e_m, hoehe_ue_nn, klimazone, plz, ort, quelle}` |

Der Kern reicht heute nur `theta_e` und `theta_e_m` durch. Die Standorthöhe steht im Bericht mit
Fundstelle; ohne sie im Ergebnis muss der Berichtsbaustein auf die Eingabe zurückgreifen und die
beiden Wege können auseinanderlaufen.

### G14 — Verwendete Raumarten mit Innentemperatur und Fundstelle

| | |
|---|---|
| Einheit | °C, 1/h |
| Werte Referenz | 20 °C (Tab. 32 Zeile 1) · 24 °C Bad (Zeile 7) · 15 °C Treppenhaus (Zeile 9) · n_min 0,5 1/h für alle (Tab. 12) |
| Beleg | Bericht S. 8 und S. 14 |
| Zusätzliche Eingaben | Fundstelle je Raumart in `projekt.raumarten` |
| Feldname | `raumarten_verwendet: [{art, theta_i, n_min, n_raeume, A, fundstelle}]` |

Der Kern löst θi je Raum auf, gibt aber keine Liste der tatsächlich verwendeten Arten aus. Für
den Nachweis wird genau diese Liste gedruckt, nicht die Liste der angebotenen Arten.

### G15 — U-Wert-Nachweis aus dem Schichtaufbau

| | |
|---|---|
| Einheit | m²·K/W je Schicht, W/(m²·K) |
| Werte Referenz | Außenwand ΣR 2,167 → U 0,471 · oGD ΣR 5,660 → U 0,177 · Kellerdecke ΣR 3,414 → U 0,293 · Dachschräge → U 2,00 |
| Formel | `R_j = d_j / λ_j`; `R_ges = R_si + Σ R_j + R_se`; `U = 1 / R_ges + Zuschlag` (DIN EN ISO 6946) |
| Beleg | `modell.py` `u_wert()` und `U_NACHWEIS`; Bericht S. 9 |
| Zusätzliche Eingaben | `bauteiltypen[].schichten [{name, d, lambda}]`, `rsi`, `rse`, `zuschlag`, `bemerkung`, `quelle` |
| Feldname | `u_nachweise: [{id, titel, rsi, rse, schichten: [{name, d, lambda, R}], R_ges, U, zuschlag, bemerkung}]` |

`uWertAusSchichten()` existiert im Kern, liefert aber nur `{u, r}` und wird von `rechne()` gar
nicht aufgerufen. Die Schichttabellen auf S. 9 sind aus dem Ergebnisobjekt heute nicht
erzeugbar. Da der neue Fragebogen mit Typologiewerten vorbelegt wird und Überschreibungen als
belegt gelten, muss der Kern für jeden gerechneten U-Wert entweder den Schichtnachweis oder die
Quelle der Direkteingabe mitführen — sonst ist im Bericht nicht unterscheidbar, welcher U-Wert
gerechnet und welcher gesetzt wurde.

### G16 — Herkunft und Konfidenz aggregiert

| | |
|---|---|
| Einheit | Zähl- und Prozentwerte |
| Werte Referenz | Klassen A / B / C mit je Angabe und Begründung, Bericht S. 14, 20 Zeilen |
| Formel | Aggregation über alle Eingaben, nicht nur über Bauteile |
| Beleg | `stammdaten.py` Kopfkommentar (Definition A/B/C); Bericht S. 14 |
| Zusätzliche Eingaben | `quelle` und `klasse` an **allen** Eingabefeldern: Klima, Luftdichtheit, Zonenannahmen, Raumhöhen, Raumflächen, Nachbartemperatur — heute nur an Bauteilen |
| Feldname | `herkunft: {A: [...], B: [...], C: [...], anteil_belegt_flaeche, anteil_belegt_phi}` |

`anteil_belegt_phi` — welcher Anteil der gerechneten Heizlast auf Annahmen der Klasse C beruht —
ist die aussagekräftigere Zahl und die, die das Kontrollblatt zum Hervorheben unsicherer Werte
braucht. Sie ist heute nirgends gebildet.

### G17 — Heizlast je Wohneinheit vollständig

`je_we` führt `phi_raum`, `A` und `raeume`. Es fehlen `phi_gebaeude`, `spez_wohnflaeche`, `V`,
`n_geschosse`. Der Referenzbericht hat keine Wohneinheiten-Tabelle, das Werkzeug jedoch schon;
die Werte müssen nach derselben Regel gebildet sein wie die Geschosswerte in G3, sonst addieren
sich Wohneinheiten und Geschosse zu verschiedenen Summen.

### G18 — Prüfgrößen aus Außenmaßen (nicht aus dem Kern herleitbar)

Die Plausibilitätsprüfungen auf S. 13 vergleichen unter anderem das Gebäudevolumen V_e
(850,08 m² gegen 828 m³ aus der KfW-Datei) und die Kerndämmfläche (182,21 gegen 182,00 m²).
Beides sind Außenmaßgrößen. Der Kern rechnet konsequent mit Innenmaßen und kennt nur das
beheizte Netto-Luftvolumen (527,6 m³). Diese Prüfwerte sind daher **nicht** aus dem Rechenkern
abzuleiten; sie brauchen eigene Eingabefelder (`objekt.volumen_aussen`, `objekt.huellflaeche`,
Kontrollwerte aus Fremdunterlagen) und gehören in `kern_pruefung.js`, nicht in
`kern_heizlast_norm.js`. Das ist hier festgehalten, damit es nicht versehentlich im Rechenkern
landet.

---

## 3 Bewertung: Raumheizlast gegen Gebäudeheizlast

### Die Definition stimmt

Der Kern bildet dieselbe Trennung wie das Referenzmodell:

```
Φ_Raum,i     = Φ_T,Hülle,i + Φ_T,innen,i + Φ_V,i  (+ Φ_RH,i)
Φ_Geb-Anteil = Φ_T,Hülle,i               + Φ_V,i  (+ Φ_RH,i)
```

`Φ_T,Hülle` umfasst in beiden Modellen die Kategorien `huelle`, `nachbar` und im Kern zusätzlich
`erdreich`. Das deckt sich mit der Fußnote auf Bericht S. 10: „Φ_T Hülle enthält die Verluste an
Außenluft, an den unbeheizten Keller, an den Spitzboden und an das Nachbargebäude." Die
Haustrennwand zu Nr. 61 zählt also in die Gebäudeheizlast — im Kern über Kategorie `nachbar`
ohne Wärmebrückenzuschlag, genau wie in `modell.py`. Die Zahlen des Berichts sind mit der
heutigen Kernlogik reproduzierbar. **Die Trennung passt.**

### Was daran trotzdem nicht trägt

**1. Die Bilanzprüfung des Berichts kann nicht durchfallen.**
Bericht S. 13 prüft „Σ Φ_Raum − Σ interne Übertragung = Φ_Gebäude" und meldet 9.043,94 gegen
9.043,94, bestanden. Diese Gleichung gilt per Konstruktion, weil die Gebäudeheizlast genau als
Raumsumme minus interne Übertragung gebildet wird. Sie prüft nichts.

Die belastbare Prüfung ist eine andere: **Σ Φ_T,innen muss null sein.** Jedes innere Bauteil
kommt in einem geschlossenen Gebäude zweimal vor, einmal mit jedem Vorzeichen. Im Referenzmodell
ist die Summe aber **+48,5 W**. Die Zerlegung zeigt, woher:

| Geschoss | Bad Decke/Fußboden | Innenwände und Türen |
|---|---|---|
| EG | +16,2 W | 0,0 W |
| OG | +32,4 W | 0,0 W |
| DG | +16,2 W | −16,3 W |
| **Summe** | **+64,8 W** | **−16,3 W** |

* **+64,8 W** stammen aus den Bauteilen „Fußboden gegen Wohnung" und „Decke gegen Wohnung" des
  Bades (A = 4,50 m², U = 0,90 W/(m²·K), Δθ = 4 K → 16,2 W je Bauteil). `modell.py` legt sie nur
  an der Badseite an; der Raum darüber beziehungsweise darunter bekommt kein Gegenstück. Der
  Wärmestrom wird also abgegeben, aber nirgends empfangen.
* **−16,3 W** entstehen im Dachgeschoss, weil dort jeder Raum seine eigene mittlere Höhe
  `h = V/A` hat (Wohnzimmer 2,12 m, Treppenhaus 2,24 m, Bad 1,96 m). Dieselbe Trennwand bekommt
  von beiden Seiten unterschiedliche Flächen. In EG und OG mit einheitlich 2,75 m heben sich die
  Wandpaare exakt auf, dort steht 0,0 W.

Das sind 0,5 % der Raumlastsumme, im Referenzfall unkritisch. Für das neue Werkzeug ist es das
nicht: Räume kommen dort aus einer KI-Auslese von Plänen, Höhen sind je Raum verschieden und
Nachbarschaftsbeziehungen werden automatisch erzeugt. Unpaarige Innenbauteile werden der
Regelfall, nicht die Ausnahme.

**Zu tun im Rechenkern:**

* `phi_T_innen_gebaeude` ausgeben (G11).
* Warnung, wenn `|Σ Φ_T,innen| > max(50 W; 1 % von Φ_Geb)`, mit Nennung der Räume, deren
  Innenbauteile kein Gegenstück haben.
* Besser noch: Innenbauteile über die Raum-ID des Nachbarn definieren (`grenzt_an {typ:"raum",
  ref}` gibt es bereits) und das Gegenstück im Kern automatisch erzeugen, mit **einer** Fläche
  für beide Seiten. Damit ist die Summe konstruktiv null und die Prüfung wird zur echten
  Kontrolle der Flächenkonsistenz.

**2. Die Geschosswerte sind zweideutig.**
`je_geschoss[g]` führt `phi_raum` und `phi_gebaeude` gleichrangig. Der Bericht druckt
`phi_gebaeude` (EG 2,94 kW), das Kontrollblatt würde ohne Festlegung `phi_raum` zeigen
(EG 2,96 kW). Beide Werte sind richtig, aber sie dürfen nicht unbeschriftet nebeneinander
auftauchen. Festlegen und in beiden Ausgaben beschriften.

**3. `Φ_RH` verschiebt die Gebäudeheizlast still.**
`raumRechnen()` addiert die Aufheizleistung sowohl in `phi_raum` als auch in `phi_gebaeude`. Für
die Heizflächenauslegung ist das richtig, für die Erzeugerauslegung ist die ungeprüfte Addition
über alle Räume zu konservativ, weil die Wiederaufheizung nicht in allen Räumen gleichzeitig
angesetzt werden muss. Im Referenzfall ist `f_RH = 0`, es gibt also keinen Widerspruch zum
Bericht. Sobald ein Nutzer `f_RH` setzt, wächst die Erzeugerleistung ohne sichtbaren Hinweis.
`phi_gebaeude` und `phi_gebaeude_ohne_RH` sind getrennt auszugeben, und der Bericht muss sagen,
welcher Wert die Auslegungsgrundlage ist.

**4. Unbeheizte Räume sind im Raummodell nicht vorgesehen.**
Ein unbeheizter Raum innerhalb des Gebäudes muss als Zone (`projekt.zonen`) modelliert werden,
nicht als Raum mit niedriger `theta_i`. Andernfalls geht er mit einer eigenen Lüftungslast in die
Gebäudeheizlast ein, die es nicht gibt. Der Kern prüft das nicht. Für die neue Auslese, die aus
einem Plan auch Abstellräume und Speicher erkennt, ist eine Regel nötig: Raumarten ohne
festgelegte Norm-Innentemperatur werden zur Zone, nicht zum Raum.

---

## 4 Bewusst nicht aufgenommen

Nach der Vorgabe „Rechnung und Nachweis, kein Beratungsteil" entfallen aus dem Referenzbericht:

* Abschnitt 8 „Varianten und Empfindlichkeit" (S. 11) — Variantenrechnung.
* Abschnitt 9 ab „Empfehlung" (S. 12) — Gerätewahl, Sperrzeitfaktor 24/20, Speicherladung
  1,5 kW, die daraus gebildeten 12,7 kW, Gradstunden-Abschätzung der Jahresarbeit.

Nicht entfallen, weil es reine Rechenergebnisse und kein Rat sind:

* Die Teillasttabelle selbst (G7). Sie ist die lineare Auswertung der Heizlast, keine Empfehlung.
* Der Vergleich der U-Werte mit den technischen Mindestanforderungen der BEG (Bericht S. 8,
  Spalten „BEG EM Anforderung" und „Bewertung"). **Entscheidung erforderlich:** das ist ein
  Nachweis, kein Beratungsteil, braucht aber eine gepflegte Anforderungstabelle mit
  Fassungsdatum. Ohne diese Tabelle darf die Spalte nicht erzeugt werden, sonst entstehen
  erfundene Anforderungswerte.

---

## 5 Änderung am Ergebnisobjekt in Kurzform

Neu auf oberster Ebene:

```
anteil_T_prozent, anteil_V_prozent, anteil_RH_prozent
A_wohnflaeche, spez_wohnflaeche
spez_grundflaeche            (ersetzt spez_gebaeude, gleicher Rechenweg, klarer Name)
phi_waermebruecken, anteil_wb_prozent
phi_T_innen_gebaeude, differenz_raum_gebaeude
A_huelle, A_huelle_mit_wbz, bilanz_summe
v_dot_gesamt, lueftung_maßgebend
H_T                          (Definition Σ A·U_eff·f_x), optional H_T_bezug20
phi_gebaeude_ohne_RH
teillast[], teillast_bezugstemperatur
zonen_bilanz{}
raumarten_verwendet[]
u_nachweise[]
herkunft{}
klima{}                      (um hoehe_ue_nn, klimazone, plz, ort, quelle erweitert)
```

Neu je Geschoss (`je_geschoss[g]`): `spez_gebaeude`, `spez_raum`, `anteil_prozent`, `n_raeume`, `V`.

Neu je Wohneinheit (`je_we[w]`): `phi_gebaeude`, `spez_wohnflaeche`, `V`, `n_geschosse`.

Neu je Bauteilgruppe (`bilanz[k]`): `anteil_prozent`, `U_m`, `f_x_m`, `n`.

Neu je Bauteil (`raum.bauteile[]`): `f_x`.

Neue Eingaben, die es heute nicht gibt: `objekt.wohnflaeche`, `objekt.volumen_aussen`,
`objekt.huellflaeche`, `klima.hoehe_ue_nn`, `klima.klimazone`, `klima.quelle`,
`bauteiltypen[].schichten/rsi/rse/zuschlag`, `zonen[].huelle[].gruppe`,
`raumarten[].fundstelle`, sowie `quelle`/`klasse` an allen Eingabefeldern statt nur an Bauteilen.
