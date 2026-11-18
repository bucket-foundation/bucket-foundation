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
    @State private var shielded = true
    @State private var touch: Pt?
    @State private var field = CGSize.zero
    @Environment(\.playRoom) private var playRoom
    @ScaledMetric private var chrome: CGFloat = 190

    var me: Snake? { arena?.snakes.first { !$0.bot } }

    var body: some View {
        PlayScene(game: .snake) {
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
                let head = me?.body.first ?? Pt(Snakes.worldW / 2, Snakes.worldH / 2)
                let v = Snakes.view(head: head, width: geo.size.width, height: geo.size.height)
                Canvas { ctx, _ in draw(&ctx, a, v) }
                    .background(PL.tyrianDeep)
                    .clipShape(.rect(cornerRadius: 16))
                    .overlay(RoundedRectangle(cornerRadius: 16).stroke(PL.ink, lineWidth: 3))
                    .contentShape(.rect)
                    .gesture(DragGesture(minimumDistance: 0).onChanged { g in
                        touch = Pt(g.location.x, g.location.y)
                        field = geo.size
                        aim = Snakes.heldAim(head: head, width: geo.size.width, height: geo.size.height, touch: Pt(g.location.x, g.location.y), current: aim)
                    }.onEnded { _ in touch = nil })
                    .accessibilityElement()
                    .accessibilityLabel("Steer with your finger. Eat words in your language to grow. Decoys from other languages shrink you.")
                    .accessibilityIdentifier("snakeArena")
            }
            .frame(height: PlayBoard.height(room: playRoom, chrome: chrome, least: 260))
            Button("End round") { over = true }.buttonStyle(.pl(.quiet, size: .sm))
        }
    }

    func draw(_ ctx: inout GraphicsContext, _ a: Arena, _ v: SnakeView) {
        let wall = CGRect(x: 3 - v.x, y: 3 - v.y, width: Snakes.worldW - 6, height: Snakes.worldH - 6)
        ctx.stroke(Path(wall), with: .color(PL.ochre), lineWidth: 6)
        for w in a.words where v.shows(Pt(w.x, w.y), margin: 80) {
            let text = ctx.resolve(Text(w.form).font(PL.body.font()).fontWeight(.heavy).foregroundStyle(PL.tyrian))
            let size = text.measure(in: CGSize(width: 240, height: 40))
            let at = CGPoint(x: w.x - v.x, y: w.y - v.y)
            let plate = CGRect(x: at.x - size.width / 2 - 10, y: at.y - size.height / 2 - 4, width: size.width + 20, height: size.height + 8)
            ctx.fill(Path(roundedRect: plate.offsetBy(dx: 3, dy: 3), cornerRadius: 6), with: .color(PL.ink.opacity(0.35)))
            ctx.fill(Path(roundedRect: plate, cornerRadius: 6), with: .color(PL.paper2))
            ctx.draw(text, at: at)
        }
        let colors = [PL.vermilion, PL.ochre, PL.maya, PL.malachite, PL.lapisSoft, PL.paper]
        for s in a.snakes where s.alive {
            var path = Path()
            for (i, p) in s.body.enumerated() {
                let pt = CGPoint(x: p.x - v.x, y: p.y - v.y)
                if i == 0 { path.move(to: pt) } else { path.addLine(to: pt) }
            }
            let width: CGFloat = s.bot ? 13 : 16
            let fade = !s.bot && shielded ? 0.55 : 1
            ctx.stroke(path, with: .color(PL.ink.opacity(fade)), style: StrokeStyle(lineWidth: width + 4, lineCap: .round, lineJoin: .round))
            ctx.stroke(path, with: .color(colors[s.color % colors.count].opacity(fade)), style: StrokeStyle(lineWidth: width, lineCap: .round, lineJoin: .round))
            let h = CGPoint(x: s.body[0].x - v.x, y: s.body[0].y - v.y)
            ctx.draw(Text("\(s.name) \(s.length)").font(PL.label.font()).foregroundStyle(PL.paper), at: CGPoint(x: h.x, y: h.y - 22))
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
            share: (.snake, .points(me?.length ?? Snakes.startLen, marks: [])),
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
            let at = Snakes.botStart(away: Pt(800, 500)) { Double.random(in: 0..<1) }
            snakes.append(Snakes.make(id: b.userId, name: b.name, bot: true, skill: Snakes.skill[skills[i]] ?? 0.8, at: at, angle: Double.random(in: -3...3), color: i + 1))
        }
        deck = d
        aim = nil
        touch = nil
        recorded = false
        shielded = true
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
            if let touch, let head = a.snakes.first(where: { !$0.bot })?.body.first {
                aim = Snakes.heldAim(head: head, width: field.width, height: field.height, touch: touch, current: aim)
            }
            let shield = Snakes.shielded(elapsedMs: Int(now.timeIntervalSince(startedAt) * 1000))
            if shield != shielded { shielded = shield }
            let next = Snakes.tick(a, aim: aim, deck: d, rand: { Double.random(in: 0..<1) }, dt: dt, shield: shield)
            if next.eaten.count > before.0 { PlaySound.effect(true, combo: next.eaten.count) }
            if next.bad.count > before.1 { PlaySound.effect(false) }
            arena = next
            left = max(0, Snakes.roundMs / 1000 - Int(now.timeIntervalSince(startedAt)))
            if RevealRules.snake(alive: next.snakes.first { !$0.bot }?.alive ?? false, secondsLeft: left) { over = true }
        }
    }
}
