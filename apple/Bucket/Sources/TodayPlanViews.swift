import BucketKit
import SwiftUI

struct TodayHero: View {
    let status: TodayStatus
    let done: Int
    let total: Int
    let next: String?
    let start: () -> Void
    let browse: () -> Void

    var color: Color {
        switch status {
        case .atRisk: D8.vermilion
        case .secured, .done: D8.malachite
        default: Color(hex: 0xE9A23B)
        }
    }

    var symbol: String {
        switch status {
        case .empty: "sparkles"
        case .atRisk: "exclamationmark.triangle.fill"
        case .secured: "checkmark.shield.fill"
        case .done: "checkmark.seal.fill"
        default: "flame.fill"
        }
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
            HStack(alignment: .top, spacing: 12) {
                Image(systemName: symbol).font(.system(size: 30)).foregroundStyle(color).frame(width: 38)
                VStack(alignment: .leading, spacing: 4) {
                    Text(title).font(.system(size: 22, weight: .heavy, design: .rounded)).foregroundStyle(Palette.ink)
                    Text(detail).font(.subheadline.weight(.semibold)).foregroundStyle(Palette.muted)
                }
            }
            .accessibilityElement(children: .combine)
            .accessibilityIdentifier("today.status")
            if total > 0 {
                ProgressView(value: Double(done), total: Double(total)).tint(color)
                Text("\(done) of \(total) done").font(.caption.weight(.semibold)).foregroundStyle(Palette.muted).monospacedDigit()
            }
            if let action {
                Button(action) { if case .empty = status { browse() } else { start() } }.buttonStyle(D8Primary())
            }
        }
        .padding(.vertical, 8)
    }
}

struct TodayPlanRow: View {
    let symbol: String
    let title: String
    let detail: String?

    var body: some View {
        HStack(spacing: 14) {
            Image(systemName: symbol).font(.title3).foregroundStyle(D8.parchment).frame(width: 36, height: 36).background(D8.lapis, in: .rect(cornerRadius: 9))
            VStack(alignment: .leading, spacing: 3) {
                Text(title).font(.headline).foregroundStyle(Palette.ink).lineLimit(2)
                if let detail { Text(detail).font(.subheadline).foregroundStyle(Palette.muted).lineLimit(1) }
            }
        }
        .padding(.vertical, 6)
    }
}

struct TodayDoneMark: View {
    let done: Bool
    let toggle: () -> Void

    var body: some View {
        Button(action: toggle) {
            Image(systemName: done ? "checkmark.circle.fill" : "circle").font(.title2).foregroundStyle(done ? D8.malachite : Palette.muted)
        }
        .buttonStyle(.borderless)
        .accessibilityLabel(done ? String(localized: "Not done") : String(localized: "Done for today"))
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
