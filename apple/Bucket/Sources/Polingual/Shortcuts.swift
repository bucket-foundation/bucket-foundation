import AppIntents
import Foundation

extension Notification.Name {
    static let startStudy = Notification.Name("bucket.startStudy")
}

enum StudyRequest {
    static let key = "intent.startStudy"

    static func take() -> Bool {
        guard UserDefaults.standard.bool(forKey: key) else { return false }
        UserDefaults.standard.removeObject(forKey: key)
        return true
    }
}

struct StartStudyIntent: AppIntent {
    static let title: LocalizedStringResource = "Start today's session"
    static let description = IntentDescription("Opens your next due reviews and new words.")
    static let openAppWhenRun = true

    @MainActor
    func perform() async throws -> some IntentResult {
        UserDefaults.standard.set(true, forKey: StudyRequest.key)
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
