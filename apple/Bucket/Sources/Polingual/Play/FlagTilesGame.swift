import BucketKit
import SwiftUI

struct FlagTilesGame: View {
    @Environment(LangStore.self) private var langs
    @State private var deck: FlagTilesDeck?
    @State private var run = RunState()
    @State private var drop = false
    @State private var root = "en"

    var tile: FlagRunTile? { deck.flatMap { run.index < $0.tiles.count ? $0.tiles[run.index] : nil } }
    var answer: Int { tile.flatMap { t in deck?.langs.firstIndex(of: t.lang) } ?? -1 }

    var body: some View {
        PlayScene(game: .flagTiles, stickers: playStickers(.kente, .bunting)) {
            if let deck {
                switch run.phase {
                case .ready: ready(deck)
                case .running: field(deck)
                case .missed: missed(deck)
                case .over: results(deck)
                }
            } else {
                ProgressView().tint(PL.paper)
            }
        }
        .task {
            await langs.load()
            guard deck == nil, let corpus = langs.corpus else { return }
            root = langs.deckRoot(corpus)
            deck = FlagTilesRules.deck(corpus.items, date: PlayDecks.deckDay(), root: root)
            if PlayLaunch.endGame { run = RunState(phase: .over, index: 3, score: 3) }
        }
        .task(id: "\(run.index)-\(run.phase)") { await fall() }
    }

    func ready(_ deck: FlagTilesDeck) -> some View {
        VStack(alignment: .leading, spacing: PL.Space.s4) {
            PlayLabel(text: "Today's lanes")
            HStack(spacing: PL.Space.s3) { ForEach(deck.langs, id: \.self) { PlayFlag(lang: $0, size: 44) } }
            Text("A word falls. Tap the flag of its language before it lands. One miss ends the run; you may continue once.")
                .font(PL.body.font()).foregroundStyle(PL.paper)
            Button("Start") { run = FlagTilesRules.step(run, .start) }.buttonStyle(.pl(.primary, size: .lg))
        }
    }

    func field(_ deck: FlagTilesDeck) -> some View {
        VStack(spacing: PL.Space.s3) {
            HStack {
                PlayLabel(text: "Score \(run.score)")
                Spacer()
                PlayLabel(text: "Word \(run.index + 1)")
            }
            GeometryReader { geo in
                ZStack(alignment: .topLeading) {
                    if let tile {
                        PLCard {
                            Text(tile.form).font(PL.heading.font()).foregroundStyle(PL.ink).lineLimit(1).minimumScaleFactor(0.5)
                        }
                        .frame(width: min(geo.size.width * 0.7, 260))
                        .position(x: geo.size.width / 2, y: drop ? geo.size.height - 40 : 40)
                    }
                }
            }
            .frame(height: 360)
            HStack(spacing: PL.Space.s2) {
                ForEach(Array(deck.langs.enumerated()), id: \.offset) { i, l in
                    Button { tap(i) } label: {
                        VStack(spacing: PL.Space.s1) {
                            PlayFlag(lang: l, size: 48)
                            PlayLabel(text: Lang.name(l))
                        }
                        .frame(maxWidth: .infinity, minHeight: 80)
                    }
                    .buttonStyle(.plain)
                    .accessibilityLabel(Lang.name(l))
                }
            }
        }
    }

    func missed(_ deck: FlagTilesDeck) -> some View {
        let marks = FlagTilesRules.laneMarks(run, answer: answer)
        return VStack(alignment: .leading, spacing: PL.Space.s3) {
            Text(run.picked == nil ? "Too slow" : "Wrong lane").font(PL.title.font()).foregroundStyle(PL.paper)
            HStack(spacing: PL.Space.s2) {
                ForEach(Array(deck.langs.enumerated()), id: \.offset) { i, l in
                    VStack {
                        PlayFlag(lang: l, size: 40)
                        if let m = marks[i] { PLGlyphView(m ? .check : .close, size: 20).foregroundStyle(m ? PL.malachite : PL.vermilion) }
                    }
                    .frame(maxWidth: .infinity)
                }
            }
            if let tile, RevealRules.flagTiles(run) { PlayReveal(lang: tile.lang, form: tile.form, meaning: tile.meaning, root: root) }
            if !run.continued { Button("Continue once") { run = FlagTilesRules.step(run, .continue) }.buttonStyle(.pl(.primary, size: .lg)) }
            Button("End run") { run = FlagTilesRules.step(run, .end) }.buttonStyle(.pl(run.continued ? .primary : .ghost, size: .md))
        }
    }

    func results(_ deck: FlagTilesDeck) -> some View {
        let seen = Array(deck.tiles.prefix(min(deck.tiles.count, run.index + 1)))
        let missedIndex = run.missed
        return PlayResults(
            title: "\(run.score) words",
            line: "Same deck for everyone today. Come back tomorrow for new lanes.",
            reveals: playWords(seen.suffix(4).reversed().map { PlayRevealItem(lang: $0.lang, form: $0.form, meaning: $0.meaning) }),
            root: root,
            board: Boards.fromGhosts(FlagTilesRules.ghosts(date: deck.date), you: run.score),
            again: { run = FlagTilesRules.step(RunState(), .start) }
        )
        .onAppear {
            let words = seen.enumerated().map { i, t in PlayedWord(itemId: t.itemId, lang: t.lang, form: t.form, gloss: t.meaning, right: i != missedIndex) }
            langs.recordPlay(.flagTiles, words, points: run.score)
        }
    }

    func tap(_ lane: Int) {
        guard run.phase == .running else { return }
        let right = lane == answer
        run = FlagTilesRules.step(run, .tap(lane: lane, answer: answer))
        PlaySound.effect(right, combo: run.score)
        if run.phase == .running, run.index >= (deck?.tiles.count ?? 0) { run = FlagTilesRules.step(FlagTilesRules.step(run, .timeout), .end) }
    }

    func fall() async {
        guard run.phase == .running else { return }
        let ms = FlagTilesRules.fallMs(run.index)
        drop = false
        try? await Task.sleep(for: .milliseconds(30))
        withAnimation(.linear(duration: Double(ms) / 1000)) { drop = true }
        let index = run.index
        try? await Task.sleep(for: .milliseconds(ms))
        guard !Task.isCancelled, run.phase == .running, run.index == index else { return }
        PlaySound.effect(false)
        run = FlagTilesRules.step(run, .timeout)
    }
}
