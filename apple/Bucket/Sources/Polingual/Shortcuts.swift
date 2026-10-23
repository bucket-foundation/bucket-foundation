import AppIntents
import Foundation

extension Notification.Name {
    static let startStudy = Notification.Name("bucket.startStudy")
}

enum StudyRequest {
    static let key = "intent.startStudy"

    static func take(now: Date = .now) -> Bool {
        let at = UserDefaults.standard.double(forKey: key)
        guard at > 0 else { return false }
        UserDefaults.standard.removeObject(forKey: key)
        return now.timeIntervalSince1970 - at < 60
    }

    static var pending: Bool { UserDefaults.standard.double(forKey: key) > 0 }
}

struct StartStudyIntent: AppIntent {
    static let title: LocalizedStringResource = "Start today's session"
    static let description = IntentDescription("Opens your next due reviews and new words.")
    static let openAppWhenRun = true

    @MainActor
    func perform() async throws -> some IntentResult {
        UserDefaults.standard.set(Date().timeIntervalSince1970, forKey: StudyRequest.key)
        NotificationCenter.default.post(name: .startStudy, object: nil)
        return .result()
    }
}

struct StudyShortcuts: AppShortcutsProvider {
    static var appShortcuts: [AppShortcut] {
        AppShortcut(
            intent: StartStudyIntent(),
            phrases: [
                "Practice with \(.applicationName)",
                "Start a session in \(.applicationName)",
                "Study with \(.applicationName)",
            ],
            shortTitle: "Study",
            systemImageName: "flame.fill"
        )
    }
}
