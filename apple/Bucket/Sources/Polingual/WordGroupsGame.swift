import BucketKit
import SwiftUI

@MainActor
enum WordGroupsCache {
    static var key = ""
    static var puzzle: WordGroupsPuzzle?
    static var skipped = ""
}

extension LangStore {
    var wordGroupsKey: String? {
        dailySystem.map { WordGroupsPuzzle.boardKey(day: playDayKey(), root: $0.root, targets: gameLangs) }
    }

    var wordGroupsPuzzle: WordGroupsPuzzle? {
        guard let system = dailySystem, let corpus, let board = wordGroupsKey else { return nil }
        if board == WordGroupsCache.key { return WordGroupsCache.puzzle }
        if let stored = WordGroupsRecord.board(board) { return remember(stored, board) }
        let words = gameWords
        let tried = "\(board)#\(GameWordCache.key)"
        if tried == WordGroupsCache.skipped { return nil }
        let day = playDayKey()
        guard let puzzle = WordGroupsPuzzle.daily(words, day: day, root: system.root, targets: gameLangs, theme: { corpus.byId[$0.itemId]?.category }, sameForm: { w, l in corpus.byId[w.itemId]?.form(l)?.lowercased() == w.form.lowercased() }) else {
            WordGroupsCache.skipped = tried
            return nil
        }
        WordGroupsRecord.store(puzzle, board)
        return remember(puzzle, board)
    }

    func remember(_ puzzle: WordGroupsPuzzle, _ board: String) -> WordGroupsPuzzle {
        WordGroupsCache.key = board
        WordGroupsCache.puzzle = puzzle
        return puzzle
    }
}

enum WordGroupsRecord {
    static func decode<T: Decodable>(_ type: T.Type, _ key: String) -> T? {
        UserDefaults.standard.data(forKey: key).flatMap { try? JSONDecoder().decode(type, from: $0) }
    }

    static func encode(_ value: some Encodable, _ key: String) {
        if let data = try? JSONEncoder().encode(value) { UserDefaults.standard.set(data, forKey: key) }
    }

    static func board(_ board: String) -> WordGroupsPuzzle? { decode(WordGroupsPuzzle.self, "groups.board.\(board)") }

    static func store(_ puzzle: WordGroupsPuzzle, _ board: String) { encode(puzzle, "groups.board.\(board)") }

    static func load(_ board: String) -> WordGroupsSave? { decode(WordGroupsSave.self, "groups.save.\(board)") }

    static func save(_ save: WordGroupsSave, _ board: String) { encode(save, "groups.save.\(board)") }
}

extension WordGroup {
    static func theme(_ name: String) -> String {
        switch name {
        case "adjective": String(localized: "Adjectives")
        case "animal": String(localized: "Animals")
        case "body": String(localized: "Body")
        case "color": String(localized: "Colors")
        case "family": String(localized: "Family")
        case "food": String(localized: "Food")
        case "nature": String(localized: "Nature")
        case "number": String(localized: "Numbers")
        case "object": String(localized: "Objects")
        case "time": String(localized: "Time")
        case "verb": String(localized: "Verbs")
        default: name.capitalized
        }
    }

    var label: String {
        switch link {
        case .language(let lang): langName(lang)
        case .theme(let name): Self.theme(name)
        case .languageTheme(let lang, let name): "\(langName(lang)): \(Self.theme(name))"
        }
    }
}

struct WordGroupsGame: View {
    @Environment(LangStore.self) private var langs
    @Environment(Reminders.self) private var reminders
    @State private var round: WordGroupsRound?
    @State private var closed: WordGroupsSave?
    @State private var practice = PracticeRound()
    @State private var note: String?
    @State private var shakes = 0
    @State private var rng = SeededRandom(seed: UInt64(Date().timeIntervalSince1970))

    @State private var board: String?
    @State private var feel = GameFeel()
    @State private var streak = ComboCount()
    @State private var credit: GameCredit?
    @State private var runId = UUID().uuidString
    @Environment(\.accessibilityReduceMotion) private var systemReduce

    static let colors = [PL.malachite, PL.lapis, PL.vermilion, PL.ochreDeep]

    var body: some View {
        GameShell(game: .wordGroups, feel: feel) {
            if let closed {
                end(closed)
            } else if let round {
                board(round)
            } else {
                PLCard { GameWaiting(message: String(localized: "Study a few more words and tomorrow's Word Groups opens.")) }
            }
        }
        .screenShareQuiet()
        .task(id: langs.status) {
            await langs.load()
            guard round == nil, closed == nil else { return }
            guard let key = langs.wordGroupsKey else { return }
            board = key
            let saved = GameLaunch.freshDaily ? nil : WordGroupsRecord.load(key)
            if let saved, saved.finished {
                closed = saved
                round = langs.wordGroupsPuzzle.map { WordGroupsRound($0, resuming: saved) }
            } else if let puzzle = langs.wordGroupsPuzzle {
                round = saved.map { WordGroupsRound(puzzle, resuming: $0) } ?? WordGroupsRound(puzzle)
                Beta.shared.studyStarted("game:\(GameKind.wordGroups.rawValue)")
            }
        }
    }

    func board(_ r: WordGroupsRound) -> some View {
        VStack(spacing: PL.Space.s3) {
            HStack {
                Text(note ?? String(localized: "Pick four that belong together."))
                    .font(PL.small.font()).foregroundStyle(note == nil ? PL.paper.opacity(0.85) : PL.ochre)
                    .accessibilityIdentifier("groups.note")
                Spacer(minLength: 0)
                ComboChip(streak: streak, multiplier: false)
            }
            ForEach(r.solved) { banner($0, r.puzzle) }
            LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 8), count: 4), spacing: 8) {
                ForEach(r.tiles) { tile($0, on: r.selected.contains($0.id)) }
            }
            .gameShake(shakes)
            mistakes(r)
            HStack(spacing: PL.Space.s2) {
                Button("Shuffle") { shuffle() }.buttonStyle(.pl(.ghost, size: .md))
                Button("Deselect") { round?.clear() }.buttonStyle(.pl(.ghost, size: .md)).disabled(r.selected.isEmpty)
                Button("Submit") { submit() }.buttonStyle(.pl(.primary, size: .md)).disabled(!r.canSubmit).accessibilityIdentifier("groups.submit")
            }
            .lineLimit(1).minimumScaleFactor(0.7)
        }
        .frame(maxWidth: 520)
        .frame(maxWidth: .infinity)
    }

    func tile(_ word: GameWord, on: Bool) -> some View {
        Button {
            tap()
            note = nil
            round?.toggle(word.id)
        } label: {
            Text(word.form).font(.system(size: 16, weight: .heavy, design: .rounded))
                .foregroundStyle(on ? PL.paper : PL.ink)
                .lineLimit(1).minimumScaleFactor(0.45)
                .padding(.horizontal, 4)
                .frame(maxWidth: .infinity, minHeight: 68)
        }
        .buttonStyle(D8Option(selected: on, align: .center, compact: true))
        .accessibilityAddTraits(on ? .isSelected : [])
        .accessibilityIdentifier("groups.tile")
    }

    func banner(_ group: WordGroup, _ puzzle: WordGroupsPuzzle) -> some View {
        let index = puzzle.groups.firstIndex(of: group) ?? 0
        return VStack(spacing: 2) {
            Text(group.label).font(PL.heading.font(scale: 0.75)).foregroundStyle(PL.paper)
            Text(group.words.map(\.form).joined(separator: ", ")).font(PL.small.font()).foregroundStyle(PL.paper.opacity(0.9))
                .lineLimit(2).minimumScaleFactor(0.6).multilineTextAlignment(.center)
        }
        .padding(10)
        .frame(maxWidth: .infinity)
        .background(Self.colors[index % Self.colors.count], in: .rect(cornerRadius: PL.Radius.md))
        .accessibilityElement(children: .combine)
    }

    func mistakes(_ r: WordGroupsRound) -> some View {
        HStack(spacing: 6) {
            Text("Mistakes left").font(PL.label.font()).textCase(.uppercase).foregroundStyle(PL.paper.opacity(0.85))
            ForEach(0..<WordGroupsPuzzle.mistakes, id: \.self) { i in
                Circle().fill(i < r.mistakesLeft ? PL.vermilion : PL.paper.opacity(0.25)).frame(width: 10, height: 10)
            }
        }
        .accessibilityElement()
        .accessibilityLabel(Text("\(r.mistakesLeft) mistakes left"))
    }

    func end(_ save: WordGroupsSave) -> some View {
        let total = WordGroupsPuzzle.groupCount
        let solved = save.solved.count
        let score = String(localized: "\(solved) of \(total) groups")
        let missed = round?.unsolved.flatMap(\.words) ?? []
        return VStack(spacing: PL.Space.s3) {
            if let round, Set(round.solved.map(\.id)) == Set(save.solved) {
                VStack(spacing: PL.Space.s2) {
                    ForEach(round.solved + round.unsolved) { banner($0, round.puzzle) }
                }
            }
            GameResults(title: score,
                        line: practice.score.map(PracticeLine.text) ?? (save.misses == 0 ? String(localized: "No mistakes. New board tomorrow.") : String(localized: "New board tomorrow.")),
                        reveals: missed.prefix(5).map { PlayRevealItem(lang: $0.lang, form: $0.form, meaning: $0.gloss) },
                        root: missed.first?.root ?? langs.playRoot,
                        share: (.wordGroups, .groups(order: GameShare.groupOrder(solved: save.solved, groups: round?.puzzle.groups.map(\.id) ?? []), attempts: save.results, total: total)),
                        retry: round.map { r in (.wordGroups, nil, { retry(r.puzzle) }) },
                        results: save.results,
                        stars: GameStars.rating(hits: solved, total: total),
                        credit: credit,
                        extra: AnyView(ShareObjectButton(langs.gameScore(GameKind.wordGroups.title, right: solved, total: total), wide: true)),
                        again: nil)
        }
        .frame(maxWidth: 520)
        .frame(maxWidth: .infinity)
    }

    func shuffle() {
        tap()
        note = nil
        round?.shuffle(using: &rng)
    }

    func submit() {
        guard var r = round else { return }
        let outcome = r.submit()
        round = r
        note = nil
        switch outcome {
        case .solved:
            streak.hit()
            feel.right(streak, points: 4)
        case .oneAway:
            note = String(localized: "One away")
            miss()
        case .miss: miss()
        case .repeated: note = String(localized: "Already tried")
        case .ignored: return
        }
        if let board, !practice.practicing { WordGroupsRecord.save(r.save, board) }
        if r.finished { finish(r) }
    }

    func miss() {
        streak.miss()
        feel.wrong(streak)
        if !GameMotion.reduced(system: systemReduce) { shakes += 1 }
    }

    func retry(_ puzzle: WordGroupsPuzzle) {
        practice.begin()
        streak = ComboCount()
        note = nil
        round = WordGroupsRound(puzzle)
        closed = nil
    }

    func finish(_ r: WordGroupsRound) {
        if practice.practicing {
            _ = practice.finish(score: String(localized: "\(r.solved.count) of \(WordGroupsPuzzle.groupCount) groups"))
            guard let board, let saved = WordGroupsRecord.load(board) else { return }
            round = WordGroupsRound(r.puzzle, resuming: saved)
            withAnimation(.spring(duration: 0.35)) { closed = saved }
            return
        }
        let solved = r.solved.flatMap(\.words)
        credit = langs.recordRun(runId, .wordGroups, played: r.puzzle.tiles, hits: solved.count, points: nil, missed: r.unsolved.flatMap(\.words))?.credit
        reminders.noteStudy()
        withAnimation(.spring(duration: 0.35)) { closed = r.save }
    }
}
