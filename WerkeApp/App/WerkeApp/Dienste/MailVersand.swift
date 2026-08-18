import Foundation
import SwiftUI
import MessageUI
import WerkeKern

/// Eine vorbereitete Nachricht an WERK.E.
///
/// Der Inhalt kommt aus dem Rechenkern (`Anfragetext`) – hier steht nur noch
/// die Zustellung. Die Grundregel bleibt dieselbe wie beim Anfrage-PDF: **Der
/// Nutzer sieht die Nachricht vor dem Senden und löst das Senden selbst aus.**
/// Die App verschickt nichts von allein, und sie braucht dafür keinen Server.
struct Mailnachricht: Identifiable {
    let id = UUID()
    let betreff: String
    let text: String
    /// PDF mit den vollständigen Ergebnissen, hängt an, wo möglich.
    let anhang: URL?
}

enum MailVersand {

    /// Ist das eingebaute Mail-Formular verfügbar? Es kann den Anhang tragen.
    static var formularMoeglich: Bool {
        MFMailComposeViewController.canSendMail()
    }

    /// Ersatzweg: `mailto:` öffnet die als Standard eingestellte Mail-App.
    /// Der Anhang geht dabei verloren – der Text trägt die Ergebnisse deshalb
    /// immer selbst.
    static func mailtoURL(_ nachricht: Mailnachricht) -> URL? {
        var teile = URLComponents()
        teile.scheme = "mailto"
        teile.path = Kontakt.mail
        teile.queryItems = [
            URLQueryItem(name: "subject", value: nachricht.betreff),
            URLQueryItem(name: "body", value: nachricht.text)
        ]
        return teile.url
    }
}

/// Das eingebaute Mail-Formular, mit Anhang.
struct MailFormular: UIViewControllerRepresentable {

    let nachricht: Mailnachricht
    @Environment(\.dismiss) private var schliessen

    func makeUIViewController(context: Context) -> MFMailComposeViewController {
        let formular = MFMailComposeViewController()
        formular.mailComposeDelegate = context.coordinator
        formular.setToRecipients([Kontakt.mail])
        formular.setSubject(nachricht.betreff)
        formular.setMessageBody(nachricht.text, isHTML: false)

        if let anhang = nachricht.anhang,
           let daten = try? Data(contentsOf: anhang) {
            formular.addAttachmentData(
                daten,
                mimeType: "application/pdf",
                fileName: anhang.lastPathComponent
            )
        }
        return formular
    }

    func updateUIViewController(_ formular: MFMailComposeViewController, context: Context) {}

    func makeCoordinator() -> Vermittler {
        Vermittler { schliessen() }
    }

    final class Vermittler: NSObject, MFMailComposeViewControllerDelegate {
        private let fertig: () -> Void

        init(fertig: @escaping () -> Void) {
            self.fertig = fertig
        }

        func mailComposeController(
            _ controller: MFMailComposeViewController,
            didFinishWith result: MFMailComposeResult,
            error: Error?
        ) {
            fertig()
        }
    }
}
