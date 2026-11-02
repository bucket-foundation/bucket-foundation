import BucketKit
import SwiftUI

struct TodayHero: View {
    let status: TodayStatus
    let streak: Double
    let done: Int
    let total: Int
    let next: String?
    let start: () -> Void
    let browse: () -> Void

    var urgent: Bool {
        if case .atRisk = status { true } else { false }
    }

    func clock(_ t: TimeLeft) -> String {
        t.hours > 0 ? String(localized: "\(t.hours)h \(t.minutes)m left today") : String(localized: "\(t.minutes)m left today")
    }

    var title: String {
        switch status {
        case .empty: String(localized: "Choose what to learn")
        case .start: String(localized: "Start your streak today")
        case .keep(let n, _): String(localized: "Keep your \(n)-day streak")
        case .atRisk(let n, _): String(localized: "Your \(n)-day streak ends at midnight")
        case .secured(let n, _): String(localized: "Day \(n) is safe")
        case .done: String(localized: "Done for today")
        }
    }

    var detail: String {
        switch status {
        case .empty: String(localized: "Add a language or a subject and it becomes your daily list.")
        case .start: String(localized: "One card counts as day 1.")
        case .keep(_, let t): "\(clock(t)). " + String(localized: "One card keeps it.")
        case .atRisk(_, let t): "\(clock(t)). " + String(localized: "One card saves it.")
        case .secured(_, let left): left == 1 ? String(localized: "1 item left on your list.") : String(localized: "\(left) items left on your list.")
        case .done(let n): n > 0 ? String(localized: "Day \(n) is safe. See you tomorrow.") : String(localized: "See you tomorrow.")
        }
    }

    var action: String? {
        switch status {
        case .empty: String(localized: "Build my list")
        case .atRisk: next.map { String(localized: "Save my streak · \($0)") }
        case .done: nil
        default: next.map { String(localized: "Start · \($0)") }
        }
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            StreakGoalCard(streak: streak)
            VStack(alignment: .leading, spacing: 4) {
                Text(title).font(.system(size: 22, weight: .heavy, design: .rounded)).foregroundStyle(urgent ? D8.vermilion : Palette.ink)
                Text(detail).font(.subheadline.weight(.semibold)).foregroundStyle(Palette.muted)
                if total > 0 {
                    Text("\(done) of \(total) done").font(.caption.weight(.semibold)).foregroundStyle(Palette.muted).monospacedDigit()
                }
            }
            .accessibilityElement(children: .combine)
            .accessibilityIdentifier("today.status")
            if let action {
                Button(action) { if case .empty = status { browse() } else { start() } }.buttonStyle(D8Primary())
            }
        }
        .padding(.vertical, 8)
    }
}

struct TodayTaskRow: View {
    let symbol: String?
    let title: String
    let detail: String
    let progress: Double
    let done: Bool

    var body: some View {
        HStack(spacing: 14) {
            ZStack {
                Circle().stroke(Palette.rule, lineWidth: 4)
                Circle().trim(from: 0, to: progress).stroke(D8.malachite, style: StrokeStyle(lineWidth: 4, lineCap: .round)).rotationEffect(.degrees(-90))
                if done {
                    Image(systemName: "checkmark").font(.caption.weight(.heavy)).foregroundStyle(D8.malachite)
                } else if let symbol {
                    Image(systemName: symbol).font(.caption.weight(.bold)).foregroundStyle(Palette.muted)
                }
            }
            .frame(width: 34, height: 34)
            .accessibilityHidden(true)
            VStack(alignment: .leading, spacing: 3) {
                Text(title).font(.headline).foregroundStyle(Palette.ink).lineLimit(1).minimumScaleFactor(0.85)
                Text(detail).font(.subheadline).foregroundStyle(Palette.muted).monospacedDigit().lineLimit(1)
            }
            Spacer(minLength: 0)
            if !done {
                Image(systemName: "play.fill").font(.footnote).foregroundStyle(D8.vermilion)
            }
        }
        .padding(.vertical, 6)
    }
}

struct TodayPicker: View {
    @Environment(Library.self) private var library
    @Environment(LangStore.self) private var langs
    @Environment(\.dismiss) private var dismiss

    func row(_ title: String, _ item: TodayItem) -> some View {
        HStack {
            Text(title).foregroundStyle(Palette.ink)
            Spacer()
            AddToToday(item: item, look: .icon)
        }
    }

    var body: some View {
        NavigationStack {
            List {
                if !langs.systems.isEmpty {
                    Section {
                        ForEach(langs.systems) { row($0.name, .system($0)) }
                    } header: {
                        Eyebrow(text: "Languages")
                    }
                    .listRowBackground(Palette.card)
                }
                Section {
                    ForEach(library.scienceDecks) { row($0.title, .deck($0)) }
                } header: {
                    Eyebrow(text: "Subjects")
                }
                .listRowBackground(Palette.card)
                Section {
                    ForEach(GameKind.allCases) { row($0.title, .game($0)) }
                } header: {
                    Eyebrow(text: "Games")
                }
                .listRowBackground(Palette.card)
                Section {
                    ForEach(ContentCatalog.topics) { row($0.title, .topic($0)) }
                } header: {
                    Eyebrow(text: "Read")
                }
                .listRowBackground(Palette.card)
            }
            .paper()
            .navigationTitle("Add to Today")
            .inlineTitle()
            .toolbar {
                ToolbarItem(placement: .confirmationAction) { Button("Done") { dismiss() } }
            }
        }
    }
}

enum TodayRoute: Hashable {
    case game(GameKind)
    case read(ContentTopic)
    case translate
}

#if DEBUG
enum TodayDemo {
    static var name: String? { Launch.value("-todayDemo") }

    static func status(_ real: TodayStatus, now: Date) -> TodayStatus {
        let left = TimeLeft(until: Calendar.current.startOfDay(for: now).addingTimeInterval(86_400), from: now)
        switch name {
        case "start": return .start
        case "keep": return .keep(streak: 12, left: left)
        case "risk": return .atRisk(streak: 12, left: TimeLeft(until: now.addingTimeInterval(7_500), from: now))
        case "secured": return .secured(streak: 13, itemsLeft: 2)
        case "done": return .done(streak: 13)
        default: return real
        }
    }
}
#endif
