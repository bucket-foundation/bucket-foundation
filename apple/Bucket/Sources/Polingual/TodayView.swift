import BucketKit
import SwiftUI

struct TodayView: View {
    @Environment(LangStore.self) private var langs
    @Environment(Reminders.self) private var reminders
    @Environment(Account.self) private var account
    @Environment(\.scenePhase) private var phase
    @State private var path = NavigationPath()
    @State private var session: StudyLaunch?
    @State private var picking = false
    @State private var dropTarget: String?
    @AppStorage("bucket.today.order") private var order = ""
    @State private var scienceReady = false
    private let plan = TodayPlanStore.shared
    var subjects: (any Subjects)?
    var opening: (@MainActor (Binding<NavigationPath>) async -> Void)?

    var decks: [DeckEntry] { subjects?.decks ?? [] }

    var startAnchor: UnitPoint {
        #if DEBUG
        if Launch.flag("-todayScrollEnd") { return .bottom }
        if Launch.flag("-todayScrollMid") { return .center }
        #endif
        return .top
    }

    var deckStates: [EngineState] { decks.compactMap { subjects?.state($0.id) } }

    var loaded: Bool {
        #if DEBUG
        if Launch.flag("-holdLoading") { return false }
        #endif
        return (subjects?.indexDone ?? true) && scienceReady && (langs.status == .ready || langs.status == .error)
    }

    enum Item: Identifiable {
        case deck(Work)
        case lang(LangSystem)
        case game(GameKind)
        case read(ContentTopic)
        case activity(TodayActivity)

        var id: String {
            switch self {
            case .deck(let w): TodayItem.deck(w.entry).id
            case .lang(let s): TodayItem.system(s).id
            case .game(let g): TodayItem.game(g).id
            case .read(let t): TodayItem.topic(t).id
            case .activity(let a): a.id
            }
        }

        var title: String {
            switch self {
            case .deck(let w): w.entry.title
            case .lang(let s): s.title
            case .game(let g): g.title
            case .read(let t): t.title
            case .activity(let a): a.title
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

    func work(_ entry: DeckEntry) -> Work? { subjects?.work(entry) }

    var startedWork: [Work] {
        decks.filter { (subjects?.state($0.id).cards.count ?? 0) > 0 }.compactMap(work)
    }

    var defaultItems: [TodayItem] {
        let saved = order.split(separator: ",").map(String.init)
        let own = (langs.systems.map(Item.lang) + startedWork.map(Item.deck)).enumerated().sorted { a, b in
            let ia = saved.firstIndex(of: a.element.legacyId) ?? saved.count + a.offset
            let ib = saved.firstIndex(of: b.element.legacyId) ?? saved.count + b.offset
            return ia < ib
        }.compactMap { todayItem($0.element) }
        return TodayPlan.defaults(systems: own, decks: [], starter: decks.prefix(1).map(TodayItem.deck))
    }

    func todayItem(_ item: Item) -> TodayItem? {
        switch item {
        case .deck(let w): .deck(w.entry)
        case .lang(let s): .system(s)
        case .game(let g): .game(g)
        case .read(let t): .topic(t)
        case .activity(let a): .activity(a)
        }
    }

    func alphabetSystem(_ lang: String) -> LangSystem? {
        LangScript.alphabetUnit(lang) == nil ? nil : langs.systems.first { $0.targets.contains(lang) }
    }

    func resolve(_ item: TodayItem) -> Item? {
        if case .alphabet(let lang)? = item.activity, alphabetSystem(lang) == nil { return nil }
        if let activity = item.activity { return .activity(activity) }
        switch item.kind {
        case .system: return langs.systems.first { $0.id == item.ref }.map(Item.lang)
        case .deck: return decks.first { $0.id == item.ref }.flatMap(work).map(Item.deck)
        case .game: return GameKind(rawValue: item.ref).map(Item.game)
        case .content: return ContentCatalog.topics.first { $0.title == item.ref }.map(Item.read)
        }
    }

    var items: [Item] { plan.plan.items.compactMap(resolve) }

    var fallback: [Item] {
        (langs.systems.map(Item.lang) + startedWork.map(Item.deck)).filter { hasWork($0, Date().timeIntervalSince1970 * 1000) }
    }

    var langSets: [LangSystem] {
        items.compactMap { if case .lang(let s) = $0 { s } else { nil } }
    }

    var live: LiveStreak {
        LiveStreak(deckStates + langs.systems.map { langs.state($0.id) }, now: Date().timeIntervalSince1970 * 1000)
    }

    var inputStreak: InputStreak {
        let states = deckStates + langs.systems.map { langs.state($0.id) }
        let langCodes = Array(Set(langs.systems.flatMap(\.targets))).sorted()
        return ProgressMetric.streak(studyDays: states.flatMap { Array($0.history.keys) }, log: ProgressMetric.rows(langs.reviewLog), langs: langCodes, today: dayKey(Date().timeIntervalSince1970 * 1000))
    }

    var streak: Double { max(live.days, Double(inputStreak.streak)) }

    func startNext() {
        guard let next = nextUp(Date().timeIntervalSince1970 * 1000) ?? items.first else { return }
        open(next)
    }

    func nextUp(_ now: Double) -> Item? {
        items.first { hasWork($0, now) } ?? fallback.first
    }

    func cards(_ item: Item, _ now: Double) -> (due: Int, new: Int)? {
        switch item {
        case .deck(let w): (w.due, w.new)
        case .lang(let s): (langs.corpus.map { systemSummary(s, $0, langs.state(s.id), now: now).due } ?? 0, langNewLeft(s, langs.state(s.id), now: now))
        case .game, .read, .activity: nil
        }
    }

    func hasWork(_ item: Item, _ now: Double) -> Bool {
        if resting(item, now) { return false }
        return cards(item, now).map { $0.due + $0.new > 0 } ?? !plan.isDone(item.id)
    }

    func expectedLearning(_ streak: Double) -> ExpectedLearning {
        ExpectedLearning(streak: StreakGoal(streak: streak).day, languages: ExpectedLearning.Track.languages(langs.systems.map { ($0, langs.state($0.id)) }), decks: deckStates.map { .init($0) })
    }

    func resting(_ item: Item, _ now: Double) -> Bool {
        guard case .activity(.alphabet(let lang)) = item, !plan.isDone(item.id), let system = alphabetSystem(lang) else { return false }
        return !letterQueue(system, langs.state(system.id), now: now).contains { $0.lang == lang }
    }

    func studied(_ item: Item, _ now: Double) -> Int {
        let state: EngineState
        switch item {
        case .deck(let w): guard let s = subjects?.state(w.entry.id) else { return 0 }; state = s
        case .lang(let s): state = langs.state(s.id)
        case .game, .read, .activity: return 0
        }
        return state.history[dayKey(now)].map { Int($0.new + $0.reviews) }.orZero
    }

    func open(_ item: Item) {
        switch item {
        case .deck(let w): session = StudyLaunch(entry: w.entry, deck: w.deck)
        case .lang(let s): path.append(LangRoute.study(s.id))
        case .game(let g): path.append(TodayRoute.game(g))
        case .read(let t): path.append(TodayRoute.read(t))
        case .activity(.listen): path.append(TodayRoute.content(.listen))
        case .activity(.watch): path.append(TodayRoute.content(.watch))
        case .activity(.alphabet(let lang)):
            if let system = alphabetSystem(lang) { path.append(LangRoute.alphabet(system.id, lang)) }
        }
    }

    func masteredPercent(_ item: Item, _ now: Double) -> Int {
        switch item {
        case .deck(let w): return subjects?.masteredPercent(w.deck) ?? 0
        case .lang(let s):
            guard let corpus = langs.corpus else { return 0 }
            let per = langProgress(s, corpus, langs.state(s.id), now: now)
            let total = per.reduce(0) { $0 + Int($1.total) }
            return total > 0 ? Int(Double(per.reduce(0) { $0 + Int($1.mastered) }) / Double(total) * 100) : 0
        case .game, .read, .activity: return 0
        }
    }

    func detail(_ item: Item, _ now: Double) -> String {
        if let c = cards(item, now) {
            if c.due + c.new == 0 { return String(localized: "\(masteredPercent(item, now))% mastered · \(studied(item, now)) today") }
            if c.new == 0 { return String(localized: "\(c.due) review") }
            if c.due == 0 { return String(localized: "\(c.new) new") }
            return String(localized: "\(c.due) review · \(c.new) new")
        }
        switch item {
        case .game: return String(localized: "Play one round")
        case .activity(.listen): return String(localized: "Listen for 2 minutes")
        case .activity(.watch): return String(localized: "Watch for 1 minute")
        case .activity(.alphabet): return resting(item, now) ? String(localized: "No letters due") : String(localized: "Finish one round")
        default: return String(localized: "Read for 30 seconds")
        }
    }

    func widget(_ item: Item, done: Bool, now: Double) -> some View {
        let did = studied(item, now)
        let count = cards(item, now).map { $0.due + $0.new }
        let symbol: String? = switch item {
        case .game(let game): game.symbol
        case .read: "book"
        case .activity(.listen): "dot.radiowaves.left.and.right"
        case .activity(.watch): "play.rectangle"
        case .activity(.alphabet): "character.book.closed"
        default: nil
        }
        let branch: String? = if case .deck(let w) = item { w.entry.id } else { nil }
        let flags: [String] = switch item {
        case .lang(let s): s.targets
        case .activity(.alphabet(let lang)): [lang]
        default: []
        }
        let look: TileLook = switch item {
        case .deck(let w): TodayLooks.branch(w.entry.id)
        case .lang(let s): TodayLooks.lang(s.targets)
        case .game(let game): TodayLooks.game(game)
        case .read(let topic): TodayLooks.branch(topic.branch)
        case .activity(.listen): TodayLooks.listen
        case .activity(.watch): TodayLooks.watch
        case .activity(.alphabet): TodayLooks.alphabet
        }
        let share = did + (count ?? 0)
        return TodayWidget(symbol: symbol, branch: branch, flags: flags, title: item.title, detail: detail(item, now), left: count, progress: done ? 1 : share > 0 ? Double(did) / Double(share) : 0, done: done, look: look, dragId: item.id) { open(item) }
            .contextMenu {
                Button("Open", systemImage: "play.fill") { open(item) }
                Button("Move to top", systemImage: "arrow.up.to.line") { plan.move(item.id, toTop: true) }
                Button("Move to bottom", systemImage: "arrow.down.to.line") { plan.move(item.id, toTop: false) }
                if case .lang(let s) = item {
                    Button("Settings and placement", systemImage: "slider.horizontal.3") { path.append(LangRoute.system(s.id)) }
                }
                Button("Remove from Today", systemImage: "minus.circle", role: .destructive) { plan.remove(item.id) }
            }
            .dropDestination(for: String.self) { ids, _ in
                guard let id = ids.first, id != item.id else { return false }
                withAnimation(.snappy) { plan.drop(id, onto: item.id) }
                return true
            } isTargeted: { over in
                if over { dropTarget = item.id } else if dropTarget == item.id { dropTarget = nil }
            }
            .overlay {
                if dropTarget == item.id { RoundedRectangle(cornerRadius: PL.Radius.lg).strokeBorder(PL.lapis, lineWidth: 3).allowsHitTesting(false) }
            }
            .accessibilityIdentifier("today.widget.\(item.id)")
    }

    func goalCard(done: Int, later: Bool) -> StreakGoalCard {
        #if DEBUG
        if let days = TodayDemo.uncountedDay {
            return StreakGoalCard(streak: days, pending: days > 0, share: later, expected: expectedLearning(days))
        }
        #endif
        return StreakGoalCard(streak: streak, pending: live.pending && done == 0, share: later, expected: expectedLearning(streak))
    }

    func hero(_ date: Date, studied: Bool, pending: [Item], planned: [Item], now: Double) -> some View {
        let real = TodayStatus.evaluate(streak: StreakGoal(streak: streak).day, studiedToday: studied, items: planned.count, itemsLeft: pending.count, now: date)
        #if DEBUG
        let status = TodayDemo.status(real, now: date)
        #else
        let status = real
        #endif
        return TodayHero(status: status, done: planned.count - pending.count, total: planned.count, next: nextUp(now)?.title, languagesOnly: subjects == nil, start: startNext, browse: { picking = true })
    }

    var body: some View {
        let now = Date().timeIntervalSince1970 * 1000
        let all = items
        let idle = all.filter { resting($0, now) }
        let planned = all.filter { !resting($0, now) }
        let w = planned.compactMap { if case .deck(let w) = $0 { w } else { nil } }
        let langTotals = langs.corpus.map { corpus in langDayTotals(langSets.map { ($0, langs.state($0.id)) }, corpus, now: now) }
        let due = w.reduce(0) { $0 + $1.due } + (langTotals?.due ?? 0)
        let new = w.reduce(0) { $0 + $1.new } + (langTotals?.new ?? 0)
        let today = dayKey(now)
        let done = deckStates.reduce(0) { t, state in t + state.history[today].map { Int($0.new + $0.reviews) }.orZero }
            + langs.systems.reduce(0) { t, s in t + langs.state(s.id).history[today].map { Int($0.new + $0.reviews) }.orZero }
        let pending = planned.filter { hasWork($0, now) }
        let finished = planned.filter { !hasWork($0, now) }
        let later = TodayExtras.shown(days: deckStates.flatMap { Array($0.history.keys) } + langs.systems.flatMap { Array(langs.state($0.id).history.keys) }, today: today)
        NavigationStack(path: $path) {
            Group {
            if !loaded {
                TodaySkeleton()
            } else {
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    PLScreenTop(title: "Today", stickers: Stickers.today)
                    goalCard(done: done, later: later).todayCard()
                    VStack(spacing: 12) {
                        TimelineView(.periodic(from: .now, by: 60)) { context in
                            hero(context.date, studied: done > 0 || live.countsToday, pending: pending, planned: planned, now: now)
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)
                        Divider().overlay(PL.hairline2)
                        HStack(spacing: 0) {
                            Tally(n: due, label: "due now", color: PL.vermilion)
                            Tally(n: new, label: "new today", color: PL.lapis)
                            Tally(n: done, label: "done today", color: PL.malachite)
                        }
                        .padding(.vertical, 4)
                    }
                    .todayCard()
                    if !langs.systems.isEmpty {
                        TranslateCard(today: true)
                    }
                    VStack(alignment: .leading, spacing: 10) {
                        Eyebrow(text: "Your day").padding(.leading, 16)
                        LazyVGrid(columns: learnColumns, spacing: 14) {
                            ForEach(pending) { widget($0, done: false, now: now) }
                            ForEach(idle) { widget($0, done: false, now: now) }
                            ForEach(finished) { widget($0, done: true, now: now) }
                            TodayAddWidget { picking = true }
                        }
                    }
                    if !langs.systems.isEmpty {
                        LangProgressCard(langs: Array(Set(langs.systems.flatMap(\.targets))).sorted(), states: langs.systems.map { langs.state($0.id) }, log: langs.reviewLog, now: now).todayCard()
                    }
                    if later {
                        TodayStrip(card: true)
                        if !reminders.enabled && (!planned.isEmpty || reminders.stuckOff) {
                            ReminderPrompt().padding(.vertical, 6).todayCard()
                        }
                    }
                }
                .padding(.horizontal, 16)
                .padding(.vertical, 12)
            }
            .defaultScrollAnchor(startAnchor)
            }
            }
            .animation(.easeOut(duration: 0.35), value: loaded)
            .scrollContentBackground(.hidden)
            .plGround(.cut(0.7, 0.42))
            .navigationTitle("Today")
            .plChrome()
            .toolbar { ToolbarItem(placement: .primaryAction) { ScreenShareButton() } }
            .sheet(item: $session) { subjects?.study($0) }
            .sheet(isPresented: $picking) { TodayPicker(subjects: subjects?.decks) }
            .langDestinations(path: $path)
            .navigationDestination(for: TodayRoute.self) { route in
                switch route {
                case .game(let game): game.screen
                case .read(let topic): ReadView(topic: topic, langs: langs.gameLangs.isEmpty ? ["es", "fr"] : langs.gameLangs)
                case .content(let kind): ContentHub(embedded: true, start: kind, fromToday: true).fullHeightSession()
                case .translate: TranslateScreen()
                }
            }
            .onChange(of: defaultItems, initial: true) { _, items in if loaded { plan.adopt(items) } }
            #if DEBUG
            .task {
                if Launch.flag("-todayDemoPlan") {
                    for item in [TodayItem.activity(.listen), .activity(.watch), .game(.daily)] where !plan.contains(item.id) { plan.add(item) }
                    plan.finish(TodayActivity.watch.id)
                }
                if Launch.flag("-todayPicker") { picking = true }
            }
            #endif
            .onChange(of: loaded) { _, ready in if ready { plan.adopt(defaultItems) } }
            .onChange(of: phase) { _, p in
                guard p == .active else { return }
                WatchDwell.returned()
                Task { await plan.pull() }
            }
            .onChange(of: NetworkWatch.shared.online) { _, up in
                if up { Task { await plan.pull() } }
            }
            .onChange(of: account.stage) { old, new in
                if new == .signedOut && old == .signedIn && account.endedByUser { plan.clearLocal() }
            }
            .task(id: account.stage == .signedIn) {
                plan.token = { await account.freshToken() }
                await plan.pull()
            }
            .onChange(of: loaded, initial: true) { _, ready in if ready && StudyRequest.take() { startNext() } }
            .onReceive(NotificationCenter.default.publisher(for: .startStudy)) { _ in if loaded && StudyRequest.take() { startNext() } }
            .task {
                WatchDwell.returned()
                await langs.load()
                await opening?($path)
            }
            .task(id: decks.map(\.id)) {
                scienceReady = false
                await subjects?.load()
                scienceReady = true
                guard session == nil, let id = Launch.value("-study"), let entry = decks.first(where: { $0.id == id }), let deck = await subjects?.prepared(entry) else { return }
                session = StudyLaunch(entry: entry, deck: deck)
            }
        }
        .modifier(MilestoneMoments(ready: loaded && session == nil && !picking && path.isEmpty))
    }
}

enum TodayExtras {
    static func shown(days: [String], today: String) -> Bool {
        #if DEBUG
        if Launch.flag("-dayTwo") { return true }
        #endif
        return days.contains { $0 != today }
    }
}

struct Tally: View {
    let n: Int
    let label: String
    let color: Color

    var body: some View {
        VStack(spacing: 2) {
            Text("\(n)").font(PL.script(34, .bold)).foregroundStyle(n > 0 ? color : PL.inkDim).monospacedDigit()
            Text(LocalizedStringKey(label)).font(PL.text(12, .semibold)).foregroundStyle(PL.inkDim)
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
        let block = PL.hairline2.opacity(0.7)
        ScrollView {
            VStack(alignment: .leading, spacing: 22) {
                VStack(alignment: .leading, spacing: 16) {
                    RoundedRectangle(cornerRadius: PL.Radius.xs).fill(block).frame(width: 90, height: 12)
                    HStack(spacing: 0) {
                        ForEach(0..<3, id: \.self) { _ in
                            VStack(spacing: 8) {
                                RoundedRectangle(cornerRadius: PL.Radius.sm).fill(block).frame(width: 40, height: 34)
                                RoundedRectangle(cornerRadius: PL.Radius.xs).fill(block).frame(width: 58, height: 10)
                            }
                            .frame(maxWidth: .infinity)
                        }
                    }
                    RoundedRectangle(cornerRadius: PL.Radius.xs).fill(block).frame(height: 12).padding(.trailing, 60)
                    RoundedRectangle(cornerRadius: PL.Radius.md).fill(PL.vermilion.opacity(0.25)).frame(height: 50)
                }
                .padding(18)
                .background(PL.card, in: .rect(cornerRadius: PL.Radius.xl))
                RoundedRectangle(cornerRadius: PL.Radius.xs).fill(block).frame(width: 100, height: 10).padding(.leading, 18)
                VStack(spacing: 0) {
                    ForEach(0..<3, id: \.self) { i in
                        HStack(spacing: 12) {
                            RoundedRectangle(cornerRadius: PL.Radius.sm).fill(block).frame(width: 36, height: 36)
                            VStack(alignment: .leading, spacing: 7) {
                                RoundedRectangle(cornerRadius: PL.Radius.xs).fill(block).frame(width: 150, height: 13)
                                RoundedRectangle(cornerRadius: PL.Radius.xs).fill(block).frame(width: 110, height: 10)
                            }
                            Spacer()
                            Capsule().fill(block).frame(width: 56, height: 24)
                        }
                        .padding(.vertical, 14)
                        if i < 2 { Divider().overlay(PL.hairline2) }
                    }
                }
                .padding(.horizontal, 18)
                .background(PL.card, in: .rect(cornerRadius: PL.Radius.xl))
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

struct LangProgressCard: View {
    let langs: [String]
    let states: [EngineState]
    let log: [LogRow]
    let now: Double

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            VStack(alignment: .leading, spacing: 2) {
                Eyebrow(text: "Your languages")
                Text("Words you know in each language").font(PL.text(12)).foregroundStyle(PL.inkDim)
            }
            LazyVGrid(columns: [GridItem(.adaptive(minimum: 140), spacing: 10, alignment: .leading)], alignment: .leading, spacing: 10) {
                ForEach(ProgressMetric.ranked(langs, cards: ProgressMetric.cards(states), rows: ProgressMetric.rows(log), now: now), id: \.lang) { row in
                    HStack(spacing: 10) {
                        PLBadge(row.lang.uppercased(), tone: .ink)
                        VStack(alignment: .leading, spacing: 0) {
                            Text(Locale.current.localizedString(forLanguageCode: row.lang) ?? row.lang.uppercased())
                                .font(PL.text(12, .semibold)).foregroundStyle(PL.inkDim).lineLimit(1)
                            Text(row.metrics.knownWords, format: .number).font(PL.text(17, .bold)).foregroundStyle(PL.ink).monospacedDigit()
                            if row.metrics.inputSeconds > 0 {
                                Text("\(row.metrics.inputHours, specifier: "%.1f") h input").font(PL.text(11)).foregroundStyle(PL.lapis)
                            }
                        }
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .accessibilityElement(children: .combine)
                }
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .accessibilityIdentifier("today-lang-progress")
    }
}
