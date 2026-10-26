import BucketKit
import Foundation
import Observation
import SwiftUI
import UserNotifications
#if os(iOS)
import UIKit
#endif

@MainActor
func backgroundSafe(_ work: @escaping @MainActor () async -> Void) {
    #if os(iOS)
    var id = UIBackgroundTaskIdentifier.invalid
    id = UIApplication.shared.beginBackgroundTask { UIApplication.shared.endBackgroundTask(id) }
    Task {
        await work()
        UIApplication.shared.endBackgroundTask(id)
    }
    #else
    Task { await work() }
    #endif
}

@MainActor
func langDue(_ store: LangStore) -> [(due: Double, label: String?)] {
    var out: [(due: Double, label: String?)] = []
    for sys in store.systems {
        for (id, card) in store.state(sys.id).cards.entries {
            guard let due = card.due else { continue }
            let p = parseCardId(id)
            guard sys.targets.contains(p.lang) else { continue }
            out.append((due, store.corpus?.byId[p.itemId]?.form(p.lang)))
        }
    }
    return out
}

@MainActor
func langStreak(_ store: LangStore) -> Int { store.systems.map { Int(store.state($0.id).streak) }.max() ?? 0 }

@MainActor
func langForecast(_ store: LangStore, at date: Date) -> ReviewForecast {
    ReminderPlan.forecast(due: langDue(store), at: date, streak: langStreak(store))
}

@MainActor
@Observable
final class Reminders {
    static let enabledKey = "reminders.enabled"
    static let customKey = "reminders.customMinute"
    static let studyKey = "reminders.studyMinutes"
    static let lastStudyKey = "reminders.lastStudy"
    static let wordKey = "reminders.wordOfDay"
    static let idPrefix = "review-reminder-"
    static let fallbackMinute = 19 * 60
    static let quietAfterDays = 7

    private let defaults: UserDefaults
    var enabled: Bool { didSet { defaults.set(enabled, forKey: Self.enabledKey) } }
    var customMinute: Int? { didSet { defaults.set(customMinute ?? -1, forKey: Self.customKey) } }
    var denied = false
    var wordChoice: Bool? { didSet { defaults.set(wordChoice, forKey: Self.wordKey) } }
    var wordOfDay: Bool { wordChoice ?? enabled }

    init(defaults: UserDefaults = .standard) {
        self.defaults = defaults
        enabled = defaults.bool(forKey: Self.enabledKey)
        let c = defaults.object(forKey: Self.customKey) as? Int ?? -1
        customMinute = c >= 0 ? c : nil
        wordChoice = defaults.object(forKey: Self.wordKey) as? Bool
    }

    func setWordOfDay(_ on: Bool) async {
        guard on else {
            wordChoice = false
            return
        }
        let granted = (try? await UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound, .badge])) ?? false
        denied = !granted
        wordChoice = granted
    }

    var studyMinutes: [Int] { defaults.array(forKey: Self.studyKey) as? [Int] ?? [] }

    var usualMinute: Int {
        ReminderPlan.median(studyMinutes, fallback: Self.fallbackMinute)
    }

    var minute: Int { customMinute ?? usualMinute }

    func noteStudy(at date: Date = .now) {
        if let last = lastStudy, Calendar.current.isDate(last, inSameDayAs: date) { return }
        let c = Calendar.current.dateComponents([.hour, .minute], from: date)
        let m = (c.hour ?? 0) * 60 + (c.minute ?? 0)
        defaults.set(Array((studyMinutes + [m]).suffix(14)), forKey: Self.studyKey)
        defaults.set(date.timeIntervalSince1970, forKey: Self.lastStudyKey)
    }

    func reset() {
        disable()
        for k in [Self.studyKey, Self.lastStudyKey, Self.customKey] { defaults.removeObject(forKey: k) }
        customMinute = nil
    }

    var lastStudy: Date? {
        let t = defaults.double(forKey: Self.lastStudyKey)
        return t > 0 ? Date(timeIntervalSince1970: t) : nil
    }

    #if DEBUG
    static func test() async -> String {
        let center = UNUserNotificationCenter.current()
        _ = try? await center.requestAuthorization(options: [.alert, .sound, .badge])
        let settings = await center.notificationSettings()
        guard settings.authorizationStatus == .authorized || settings.authorizationStatus == .provisional else {
            return "Notifications are off for this app. Turn them on in iPhone Settings, Notifications."
        }
        let content = UNMutableNotificationContent()
        content.title = "Test reminder"
        content.body = "Notifications reach this phone."
        content.sound = .default
        do {
            try await center.add(UNNotificationRequest(identifier: "test.reminder", content: content, trigger: UNTimeIntervalNotificationTrigger(timeInterval: 10, repeats: false)))
            return "Scheduled. It arrives in 10 seconds, in the app or on the lock screen."
        } catch {
            return "Could not schedule: \(error.localizedDescription)"
        }
    }
    #endif

    func enable() async -> Bool {
        let center = UNUserNotificationCenter.current()
        let granted = (try? await center.requestAuthorization(options: [.alert, .sound, .badge])) ?? false
        denied = !granted
        enabled = granted
        return granted
    }

    func disable() {
        enabled = false
        UNUserNotificationCenter.current().removePendingNotificationRequests(withIdentifiers: (0..<Self.quietAfterDays + 1).map { Self.idPrefix + String($0) })
    }

    func fireDates(now: Date = .now) -> [Date] {
        ReminderPlan.fireDates(now: now, minute: minute, lastStudy: lastStudy)
    }

    func reschedule(title: String, forecast: (Date) -> ReviewForecast) async {
        let center = UNUserNotificationCenter.current()
        center.removePendingNotificationRequests(withIdentifiers: (0..<Self.quietAfterDays + 1).map { Self.idPrefix + String($0) })
        #if DEBUG
        if !enabled, ProcessInfo.processInfo.arguments.contains("-reminderProbe") { print("reminderProbe enabled false auth", (await center.notificationSettings()).authorizationStatus.rawValue) }
        #endif
        guard enabled else { return }
        for (i, date) in fireDates().enumerated() {
            let raw = forecast(date)
            let f = i == 0 ? raw : ReviewForecast(count: raw.count, example: raw.example, streak: 0)
            let content = UNMutableNotificationContent()
            content.title = title
            content.body = ReminderPlan.message(f)
            content.sound = .default
            let comps = Calendar.current.dateComponents([.year, .month, .day, .hour, .minute], from: date)
            try? await center.add(UNNotificationRequest(identifier: Self.idPrefix + String(i), content: content, trigger: UNCalendarNotificationTrigger(dateMatching: comps, repeats: false)))
        }
        #if DEBUG
        if ProcessInfo.processInfo.arguments.contains("-reminderProbe") {
            let auth = await center.notificationSettings()
            let pending = await center.pendingNotificationRequests().compactMap { r in (r.trigger as? UNCalendarNotificationTrigger)?.nextTriggerDate().map { "\($0) \(r.content.body.prefix(40))" } }
            print("reminderProbe enabled", enabled, "auth", auth.authorizationStatus.rawValue, "alert", auth.alertSetting.rawValue, "lock", auth.lockScreenSetting.rawValue, "minute", minute, "studyMinutes", studyMinutes, "lastStudy", lastStudy as Any, "fire", fireDates(), "pending", pending)
        }
        #endif
    }
}

struct ReminderPrompt: View {
    @Environment(Reminders.self) private var reminders

    var body: some View {
        if !reminders.enabled {
            VStack(alignment: .leading, spacing: 6) {
                Text(reminders.denied ? String(localized: "Notifications are off for this app. Turn them on in Settings to get review reminders.") : String(localized: "Get one nudge a day when reviews are due, at your regular study time."))
                    .font(.subheadline)
                    .foregroundStyle(Palette.muted)
                if !reminders.denied {
                    Button("Remind me when these are due") { Task { _ = await reminders.enable() } }
                        .buttonStyle(D8Option(align: .center, compact: true))
                }
            }
        }
    }
}

struct ReminderSettings: View {
    @Environment(Reminders.self) private var reminders
    @State private var testResult: String?
    @State private var nextReminder: Date?

    var body: some View {
        @Bindable var r = reminders
        Section {
            Toggle("Daily review reminder", isOn: Binding(get: { reminders.enabled }, set: { on in
                if on { Task { _ = await reminders.enable() } } else { reminders.disable() }
            }))
            if reminders.enabled {
                Toggle("At my regular study time", isOn: Binding(get: { reminders.customMinute == nil }, set: { auto in
                    reminders.customMinute = auto ? nil : reminders.usualMinute
                }))
                if reminders.customMinute != nil {
                    DatePicker("Time", selection: Binding(get: {
                        Calendar.current.date(bySettingHour: reminders.minute / 60, minute: reminders.minute % 60, second: 0, of: .now) ?? .now
                    }, set: { d in
                        let c = Calendar.current.dateComponents([.hour, .minute], from: d)
                        reminders.customMinute = (c.hour ?? 0) * 60 + (c.minute ?? 0)
                    }), displayedComponents: .hourAndMinute)
                } else {
                    Text("Currently around \(String(format: "%d:%02d", reminders.minute / 60, reminders.minute % 60))")
                        .font(.footnote)
                        .foregroundStyle(Palette.muted)
                }
            }
            if Feedback.isPolingual {
                Toggle("Word of the day at 9am", isOn: Binding(get: { reminders.wordOfDay }, set: { on in Task { await reminders.setWordOfDay(on) } }))
            }
            if reminders.denied {
                Text("Notifications are off for this app in Settings.").font(.footnote).foregroundStyle(Palette.muted)
            }
            #if DEBUG
            if let nextReminder { Text("Next reminder \(nextReminder.formatted(date: .abbreviated, time: .shortened))").font(.footnote).foregroundStyle(Palette.muted) }
            Button("Send a test reminder in 10 seconds") { Task { testResult = await Reminders.test() } }
            if let testResult { Text(testResult).font(.footnote).foregroundStyle(Palette.muted) }
            #endif
        } header: {
            Eyebrow(text: "Reminders")
        }
        #if DEBUG
        .task(id: reminders.enabled) {
            try? await Task.sleep(for: .seconds(1))
            let pending = await UNUserNotificationCenter.current().pendingNotificationRequests()
            nextReminder = pending.compactMap { ($0.trigger as? UNCalendarNotificationTrigger)?.nextTriggerDate() }.min()
        }
        #endif
    }
}

final class NotificationPresenter: NSObject, UNUserNotificationCenterDelegate, Sendable {
    static let shared = NotificationPresenter()

    func userNotificationCenter(_ center: UNUserNotificationCenter, willPresent notification: UNNotification) async -> UNNotificationPresentationOptions {
        [.banner, .list, .sound]
    }
}
