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
    @State private var open: GameKind?

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
                                }
                            }
                            .padding(.vertical, 4)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .contentShape(.rect)
                        }
                        .buttonStyle(.plain)
                    }
                } footer: {
                    Text("\(langs.gameWords.count) words from your sets. Games do not change your reviews.")
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

#if DEBUG
let gameEndForced = ProcessInfo.processInfo.arguments.contains("-endGame")
#else
let gameEndForced = false
#endif

struct GameScore: View {
    let text: String
    let again: () -> Void

    var body: some View {
        VStack(spacing: 14) {
            Image(systemName: "checkmark.seal.fill").font(.system(size: 54)).foregroundStyle(D8.malachite)
            Text(text).font(.title3.weight(.semibold)).multilineTextAlignment(.center)
            Button("Play again", action: again).buttonStyle(D8Primary(compact: true))
        }
        .padding(.vertical, 24)
        .frame(maxWidth: .infinity)
    }
}

struct MatchGame: View {
    @Environment(LangStore.self) private var langs
    @Environment(\.verticalSizeClass) private var vertical
    @State private var round: MatchRound?
    @State private var flash: String?

    var body: some View {
        FitPage {
            VStack(spacing: 0) {
                if round == nil { GameWaiting() }
                if let round {
                    if round.done || gameEndForced {
                        GameScore(text: round.misses == 0 ? String(localized: "All pairs, no misses.") : String(localized: "All pairs with \(round.misses) misses.")) { deal() }
                    } else {
                        HStack(alignment: .top, spacing: 12) {
                            VStack(spacing: vertical == .compact ? 4 : 10) {
                                ForEach(round.words) { w in
                                    Button { _ = self.round?.pickLeft(w.id) } label: { Text(w.gloss).frame(maxWidth: .infinity) }
                                        .buttonStyle(D8Option(selected: round.picked == w.id, align: .center))
                                        .opacity(round.solved.contains(w.id) ? 0.25 : 1)
                                        .disabled(round.solved.contains(w.id))
                                }
                            }
                            VStack(spacing: vertical == .compact ? 4 : 10) {
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
    }

    func tapRight(_ w: GameWord) {
        guard var r = round else { return }
        let out = r.pickRight(w.id)
        round = r
        switch out {
        case .matched:
            haptic(true)
            _ = LangVoice.shared.speak(w.form, w.lang)
        case .missed:
            haptic(false)
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
    @Environment(\.verticalSizeClass) private var vertical
    @State private var board: MemoryBoard?
    @State private var hiding: Task<Void, Never>?

    var body: some View {
        FitPage {
            VStack(spacing: 0) {
                if board == nil { GameWaiting() }
                if let board {
                    if board.done || gameEndForced {
                        GameScore(text: String(localized: "Every pair in \(board.turns) turns.")) { deal() }
                    } else {
                        LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 10), count: vertical == .compact ? 6 : 3), spacing: 10) {
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
    }

    func flip(_ t: MemoryBoard.Tile) {
        guard var b = board else { return }
        hiding?.cancel()
        hiding = nil
        let out = b.flip(t.id)
        board = b
        if t.isForm && out != .ignored { _ = LangVoice.shared.speak(t.text, t.lang) }
        switch out {
        case .matched: haptic(true)
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
    @Environment(LangStore.self) private var langs
    @Environment(\.verticalSizeClass) private var vertical
    @State private var round: FlagRound?
    @State private var answered: String?
    @State private var score = 0
    @State private var played = 0

    var body: some View {
        let sideways = vertical == .compact
        let columns = sideways ? AnyLayout(HStackLayout(alignment: .center, spacing: 20)) : AnyLayout(VStackLayout(spacing: 22))
        FitPage {
            Group {
                if let round {
                    columns {
                        VStack(spacing: sideways ? 12 : 22) {
                            Text("\(score) of \(played)").font(.footnote.monospacedDigit()).foregroundStyle(Palette.muted)
                            VStack(spacing: 6) {
                                Text(round.word.form).font(D8.word(40)).foregroundStyle(Palette.ink).multilineTextAlignment(.center).lineLimit(2).minimumScaleFactor(0.5)
                                if answered != nil { Text(round.word.gloss).font(.headline).foregroundStyle(Palette.muted) }
                            }
                            .frame(maxWidth: sideways ? 280 : nil, minHeight: sideways ? nil : 120)
                            if sideways, answered != nil {
                                Button("Next") { deal() }.buttonStyle(D8Primary(compact: true))
                            }
                        }
                        .frame(maxWidth: .infinity)
                        LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: sideways ? 10 : 16) {
                            ForEach(round.choices, id: \.self) { l in
                                Button { answer(l) } label: {
                                    VStack(spacing: 6) {
                                        FlagTile(lang: l, size: sideways ? 56 : 64)
                                        Text(langName(l)).font(.footnote.weight(.semibold)).foregroundStyle(Palette.ink)
                                    }
                                    .padding(sideways ? 6 : 10)
                                    .frame(maxWidth: .infinity)
                                    .background(tint(l), in: .rect(cornerRadius: 14))
                                }
                                .buttonStyle(.plain)
                                .disabled(answered != nil)
                            }
                        }
                        .padding(.horizontal)
                        .frame(maxWidth: .infinity)
                        if !sideways, answered != nil {
                            Button("Next") { deal() }.buttonStyle(D8Primary(compact: true))
                        }
                    }
                } else {
                    Text("Start a language set in Learn to play.").foregroundStyle(Palette.muted)
                }
            }
            .padding(.vertical, sideways ? 8 : 20)
            .frame(maxWidth: .infinity)
        }
        .paper()
        .navigationTitle("Flags")
        .inlineTitle()
        .task(id: langs.gameWords.count) {
            await langs.load()
            if round == nil { deal() }
        }
    }

    func tint(_ l: String) -> Color {
        guard let answered, let round else { return Palette.card }
        if round.isRight(l) { return D8.malachite.opacity(0.25) }
        return l == answered ? D8.vermilion.opacity(0.25) : Palette.card
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
        guard let round else { return }
        answered = l
        played += 1
        if round.isRight(l) {
            score += 1
            haptic(true)
        } else {
            haptic(false)
        }
    }
}
