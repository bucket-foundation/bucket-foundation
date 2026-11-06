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
func langStreak(_ store: LangStore, now: Date = .now) -> Int {
    ReminderPlan.streak(store.systems.map { store.state($0.id) }, at: now)
}

@MainActor
func langForecast(_ store: LangStore, at date: Date) -> ReviewForecast {
    ReminderPlan.forecast(due: langDue(store), at: date, streak: langStreak(store, now: date), studiedToday: ReminderPlan.studied(store.systems.map { store.state($0.id) }, at: date))
}

@MainActor
@Observable
final class Reminders {
    static let enabledKey = ReminderConsent.enabledKey
    static let customKey = ReminderConsent.customKey
    static let studyKey = "reminders.studyMinutes"
    static let lastStudyKey = "reminders.lastStudy"
    static let wordKey = ReminderConsent.wordKey
    static let streakKey = "reminders.streakRisk"
    static let cheersKey = "reminders.cheers"
    static let idPrefix = "review-reminder-"
    static let riskPrefix = "streak-risk-"
    static let fallbackMinute = 19 * 60
    static let quietAfterDays = 7

    private let defaults: UserDefaults
    var enabled: Bool {
        didSet {
            if enabled { defaults.set(true, forKey: Self.enabledKey) } else { defaults.removeObject(forKey: Self.enabledKey) }
        }
    }
    var customMinute: Int? { didSet { defaults.set(customMinute ?? -1, forKey: Self.customKey) } }
    var denied = false
    var unasked = false
    var wordChoice: Bool? { didSet { defaults.set(wordChoice, forKey: Self.wordKey) } }
    var wordOfDay: Bool { wordChoice ?? enabled }
    var stuckOff: Bool { ReminderConsent.stuckOff(defaults) }
    var streakChoice: Bool? { didSet { defaults.set(streakChoice, forKey: Self.streakKey) } }
    var streakRisk: Bool { streakChoice ?? enabled }
    var cheers: Bool { didSet { defaults.set(cheers, forKey: Self.cheersKey) } }
    @ObservationIgnored private var replan: (@MainActor () async -> Void)?
    @ObservationIgnored private var planning: Task<Void, Never>?

    static var cheersOn: Bool { UserDefaults.standard.object(forKey: cheersKey) as? Bool ?? true }

    init(defaults: UserDefaults = .standard) {
        self.defaults = defaults
        ReminderConsent.heal(defaults)
        enabled = defaults.bool(forKey: Self.enabledKey)
        let c = defaults.object(forKey: Self.customKey) as? Int ?? -1
        customMinute = c >= 0 ? c : nil
        wordChoice = defaults.object(forKey: Self.wordKey) as? Bool
        streakChoice = defaults.object(forKey: Self.streakKey) as? Bool
        cheers = defaults.object(forKey: Self.cheersKey) as? Bool ?? true
    }

    func setStreakRisk(_ on: Bool) async {
        if on {
            streakChoice = await allowed()
        } else {
            streakChoice = false
        }
        await replan?()
    }

    func setCheers(_ on: Bool) async {
        cheers = on
        if on { await PushRegistry.shared.refresh() } else { await PushRegistry.shared.unregister() }
    }

    func setWordOfDay(_ on: Bool) async {
        guard on else {
            wordChoice = false
            return
        }
        wordChoice = await allowed()
    }

    func allowed() async -> Bool {
        let status = await UNUserNotificationCenter.current().notificationSettings().authorizationStatus
        denied = status == .denied
        unasked = status == .notDetermined
        return status == .authorized || status == .provisional
    }

    func turnOnAllowed() async {
        guard await allowed() else { return }
        ReminderConsent.record(on: true, defaults)
        enabled = true
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
        Task { await replan?() }
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

    static func test() async -> String {
        let center = UNUserNotificationCenter.current()
        let settings = await center.notificationSettings()
        guard settings.authorizationStatus == .authorized || settings.authorizationStatus == .provisional else {
            return String(localized: "Notifications are off for this app. Turn on a reminder above, or allow them in iPhone Settings.")
        }
        let content = UNMutableNotificationContent()
        content.title = String(localized: "Test reminder")
        content.body = String(localized: "Your reminders reach this phone.")
        content.sound = .default
        do {
            try await center.add(UNNotificationRequest(identifier: "test.reminder", content: content, trigger: UNTimeIntervalNotificationTrigger(timeInterval: 10, repeats: false)))
            return String(localized: "Sent. It arrives in 10 seconds.")
        } catch {
            return String(localized: "That did not send. Try again.")
        }
    }

    func enable() async -> Bool {
        ReminderConsent.record(on: true, defaults)
        let granted = (try? await UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound, .badge])) ?? false
        denied = !granted
        unasked = false
        enabled = granted
        return granted
    }

    func sync() async {
        let status = await UNUserNotificationCenter.current().notificationSettings().authorizationStatus
        denied = status == .denied
        unasked = status == .notDetermined
        if !enabled, ReminderConsent.autoEnables(authorized: status == .authorized || status == .provisional, defaults) { enabled = true }
    }

    func turnOff() {
        ReminderConsent.record(on: false, defaults)
        disable()
    }

    func disable() {
        enabled = false
        UNUserNotificationCenter.current().removePendingNotificationRequests(withIdentifiers: (0..<Self.quietAfterDays + 1).map { Self.idPrefix + String($0) })
    }

    func fireDates(now: Date = .now) -> [Date] {
        ReminderPlan.fireDates(now: now, minute: minute, lastStudy: lastStudy)
    }

    func reschedule(title: String, forecast: @escaping @MainActor (Date) -> ReviewForecast) async {
        replan = { [weak self] in await self?.reschedule(title: title, forecast: forecast) }
        let previous = planning
        let task = Task {
            await previous?.value
            await plan(title: title, forecast: forecast)
        }
        planning = task
        await task.value
    }

    static func riskId(_ date: Date) -> String { riskPrefix + dayKey(date.timeIntervalSince1970 * 1000) }

    private func planRisk(_ f: ReviewForecast, center: UNUserNotificationCenter) async {
        let old = await center.pendingNotificationRequests().map(\.identifier).filter { $0.hasPrefix(Self.riskPrefix) }
        center.removePendingNotificationRequests(withIdentifiers: old)
        if f.studiedToday { center.removeDeliveredNotifications(withIdentifiers: [Self.riskId(.now)]) }
        guard streakRisk else { return }
        for alert in ReminderPlan.riskAlerts(now: .now, dailyMinute: minute, streak: f.streak, studiedToday: f.studiedToday) {
            let content = UNMutableNotificationContent()
            content.title = String(localized: "Your \(alert.streak)-day streak ends at midnight")
            content.body = String(localized: "One card saves it.")
            content.sound = .default
            content.userInfo = ["study": true]
            let comps = Calendar.current.dateComponents([.year, .month, .day, .hour, .minute], from: alert.date)
            try? await center.add(UNNotificationRequest(identifier: Self.riskId(alert.date), content: content, trigger: UNCalendarNotificationTrigger(dateMatching: comps, repeats: false)))
        }
    }

    private func plan(title: String, forecast: @MainActor (Date) -> ReviewForecast) async {
        let center = UNUserNotificationCenter.current()
        await planRisk(forecast(.now), center: center)
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
            content.userInfo = ["study": true]
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
                    Button(reminders.stuckOff ? String(localized: "Turn on reminders") : String(localized: "Remind me when these are due")) { Task { _ = await reminders.enable() } }
                        .buttonStyle(D8Option(align: .center, compact: true))
                }
                #if os(iOS)
                if reminders.denied, let url = URL(string: UIApplication.openNotificationSettingsURLString) {
                    Link("Open Settings", destination: url)
                        .buttonStyle(D8Option(align: .center, compact: true))
                }
                #endif
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
                if on { Task { await reminders.turnOnAllowed() } } else { reminders.turnOff() }
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
            Toggle("Streak at risk in the evening", isOn: Binding(get: { reminders.streakRisk }, set: { on in Task { await reminders.setStreakRisk(on) } }))
            Toggle("Word of the day at 9am", isOn: Binding(get: { reminders.wordOfDay }, set: { on in Task { await reminders.setWordOfDay(on) } }))
            Toggle("Group cheers and nudges", isOn: Binding(get: { reminders.cheers }, set: { on in Task { await reminders.setCheers(on) } }))
            if Bundle.main.bundleIdentifier == "com.polingual.app" {
                LabeledContent("Trial ending", value: String(localized: "Sent once, before your trial ends"))
            }
            if reminders.unasked {
                Text("Allow notifications from the reminder card on Today, then turn these on.").font(.footnote).foregroundStyle(Palette.muted)
            }
            if reminders.denied {
                Text("Notifications are off for this app in Settings.").font(.footnote).foregroundStyle(Palette.muted)
                #if os(iOS)
                if let url = URL(string: UIApplication.openNotificationSettingsURLString) { Link("Open Settings", destination: url) }
                #endif
            }
            if let nextReminder { Text("Next reminder \(nextReminder.formatted(date: .abbreviated, time: .shortened))").font(.footnote).foregroundStyle(Palette.muted) }
            Button("Send a test reminder in 10 seconds") { Task { testResult = await Reminders.test() } }
            if let testResult { Text(testResult).font(.footnote).foregroundStyle(Palette.muted) }
        } header: {
            Eyebrow(text: "Notifications")
        }
        .task(id: reminders.enabled) {
            try? await Task.sleep(for: .seconds(1))
            let pending = await UNUserNotificationCenter.current().pendingNotificationRequests()
            nextReminder = pending.compactMap { ($0.trigger as? UNCalendarNotificationTrigger)?.nextTriggerDate() }.min()
        }
    }
}

final class NotificationPresenter: NSObject, UNUserNotificationCenterDelegate, Sendable {
    static let shared = NotificationPresenter()

    func userNotificationCenter(_ center: UNUserNotificationCenter, willPresent notification: UNNotification) async -> UNNotificationPresentationOptions {
        [.banner, .list, .sound]
    }

    func userNotificationCenter(_ center: UNUserNotificationCenter, didReceive response: UNNotificationResponse) async {
        guard PushToken.isCheer(response.notification.request.content.userInfo) else { return }
        await MainActor.run { NotificationCenter.default.post(name: .openToday, object: nil) }
    }
}
