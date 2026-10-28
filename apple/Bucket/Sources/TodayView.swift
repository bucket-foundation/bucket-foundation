import BucketKit
import SwiftUI

struct TodayView: View {
    @Environment(Library.self) private var library
    @Environment(LangStore.self) private var langs
    @Environment(ScienceStore.self) private var science
    @State private var path = NavigationPath()
    @State private var session: StudyLaunch?
    @AppStorage("bucket.today.order") private var order = ""
    @State private var scienceReady = false

    var loaded: Bool {
        #if DEBUG
        if Launch.flag("-holdLoading") { return false }
        #endif
        let indexDone: Bool
        switch library.index {
        case .ready, .failed: indexDone = true
        default: indexDone = false
        }
        return indexDone && scienceReady && (langs.status == .ready || langs.status == .error)
    }

    enum Item: Identifiable {
        case deck(Work)
        case lang(LangSystem)

        var id: String {
            switch self {
            case .deck(let w): "d:\(w.entry.id)"
            case .lang(let s): "l:\(s.id)"
            }
        }
    }

    var items: [Item] {
        let all = langs.systems.map(Item.lang) + work.map(Item.deck)
        let saved = order.split(separator: ",").map(String.init)
        return all.enumerated().sorted { a, b in
            let ia = saved.firstIndex(of: a.element.id) ?? saved.count + a.offset
            let ib = saved.firstIndex(of: b.element.id) ?? saved.count + b.offset
            return ia < ib
        }.map(\.element)
    }

    struct Work {
        let entry: DeckEntry
        let deck: PreparedDeck
        let due: Int
        let new: Int
    }

    var work: [Work] {
        library.scienceDecks.compactMap { entry in
            guard let deck = library.prepared[entry.id], science.state(entry.id).cards.count > 0 else { return nil }
            let r = science.route(deck)
            let due = r.filter { $0.kind == .review }.count
            return Work(entry: entry, deck: deck, due: due, new: r.count - due)
        }
    }

    var langDue: [(system: LangSystem, due: Int)] {
        guard let corpus = langs.corpus else { return [] }
        let now = Date().timeIntervalSince1970 * 1000
        return langs.systems.map { ($0, systemSummary($0, corpus, langs.state($0.id), now: now).due) }
    }

    var streak: Double {
        let now = Date().timeIntervalSince1970 * 1000
        return (library.scienceDecks.map { liveStreak(science.state($0.id), now: now) } + langs.systems.map { liveStreak(langs.state($0.id), now: now) }).max() ?? 0
    }

    func startNext() {
        guard let next = nextUp(Date().timeIntervalSince1970 * 1000) ?? items.first else { return }
        switch next {
        case .deck(let w): session = StudyLaunch(entry: w.entry, deck: w.deck)
        case .lang(let s): path.append(LangRoute.study(s.id))
        }
    }

    func nextUp(_ now: Double) -> Item? {
        items.first { hasWork($0, now) }
    }

    func hasWork(_ item: Item, _ now: Double) -> Bool {
        switch item {
        case .deck(let w): w.due + w.new > 0
        case .lang(let s):
            (langs.corpus.map { systemSummary(s, $0, langs.state(s.id), now: now).due } ?? 0) > 0 || langNewLeft(s, langs.state(s.id), now: now) > 0
        }
    }

    func open(_ item: Item) {
        switch item {
        case .deck(let w): session = StudyLaunch(entry: w.entry, deck: w.deck)
        case .lang(let s): path.append(LangRoute.study(s.id))
        }
    }

    func move(_ item: Item, toTop: Bool) {
        var ids = items.map(\.id).filter { $0 != item.id }
        if toTop { ids.insert(item.id, at: 0) } else { ids.append(item.id) }
        order = ids.joined(separator: ",")
    }

    func reorder(_ shown: [Item], _ from: IndexSet, _ to: Int, pending: Bool) {
        var moved = shown.map(\.id)
        moved.move(fromOffsets: from, toOffset: to)
        let rest = items.map(\.id).filter { !moved.contains($0) }
        order = (pending ? moved + rest : rest + moved).joined(separator: ",")
    }

    @ViewBuilder
    func row(_ item: Item, done: Bool) -> some View {
        Group {
            switch item {
            case .deck(let work):
                Button { open(item) } label: { ReviewDeckRow(entry: work.entry) }
            case .lang(let system):
                Button { open(item) } label: { LangSystemRow(system: system) }
            }
        }
        .opacity(done ? 0.6 : 1)
        .swipeActions(edge: .leading) {
            Button("Study", systemImage: "play.fill") { open(item) }.tint(D8.malachite)
        }
        .swipeActions(edge: .trailing) {
            Button("Bottom", systemImage: "arrow.down.to.line") { move(item, toTop: false) }.tint(D8.lapis)
            Button("Top", systemImage: "arrow.up.to.line") { move(item, toTop: true) }.tint(Palette.ink)
        }
        .contextMenu {
            Button("Study", systemImage: "play.fill") { open(item) }
            Button("Move to top", systemImage: "arrow.up.to.line") { move(item, toTop: true) }
            Button("Move to bottom", systemImage: "arrow.down.to.line") { move(item, toTop: false) }
            if case .lang(let s) = item {
                Button("Settings and placement", systemImage: "slider.horizontal.3") { path.append(LangRoute.system(s.id)) }
            }
        }
    }

    var body: some View {
        let w = work
        let due = w.reduce(0) { $0 + $1.due } + langDue.reduce(0) { $0 + $1.due }
        let now = Date().timeIntervalSince1970 * 1000
        let new = w.reduce(0) { $0 + $1.new } + langs.systems.reduce(0) { $0 + langNewLeft($1, langs.state($1.id), now: now) }
        let today = dayKey(now)
        let done = library.scienceDecks.reduce(0) { t, e in t + science.state(e.id).history[today].map { Int($0.new + $0.reviews) }.orZero }
            + langs.systems.reduce(0) { t, s in t + langs.state(s.id).history[today].map { Int($0.new + $0.reviews) }.orZero }
        NavigationStack(path: $path) {
            Group {
            if !loaded {
                TodaySkeleton()
            } else {
            List {
                Section {
                    VStack(alignment: .leading, spacing: 14) {
                        StreakGoalCard(streak: streak)
                        HStack(spacing: 0) {
                            Tally(n: due, label: "due now", color: D8.vermilion)
                            Tally(n: new, label: "new today", color: D8.lapis)
                            Tally(n: done, label: "done today", color: D8.malachite)
                        }
                        Text(due + new == 0 ? (w.isEmpty && langs.systems.isEmpty ? "Start a deck in Learn or build a language system, and its reviews show up here." : "All caught up. Reviews come back as their intervals run out.") : "Due reviews first, then new cards.")
                            .font(.subheadline)
                            .foregroundStyle(Palette.muted)
                        if loaded, let next = nextUp(now) {
                            switch next {
                            case .deck(let work):
                                Button("Start · \(work.entry.title)") { session = StudyLaunch(entry: work.entry, deck: work.deck) }.buttonStyle(D8Primary())
                            case .lang(let system):
                                Button("Start · \(system.name)") { path.append(LangRoute.study(system.id)) }.buttonStyle(D8Primary())
                            }
                        }
                    }
                    .padding(.vertical, 8)
                }
                .listRowBackground(Palette.card)
                if !langs.systems.isEmpty {
                    Section { TranslateCard() }
                        .listRowBackground(Palette.card)
                }
                if loaded && !items.isEmpty {
                    let pending = items.filter { hasWork($0, now) }
                    let finished = items.filter { !hasWork($0, now) }
                    if !pending.isEmpty {
                        Section {
                            ForEach(pending) { row($0, done: false) }
                                .onMove { reorder(pending, $0, $1, pending: true) }
                                .listRowBackground(Palette.card)
                        } header: {
                            Eyebrow(text: "Your studies")
                        }
                    }
                    if !finished.isEmpty {
                        Section {
                            ForEach(finished) { row($0, done: true) }
                                .onMove { reorder(finished, $0, $1, pending: false) }
                                .listRowBackground(Palette.card)
                        } header: {
                            Eyebrow(text: "Done for today")
                        }
                    }
                }
            }
            #if os(iOS)
            .toolbar { if items.count > 1 { EditButton().tint(Palette.ink) } }
            #endif
            }
            }
            .animation(.easeOut(duration: 0.35), value: loaded)
            .paper()
            .navigationTitle("Today")
            .sheet(item: $session) { StudySession(entry: $0.entry, deck: $0.deck) }
            .langDestinations(path: $path)
            .onChange(of: loaded, initial: true) { _, ready in if ready && StudyRequest.take() { startNext() } }
            .onReceive(NotificationCenter.default.publisher(for: .startStudy)) { _ in if loaded && StudyRequest.take() { startNext() } }
            .task { await langs.load() }
            .task(id: library.scienceDecks.map(\.id)) {
                scienceReady = false
                await science.load(library.scienceDecks.map(\.id))
                for entry in library.scienceDecks { _ = await library.prepared(entry) }
                scienceReady = true
                guard session == nil, let id = Launch.value("-study"), let entry = library.scienceDecks.first(where: { $0.id == id }), let deck = await library.prepared(entry) else { return }
                session = StudyLaunch(entry: entry, deck: deck)
            }
        }
    }
}

struct ReviewDeckRow: View {
    @Environment(Library.self) private var library
    @Environment(ScienceStore.self) private var science
    let entry: DeckEntry

    var body: some View {
        HStack(alignment: .center, spacing: 12) {
            DeckRow(entry: entry, subtitle: detail)
            Spacer(minLength: 0)
            if let c = counts { CountPills(due: c.due, new: c.new) }
        }
        .task { _ = await library.prepared(entry) }
    }

    var counts: (due: Int, new: Int, streak: Double)? {
        guard let deck = library.prepared[entry.id] else { return nil }
        let r = science.route(deck)
        let due = r.filter { $0.kind == .review }.count
        return (due, r.count - due, liveStreak(science.state(entry.id), now: Date().timeIntervalSince1970 * 1000))
    }

    var detail: String? {
        guard let c = counts else { return entry.sub }
        if c.due == 0 && c.new == 0 { return "Nothing due today" }
        var parts = ["\(c.due) due", "\(c.new) new"]
        if c.streak > 0 { parts.append("\(streakText(c.streak)) streak") }
        return parts.joined(separator: " · ")
    }
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
    let streak = ReminderPlan.streak(langs.systems.map { langs.state($0.id) } + library.scienceDecks.map { science.state($0.id) }, at: date)
    return ReminderPlan.forecast(due: due, at: date, streak: streak)
}

struct Tally: View {
    let n: Int
    let label: String
    let color: Color

    var body: some View {
        VStack(spacing: 2) {
            Text("\(n)").font(.system(size: 34, weight: .bold, design: .rounded)).foregroundStyle(n > 0 ? color : Palette.muted).monospacedDigit()
            Text(label).font(.caption.weight(.semibold)).foregroundStyle(Palette.muted)
        }
        .frame(maxWidth: .infinity)
        .accessibilityElement(children: .combine)
    }
}

extension Optional where Wrapped == Int {
    var orZero: Int { self ?? 0 }
}

struct Shimmer: ViewModifier {
    @Environment(\.accessibilityReduceMotion) private var still
    @Environment(\.colorScheme) private var scheme
    @State private var phase: CGFloat = -1

    func body(content: Content) -> some View {
        content
            .overlay {
                if !still {
                    GeometryReader { g in
                        LinearGradient(colors: [.clear, .white.opacity(scheme == .dark ? 0.08 : 0.35), .clear], startPoint: .leading, endPoint: .trailing)
                            .frame(width: g.size.width * 0.6)
                            .offset(x: phase * g.size.width * 1.6)
                    }
                    .mask(content)
                    .allowsHitTesting(false)
                }
            }
            .onAppear {
                withAnimation(.linear(duration: 1.3).repeatForever(autoreverses: false)) { phase = 1 }
            }
    }
}

struct TodaySkeleton: View {
    var body: some View {
        let block = Palette.rule.opacity(0.7)
        ScrollView {
            VStack(alignment: .leading, spacing: 22) {
                VStack(alignment: .leading, spacing: 16) {
                    RoundedRectangle(cornerRadius: 5).fill(block).frame(width: 90, height: 12)
                    HStack(spacing: 0) {
                        ForEach(0..<3, id: \.self) { _ in
                            VStack(spacing: 8) {
                                RoundedRectangle(cornerRadius: 8).fill(block).frame(width: 40, height: 34)
                                RoundedRectangle(cornerRadius: 4).fill(block).frame(width: 58, height: 10)
                            }
                            .frame(maxWidth: .infinity)
                        }
                    }
                    RoundedRectangle(cornerRadius: 5).fill(block).frame(height: 12).padding(.trailing, 60)
                    RoundedRectangle(cornerRadius: 12).fill(D8.vermilion.opacity(0.25)).frame(height: 50)
                }
                .padding(18)
                .background(Palette.card, in: .rect(cornerRadius: 22))
                RoundedRectangle(cornerRadius: 4).fill(block).frame(width: 100, height: 10).padding(.leading, 18)
                VStack(spacing: 0) {
                    ForEach(0..<3, id: \.self) { i in
                        HStack(spacing: 12) {
                            RoundedRectangle(cornerRadius: 8).fill(block).frame(width: 36, height: 36)
                            VStack(alignment: .leading, spacing: 7) {
                                RoundedRectangle(cornerRadius: 5).fill(block).frame(width: 150, height: 13)
                                RoundedRectangle(cornerRadius: 4).fill(block).frame(width: 110, height: 10)
                            }
                            Spacer()
                            Capsule().fill(block).frame(width: 56, height: 24)
                        }
                        .padding(.vertical, 14)
                        if i < 2 { Divider().overlay(Palette.rule) }
                    }
                }
                .padding(.horizontal, 18)
                .background(Palette.card, in: .rect(cornerRadius: 22))
            }
            .padding(.horizontal, 16)
            .padding(.top, 8)
            .modifier(Shimmer())
        }
        .scrollDisabled(true)
        .accessibilityElement()
        .accessibilityLabel("Loading your reviews")
    }
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
