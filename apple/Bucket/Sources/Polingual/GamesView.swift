import BucketKit
import SwiftUI

enum GameKind: String, CaseIterable, Identifiable, Hashable {
    case match, memory, flags

    var id: String { rawValue }

    var title: String {
        switch self {
        case .match: String(localized: "Match")
        case .memory: String(localized: "Memory")
        case .flags: String(localized: "Flags")
        }
    }

    var detail: String {
        switch self {
        case .match: String(localized: "Pair each word with its meaning.")
        case .memory: String(localized: "Turn two cards at a time and find the pairs.")
        case .flags: String(localized: "Pick the flag of the word's language.")
        }
    }

    var symbol: String {
        switch self {
        case .match: "arrow.left.arrow.right"
        case .memory: "square.grid.3x3"
        case .flags: "flag"
        }
    }
}

extension GameKind {
    var lowerWins: Bool { self != .flags }

    var standard: Int {
        switch self {
        case .match: 5
        case .memory: 6
        case .flags: FlagGame.total
        }
    }

    func bestText(_ v: Int) -> String {
        switch self {
        case .match: v == 0 ? String(localized: "no misses") : String(localized: "\(v) misses")
        case .memory: String(localized: "\(v) turns")
        case .flags: String(localized: "\(v) of 10")
        }
    }
}

@MainActor
@Observable
final class GameRecords {
    static let shared = GameRecords()
    private let d = UserDefaults.standard
    private(set) var version = 0

    func best(_ g: GameKind, size: Int? = nil) -> Int? {
        _ = version
        return d.object(forKey: "games.best.\(g.rawValue).\(size ?? g.standard)") as? Int
    }

    var stars: [String: Int] { d.dictionary(forKey: "games.stars") as? [String: Int] ?? [:] }

    var todayStars: Int {
        _ = version
        return stars[ImmersionDay.today] ?? 0
    }

    func finish(_ g: GameKind, size: Int, stars earned: Int, value: Int, missed: [GameWord], langs: LangStore) -> Bool {
        let isBest = GameStars.isBest(value, previous: best(g, size: size), lowerWins: g.lowerWins)
        if isBest { d.set(value, forKey: "games.best.\(g.rawValue).\(size)") }
        let today = ImmersionDay.today
        var all = stars.filter { $0.key >= ImmersionDay.daysAgo(14) }
        all[today, default: 0] += earned
        d.set(all, forKey: "games.stars")
        bringBack(missed, langs)
        version += 1
        return isBest
    }

    func bringBack(_ words: [GameWord], _ langs: LangStore) {
        for w in words {
            guard let s = langs.systems.first(where: { $0.root == w.root && $0.targets.contains(w.lang) }) else { continue }
            if langs.state(s.id).cards.has(cardId(w.lang, w.itemId)) {
                let key = "games.replay.\(s.id)"
                d.set(GameReplay.adding([w.id], to: d.stringArray(forKey: key) ?? []), forKey: key)
            } else {
                WantedWords.add(w.itemId, to: s.id)
            }
        }
    }

    func takeReplay(_ system: LangSystem, carded: (String, String) -> Bool) -> [QueueEntry] {
        let key = "games.replay.\(system.id)"
        return GameReplay.entries(d.stringArray(forKey: key) ?? [], in: system, carded: carded)
    }

    func graded(_ systemId: String, lang: String, itemId: String) {
        let key = "games.replay.\(systemId)"
        guard let list = d.stringArray(forKey: key), list.contains(cardId(lang, itemId)) else { return }
        let rest = list.filter { $0 != cardId(lang, itemId) }
        if rest.isEmpty { d.removeObject(forKey: key) } else { d.set(rest, forKey: key) }
    }
}

enum ImmersionDay {
    static var today: String { key(.now) }

    static func daysAgo(_ n: Int) -> String { key(Calendar.current.date(byAdding: .day, value: -n, to: .now) ?? .now) }

    static func key(_ date: Date) -> String {
        let c = Calendar.current.dateComponents([.year, .month, .day], from: date)
        return String(format: "%04d-%02d-%02d", c.year ?? 0, c.month ?? 0, c.day ?? 0)
    }
}

struct GameEnd: View {
    let game: GameKind
    let stars: Int
    let line: String
    let best: Bool
    let missed: [GameWord]
    let again: () -> Void
    @State private var shown = 0
    @State private var records = GameRecords.shared

    var body: some View {
        VStack(spacing: 16) {
            HStack(spacing: 10) {
                ForEach(0..<3, id: \.self) { i in
                    Image(systemName: i < shown ? "star.fill" : "star")
                        .font(.system(size: 46, weight: .bold))
                        .foregroundStyle(i < shown ? Color(hex: 0xE9A23B) : Palette.muted.opacity(0.4))
                        .scaleEffect(i < shown ? 1 : 0.8)
                        .symbolEffect(.bounce, value: shown > i)
                }
            }
            Text(line).font(.title3.weight(.bold)).foregroundStyle(Palette.ink).multilineTextAlignment(.center)
            if best {
                Label("New best", systemImage: "trophy.fill")
                    .font(.subheadline.weight(.heavy))
                    .foregroundStyle(.white)
                    .padding(.horizontal, 12).padding(.vertical, 6)
                    .background(D8.vermilion, in: .capsule)
                    .transition(.scale.combined(with: .opacity))
            }
            Text("\(records.todayStars) stars today").font(.footnote.weight(.semibold)).foregroundStyle(Palette.muted)
            if !missed.isEmpty {
                VStack(alignment: .leading, spacing: 8) {
                    Text("These come back in your next session").font(.caption.weight(.bold)).foregroundStyle(Palette.muted)
                    ForEach(missed) { w in
                        HStack(spacing: 8) {
                            FlagTile(lang: w.lang, size: 20)
                            Text(w.form).font(.headline).foregroundStyle(Palette.ink)
                            Text(w.gloss).font(.subheadline).foregroundStyle(Palette.muted).lineLimit(1)
                            Spacer(minLength: 0)
                            PlayButton(text: w.form, lang: w.lang)
                        }
                    }
                }
                .padding(14)
                .background(Palette.card, in: .rect(cornerRadius: 14))
            }
            Button("Play again", action: again).buttonStyle(D8Primary(compact: true))
        }
        .padding(.vertical, 24)
        .padding(.horizontal)
        .frame(maxWidth: .infinity)
        .task {
            for i in 1...max(1, stars) {
                try? await Task.sleep(for: .milliseconds(280))
                withAnimation(.spring(duration: 0.35)) { shown = i }
                tap()
            }
            if stars == 3 { haptic(true) }
        }
    }
}

@MainActor
enum GameWordCache {
    static var key = ""
    static var words: [GameWord] = []
}

extension LangStore {
    var gameWords: [GameWord] {
        guard let corpus else { return [] }
        let key = systems.map { "\($0.id):\($0.targets.joined(separator: ","))" }.joined(separator: "|") + "#" + String(states.values.reduce(0) { $0 + $1.cards.count }) + "#" + String(corpus.items.count)
        if key == GameWordCache.key { return GameWordCache.words }
        let words = freshGameWords(corpus)
        GameWordCache.key = key
        GameWordCache.words = words
        return words
    }

    func freshGameWords(_ corpus: LangCorpus) -> [GameWord] {
        let learned = GameWords.learned(systems, states: states, corpus: corpus)
        if learned.count >= 8 { return learned }
        let have = Set(learned.map(\.id))
        return learned + GameWords.starter(systems, corpus: corpus).filter { !have.contains($0.id) }
    }

    var gameLangs: [String] {
        var seen = Set<String>()
        return systems.flatMap(\.targets).filter { seen.insert($0).inserted }
    }
}

struct GamesView: View {
    @Environment(LangStore.self) private var langs
    var embedded = false
    @State private var open: GameKind? = Self.launchGame

    static var launchGame: GameKind? {
        #if DEBUG
        let args = ProcessInfo.processInfo.arguments
        if let i = args.firstIndex(of: "-openGame"), i + 1 < args.count { return GameKind(rawValue: args[i + 1]) }
        #endif
        return nil
    }
    @State private var records = GameRecords.shared

    var body: some View {
        if embedded {
            list
        } else {
            NavigationStack { list }
        }
    }

    var list: some View {
        List {
            if langs.systems.isEmpty && (langs.status == .idle || langs.status == .loading) {
                Section { ProgressView().frame(maxWidth: .infinity) }.listRowBackground(Color.clear)
            } else if langs.systems.isEmpty {
                Section {
                    Text("Start a language set in Learn. The games use the words you study.")
                        .foregroundStyle(Palette.muted)
                }
                .listRowBackground(Palette.card)
            } else {
                Section {
                    HStack(spacing: 8) {
                        Image(systemName: "star.fill").foregroundStyle(Color(hex: 0xE9A23B))
                        Text("\(records.todayStars) stars today").font(.headline).foregroundStyle(Palette.ink)
                    }
                    .padding(.vertical, 2)
                    ForEach(GameKind.allCases) { g in
                        Button { open = g } label: {
                            HStack(spacing: 14) {
                                Image(systemName: g.symbol)
                                    .font(.title2)
                                    .foregroundStyle(D8.parchment)
                                    .frame(width: 48, height: 48)
                                    .background(D8.lapis, in: .rect(cornerRadius: 12))
                                VStack(alignment: .leading, spacing: 2) {
                                    Text(g.title).font(.headline)
                                    Text(g.detail).font(.footnote).foregroundStyle(Palette.muted)
                                    if let b = records.best(g) {
                                        Label("Best: \(g.bestText(b))", systemImage: "trophy.fill").font(.caption.weight(.bold)).foregroundStyle(D8.vermilion)
                                    }
                                }
                            }
                            .padding(.vertical, 4)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .contentShape(.rect)
                        }
                        .buttonStyle(.plain)
                    }
                } footer: {
                    Text("\(langs.gameWords.count) words from your sets. Words you miss come back in your next study session.")
                }
                .listRowBackground(Palette.card)
            }
        }
        .paper()
        .navigationTitle("Games")
        .navigationDestination(item: $open) { g in
            switch g {
            case .match: MatchGame()
            case .memory: MemoryGame()
            case .flags: FlagGame()
            }
        }
        .task {
            await langs.load()
            #if DEBUG
            let args = ProcessInfo.processInfo.arguments
            if let i = args.firstIndex(of: "-openGame"), i + 1 < args.count { open = GameKind(rawValue: args[i + 1]) }
            #endif
        }
    }
}

struct GameWaiting: View {
    @Environment(LangStore.self) private var langs

    var body: some View {
        Group {
            if langs.status == .ready || langs.status == .error {
                Text("Study a few words in Learn first.").foregroundStyle(Palette.muted)
            } else {
                ProgressView()
            }
        }
        .padding(.top, 60)
        .frame(maxWidth: .infinity)
    }
}

struct MatchGame: View {
    @Environment(LangStore.self) private var langs
    @State private var round: MatchRound?
    @State private var flash: String?
    @State private var missed: [GameWord] = []
    @State private var result: (stars: Int, best: Bool)?

    var body: some View {
        ScrollView {
            if round == nil { GameWaiting() }
            if let round {
                if round.done, let result {
                    GameEnd(game: .match, stars: result.stars, line: round.misses == 0 ? String(localized: "All pairs, no misses.") : String(localized: "All pairs with \(round.misses) misses."), best: result.best, missed: missed) { deal() }
                } else {
                    HStack(alignment: .top, spacing: 12) {
                        VStack(spacing: 10) {
                            ForEach(round.words) { w in
                                Button { _ = self.round?.pickLeft(w.id) } label: { Text(w.gloss).frame(maxWidth: .infinity) }
                                    .buttonStyle(D8Option(selected: round.picked == w.id, align: .center))
                                    .opacity(round.solved.contains(w.id) ? 0.25 : 1)
                                    .disabled(round.solved.contains(w.id))
                            }
                        }
                        VStack(spacing: 10) {
                            ForEach(round.right) { w in
                                Button { tapRight(w) } label: {
                                    HStack(spacing: 6) {
                                        FlagTile(lang: w.lang, size: 20)
                                        Text(w.form).lineLimit(1).minimumScaleFactor(0.6)
                                    }
                                    .frame(maxWidth: .infinity)
                                }
                                .buttonStyle(D8Option(align: .center))
                                .overlay { if flash == w.id { RoundedRectangle(cornerRadius: 12).stroke(D8.vermilion, lineWidth: 3) } }
                                .opacity(round.solved.contains(w.id) ? 0.25 : 1)
                                .disabled(round.solved.contains(w.id))
                            }
                        }
                    }
                    .padding()
                    Text("Tap a meaning, then its word.").font(.footnote).foregroundStyle(Palette.muted)
                }
            }
        }
        .paper()
        .navigationTitle("Match")
        .inlineTitle()
        .task(id: langs.gameWords.count) {
            await langs.load()
            if round == nil { deal() }
        }
    }

    func deal() {
        var rng = SystemRandomNumberGenerator()
        let words = GameWords.pick(langs.gameWords, count: 5, using: &rng)
        round = words.count >= 3 ? MatchRound(words, using: &rng) : nil
        missed = []
        result = nil
    }

    func tapRight(_ w: GameWord) {
        guard var r = round else { return }
        let asked = r.picked
        let out = r.pickRight(w.id)
        round = r
        switch out {
        case .matched:
            haptic(true)
            _ = LangVoice.shared.speak(w.form, w.lang)
            if r.done {
                let stars = GameStars.match(misses: r.misses)
                result = (stars, GameRecords.shared.finish(.match, size: r.words.count, stars: stars, value: r.misses, missed: missed, langs: langs))
            }
        case .missed:
            haptic(false)
            if let asked, let word = r.words.first(where: { $0.id == asked }), !missed.contains(word) { missed.append(word) }
            flash = w.id
            Task {
                try? await Task.sleep(for: .milliseconds(500))
                flash = nil
            }
        default: break
        }
    }
}

struct MemoryGame: View {
    @Environment(LangStore.self) private var langs
    @State private var board: MemoryBoard?
    @State private var hiding: Task<Void, Never>?
    @State private var result: (stars: Int, best: Bool)?

    var body: some View {
        ScrollView {
            if board == nil { GameWaiting() }
            if let board {
                if board.done, let result {
                    GameEnd(game: .memory, stars: result.stars, line: String(localized: "Every pair in \(board.turns) turns."), best: result.best, missed: []) { deal() }
                } else {
                    LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 10), count: 3), spacing: 10) {
                        ForEach(board.tiles) { t in
                            Button { flip(t) } label: { face(t, up: board.isFaceUp(t.id)) }
                                .buttonStyle(.plain)
                        }
                    }
                    .padding()
                    Text("Turns: \(board.turns)").font(.footnote.monospacedDigit()).foregroundStyle(Palette.muted)
                }
            }
        }
        .paper()
        .navigationTitle("Memory")
        .inlineTitle()
        .task(id: langs.gameWords.count) {
            await langs.load()
            if board == nil { deal() }
        }
    }

    func face(_ t: MemoryBoard.Tile, up: Bool) -> some View {
        ZStack {
            RoundedRectangle(cornerRadius: 12).fill(up ? Color.white : D8.lapis)
            RoundedRectangle(cornerRadius: 12).strokeBorder(up ? D8.keyline : D8.lapis, lineWidth: 2)
            if up {
                VStack(spacing: 6) {
                    if t.isForm { FlagTile(lang: t.lang, size: 18) }
                    Text(t.text)
                        .font(.system(size: 16, weight: .heavy, design: .rounded))
                        .foregroundStyle(D8.ink)
                        .multilineTextAlignment(.center)
                        .minimumScaleFactor(0.5)
                }
                .padding(6)
            } else {
                Image(systemName: "questionmark").font(.title2.weight(.heavy)).foregroundStyle(D8.parchment)
            }
        }
        .frame(height: 86)
        .accessibilityLabel(Text(up ? t.text : String(localized: "Face-down card")))
    }

    func deal() {
        var rng = SystemRandomNumberGenerator()
        let words = GameWords.pick(langs.gameWords, count: 6, using: &rng)
        board = words.count >= 3 ? MemoryBoard(words, using: &rng) : nil
        result = nil
    }

    func flip(_ t: MemoryBoard.Tile) {
        guard var b = board else { return }
        hiding?.cancel()
        hiding = nil
        let out = b.flip(t.id)
        board = b
        if t.isForm && out != .ignored { _ = LangVoice.shared.speak(t.text, t.lang) }
        switch out {
        case .matched:
            haptic(true)
            if b.done {
                let stars = GameStars.memory(turns: b.turns, pairs: b.tiles.count / 2)
                result = (stars, GameRecords.shared.finish(.memory, size: b.tiles.count / 2, stars: stars, value: b.turns, missed: [], langs: langs))
            }
        case .missed:
            haptic(false)
            hiding = Task {
                try? await Task.sleep(for: .milliseconds(900))
                guard !Task.isCancelled else { return }
                if board?.open.count == 2 { board?.hide() }
            }
        default: break
        }
    }
}

struct FlagGame: View {
    static let total = 10
    @Environment(LangStore.self) private var langs
    @State private var round: FlagRound?
    @State private var answered: String?
    @State private var score = 0
    @State private var played = 0
    @State private var combo = 0
    @State private var bestCombo = 0
    @State private var missed: [GameWord] = []
    @State private var result: (stars: Int, best: Bool)?
    @State private var advance: Task<Void, Never>?

    var body: some View {
        VStack(spacing: 18) {
            if let result {
                ScrollView {
                    GameEnd(game: .flags, stars: result.stars, line: String(localized: "\(score) of \(Self.total) right. Best run: \(bestCombo)."), best: result.best, missed: missed) { restart() }
                }
            } else if let round {
                HStack {
                    ProgressView(value: Double(played), total: Double(Self.total)).tint(D8.lapis)
                    Text("\(played)/\(Self.total)").font(.footnote.monospacedDigit().weight(.semibold)).foregroundStyle(Palette.muted)
                }
                .padding(.horizontal)
                HStack(spacing: 6) {
                    Image(systemName: "flame.fill").foregroundStyle(combo >= 3 ? D8.vermilion : Palette.muted)
                    Text(combo >= 2 ? String(localized: "\(combo) in a row") : String(localized: "Score \(score)"))
                        .font(.headline.monospacedDigit())
                        .foregroundStyle(combo >= 3 ? D8.vermilion : Palette.ink)
                        .contentTransition(.numericText())
                }
                .symbolEffect(.bounce, value: combo)
                .animation(.spring(duration: 0.3), value: combo)
                VStack(spacing: 6) {
                    Text(round.word.form).font(D8.word(40)).foregroundStyle(Palette.ink).multilineTextAlignment(.center)
                    if answered != nil { Text(round.word.gloss).font(.headline).foregroundStyle(Palette.muted) }
                }
                .frame(minHeight: 110)
                LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 16) {
                    ForEach(round.choices, id: \.self) { l in
                        Button { answer(l) } label: {
                            VStack(spacing: 6) {
                                FlagTile(lang: l, size: 64)
                                Text(langName(l)).font(.footnote.weight(.semibold)).foregroundStyle(Palette.ink)
                            }
                            .padding(10)
                            .frame(maxWidth: .infinity)
                            .background(tint(l), in: .rect(cornerRadius: 14))
                        }
                        .buttonStyle(.plain)
                        .disabled(answered != nil)
                        .scaleEffect(answered != nil && round.isRight(l) ? 1.06 : 1)
                        .animation(.spring(duration: 0.3), value: answered)
                    }
                }
                .padding(.horizontal)
                if let answered, !round.isRight(answered) {
                    Button(played == Self.total ? String(localized: "See stars") : String(localized: "Next")) { next() }.buttonStyle(D8Primary(compact: true))
                }
                Spacer()
            } else {
                Text("Start a language set in Learn to play.").foregroundStyle(Palette.muted)
                Spacer()
            }
        }
        .padding(.top, 20)
        .frame(maxWidth: .infinity)
        .paper()
        .navigationTitle("Flags")
        .inlineTitle()
        .task(id: langs.gameWords.count) {
            await langs.load()
            if round == nil { deal() }
            #if DEBUG
            if ProcessInfo.processInfo.arguments.contains("-finishGame"), result == nil, !langs.gameWords.isEmpty {
                missed = Array(langs.gameWords.prefix(2))
                score = 8
                bestCombo = 5
                played = Self.total
                next()
            }
            #endif
        }
        .onDisappear { advance?.cancel() }
    }

    func tint(_ l: String) -> Color {
        guard let answered, let round else { return Palette.card }
        if round.isRight(l) { return D8.malachite.opacity(0.25) }
        return l == answered ? D8.vermilion.opacity(0.25) : Palette.card
    }

    func restart() {
        score = 0
        played = 0
        combo = 0
        bestCombo = 0
        missed = []
        result = nil
        deal()
    }

    func next() {
        advance?.cancel()
        if played >= Self.total {
            let stars = GameStars.flags(score: score, of: Self.total)
            result = (stars, GameRecords.shared.finish(.flags, size: Self.total, stars: stars, value: score, missed: missed, langs: langs))
        } else {
            deal()
        }
    }

    func deal() {
        answered = nil
        let langsAll = langs.gameLangs
        let pool = langs.gameWords
        guard let w = pool.randomElement() else {
            round = nil
            return
        }
        var rng = SystemRandomNumberGenerator()
        let choices = langsAll.count >= 4 ? langsAll : Array(Set(langsAll + Lang.codes.filter { $0 != w.root }.shuffled().prefix(4 - langsAll.count)))
        round = FlagRound(word: w, langs: choices, using: &rng)
        _ = LangVoice.shared.speak(w.form, w.lang)
    }

    func answer(_ l: String) {
        guard let round, answered == nil else { return }
        answered = l
        played += 1
        if round.isRight(l) {
            score += 1
            combo += 1
            bestCombo = max(bestCombo, combo)
            haptic(true)
            advance = Task {
                try? await Task.sleep(for: .milliseconds(800))
                guard !Task.isCancelled else { return }
                next()
            }
        } else {
            combo = 0
            if !missed.contains(round.word) { missed.append(round.word) }
            haptic(false)
        }
    }
}
