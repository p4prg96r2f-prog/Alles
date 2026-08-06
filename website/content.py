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
    # Geokoordinaten Rolandsweg 80, 33102 Paderborn (OpenStreetMap/Nominatim)
    "lat": "51.72685",
    "lon": "8.75601",
}

# Einzugsgebiet: Stadt-Landingpages für die lokale Suche.
# bearing = Richtung ab Paderborn in Grad (0 = Nord), km = ca. Straßenentfernung.
CITIES = [
    {
        "slug": "energieberatung-paderborn",
        "city": "Paderborn",
        "region": "Kreis Paderborn",
        "km": 0,
        "bearing": 0,
        "claim": "Unser Heimatstandort – kurze Wege, schnelle Termine.",
        "intro": (
            "Paderborn ist unser Zuhause: Vom Rolandsweg aus betreuen wir Unternehmen, Träger und "
            "die öffentliche Hand in der Dom- und Universitätsstadt und im gesamten Kreis Paderborn. "
            "Die Wirtschaft der Region ist geprägt von IT- und Elektrotechnik, Maschinenbau, Handel "
            "und einem starken Mittelstand – und damit von genau den Gebäuden, auf die wir "
            "spezialisiert sind: Büros, Produktionshallen, Verkaufsflächen, Schulen und Verwaltungen.",
            "Für Paderborner Kunden sind wir besonders schnell greifbar: Ortstermine lassen sich "
            "kurzfristig einrichten, und die Gegebenheiten vor Ort – vom Gewerbegebiet bis zum "
            "innerstädtischen Bestand – kennen wir aus über einem Jahrzehnt Projektarbeit.",
        ),
        "industries": ("buero", "produktion", "kommune"),
        "faq": (
            ("Wie schnell bekomme ich in Paderborn einen Termin?",
             "In der Regel innerhalb weniger Werktage – auf Ihre Anfrage antworten wir spätestens am nächsten Werktag. Das Erstgespräch ist kostenlos und kann bei Ihnen im Gebäude, in unserem Büro am Rolandsweg 80 oder online stattfinden."),
            ("Betreut GREEN auch Gemeinden im Kreis Paderborn?",
             "Ja – neben der Stadt Paderborn beraten wir Unternehmen und Kommunen im gesamten Kreis, etwa in Delbrück, Salzkotten, Büren, Bad Lippspringe und Hövelhof."),
        ),
    },
    {
        "slug": "energieberatung-bielefeld",
        "city": "Bielefeld",
        "region": "Ostwestfalen-Lippe",
        "km": 45,
        "bearing": 340,
        "claim": "Die größte Stadt OWLs – vom Gründerzeit-Büro bis zur Industriehalle.",
        "intro": (
            "Bielefeld ist mit über 330.000 Einwohnern das wirtschaftliche Zentrum "
            "Ostwestfalen-Lippes: Maschinenbau, Lebensmittelindustrie, große Klinik- und "
            "Hochschulstandorte und ein dichter Besatz an Büro- und Handelsimmobilien. "
            "Entsprechend vielfältig ist der Gebäudebestand – vom sanierungsbedürftigen "
            "Gründerzeitbüro über Nachkriegs-Verwaltungsbauten bis zur modernen Logistikhalle.",
            "Genau diese Mischung ist unser Terrain: Wir analysieren Bielefelder Nichtwohngebäude "
            "unabhängig, entwickeln Sanierungsfahrpläne und begleiten Unternehmen wie Träger bei "
            "Förderanträgen – rund 45 Minuten von unserem Paderborner Büro entfernt und damit "
            "jederzeit kurzfristig vor Ort.",
        ),
        "industries": ("buero", "produktion", "bildung"),
        "faq": (
            ("Kommt GREEN für Ortstermine nach Bielefeld?",
             "Selbstverständlich – Bielefeld liegt rund 45 Autominuten von unserem Büro entfernt. Begehungen, Messungen und Abstimmungstermine führen wir regelmäßig in ganz OWL durch; für das Erstgespräch entstehen Ihnen keine Kosten."),
            ("Welche Gebäudetypen betreut GREEN in Bielefeld?",
             "Schwerpunkte sind Büro- und Verwaltungsgebäude, Produktions- und Logistikhallen, Handelsflächen sowie Schulen und Hochschulbauten – also alle Nichtwohngebäude."),
        ),
    },
    {
        "slug": "energieberatung-guetersloh",
        "city": "Gütersloh",
        "region": "Kreis Gütersloh",
        "km": 40,
        "bearing": 310,
        "claim": "Starker Mittelstand, große Werke – Energieeffizienz für den Kreis Gütersloh.",
        "intro": (
            "Der Kreis Gütersloh gehört zu den wirtschaftsstärksten Regionen Nordrhein-Westfalens: "
            "geprägt von international tätigen Familienunternehmen aus Medien-, Hausgeräte- und "
            "Möbelindustrie und einem breiten produzierenden Mittelstand. Produktionshallen, "
            "Logistikzentren und Verwaltungsgebäude bestimmen den Bestand – Gebäude mit hohen "
            "Energieverbräuchen und ebenso hohen Einsparpotenzialen.",
            "Wir unterstützen Unternehmen in Gütersloh, Rheda-Wiedenbrück, Verl, Harsewinkel und "
            "Umgebung mit Energieaudits nach DIN EN 16247, Abwärme- und Druckluftanalysen sowie "
            "geförderten Sanierungskonzepten – herstellerunabhängig und mit Festpreis.",
        ),
        "industries": ("produktion", "buero", "einzelhandel"),
        "faq": (
            ("Führt GREEN Energieaudits für Unternehmen im Kreis Gütersloh durch?",
             "Ja – wir führen normkonforme <a href='../energieaudit-din-en-16247/'>Energieaudits nach DIN EN 16247</a> durch, wie sie für Nicht-KMU alle vier Jahre vorgeschrieben sind, und machen daraus zugleich einen belastbaren Investitionsfahrplan."),
            ("Lohnt sich eine Energieberatung auch für kleinere Betriebe?",
             "Gerade dort: Für kleine und mittlere Unternehmen ist die Beratung über die Bundesförderung EBN mit bis zu 50 % bezuschusst, und Maßnahmen wie LED, Druckluft-Optimierung oder PV amortisieren sich oft in wenigen Jahren."),
        ),
    },
    {
        "slug": "energieberatung-detmold",
        "city": "Detmold",
        "region": "Kreis Lippe",
        "km": 30,
        "bearing": 20,
        "claim": "Verwaltungs- und Hochschulstadt mit viel historischer Bausubstanz.",
        "intro": (
            "Detmold ist Kreisstadt des Kreises Lippe, Verwaltungs- und Hochschulstandort – und "
            "eine Stadt mit außergewöhnlich viel historischer Bausubstanz. Genau hier liegt die "
            "energetische Herausforderung: Denkmalgeschützte und ältere Gebäude brauchen "
            "Effizienzkonzepte, die Bauphysik, Gestaltung und Wirtschaftlichkeit zusammen denken.",
            "Wir beraten in Detmold und im Kreis Lippe Verwaltungen, Bildungseinrichtungen und "
            "Unternehmen – von der behutsamen Sanierung im Bestand über Heizungsmodernisierung "
            "nach GModG bis zur Photovoltaik auf kommunalen Dächern. Von Paderborn aus sind wir in "
            "rund 30 Minuten vor Ort.",
        ),
        "industries": ("kommune", "bildung", "buero"),
        "faq": (
            ("Berät GREEN auch bei denkmalgeschützten Gebäuden?",
             "Ja – gerade im lippischen Bestand ist das häufig gefragt. Wir entwickeln Maßnahmen, die Effizienz und Denkmalschutz vereinbaren, und stimmen das Vorgehen auf Wunsch mit den zuständigen Behörden ab."),
            ("Ist GREEN im gesamten Kreis Lippe tätig?",
             "Ja – neben Detmold zum Beispiel in Lemgo, Lage, Bad Salzuflen und Blomberg. Ortstermine vereinbaren wir kurzfristig."),
        ),
    },
    {
        "slug": "energieberatung-hoexter",
        "city": "Höxter",
        "region": "Kreis Höxter",
        "km": 55,
        "bearing": 95,
        "claim": "Weserbergland: Mittelstand, Kommunen und Tourismus effizient machen.",
        "intro": (
            "Der Kreis Höxter im Weserbergland ist ländlich geprägt – mit einem bodenständigen "
            "Mittelstand, vielen kommunalen Liegenschaften und Tourismusbetrieben rund um "
            "Sehenswürdigkeiten wie das UNESCO-Welterbe Corvey. Verstreute Liegenschaften, ältere "
            "Heizzentralen und knappe Haushalte machen Energieeffizienz hier zur besonders "
            "lohnenden Aufgabe.",
            "Wir kennen die Region aus dem Hochstift heraus: Von Paderborn erreichen wir Höxter, "
            "Brakel, Bad Driburg, Warburg und Beverungen in unter einer Stunde – für "
            "Bestandsanalysen, Sanierungsfahrpläne und Förderanträge, die auch in kleineren "
            "Kommunen und Betrieben funktionieren.",
        ),
        "industries": ("kommune", "andere", "veranstaltung"),
        "faq": (
            ("Arbeitet GREEN auch für kleinere Kommunen im Kreis Höxter?",
             "Ja – gerade kleinere Kommunen profitieren von gebündelten Sanierungsfahrplänen über mehrere Liegenschaften und von Förderquoten, die Investitionen erst möglich machen. Wir liefern Beschlussvorlagen, die im Rat bestehen."),
            ("Betreut GREEN Hotels und Gastronomie im Weserbergland?",
             "Ja – Beherbergungs- und Gastronomiebetriebe zählen zu den Nichtwohngebäuden mit den höchsten spezifischen Energiekosten. Warmwasser, Küche und Wellness bieten meist große, schnell wirksame Einsparhebel."),
        ),
    },
    {
        "slug": "energieberatung-lippstadt",
        "city": "Lippstadt",
        "region": "Kreis Soest",
        "km": 30,
        "bearing": 265,
        "claim": "Industrie- und Hochschulstadt an der Lippe – Effizienz für die Produktion.",
        "intro": (
            "Lippstadt ist die größte Stadt des Kreises Soest und stark industriell geprägt – "
            "insbesondere durch Automobilzulieferer und Lichttechnik sowie einen breiten "
            "produzierenden Mittelstand, ergänzt um den Campus der Hochschule Hamm-Lippstadt. "
            "Werkhallen, Prüffelder und Logistikflächen stehen hier für hohe Strom- und "
            "Wärmebedarfe rund um die Uhr.",
            "Unsere Schwerpunkte in Lippstadt und Umgebung: Druckluft- und Abwärmeanalysen, "
            "Lastmanagement, Hallenbeleuchtung und Energieaudits nach DIN EN 16247 – rund "
            "30 Autominuten von Paderborn entfernt, auch für Erwitte, Geseke und Soest.",
        ),
        "industries": ("produktion", "buero", "andere"),
        "faq": (
            ("Unterstützt GREEN bei der Energieaudit-Pflicht?",
             "Ja – Unternehmen, die kein KMU sind, müssen alle vier Jahre ein Energieaudit nach DIN EN 16247 nachweisen. Wir führen das Audit durch und priorisieren die Maßnahmen so, dass aus der Pflicht ein Renditeprojekt wird."),
            ("Ist GREEN auch westlich von Lippstadt tätig?",
             "Ja – unser Einzugsgebiet reicht über Soest hinaus; grundsätzlich beraten wir Nichtwohngebäude in ganz Nordrhein-Westfalen."),
        ),
    },
]

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
            ("Gebäudeautomation nachrüsten", "Das GModG verpflichtet Nichtwohngebäude mit Lüftungs- oder Klimaanlagen über 70 kW bis Ende 2029 zur Gebäudeautomation – wir planen die wirtschaftliche Umsetzung."),
            ("Photovoltaik auf dem Flachdach", "Bürodächer sind ideale PV-Flächen: Der Ertrag fällt genau dann an, wenn das Gebäude ihn verbraucht – und die GModG-Solarpflicht greift schrittweise ab 2027."),
            ("Heizung & Wärmepumpe", "Wir prüfen technologieoffen, ob Wärmepumpe, Hybridlösung oder Anschluss an ein Wärmenetz Ihr Gebäude wirtschaftlich versorgt – GModG-konform."),
            ("Energieausweis & Nachweise", "<a href='../../energieausweis-nichtwohngebaeude/'>Bedarfsausweis</a> (für Nichtwohngebäude ab 2027 Pflicht), GModG-Nachweise und Unterlagen für Banken, Investoren und ESG-Reporting aus einer Hand."),
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
            ("Energieaudit DIN EN 16247", "Normkonformes <a href='../../energieaudit-din-en-16247/'>Energieaudit</a> für Nicht-KMU – als gesetzliche Pflicht und als belastbare Investitionsgrundlage."),
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
            ("Heizungsmodernisierung", "Von der alten Kesselanlage zu Wärmepumpe oder Hybridsystem – GModG-konform, technologieoffen und förderfähig."),
            ("Sommerlicher Wärmeschutz", "Verschattung, Nachtauskühlung und clevere Steuerung halten Klassenräume auch im Juli nutzbar."),
            ("PV mit Lerneffekt", "Photovoltaik senkt Betriebskosten – und macht Energie im Unterricht sichtbar und erlebbar."),
            ("Fördermittel-Strategie", "Bund, Land und Kommunalprogramme kombinieren: Wir strukturieren die <a href='../../foerderung/'>Finanzierung</a> Ihrer Sanierung."),
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
            ("Vorbildfunktion mit Frist", "Klimaneutrale Verwaltung bis 2045, kommunale Wärmeplanung, GModG-Pflichten – ab 2028 gilt für öffentliche Neubauten der Nullemissionsstandard. Die Anforderungen sind gesetzt, die Ressourcen knapp."),
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
            ("Nachweise & Förderung", "Energieausweis, GModG-Nachweise, Förderanträge: Wir liefern die Unterlagen, die Behörden und Banken sehen wollen."),
        ),
        "stat": ("100", "%", "unseres Fokus gilt Nichtwohngebäuden – das ist unsere Spezialisierung, kein Nebengeschäft"),
    },
]

FAQS = [
    (
        "Was kostet eine Energieberatung für Nichtwohngebäude?",
        "Die Kosten richten sich nach Größe und Komplexität des Gebäudes – vom kompakten Beratungspaket "
        "bis zum vollständigen Energiekonzept nach DIN V 18599. Der Bund bezuschusst die Beratung mit "
        "50 % des Honorars, gedeckelt auf maximal 4.000 €. Im kostenlosen Erstgespräch nennen wir "
        "Ihnen einen Festpreis und rechnen offen vor, welcher Eigenanteil bleibt – ohne versteckte "
        "Kosten.",
    ),
    (
        "Welche Förderung gibt es für die Energieberatung?",
        "Über die <a href='foerderung/'>Bundesförderung für Energieberatung für Nichtwohngebäude</a> (EBN) übernimmt der Bund "
        "50 % des förderfähigen Beratungshonorars – gedeckelt auf 850 € bei bis zu 200 m², 2.500 € "
        "bei 200 bis 500 m² und 4.000 € ab 500 m² Nettogrundfläche. Antragsberechtigt sind unter "
        "anderem Kommunen, gemeinnützige Träger, KMU und Nicht-KMU bis 500.000 kWh Jahresverbrauch. "
        "Wichtig: Der Antrag muss vor der Beauftragung bewilligt sein. Die Sanierungsmaßnahmen selbst "
        "werden über die BEG und weitere Programme bezuschusst – wir prüfen alle Töpfe und übernehmen "
        "die Antragstellung.",
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
        "Was gilt seit dem GModG 2026 (früher GEG) für Nichtwohngebäude?",
        "Das Gebäudemodernisierungsgesetz (GModG) hat das GEG zum 29. Juli 2026 abgelöst. Für "
        "Nichtwohngebäude wichtig: erstmals Sanierungspflichten für die schlechtesten Bestandsgebäude "
        "(MEPS, ab 2030), Gebäudeautomation für Lüftungs- und Klimaanlagen über 70 kW bis Ende 2029, "
        "ab 2027 nur noch Bedarfsausweise, Nullemissionsstandard für Neubauten (öffentlich ab 2028, "
        "alle ab 2030) und technologieoffene Heizungsregeln statt der 65-Prozent-Vorgabe. Wir prüfen, "
        "welche Pflichten Ihr Gebäude betreffen, und machen daraus einen wirtschaftlichen Fahrplan.",
    ),
    (
        "Dürfen wir jetzt wieder eine Gas- oder Ölheizung einbauen?",
        "Grundsätzlich ja – das GModG ist technologieoffen. Aber: Neu eingebaute Gas- und Ölheizungen "
        "müssen über die „Bio-Treppe“ steigende Anteile erneuerbarer Brennstoffe nutzen (10 % ab 2029, "
        "15 % ab 2030, 30 % ab 2035, 60 % ab 2040), und der CO₂-Preis verteuert fossile Wärme weiter. "
        "Ob sich das gegenüber Wärmepumpe, Hybrid oder Wärmenetz rechnet, kalkulieren wir für Ihr "
        "Gebäude neutral durch – wir verkaufen keine Heizungen.",
    ),
    (
        "Was ist ein Energieaudit nach DIN EN 16247 – und brauchen wir eins?",
        "Unternehmen, die kein KMU sind, sind gesetzlich verpflichtet, alle vier Jahre ein <a href='energieaudit-din-en-16247/'>Energieaudit</a> "
        "durchzuführen (alternativ: Energiemanagementsystem). Ein gutes Audit ist aber mehr als "
        "Pflichterfüllung: Es zeigt schwarz auf weiß, wo sich Investitionen zuerst lohnen. Wir führen "
        "Audits normkonform und pragmatisch durch.",
    ),
    (
        "In welchen Regionen ist GREEN tätig?",
        "Unser Büro sitzt in Paderborn, unser Kerngebiet ist Ostwestfalen-Lippe und das Hochstift: "
        "Paderborn, Bielefeld, Gütersloh, Detmold, Höxter und Lippstadt erreichen wir in maximal "
        "einer Stunde. Grundsätzlich beraten wir Nichtwohngebäude in ganz Nordrhein-Westfalen – "
        "Erstgespräche führen wir auf Wunsch auch online.",
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
]
