import BucketKit
import Foundation
import Observation
import SwiftUI
import UserNotifications

@MainActor
func langForecast(_ store: LangStore, at date: Date) -> ReviewForecast {
    let t = date.timeIntervalSince1970 * 1000
    var count = 0
    var best: (due: Double, text: String)?
    for s in store.systems {
        for (id, card) in store.state(s.id).cards.entries {
            guard let due = card.due, due <= t else { continue }
            let p = parseCardId(id)
            guard s.targets.contains(p.lang) else { continue }
            count += 1
            if best == nil || due < best!.due, let w = store.corpus?.byId[p.itemId]?.form(p.lang) { best = (due, w) }
        }
    }
    let streak = store.systems.map { Int(store.state($0.id).streak) }.max() ?? 0
    return ReviewForecast(count: count, example: best?.text, streak: streak)
}

@MainActor
@Observable
final class Reminders {
    static let enabledKey = "reminders.enabled"
    static let customKey = "reminders.customMinute"
    static let studyKey = "reminders.studyMinutes"
    static let lastStudyKey = "reminders.lastStudy"
    static let idPrefix = "review-reminder-"
    static let fallbackMinute = 19 * 60
    static let quietAfterDays = 7

    private let defaults: UserDefaults
    var enabled: Bool { didSet { defaults.set(enabled, forKey: Self.enabledKey) } }
    var customMinute: Int? { didSet { defaults.set(customMinute ?? -1, forKey: Self.customKey) } }
    var denied = false

    init(defaults: UserDefaults = .standard) {
        self.defaults = defaults
        enabled = defaults.bool(forKey: Self.enabledKey)
        let c = defaults.object(forKey: Self.customKey) as? Int ?? -1
        customMinute = c >= 0 ? c : nil
    }

    var studyMinutes: [Int] { defaults.array(forKey: Self.studyKey) as? [Int] ?? [] }

    var usualMinute: Int {
        ReminderPlan.median(studyMinutes, fallback: Self.fallbackMinute)
    }

    var minute: Int { customMinute ?? usualMinute }

    func noteStudy(at date: Date = .now) {
        let c = Calendar.current.dateComponents([.hour, .minute], from: date)
        let m = (c.hour ?? 0) * 60 + (c.minute ?? 0)
        defaults.set(Array((studyMinutes + [m]).suffix(14)), forKey: Self.studyKey)
        defaults.set(date.timeIntervalSince1970, forKey: Self.lastStudyKey)
    }

    var lastStudy: Date? {
        let t = defaults.double(forKey: Self.lastStudyKey)
        return t > 0 ? Date(timeIntervalSince1970: t) : nil
    }

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
        guard enabled else { return }
        for (i, date) in fireDates().enumerated() {
            let f = forecast(date)
            guard f.count > 0 else { continue }
            let content = UNMutableNotificationContent()
            content.title = title
            content.body = ReminderPlan.message(f)
            content.sound = .default
            let comps = Calendar.current.dateComponents([.year, .month, .day, .hour, .minute], from: date)
            try? await center.add(UNNotificationRequest(identifier: Self.idPrefix + String(i), content: content, trigger: UNCalendarNotificationTrigger(dateMatching: comps, repeats: false)))
        }
    }
}

struct ReminderPrompt: View {
    @Environment(Reminders.self) private var reminders

    var body: some View {
        if !reminders.enabled {
            VStack(alignment: .leading, spacing: 6) {
                Text(reminders.denied ? "Notifications are off for this app. Turn them on in Settings to get review reminders." : "Get one nudge a day when reviews are due, at your regular study time.")
                    .font(.subheadline)
                    .foregroundStyle(Palette.muted)
                if !reminders.denied {
                    Button("Remind me when these are due") { Task { _ = await reminders.enable() } }
                        .buttonStyle(.bordered)
                }
            }
        }
    }
}

struct ReminderSettings: View {
    @Environment(Reminders.self) private var reminders

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
            if reminders.denied {
                Text("Notifications are off for this app in Settings.").font(.footnote).foregroundStyle(Palette.muted)
            }
        } header: {
            Eyebrow(text: "Reminders")
        } footer: {
            Text("One reminder a day at most, only when something is due. It stops after a week away.")
        }
    }
}
