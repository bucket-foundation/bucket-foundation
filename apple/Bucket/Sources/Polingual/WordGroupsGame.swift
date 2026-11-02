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
        dailySystem.map { WordGroupsPuzzle.boardKey(day: dayKey(Date().timeIntervalSince1970 * 1000), root: $0.root, targets: gameLangs) }
    }

    var wordGroupsPuzzle: WordGroupsPuzzle? {
        guard let system = dailySystem, let corpus, let board = wordGroupsKey else { return nil }
        if board == WordGroupsCache.key { return WordGroupsCache.puzzle }
        if let stored = WordGroupsRecord.board(board) { return remember(stored, board) }
        let words = gameWords
        let tried = "\(board)#\(GameWordCache.key)"
        if tried == WordGroupsCache.skipped { return nil }
        let day = dayKey(Date().timeIntervalSince1970 * 1000)
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
    @State private var note: String?
    @State private var shakes = 0
    @State private var rng = SeededRandom(seed: UInt64(Date().timeIntervalSince1970))

    @State private var board: String?

    static let colors = [D8.malachite, D8.lapis, D8.vermilion, Color(hex: 0xB0761A)]

    var body: some View {
        ScrollView {
            if let closed {
                end(closed)
            } else if let round {
                board(round)
            } else {
                GameWaiting(message: String(localized: "Study a few more words and tomorrow's Word Groups opens."))
            }
        }
        .gameChrome(GameKind.wordGroups.title, sideways: false)
        .task(id: langs.status) {
            await langs.load()
            guard round == nil, closed == nil else { return }
            guard let key = langs.wordGroupsKey else { return }
            board = key
            let saved = WordGroupsRecord.load(key)
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
        VStack(spacing: 12) {
            Text(note ?? String(localized: "Pick four that belong together."))
                .font(.subheadline.weight(.semibold)).foregroundStyle(note == nil ? Palette.muted : D8.vermilion)
                .accessibilityIdentifier("groups.note")
            ForEach(r.solved) { banner($0, r.puzzle) }
            LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 8), count: 4), spacing: 8) {
                ForEach(r.tiles) { tile($0, on: r.selected.contains($0.id)) }
            }
            .gameShake(shakes)
            mistakes(r)
            HStack(spacing: 8) {
                Button("Shuffle") { shuffle() }.buttonStyle(D8Option(align: .center, compact: true))
                Button("Deselect") { round?.clear() }.buttonStyle(D8Option(align: .center, compact: true)).disabled(r.selected.isEmpty)
                Button("Submit") { submit() }.buttonStyle(D8Primary(compact: true)).disabled(!r.canSubmit).accessibilityIdentifier("groups.submit")
            }
        }
        .padding()
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
                .foregroundStyle(on ? D8.parchment : Palette.ink)
                .lineLimit(1).minimumScaleFactor(0.45)
                .padding(.horizontal, 4)
                .frame(maxWidth: .infinity, minHeight: 68)
                .background(on ? D8.lapis : D8.face, in: .rect(cornerRadius: 10))
                .overlay { RoundedRectangle(cornerRadius: 10).strokeBorder(on ? D8.lapis : D8.edge, lineWidth: 2) }
        }
        .buttonStyle(.plain)
        .accessibilityAddTraits(on ? .isSelected : [])
        .accessibilityIdentifier("groups.tile")
    }

    func banner(_ group: WordGroup, _ puzzle: WordGroupsPuzzle) -> some View {
        let index = puzzle.groups.firstIndex(of: group) ?? 0
        return VStack(spacing: 2) {
            Text(group.label).font(.headline).foregroundStyle(D8.parchment)
            Text(group.words.map(\.form).joined(separator: ", ")).font(.subheadline.weight(.semibold)).foregroundStyle(D8.parchment.opacity(0.9))
                .lineLimit(2).minimumScaleFactor(0.6).multilineTextAlignment(.center)
        }
        .padding(10)
        .frame(maxWidth: .infinity)
        .background(Self.colors[index % Self.colors.count], in: .rect(cornerRadius: 10))
        .accessibilityElement(children: .combine)
    }

    func mistakes(_ r: WordGroupsRound) -> some View {
        HStack(spacing: 6) {
            Text("Mistakes left").font(.caption.weight(.bold)).foregroundStyle(Palette.muted)
            ForEach(0..<WordGroupsPuzzle.mistakes, id: \.self) { i in
                Circle().fill(i < r.mistakesLeft ? D8.vermilion : Palette.rule).frame(width: 10, height: 10)
            }
        }
        .accessibilityElement()
        .accessibilityLabel(Text("\(r.mistakesLeft) mistakes left"))
    }

    func end(_ save: WordGroupsSave) -> some View {
        let total = WordGroupsPuzzle.groupCount
        let solved = save.solved.count
        let score = String(localized: "\(solved) of \(total) groups")
        return VStack(spacing: 12) {
            if let round, Set(round.solved.map(\.id)) == Set(save.solved) {
                VStack(spacing: 8) {
                    ForEach(round.solved + round.unsolved) { banner($0, round.puzzle) }
                }
                .padding([.horizontal, .top])
            }
            GameEnd(kind: .wordGroups, score: score, line: save.misses == 0 ? String(localized: "No mistakes. New board tomorrow.") : String(localized: "New board tomorrow."), results: save.results, missed: round?.unsolved.flatMap(\.words) ?? [], shareObject: langs.gameScore(GameKind.wordGroups.title, right: solved, total: total), again: nil)
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
        case .solved: haptic(true)
        case .oneAway:
            note = String(localized: "One away")
            miss()
        case .miss: miss()
        case .repeated: note = String(localized: "Already tried")
        case .ignored: return
        }
        if let board { WordGroupsRecord.save(r.save, board) }
        if r.finished { finish(r) }
    }

    func miss() {
        haptic(false)
        shakes += 1
    }

    func finish(_ r: WordGroupsRound) {
        let solved = r.solved.flatMap(\.words)
        langs.recordGame(.wordGroups, played: r.puzzle.tiles, hits: solved.count, points: nil, missed: r.unsolved.flatMap(\.words))
        reminders.noteStudy()
        withAnimation(.spring(duration: 0.35)) { closed = r.save }
    }
}
