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

    static func play(right: Bool, combo: Int = 0) {
        LangVoice.shared.activate()
        player = try? AVAudioPlayer(data: data(right: right, combo: combo))
        player?.volume = 0.35
        player?.play()
    }
}

struct GameChoiceStyle: ButtonStyle {
    let state: RowState

    func makeBody(configuration: Configuration) -> some View {
        let face: Color = state == .right ? D8.malachite : state == .wrong ? Color(hex: 0xFBE9E5) : .white
        let lip: Color = state == .right ? D8.malachiteLip : state == .wrong ? D8.vermilion : D8.keyline
        configuration.label
            .background(face, in: .rect(cornerRadius: 16))
            .overlay { RoundedRectangle(cornerRadius: 16).strokeBorder(lip, lineWidth: 2) }
            .background(lip, in: .rect(cornerRadius: 16).offset(y: configuration.isPressed ? 1 : 4))
            .offset(y: configuration.isPressed ? 3 : 0)
            .padding(.bottom, 4)
    }
}

extension View {
    func gameChrome(_ title: String, sideways: Bool) -> some View {
        safeAreaPadding(.top, sideways ? 12 : 0)
            .paper()
            .navigationTitle(sideways ? "" : title)
            .inlineTitle()
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
    @State private var shake = 0
    @State private var pause: Task<Void, Never>?

    var sideways: Bool { vertical == .compact }

    var body: some View {
        FitPage(center: sideways) {
            Group {
                if let run {
                    if run.done || gameEndForced {
                        end(run)
                    } else if let p = run.current {
                        play(run, p)
                    }
                } else {
                    GameWaiting(message: waitingMessage)
                }
            }
        }
        .gameChrome(kind.title, sideways: vertical == .compact)
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
        var rng = SystemRandomNumberGenerator()
        pause?.cancel()
        best = false
        replayed = false
        let words = GameWords.ordered(langs.freshGameWords(corpus), using: &rng)
        let clash: (GameWord, String) -> Bool = { w, l in l != w.lang && corpus.byId[w.itemId]?.form(l) == w.form }
        var prompts: [GamePrompt] = []
        switch kind {
        case .daily:
            guard let s = langs.dailySystem else { return }
            prompts = GameRounds.daily(GameDeck(corpus, root: s.root, targets: s.targets), day: dayKey(Date().timeIntervalSince1970 * 1000))
            if let done = langs.gameDaily(s.id), !prompts.isEmpty {
                replayed = true
                run = GameRun(prompts, replaying: done)
                return
            }
        case .same:
            guard let s = langs.sameWordSystem else { return }
            prompts = GameRounds.sameWord(GameDeck(corpus, root: s.root, targets: s.targets), words: words, using: &rng)
        case .voice:
            let heard = words.filter { LangVoice.shared.canSpeak($0.form, $0.lang) }
            prompts = GameRounds.flags(heard, own: langs.gameLangs, mode: .voice, sameForm: clash, using: &rng)
        default:
            prompts = GameRounds.flags(words, own: langs.gameLangs, mode: .flag, sameForm: clash, using: &rng)
        }
        run = prompts.isEmpty ? nil : GameRun(prompts)
        Beta.shared.studyStarted("game:\(kind.rawValue)")
    }

    func answer(_ choice: String) {
        guard var r = run, let p = r.current, let right = r.answer(choice) else { return }
        run = r
        haptic(right)
        GameSound.play(right: right, combo: r.combo)
        if !right { shake += 1 }
        LangVoice.shared.speak(p.word.form, p.word.lang)
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
        let points = kind == .daily ? nil : r.hits
        best = langs.recordGame(kind, played: r.prompts.map(\.word), hits: r.hits, points: points, missed: r.missed, pattern: kind == .daily ? r.pattern : nil)
        reminders.noteStudy()
        haptic(true)
    }

    func play(_ r: GameRun, _ p: GamePrompt) -> some View {
        let columns = sideways ? AnyLayout(HStackLayout(alignment: .center, spacing: 20)) : AnyLayout(VStackLayout(spacing: 18))
        return VStack(spacing: sideways ? 8 : 16) {
            GamePips(total: r.prompts.count, results: r.results, empty: Palette.rule)
            columns {
                PromptCard(run: r, prompt: p, sideways: sideways)
                    .frame(maxWidth: .infinity)
                LazyVGrid(columns: [GridItem(.flexible(), spacing: 12), GridItem(.flexible(), spacing: 12)], spacing: 12) {
                    ForEach(p.choices, id: \.self) { c in choice(c, p, r.answered) }
                }
                .frame(maxWidth: .infinity)
            }
            if r.combo >= 3 {
                Label("\(r.combo) in a row", systemImage: "bolt.fill")
                    .font(.subheadline.weight(.heavy)).foregroundStyle(D8.vermilion)
                    .transition(.scale.combined(with: .opacity))
            }
        }
        .padding()
        .animation(.spring(duration: 0.3), value: r.answered)
        .task(id: p.id) {
            if p.mode == .voice { LangVoice.shared.speak(p.word.form, p.word.lang) }
        }
    }

    func choice(_ c: String, _ p: GamePrompt, _ answered: String?) -> some View {
        let state: RowState = answered == nil ? .other : c == p.answer ? .right : c == answered ? .wrong : .other
        return Button { answer(c) } label: {
            Group {
                if p.mode == .form {
                    Text(c)
                        .font(D8.word(sideways ? 19 : 22))
                        .multilineTextAlignment(.center)
                        .lineLimit(2)
                        .minimumScaleFactor(0.5)
                        .environment(\.layoutDirection, Lang.isRTL(p.word.lang) ? .rightToLeft : .leftToRight)
                } else {
                    VStack(spacing: 6) {
                        FlagTile(lang: c, size: sideways ? 54 : 76)
                        if answered != nil { Text(langName(c)).font(.caption.weight(.heavy)).lineLimit(1).minimumScaleFactor(0.7) }
                    }
                }
            }
            .padding(10)
            .frame(maxWidth: .infinity, minHeight: sideways ? 64 : 124)
            .foregroundStyle(state == .right ? .white : D8.ink)
            .contentShape(.rect)
        }
        .buttonStyle(GameChoiceStyle(state: state))
        .disabled(answered != nil)
        .accessibilityIdentifier("game-choice")
        .gameShake(state == .wrong ? shake : 0)
        .scaleEffect(state == .right ? 1.04 : 1)
        .opacity(answered != nil && state == .other ? 0.5 : 1)
        .accessibilityLabel(p.mode == .form ? c : langName(c))
    }

    func end(_ r: GameRun) -> some View {
        GameEnd(kind: kind,
                score: String(localized: "\(r.hits) of \(r.results.count)"),
                line: kind == .daily ? String(localized: "New set tomorrow.") : nil,
                best: best,
                results: r.results,
                missed: r.missed,
                share: kind == .daily ? AnyView(DailyShare(prompts: r.prompts, results: r.results)) : nil,
                again: kind == .daily ? nil : { deal() })
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
                    .font(D8.word(sideways ? 28 : 36))
                    .foregroundStyle(D8.ink)
                    .multilineTextAlignment(.center)
                    .lineLimit(2)
                    .minimumScaleFactor(0.5)
                Text("in \(langName(prompt.word.lang))").font(.subheadline.weight(.semibold)).foregroundStyle(D8.label)
            } else {
                if prompt.mode == .voice && !answered {
                    Button { LangVoice.shared.speak(prompt.word.form, prompt.word.lang) } label: {
                        Image(systemName: "speaker.wave.3.fill")
                            .font(.system(size: 34, weight: .bold))
                            .foregroundStyle(.white)
                            .frame(width: 92, height: 92)
                            .background(D8.vermilion, in: .circle)
                            .background(D8.vermilionLip, in: .circle.offset(y: 5))
                    }
                    .buttonStyle(.plain)
                    .accessibilityLabel("Hear it")
                    Text("Which language is this?").font(.subheadline.weight(.semibold)).foregroundStyle(D8.label)
                } else {
                    Text(prompt.word.form)
                        .font(D8.word(sideways ? 30 : 40))
                        .foregroundStyle(D8.ink)
                        .multilineTextAlignment(.center)
                        .lineLimit(2)
                        .minimumScaleFactor(0.5)
                    Text(answered ? prompt.word.gloss : String(localized: "Which language is this?"))
                        .font(.subheadline.weight(.semibold)).foregroundStyle(D8.label)
                }
            }
        }
        .padding(18)
        .frame(maxWidth: .infinity, minHeight: sideways ? 120 : 230)
        .modifier(GameLip(face: .white, lip: D8.keyline))
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
                        .overlay { if p.id == prompt.id { RoundedRectangle(cornerRadius: 14).strokeBorder(D8.vermilion, lineWidth: 3) } }
                    Text(solved ? p.word.form : "?")
                        .font(.system(size: 15, weight: .heavy, design: .rounded))
                        .foregroundStyle(solved ? D8.malachite : D8.label)
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
            Text("DAILY SET").font(D8.caps(20)).tracking(2).foregroundStyle(Color(hex: 0x5d5650))
            Text("\(results.filter { $0 }.count) of \(results.count)").font(.system(size: 64, weight: .heavy, design: .rounded)).foregroundStyle(D8.lapis)
            HStack(spacing: 10) {
                ForEach(Array(zip(prompts, results).enumerated()), id: \.offset) { _, pair in
                    VStack(spacing: 8) {
                        FlagTile(lang: pair.0.word.lang, size: 62)
                        RoundedRectangle(cornerRadius: 5).fill(pair.1 ? D8.malachite : D8.vermilion).frame(width: 62, height: 14)
                    }
                }
            }
            Text(Feedback.isPolingual ? String(localized: "One word, every language. polingual.com") : String(localized: "One word, every language. bucket.foundation"))
                .font(D8.caps(15)).tracking(1.2).foregroundStyle(Color(hex: 0x5B1A4A))
        }
        .padding(48)
        .frame(width: 1080 / 2, alignment: .leading)
        .background(D8.parchment)
        .overlay(alignment: .bottom) { Rectangle().fill(Color(hex: 0x5B1A4A)).frame(height: 18) }
    }
}

struct DailyShare: View {
    let prompts: [GamePrompt]
    let results: [Bool]
    @State private var image: Image?

    var message: String {
        String(localized: "Daily Set: \(results.filter { $0 }.count) of \(results.count) on \(Feedback.appName). Same words for everyone today. \(Share.appLink.absoluteString)")
    }

    var body: some View {
        VStack(spacing: 0) {
            Color.clear.frame(height: 0)
            if let image {
                ShareLink(item: image, message: Text(message), preview: SharePreview(GameKind.daily.title, image: image)) {
                    Label("Share your result", systemImage: "square.and.arrow.up")
                }
                .buttonStyle(D8Option(align: .center))
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
            HStack(spacing: 10) {
                GeometryReader { g in
                    ZStack(alignment: .leading) {
                        Capsule().fill(Palette.rule)
                        Capsule().fill(left < 10 ? D8.vermilion : D8.malachite).frame(width: g.size.width * min(1, left / total))
                    }
                }
                .frame(height: 12)
                Text("\(Int(left.rounded(.up)))").font(.headline.weight(.heavy).monospacedDigit()).foregroundStyle(left < 10 ? D8.vermilion : Palette.ink)
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

    var body: some View {
        FitPage {
            Group {
                if let board {
                    if over || gameEndForced {
                        GameEnd(kind: .match, score: String(localized: "\(board.points) points"),
                                line: String(localized: "\(board.hits) pairs. Longest run \(board.bestCombo)."),
                                best: best, missed: board.missed, again: { deal() })
                    } else {
                        play(board)
                    }
                } else {
                    GameWaiting()
                }
            }
        }
        .gameChrome(GameKind.match.title, sideways: vertical == .compact)
        .task(id: langs.status) {
            LangVoice.shared.warm()
            await langs.load()
            if board == nil { deal() }
        }
        .task(id: ends) { await tick() }
        .onDisappear { LangVoice.shared.hush() }
    }

    func deal() {
        guard let corpus = langs.corpus else { return }
        var rng = SystemRandomNumberGenerator()
        let deck = GameWords.balanced(GameWords.ordered(langs.freshGameWords(corpus), using: &rng))
        let fresh = SpeedBoard(deck: deck, slots: vertical == .compact ? 4 : 5, seed: rng.next())
        over = false
        best = false
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
        best = langs.recordGame(.match, played: board.seen, hits: board.hits, points: board.points, missed: board.missed)
        reminders.noteStudy()
        haptic(true)
    }

    func play(_ b: SpeedBoard) -> some View {
        VStack(spacing: vertical == .compact ? 6 : 14) {
            if vertical != .compact, let ends { GameClock(ends: ends, total: Self.clock) }
            HStack {
                if vertical == .compact, let ends { GameClock(ends: ends, total: Self.clock) }
                Text("\(b.points)").font(D8.word(vertical == .compact ? 22 : 30)).foregroundStyle(Palette.ink).monospacedDigit().contentTransition(.numericText())
                if vertical != .compact { Spacer() }
                if b.combo >= SpeedBoard.hotCombo {
                    Label("Double points", systemImage: "bolt.fill").font(.subheadline.weight(.heavy)).foregroundStyle(D8.vermilion)
                        .transition(.scale.combined(with: .opacity))
                } else if b.combo >= 2 {
                    Text("\(b.combo) in a row").font(.subheadline.weight(.heavy)).foregroundStyle(D8.malachite)
                }
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
            .buttonStyle(D8Option(selected: b.pickedMeaning == w.id, align: .center))
            .accessibilityIdentifier("game-meaning")
            .overlay { if wrong.contains(w.id) { RoundedRectangle(cornerRadius: 12).stroke(D8.vermilion, lineWidth: 3).padding(.bottom, 4) } }
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
            .buttonStyle(D8Option(selected: b.pickedForm == w.id, align: .center))
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
            haptic(true)
            GameSound.play(right: true, combo: board?.combo ?? 0)
        case .missed(let word):
            haptic(false)
            GameSound.play(right: false)
            ends = ends?.addingTimeInterval(-SpeedBoard.missPenalty)
            shake += 1
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
    @State private var quiz: Exercise?
    @State private var i = 0
    @State private var results: [Bool] = []
    @State private var ends: Date?
    @State private var over = false
    @State private var best = false

    var body: some View {
        FitPage {
            Group {
                if over || (gameEndForced && !words.isEmpty) {
                    GameEnd(kind: .letters, score: String(localized: "\(results.filter { $0 }.count) of \(results.count)"),
                            best: best, results: results, missed: missed, again: { deal() })
                } else if let quiz, let sound = LetterSounds.lookup(quiz.lang, quiz.answer), let ends {
                    VStack(spacing: vertical == .compact ? 6 : 14) {
                        GameClock(ends: ends, total: GameLetters.seconds)
                        GamePips(total: words.count, results: results, empty: Palette.rule)
                        LetterQuiz(ex: quiz, sound: sound, say: LetterSounds.spoken(quiz.lang, sound)) { right, _ in advance(right) }
                            .id(i)
                    }
                    .padding()
                } else {
                    GameWaiting()
                }
            }
        }
        .gameChrome(GameKind.letters.title, sideways: vertical == .compact)
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
        var rng = SystemRandomNumberGenerator()
        words = GameLetters.deal(langs.systems, states: langs.states, now: Date().timeIntervalSince1970 * 1000, using: &rng)
        i = 0
        results = []
        over = false
        best = false
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
        quiz = ScriptCourse.exercise(w.lang, w.root, w.itemId, &rng)
        if let quiz, let s = LetterSounds.lookup(quiz.lang, quiz.answer) { LangVoice.shared.speak(LetterSounds.spoken(quiz.lang, s), quiz.lang) }
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
        let hits = results.filter { $0 }.count
        best = langs.recordGame(.letters, played: Array(words.prefix(results.count)), hits: hits, points: hits, missed: missed)
        reminders.noteStudy()
        haptic(true)
    }
}
