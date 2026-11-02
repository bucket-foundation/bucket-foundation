import BucketKit
import SwiftUI

struct TodayView: View {
    @Environment(Library.self) private var library
    @Environment(LangStore.self) private var langs
    @Environment(ScienceStore.self) private var science
    @Environment(Reminders.self) private var reminders
    @Environment(Account.self) private var account
    @Environment(\.scenePhase) private var phase
    @State private var path = NavigationPath()
    @State private var session: StudyLaunch?
    @State private var picking = false
    @AppStorage("bucket.today.order") private var order = ""
    @State private var scienceReady = false
    private let plan = TodayPlanStore.shared

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
        case game(GameKind)
        case read(ContentTopic)

        var id: String {
            switch self {
            case .deck(let w): TodayItem.deck(w.entry).id
            case .lang(let s): TodayItem.system(s).id
            case .game(let g): TodayItem.game(g).id
            case .read(let t): TodayItem.topic(t).id
            }
        }

        var title: String {
            switch self {
            case .deck(let w): w.entry.title
            case .lang(let s): s.name
            case .game(let g): g.title
            case .read(let t): t.title
            }
        }

        var legacyId: String {
            switch self {
            case .deck(let w): "d:\(w.entry.id)"
            case .lang(let s): "l:\(s.id)"
            default: id
            }
        }
    }

    struct Work {
        let entry: DeckEntry
        let deck: PreparedDeck
        let due: Int
        let new: Int
    }

    func work(_ entry: DeckEntry) -> Work? {
        guard let deck = library.prepared[entry.id] else { return nil }
        let r = science.route(deck)
        let due = r.filter { $0.kind == .review }.count
        return Work(entry: entry, deck: deck, due: due, new: r.count - due)
    }

    var startedWork: [Work] {
        library.scienceDecks.filter { science.state($0.id).cards.count > 0 }.compactMap(work)
    }

    var defaultItems: [TodayItem] {
        let saved = order.split(separator: ",").map(String.init)
        let own = (langs.systems.map(Item.lang) + startedWork.map(Item.deck)).enumerated().sorted { a, b in
            let ia = saved.firstIndex(of: a.element.legacyId) ?? saved.count + a.offset
            let ib = saved.firstIndex(of: b.element.legacyId) ?? saved.count + b.offset
            return ia < ib
        }.compactMap { todayItem($0.element) }
        return TodayPlan.defaults(systems: own, decks: [], starter: library.scienceDecks.prefix(1).map(TodayItem.deck))
    }

    func todayItem(_ item: Item) -> TodayItem? {
        switch item {
        case .deck(let w): .deck(w.entry)
        case .lang(let s): .system(s)
        case .game(let g): .game(g)
        case .read(let t): .topic(t)
        }
    }

    func resolve(_ item: TodayItem) -> Item? {
        switch item.kind {
        case .system: langs.systems.first { $0.id == item.ref }.map(Item.lang)
        case .deck: library.scienceDecks.first { $0.id == item.ref }.flatMap(work).map(Item.deck)
        case .game: GameKind(rawValue: item.ref).map(Item.game)
        case .content: ContentCatalog.topics.first { $0.title == item.ref }.map(Item.read)
        }
    }

    var items: [Item] { plan.plan.items.compactMap(resolve) }

    var fallback: [Item] {
        (langs.systems.map(Item.lang) + startedWork.map(Item.deck)).filter { hasWork($0, Date().timeIntervalSince1970 * 1000) }
    }

    var langDue: [(system: LangSystem, due: Int)] {
        guard let corpus = langs.corpus else { return [] }
        let now = Date().timeIntervalSince1970 * 1000
        return items.compactMap { item in
            guard case .lang(let s) = item else { return nil }
            return (s, systemSummary(s, corpus, langs.state(s.id), now: now).due)
        }
    }

    var streak: Double {
        let now = Date().timeIntervalSince1970 * 1000
        return (library.scienceDecks.map { liveStreak(science.state($0.id), now: now) } + langs.systems.map { liveStreak(langs.state($0.id), now: now) }).max() ?? 0
    }

    func startNext() {
        guard let next = nextUp(Date().timeIntervalSince1970 * 1000) ?? items.first else { return }
        open(next)
    }

    func nextUp(_ now: Double) -> Item? {
        items.first { hasWork($0, now) } ?? fallback.first
    }

    func hasWork(_ item: Item, _ now: Double) -> Bool {
        if plan.isDone(item.id) { return false }
        switch item {
        case .deck(let w): return w.due + w.new > 0
        case .lang(let s):
            return (langs.corpus.map { systemSummary(s, $0, langs.state(s.id), now: now).due } ?? 0) > 0 || langNewLeft(s, langs.state(s.id), now: now) > 0
        case .game, .read: return true
        }
    }

    func open(_ item: Item) {
        switch item {
        case .deck(let w): session = StudyLaunch(entry: w.entry, deck: w.deck)
        case .lang(let s): path.append(LangRoute.study(s.id))
        case .game(let g):
            plan.setDone(item.id, true)
            path.append(TodayRoute.game(g))
        case .read(let t):
            plan.setDone(item.id, true)
            path.append(TodayRoute.read(t))
        }
    }

    func reorder(_ shown: [Item], _ from: IndexSet, _ to: Int, pending: Bool) {
        var moved = shown.map(\.id)
        moved.move(fromOffsets: from, toOffset: to)
        let rest = items.map(\.id).filter { !moved.contains($0) }
        plan.order(pending ? moved + rest : rest + moved)
    }

    @ViewBuilder
    func rowLabel(_ item: Item) -> some View {
        switch item {
        case .deck(let work): ReviewDeckRow(entry: work.entry)
        case .lang(let system): LangSystemRow(system: system)
        case .game(let game): TodayPlanRow(symbol: game.symbol, title: game.title, detail: game.detail)
        case .read(let topic): TodayPlanRow(symbol: "book", title: topic.title, detail: branchTitle(topic.branch))
        }
    }

    @ViewBuilder
    func row(_ item: Item, done: Bool) -> some View {
        HStack(spacing: 10) {
            TodayDoneMark(done: done) { plan.setDone(item.id, !done) }
            Button { open(item) } label: { rowLabel(item).frame(maxWidth: .infinity, alignment: .leading).contentShape(.rect) }
                .buttonStyle(.plain)
        }
        .opacity(done ? 0.6 : 1)
        .swipeActions(edge: .leading) {
            Button("Open", systemImage: "play.fill") { open(item) }.tint(D8.malachite)
        }
        .swipeActions(edge: .trailing) {
            Button("Remove", systemImage: "minus.circle", role: .destructive) { plan.remove(item.id) }
            Button("Bottom", systemImage: "arrow.down.to.line") { plan.move(item.id, toTop: false) }.tint(D8.lapis)
            Button("Top", systemImage: "arrow.up.to.line") { plan.move(item.id, toTop: true) }.tint(Palette.ink)
        }
        .contextMenu {
            Button("Open", systemImage: "play.fill") { open(item) }
            Button(done ? "Not done" : "Done for today", systemImage: "checkmark.circle") { plan.setDone(item.id, !done) }
            Button("Move to top", systemImage: "arrow.up.to.line") { plan.move(item.id, toTop: true) }
            Button("Move to bottom", systemImage: "arrow.down.to.line") { plan.move(item.id, toTop: false) }
            if case .lang(let s) = item {
                Button("Settings and placement", systemImage: "slider.horizontal.3") { path.append(LangRoute.system(s.id)) }
            }
            Button("Remove from Today", systemImage: "minus.circle", role: .destructive) { plan.remove(item.id) }
        }
    }

    func hero(_ date: Date, studied: Bool, pending: [Item], planned: [Item], now: Double) -> some View {
        let real = TodayStatus.evaluate(streak: StreakGoal(streak: streak).day, studiedToday: studied, items: planned.count, itemsLeft: pending.count, now: date)
        #if DEBUG
        let status = TodayDemo.status(real, now: date)
        #else
        let status = real
        #endif
        return TodayHero(status: status, done: planned.count - pending.count, total: planned.count, next: nextUp(now)?.title, start: startNext, browse: { picking = true })
    }

    var body: some View {
        let planned = items
        let w = planned.compactMap { if case .deck(let w) = $0 { w } else { nil } }
        let due = w.reduce(0) { $0 + $1.due } + langDue.reduce(0) { $0 + $1.due }
        let now = Date().timeIntervalSince1970 * 1000
        let new = w.reduce(0) { $0 + $1.new } + langDue.reduce(0) { $0 + langNewLeft($1.system, langs.state($1.system.id), now: now) }
        let today = dayKey(now)
        let done = library.scienceDecks.reduce(0) { t, e in t + science.state(e.id).history[today].map { Int($0.new + $0.reviews) }.orZero }
            + langs.systems.reduce(0) { t, s in t + langs.state(s.id).history[today].map { Int($0.new + $0.reviews) }.orZero }
        let pending = planned.filter { hasWork($0, now) }
        let finished = planned.filter { !hasWork($0, now) }
        NavigationStack(path: $path) {
            Group {
            if !loaded {
                TodaySkeleton()
            } else {
            List {
                Section {
                    TimelineView(.periodic(from: .now, by: 60)) { context in
                        hero(context.date, studied: done > 0, pending: pending, planned: planned, now: now)
                    }
                    HStack(spacing: 0) {
                        Tally(n: due, label: "due now", color: D8.vermilion)
                        Tally(n: new, label: "new today", color: D8.lapis)
                        Tally(n: done, label: "done today", color: D8.malachite)
                    }
                    .padding(.vertical, 4)
                }
                .listRowBackground(Palette.card)
                Section {
                    ForEach(pending) { row($0, done: false) }
                        .onMove { reorder(pending, $0, $1, pending: true) }
                        .listRowBackground(Palette.card)
                    Button { picking = true } label: { Label("Add to Today", systemImage: "plus.circle") }
                        .tint(Palette.ink)
                        .listRowBackground(Palette.card)
                        .accessibilityIdentifier("today.add")
                } header: {
                    Eyebrow(text: "Your list")
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
                TodayStrip()
                if !reminders.enabled && !planned.isEmpty {
                    Section { ReminderPrompt().padding(.vertical, 6) }
                        .listRowBackground(Palette.card)
                }
                if !langs.systems.isEmpty {
                    Section { TranslateCard() }
                        .listRowBackground(Palette.card)
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
            .sheet(isPresented: $picking) { TodayPicker() }
            .langDestinations(path: $path)
            .navigationDestination(for: TodayRoute.self) { route in
                switch route {
                case .game(.match): MatchGame().fullHeightSession()
                case .game(.memory): MemoryGame().fullHeightSession()
                case .game(.flags): FlagGame().fullHeightSession()
                case .read(let topic): ReadView(topic: topic, langs: langs.gameLangs.isEmpty ? ["es", "fr"] : langs.gameLangs)
                }
            }
            .onChange(of: defaultItems, initial: true) { _, items in if loaded { plan.adopt(items) } }
            .onChange(of: loaded) { _, ready in if ready { plan.adopt(defaultItems) } }
            .onChange(of: phase) { _, p in if p == .active { Task { await plan.pull() } } }
            .onChange(of: account.stage) { old, new in
                if new == .signedOut && old == .signedIn && account.endedByUser { plan.clearLocal() }
            }
            .task(id: account.stage == .signedIn) {
                plan.token = { await account.freshToken() }
                await plan.pull()
            }
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
    let states = langs.systems.map { langs.state($0.id) } + library.scienceDecks.map { science.state($0.id) }
    return ReminderPlan.forecast(due: due, at: date, streak: ReminderPlan.streak(states, at: date), studiedToday: ReminderPlan.studied(states, at: date))
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
