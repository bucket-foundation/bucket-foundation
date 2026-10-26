import Foundation

struct WidgetWord: Codable, Equatable {
    let lang: String
    let form: String
}

struct WidgetSnapshot: Codable, Equatable {
    #if BUCKET
    static let group = "group.foundation.bucket.app"
    #else
    static let group = "group.com.polingual.app"
    #endif
    static let key = "widget.snapshot"

    var streak: Int
    var due: Int
    var newToday: Int
    var words: [WidgetWord]
    var gloss: String
    var updated: Date

    static let placeholder = WidgetSnapshot(streak: 12, due: 8, newToday: 4, words: [WidgetWord(lang: "fr", form: "nuit"), WidgetWord(lang: "es", form: "noche"), WidgetWord(lang: "it", form: "notte")], gloss: "night", updated: .now)

    static func read() -> WidgetSnapshot? {
        guard let data = UserDefaults(suiteName: group)?.data(forKey: key) else { return nil }
        return try? JSONDecoder().decode(WidgetSnapshot.self, from: data)
    }

    func write() {
        UserDefaults(suiteName: Self.group)?.set(try? JSONEncoder().encode(self), forKey: Self.key)
    }
}
