import BucketKit
import SwiftUI

struct ISpyGame: View {
    @Environment(LangStore.self) private var langs
    @State private var rounds: [SpyRound] = []
    @State private var index = 0
    @State private var startedAt = Date()
    @State private var tapped: String?
    @State private var closed = false
    @State private var me = SpyTally()
    @State private var bots: [String: Int] = [:]
    @State private var seed = ""
    @State private var root = "en"
    @State private var results: [Bool] = []
    @State private var labels: [String: String] = [:]
    @State private var recorded = false

    static let tileArt: [PLArt] = [.tornLabel, .ticket, .seal, .skKente, .skAzulejo, .skPaisley, .skMudcloth]

    var round: SpyRound? { index < rounds.count ? rounds[index] : nil }

    var body: some View {
        PlayScene(game: .ispy, stickers: playStickers(.star, .calligraphyAin)) {
            if rounds.isEmpty {
                ProgressView().tint(PL.paper)
            } else if let round, !PlayLaunch.endGame {
                play(round)
            } else {
                finished
            }
        }
        .task {
            await langs.load()
            if rounds.isEmpty { deal() }
        }
        .task(id: index) { await timer() }
    }

    func play(_ r: SpyRound) -> some View {
        let scene = ISpy.scene(r.scene)
        return VStack(alignment: .leading, spacing: PL.Space.s3) {
            PlayLabel(text: "\(scene?.name ?? "") · round \(index + 1) of \(rounds.count) · \(me.score)")
            HStack(spacing: PL.Space.s2) {
                PlayLabel(text: Lang.name(r.lang))
                Text(r.gloss).font(PL.heading.font()).foregroundStyle(PL.paper)
                Spacer()
                Button { LangVoice.shared.speak(r.gloss, r.lang) } label: {
                    PLGlyphView(.speaker, size: 22).foregroundStyle(PL.paper).frame(width: 44, height: 44)
                }
                .buttonStyle(.plain)
                .accessibilityLabel("Play the word")
            }
            if let scene { stage(scene, r) }
            if closed {
                Text(tapped == r.answer ? "Spotted" : "Here it was").font(PL.title.font()).foregroundStyle(tapped == r.answer ? PL.malachite : PL.vermilion)
                if RevealRules.iSpy(tapped: tapped != nil, elapsedMs: ISpy.roundSeconds * 1000) {
                    PlayReveal(lang: r.lang, form: r.gloss, meaning: labels[r.answer] ?? r.answer, root: root)
                }
                Button(index + 1 < rounds.count ? "Next round" : "See results") { next() }.buttonStyle(.pl(.primary, size: .lg))
            }
        }
    }

    func stage(_ scene: SpyScene, _ r: SpyRound) -> some View {
        GeometryReader { geo in
            let w = geo.size.width, h = geo.size.height, tile = w * 0.15
            ZStack(alignment: .topLeading) {
                ForEach(Array(scene.decor.enumerated()), id: \.offset) { _, d in
                    if let art = PLArt(rawValue: d.art) {
                        PLArtView(art).frame(width: w * d.size / 100).rotationEffect(.degrees(d.tilt)).offset(x: w * d.x / 100, y: h * d.y / 100).opacity(0.5)
                    }
                }
                ForEach(Array(scene.objects.enumerated()), id: \.offset) { _, o in
                    Button { tap(o.id, r) } label: {
                        ZStack {
                            PLArtView(Self.tileArt[o.art % Self.tileArt.count]).frame(width: tile, height: tile)
                            Text(labels[o.id] ?? o.id).font(PL.small.font()).foregroundStyle(PL.ink).lineLimit(1).minimumScaleFactor(0.4).padding(2)
                                .background(PL.card.opacity(0.92), in: .rect(cornerRadius: 4))
                                .frame(width: tile)
                        }
                        .overlay {
                            if closed && o.id == r.answer { RoundedRectangle(cornerRadius: 8).stroke(PL.malachite, lineWidth: 4) }
                            else if closed && o.id == tapped { RoundedRectangle(cornerRadius: 8).stroke(PL.vermilion, lineWidth: 4) }
                        }
                        .frame(width: max(tile, 44), height: max(tile, 44))
                    }
                    .buttonStyle(.plain)
                    .disabled(closed)
                    .rotationEffect(.degrees(o.tilt))
                    .position(x: w * o.x / 100, y: h * o.y / 100)
                }
            }
        }
        .aspectRatio(0.75, contentMode: .fit)
        .background(PL.tyrianDeep, in: .rect(cornerRadius: 20))
        .clipShape(.rect(cornerRadius: 20))
    }

    var finished: some View {
        let rows = ISpy.bots.map { BoardRow(name: "\(Bots.countryFlag($0.flag)) \($0.name)", score: bots[$0.id] ?? 0, me: false) }
        return PlayResults(
            title: "\(me.score) points",
            line: "\(results.filter { $0 }.count) of \(results.count) spotted.",
            reveals: Array(zip(rounds, results).map { r, _ in PlayRevealItem(lang: r.lang, form: r.gloss, meaning: labels[r.answer] ?? r.answer) }.prefix(6)),
            root: root,
            board: Boards.withYou(rows, you: me.score),
            again: { deal() }
        )
        .onAppear {
            guard !recorded else { return }
            recorded = true
            langs.recordPlay(.ispy, zip(rounds, results).map { r, ok in PlayedWord(itemId: r.itemId, lang: r.lang, form: r.gloss, gloss: labels[r.answer] ?? r.answer, right: ok) }, points: me.score)
        }
    }

    func deal() {
        guard let corpus = langs.corpus else { return }
        root = langs.deckRoot(corpus)
        seed = DealSeeds.fresh()
        let targets = langs.playTargets.filter { $0 != root }
        rounds = ISpy.rounds(corpus.items, seed: seed, root: root, targets: targets.isEmpty ? ISpy.sets[0].targets : targets, rounds: ISpy.rounds)
        var names: [String: String] = [:]
        for s in ISpy.scenes {
            for o in s.objects where names[o.id] == nil {
                let item = corpus.items.first { $0.kind == .word && $0.id == o.id } ?? corpus.items.first { $0.kind == .word && $0.form("en") == o.id }
                names[o.id] = item?.form(root) ?? o.id
            }
        }
        labels = names
        index = 0
        me = SpyTally()
        bots = [:]
        results = []
        tapped = nil
        closed = false
        recorded = false
        startedAt = Date()
    }

    func tap(_ id: String, _ r: SpyRound) {
        guard !closed else { return }
        tapped = id
        settle(r, ms: Int(Date().timeIntervalSince(startedAt) * 1000))
    }

    func settle(_ r: SpyRound, ms: Int) {
        closed = true
        let ok = tapped == r.answer
        me = ISpy.award(me, correct: ok, ms: ms, roundSeconds: ISpy.roundSeconds).0
        results.append(ok)
        for t in ISpy.botTurns(seed: seed, round: index, roundSeconds: ISpy.roundSeconds) where t.correct {
            bots[t.botId, default: 0] += ISpy.points(correct: true, ms: t.atMs, roundSeconds: ISpy.roundSeconds, streak: 0)
        }
        PlaySound.effect(ok, combo: me.streak)
    }

    func next() {
        index += 1
        tapped = nil
        closed = false
        startedAt = Date()
    }

    func timer() async {
        guard let r = round else { return }
        let i = index
        try? await Task.sleep(for: .seconds(ISpy.roundSeconds))
        guard !Task.isCancelled, index == i, !closed else { return }
        settle(r, ms: ISpy.roundSeconds * 1000)
    }
}
