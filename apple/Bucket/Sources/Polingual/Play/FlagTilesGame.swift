import BucketKit
import SwiftUI

struct FlagTilesGame: View {
    @Environment(LangStore.self) private var langs
    @ScaledMetric private var chrome: CGFloat = 32
    @State private var feel = GameFeel()
    @State private var deck: FlagTilesDeck?
    @State private var run = RunState()
    @State private var stream = FlagStream(count: 0)
    @State private var origin = Date()
    @State private var clock = FlagClock()
    @State private var flash: Int?
    @State private var flashes = 0
    @State private var root = "en"
    @State private var entered = false
    @State private var round = PracticeRound()
    @State private var day = PlayDecks.deckDay()
    @State private var racing = false

    var tile: FlagRunTile? { deck.flatMap { run.index < $0.tiles.count ? $0.tiles[run.index] : nil } }
    var answer: Int { tile.flatMap { t in deck?.langs.firstIndex(of: t.lang) } ?? -1 }

    var body: some View {
        PlayScene(game: .flagTiles, feel: feel) {
            if deck != nil, !entered, !round.practicing {
                RecordedRound(kind: .flagTiles, deck: day, practice: round.score, root: root) { retry() }
            } else if let deck {
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
            let race = LobbyRace.seed
            await langs.load()
            guard deck == nil, let corpus = langs.corpus else { return }
            root = langs.deckRoot(corpus)
            racing = race != nil
            day = LobbyRaceSeed.deckDay(race)
            entered = racing || !DailyLedger.shared.hasPlayed(.flagTiles, deck: day)
            let dealt = FlagTilesRules.deck(corpus.items, date: day, root: root)
            stream = FlagStream(count: dealt.tiles.count)
            deck = dealt
            if PlayLaunch.endGame { run = RunState(phase: .over, index: 3, score: 3) }
        }
        .task(id: "\(run.index)-\(run.phase)") { await land() }
        .task(id: flashes) {
            guard flash != nil else { return }
            try? await Task.sleep(for: .milliseconds(160))
            if !Task.isCancelled { flash = nil }
        }
    }

    func ready(_ deck: FlagTilesDeck) -> some View {
        VStack(alignment: .leading, spacing: PL.Space.s4) {
            PlayLabel(text: "Today's lanes")
            HStack(spacing: PL.Space.s3) { ForEach(deck.langs, id: \.self) { PlayFlag(lang: $0, size: 44) } }
            Text("Words fall in a stream. Tap the lane of the lowest word's language before it lands. One miss ends the run; you may continue once.")
                .font(PL.body.font()).foregroundStyle(PL.paper)
            Button("Start") { begin(.start) }.buttonStyle(.pl(.primary, size: .lg))
        }
    }

    func field(_ deck: FlagTilesDeck) -> some View {
        VStack(spacing: PL.Space.s3) {
            HStack {
                PlayLabel(text: "Score \(run.score)")
                ComboSlot(streak: feel.streak, multiplier: false)
                Spacer()
                PlayLabel(text: "Word \(run.index + 1)")
            }
            TimelineView(.animation) { tl in
                GeometryReader { geo in
                    let rows = stream.rows(from: run.index, clockMs: clock.at(since(tl.date)))
                    let compact = FlagBoard.compact(geo.size.height)
                    ZStack(alignment: .topLeading) {
                        HStack(spacing: 0) {
                            ForEach(Array(deck.langs.enumerated()), id: \.offset) { i, l in
                                Button { tap(i) } label: {
                                    VStack(spacing: PL.Space.s1) {
                                        Spacer(minLength: 0)
                                        PlayFlag(lang: l, size: compact ? 36 : 44)
                                        if !compact { PlayLabel(text: Lang.name(l)).lineLimit(1).minimumScaleFactor(0.6) }
                                    }
                                    .padding(.bottom, compact ? PL.Space.s1 : PL.Space.s2)
                                    .padding(.horizontal, 2)
                                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                                    .background(PL.paper.opacity(flash == i ? 0.3 : i.isMultiple(of: 2) ? 0.08 : 0.14))
                                    .contentShape(.rect)
                                }
                                .buttonStyle(.plain)
                                .accessibilityLabel(Lang.name(l))
                                .accessibilityValue(tile?.form ?? "")
                                .accessibilityIdentifier("flagLane-\(i)")
                            }
                        }
                        .clipShape(.rect(cornerRadius: 12))
                        ForEach(rows, id: \.index) { row in
                            Text(deck.tiles[row.index].form)
                                .font(PL.heading.font()).foregroundStyle(PL.ink).lineLimit(1).minimumScaleFactor(0.5)
                                .padding(.horizontal, PL.Space.s3)
                                .frame(width: min(geo.size.width * 0.72, 280), height: FlagBoard.tile)
                                .background(PL.card, in: .rect(cornerRadius: 10))
                                .opacity(row.index == run.index ? 1 : 0.55)
                                .position(x: geo.size.width / 2, y: FlagBoard.tileY(row.progress, height: geo.size.height))
                                .allowsHitTesting(false)
                                .accessibilityHidden(row.index != run.index)
                        }
                    }
                }
            }
            .playBoard(chrome: chrome, least: FlagBoard.least)
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
            if !run.continued { Button("Continue once") { begin(.continue) }.buttonStyle(.pl(.primary, size: .lg)) }
            Button("End run") { run = FlagTilesRules.step(run, .end) }.buttonStyle(.pl(run.continued ? .primary : .ghost, size: .md))
        }
    }

    func retry() {
        round.begin()
        run = RunState()
        begin(.start)
    }

    func results(_ deck: FlagTilesDeck) -> some View {
        let seen = Array(deck.tiles.prefix(min(deck.tiles.count, run.index + 1)))
        let missedIndex = run.missed
        let title = "\(run.score) words"
        let shape = GameShare.Shape.points(run.score, marks: [])
        return PlayResults(
            title: title,
            line: "Same deck for everyone today. Come back tomorrow for new lanes.",
            reveals: playWords(seen.suffix(4).reversed().map { PlayRevealItem(lang: $0.lang, form: $0.form, meaning: $0.meaning) }),
            root: root,
            board: Boards.fromGhosts(FlagTilesRules.ghosts(date: deck.date), you: run.score),
            share: round.practicing ? nil : (.flagTiles, shape),
            retry: round.practicing || racing ? nil : (.flagTiles, day, { retry() }),
            again: nil
        )
        .onAppear {
            let practicing = round.practicing
            let record = round.finish(score: title)
            if practicing { entered = false }
            guard record else { return }
            if !racing { DailyLedger.shared.markPlayed(.flagTiles, deck: day, title: title, shape: shape) }
            let words = seen.enumerated().map { i, t in PlayedWord(itemId: t.itemId, lang: t.lang, form: t.form, gloss: t.meaning, right: i != missedIndex) }
            langs.recordPlay(.flagTiles, words, points: run.score)
        }
    }

    func since(_ now: Date) -> Double { now.timeIntervalSince(origin) * 1000 }

    func begin(_ event: RunEvent) {
        if event == .start { feel.reset() }
        run = FlagTilesRules.step(run, event)
        guard run.phase == .running else { return }
        origin = Date()
        clock = FlagClock(offset: stream.clock(placing: run.index, at: 0))
    }

    func tap(_ lane: Int) {
        guard run.phase == .running else { return }
        let right = lane == answer
        let now = Date()
        let elapsed = since(now)
        run = FlagTilesRules.step(run, .tap(lane: lane, answer: answer))
        flash = lane
        flashes += 1
        feel.record(right)
        guard run.phase == .running else { return }
        if run.index >= (deck?.tiles.count ?? 0) {
            run = FlagTilesRules.step(FlagTilesRules.step(run, .timeout), .end)
            return
        }
        clock = clock.caughtUp(elapsed, next: run.index, in: stream)
        origin = now
    }

    func land() async {
        guard run.phase == .running else { return }
        let index = run.index
        let wait = clock.landsInMs(index, in: stream, sinceMs: since(Date()))
        if wait > 0 { try? await Task.sleep(for: .milliseconds(wait)) }
        guard !Task.isCancelled, run.phase == .running, run.index == index else { return }
        feel.record(false)
        run = FlagTilesRules.step(run, .timeout)
    }
}
