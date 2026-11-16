import BucketKit
import SwiftUI

struct PolywordGame: View {
    @Environment(LangStore.self) private var langs
    @AppStorage("polingual.polyword.games") private var saved = ""
    @State private var lang = ""
    @State private var typed = ""
    @State private var problem: String?
    @State private var shake = 0
    @State private var recorded = false

    var bank: PolywordBank? { PlayAssets.bank }
    var day: Int { Polyword.dayNumber(localPolyDate()) }
    var puzzle: PolyPuzzle? { bank.flatMap { Polyword.puzzleFor($0, lang: lang, day: day) } }
    var key: String { "\(lang)#\(day)" }

    var store: [String: [String]] {
        var out: [String: [String]] = [:]
        for row in saved.split(separator: "\n") {
            let parts = row.split(separator: "=", maxSplits: 1).map(String.init)
            if parts.count == 2 { out[parts[0]] = parts[1].split(separator: ",").map(String.init) }
        }
        return out
    }

    var guesses: [String] { store[key] ?? [] }

    func save(_ g: [String]) {
        var s = store
        s[key] = g
        saved = s.keys.sorted().suffix(60).map { "\($0)=\(s[$0]!.joined(separator: ","))" }.joined(separator: "\n")
    }

    var body: some View {
        PlayScene(game: .polyword, stickers: playStickers(.streakFlame, .ticket)) {
            if let bank, let puzzle {
                langPicker(bank)
                if Polyword.finished(guesses, puzzle.answer) || PlayLaunch.endGame { results(bank, puzzle) } else { board(puzzle) }
            } else {
                PlayNote(text: "Polyword has no word for your languages yet.")
            }
        }
        .task {
            await langs.load()
            if lang.isEmpty, let bank { lang = langs.playTargets.first { bank.langs[$0] != nil } ?? bank.targets.first ?? "es" }
        }
    }

    func langPicker(_ bank: PolywordBank) -> some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: PL.Space.s2) {
                ForEach(bank.targets, id: \.self) { l in
                    Button { lang = l; typed = "" } label: { PLPill(Lang.name(l), active: l == lang) }.buttonStyle(.plain)
                }
            }
        }
    }

    func board(_ p: PolyPuzzle) -> some View {
        let marks = Polyword.keyMarks(guesses, p.answer)
        let size = p.answer.count
        return VStack(alignment: .leading, spacing: PL.Space.s3) {
            PlayLabel(text: "\(Lang.name(lang)) · #\(day) · \(size) letters")
            ForEach(0..<Polyword.maxGuesses, id: \.self) { row in
                HStack(spacing: PL.Space.s1) {
                    let word = row < guesses.count ? guesses[row] : row == guesses.count ? typed : ""
                    let score = row < guesses.count ? Polyword.score(word, p.answer) : []
                    let chars = Array(word)
                    ForEach(0..<size, id: \.self) { i in
                        Text(i < chars.count ? String(chars[i]).uppercased() : " ")
                            .font(PL.heading.font())
                            .foregroundStyle(i < score.count ? PL.paper : PL.ink)
                            .frame(maxWidth: .infinity, minHeight: 48)
                            .background(i < score.count ? color(score[i]) : PL.card, in: .rect(cornerRadius: 8))
                    }
                }
                .modifier(row == guesses.count ? AnyShake(trigger: shake) : AnyShake(trigger: 0))
            }
            ForEach(Polyword.revealedHints(p.hints, answer: p.answer, guesses: guesses), id: \.lang) { h in
                HStack(spacing: PL.Space.s2) {
                    PlayFlag(lang: h.lang, size: 28)
                    Text(h.word).font(PL.body.font()).foregroundStyle(PL.paper)
                    if let r = h.roman { Text(r).font(PL.small.font()).foregroundStyle(PL.paper.opacity(0.8)) }
                }
            }
            if let problem { Text(problem).font(PL.small.font()).foregroundStyle(PL.ochre) }
            keyboard(marks, size: size, answer: p.answer)
        }
    }

    func keyboard(_ marks: [Character: PolyMark], size: Int, answer: String) -> some View {
        let rows = ["qwertyuiop", "asdfghjkl", "zxcvbnm"]
        return VStack(spacing: PL.Space.s1) {
            ForEach(rows, id: \.self) { row in
                HStack(spacing: PL.Space.s1) {
                    ForEach(Array(row), id: \.self) { ch in
                        Button(String(ch).uppercased()) { if typed.count < size { typed.append(ch); problem = nil } }
                            .buttonStyle(.pl(variant(marks[ch]), size: .sm, full: true))
                    }
                }
            }
            HStack(spacing: PL.Space.s2) {
                Button("Delete") { if !typed.isEmpty { typed.removeLast() } }.buttonStyle(.pl(.quiet, size: .md))
                Button("Enter") { submit(answer) }.buttonStyle(.pl(.primary, size: .md)).disabled(typed.count != size)
            }
        }
    }

    func submit(_ answer: String) {
        switch Polyword.checkGuess(typed, answer: answer, previous: guesses) {
        case .bad(let why):
            problem = why == "repeat" ? "You tried that word already." : why == "short" ? "Fill every letter first." : "Use letters only."
            shake += 1
        case .ok(let g):
            save(guesses + [g])
            typed = ""
            PlaySound.effect(g == answer)
        }
    }

    func results(_ bank: PolywordBank, _ p: PolyPuzzle) -> some View {
        let won = Polyword.solved(guesses, p.answer)
        let meaning = Polyword.meaningIn(bank, slug: p.slug, gloss: p.gloss, root: langs.playRoot)
        return PlayResults(
            title: won ? "Solved in \(guesses.count)" : "Out of guesses",
            line: "A new word arrives tomorrow.",
            reveals: [PlayRevealItem(lang: p.lang, form: p.word, meaning: meaning.text)],
            root: meaning.lang,
            again: nil
        )
        .onAppear {
            guard !recorded, Polyword.finished(guesses, p.answer) else { return }
            recorded = true
            langs.recordPlay(.polyword, [PlayedWord(itemId: p.slug, lang: p.lang, form: p.word, gloss: p.gloss, right: won)], points: won ? Polyword.maxGuesses + 1 - guesses.count : 0)
        }
    }

    func color(_ m: PolyMark) -> Color {
        switch m {
        case .hit: PL.malachite
        case .near: PL.ochre
        case .miss: PL.inkFaint
        }
    }

    func variant(_ m: PolyMark?) -> PLButtonVariant {
        switch m {
        case .hit: .success
        case .near: .gold
        case .miss: .quiet
        case nil: .ghost
        }
    }
}

struct AnyShake: ViewModifier {
    let trigger: Int

    func body(content: Content) -> some View { content.gameShake(trigger) }
}
