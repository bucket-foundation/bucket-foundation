import BucketKit
import Foundation
import UserNotifications

@MainActor
enum WordOfDayReminder {
    static func schedule(_ store: LangStore, enabled: Bool, now: Date = .now) async {
        let center = UNUserNotificationCenter.current()
        let ids = (1...3).map { "word-of-day-\($0)" }
        center.removePendingNotificationRequests(withIdentifiers: ids)
        guard enabled, let corpus = store.corpus, let system = store.systems.first else { return }
        let state = store.state(system.id)
        let cal = Calendar.current
        for k in 1...3 {
            guard let day = cal.date(byAdding: .day, value: k, to: cal.startOfDay(for: now)),
                  let fire = cal.date(bySettingHour: 9, minute: 0, second: 0, of: day),
                  let word = wordOfDay(system, corpus, state, day: dayKey(day.timeIntervalSince1970 * 1000)),
                  let gloss = word.form(system.root) else { continue }
            let content = UNMutableNotificationContent()
            content.title = String(localized: "Word of the day: \(gloss)")
            content.body = system.targets.compactMap { l in word.form(l).map { "\(langName(l)) \($0)" } }.joined(separator: " · ")
            content.userInfo = ["study": true]
            content.sound = .default
            try? await center.add(UNNotificationRequest(identifier: "word-of-day-\(k)", content: content, trigger: UNCalendarNotificationTrigger(dateMatching: cal.dateComponents([.year, .month, .day, .hour, .minute], from: fire), repeats: false)))
        }
    }
}
