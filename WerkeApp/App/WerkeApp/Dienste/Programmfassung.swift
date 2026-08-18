import Foundation

/// Fassungsnummer der App, wie sie im Paket steht.
enum Programmfassung {
    static var nummer: String {
        Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "–"
    }

    static var bau: String {
        Bundle.main.infoDictionary?["CFBundleVersion"] as? String ?? "–"
    }

    static var lesbar: String { "\(nummer) (\(bau))" }
}
