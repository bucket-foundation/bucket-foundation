import BucketKit
import SwiftUI

struct SubjectsSection: View {
    @Environment(Library.self) private var library
    let open: (DeckEntry) -> Void
    let search: () -> Void

    var body: some View {
        Section {
            switch library.index {
            case .idle, .loading:
                ProgressView("Opening the canon").frame(maxWidth: .infinity)
            case .failed(let message):
                Text(message).foregroundStyle(Palette.muted)
                Button("Retry") { Task { await library.retryIndex() } }
            case .ready:
                LazyVGrid(columns: learnColumns, spacing: 14) {
                    LearnTile(title: String(localized: "Search the canon"), detail: String(localized: "Every idea across seven branches."), face: Palette.ink, open: search) {
                        LearnSymbol(name: "text.magnifyingglass")
                    }
                    ForEach(library.scienceDecks) { entry in
                        LearnTile(title: entry.title, detail: entry.sub ?? "", face: BranchTile.face(entry.id), item: .deck(entry), open: { open(entry) }) {
                            Text(BranchTile.glyph(entry.id)).font(.system(size: 26, weight: .bold, design: .serif)).foregroundStyle(D8.parchment)
                        }
                    }
                }
                .listRowInsets(EdgeInsets(top: 4, leading: 0, bottom: 4, trailing: 0))
                .listRowSeparator(.hidden)
            }
        } header: {
            LearnGroupTitle(text: "Subjects")
        }
        .id("subjects")
        .listRowBackground(Color.clear)
    }
}

struct DeckRow: View {
    let entry: DeckEntry
    var subtitle: String?

    var body: some View {
        HStack(spacing: 14) {
            BranchTile(branch: entry.id, size: 36)
            VStack(alignment: .leading, spacing: 3) {
                Text(entry.title).font(.headline).foregroundStyle(Palette.ink)
                if let sub = subtitle ?? entry.sub {
                    Text(sub).font(.subheadline).foregroundStyle(Palette.muted).lineLimit(2)
                }
            }
        }
        .padding(.vertical, 6)
    }
}

struct DeckView: View {
    @Environment(Library.self) private var library
    @Environment(ScienceStore.self) private var science
    let entry: DeckEntry
    @State private var deck: PreparedDeck?
    @State private var studying: StudyLaunch?

    static let shells = [("prereq", "Prerequisites", "The base everything rests on"), ("nucleus", "Nucleus", "The small set that opens the most"), ("frontier", "Frontier", "Where the branch is still moving")]

    var body: some View {
        Group {
            if let deck {
                let state = science.state(deck.branch)
                let today = science.route(deck)
                List {
                    Section {
                        DeckStats(summary: science.summary(deck))
                        Button {
                            studying = StudyLaunch(entry: entry, deck: deck)
                        } label: {
                            Label(today.isEmpty ? String(localized: "Study") : String(localized: "Study today (\(today.count))"), systemImage: "play.fill").font(.headline)
                        }
                    }
                    .listRowBackground(Palette.card)
                    Section {
                        if today.isEmpty {
                            Text("Nothing due. Every card is scheduled ahead and today's new atoms are done.")
                                .font(.subheadline).foregroundStyle(Palette.muted)
                        }
                        ForEach(today, id: \.id) { item in
                            if let atom = deck.byId[item.id] {
                                NavigationLink(value: AtomRoute(deck: entry, atom: atom)) {
                                    HStack {
                                        Text(LessonText.inline(atom.title)).font(.serif(.body)).foregroundStyle(Palette.ink)
                                        Spacer()
                                        Text(item.kind == .review ? String(localized: "REVIEW") : String(localized: "NEW")).font(.caption2.weight(.semibold)).tracking(1.2).foregroundStyle(Palette.muted)
                                    }
                                }
                            }
                        }
                    } header: {
                        Eyebrow(text: "Today's route")
                    }
                    .listRowBackground(Palette.card)
                    ForEach(Self.shells, id: \.0) { key, label, hint in
                        let atoms = deck.atoms.filter { ($0.shell ?? "nucleus") == key }
                        if !atoms.isEmpty {
                            Section {
                                ForEach(atoms) { atom in atomRow(atom, state) }
                            } header: {
                                Eyebrow(text: label)
                            } footer: {
                                Text(hint).font(.footnote).foregroundStyle(Palette.muted)
                            }
                            .listRowBackground(Palette.card)
                        }
                    }
                }
            } else if let error = library.deckErrors[entry.id] {
                StateMessage(title: "This deck did not load", detail: error) { Task { deck = await library.prepared(entry) } }
            } else {
                ProgressView()
            }
        }
        .paper()
        .navigationTitle(entry.title)
        .toolbar {
            ToolbarItem(placement: .primaryAction) { AddToToday(item: .deck(entry), look: .icon) }
            ToolbarItem(placement: .primaryAction) { ScreenShareButton() }
        }
        .shareObjects([.content(ShareMoment(title: entry.title, source: entry.sub ?? entry.title, branch: entry.id, deck: entry.id))])
        .task {
            deck = await library.prepared(entry)
            await science.load(library.scienceDecks.map(\.id))
        }
        .sheet(item: $studying) { StudySession(entry: $0.entry, deck: $0.deck) }
    }

    func atomRow(_ atom: Atom, _ state: EngineState) -> some View {
        let started = state.cards.has(atom.id)
        let open = started || atom.requires.allSatisfy { state.cards.has($0) }
        return NavigationLink(value: AtomRoute(deck: entry, atom: atom)) {
            HStack(spacing: 10) {
                VStack(alignment: .leading, spacing: 3) {
                    Text(LessonText.inline(atom.title)).font(.serif(.body, weight: .medium)).foregroundStyle(open ? Palette.ink : Palette.muted)
                    if !open {
                        Text("Prerequisites: \(atom.requires.count)").font(.caption).foregroundStyle(Palette.muted)
                    } else if !atom.summary.isEmpty {
                        Text(LessonText.inline(atom.summary)).font(.footnote).foregroundStyle(Palette.muted).lineLimit(2)
                    }
                }
                Spacer(minLength: 0)
                if started { MasteryBar(value: masteryFor(state, atom.id)) }
            }
            .padding(.vertical, 4)
        }
    }
}

struct AtomView: View {
    @Environment(Library.self) private var library
    let route: AtomRoute
    @State private var depth = "core"
    @State private var practicing = false

    var atom: Atom { route.atom }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 18) {
                if let type = atom.type { Eyebrow(text: type) }
                Text(LessonText.inline(atom.title)).font(.serif(.largeTitle, weight: .semibold)).foregroundStyle(Palette.ink)
                Text(LessonText.inline(atom.summary)).font(.serif(.title3)).foregroundStyle(Palette.ink.opacity(0.85))
                if let eq = atom.equation, !eq.isEmpty { EquationView(tex: eq) }
                if !atom.orderedDepths.isEmpty {
                    Picker("Depth", selection: $depth) {
                        ForEach(atom.orderedDepths, id: \.key) { d in Text(Self.depthName(d.key)).tag(d.key) }
                    }
                    .pickerStyle(.segmented)
                    Text(LessonText.inline(atom.depths[depth] ?? "")).font(.serif(.body)).foregroundStyle(Palette.ink).lineSpacing(5)
                        .textSelection(.enabled)
                }
                if let lesson = atom.lesson, !lesson.isEmpty {
                    Divider().overlay(Palette.rule)
                    Eyebrow(text: "Lesson")
                    LessonText(markdown: lesson)
                }
                if !atom.quiz.isEmpty {
                    Button {
                        practicing = true
                    } label: {
                        Label("Test yourself", systemImage: "checkmark.circle").frame(maxWidth: .infinity)
                    }
                    .buttonStyle(D8Primary())
                    .controlSize(.large)
                }
            }
            .padding(20)
            .frame(maxWidth: 720, alignment: .leading)
            .frame(maxWidth: .infinity)
        }
        .paper()
        .inlineTitle()
        .toolbar { ToolbarItem(placement: .primaryAction) { ScreenShareButton() } }
        .shareObjects([.content(ShareMoment(title: atom.title, source: route.deck.title, branch: route.deck.id, quote: atom.summary, deck: route.deck.id, atom: atom.id))])
        .sheet(isPresented: $practicing) {
            if let deck = library.prepared[route.deck.id] { AtomDrillSheet(deck: deck, atom: deck.byId[atom.id] ?? atom) }
        }
        .task { _ = await library.prepared(route.deck) }
    }

    static func depthName(_ key: String) -> String {
        switch key {
        case "eli5": "Simple"
        case "core": "Core"
        case "deep": "Deep"
        default: key.capitalized
        }
    }
}

struct LessonText: View {
    let markdown: String

    enum Block: Hashable {
        case heading(String), equation(String), text(String), bullet(String), numbered(String, String), quote(String)
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            ForEach(Array(blocks.enumerated()), id: \.offset) { _, b in
                switch b {
                case .heading(let t):
                    Text(t).font(.serif(.title3, weight: .semibold)).foregroundStyle(Palette.ink)
                case .equation(let t):
                    EquationView(tex: t)
                case .text(let t):
                    Text(Self.inline(t)).accessibilityLabel(Self.spoken(t)).font(.serif(.body)).foregroundStyle(Palette.ink).lineSpacing(5)
                case .bullet(let t):
                    HStack(alignment: .firstTextBaseline, spacing: 8) {
                        Text("•").foregroundStyle(Palette.muted)
                        Text(Self.inline(t)).accessibilityLabel(Self.spoken(t)).font(.serif(.body)).foregroundStyle(Palette.ink).lineSpacing(4)
                    }
                case .numbered(let n, let t):
                    HStack(alignment: .firstTextBaseline, spacing: 8) {
                        Text(n).font(.serif(.body, weight: .semibold)).foregroundStyle(Palette.muted).monospacedDigit()
                        Text(Self.inline(t)).accessibilityLabel(Self.spoken(t)).font(.serif(.body)).foregroundStyle(Palette.ink).lineSpacing(4)
                    }
                case .quote(let t):
                    Text(Self.inline(t)).accessibilityLabel(Self.spoken(t)).font(.serif(.body).italic()).foregroundStyle(Palette.ink.opacity(0.8)).lineSpacing(4)
                        .padding(.leading, 12)
                        .overlay(alignment: .leading) { Rectangle().fill(Palette.rule).frame(width: 3) }
                }
            }
        }
        .textSelection(.enabled)
    }

    var blocks: [Block] { Self.parse(markdown) }

    static func parse(_ markdown: String) -> [Block] {
        var out: [Block] = []
        for para in markdown.components(separatedBy: "\n\n") {
            let p = para.trimmingCharacters(in: .whitespacesAndNewlines)
            guard !p.isEmpty else { continue }
            var body = p
            if p.hasPrefix("#") {
                let first = p.prefix { $0 != "\n" }
                out.append(.heading(first.drop { $0 == "#" }.trimmingCharacters(in: .whitespaces)))
                body = String(p.dropFirst(first.count)).trimmingCharacters(in: .whitespacesAndNewlines)
                if body.isEmpty { continue }
            }
            let parts = body.components(separatedBy: "$$")
            for (i, part) in parts.enumerated() {
                let t = part.trimmingCharacters(in: .whitespacesAndNewlines)
                guard !t.isEmpty else { continue }
                if !i.isMultiple(of: 2) && parts.count >= 3 {
                    out.append(.equation(t))
                } else {
                    out.append(contentsOf: lines(t))
                }
            }
        }
        return out
    }

    static func lines(_ t: String) -> [Block] {
        var out: [Block] = []
        var prose: [String] = []
        func flush() {
            if !prose.isEmpty { out.append(.text(prose.joined(separator: " "))) }
            prose = []
        }
        for raw in t.components(separatedBy: "\n") {
            let line = raw.trimmingCharacters(in: .whitespaces)
            if line.hasPrefix("- ") || line.hasPrefix("* ") {
                flush()
                out.append(.bullet(String(line.dropFirst(2))))
            } else if let dot = line.firstIndex(of: "."), line[..<dot].allSatisfy(\.isNumber), !line[..<dot].isEmpty, line[line.index(after: dot)...].hasPrefix(" ") {
                flush()
                out.append(.numbered(String(line[...dot]), String(line[line.index(dot, offsetBy: 2)...])))
            } else if line.hasPrefix(">") {
                flush()
                out.append(.quote(line.drop { $0 == ">" || $0 == " " }.description))
            } else if !line.isEmpty {
                prose.append(line)
            }
        }
        flush()
        return out
    }

    static func inline(_ p: String) -> AttributedString { TeXLite.attributed(p) }

    static func spoken(_ p: String) -> Text { Text(TeXLite.spokenProse(p)) }
}

struct ScienceSubjects: Subjects {
    let library: Library
    let science: ScienceStore

    var decks: [DeckEntry] { library.scienceDecks }

    var indexDone: Bool {
        switch library.index {
        case .ready, .failed: true
        default: false
        }
    }

    func work(_ entry: DeckEntry) -> TodayView.Work? {
        guard let deck = library.prepared[entry.id] else { return nil }
        let r = science.route(deck)
        let due = r.filter { $0.kind == .review }.count
        return TodayView.Work(entry: entry, deck: deck, due: due, new: r.count - due)
    }

    func state(_ id: String) -> EngineState { science.state(id) }

    func masteredPercent(_ deck: PreparedDeck) -> Int {
        let s = science.summary(deck)
        return s.total > 0 ? Int(Double(s.mastered) / Double(s.total) * 100) : 0
    }

    func load() async {
        await science.load(library.scienceDecks.map(\.id))
        for entry in library.scienceDecks { _ = await library.prepared(entry) }
    }

    func prepared(_ entry: DeckEntry) async -> PreparedDeck? { await library.prepared(entry) }

    func study(_ launch: StudyLaunch) -> AnyView { AnyView(StudySession(entry: launch.entry, deck: launch.deck)) }

    func section(open: @escaping (DeckEntry) -> Void, search: @escaping () -> Void) -> AnyView { AnyView(SubjectsSection(open: open, search: search)) }

    func deck(_ entry: DeckEntry) -> AnyView { AnyView(DeckView(entry: entry)) }

    func atom(_ route: AtomRoute) -> AnyView { AnyView(AtomView(route: route)) }

    func canon() -> AnyView { AnyView(CanonView()) }
}

@MainActor
func bucketForecast(_ library: Library, _ science: ScienceStore, _ langs: LangStore, at date: Date) -> ReviewForecast {
    var due = langDue(langs)
    for entry in library.scienceDecks {
        for (id, card) in science.state(entry.id).cards.entries {
            guard let d = card.due else { continue }
            due.append((d, library.prepared[entry.id]?.byId[id]?.title))
        }
    }
    let states = langs.systems.map { langs.state($0.id) } + library.scienceDecks.map { science.state($0.id) }
    return ReminderPlan.forecast(due: due, at: date, streak: ReminderPlan.streak(states, at: date), studiedToday: ReminderPlan.studied(states, at: date))
}

@MainActor
func scienceWidgetExtra(_ library: Library, _ science: ScienceStore, now: Date = .now) -> WidgetExtra {
    var extra = WidgetExtra()
    let tomorrow = (Calendar.current.date(byAdding: .day, value: 1, to: Calendar.current.startOfDay(for: now)) ?? now).timeIntervalSince1970 * 1000 + 3_600_000
    for entry in library.scienceDecks {
        guard let deck = library.prepared[entry.id] else { continue }
        let state = science.state(entry.id)
        guard state.cards.count > 0 else { continue }
        let r = science.route(deck)
        let due = r.filter { $0.kind == .review }.count
        extra.dueNow += due
        extra.newToday += r.count - due
        extra.newTomorrow += route(state, deck.atoms, now: tomorrow).filter { $0.kind != .review }.count
        extra.dueLater += state.cards.entries.compactMap { $0.value.due }
        extra.states.append(state)
    }
    return extra
}
