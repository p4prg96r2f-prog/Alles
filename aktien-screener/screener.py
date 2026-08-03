#!/usr/bin/env python3
"""
Aktien-Screener: "Magic Formula Plus"
=====================================

Findet qualitativ gute Unternehmen (hohe Kapitalrendite) zu guenstigen
Preisen (hohe Gewinn- und Free-Cashflow-Rendite) - inspiriert von Joel
Greenblatts Magic Formula, erweitert um Verschuldungs-, Wachstums- und
Cashflow-Filter, um Value Traps auszusortieren.

Benutzung:
    python3 screener.py --universum dax
    python3 screener.py --universum europa --top 30
    python3 screener.py --universum usa --min-marktkap 5
    python3 screener.py --tickers meine_liste.txt
    python3 screener.py --universum-aktualisieren

Datenquelle: Yahoo Finance (kostenlos, via yfinance).
Ergebnisse landen als CSV im Ordner "ergebnisse/".

WICHTIG: Dieses Skript ist ein Recherche-Werkzeug, keine Anlageberatung.
Jeder Kandidat muss vor einem Kauf von Hand geprueft werden (siehe README).
"""

import argparse
import csv
import json
import os
import sys
import time
from pathlib import Path

BASIS = Path(__file__).resolve().parent
UNIVERSUM_ORDNER = BASIS / "universum"
CACHE_ORDNER = BASIS / "cache"
ERGEBNIS_ORDNER = BASIS / "ergebnisse"

# Sektoren, bei denen EBIT/ROCE nicht aussagekraeftig sind (wie bei Greenblatt)
AUSGESCHLOSSENE_SEKTOREN = {"Financial Services", "Utilities", "Real Estate"}

# (URL, Ticker-Spalte, Yahoo-Suffix falls der Ticker keins hat)
WIKIPEDIA_QUELLEN = {
    "usa_sp500": ("https://en.wikipedia.org/wiki/List_of_S%26P_500_companies", "Symbol", ""),
    "dax": ("https://en.wikipedia.org/wiki/DAX", "Ticker", ""),
    "mdax": ("https://en.wikipedia.org/wiki/MDAX", "Symbol", ".DE"),
    "euro_stoxx50": ("https://en.wikipedia.org/wiki/EURO_STOXX_50", "Ticker", ""),
}

UNIVERSEN = {
    "dax": ["dax"],
    "usa": ["usa_sp500"],
    "europa": ["dax", "mdax", "euro_stoxx50"],
    "alle": ["dax", "mdax", "euro_stoxx50", "usa_sp500"],
}


def _yfinance_backend_vorbereiten():
    """curl_cffi imitiert einen Browser-TLS-Fingerprint, den manche
    Firmen-/Cloud-Proxys ablehnen. Kurz testen und bei Bedarf auf den
    requests-Fallback von yfinance umschalten (muss VOR dem Import passieren)."""
    if os.environ.get("YF_DISABLE_CURL_CFFI"):
        return
    try:
        from curl_cffi import requests as cr
    except ImportError:
        return
    try:
        s = cr.Session(impersonate="chrome")
        s.get("https://query1.finance.yahoo.com/v8/finance/chart/AAPL", timeout=10)
    except Exception:
        os.environ["YF_DISABLE_CURL_CFFI"] = "1"
        print("Hinweis: curl_cffi kommt nicht durch den Proxy, nutze requests-Fallback.")


_yfinance_backend_vorbereiten()
import yfinance as yf  # noqa: E402
from yfinance.exceptions import YFRateLimitError  # noqa: E402


# ---------------------------------------------------------------------------
# Universum (Ticker-Listen)
# ---------------------------------------------------------------------------

def universum_aktualisieren():
    """Laedt die Index-Zusammensetzungen von Wikipedia und speichert sie
    als Textdateien unter universum/."""
    import io
    import pandas as pd
    import requests as req

    UNIVERSUM_ORDNER.mkdir(exist_ok=True)
    kopf = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}
    for name, (url, spalte, suffix) in WIKIPEDIA_QUELLEN.items():
        try:
            antwort = req.get(url, headers=kopf, timeout=30)
            antwort.raise_for_status()
            tabellen = pd.read_html(io.StringIO(antwort.text))
            ticker = None
            for tab in tabellen:
                if spalte in tab.columns:
                    kandidaten = [str(t).strip() for t in tab[spalte].dropna()]
                    kandidaten = [t for t in kandidaten if t and t.lower() != "nan"]
                    if len(kandidaten) >= 20:
                        ticker = kandidaten
                        break
            if not ticker:
                print(f"  WARNUNG: keine Ticker-Spalte fuer {name} gefunden, uebersprungen")
                continue
            # Yahoo nutzt "-" statt "." bei US-Klassenaktien (BRK.B -> BRK-B)
            if name == "usa_sp500":
                ticker = [t.replace(".", "-") for t in ticker]
            if suffix:
                ticker = [t if "." in t else t + suffix for t in ticker]
            datei = UNIVERSUM_ORDNER / f"{name}.txt"
            datei.write_text("\n".join(sorted(set(ticker))) + "\n")
            print(f"  {name}: {len(set(ticker))} Ticker -> {datei.name}")
        except Exception as fehler:
            print(f"  FEHLER bei {name}: {fehler}")


def universum_laden(name):
    """Gibt die Tickerliste fuer ein benanntes Universum zurueck."""
    ticker = []
    for teil in UNIVERSEN[name]:
        datei = UNIVERSUM_ORDNER / f"{teil}.txt"
        if not datei.exists():
            sys.exit(f"Universum-Datei fehlt: {datei}\n"
                     f"Bitte einmal ausfuehren: python3 screener.py --universum-aktualisieren")
        ticker.extend(z.strip() for z in datei.read_text().splitlines() if z.strip())
    # Reihenfolge erhalten, Duplikate entfernen
    return list(dict.fromkeys(ticker))


# ---------------------------------------------------------------------------
# Datenabruf je Aktie (mit Cache)
# ---------------------------------------------------------------------------

def _zeile(df, *namen):
    """Erste vorhandene Zeile eines Statements als Liste (neuestes Jahr zuerst),
    None-Werte bleiben None."""
    if df is None or df.empty:
        return None
    for name in namen:
        if name in df.index:
            werte = df.loc[name]
            if hasattr(werte, "iloc") and getattr(werte, "ndim", 1) > 1:
                werte = werte.iloc[0]  # doppelte Zeilennamen: erste nehmen
            return [None if v != v else float(v) for v in werte.tolist()]
    return None


def rohdaten_holen(symbol, cache_tage):
    """Holt die benoetigten Kennzahlen-Rohdaten fuer eine Aktie,
    mit Datei-Cache und Wiederholung bei Rate-Limits."""
    CACHE_ORDNER.mkdir(exist_ok=True)
    cache_datei = CACHE_ORDNER / f"{symbol.replace('/', '_')}.json"
    if cache_datei.exists():
        try:
            daten = json.loads(cache_datei.read_text())
            if time.time() - daten.get("_geholt_am", 0) < cache_tage * 86400:
                return daten
        except (json.JSONDecodeError, OSError):
            pass

    letzter_fehler = None
    for wartezeit in (0, 15, 45):
        if wartezeit:
            print(f"    Rate-Limit, warte {wartezeit}s ...")
            time.sleep(wartezeit)
        try:
            aktie = yf.Ticker(symbol)
            info = aktie.info or {}
            gewinn = aktie.income_stmt
            bilanz = aktie.balance_sheet
            cashflow = aktie.cashflow
            marktkap = info.get("marketCap")
            waehrung = info.get("currency")
            if marktkap is None:
                # Yahoo drosselt den Info-Endpunkt gern; die Kurs-API ist robuster
                try:
                    schnell = aktie.fast_info
                    marktkap = schnell["market_cap"]
                    waehrung = waehrung or schnell["currency"]
                except Exception:
                    pass
            daten = {
                "_geholt_am": time.time(),
                "name": info.get("shortName") or info.get("longName"),
                "sektor": info.get("sector"),
                "branche": info.get("industry"),
                "land": info.get("country"),
                "waehrung": waehrung,
                "bilanz_waehrung": info.get("financialCurrency"),
                "marktkap": marktkap,
                "kgv": info.get("trailingPE"),
                "ebit": _zeile(gewinn, "EBIT", "Operating Income"),
                "ebitda": _zeile(gewinn, "EBITDA", "Normalized EBITDA"),
                "umsatz": _zeile(gewinn, "Total Revenue", "Operating Revenue"),
                "bruttogewinn": _zeile(gewinn, "Gross Profit"),
                "bilanzsumme": _zeile(bilanz, "Total Assets"),
                "kurzfr_verbindlichkeiten": _zeile(bilanz, "Current Liabilities",
                                                   "Total Liabilities Net Minority Interest"),
                "schulden": _zeile(bilanz, "Total Debt"),
                "kasse": _zeile(bilanz, "Cash Cash Equivalents And Short Term Investments",
                                "Cash And Cash Equivalents"),
                "fcf": _zeile(cashflow, "Free Cash Flow"),
                "abschreibungen": _zeile(cashflow, "Depreciation And Amortization",
                                         "Depreciation Amortization Depletion"),
            }
            cache_datei.write_text(json.dumps(daten))
            return daten
        except YFRateLimitError as fehler:
            letzter_fehler = fehler
        except Exception as fehler:
            daten = {"_geholt_am": time.time(), "_fehler": str(fehler)[:200]}
            cache_datei.write_text(json.dumps(daten))
            return daten
    return {"_geholt_am": time.time(), "_fehler": f"Rate-Limit: {letzter_fehler}"}


# ---------------------------------------------------------------------------
# Kennzahlen berechnen
# ---------------------------------------------------------------------------

def _cagr(werte):
    """Durchschnittliches Jahreswachstum ueber die vorhandenen Jahre
    (Liste kommt neuestes Jahr zuerst)."""
    if not werte:
        return None
    reihe = [w for w in werte if w is not None]
    if len(reihe) < 2:
        return None
    neu, alt = reihe[0], reihe[-1]
    jahre = len(reihe) - 1
    if alt is None or neu is None or alt <= 0 or neu <= 0:
        return None
    return (neu / alt) ** (1 / jahre) - 1


def kennzahlen_berechnen(symbol, roh):
    """Berechnet alle Screening-Kennzahlen aus den Rohdaten.
    Gibt ein Dict zurueck; 'ausschluss' erklaert, warum eine Aktie
    nicht bewertbar ist."""
    zeile = {"ticker": symbol, "name": roh.get("name"), "sektor": roh.get("sektor"),
             "land": roh.get("land"), "waehrung": roh.get("waehrung"),
             "marktkap": roh.get("marktkap"), "kgv": roh.get("kgv"),
             "ausschluss": None}

    if roh.get("_fehler"):
        zeile["ausschluss"] = f"Datenfehler: {roh['_fehler'][:60]}"
        return zeile
    if roh.get("sektor") in AUSGESCHLOSSENE_SEKTOREN:
        zeile["ausschluss"] = f"Sektor {roh['sektor']} (Kennzahlen nicht vergleichbar)"
        return zeile
    if roh.get("waehrung") and roh.get("bilanz_waehrung") and \
            roh["waehrung"] != roh["bilanz_waehrung"]:
        zeile["ausschluss"] = (f"Waehrungsmix {roh['waehrung']}/{roh['bilanz_waehrung']} "
                               f"(EV-Kennzahlen nicht direkt vergleichbar)")
        return zeile

    ebit = roh.get("ebit") or []
    marktkap = roh.get("marktkap")
    if not marktkap or not ebit or ebit[0] is None:
        zeile["ausschluss"] = "EBIT oder Marktkapitalisierung fehlt"
        return zeile

    # --- Qualitaet: Kapitalrendite (ROCE) ---
    bilanzsumme = roh.get("bilanzsumme") or []
    kurzfristig = roh.get("kurzfr_verbindlichkeiten") or []
    roce_reihe = []
    for i in range(min(len(ebit), len(bilanzsumme), len(kurzfristig))):
        if None in (ebit[i], bilanzsumme[i], kurzfristig[i]):
            continue
        eingesetztes_kapital = bilanzsumme[i] - kurzfristig[i]
        if eingesetztes_kapital > 0:
            roce_reihe.append(ebit[i] / eingesetztes_kapital)
    zeile["roce"] = roce_reihe[0] if roce_reihe else None
    zeile["roce_schnitt"] = sum(roce_reihe) / len(roce_reihe) if roce_reihe else None

    # --- Bewertung: Gewinnrendite (EBIT/EV) und FCF-Rendite ---
    schulden = (roh.get("schulden") or [None])[0] or 0
    kasse = (roh.get("kasse") or [None])[0] or 0
    unternehmenswert = marktkap + schulden - kasse
    zeile["gewinnrendite"] = ebit[0] / unternehmenswert if unternehmenswert > 0 else None

    fcf = roh.get("fcf") or []
    zeile["fcf_rendite"] = fcf[0] / marktkap if fcf and fcf[0] is not None else None
    fcf_jahre = [w for w in fcf if w is not None]
    zeile["fcf_jahre"] = len(fcf_jahre)
    zeile["fcf_positiv"] = sum(1 for w in fcf_jahre if w > 0)

    # --- Wachstum und Margen ---
    umsatz = roh.get("umsatz") or []
    zeile["umsatz_cagr"] = _cagr(umsatz)
    brutto = roh.get("bruttogewinn") or []
    margen = [b / u for b, u in zip(brutto, umsatz)
              if b is not None and u is not None and u > 0]
    zeile["bruttomarge"] = margen[0] if margen else None
    zeile["bruttomarge_trend"] = (margen[0] - margen[-1]) if len(margen) >= 2 else None

    # --- Verschuldung ---
    ebitda = (roh.get("ebitda") or [None])[0]
    if ebitda is None and ebit[0] is not None:
        abschreibung = (roh.get("abschreibungen") or [None])[0]
        if abschreibung is not None:
            ebitda = ebit[0] + abschreibung
    nettoschulden = schulden - kasse
    if ebitda and ebitda > 0:
        zeile["schulden_zu_ebitda"] = max(nettoschulden, 0) / ebitda
    else:
        zeile["schulden_zu_ebitda"] = None

    return zeile


# ---------------------------------------------------------------------------
# Filter und Ranking
# ---------------------------------------------------------------------------

def filter_pruefen(zeile, min_marktkap):
    """Prueft die harten Kriterien. Gibt eine Liste der verletzten
    Kriterien zurueck (leer = Kandidat)."""
    verletzt = []

    def pruefe(bedingung, text, wert):
        if wert is None:
            verletzt.append(f"{text}: keine Daten")
        elif not bedingung:
            verletzt.append(text)

    m = zeile.get("marktkap")
    pruefe(m is not None and m >= min_marktkap,
           f"Marktkap. < {min_marktkap / 1e9:.0f} Mrd", m)
    pruefe((zeile.get("roce") or 0) >= 0.15, "ROCE < 15 %", zeile.get("roce"))
    pruefe((zeile.get("gewinnrendite") or 0) >= 0.05, "Gewinnrendite < 5 %",
           zeile.get("gewinnrendite"))
    pruefe((zeile.get("fcf_rendite") or 0) >= 0.03, "FCF-Rendite < 3 %",
           zeile.get("fcf_rendite"))
    pruefe((zeile.get("umsatz_cagr") if zeile.get("umsatz_cagr") is not None else -1) > 0,
           "Umsatz schrumpft", zeile.get("umsatz_cagr"))
    sze = zeile.get("schulden_zu_ebitda")
    pruefe(sze is not None and sze <= 3, "Nettoschulden > 3x EBITDA", sze)
    if zeile.get("fcf_jahre", 0) >= 3:
        pruefe(zeile["fcf_positiv"] >= zeile["fcf_jahre"] - 1,
               "FCF mehrfach negativ", zeile["fcf_positiv"])
    return verletzt


def rangliste_erstellen(zeilen):
    """Magic-Formula-Ranking: Rang nach ROCE + Rang nach Gewinnrendite,
    Summe = Gesamtrang (kleiner ist besser)."""
    bewertbar = [z for z in zeilen if not z["ausschluss"]
                 and z.get("roce") is not None and z.get("gewinnrendite") is not None]
    nach_roce = sorted(bewertbar, key=lambda z: z["roce"], reverse=True)
    nach_rendite = sorted(bewertbar, key=lambda z: z["gewinnrendite"], reverse=True)
    for platz, z in enumerate(nach_roce, 1):
        z["rang_qualitaet"] = platz
    for platz, z in enumerate(nach_rendite, 1):
        z["rang_bewertung"] = platz
    for z in bewertbar:
        z["magic_rang"] = z["rang_qualitaet"] + z["rang_bewertung"]
    return sorted(bewertbar, key=lambda z: z["magic_rang"])


# ---------------------------------------------------------------------------
# Ausgabe
# ---------------------------------------------------------------------------

def _prozent(wert):
    return f"{wert * 100:.1f}" if wert is not None else ""


def _zahl(wert, stellen=1):
    return f"{wert:.{stellen}f}" if wert is not None else ""


def csv_schreiben(pfad, zeilen):
    spalten = ["ticker", "name", "sektor", "land", "waehrung",
               "marktkap_mrd", "roce_prozent", "roce_schnitt_prozent",
               "gewinnrendite_prozent", "fcf_rendite_prozent", "umsatz_cagr_prozent",
               "bruttomarge_prozent", "schulden_zu_ebitda", "kgv",
               "rang_qualitaet", "rang_bewertung", "magic_rang",
               "kandidat", "verletzte_kriterien", "ausschluss"]
    with open(pfad, "w", newline="", encoding="utf-8") as datei:
        schreiber = csv.writer(datei, delimiter=";")
        schreiber.writerow(spalten)
        for z in zeilen:
            schreiber.writerow([
                z.get("ticker"), z.get("name"), z.get("sektor"), z.get("land"),
                z.get("waehrung"),
                _zahl((z.get("marktkap") or 0) / 1e9, 1) if z.get("marktkap") else "",
                _prozent(z.get("roce")), _prozent(z.get("roce_schnitt")),
                _prozent(z.get("gewinnrendite")), _prozent(z.get("fcf_rendite")),
                _prozent(z.get("umsatz_cagr")), _prozent(z.get("bruttomarge")),
                _zahl(z.get("schulden_zu_ebitda")), _zahl(z.get("kgv")),
                z.get("rang_qualitaet", ""), z.get("rang_bewertung", ""),
                z.get("magic_rang", ""),
                "JA" if z.get("kandidat") else "nein",
                " | ".join(z.get("verletzt", [])),
                z.get("ausschluss") or "",
            ])


def tabelle_drucken(zeilen, anzahl):
    kopf = (f"{'#':>3} {'Ticker':<10} {'Name':<28} {'ROCE':>6} {'GewRend':>8} "
            f"{'FCF-R':>6} {'Wachst':>7} {'Schuld':>7} {'MK Mrd':>7}  Kandidat")
    print(kopf)
    print("-" * len(kopf))
    for i, z in enumerate(zeilen[:anzahl], 1):
        print(f"{i:>3} {z['ticker']:<10} {(z.get('name') or '')[:27]:<28} "
              f"{_prozent(z.get('roce')):>5}% {_prozent(z.get('gewinnrendite')):>7}% "
              f"{_prozent(z.get('fcf_rendite')):>5}% {_prozent(z.get('umsatz_cagr')):>6}% "
              f"{_zahl(z.get('schulden_zu_ebitda')):>7} "
              f"{_zahl((z.get('marktkap') or 0) / 1e9, 0):>7}  "
              f"{'JA' if z.get('kandidat') else '-'}")


# ---------------------------------------------------------------------------
# Hauptprogramm
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(
        description="Magic-Formula-Plus-Aktienscreener (Details: README.md)")
    parser.add_argument("--universum", choices=sorted(UNIVERSEN),
                        help="Vordefiniertes Aktien-Universum")
    parser.add_argument("--tickers", help="Eigene Tickerliste (Textdatei, ein Ticker pro Zeile)")
    parser.add_argument("--universum-aktualisieren", action="store_true",
                        help="Index-Listen neu von Wikipedia laden")
    parser.add_argument("--top", type=int, default=25,
                        help="Anzahl Zeilen in der Konsolen-Tabelle (Standard: 25)")
    parser.add_argument("--min-marktkap", type=float, default=1.0,
                        help="Mindest-Marktkapitalisierung in Mrd (Standard: 1)")
    parser.add_argument("--cache-tage", type=int, default=3,
                        help="Wie lange gecachte Daten gelten (Standard: 3 Tage)")
    parser.add_argument("--limit", type=int,
                        help="Nur die ersten N Ticker verarbeiten (zum Testen)")
    argumente = parser.parse_args()

    if argumente.universum_aktualisieren:
        print("Lade Index-Zusammensetzungen von Wikipedia ...")
        universum_aktualisieren()
        if not argumente.universum and not argumente.tickers:
            return

    if argumente.tickers:
        pfad = Path(argumente.tickers)
        if not pfad.exists():
            sys.exit(f"Tickerdatei nicht gefunden: {pfad}")
        ticker = [z.strip() for z in pfad.read_text().splitlines() if z.strip()]
        universum_name = pfad.stem
    elif argumente.universum:
        ticker = universum_laden(argumente.universum)
        universum_name = argumente.universum
    else:
        parser.print_help()
        sys.exit("\nBitte --universum oder --tickers angeben.")

    if argumente.limit:
        ticker = ticker[:argumente.limit]

    print(f"\nScreene {len(ticker)} Aktien (Universum: {universum_name}) ...\n")
    zeilen = []
    start = time.time()
    for nummer, symbol in enumerate(ticker, 1):
        roh = rohdaten_holen(symbol, argumente.cache_tage)
        zeilen.append(kennzahlen_berechnen(symbol, roh))
        if nummer % 25 == 0 or nummer == len(ticker):
            dauer = time.time() - start
            print(f"  {nummer}/{len(ticker)} verarbeitet ({dauer:.0f}s)")
        time.sleep(0.2)  # Yahoo nicht hetzen

    rangliste = rangliste_erstellen(zeilen)
    min_marktkap = argumente.min_marktkap * 1e9
    for z in rangliste:
        z["verletzt"] = filter_pruefen(z, min_marktkap)
        z["kandidat"] = not z["verletzt"]
    kandidaten = [z for z in rangliste if z["kandidat"]]

    print(f"\n=== Magic-Formula-Ranking: Top {min(argumente.top, len(rangliste))} "
          f"von {len(rangliste)} bewertbaren Aktien ===\n")
    tabelle_drucken(rangliste, argumente.top)

    print(f"\n=== Kandidaten (bestehen ALLE harten Filter): {len(kandidaten)} ===\n")
    if kandidaten:
        tabelle_drucken(kandidaten, len(kandidaten))
        print("\nNaechster Schritt: Diese Firmen von Hand pruefen -"
              "\nWarum ist die Aktie guenstig? Gibt es einen Burggraben?"
              " Waechst der Markt? (Checkliste im README)")
    else:
        print("Keine Aktie besteht aktuell alle Filter - das ist ein Ergebnis!"
              "\nEntweder ist der Markt gerade teuer, oder die Filter sind streng."
              "\nDie Rangliste oben zeigt trotzdem die relativ besten Werte.")

    nicht_bewertbar = [z for z in zeilen if z["ausschluss"]]
    if nicht_bewertbar:
        print(f"\n{len(nicht_bewertbar)} Aktien nicht bewertbar "
              f"(Finanzsektor, Datenluecken o.ae. - Details im CSV).")

    ERGEBNIS_ORDNER.mkdir(exist_ok=True)
    datum = time.strftime("%Y-%m-%d")
    csv_pfad = ERGEBNIS_ORDNER / f"screening_{universum_name}_{datum}.csv"
    csv_schreiben(csv_pfad, rangliste + nicht_bewertbar)
    print(f"\nVollstaendige Ergebnisse: {csv_pfad}")


if __name__ == "__main__":
    main()
