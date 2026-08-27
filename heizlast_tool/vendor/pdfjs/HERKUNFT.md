# pdf.js — Herkunft der eingebetteten Dateien

| | |
|---|---|
| Paket | pdfjs-dist |
| Version | 6.2.108 |
| Lizenz | Apache-2.0 (Volltext in LICENSE) |
| Herkunft | Mozilla, mozilla.github.io/pdf.js |
| Zweig | legacy/build (deckt zusaetzlich Safari 18+, Chrome 125+, Firefox ESR ab) |
| Bezug | npm pack pdfjs-dist@6.2.108, danach legacy/build/pdf.min.mjs, legacy/build/pdf.worker.min.mjs und LICENSE hierher kopieren |

Nicht mitgenommen: cmaps/ (nur CJK-Schriften), standard_fonts/ (nur fuer nicht
eingebettete Standard-14-Schriften), pdf.sandbox (nur Formularskripte), wasm/
(Decoder fuer JBIG2 und JPEG 2000; in 90 untersuchten Projekt-PDF kam keines
davon vor, siehe SPEZIFIKATION_FORMATE.md Abschnitt 8.1).

Diese beiden .mjs-Dateien werden von build.py in die Auslieferungsdatei
eingebettet. Sie werden nicht bearbeitet.
