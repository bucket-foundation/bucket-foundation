import BucketKit
import SwiftUI

struct TodayHero: View {
    let status: TodayStatus
    let done: Int
    let total: Int
    let next: String?
    var languagesOnly = false
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
        case .empty: languagesOnly ? String(localized: "Add a language and it becomes your daily list.") : String(localized: "Add a language or a subject and it becomes your daily list.")
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

struct TileLook: Equatable {
    var face: Color?
    var lip: Color?

    static let plain = TileLook()
    static func vivid(_ face: Color, _ lip: Color? = nil) -> TileLook { TileLook(face: face, lip: lip ?? face.mix(with: .black, by: 0.3)) }
}

enum TodayLooks {
    static func game(_ g: GameKind) -> TileLook { .vivid(g.color, g.lip) }
    static let listen = TileLook.vivid(D8.vermilion, D8.vermilionLip)
    static let watch = TileLook.vivid(D8.lapis, Color(hex: 0x12326A))
    static let alphabet = TileLook.vivid(D8.malachite, D8.malachiteLip)
    static func branch(_ b: String) -> TileLook { .vivid(BranchTile.face(b)) }

    static func lang(_ targets: [String]) -> TileLook {
        for l in targets {
            let flag = D8Flag.of(l)
            let colors = flag.bands.sorted { $0.weight > $1.weight }.map(\.color) + [flag.canton?.color, flag.cross, flag.hoist].compactMap { $0 }
            if let c = colors.first(where: { deep($0) }) { return .vivid(Color(hex: c)) }
        }
        return .vivid(D8.lapis, Color(hex: 0x12326A))
    }

    static func deep(_ c: UInt32) -> Bool {
        let r = Double((c >> 16) & 0xFF), g = Double((c >> 8) & 0xFF), b = Double(c & 0xFF)
        return (0.299 * r + 0.587 * g + 0.114 * b) / 255 < 0.62
    }
}

struct TodayTileSkin: ViewModifier {
    let look: TileLook
    var done = false
    var radius: CGFloat = 18

    func body(content: Content) -> some View {
        if done {
            content
                .background(Palette.card, in: .rect(cornerRadius: radius))
                .overlay { RoundedRectangle(cornerRadius: radius).strokeBorder(Palette.rule, lineWidth: 1) }
                .padding(.bottom, 5)
        } else if let face = look.face {
            content.modifier(GameLip(face: face, lip: look.lip ?? face, radius: radius))
        } else {
            content
                .background(D8.face, in: .rect(cornerRadius: radius))
                .overlay { RoundedRectangle(cornerRadius: radius).strokeBorder(D8.edge, lineWidth: 2) }
                .background(D8.edge, in: .rect(cornerRadius: radius).offset(y: 5))
                .padding(.bottom, 5)
        }
    }
}

struct TodayWidgetFace: View {
    let symbol: String?
    let branch: String?
    let flags: [String]
    let title: String
    let detail: String
    let left: Int?
    let progress: Double
    let done: Bool
    var look = TileLook.plain
    var badgeRoom: CGFloat = 0

    var vivid: Bool { look.face != nil && !done }
    var ink: Color { vivid ? D8.parchment : Palette.ink }
    var soft: Color { vivid ? D8.parchment.opacity(0.85) : Palette.muted }

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(alignment: .top) {
                ZStack {
                    Circle().stroke(vivid ? D8.parchment.opacity(0.3) : Palette.rule, lineWidth: 5)
                    Circle().trim(from: 0, to: progress).stroke(vivid ? D8.parchment : D8.malachite, style: StrokeStyle(lineWidth: 5, lineCap: .round)).rotationEffect(.degrees(-90))
                    if done {
                        PLGlyphView(.check, size: 16).foregroundStyle(PL.malachite)
                    } else if let left {
                        Text("\(left)").font(.system(size: 15, weight: .heavy, design: .rounded)).foregroundStyle(ink).monospacedDigit().minimumScaleFactor(0.6).padding(6)
                    } else if let symbol {
                        Image(systemName: symbol).font(.subheadline.weight(.bold)).foregroundStyle(ink)
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
            Text(title).font(.system(size: 17, weight: .heavy, design: .rounded)).foregroundStyle(ink)
                .lineLimit(2, reservesSpace: true).multilineTextAlignment(.leading)
            Text(detail).font(.caption.weight(.semibold)).foregroundStyle(soft).monospacedDigit().lineLimit(1).minimumScaleFactor(0.8).padding(.trailing, badgeRoom)
        }
        .padding(14)
        .frame(maxWidth: .infinity, alignment: .leading)
        .modifier(TodayTileSkin(look: look, done: done))
        .opacity(done ? 0.8 : 1)
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
    var look = TileLook.plain
    var dragId = ""
    let open: () -> Void

    var body: some View {
        Button(action: open) {
            TodayWidgetFace(symbol: symbol, branch: branch, flags: flags, title: title, detail: detail, left: left, progress: progress, done: done, look: look)
                .contentShape(.dragPreview, .rect(cornerRadius: 18))
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
                PLGlyphView(.plus, size: 26)
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

struct PickEntry: Identifiable {
    let item: TodayItem
    let title: String
    var symbol: String?
    var branch: String?
    var flags: [String] = []
    var look = TileLook.plain
    let detail: String

    var id: String { item.id }
}

struct PickSection: Identifiable {
    let title: String
    let entries: [PickEntry]
    var id: String { title }
}

struct TodayPickTile: View {
    let entry: PickEntry

    var body: some View {
        let plan = TodayPlanStore.shared
        let on = plan.contains(entry.item.id)
        Button {
            if on { plan.remove(entry.item.id) } else { plan.add(entry.item) }
            tap()
        } label: {
            TodayWidgetFace(symbol: entry.symbol, branch: entry.branch, flags: entry.flags, title: entry.title, detail: entry.detail, left: nil, progress: 0, done: false, look: entry.look, badgeRoom: 26)
                .overlay(alignment: .bottomTrailing) {
                    PLGlyphView(on ? .check : .plus, size: 14)
                        .foregroundStyle(PL.paper)
                        .frame(width: 26, height: 26)
                        .background(on ? PL.malachite : PL.inkDim, in: .circle)
                        .padding(10)
                        .padding(.bottom, 5)
                }
                .overlay {
                    if on { RoundedRectangle(cornerRadius: 18).strokeBorder(D8.malachite, lineWidth: 3).padding(.bottom, 5) }
                }
        }
        .buttonStyle(.plain)
        .accessibilityLabel(Text("\(entry.title), \(on ? String(localized: "On Today") : String(localized: "Add to Today"))"))
        .accessibilityAddTraits(on ? .isSelected : [])
        .accessibilityIdentifier("addToToday.\(entry.item.id)")
    }
}

struct TodayPicker: View {
    @Environment(LangStore.self) private var langs
    let subjects: [DeckEntry]?
    @Environment(\.dismiss) private var dismiss
    @AppStorage("today.picker.widgets") private var widgets = true

    var games: [GameKind] {
        GameKind.allCases.filter { $0 != .letters && ($0 != .wordGroups || langs.wordGroupsPuzzle != nil) }
    }

    var alphabets: [String] { langs.gameLangs.filter { LangScript.alphabetUnit($0) != nil } }

    var sections: [PickSection] {
        let study = String(localized: "Review and new cards")
        var out: [PickSection] = []
        if !langs.systems.isEmpty {
            out.append(PickSection(title: "Languages", entries: langs.systems.map { PickEntry(item: .system($0), title: $0.title, symbol: "character.bubble", flags: $0.targets, look: TodayLooks.lang($0.targets), detail: study) }))
        }
        if let subjects {
            out.append(PickSection(title: "Subjects", entries: subjects.map { PickEntry(item: .deck($0), title: $0.title, symbol: "rectangle.stack", branch: $0.id, look: TodayLooks.branch($0.id), detail: study) }))
        }
        out.append(PickSection(title: "Games", entries: games.map { PickEntry(item: .game($0), title: $0.title, symbol: $0.symbol, look: TodayLooks.game($0), detail: String(localized: "Play one round")) }))
        out.append(PickSection(title: "Listen and watch", entries: [
            PickEntry(item: .activity(.listen), title: TodayActivity.listen.title, symbol: "dot.radiowaves.left.and.right", look: TodayLooks.listen, detail: String(localized: "Listen for 2 minutes")),
            PickEntry(item: .activity(.watch), title: TodayActivity.watch.title, symbol: "play.rectangle", look: TodayLooks.watch, detail: String(localized: "Watch for 1 minute")),
        ]))
        var drills = alphabets.map { PickEntry(item: .activity(.alphabet($0)), title: TodayActivity.alphabet($0).title, symbol: "character.book.closed", flags: [$0], look: TodayLooks.alphabet, detail: String(localized: "Finish one round")) }
        if langs.hasLetterGame { drills.append(PickEntry(item: .game(.letters), title: GameKind.letters.title, symbol: GameKind.letters.symbol, look: TodayLooks.game(.letters), detail: String(localized: "Play one round"))) }
        if !drills.isEmpty { out.append(PickSection(title: "Drills", entries: drills)) }
        out.append(PickSection(title: "Read", entries: ContentCatalog.topics.map { PickEntry(item: .topic($0), title: $0.title, symbol: "book", look: TodayLooks.branch($0.branch), detail: String(localized: "Read for 30 seconds")) }))
        return out
    }

    func row(_ entry: PickEntry) -> some View {
        HStack(spacing: 10) {
            if let first = entry.flags.first, entry.item.kind != .system { FlagTile(lang: first, size: 22) }
            Text(entry.title).foregroundStyle(Palette.ink)
            Spacer()
            AddToToday(item: entry.item, look: .icon)
        }
    }

    var grid: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 18) {
                ForEach(sections) { section in
                    VStack(alignment: .leading, spacing: 10) {
                        Eyebrow(text: section.title).padding(.leading, 4)
                        LazyVGrid(columns: [GridItem(.adaptive(minimum: 150), spacing: 12)], spacing: 12) {
                            ForEach(section.entries) { TodayPickTile(entry: $0) }
                        }
                    }
                }
            }
            .padding(16)
        }
    }

    var list: some View {
        List {
            ForEach(sections) { section in
                Section {
                    ForEach(section.entries) { row($0) }
                } header: {
                    Eyebrow(text: section.title)
                }
                .listRowBackground(Palette.card)
            }
        }
    }

    var body: some View {
        NavigationStack {
            Group {
                if widgets { grid } else { list }
            }
            .paper()
            .navigationTitle("Add to Today")
            .inlineTitle()
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Picker(selection: $widgets) {
                        Label("Widgets", systemImage: "square.grid.2x2").tag(true)
                        Label("List", systemImage: "list.bullet").tag(false)
                    } label: {
                        Text("Layout")
                    }
                    .pickerStyle(.segmented)
                    .labelStyle(.iconOnly)
                    .frame(width: 96)
                    .accessibilityIdentifier("today.pickerLook")
                }
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
