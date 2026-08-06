# -*- coding: utf-8 -*-
"""Inhalte der GREEN-Website: Branchen, FAQ, Team, Testimonials.
Wird von build.py importiert. Nur Daten, keine Logik."""

COMPANY = {
    "name": "Green HLB GmbH",
    "brand": "GREEN",
    "claim": "Energieberatung für Nichtwohngebäude",
    "street": "Rolandsweg 80",
    "zip_city": "33102 Paderborn",
    "phone_display": "05251 40 29 29 10",
    "phone_link": "+4952514029 2910".replace(" ", ""),
    "email": "info@green-nwg.de",
    "hours": "Mo–Fr 08:00–16:00 Uhr",
    "hrb": "Amtsgericht Paderborn, HRB 16341",
    "tax": "Steuernummer: 5339/5818/2470",
    "managers": "Sebastian Hund, Vadim Berg, David Lamping",
    "base_url": "https://green-nwg.de",
}

# Reihenfolge = Anzeige-Reihenfolge im Branchen-Raster
INDUSTRIES = [
    {
        "slug": "buero",
        "name": "Bürogebäude",
        "short": "Büro",
        "card": "LED, Lüftung, Kühlung, IT: In Büros stecken die größten Sparpotenziale in der Technik – oft ohne Komfortverlust.",
        "title": "Energieberatung für Bürogebäude | GREEN Paderborn",
        "desc": "Energiekosten im Bürogebäude senken: unabhängige Energieberatung für Beleuchtung, Lüftung, Klimatisierung und PV – mit bis zu 50 % Förderung. Jetzt beraten lassen.",
        "h1": "Energieberatung für Bürogebäude",
        "intro": (
            "Bürogebäude verbrauchen den größten Teil ihrer Energie dort, wo niemand hinschaut: "
            "in Lüftungsanlagen, die nachts weiterlaufen, in überdimensionierter Kühlung und in veralteter "
            "Beleuchtung. Gleichzeitig steigen Strompreis, CO₂-Abgabe und die Erwartungen von Mietern "
            "und Mitarbeitenden an ein modernes, komfortables Gebäude.",
            "Wir analysieren Ihr Bürogebäude unabhängig von Herstellern und Handwerksbetrieben, "
            "berechnen Einsparpotenziale nach anerkannten Normverfahren und liefern Ihnen einen "
            "priorisierten Maßnahmenplan – inklusive Wirtschaftlichkeitsrechnung und Förderstrategie."
        ),
        "pains": (
            ("Technik läuft rund um die Uhr", "Lüftung, Kühlung und IT-Räume verbrauchen auch nachts und am Wochenende Energie – oft 30 % des Gesamtverbrauchs."),
            ("Veraltete Beleuchtung", "Leuchtstoffröhren und fehlende Präsenzsteuerung machen Licht zum zweitgrößten Stromfresser im Büro."),
            ("Steigende Nebenkosten", "Hohe Energiekosten schmälern die Rendite und machen Flächen im Wettbewerb um Mieter unattraktiv."),
        ),
        "measures": (
            ("Beleuchtung auf LED mit Sensorik", "Umrüstung auf LED mit Präsenz- und Tageslichtsteuerung senkt die Lichtkosten typischerweise um 50–70 %."),
            ("Lüftung & Klima optimieren", "Bedarfsgeführte Regelung, Wärmerückgewinnung und angepasste Betriebszeiten – die günstigste Kilowattstunde ist die, die nicht verbraucht wird."),
            ("Gebäudeautomation nachrüsten", "Für große Nichtwohngebäude schreibt das GEG Gebäudeautomation vor – wir planen die wirtschaftliche Umsetzung."),
            ("Photovoltaik auf dem Flachdach", "Bürodächer sind ideale PV-Flächen: Der Ertrag fällt genau dann an, wenn das Gebäude ihn verbraucht."),
            ("Heizung & Wärmepumpe", "Wir prüfen, ob eine Wärmepumpe oder Hybridlösung Ihr Gebäude wirtschaftlich mit Wärme versorgt – GEG-konform."),
            ("Energieausweis & Nachweise", "Bedarfsausweis, GEG-Nachweise und Unterlagen für Banken, Investoren und ESG-Reporting aus einer Hand."),
        ),
        "stat": ("60", "%", "weniger Lichtkosten sind nach LED-Umrüstung mit Sensorik realistisch"),
    },
    {
        "slug": "einzelhandel",
        "name": "Einzelhandel",
        "short": "Handel",
        "card": "Kühlung, Licht und lange Öffnungszeiten treiben die Kosten – wir senken sie, ohne das Einkaufserlebnis zu verändern.",
        "title": "Energieberatung für den Einzelhandel | GREEN Paderborn",
        "desc": "Energiekosten im Einzelhandel senken: Kälteanlagen, LED-Verkaufsbeleuchtung, Türluftschleier. Unabhängige Beratung mit Förderung – GREEN aus Paderborn.",
        "h1": "Energieberatung für den Einzelhandel",
        "intro": (
            "Im Einzelhandel entscheidet Energie direkt über die Marge: Kühlmöbel laufen 24/7, "
            "die Verkaufsbeleuchtung brennt zwölf Stunden am Tag, und offene Türen heizen im Winter "
            "die Straße. Bei den geringen Margen des Handels wirkt jede eingesparte Kilowattstunde "
            "unmittelbar aufs Ergebnis.",
            "Wir kennen die Anforderungen von Verkaufsflächen: Warenpräsentation, Kundenkomfort und "
            "Lebensmittelsicherheit bleiben unangetastet – gespart wird an Technik und Regelung, "
            "nicht am Einkaufserlebnis."
        ),
        "pains": (
            ("Kälte ist der Kostentreiber", "Kühl- und Tiefkühlmöbel verursachen im Lebensmittelhandel oft die Hälfte der Stromkosten."),
            ("Licht als Dauerläufer", "Verkaufsbeleuchtung läuft während aller Öffnungszeiten – alte Strahler verwandeln Strom in Heizlast, die zusätzlich weggekühlt werden muss."),
            ("Offene Fassaden", "Offene Eingänge und schlecht eingestellte Türluftschleier lassen teure Wärme und Kälte entweichen."),
        ),
        "measures": (
            ("Kälteanlagen optimieren", "Glastüren an Kühlregalen, moderne Verdichter, Abwärmenutzung: Maßnahmen mit Amortisationszeiten oft unter drei Jahren."),
            ("LED-Verkaufsbeleuchtung", "Brillante Warenpräsentation bei bis zu 60 % weniger Stromverbrauch – und weniger Kühllast im Sommer."),
            ("Abwärme der Kälte nutzen", "Die Abwärme Ihrer Kälteanlagen heizt Nebenräume und Warmwasser – Energie, die Sie bereits bezahlt haben."),
            ("Türluftschleier & Gebäudehülle", "Richtig dimensionierte Luftschleier und Sanierung der Hülle halten die Konditionierung im Gebäude."),
            ("Photovoltaik & Lastmanagement", "Marktdächer und Parkflächen liefern Solarstrom genau zur Öffnungszeit – ideal für hohen Eigenverbrauch."),
            ("Monitoring je Filiale", "Energie-Monitoring deckt Ausreißer im Filialnetz auf und sichert die Einsparung dauerhaft ab."),
        ),
        "stat": ("50", "%", "der Stromkosten entfallen im Lebensmittelhandel typischerweise auf Kälte"),
    },
    {
        "slug": "produktion",
        "name": "Produktionsstätten",
        "short": "Produktion",
        "card": "Druckluft, Prozesswärme, Abwärme: In Industriehallen liegen die größten absoluten Einsparungen – wir finden sie.",
        "title": "Energieberatung für Produktion & Industrie | GREEN Paderborn",
        "desc": "Energieeffizienz in Produktionsstätten: Druckluft, Prozesswärme, Abwärmenutzung, Energieaudit DIN EN 16247. Unabhängige Industrie-Energieberatung mit Förderung.",
        "h1": "Energieberatung für Produktionsstätten",
        "intro": (
            "In der Produktion ist Energie ein echter Kostenfaktor im Wettbewerb: Druckluftsysteme mit "
            "Leckagen, ungedämmte Prozesswärme und Hallenheizungen aus den Neunzigern verbrennen bares "
            "Geld. Gleichzeitig fordern Kunden und Lieferketten zunehmend Nachweise über CO₂-Fußabdruck "
            "und Energiemanagement.",
            "Wir analysieren Ihre Energieflüsse vom Netzanschluss bis zur Maschine, quantifizieren "
            "Abwärmepotenziale und erstellen auf Wunsch Ihr Energieaudit nach DIN EN 16247 – als "
            "Pflichterfüllung und als Fahrplan zu messbar niedrigeren Stückkosten."
        ),
        "pains": (
            ("Druckluft: die teuerste Energieform", "Bis zu 30 % der Druckluft verpuffen in Leckagen – rund um die Uhr, auch wenn keine Maschine läuft."),
            ("Abwärme bleibt ungenutzt", "Kompressoren, Öfen und Maschinen erzeugen Wärme, die ungenutzt durchs Dach entweicht, während daneben geheizt wird."),
            ("Nachweispflichten wachsen", "Energieaudit-Pflicht, CO₂-Bilanzen und Kundenanforderungen binden Kapazitäten, die in der Fertigung fehlen."),
        ),
        "measures": (
            ("Druckluft-Check & Leckageortung", "Leckagen finden, Druckniveau senken, Steuerung optimieren – oft fünfstellige Einsparung pro Jahr."),
            ("Abwärme systematisch nutzen", "Abwärme aus Kompressoren und Prozessen heizt Hallen, Warmwasser oder benachbarte Gebäude."),
            ("Effiziente Hallenbeleuchtung", "LED-Hallenbeleuchtung mit Tageslicht- und Präsenzsteuerung – bessere Ausleuchtung, weniger Verbrauch."),
            ("Prozesswärme & Dämmung", "Gedämmte Leitungen, richtige Temperaturniveaus und Brennwerttechnik senken den Gasverbrauch sofort."),
            ("Energieaudit DIN EN 16247", "Normkonformes Audit für Nicht-KMU – als gesetzliche Pflicht und als belastbare Investitionsgrundlage."),
            ("Lastmanagement & PV", "Lastspitzen kappen, Netzentgelte senken und mit Photovoltaik auf Hallendächern eigenen Strom erzeugen."),
        ),
        "stat": ("30", "%", "der erzeugten Druckluft gehen in ungewarteten Systemen durch Leckagen verloren"),
    },
    {
        "slug": "veranstaltung",
        "name": "Veranstaltungsstätten",
        "short": "Events",
        "card": "Riesige Volumina, kurze Spitzen: Hallen und Säle brauchen Energiekonzepte für den Wechsel zwischen Vollbetrieb und Leerstand.",
        "title": "Energieberatung für Veranstaltungsstätten | GREEN Paderborn",
        "desc": "Energiekonzepte für Hallen, Säle und Veranstaltungsstätten: Lüftung, Lastspitzen, intermittierender Betrieb. Unabhängige Energieberatung von GREEN.",
        "h1": "Energieberatung für Veranstaltungsstätten",
        "intro": (
            "Kaum ein Gebäudetyp arbeitet so im Wechsel wie Veranstaltungsstätten: Heute 2.000 Gäste mit "
            "voller Bühnentechnik, morgen gähnende Leere – und die Technik läuft trotzdem weiter. Große "
            "Luftvolumina, hohe Decken und kurze, extreme Lastspitzen machen Standardlösungen wirkungslos.",
            "Wir entwickeln Energiekonzepte, die den Veranstaltungskalender mitdenken: bedarfsgeführte "
            "Lüftung nach Personenzahl, vorausschauendes Aufheizen und Abkühlen und ein Lastmanagement, "
            "das teure Spitzen kappt, bevor sie entstehen."
        ),
        "pains": (
            ("Lüftung für Tausende", "Lüftungsanlagen sind auf ausverkaufte Säle dimensioniert – und laufen zu oft, als wäre jeden Tag Premiere."),
            ("Teure Lastspitzen", "Bühnentechnik, Küche und Klimatisierung gleichzeitig: Kurze Spitzen bestimmen die Netzentgelte des ganzen Jahres."),
            ("Leerstand kostet mit", "Zwischen den Veranstaltungen heizen und kühlen viele Häuser fast wie im Vollbetrieb weiter."),
        ),
        "measures": (
            ("CO₂-geführte Lüftung", "Luftmengen folgen der tatsächlichen Besucherzahl – Sensorik statt Volllast, ohne Komfortverlust."),
            ("Fahrpläne für die Technik", "Heizen, Kühlen und Lüften nach Veranstaltungskalender: automatisiert vorkonditionieren statt dauerhaft betreiben."),
            ("Lastspitzen managen", "Messung, Priorisierung und gezielte Verschiebung großer Verbraucher senken die Leistungspreise spürbar."),
            ("Wärmerückgewinnung", "Die Wärme von 2.000 Menschen ist eine Heizquelle – moderne Anlagen holen sie zurück ins Gebäude."),
            ("Effiziente Veranstaltungstechnik", "LED-Bühnenlicht und effiziente Medientechnik reduzieren Strombedarf und Kühllast gleichzeitig."),
            ("Energiekonzept & Förderung", "Vom Sanierungsfahrplan bis zum Förderantrag – auch für kommunale Träger und Vereine."),
        ),
        "stat": ("40", "%", "des Energieverbrauchs entstehen in vielen Häusern außerhalb der Veranstaltungen"),
    },
    {
        "slug": "bildung",
        "name": "Bildungseinrichtungen",
        "short": "Bildung",
        "card": "Schulen und Hochschulen: Sanierungsstau auflösen, Lernklima verbessern und Fördermittel maximal ausschöpfen.",
        "title": "Energieberatung für Schulen & Bildungseinrichtungen | GREEN",
        "desc": "Energetische Sanierung von Schulen, Hochschulen und Bildungsbauten: Lüftung, Heizung, Sommerhitze, Fördermittel. Unabhängige Beratung von GREEN Paderborn.",
        "h1": "Energieberatung für Bildungseinrichtungen",
        "intro": (
            "Schulen und Hochschulen tragen oft jahrzehntealten Sanierungsstau: undichte Fenster, "
            "überalterte Kessel, stickige Klassenräume im Winter und Hitze im Sommer. Dabei ist gutes "
            "Raumklima nachweislich Voraussetzung für gutes Lernen – und energetische Sanierung die "
            "Chance, beides zugleich zu lösen.",
            "Wir begleiten Träger von der ersten Bestandsanalyse über den Sanierungsfahrplan bis zur "
            "Umsetzung – mit besonderem Blick auf Förderprogramme für Bildungsbauten und auf Abläufe, "
            "die den Schulbetrieb nicht stören."
        ),
        "pains": (
            ("Sanierungsstau mit System", "Jahrzehnte aufgeschobener Instandhaltung machen Gebäude teuer im Betrieb und unangenehm im Alltag."),
            ("Dicke Luft im Klassenraum", "Ohne kontrollierte Lüftung steigt der CO₂-Gehalt schnell über empfohlene Werte – Konzentration sinkt, Heizwärme entweicht ungenutzt."),
            ("Sommer wird zum Problem", "Aufheizende Klassenräume führen immer öfter zu Unterrichtsausfall – Hitzeschutz wird zur Pflichtaufgabe."),
        ),
        "measures": (
            ("Lüftung mit Wärmerückgewinnung", "Frische Luft für konzentriertes Lernen, bis zu 80 % der Wärme bleiben im Gebäude."),
            ("Gebäudehülle sanieren", "Dach, Fassade, Fenster: Die Hülle entscheidet über Heizbedarf und sommerlichen Hitzeschutz."),
            ("Heizungsmodernisierung", "Von der alten Kesselanlage zu Wärmepumpe oder Hybridsystem – GEG-konform und förderfähig."),
            ("Sommerlicher Wärmeschutz", "Verschattung, Nachtauskühlung und clevere Steuerung halten Klassenräume auch im Juli nutzbar."),
            ("PV mit Lerneffekt", "Photovoltaik senkt Betriebskosten – und macht Energie im Unterricht sichtbar und erlebbar."),
            ("Fördermittel-Strategie", "Bund, Land und Kommunalprogramme kombinieren: Wir strukturieren die Finanzierung Ihrer Sanierung."),
        ),
        "stat": ("80", "%", "der Lüftungswärme lassen sich mit Wärmerückgewinnung im Gebäude halten"),
    },
    {
        "slug": "kindergarten",
        "name": "Kindergärten",
        "short": "Kitas",
        "card": "Behagliche Räume für die Kleinsten – bei Heizkosten, die den Träger nicht überfordern.",
        "title": "Energieberatung für Kindergärten & Kitas | GREEN Paderborn",
        "desc": "Energetische Sanierung von Kitas und Kindergärten: behagliches Raumklima, niedrige Betriebskosten, Fördermittel für Träger. GREEN Energieberatung Paderborn.",
        "h1": "Energieberatung für Kindergärten",
        "intro": (
            "In Kitas gelten besondere Maßstäbe: Kinder spielen auf dem Boden, wo jede Zugluft und jeder "
            "kalte Belag sofort spürbar ist. Räume müssen warm, die Luft frisch und das Budget des "
            "Trägers geschont sein – kirchliche, kommunale und freie Träger stehen hier gleichermaßen "
            "unter Druck.",
            "Wir planen energetische Maßnahmen, die zuerst der Behaglichkeit der Kinder dienen und sich "
            "über gesparte Betriebskosten und Fördermittel refinanzieren – mit Umsetzungsfenstern in "
            "Schließzeiten und ohne Störung des Betreuungsalltags."
        ),
        "pains": (
            ("Kalte Böden, hohe Kosten", "Ungedämmte Bodenplatten und alte Heizkörper machen die Spielebene kalt – und die Abrechnung teuer."),
            ("Warmwasser mit Auflagen", "Hygieneanforderungen an Trinkwarmwasser treiben in Altanlagen den Energieverbrauch unnötig hoch."),
            ("Knappe Trägerbudgets", "Jeder Euro Betriebskosten fehlt in der Betreuung – Investitionen brauchen belastbare Förderkonzepte."),
        ),
        "measures": (
            ("Behaglichkeit zuerst", "Fußbodenheizung, dichte Hülle, zugfreie Lüftung: Wir planen vom Kind aus – Energieeffizienz folgt daraus."),
            ("Lüften ohne Zugluft", "Dezentrale Lüftungsgeräte mit Wärmerückgewinnung sorgen leise für frische Luft im Schlaf- und Gruppenraum."),
            ("Effizientes Warmwasser", "Hygienekonforme Trinkwassererwärmung mit Frischwasserstationen – sicher und sparsam."),
            ("Heizung modernisieren", "Wärmepumpe oder Hybridlösung, passend zu Gebäude und Budget des Trägers."),
            ("Dach & Fassade dämmen", "Weniger Heizbedarf im Winter, kühlere Gruppenräume im Sommer – ein Gewinn in beide Richtungen."),
            ("Förderanträge für Träger", "Wir übernehmen Förderrecherche und Antragstellung – abgestimmt auf kommunale und freie Träger."),
        ),
        "stat": ("50", "%", "Förderzuschuss sind für die Energieberatung von Kita-Gebäuden möglich"),
    },
    {
        "slug": "kommune",
        "name": "Kommunale Gebäude",
        "short": "Kommunen",
        "card": "Rathaus, Bauhof, Feuerwehr: Wir bringen Struktur in den kommunalen Gebäudebestand – vom Portfolio bis zum Förderantrag.",
        "title": "Energieberatung für Kommunen & öffentliche Gebäude | GREEN",
        "desc": "Energiemanagement für kommunale Gebäude: Portfolioanalyse, Sanierungsfahrpläne, Klimaneutralität 2045, Fördermittel. Unabhängige Beratung von GREEN Paderborn.",
        "h1": "Energieberatung für kommunale Gebäude",
        "intro": (
            "Kommunen verwalten die vielfältigsten Gebäudeportfolios überhaupt: Rathaus, Schulen, "
            "Sporthallen, Feuerwehr, Bauhof – oft über Jahrzehnte gewachsen und chronisch unterfinanziert. "
            "Gleichzeitig verpflichtet der Bund die öffentliche Hand zur Vorbildrolle auf dem Weg zur "
            "Klimaneutralität 2045.",
            "Wir bringen Struktur in Ihren Bestand: von der Portfolioanalyse über priorisierte "
            "Sanierungsfahrpläne bis zu förderfähigen Einzelprojekten – mit Beschlussvorlagen, die im "
            "Rat bestehen, und Zahlen, die die Kämmerei überzeugen."
        ),
        "pains": (
            ("Heterogener Bestand", "Vom denkmalgeschützten Rathaus bis zur Systembau-Turnhalle: Jedes Gebäude braucht eine eigene Strategie – aber eine gemeinsame Priorisierung."),
            ("Vorbildfunktion mit Frist", "Klimaneutrale Verwaltung bis 2045, kommunale Wärmeplanung, GEG-Pflichten: Die Anforderungen sind gesetzt, die Ressourcen knapp."),
            ("Fördermittel bleiben liegen", "Ohne systematische Förderstrategie verfallen Zuschüsse, die Sanierungen um bis zu die Hälfte verbilligen würden."),
        ),
        "measures": (
            ("Portfolio- & Verbrauchsanalyse", "Alle Liegenschaften auf einen Blick: Wo lohnt der nächste Euro am meisten? Datenbasierte Priorisierung statt Bauchgefühl."),
            ("Sanierungsfahrpläne", "Gebäudescharfe Fahrpläne mit Maßnahmen, Kosten und CO₂-Wirkung – als belastbare Grundlage für Haushaltsplanung und Ratsbeschluss."),
            ("Kommunales Energiemanagement", "Monitoring, Zählerstruktur und Berichtswesen: Einsparungen entstehen im Betrieb – und bleiben nur mit System erhalten."),
            ("Wärmeplanung verzahnen", "Wir denken Ihre Gebäude mit der kommunalen Wärmeplanung zusammen – Nahwärme, Wärmepumpen, Quartierslösungen."),
            ("PV auf kommunalen Dächern", "Schulen, Bauhöfe, Kläranlagen: Öffentliche Dächer sind das größte ungenutzte Solarpotenzial vieler Gemeinden."),
            ("Förderstrategie & Anträge", "Bundes-, Landes- und EU-Programme systematisch kombiniert – wir übernehmen Recherche und Antragstellung."),
        ),
        "stat": ("2045", "", "ist die Zielmarke: Bis dahin muss die öffentliche Verwaltung klimaneutral sein"),
    },
    {
        "slug": "andere",
        "name": "Weitere Nichtwohngebäude",
        "short": "Weitere",
        "card": "Hotel, Praxis, Sporthalle, Logistik oder Kirche: Wenn Ihr Gebäude kein Wohnhaus ist, sind wir die richtigen Ansprechpartner.",
        "title": "Energieberatung für alle Nichtwohngebäude | GREEN Paderborn",
        "desc": "Hotels, Praxen, Sportstätten, Logistikhallen, Pflegeheime, Kirchen: GREEN berät alle Nichtwohngebäude unabhängig zu Energieeffizienz und Förderung.",
        "h1": "Energieberatung für weitere Nichtwohngebäude",
        "intro": (
            "Hotel und Pflegeheim, Arztpraxis und Autohaus, Sporthalle und Logistikzentrum, Kirche und "
            "Vereinsheim: Nichtwohngebäude sind so vielfältig wie ihre Nutzer – und genau deshalb unsere "
            "Spezialisierung. Jede Nutzung hat ihr eigenes Energieprofil, ihre eigenen Vorschriften und "
            "ihre eigenen Sparpotenziale.",
            "Was immer gleich bleibt: unsere Methode. Wir messen und analysieren den Ist-Zustand, rechnen "
            "Maßnahmen wirtschaftlich durch und begleiten Sie bis zur umgesetzten Lösung – unabhängig, "
            "gefördert und mit einem festen Ansprechpartner."
        ),
        "pains": (
            ("Kein Standardgebäude", "Wellnessbereich im Hotel, Röntgenraum in der Praxis, Flutlicht am Sportplatz: Standard-Beratung greift hier zu kurz."),
            ("Nutzung rund um die Uhr", "Pflegeheime und Hotels kennen keinen Feierabend – Effizienzmaßnahmen müssen im laufenden Betrieb funktionieren."),
            ("Unklare Zuständigkeiten", "Zwischen Eigentümer, Betreiber und Nutzern bleibt Energieeffizienz oft liegen – bis die Abrechnung kommt."),
        ),
        "measures": (
            ("Individuelle Bestandsanalyse", "Wir erfassen Gebäude, Anlagen und Nutzungsprofile vor Ort – die Grundlage jeder seriösen Empfehlung."),
            ("Wärme & Warmwasser", "Von der Hotel-Wellnesslandschaft bis zur Sportdusche: Warmwasser ist oft der unterschätzte Großverbraucher."),
            ("Beleuchtung & Steuerung", "LED plus Sensorik – vom Flutlichtmast bis zum Hotelflur, der nachts nicht auf Volllast leuchten muss."),
            ("Lüftung & Klima", "Bedarfsgerechte Konditionierung für Nutzungen von der Praxis bis zur Sporthalle."),
            ("Photovoltaik & Speicher", "Eigenverbrauchskonzepte passend zum Lastprofil – gerade bei 24/7-Betrieben besonders wirtschaftlich."),
            ("Nachweise & Förderung", "Energieausweis, GEG-Nachweise, Förderanträge: Wir liefern die Unterlagen, die Behörden und Banken sehen wollen."),
        ),
        "stat": ("100", "%", "unseres Fokus gilt Nichtwohngebäuden – das ist unsere Spezialisierung, kein Nebengeschäft"),
    },
]

FAQS = [
    (
        "Was kostet eine Energieberatung für Nichtwohngebäude?",
        "Die Kosten richten sich nach Größe und Komplexität des Gebäudes – vom kompakten Beratungspaket "
        "bis zum vollständigen Energiekonzept nach DIN V 18599. Der Bund bezuschusst die Beratung mit "
        "bis zu 50 %. Im kostenlosen Erstgespräch nennen wir Ihnen einen Festpreis, bevor Sie sich "
        "entscheiden – ohne versteckte Kosten.",
    ),
    (
        "Welche Förderung gibt es für die Energieberatung?",
        "Über die Bundesförderung für Energieberatung für Nichtwohngebäude (EBN) übernimmt der Staat "
        "bis zu 50 % des Beratungshonorars. Auch die anschließenden Sanierungsmaßnahmen werden über die "
        "Bundesförderung für effiziente Gebäude (BEG) und weitere Programme bezuschusst. Wir prüfen alle "
        "Fördertöpfe und übernehmen die Antragstellung für Sie.",
    ),
    (
        "Wie läuft die Beratung ab und wie lange dauert sie?",
        "Nach dem kostenlosen Erstgespräch analysieren wir Ihr Gebäude vor Ort und werten Verbräuche, "
        "Anlagen und Bausubstanz aus. Sie erhalten ein priorisiertes Maßnahmenkonzept mit "
        "Wirtschaftlichkeitsrechnung und Förderstrategie. Je nach Gebäudegröße vergehen vom Erstgespräch "
        "bis zum fertigen Konzept typischerweise vier bis zwölf Wochen.",
    ),
    (
        "Für welche Gebäude ist GREEN der richtige Partner?",
        "Wir sind auf Nichtwohngebäude spezialisiert: Büros, Einzelhandel, Produktion, Schulen, Kitas, "
        "kommunale Gebäude, Veranstaltungsstätten sowie Hotels, Praxen, Sport- und Logistikimmobilien. "
        "Wohngebäude vermitteln wir an geeignete Kollegen – unser Fokus bleibt gewerblich und öffentlich.",
    ),
    (
        "Was schreibt das Gebäudeenergiegesetz (GEG) vor?",
        "Das GEG regelt u. a. Anforderungen an neue Heizungen (65 % erneuerbare Energien im "
        "Zusammenspiel mit der kommunalen Wärmeplanung), Pflichten zur Gebäudeautomation für große "
        "Nichtwohngebäude, Energieausweise und Nachrüstpflichten. Wir prüfen, welche Pflichten für Ihr "
        "Gebäude gelten, und machen daraus einen wirtschaftlichen Fahrplan statt einer Bußgeldgefahr.",
    ),
    (
        "Was ist ein Energieaudit nach DIN EN 16247 – und brauchen wir eins?",
        "Unternehmen, die kein KMU sind, sind gesetzlich verpflichtet, alle vier Jahre ein Energieaudit "
        "durchzuführen (alternativ: Energiemanagementsystem). Ein gutes Audit ist aber mehr als "
        "Pflichterfüllung: Es zeigt schwarz auf weiß, wo sich Investitionen zuerst lohnen. Wir führen "
        "Audits normkonform und pragmatisch durch.",
    ),
    (
        "Lohnt sich Photovoltaik auf unserem Gebäude?",
        "Bei Nichtwohngebäuden fällt der Stromverbrauch meist tagsüber an – genau dann, wenn die PV-Anlage "
        "liefert. Dadurch sind Eigenverbrauchsquoten und Renditen oft deutlich höher als bei Wohnhäusern. "
        "Wir prüfen Statik, Lastprofil und Wirtschaftlichkeit und schreiben die Anlage neutral aus – "
        "wir verkaufen keine Module, wir beraten unabhängig.",
    ),
]

TESTIMONIALS = [
    (
        "Die Zusammenarbeit war hervorragend. Bei der Sanierung unserer Bildungseinrichtung wurden wir "
        "kompetent beraten und haben uns zu jeder Zeit gut aufgehoben gefühlt.",
        "Linda Mohr",
        "Gebäudemanagement",
    ),
    (
        "Von der ersten Analyse bis zur Umsetzung verging weniger Zeit als gedacht – die Abwicklung war "
        "schnell, strukturiert und absolut professionell.",
        "George Müller",
        "Geschäftsführer",
    ),
    (
        "Jede Empfehlung wurde ausführlich begründet und mit Zahlen belegt. So konnten wir intern sehr "
        "einfach die richtigen Entscheidungen treffen.",
        "Jennifer Meier",
        "Assistenz der Geschäftsführung",
    ),
]

TEAM = [
    ("Vadim Berg", "Geschäftsführer"),
    ("David Lamping", "Geschäftsführer"),
    ("Sebastian Hund", "Geschäftsführer"),
    ("Katrin Voß", "Teamleitung"),
    ("Monika Rutkowski", "Beratung & Organisation"),
]
