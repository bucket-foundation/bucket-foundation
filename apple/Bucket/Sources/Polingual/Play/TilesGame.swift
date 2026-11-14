import BucketKit
import SwiftUI

struct TilesGame: View {
    @Environment(LangStore.self) private var langs
    @State private var rounds: [TileRound] = []
    @State private var index = 0
    @State private var startedAt: Date?
    @State private var tapped: Set<Int> = []
    @State private var lives = LobbyTiles.lives
    @State private var combo = 0
    @State private var points = 0
    @State private var outcome: TileOutcome?
    @State private var played: [(TileRound, Bool)] = []
    @State private var root = "en"
    @State private var recorded = false

    static let count = 10
    var round: TileRound? { index < rounds.count && lives > 0 ? rounds[index] : nil }

    var body: some View {
        PlayScene(game: .tiles, stickers: playStickers(.azulejoGrid, .scriptHe)) {
            if rounds.isEmpty {
                ProgressView().tint(PL.paper)
            } else if let round, !PlayLaunch.endGame {
                play(round)
            } else {
                results
            }
        }
        .task { await langs.load(); if rounds.isEmpty { deal() } }
        .task(id: "\(index)-\(startedAt?.timeIntervalSince1970 ?? 0)") { await clock() }
    }

    func play(_ r: TileRound) -> some View {
        VStack(alignment: .leading, spacing: PL.Space.s3) {
            HStack {
                PlayLabel(text: "Round \(index + 1) · \(points) points")
                Spacer()
                PlayLabel(text: String(repeating: "♥ ", count: lives))
            }
            PLCard(.lapis) {
                VStack(alignment: .leading, spacing: PL.Space.s1) {
                    PlayLabel(text: Lang.name(root))
                    Text(r.gloss).font(PL.heading.font()).foregroundStyle(PL.paper)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
            }
            if let outcome {
                Text(outcome.perfect ? "Perfect" : "\(outcome.hits) right, \(outcome.wrong) wrong, \(outcome.missed) missed")
                    .font(PL.heading.font()).foregroundStyle(outcome.perfect ? PL.malachite : PL.ochre)
                ForEach(r.answer, id: \.self) { i in PlayReveal(lang: r.tiles[i].lang, form: r.tiles[i].form, meaning: r.gloss, root: root) }
                Button(index + 1 < rounds.count && lives > 0 ? "Next round" : "See results") { next() }.buttonStyle(.pl(.primary, size: .lg))
            } else if let startedAt {
                field(r, startedAt)
            } else {
                Text("Words fall. Tap every one that means the word on top.").font(PL.body.font()).foregroundStyle(PL.paper)
                Button("Go") { self.startedAt = Date() }.buttonStyle(.pl(.primary, size: .lg))
            }
        }
    }

    func field(_ r: TileRound, _ start: Date) -> some View {
        let schedule = Lanes.schedule(count: r.tiles.count, round: index, rounds: rounds.count, roundSeconds: LobbyTiles.roundSeconds)
        return TimelineView(.animation) { tl in
            GeometryReader { geo in
                let elapsed = tl.date.timeIntervalSince(start) * 1000
                let lane = geo.size.width / CGFloat(Lanes.tileLanes)
                ZStack(alignment: .topLeading) {
                    ForEach(schedule, id: \.index) { s in
                        let p = (elapsed - Double(s.spawnMs)) / Double(s.fallMs)
                        if p >= 0 && p <= 1 && !tapped.contains(s.index) {
                            Button { tapped.insert(s.index) } label: {
                                Text(r.tiles[s.index].form).font(PL.small.font()).foregroundStyle(PL.ink).lineLimit(1).minimumScaleFactor(0.5)
                                    .frame(width: lane - 8, height: 44)
                                    .background(PL.card, in: .rect(cornerRadius: 8))
                            }
                            .buttonStyle(.plain)
                            .position(x: lane * (CGFloat(s.lane) + 0.5), y: 22 + (geo.size.height - 44) * p)
                        }
                    }
                }
            }
        }
        .frame(height: 380)
    }

    var results: some View {
        PlayResults(
            title: "\(points) points",
            line: "\(played.filter(\.1).count) perfect rounds of \(played.count).",
            reveals: Array(played.flatMap { r, _ in r.answer.prefix(1).map { PlayRevealItem(lang: r.tiles[$0].lang, form: r.tiles[$0].form, meaning: r.gloss) } }.prefix(6)),
            root: root,
            again: { deal() }
        )
        .onAppear {
            guard !recorded else { return }
            recorded = true
            let words = played.flatMap { r, ok in r.answer.prefix(1).map { PlayedWord(itemId: r.itemId, lang: r.tiles[$0].lang, form: r.tiles[$0].form, gloss: r.gloss, right: ok) } }
            langs.recordPlay(.tiles, words, points: points)
        }
    }

    func deal() {
        guard let corpus = langs.corpus else { return }
        root = langs.deckRoot(corpus)
        let targets = langs.playTargets.filter { $0 != root }
        rounds = LobbyTiles.deal(corpus.items, root: root, targets: targets.isEmpty ? ["es", "fr"] : targets, rounds: Self.count, langPool: FlagTilesRules.pool, rand: { Double.random(in: 0..<1) })
        index = 0
        lives = LobbyTiles.lives
        combo = 0
        points = 0
        played = []
        tapped = []
        outcome = nil
        startedAt = nil
        recorded = false
    }

    func clock() async {
        guard let startedAt, outcome == nil, let r = round else { return }
        let wait = Double(LobbyTiles.roundSeconds) - Date().timeIntervalSince(startedAt)
        if wait > 0 { try? await Task.sleep(for: .seconds(wait)) }
        guard !Task.isCancelled, outcome == nil, self.startedAt == startedAt else { return }
        let o = LobbyTiles.outcome(answer: r.answer, tapped: Array(tapped))
        combo = o.perfect ? combo + 1 : 0
        if !o.perfect { lives -= 1 }
        points += LobbyTiles.score(o, combo: combo)
        played.append((r, o.perfect))
        outcome = o
        PlaySound.effect(o.perfect, combo: combo)
    }

    func next() {
        index += 1
        tapped = []
        outcome = nil
        startedAt = nil
    }
}
