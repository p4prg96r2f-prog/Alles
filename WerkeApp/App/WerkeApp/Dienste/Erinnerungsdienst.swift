import Foundation
import UserNotifications
import WerkeKern

/// Meldet die Erinnerungen beim System an.
///
/// Was **wann** fällig ist, entscheidet `Erinnerungsplan` im Rechenkern und ist
/// dort mit Testfällen abgesichert. Hier steht nur noch die Anbindung – aus
/// demselben Grund wie überall in dieser App: Ein Weckruf zur falschen Zeit
/// wäre ein Fehler, den man erst einen Monat später bemerkt, und solche Fehler
/// gehören in eine Prüfstrecke statt in eine Ansicht.
enum Erinnerungsdienst {

    /// Fragt einmalig nach der Erlaubnis. Ohne sie passiert nichts weiter –
    /// die App verliert dadurch keine Funktion, nur den Anstoß.
    static func frageErlaubnis() async -> Bool {
        do {
            return try await UNUserNotificationCenter.current()
                .requestAuthorization(options: [.alert, .sound, .badge])
        } catch {
            return false
        }
    }

    static func erlaubnisstand() async -> UNAuthorizationStatus {
        await UNUserNotificationCenter.current().notificationSettings().authorizationStatus
    }

    /// Richtet den vollständigen Plan neu ein.
    ///
    /// Erst löschen, dann setzen: Der Plan ist immer vollständig, und nur so
    /// verschwinden Erinnerungen, deren Anlass entfallen ist. Wer den
    /// Energieausweis erneuert hat, soll nicht weiter an dessen Ablauf erinnert
    /// werden.
    static func richteEin(ablage: Ablage, regeln: Regelpaket) async {
        let zentrale = UNUserNotificationCenter.current()

        guard Voreinstellungen.erinnerungen,
              await erlaubnisstand() == .authorized else {
            zentrale.removeAllPendingNotificationRequests()
            return
        }

        let plan = Erinnerungsplan.plane(
            ablage: ablage,
            regeln: regeln,
            stunde: Voreinstellungen.erinnerungsstunde
        )

        zentrale.removeAllPendingNotificationRequests()

        var kalender = Calendar(identifier: .gregorian)
        kalender.timeZone = .current

        for erinnerung in plan {
            let inhalt = UNMutableNotificationContent()
            inhalt.title = erinnerung.titel
            inhalt.body = erinnerung.text
            inhalt.sound = .default
            // Damit ein Tipp auf die Mitteilung im richtigen Bildschirm landet.
            inhalt.userInfo = ["art": erinnerung.art.rawValue]

            let teile = kalender.dateComponents(
                [.year, .month, .day, .hour, .minute], from: erinnerung.faellig
            )
            let ausloeser = UNCalendarNotificationTrigger(dateMatching: teile, repeats: false)

            try? await zentrale.add(UNNotificationRequest(
                identifier: erinnerung.kennung,
                content: inhalt,
                trigger: ausloeser
            ))
        }
    }

    static func alleLoeschen() {
        UNUserNotificationCenter.current().removeAllPendingNotificationRequests()
    }

    /// Wie viele Erinnerungen stehen gerade an? Für die Einstellungen.
    static func anzahlGeplant() async -> Int {
        await UNUserNotificationCenter.current().pendingNotificationRequests().count
    }
}
