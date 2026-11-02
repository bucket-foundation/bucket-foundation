import BucketKit
import SwiftUI

enum GameKind: String, CaseIterable, Identifiable, Hashable {
    case daily, mini, wordGroups, same, match, voice, flags, letters

    var id: String { rawValue }

    var title: String {
        switch self {
        case .daily: String(localized: "Daily Set")
        case .mini: String(localized: "Mini")
        case .wordGroups: String(localized: "Word Groups")
        case .same: String(localized: "Same Word")
        case .match: String(localized: "Speed Match")
        case .voice: String(localized: "Which Voice")
        case .flags: String(localized: "Flags")
        case .letters: String(localized: "Letter Sprint")
        }
    }

    var detail: String {
        switch self {
        case .daily: String(localized: "Six words. The same six for everyone on your languages today.")
        case .mini: String(localized: "A small crossword in your language. New every day.")
        case .wordGroups: String(localized: "Sort sixteen of your words into four groups. New every day.")
        case .same: String(localized: "One meaning across your languages.")
        case .match: String(localized: "Pair words against a 60 second clock.")
        case .voice: String(localized: "Listen, then pick the flag.")
        case .flags: String(localized: "Read a word, then pick its flag.")
        case .letters: String(localized: "Hear a sound, then find its letter.")
        }
    }

    var symbol: String {
        switch self {
        case .daily: "calendar"
        case .mini: "square.grid.3x3.fill"
        case .wordGroups: "square.grid.4x3.fill"
        case .same: "square.stack.3d.up.fill"
        case .match: "bolt.fill"
        case .voice: "waveform"
        case .flags: "flag.fill"
        case .letters: "character"
        }
    }

    var color: Color {
        switch self {
        case .daily, .voice, .wordGroups: D8.lapis
        case .same, .letters, .mini: D8.vermilion
        case .match, .flags: D8.malachite
        }
    }

    var lip: Color {
        switch self {
        case .daily, .voice, .wordGroups: Color(hex: 0x12326A)
        case .same, .letters, .mini: D8.vermilionLip
        case .match, .flags: D8.malachiteLip
        }
    }

    @MainActor @ViewBuilder var screen: some View {
        switch self {
        case .daily, .same, .voice, .flags: QuizGame(kind: self).fullHeightSession()
        case .match: SpeedMatchGame().fullHeightSession()
        case .letters: LetterSprintGame().fullHeightSession()
        case .mini: MiniGame().fullHeightSession()
        case .wordGroups: WordGroupsGame().fullHeightSession()
        }
    }
}

struct TileRow: View {
    let symbol: String
    let title: String
    let detail: String
    var color = D8.lapis

    var body: some View {
        HStack(spacing: 14) {
            Image(systemName: symbol)
                .font(.title2)
                .foregroundStyle(D8.parchment)
                .frame(width: 48, height: 48)
                .background(color, in: .rect(cornerRadius: 12))
            VStack(alignment: .leading, spacing: 2) {
                Text(title).font(.headline).foregroundStyle(Palette.ink)
                Text(detail).font(.footnote).foregroundStyle(Palette.muted)
            }
        }
        .padding(.vertical, 4)
        .frame(maxWidth: .infinity, alignment: .leading)
        .contentShape(.rect)
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
        let learned = GameWords.learned(systems, states: states, corpus: corpus, now: Date().timeIntervalSince1970 * 1000)
        if learned.count >= 8 { return learned }
        let have = Set(learned.map(\.id))
        return learned + GameWords.starter(systems, corpus: corpus).filter { !have.contains($0.id) }
    }

    var gameLangs: [String] {
        var seen = Set<String>()
        return systems.flatMap(\.targets).filter { seen.insert($0).inserted }
    }

    var dailySystem: LangSystem? { systems.first }
    var sameWordSystem: LangSystem? { systems.first { $0.targets.count >= 2 } }

    var gameStreak: Int {
        let now = Date().timeIntervalSince1970 * 1000
        return Int(systems.map { liveStreak(state($0.id), now: now) }.max() ?? 0)
    }

    var hasLetterGame: Bool {
        var rng = SeededRandom(seed: 1)
        return GameLetters.deal(systems, states: states, now: 0, count: 4, using: &rng).count >= 4
    }

    @discardableResult
    func recordGame(_ kind: GameKind, played: [GameWord], hits: Int, points: Int?, missed: [GameWord], pattern: String? = nil) -> Bool {
        let before = gameBest(kind.rawValue)
        let touched = kind == .daily ? [dailySystem].compactMap { $0 } : systems.filter { s in played.contains { $0.root == s.root && s.targets.contains($0.lang) } }
        for s in touched {
            let mine = missed.filter { $0.root == s.root && s.targets.contains($0.lang) }
            let carded = mine.filter { state(s.id).cards.started($0.id) }
            finishGame(s.id, GameResult(game: kind.rawValue, points: points, hits: hits, missed: carded.map(\.id), dailyPattern: pattern, countsForGroup: s.id == touched.first?.id))
            for w in mine where !carded.contains(w) && !w.itemId.hasPrefix("abc:") { WantedWords.add(w.itemId, to: s.id) }
        }
        Beta.shared.studyEnded("game:\(kind.rawValue)", graded: hits + missed.count, correct: hits)
        TodayPlanStore.shared.finish(TodayItem.game(kind).id)
        guard let points, let before else { return false }
        return points > before
    }
}

struct GamesView: View {
    @Environment(LangStore.self) private var langs
    var embedded = false
    @State private var open: GameKind?

    var body: some View {
        if embedded {
            page
        } else {
            NavigationStack { page }
        }
    }

    var page: some View {
        ScrollView {
            GamesBoard { open = $0 }.padding()
        }
        .paper()
        .navigationTitle("Games")
        .navigationDestination(item: $open) { $0.screen }
        .task {
            await langs.load()
            #if DEBUG
            let args = ProcessInfo.processInfo.arguments
            if let i = args.firstIndex(of: "-openGame"), i + 1 < args.count { open = GameKind(rawValue: args[i + 1]) }
            #endif
        }
    }
}

struct GamesBoard: View {
    @Environment(LangStore.self) private var langs
    @Environment(GroupStore.self) private var groups
    let open: (GameKind) -> Void

    var body: some View {
        VStack(spacing: 16) {
            if langs.systems.isEmpty && (langs.status == .idle || langs.status == .loading) {
                ProgressView().frame(maxWidth: .infinity).padding(.top, 60)
            } else if langs.systems.isEmpty {
                Text("Start a language set in Learn. The games use the words you study.")
                    .foregroundStyle(Palette.muted)
                    .padding(.top, 60)
            } else {
                DailyHero(open: { open(.daily) })
                ForEach(groups.groups.compactMap { GroupQuest($0) }, id: \.group.id) { QuestCard(quest: $0) }
                LazyVGrid(columns: [GridItem(.adaptive(minimum: 150), spacing: 14)], spacing: 14) {
                    ForEach(GameKind.allCases.filter { $0 != .daily }) { kind in
                        if available(kind) || kind == .same {
                            GameTile(kind: kind, enabled: available(kind), open: { open(kind) })
                        }
                    }
                }
                Text("\(langs.gameWords.count) words from your reviews. A finished game keeps your streak. Misses come back in study.")
                    .font(.footnote)
                    .foregroundStyle(Palette.muted)
                    .frame(maxWidth: .infinity, alignment: .leading)
            }
        }
        .task { await groups.load() }
    }

    func available(_ kind: GameKind) -> Bool {
        switch kind {
        case .mini: langs.miniPuzzle != nil
        case .wordGroups: langs.wordGroupsPuzzle != nil
        case .same: langs.sameWordSystem != nil
        case .letters: langs.hasLetterGame
        default: true
        }
    }
}

struct GameLip: ViewModifier {
    let face: Color
    let lip: Color
    var radius: CGFloat = 18

    func body(content: Content) -> some View {
        content
            .background(face, in: .rect(cornerRadius: radius))
            .background(lip, in: .rect(cornerRadius: radius).offset(y: 5))
            .padding(.bottom, 5)
    }
}

let learnColumns = [GridItem(.adaptive(minimum: 150), spacing: 14)]

struct LearnTile<Mark: View>: View {
    let title: String
    let detail: String
    let face: Color
    var lip: Color?
    var item: TodayItem?
    let open: () -> Void
    @ViewBuilder let mark: () -> Mark

    var body: some View {
        Button(action: open) {
            VStack(alignment: .leading, spacing: 6) {
                mark().frame(height: 34)
                Text(title).font(D8.word(19)).foregroundStyle(D8.parchment).lineLimit(1).minimumScaleFactor(0.7)
                Text(detail).font(.footnote.weight(.medium)).foregroundStyle(D8.parchment.opacity(0.85))
                    .lineLimit(2, reservesSpace: true)
                    .multilineTextAlignment(.leading)
            }
            .padding(14)
            .frame(maxWidth: .infinity, alignment: .leading)
            .modifier(GameLip(face: face, lip: lip ?? face.mix(with: .black, by: 0.3)))
        }
        .buttonStyle(.plain)
        .overlay(alignment: .topTrailing) {
            if let item { AddToToday(item: item, look: .icon, color: D8.parchment).padding(8) }
        }
    }
}

struct LearnSymbol: View {
    let name: String

    var body: some View {
        Image(systemName: name).font(.system(size: 26, weight: .bold)).foregroundStyle(D8.parchment)
    }
}

struct VoiceTile: View {
    let open: () -> Void

    var body: some View {
        Button(action: open) {
            HStack(spacing: 16) {
                Image(systemName: "mic.fill").font(.system(size: 34, weight: .bold)).foregroundStyle(D8.vermilion)
                    .frame(width: 68, height: 68).background(D8.parchment, in: .circle)
                VStack(alignment: .leading, spacing: 3) {
                    Text("Translate").font(D8.word(24)).foregroundStyle(D8.parchment)
                    Text("Tap and speak").font(.subheadline.weight(.semibold)).foregroundStyle(D8.parchment.opacity(0.9))
                }
                Spacer(minLength: 0)
            }
            .padding(14)
            .modifier(GameLip(face: D8.vermilion, lip: D8.vermilionLip))
        }
        .buttonStyle(.plain)
        .accessibilityIdentifier("voiceTile")
    }
}

struct VoiceCircle: View {
    let open: () -> Void

    var body: some View {
        Button(action: open) {
            Image(systemName: "mic.fill").font(.system(size: 34, weight: .bold)).foregroundStyle(.white)
                .frame(width: 84, height: 84)
                .background(D8.vermilion, in: .circle)
                .background(D8.vermilionLip, in: .circle.offset(y: 5))
                .padding(.bottom, 5)
        }
        .buttonStyle(.plain)
        .frame(maxWidth: .infinity)
        .accessibilityLabel(Text("Translate"))
        .accessibilityIdentifier("voiceTile")
    }
}

struct TranslateScreen: View {
    var body: some View {
        List {
            Section { TranslateCard() }
                .listRowBackground(Palette.card)
        }
        .paper()
        .navigationTitle("Translate")
        .inlineTitle()
    }
}

struct DailyHero: View {
    @Environment(LangStore.self) private var langs
    let open: () -> Void

    var body: some View {
        let system = langs.dailySystem
        let played = system.flatMap { langs.gameDaily($0.id) }
        Button(action: open) {
            VStack(alignment: .leading, spacing: 12) {
                HStack(spacing: -8) {
                    ForEach(system?.targets.prefix(6) ?? [], id: \.self) { FlagTile(lang: $0, size: 44) }
                    Spacer(minLength: 0)
                }
                Text(GameKind.daily.title).font(D8.word(30)).foregroundStyle(D8.parchment)
                if let played {
                    GamePips(total: GameRounds.dailyLength, results: played.map { $0 == "1" })
                    Text("\(played.filter { $0 == "1" }.count) of \(GameRounds.dailyLength) today. See your result.")
                        .font(.subheadline.weight(.semibold)).foregroundStyle(D8.parchment.opacity(0.85))
                } else {
                    Text(GameKind.daily.detail).font(.subheadline.weight(.semibold)).foregroundStyle(D8.parchment.opacity(0.85))
                        .fixedSize(horizontal: false, vertical: true)
                    Text("Play today's set")
                        .font(.system(size: 17, weight: .heavy, design: .rounded))
                        .foregroundStyle(D8.lapis)
                        .padding(.horizontal, 18).padding(.vertical, 10)
                        .background(D8.parchment, in: .capsule)
                }
            }
            .padding(18)
            .frame(maxWidth: .infinity, alignment: .leading)
            .modifier(GameLip(face: GameKind.daily.color, lip: GameKind.daily.lip))
        }
        .buttonStyle(.plain)
        .overlay(alignment: .topTrailing) {
            AddToToday(item: .game(.daily), look: .icon, color: D8.parchment).padding(10)
        }
    }
}

struct GameTile: View {
    @Environment(LangStore.self) private var langs
    let kind: GameKind
    let enabled: Bool
    let open: () -> Void

    var body: some View {
        Button(action: open) {
            VStack(alignment: .leading, spacing: 6) {
                Image(systemName: kind.symbol)
                    .font(.system(size: 26, weight: .bold))
                    .foregroundStyle(D8.parchment)
                    .frame(height: 34)
                Text(kind.title).font(D8.word(19)).foregroundStyle(D8.parchment).lineLimit(1).minimumScaleFactor(0.7)
                Text(enabled ? kind.detail : String(localized: "Add a second language to play."))
                    .font(.footnote.weight(.medium)).foregroundStyle(D8.parchment.opacity(0.85))
                    .lineLimit(3, reservesSpace: true)
                    .multilineTextAlignment(.leading)
                Text(langs.gameBest(kind.rawValue).flatMap { $0 > 0 ? String(localized: "Best \($0)") : nil } ?? " ")
                    .font(.caption.weight(.heavy).monospacedDigit()).foregroundStyle(D8.parchment)
            }
            .padding(14)
            .frame(maxWidth: .infinity, alignment: .leading)
            .modifier(GameLip(face: kind.color, lip: kind.lip))
            .opacity(enabled ? 1 : 0.55)
        }
        .buttonStyle(.plain)
        .disabled(!enabled)
        .overlay(alignment: .topTrailing) {
            AddToToday(item: .game(kind), look: .icon, color: D8.parchment).padding(8)
        }
    }
}

struct QuestCard: View {
    @Environment(GroupStore.self) private var groups
    let quest: GroupQuest
    @State private var sent: Set<String> = []

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(spacing: 8) {
                Image(systemName: quest.complete ? "checkmark.seal.fill" : "person.2.fill").foregroundStyle(quest.complete ? D8.malachite : D8.vermilion)
                Text("\(quest.group.name) quest").font(.headline).foregroundStyle(Palette.ink)
                Spacer(minLength: 0)
                Text("\(quest.done) of \(quest.target)").font(.subheadline.weight(.heavy).monospacedDigit()).foregroundStyle(Palette.ink)
            }
            ProgressView(value: quest.progress).tint(quest.complete ? D8.malachite : D8.vermilion)
            Text(quest.complete ? String(localized: "Quest done. New one Monday.") : String(localized: "Words this week. \(quest.active.count) of \(quest.group.members.count) playing."))
                .font(.footnote).foregroundStyle(Palette.muted)
            if !quest.complete {
                ForEach(quest.nudgeable.prefix(3)) { m in
                    HStack {
                        Text(m.name).font(.subheadline.weight(.semibold)).foregroundStyle(Palette.ink).lineLimit(1)
                        Spacer(minLength: 8)
                        Button(sent.contains(m.userId) ? String(localized: "Nudged") : String(localized: "Nudge")) { nudge(m) }
                            .buttonStyle(D8Option(align: .center, compact: true))
                            .disabled(sent.contains(m.userId))
                    }
                }
            }
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .modifier(GameLip(face: D8.face, lip: D8.edge))
    }

    func nudge(_ m: GroupMember) {
        sent.insert(m.userId)
        Task {
            _ = try? await groups.cheer(m, in: quest.group.id)
        }
    }
}

struct GamePips: View {
    let total: Int
    let results: [Bool]
    var empty: Color = D8.parchment.opacity(0.3)

    var body: some View {
        HStack(spacing: 6) {
            ForEach(0..<total, id: \.self) { i in
                RoundedRectangle(cornerRadius: 4)
                    .fill(i < results.count ? (results[i] ? D8.malachite : D8.vermilion) : empty)
                    .overlay { RoundedRectangle(cornerRadius: 4).strokeBorder(.white.opacity(i < results.count ? 0.4 : 0), lineWidth: 1) }
                    .frame(height: 12)
            }
        }
        .accessibilityElement()
        .accessibilityLabel(Text("\(results.filter { $0 }.count) of \(total)"))
    }
}

struct GameWaiting: View {
    @Environment(LangStore.self) private var langs
    var message = String(localized: "Study a few words in Learn first.")

    var body: some View {
        Group {
            if langs.status == .ready || langs.status == .error {
                Text(message).foregroundStyle(Palette.muted).multilineTextAlignment(.center)
            } else {
                ProgressView()
            }
        }
        .padding(.top, 60)
        .padding(.horizontal)
        .frame(maxWidth: .infinity)
    }
}

#if DEBUG
let gameEndForced = ProcessInfo.processInfo.arguments.contains("-endGame")
#else
let gameEndForced = false
#endif

extension LangStore {
    func gameScore(_ source: String, right: Int, total: Int) -> ShareObject {
        .score(ShareScore(source: source, right: right, total: total, langs: gameLangs, root: systems.first?.root ?? "en", streak: langStreak(self)))
    }
}

struct GameEnd: View {
    @Environment(LangStore.self) private var langs
    let kind: GameKind
    let score: String
    var line: String?
    var best = false
    var results: [Bool]?
    let missed: [GameWord]
    var cells: [[Bool]]?
    var share: AnyView?
    var shareObject: ShareObject?
    let again: (() -> Void)?

    var brag: String {
        let date = Date.now.formatted(.dateTime.month(.defaultDigits).day())
        return GameBrag.text(title: "\(Feedback.appName) \(kind.title)", day: date, score: score, results: results, cells: cells, link: Feedback.isPolingual ? "polingual.com" : "bucket.foundation")
    }

    var body: some View {
        VStack(spacing: 16) {
            VStack(spacing: 10) {
                Text(score).font(D8.word(44)).foregroundStyle(D8.parchment).monospacedDigit().minimumScaleFactor(0.6).lineLimit(1)
                if let line { Text(line).font(.subheadline.weight(.semibold)).foregroundStyle(D8.parchment.opacity(0.9)).multilineTextAlignment(.center) }
                if let results { GamePips(total: results.count, results: results) }
            }
            .padding(20)
            .frame(maxWidth: .infinity)
            .modifier(GameLip(face: kind.color, lip: kind.lip))
            if best {
                Label("New best", systemImage: "trophy.fill")
                    .font(.subheadline.weight(.heavy))
                    .foregroundStyle(.white)
                    .padding(.horizontal, 14).padding(.vertical, 7)
                    .background(D8.vermilion, in: .capsule)
                    .transition(.scale.combined(with: .opacity))
            }
            if langs.gameStreak > 0 {
                Label("\(langs.gameStreak) day streak", systemImage: "flame.fill")
                    .font(.headline).foregroundStyle(D8.vermilion)
            }
            if !missed.isEmpty {
                VStack(alignment: .leading, spacing: 8) {
                    Text("These come back in your next session").font(.caption.weight(.bold)).foregroundStyle(Palette.muted)
                    ForEach(missed.prefix(5)) { w in
                        HStack(spacing: 8) {
                            FlagTile(lang: w.lang, size: 22)
                            Text(w.form).font(.headline).foregroundStyle(Palette.ink).lineLimit(1).minimumScaleFactor(0.7)
                            Text(w.gloss).font(.subheadline).foregroundStyle(Palette.muted).lineLimit(1)
                            Spacer(minLength: 0)
                            PlayButton(text: w.form, lang: w.lang)
                        }
                    }
                }
                .padding(14)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(Palette.card, in: .rect(cornerRadius: 14))
            }
            ShareLink(item: brag, preview: SharePreview(kind.title)) {
                Label("Share your result", systemImage: "square.and.arrow.up").frame(maxWidth: .infinity)
            }
            .buttonStyle(D8Primary())
            if let share { share }
            if let shareObject { ShareObjectButton(shareObject, wide: true) }
            if let again { Button("Play again", action: again).buttonStyle(D8Primary(compact: true)) }
        }
        .padding()
        .frame(maxWidth: 520)
        .frame(maxWidth: .infinity)
    }
}
