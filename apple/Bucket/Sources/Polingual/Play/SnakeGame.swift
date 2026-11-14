import BucketKit
import SwiftUI

struct SnakeGame: View {
    @Environment(LangStore.self) private var langs
    @State private var lang = ""
    @State private var deck: SnakeDeck?
    @State private var arena: Arena?
    @State private var aim: Double?
    @State private var startedAt = Date()
    @State private var left = Snakes.roundMs / 1000
    @State private var over = false
    @State private var root = "en"
    @State private var recorded = false

    var me: Snake? { arena?.snakes.first { !$0.bot } }

    var body: some View {
        PlayScene(game: .snake, stickers: playStickers(.brush, .scriptKo)) {
            if over || PlayLaunch.endGame {
                results
            } else if let arena, let deck {
                field(arena, deck)
            } else {
                setup
            }
        }
        .task { await langs.load(); if lang.isEmpty { lang = langs.playTargets.first { Snakes.langChoices.contains($0) } ?? "es" } }
        .task(id: arena == nil) { await loop() }
    }

    var setup: some View {
        VStack(alignment: .leading, spacing: PL.Space.s4) {
            Text("Steer with your finger. Eat words in your language to grow. Decoys from other languages shrink you.")
                .font(PL.body.font()).foregroundStyle(PL.paper)
            PlayLabel(text: "Your language")
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: PL.Space.s2) {
                    ForEach(Snakes.langChoices.filter { $0 != root }, id: \.self) { l in
                        Button { lang = l } label: { PLPill(Lang.name(l), active: l == lang) }.buttonStyle(.plain)
                    }
                }
            }
            Button("Start") { start() }.buttonStyle(.pl(.primary, size: .lg))
        }
    }

    func field(_ a: Arena, _ d: SnakeDeck) -> some View {
        VStack(spacing: PL.Space.s2) {
            HStack {
                PlayLabel(text: "\(Lang.name(d.lang)) · length \(me?.length ?? 0)")
                Spacer()
                PlayLabel(text: "\(left)s")
            }
            GeometryReader { geo in
                let k = geo.size.width / Snakes.worldW
                Canvas { ctx, _ in
                    for w in a.words {
                        ctx.draw(Text(w.form).font(PL.small.font()).foregroundStyle(PL.paper), at: CGPoint(x: w.x * k, y: w.y * k))
                    }
                    let colors = [PL.vermilion, PL.ochre, PL.maya, PL.malachite, PL.lapisSoft, PL.paper]
                    for s in a.snakes where s.alive {
                        var path = Path()
                        for (i, p) in s.body.enumerated() {
                            let pt = CGPoint(x: p.x * k, y: p.y * k)
                            if i == 0 { path.move(to: pt) } else { path.addLine(to: pt) }
                        }
                        ctx.stroke(path, with: .color(colors[s.color % colors.count]), style: StrokeStyle(lineWidth: s.bot ? 6 : 9, lineCap: .round, lineJoin: .round))
                    }
                }
                .background(PL.tyrianDeep, in: .rect(cornerRadius: 16))
                .contentShape(.rect)
                .gesture(DragGesture(minimumDistance: 0).onChanged { g in
                    guard let head = me?.body.first else { return }
                    aim = atan2(g.location.y / k - head.y, g.location.x / k - head.x)
                })
            }
            .aspectRatio(Snakes.worldW / Snakes.worldH, contentMode: .fit)
            Button("End round") { over = true }.buttonStyle(.pl(.quiet, size: .sm))
        }
    }

    var results: some View {
        let eaten = arena?.eaten ?? []
        let bad = arena?.bad ?? []
        let reveals = playWords((eaten + bad).map { PlayRevealItem(lang: $0.lang, form: $0.form, meaning: $0.meaning) })
        return PlayResults(
            title: "Length \(me?.length ?? Snakes.startLen)",
            line: "\(eaten.count) words eaten, \(bad.count) decoys.",
            reveals: Array(reveals.prefix(6)),
            root: root,
            again: { over = false; start() }
        )
        .onAppear {
            guard !recorded else { return }
            recorded = true
            let corpus = langs.corpus
            let words = (eaten.map { ($0, true) } + bad.map { ($0, false) }).map { w, ok in
                PlayedWord(itemId: corpus?.items.first { $0.form(w.lang) == w.form }?.id ?? w.meaning, lang: w.lang, form: w.form, gloss: w.meaning, right: ok)
            }
            langs.recordPlay(.snake, words, points: me?.length ?? 0)
        }
    }

    func start() {
        guard let corpus = langs.corpus else { return }
        root = langs.deckRoot(corpus)
        let d = Snakes.deck(corpus.items, lang: lang, others: Snakes.langChoices, seed: DealSeeds.fresh(), root: root)
        guard !d.good.isEmpty, !d.decoys.isEmpty else { return }
        var snakes = [Snakes.make(id: "me", name: "You", bot: false, skill: 1, at: Pt(800, 500), angle: 0, color: 0)]
        let skills = ["easy", "medium", "hard", "medium", "easy"]
        for (i, b) in Bots.all.shuffled().prefix(5).enumerated() {
            let at = Pt(200 + Double.random(in: 0..<1200), 150 + Double.random(in: 0..<700))
            snakes.append(Snakes.make(id: b.userId, name: b.name, bot: true, skill: Snakes.skill[skills[i]] ?? 0.8, at: at, angle: Double.random(in: -3...3), color: i + 1))
        }
        deck = d
        aim = nil
        recorded = false
        startedAt = Date()
        left = Snakes.roundMs / 1000
        arena = Snakes.eat(Arena(snakes: snakes, words: [], nextWord: 0), deck: d) { Double.random(in: 0..<1) }
    }

    func loop() async {
        var last = Date()
        while !Task.isCancelled {
            try? await Task.sleep(for: .milliseconds(33))
            guard !over, let a = arena, let d = deck else { continue }
            let now = Date()
            let dt = min(0.05, now.timeIntervalSince(last))
            last = now
            let before = (a.eaten.count, a.bad.count)
            let next = Snakes.tick(a, aim: aim, deck: d, rand: { Double.random(in: 0..<1) }, dt: dt)
            if next.eaten.count > before.0 { PlaySound.effect(true, combo: next.eaten.count) }
            if next.bad.count > before.1 { PlaySound.effect(false) }
            arena = next
            left = max(0, Snakes.roundMs / 1000 - Int(now.timeIntervalSince(startedAt)))
            if RevealRules.snake(alive: next.snakes.first { !$0.bot }?.alive ?? false, secondsLeft: left) { over = true }
        }
    }
}
