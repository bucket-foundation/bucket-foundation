import BucketKit
import SwiftUI

struct ShiftGame: View {
    @Environment(LangStore.self) private var langs
    @State private var board: ShiftBoard?
    @State private var offsets: [Int] = []
    @State private var found: [String] = []
    @State private var hints: [String: Int] = [:]
    @State private var gaveUp = false
    @State private var root = "en"
    @State private var entered = false
    @State private var round = PracticeRound()
    @State private var day = PlayDecks.deckDay()
    @State private var racing = false

    var word: String { board.map { Shift.centerWord($0.columns, offsets) } ?? "" }
    var done: Bool { gaveUp || PlayLaunch.endGame || board.map { RevealRules.shift(found: found, targets: $0.targets) } ?? false }

    var body: some View {
        PlayScene(game: .shift) {
            if let board {
                if !entered && !round.practicing {
                    RecordedRound(kind: .shift, deck: day, practice: round.score, root: root) { retry(board) }
                } else if done {
                    results(board)
                } else {
                    play(board)
                }
            } else {
                ProgressView().tint(PL.paper)
            }
        }
        .task {
            let race = LobbyRace.seed
            await langs.load()
            guard board == nil, let corpus = langs.corpus else { return }
            root = langs.deckRoot(corpus)
            racing = race != nil
            day = LobbyRaceSeed.deckDay(race)
            entered = racing || !DailyLedger.shared.hasPlayed(.shift, deck: day)
            board = Shift.board(corpus.items, date: day, root: root)
            offsets = Array(repeating: 0, count: board?.length ?? 0)
        }
    }

    func play(_ b: ShiftBoard) -> some View {
        VStack(alignment: .leading, spacing: PL.Space.s4) {
            PlayLabel(text: b.langs.map(Lang.name).joined(separator: " · "))
            HStack(spacing: PL.Space.s2) {
                ForEach(0..<b.length, id: \.self) { i in
                    VStack(spacing: PL.Space.s1) {
                        Button { offsets = Shift.rotate(offsets, column: i, by: -1) } label: {
                            PLGlyphView(.chevronDown, size: 22).rotationEffect(.degrees(180)).foregroundStyle(PL.paper).frame(width: 44, height: 44)
                        }
                        .buttonStyle(.plain)
                        .accessibilityLabel("Column \(i + 1) up")
                        Text(Shift.centerWord([b.columns[i]], [offsets[i]]).uppercased())
                            .font(PL.title.font()).foregroundStyle(PL.ink)
                            .frame(maxWidth: .infinity, minHeight: 64)
                            .background(PL.card, in: .rect(cornerRadius: 10))
                        Button { offsets = Shift.rotate(offsets, column: i, by: 1) } label: {
                            PLGlyphView(.chevronDown, size: 22).foregroundStyle(PL.paper).frame(width: 44, height: 44)
                        }
                        .buttonStyle(.plain)
                        .accessibilityLabel("Column \(i + 1) down")
                    }
                }
            }
            Button("Check \(word.uppercased())") { check(b) }.buttonStyle(.pl(.primary, size: .lg))
            ForEach(b.langs, id: \.self) { lang in
                VStack(alignment: .leading, spacing: PL.Space.s1) {
                    PlayLabel(text: Lang.name(lang))
                    ForEach(b.targets.filter { $0.lang == lang }, id: \.form) { t in
                        HStack {
                            Text(found.contains(t.form) ? t.form : Shift.hintFor(t.form, revealed: hints[t.form] ?? 0))
                                .font(PL.heading.font()).foregroundStyle(found.contains(t.form) ? PL.malachite : PL.paper)
                            Spacer()
                            if !found.contains(t.form) {
                                Button("Hint") { hints[t.form, default: 0] += 1 }.buttonStyle(.pl(.ghost, size: .sm, full: false))
                            }
                        }
                    }
                }
            }
            Button("Show the answers") { gaveUp = true }.buttonStyle(.pl(.quiet, size: .md))
        }
    }

    func check(_ b: ShiftBoard) {
        let w = word
        guard let ls = b.valid[w], !found.contains(w) else { PlaySound.effect(false); return }
        found.append(w)
        PlaySound.effect(true, combo: found.count)
        if let l = ls.first { LangVoice.shared.speak(w, l) }
    }

    func retry(_ b: ShiftBoard) {
        round.begin()
        found = []
        hints = [:]
        gaveUp = false
        offsets = Array(repeating: 0, count: b.length)
    }

    func results(_ b: ShiftBoard) -> some View {
        let hit = b.targets.filter { found.contains($0.form) }.count
        let title = "\(hit) of \(b.targets.count) found"
        let shape = GameShare.Shape.marks(b.targets.map { found.contains($0.form) })
        return PlayResults(
            title: title,
            line: "\(found.count) words spelled. A new board arrives tomorrow.",
            reveals: b.targets.map { PlayRevealItem(lang: $0.lang, form: $0.form, meaning: $0.meaning) },
            root: root,
            share: round.practicing ? nil : (.shift, shape),
            retry: round.practicing || racing ? nil : (.shift, day, { retry(b) }),
            again: nil
        )
        .onAppear {
            let practicing = round.practicing
            let record = round.finish(score: title)
            if practicing { entered = false }
            guard record else { return }
            if !racing { DailyLedger.shared.markPlayed(.shift, deck: day, title: title, shape: shape) }
            let corpus = langs.corpus
            let words = b.targets.map { t in PlayedWord(itemId: corpus?.items.first { $0.form(t.lang)?.lowercased() == t.form }?.id ?? t.meaning, lang: t.lang, form: t.form, gloss: t.meaning, right: found.contains(t.form)) }
            langs.recordPlay(.shift, words, points: hit)
        }
    }
}
