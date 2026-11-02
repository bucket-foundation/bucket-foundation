import BucketKit
import SwiftUI

struct TodayHero: View {
    let status: TodayStatus
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

struct TodayWidget: View {
    let symbol: String?
    let branch: String?
    let flags: [String]
    let title: String
    let detail: String
    let left: Int?
    let progress: Double
    let done: Bool
    var dragId = ""
    let open: () -> Void

    var body: some View {
        Button(action: open) {
            VStack(alignment: .leading, spacing: 10) {
                HStack(alignment: .top) {
                    ZStack {
                        Circle().stroke(Palette.rule, lineWidth: 5)
                        Circle().trim(from: 0, to: progress).stroke(D8.malachite, style: StrokeStyle(lineWidth: 5, lineCap: .round)).rotationEffect(.degrees(-90))
                        if done {
                            Image(systemName: "checkmark").font(.subheadline.weight(.heavy)).foregroundStyle(D8.malachite)
                        } else if let left {
                            Text("\(left)").font(.system(size: 15, weight: .heavy, design: .rounded)).foregroundStyle(Palette.ink).monospacedDigit().minimumScaleFactor(0.6).padding(6)
                        } else if let symbol {
                            Image(systemName: symbol).font(.subheadline.weight(.bold)).foregroundStyle(Palette.muted)
                        }
                    }
                    .frame(width: 48, height: 48)
                    Spacer(minLength: 4)
                    if let branch {
                        BranchTile(branch: branch, size: 26)
                    } else {
                        HStack(spacing: 3) { ForEach(flags.prefix(3), id: \.self) { FlagTile(lang: $0, size: 22) } }
                    }
                }
                Text(title).font(.system(size: 16, weight: .heavy, design: .rounded)).foregroundStyle(Palette.ink)
                    .lineLimit(2, reservesSpace: true).multilineTextAlignment(.leading)
                Text(detail).font(.caption.weight(.semibold)).foregroundStyle(Palette.muted).monospacedDigit().lineLimit(1).minimumScaleFactor(0.8)
            }
            .padding(14)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Palette.card, in: .rect(cornerRadius: 22))
            .opacity(done ? 0.7 : 1)
            .contentShape(.dragPreview, .rect(cornerRadius: 22))
            .draggable(dragId)
        }
        .buttonStyle(.plain)
    }
}

struct TodayAddWidget: View {
    let open: () -> Void

    var body: some View {
        Button(action: open) {
            VStack(spacing: 8) {
                Image(systemName: "plus").font(.system(size: 26, weight: .bold))
                Text("Add to Today").font(.subheadline.weight(.bold))
            }
            .foregroundStyle(Palette.muted)
            .frame(maxWidth: .infinity, minHeight: 150)
            .overlay { RoundedRectangle(cornerRadius: 22).strokeBorder(Palette.rule, style: StrokeStyle(lineWidth: 2, dash: [6, 5])) }
        }
        .buttonStyle(.plain)
        .accessibilityIdentifier("today.add")
    }
}

struct TodayPicker: View {
    @Environment(Library.self) private var library
    @Environment(LangStore.self) private var langs
    @Environment(\.dismiss) private var dismiss

    var games: [GameKind] {
        GameKind.allCases.filter { $0 != .letters && ($0 != .wordGroups || langs.wordGroupsPuzzle != nil) }
    }

    var alphabets: [String] { langs.gameLangs.filter { LangScript.alphabetUnit($0) != nil } }

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
                    ForEach(games) { row($0.title, .game($0)) }
                } header: {
                    Eyebrow(text: "Games")
                }
                .listRowBackground(Palette.card)
                Section {
                    row(TodayActivity.listen.title, .activity(.listen))
                    row(TodayActivity.watch.title, .activity(.watch))
                } header: {
                    Eyebrow(text: "Listen and watch")
                }
                .listRowBackground(Palette.card)
                if !alphabets.isEmpty || langs.hasLetterGame {
                    Section {
                        ForEach(alphabets, id: \.self) { l in
                            HStack(spacing: 10) {
                                FlagTile(lang: l, size: 22)
                                row(TodayActivity.alphabet(l).title, .activity(.alphabet(l)))
                            }
                        }
                        if langs.hasLetterGame { row(GameKind.letters.title, .game(.letters)) }
                    } header: {
                        Eyebrow(text: "Drills")
                    }
                    .listRowBackground(Palette.card)
                }
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
    case content(ContentKind)
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
