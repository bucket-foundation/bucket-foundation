import BucketKit
import SwiftUI

struct DuelGame: View {
    @Environment(LangStore.self) private var langs
    @State private var prompts: [GamePrompt] = []
    @State private var meanings: [[String]] = []
    @State private var index = 0
    @State private var step = 0
    @State private var pickedLang: String?
    @State private var pickedMeaning: String?
    @State private var points = 0
    @State private var marks: [Bool] = []
    @State private var recorded = false

    static let rounds = 10
    var prompt: GamePrompt? { index < prompts.count ? prompts[index] : nil }

    var body: some View {
        PlayScene(game: .duel, stickers: playStickers(.seal, .kente)) {
            if prompts.isEmpty {
                ProgressView().tint(PL.paper)
            } else if let prompt, !PlayLaunch.endGame {
                play(prompt)
            } else {
                results
            }
        }
        .task { await langs.load(); if prompts.isEmpty { deal() } }
    }

    func play(_ p: GamePrompt) -> some View {
        VStack(alignment: .leading, spacing: PL.Space.s3) {
            PlayLabel(text: "Round \(index + 1) of \(prompts.count) · \(points) points")
            PLCard {
                Text(p.word.form).font(PL.word.font(scale: 0.9)).foregroundStyle(PL.ink).lineLimit(2).minimumScaleFactor(0.5).frame(maxWidth: .infinity)
            }
            if step == 0 {
                PlayLabel(text: "Which language?")
                ForEach(p.choices, id: \.self) { l in
                    Button { pickLang(l, p) } label: {
                        HStack(spacing: PL.Space.s3) {
                            PlayFlag(lang: l, size: 32)
                            Text(Lang.name(l))
                        }
                    }
                    .buttonStyle(.pl(pickedLang == nil ? .ghost : l == p.answer ? .success : l == pickedLang ? .accent : .quiet, size: .md))
                    .disabled(pickedLang != nil)
                }
            } else {
                PlayLabel(text: "What does it mean in \(Lang.name(p.word.root))?")
                ForEach(meanings[index], id: \.self) { m in
                    PlayChoice(text: m, state: pickedMeaning == nil ? nil : m == p.word.gloss ? true : m == pickedMeaning ? false : nil) { pickMeaning(m, p) }
                        .disabled(pickedMeaning != nil)
                }
            }
            if pickedMeaning != nil {
                PlayReveal(lang: p.word.lang, form: p.word.form, meaning: p.word.gloss, root: p.word.root)
                Button(index + 1 < prompts.count ? "Next round" : "See results") { next() }.buttonStyle(.pl(.primary, size: .lg))
            }
        }
    }

    var results: some View {
        PlayResults(
            title: "\(points) points",
            line: "\(marks.filter { $0 }.count) of \(marks.count) rounds right on both questions.",
            reveals: Array(zip(prompts, marks).filter { !$0.1 }.map { PlayRevealItem(lang: $0.0.word.lang, form: $0.0.word.form, meaning: $0.0.word.gloss) }.prefix(6)),
            root: langs.playRoot,
            again: { deal() }
        )
        .onAppear {
            guard !recorded else { return }
            recorded = true
            langs.recordPlay(.duel, zip(prompts, marks).map { p, ok in PlayedWord(itemId: p.word.itemId, lang: p.word.lang, form: p.word.form, gloss: p.word.gloss, right: ok) }, points: points)
        }
    }

    func deal() {
        guard let corpus = langs.corpus else { return }
        var rng = SystemRandomNumberGenerator()
        let words = GameWords.ordered(langs.freshGameWords(corpus), using: &rng)
        let clash: (GameWord, String) -> Bool = { w, l in l != w.lang && corpus.byId[w.itemId]?.form(l)?.lowercased() == w.form.lowercased() }
        prompts = GameRounds.flags(words, own: langs.gameLangs, mode: .flag, count: Self.rounds, sameForm: clash, using: &rng)
        let glosses = Array(Set(words.map(\.gloss)))
        meanings = prompts.map { p in ([p.word.gloss] + glosses.filter { $0.lowercased() != p.word.gloss.lowercased() }.shuffled().prefix(3)).shuffled() }
        index = 0
        step = 0
        pickedLang = nil
        pickedMeaning = nil
        points = 0
        marks = []
        recorded = false
    }

    func pickLang(_ l: String, _ p: GamePrompt) {
        pickedLang = l
        let ok = l == p.answer
        if ok { points += 1 }
        PlaySound.effect(ok, combo: points)
        Task {
            try? await Task.sleep(for: .milliseconds(600))
            step = 1
        }
    }

    func pickMeaning(_ m: String, _ p: GamePrompt) {
        pickedMeaning = m
        let ok = m == p.word.gloss
        if ok { points += 1 }
        marks.append(ok && pickedLang == p.answer)
        PlaySound.effect(ok, combo: points)
    }

    func next() {
        index += 1
        step = 0
        pickedLang = nil
        pickedMeaning = nil
    }
}
