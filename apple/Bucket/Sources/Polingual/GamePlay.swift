import AVFoundation
import BucketKit
import SwiftUI

@MainActor
enum GameSound {
    private static var cache: [Int: Data] = [:]
    private static var player: AVAudioPlayer?

    static func wave(_ tones: [(hz: Double, seconds: Double)]) -> Data {
        let rate = 22_050.0
        var samples: [Int16] = []
        for tone in tones {
            let n = Int(rate * tone.seconds)
            for i in 0..<n {
                let t = Double(i) / rate
                let fade = exp(-5 * Double(i) / Double(n))
                samples.append(Int16(sin(2 * .pi * tone.hz * t) * fade * 26_000))
            }
        }
        var d = Data()
        func put<T: FixedWidthInteger>(_ v: T) { withUnsafeBytes(of: v.littleEndian) { d.append(contentsOf: $0) } }
        d.append(contentsOf: Array("RIFF".utf8))
        put(UInt32(36 + samples.count * 2))
        d.append(contentsOf: Array("WAVEfmt ".utf8))
        put(UInt32(16))
        put(UInt16(1))
        put(UInt16(1))
        put(UInt32(rate))
        put(UInt32(rate * 2))
        put(UInt16(2))
        put(UInt16(16))
        d.append(contentsOf: Array("data".utf8))
        put(UInt32(samples.count * 2))
        for s in samples { put(s) }
        return d
    }

    static func data(right: Bool, combo: Int) -> Data {
        let step = right ? min(combo, 12) : -1
        if let hit = cache[step] { return hit }
        let base = 523.25 * pow(2, Double(max(step, 0)) / 12)
        let made = right ? wave([(base, 0.09), (base * 1.5, 0.16)]) : wave([(174.6, 0.2)])
        cache[step] = made
        return made
    }

    static func chordData(_ tier: ComboTier) -> Data {
        let key = 100 + tier.rawValue
        if let hit = cache[key] { return hit }
        let base = 523.25 * pow(2, Double(min(tier.rawValue, 12)) / 12)
        let made = wave([(base, 0.07), (base * 1.26, 0.07), (base * 1.5, 0.07), (base * 2, 0.22)])
        cache[key] = made
        return made
    }

    static func play(right: Bool, combo: Int = 0) {
        emit(data(right: right, combo: combo))
    }

    static func chord(_ tier: ComboTier) {
        emit(chordData(tier))
    }

    private static func emit(_ data: Data) {
        guard LangVoice.shared.allows(.effect) else { return }
        LangVoice.shared.activate(.effect)
        player = try? AVAudioPlayer(data: data)
        player?.volume = 0.35
        player?.play()
    }
}

extension View {
    @ViewBuilder
    func screenShareQuiet() -> some View {
        #if os(iOS)
        onAppear { ScreenShare.shared.quiet += 1 }.onDisappear { ScreenShare.shared.quiet -= 1 }
        #else
        self
        #endif
    }

    func gameShake(_ trigger: Int) -> some View {
        keyframeAnimator(initialValue: 0.0, trigger: trigger) { v, x in v.offset(x: x) } keyframes: { _ in
            LinearKeyframe(-8, duration: 0.06)
            LinearKeyframe(8, duration: 0.08)
            LinearKeyframe(-5, duration: 0.07)
            LinearKeyframe(0, duration: 0.06)
        }
    }
}

struct QuizGame: View {
    let kind: GameKind
    @Environment(LangStore.self) private var langs
    @Environment(Reminders.self) private var reminders
    @Environment(\.verticalSizeClass) private var vertical
    @State private var run: GameRun?
    @State private var best = false
    @State private var replayed = false
    @State private var round = PracticeRound()
    @State private var shake = 0
    @State private var pause: Task<Void, Never>?
    @State private var feel = GameFeel()
    @State private var credit: GameCredit?
    @State private var runId = UUID().uuidString
    @Environment(\.accessibilityReduceMotion) private var systemReduce

    var sideways: Bool { vertical == .compact }
    var reduce: Bool { GameMotion.reduced(system: systemReduce) }

    var body: some View {
        GameShell(game: kind, feel: feel, fit: true) {
            Group {
                if let run {
                    if run.done || gameEndForced {
                        end(run)
                    } else if let p = run.current {
                        play(run, p)
                    }
                } else {
                    PLCard { GameWaiting(message: waitingMessage) }.padding(PL.Space.s4)
                }
            }
        }
        .screenShareQuiet()
        .task(id: langs.status) {
            LangVoice.shared.warm()
            await langs.load()
            if run == nil { deal() }
        }
        .onDisappear {
            pause?.cancel()
            LangVoice.shared.hush()
        }
    }

    var waitingMessage: String {
        kind == .voice ? String(localized: "No voices for your languages on this device yet.") : String(localized: "Study a few words in Learn first.")
    }

    func deal() {
        guard let corpus = langs.corpus else { return }
        var rng = LobbyRace.dealRandom()
        pause?.cancel()
        best = false
        credit = nil
        runId = UUID().uuidString
        replayed = false
        let words = GameWords.ordered(langs.freshGameWords(corpus), using: &rng)
        let clash: (GameWord, String) -> Bool = { w, l in l != w.lang && corpus.byId[w.itemId]?.form(l) == w.form }
        var prompts: [GamePrompt] = []
        switch kind {
        case .daily:
            guard let s = langs.dailySystem else { return }
            prompts = GameRounds.daily(GameDeck(corpus, root: s.root, targets: s.targets), day: dayKey(Date().timeIntervalSince1970 * 1000))
            if let done = langs.gameDaily(s.id), !prompts.isEmpty, !GameLaunch.freshDaily {
                replayed = true
                run = GameRun(prompts, replaying: done)
                return
            }
        case .same:
            guard let s = langs.sameWordSystem else { return }
            prompts = GameRounds.sameWord(GameDeck(corpus, root: s.root, targets: s.targets), words: words, using: &rng)
        case .voice:
            if let s = langs.dailySystem {
                let daily = DailySeed.voice(GameDeck(corpus, root: s.root, targets: s.targets), corpus: corpus, day: playDayKey())
                prompts = LobbyRace.system == nil ? daily.filter { LangVoice.shared.canSpeak($0.word.form, $0.word.lang) } : daily
            } else {
                let heard = words.filter { LangVoice.shared.canSpeak($0.form, $0.lang) }
                prompts = GameRounds.flags(heard, own: langs.gameLangs, mode: .voice, sameForm: clash, using: &rng)
            }
        default:
            prompts = GameRounds.flags(words, own: langs.gameLangs, mode: .flag, sameForm: clash, using: &rng)
        }
        run = prompts.isEmpty ? nil : GameRun(prompts)
        Beta.shared.studyStarted("game:\(kind.rawValue)")
    }

    func answer(_ choice: String) {
        guard var r = run, let p = r.current, let right = r.answer(choice) else { return }
        run = r
        if right { feel.right(r.streak) } else { feel.wrong(r.streak) }
        if !right { shake += 1 }
        LangVoice.shared.speak(p.word.form, p.word.lang, kind: .auto)
        pause = Task {
            try? await Task.sleep(for: .seconds(right ? 1.2 : 2.2))
            guard !Task.isCancelled else { return }
            next()
        }
    }

    func next() {
        guard var r = run else { return }
        r.advance()
        run = r
        guard r.done else { return }
        if round.practicing {
            _ = round.finish(score: String(localized: "\(r.hits) of \(r.results.count)"))
            if let s = langs.dailySystem, let done = langs.gameDaily(s.id) {
                replayed = true
                run = GameRun(r.prompts, replaying: done)
            }
            return
        }
        let points = kind == .daily ? nil : r.hits
        guard let outcome = langs.recordRun(runId, kind, played: r.prompts.map(\.word), hits: r.hits, points: points, missed: r.missed, pattern: kind == .daily ? r.pattern : nil) else { return }
        best = outcome.best
        credit = outcome.credit
        reminders.noteStudy()
    }

    func play(_ r: GameRun, _ p: GamePrompt) -> some View {
        let columns = sideways ? AnyLayout(HStackLayout(alignment: .center, spacing: 20)) : AnyLayout(VStackLayout(spacing: 18))
        return VStack(spacing: sideways ? 8 : 16) {
            GameHeader(total: r.prompts.count, results: r.results, streak: r.streak)
            columns {
                PromptCard(run: r, prompt: p, sideways: sideways)
                    .frame(maxWidth: .infinity)
                LazyVGrid(columns: [GridItem(.flexible(), spacing: 12), GridItem(.flexible(), spacing: 12)], spacing: 12) {
                    ForEach(p.choices, id: \.self) { c in choice(c, p, r.answered) }
                }
                .frame(maxWidth: .infinity)
            }
            if kind == .flags, r.answered != nil { ShareObjectButton(.flag(p.word.lang, root: p.word.root)) }
        }
        .padding()
        .animation(.spring(duration: 0.3), value: r.answered)
        .task(id: p.id) {
            if p.mode == .voice { LangVoice.shared.speak(p.word.form, p.word.lang, kind: .auto) }
        }
    }

    func choice(_ c: String, _ p: GamePrompt, _ answered: String?) -> some View {
        let state: RowState = answered == nil ? .other : c == p.answer ? .right : c == answered ? .wrong : .other
        return Button { answer(c) } label: {
            Group {
                if p.mode == .form {
                    Text(c)
                        .font(PL.wordFont(sideways ? 19 : 22))
                        .multilineTextAlignment(.center)
                        .lineLimit(2)
                        .minimumScaleFactor(0.5)
                        .environment(\.layoutDirection, Lang.isRTL(p.word.lang) ? .rightToLeft : .leftToRight)
                } else {
                    VStack(spacing: 6) {
                        FlagTile(lang: c, size: sideways ? 54 : 76)
                        if answered != nil { Text(langName(c)).font(PL.label.font(scale: 1.2)).lineLimit(1).minimumScaleFactor(0.7) }
                    }
                }
            }
            .padding(10)
            .frame(maxWidth: .infinity, minHeight: sideways ? 64 : 124)
            .contentShape(.rect)
        }
        .buttonStyle(GameAnswerStyle(state: state))
        .disabled(answered != nil)
        .accessibilityIdentifier("game-choice")
        .accessibilityValue(GameLaunch.revealAnswer && c == p.answer ? "answer" : "")
        .gameShake(state == .wrong && !reduce ? shake : 0)
        .scaleEffect(state == .right && !reduce ? 1.04 : 1)
        .opacity(answered != nil && state == .other ? 0.5 : 1)
        .accessibilityLabel(p.mode == .form ? c : langName(c))
    }

    func end(_ r: GameRun) -> some View {
        GameResults(title: String(localized: "\(r.hits) of \(r.results.count)"),
                    line: endLine(r),
                    reveals: r.missed.prefix(5).map(PlayRevealItem.init),
                    root: r.missed.first?.root ?? langs.playRoot,
                    share: (kind, .marks(r.results)),
                    retry: kind == .daily ? (kind, nil, { retry(r.prompts) }) : nil,
                    results: r.results,
                    stars: r.stars,
                    credit: credit,
                    best: best,
                    extra: kind == .daily
                        ? AnyView(DailyShare(prompts: r.prompts, results: r.results, message: langs.shareText(kind, .marks(r.results))))
                        : AnyView(ShareObjectButton(langs.gameScore(kind.title, right: r.hits, total: r.results.count), wide: true)),
                    again: kind == .daily ? nil : { deal() })
            .padding(PL.Space.s4)
    }

    func endLine(_ r: GameRun) -> String {
        if kind == .daily { return round.score.map(PracticeLine.text) ?? String(localized: "New set tomorrow.") }
        return langs.gameLine(bestRun: r.bestCombo)
    }

    func retry(_ prompts: [GamePrompt]) {
        pause?.cancel()
        round.begin()
        replayed = false
        run = GameRun(prompts)
    }
}

struct PromptCard: View {
    let run: GameRun
    let prompt: GamePrompt
    let sideways: Bool

    var answered: Bool { run.answered != nil }

    var body: some View {
        VStack(spacing: 10) {
            if prompt.mode == .form {
                if rail.count > 1 { family } else { FlagTile(lang: prompt.word.lang, size: 48) }
                Text(prompt.word.gloss)
                    .font(PL.wordFont(sideways ? 28 : 36))
                    .foregroundStyle(PL.ink)
                    .multilineTextAlignment(.center)
                    .lineLimit(2)
                    .minimumScaleFactor(0.5)
                Text("in \(langName(prompt.word.lang))").font(PL.small.font()).foregroundStyle(PL.inkDim)
            } else {
                if prompt.mode == .voice && !answered && LangVoice.shared.canSpeak(prompt.word.form, prompt.word.lang) {
                    Button { LangVoice.shared.speak(prompt.word.form, prompt.word.lang) } label: {
                        Image(systemName: "speaker.wave.3.fill")
                            .font(PL.icon(34))
                            .foregroundStyle(.white)
                            .frame(width: 92, height: 92)
                            .background(PL.vermilion, in: .circle)
                            .background(PL.vermilionDeep, in: .circle.offset(y: 5))
                    }
                    .buttonStyle(.plain)
                    .accessibilityLabel("Hear it")
                    Text("Which language is this?").font(PL.small.font()).foregroundStyle(PL.inkDim)
                } else {
                    Text(prompt.word.form)
                        .font(PL.wordFont(sideways ? 30 : 40))
                        .foregroundStyle(PL.ink)
                        .multilineTextAlignment(.center)
                        .lineLimit(2)
                        .minimumScaleFactor(0.5)
                    Text(answered ? prompt.word.gloss : String(localized: "Which language is this?"))
                        .font(PL.small.font()).foregroundStyle(PL.inkDim)
                }
            }
        }
        .padding(18)
        .frame(maxWidth: .infinity, minHeight: sideways ? 120 : 230)
        .modifier(GameLip(face: PL.card, lip: PL.paper3))
        .overlay(alignment: .topTrailing) {
            if answered && prompt.mode == .form && LangVoice.shared.canSpeak(prompt.word.form, prompt.word.lang) {
                Button { LangVoice.shared.speak(prompt.word.form, prompt.word.lang) } label: {
                    Image(systemName: "speaker.wave.2.fill")
                        .font(PL.icon(20))
                        .foregroundStyle(PL.vermilion)
                        .frame(width: 44, height: 44)
                        .contentShape(.rect)
                }
                .buttonStyle(.plain)
                .padding(6)
                .accessibilityLabel("Hear \(prompt.word.form)")
                .accessibilityIdentifier("game-hear")
            }
        }
        .wrongTranslation(ReportSubject(lang: prompt.word.lang, root: prompt.word.root, itemId: prompt.word.itemId, text: prompt.word.form, shown: prompt.word.gloss, context: "game:quiz"),
                          visible: answered, alignment: .bottomTrailing, inset: 6)
    }

    var rail: [GamePrompt] { run.prompts.filter { $0.group == prompt.group && $0.mode == .form && isSameWord } }

    var isSameWord: Bool { run.prompts.contains { $0.group > 0 } }

    var family: some View {
        HStack(spacing: 10) {
            ForEach(rail) { p in
                let solved = p.id < prompt.id || (p.id == prompt.id && answered)
                VStack(spacing: 4) {
                    FlagTile(lang: p.word.lang, size: 46)
                        .padding(3)
                        .overlay { if p.id == prompt.id { RoundedRectangle(cornerRadius: PL.Radius.md).strokeBorder(PL.vermilion, lineWidth: 3) } }
                    Text(solved ? p.word.form : "?")
                        .font(PL.small.font())
                        .foregroundStyle(solved ? PL.malachite : PL.inkDim)
                        .lineLimit(1).minimumScaleFactor(0.5)
                }
                .frame(maxWidth: .infinity)
            }
        }
    }
}

struct DailyShareCard: View {
    let prompts: [GamePrompt]
    let results: [Bool]

    var body: some View {
        VStack(alignment: .leading, spacing: 20) {
            Text("DAILY SET").font(PL.capsFont(20)).tracking(2).foregroundStyle(PL.inkDim)
            Text("\(results.filter { $0 }.count) of \(results.count)").font(PL.script(64)).foregroundStyle(PL.lapis)
            HStack(spacing: 10) {
                ForEach(Array(zip(prompts, results).enumerated()), id: \.offset) { _, pair in
                    VStack(spacing: 8) {
                        FlagTile(lang: pair.0.word.lang, size: 62)
                        RoundedRectangle(cornerRadius: PL.Radius.xs).fill(pair.1 ? PL.malachite : PL.vermilion).frame(width: 62, height: 14)
                    }
                }
            }
            Text(Feedback.isPolingual ? String(localized: "One word, every language. polingual.com") : String(localized: "One word, every language. bucket.foundation"))
                .font(PL.capsFont(15)).tracking(1.2).foregroundStyle(PL.tyrian)
        }
        .padding(48)
        .frame(width: 1080 / 2, alignment: .leading)
        .background(PL.paper)
        .overlay(alignment: .bottom) { Rectangle().fill(PL.tyrian).frame(height: 18) }
    }
}

struct DailyShare: View {
    let prompts: [GamePrompt]
    let results: [Bool]
    let message: String
    @State private var image: Image?

    var body: some View {
        VStack(spacing: 0) {
            Color.clear.frame(height: 0)
            if let image {
                ShareLink(item: image, message: Text(message), preview: SharePreview(GameKind.daily.title, image: image)) {
                    Label("Share the card", systemImage: "photo")
                }
                .buttonStyle(PLOption(align: .center))
                .modifier(GameShareLog(kind: .daily, form: "image"))
            }
        }
        .task { if image == nil { image = render() } }
    }

    func render() -> Image? {
        let r = ImageRenderer(content: DailyShareCard(prompts: prompts, results: results))
        r.scale = 2
        #if os(iOS)
        return r.uiImage.map { Image(uiImage: $0) }
        #else
        return r.nsImage.map { Image(nsImage: $0) }
        #endif
    }
}

struct GameClock: View {
    let ends: Date
    let total: Double

    var body: some View {
        TimelineView(.periodic(from: .now, by: 0.1)) { ctx in
            let left = max(0, ends.timeIntervalSince(ctx.date))
            HStack(spacing: PL.Space.s3) {
                GeometryReader { g in
                    ZStack(alignment: .leading) {
                        Capsule().fill(PL.paper.opacity(0.25))
                        Capsule().fill(left < 10 ? PL.vermilion : PL.malachite).frame(width: g.size.width * min(1, left / total))
                    }
                }
                .frame(height: PL.Space.s3)
                Text("\(Int(left.rounded(.up)))").font(PL.heading.font()).monospacedDigit().foregroundStyle(left < 10 ? PL.ochre : PL.paper)
                    .frame(minWidth: 30, alignment: .trailing)
            }
        }
    }
}

struct SpeedMatchGame: View {
    static var clock: Double {
        #if DEBUG
        let args = ProcessInfo.processInfo.arguments
        if let i = args.firstIndex(of: "-gameSeconds"), i + 1 < args.count, let n = Double(args[i + 1]) { return n }
        #endif
        return SpeedBoard.seconds
    }

    @Environment(LangStore.self) private var langs
    @Environment(Reminders.self) private var reminders
    @Environment(\.verticalSizeClass) private var vertical
    @State private var board: SpeedBoard?
    @State private var ends: Date?
    @State private var over = false
    @State private var best = false
    @State private var wrong: Set<String> = []
    @State private var shake = 0
    @State private var feel = GameFeel()
    @State private var credit: GameCredit?
    @State private var runId = UUID().uuidString
    @Environment(\.accessibilityReduceMotion) private var systemReduce

    var reduce: Bool { GameMotion.reduced(system: systemReduce) }

    var body: some View {
        GameShell(game: .match, feel: feel, fit: true) {
            Group {
                if let board {
                    if over || gameEndForced {
                        GameResults(title: String(localized: "\(board.points) points"),
                                    line: String(localized: "\(board.hits) pairs. Longest run \(board.bestCombo)."),
                                    reveals: board.missed.prefix(5).map(PlayRevealItem.init),
                                    root: board.missed.first?.root ?? langs.playRoot,
                                    share: (.match, .points(board.points, marks: [])),
                                    stars: GameStars.rating(hits: board.hits, total: board.hits + board.missed.count),
                                    credit: credit,
                                    best: best,
                                    extra: AnyView(ShareObjectButton(langs.gameScore(GameKind.match.title, right: board.hits, total: board.hits + board.missed.count), wide: true)),
                                    again: { deal() })
                            .padding(PL.Space.s4)
                    } else {
                        play(board)
                    }
                } else {
                    PLCard { GameWaiting() }.padding(PL.Space.s4)
                }
            }
        }
        .screenShareQuiet()
        .task(id: langs.status) {
            LangVoice.shared.warm()
            await langs.load()
            if board == nil { deal() }
        }
        .task(id: ends) { await tick() }
    }

    func deal() {
        guard let corpus = langs.corpus else { return }
        let slots = vertical == .compact ? 4 : 5
        let fresh: SpeedBoard
        if let s = langs.dailySystem {
            fresh = DailySeed.speedBoard(GameDeck(corpus, root: s.root, targets: s.targets), day: playDayKey(), slots: slots)
        } else {
            var rng = LobbyRace.dealRandom()
            let deck = GameWords.balanced(GameWords.ordered(langs.freshGameWords(corpus), using: &rng))
            fresh = SpeedBoard(deck: deck, slots: slots, seed: rng.next())
        }
        over = false
        best = false
        credit = nil
        runId = UUID().uuidString
        board = fresh.playable ? fresh : nil
        ends = fresh.playable ? Date.now.addingTimeInterval(Self.clock) : nil
        if fresh.playable { Beta.shared.studyStarted("game:match") }
    }

    func tick() async {
        while let ends, !over, !Task.isCancelled {
            if Date.now >= ends {
                finish()
                return
            }
            try? await Task.sleep(for: .milliseconds(200))
            if self.ends != ends { return }
        }
    }

    func finish() {
        guard let board, !over else { return }
        over = true
        guard let outcome = langs.recordRun(runId, .match, played: board.seen, hits: board.hits, points: board.points, missed: board.missed) else { return }
        best = outcome.best
        credit = outcome.credit
        reminders.noteStudy()
    }

    func play(_ b: SpeedBoard) -> some View {
        VStack(spacing: vertical == .compact ? 6 : 14) {
            if vertical != .compact, let ends { GameClock(ends: ends, total: Self.clock) }
            HStack {
                if vertical == .compact, let ends { GameClock(ends: ends, total: Self.clock) }
                Text("\(b.points)").font(PL.word.font(scale: vertical == .compact ? 0.5 : 0.7)).foregroundStyle(PL.paper).monospacedDigit().contentTransition(.numericText())
                if vertical != .compact { Spacer() }
                ComboSlot(streak: b.streak, multiplier: false)
            }
            HStack(alignment: .top, spacing: 12) {
                VStack(spacing: vertical == .compact ? 4 : 10) {
                    ForEach(b.meanings.indices, id: \.self) { i in meaning(b, b.meanings[i]) }
                }
                VStack(spacing: vertical == .compact ? 4 : 10) {
                    ForEach(b.forms.indices, id: \.self) { i in form(b, b.forms[i]) }
                }
            }
        }
        .padding()
        .animation(.spring(duration: 0.25), value: b.points)
    }

    @ViewBuilder func meaning(_ b: SpeedBoard, _ w: GameWord?) -> some View {
        if let w {
            Button { apply(board?.tapMeaning(w.id)) } label: {
                Text(w.gloss).lineLimit(1).minimumScaleFactor(0.5).frame(maxWidth: .infinity)
            }
            .buttonStyle(PLOption(selected: b.pickedMeaning == w.id, align: .center))
            .accessibilityIdentifier("game-meaning")
            .overlay { if wrong.contains(w.id) { RoundedRectangle(cornerRadius: PL.Radius.md).stroke(PL.vermilion, lineWidth: 3).padding(.bottom, 4) } }
            .gameShake(wrong.contains(w.id) ? shake : 0)
            .transition(.scale(scale: 0.7).combined(with: .opacity))
        } else {
            gap
        }
    }

    @ViewBuilder func form(_ b: SpeedBoard, _ w: GameWord?) -> some View {
        if let w {
            Button {
                LangVoice.shared.speak(w.form, w.lang)
                apply(board?.tapForm(w.id))
            } label: {
                HStack(spacing: 6) {
                    FlagTile(lang: w.lang, size: 22)
                    Text(w.form).lineLimit(1).minimumScaleFactor(0.5)
                }
                .frame(maxWidth: .infinity)
            }
            .buttonStyle(PLOption(selected: b.pickedForm == w.id, align: .center))
            .accessibilityIdentifier("game-form")
            .gameShake(wrong.contains(w.id) ? shake : 0)
            .transition(.scale(scale: 0.7).combined(with: .opacity))
        } else {
            gap
        }
    }

    var gap: some View {
        Color.clear.frame(height: FitScale.naturalTarget + 4)
    }

    func apply(_ out: SpeedBoard.Outcome?) {
        guard let out else { return }
        switch out {
        case .matched:
            if let streak = board?.streak { feel.right(streak, points: streak.current >= SpeedBoard.hotCombo ? 2 : 1) }
        case .missed(let word):
            if let streak = board?.streak { feel.wrong(streak) }
            ends = ends?.addingTimeInterval(-SpeedBoard.missPenalty)
            if !reduce { shake += 1 }
            wrong = [word.id]
            Task {
                try? await Task.sleep(for: .milliseconds(450))
                wrong = []
            }
        default: break
        }
    }
}

struct LetterSprintGame: View {
    @Environment(LangStore.self) private var langs
    @Environment(Reminders.self) private var reminders
    @Environment(\.verticalSizeClass) private var vertical
    @State private var words: [GameWord] = []
    @State private var prompts: [LetterPrompt] = []
    @State private var quiz: Exercise?
    @State private var i = 0
    @State private var results: [Bool] = []
    @State private var ends: Date?
    @State private var over = false
    @State private var best = false
    @State private var streak = ComboCount()
    @State private var feel = GameFeel()
    @State private var credit: GameCredit?
    @State private var runId = UUID().uuidString

    var hits: Int { results.filter { $0 }.count }

    var body: some View {
        GameShell(game: .letters, feel: feel, fit: true) {
            Group {
                if over || (gameEndForced && !words.isEmpty) {
                    GameResults(title: String(localized: "\(hits) of \(results.count)"),
                                line: langs.gameLine(bestRun: streak.best),
                                reveals: missed.prefix(5).map { PlayRevealItem(lang: $0.lang, form: $0.form, meaning: $0.gloss) },
                                root: langs.playRoot,
                                share: (.letters, .marks(results)),
                                results: results,
                                stars: GameStars.rating(hits: hits, total: words.count),
                                credit: credit,
                                best: best,
                                extra: AnyView(ShareObjectButton(langs.gameScore(GameKind.letters.title, right: hits, total: results.count), wide: true)),
                                again: { deal() })
                        .padding(PL.Space.s4)
                } else if let quiz, let sound = LetterSounds.lookup(quiz.lang, quiz.answer), let ends {
                    VStack(spacing: vertical == .compact ? 6 : 14) {
                        GameClock(ends: ends, total: GameLetters.seconds)
                        GameHeader(total: words.count, results: results, streak: streak)
                        PLCard {
                            LetterQuiz(ex: quiz, sound: sound, say: LetterSounds.spoken(quiz.lang, sound), onDone: { right, _ in advance(right) }, onPick: pick)
                                .id(i)
                        }
                    }
                    .padding()
                } else {
                    PLCard { GameWaiting() }.padding(PL.Space.s4)
                }
            }
        }
        .screenShareQuiet()
        .task(id: langs.status) {
            LangVoice.shared.warm()
            await langs.load()
            if words.isEmpty { deal() }
        }
        .task(id: ends) {
            while let ends, !over, !Task.isCancelled {
                if Date.now >= ends {
                    finish()
                    return
                }
                try? await Task.sleep(for: .milliseconds(200))
            }
        }
        .onDisappear { LangVoice.shared.hush() }
    }

    var missed: [GameWord] { zip(words, results).filter { !$0.1 }.map(\.0) }

    func deal() {
        let root = langs.dailySystem?.root ?? "en"
        prompts = DailySeed.letters(day: playDayKey(), targets: langs.dailySystem?.targets ?? [])
        words = prompts.map { GameWord(itemId: LangScript.letterItemId($0.ch), lang: $0.lang, form: $0.ch, gloss: $0.sound, root: root) }
        i = 0
        results = []
        over = false
        best = false
        streak = ComboCount()
        credit = nil
        runId = UUID().uuidString
        show()
        ends = quiz == nil ? nil : Date.now.addingTimeInterval(GameLetters.seconds)
        if quiz != nil { Beta.shared.studyStarted("game:letters") }
    }

    func show() {
        guard words.indices.contains(i) else {
            quiz = nil
            return
        }
        let w = words[i]
        var rng = Rng(seed: UInt32.random(in: 0...UInt32.max))
        quiz = GameLetters.quiz(w, &rng).map { ex in
            var ex = ex
            if prompts.indices.contains(i), prompts[i].ch == ex.answer { ex.options = prompts[i].choices }
            return ex
        }
        if let quiz, let s = LetterSounds.lookup(quiz.lang, quiz.answer) { LangVoice.shared.speak(LetterSounds.spoken(quiz.lang, s), quiz.lang) }
    }

    func pick(_ right: Bool) {
        streak.record(right)
        if right { feel.right(streak) } else { feel.wrong(streak) }
    }

    func advance(_ right: Bool) {
        results.append(right)
        i += 1
        if i >= words.count {
            finish()
        } else {
            show()
        }
    }

    func finish() {
        guard !over else { return }
        over = true
        guard let outcome = langs.recordRun(runId, .letters, played: Array(words.prefix(results.count)), hits: hits, points: hits, missed: missed) else { return }
        best = outcome.best
        credit = outcome.credit
        reminders.noteStudy()
    }
}

enum GameLaunch {
    static var revealAnswer: Bool {
        #if DEBUG
        Launch.flag("-revealAnswer")
        #else
        false
        #endif
    }

    static var freshDaily: Bool {
        #if DEBUG
        Launch.flag("-freshDaily")
        #else
        false
        #endif
    }
}
