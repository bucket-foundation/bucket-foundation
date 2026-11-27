import BucketKit
import SwiftUI

struct SoundButtons: View {
    let text: String
    let lang: String
    var size: CGFloat = 64
    @Binding var plays: Int
    @State private var playing = false
    @State private var voiceless = false

    var body: some View {
        VStack(spacing: 4) {
            buttons
            if voiceless {
                Text("No \(langName(lang)) voice on this device")
                    .font(PL.label.font()).foregroundStyle(PL.inkDim)
            }
        }
    }

    var buttons: some View {
        HStack(spacing: 14) {
            Button { play(slow: false) } label: {
                Image(systemName: "speaker.wave.3.fill")
                    .font(PL.icon(size * 0.4))
                    .foregroundStyle(.white)
                    .symbolEffect(.variableColor.iterative, isActive: playing)
                    .frame(width: size, height: size)
                    .background(PL.vermilion, in: .circle)
                    .background(PL.vermilionDeep, in: .circle.offset(y: 4))
            }
            .buttonStyle(.plain)
            .accessibilityLabel("Hear it")
            Button { play(slow: true) } label: {
                Image(systemName: "tortoise.fill")
                    .font(PL.icon(size * 0.3))
                    .foregroundStyle(PL.vermilion)
                    .frame(width: max(44, size * 0.7), height: max(44, size * 0.7))
                    .background(PL.vermilion.opacity(0.12), in: .circle)
            }
            .buttonStyle(.plain)
            .accessibilityLabel("Hear it slowly")
        }
    }

    func play(slow: Bool) {
        voiceless = !LangVoice.shared.speak(text, lang, slow: slow)
        guard !voiceless else { return }
        plays += 1
        playing = true
        let seconds = (0.5 + Double(text.count) * 0.12) * (slow ? 2 : 1)
        Task {
            try? await Task.sleep(for: .seconds(seconds))
            playing = false
        }
    }
}

struct LetterInWord: View {
    let sound: LetterSound
    let letter: String
    let lang: String
    let shown: Bool
    var tint: Color = PL.vermilion
    var size: CGFloat = 46
    var ink: Color = PL.ink

    var body: some View {
        Text(attributed)
            .font(PL.wordFont(size))
            .foregroundStyle(ink)
            .lineLimit(1)
            .minimumScaleFactor(0.4)
            .environment(\.layoutDirection, Lang.isRTL(lang) ? .rightToLeft : .leftToRight)
            .contentTransition(.interpolate)
            .accessibilityLabel(shown ? sound.example : String(localized: "A word with a missing letter"))
    }

    var attributed: AttributedString {
        guard let p = LetterSounds.parts(sound, letter) else { return AttributedString(sound.example) }
        var mid = AttributedString(shown ? p.letter : "＿")
        mid.foregroundColor = tint
        if shown { mid.underlineStyle = .single }
        return AttributedString(p.before) + mid + AttributedString(p.after)
    }
}

struct SoundWord: View {
    let sound: LetterSound
    let letter: String
    let lang: String
    var shown = true
    var tint: Color = PL.vermilion
    var size: CGFloat = 44

    var body: some View {
        let card = LetterSounds.card(sound, letter: letter)
        VStack(spacing: 4) {
            if card.phoneticHoldsLetter {
                Text(card.word).font(PL.wordFont(size)).foregroundStyle(PL.ink).lineLimit(1).minimumScaleFactor(0.5)
                    .opacity(shown ? 1 : 0).accessibilityHidden(!shown)
                LetterInWord(sound: sound, letter: letter, lang: lang, shown: shown, tint: tint, size: size * 0.6)
            } else {
                LetterInWord(sound: sound, letter: letter, lang: lang, shown: shown, tint: tint, size: size)
                if let phonetic = card.phonetic {
                    Text(phonetic).font(PL.wordFont(size * 0.5)).foregroundStyle(PL.lapis).lineLimit(1).minimumScaleFactor(0.5)
                        .opacity(shown ? 1 : 0).accessibilityHidden(!shown)
                }
            }
            Text(card.meaning).font(PL.heading.font(scale: 0.75)).foregroundStyle(PL.ink).lineLimit(1).minimumScaleFactor(0.7)
                .opacity(shown || !card.phoneticHoldsLetter ? 1 : 0).accessibilityHidden(!shown && card.phoneticHoldsLetter)
        }
        .frame(maxWidth: .infinity)
        .accessibilityElement(children: .combine)
    }
}

struct SoundHint: View {
    let sound: LetterSound
    var reading = true

    var capsule: String? {
        if !sound.ipa.isEmpty { return "/\(sound.ipa)/" }
        return reading ? sound.reading.flatMap { $0.isEmpty ? nil : $0 } : nil
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            if let flag = sound.flag {
                Label(flag, systemImage: "exclamationmark.triangle.fill")
                    .font(PL.small.font()).foregroundStyle(PL.vermilion)
                    .fixedSize(horizontal: false, vertical: true)
            }
            HStack(alignment: .firstTextBaseline, spacing: 10) {
                if let capsule {
                    Text(capsule)
                        .font(PL.script(17, .bold))
                        .foregroundStyle(PL.lapis)
                }
                Text(sound.hint).font(PL.small.font()).foregroundStyle(PL.ink)
                    .fixedSize(horizontal: false, vertical: true)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

struct SayItButton: View {
    let say: String
    let lang: String
    var onHeard: () -> Void = {}
    @State private var listening = false
    @State private var result: Bool?
    @State private var tries = 0

    var body: some View {
        VStack(spacing: 8) {
            Button {
                if listening { LangListener.shared.stop() } else { Task { await listen() } }
            } label: {
                Label(listening ? String(localized: "Listening…") : result == true ? String(localized: "Say it again") : String(localized: "Your turn: say “\(say)”"),
                      systemImage: listening ? "waveform" : "mic.fill")
                    .symbolEffect(.variableColor.iterative, isActive: listening)
            }
            .buttonStyle(PLOption(align: .center, compact: true))
            HStack(spacing: 6) {
                Image(systemName: result == true ? "sparkles" : "ear")
                Text(result == true ? Self.cheer(tries) : String(localized: "Close. Tap play, listen once more, then try again."))
                    .lineLimit(1).minimumScaleFactor(0.7)
            }
            .font(PL.small.font())
            .foregroundStyle(result == true ? PL.malachite : PL.lapis)
            .opacity(result == nil ? 0 : 1)
            .accessibilityHidden(result == nil)
        }
        .animation(.easeOut(duration: 0.18), value: result)
    }

    static func cheer(_ n: Int) -> String {
        [String(localized: "Nailed it!"), String(localized: "Sounds right!"), String(localized: "Spot on!")][n % 3]
    }

    func listen() async {
        listening = true
        let alts = await LangListener.shared.listenOnce(lang)
        listening = false
        tries += 1
        result = LetterSounds.heard(alts, say: say)
        haptic(result == true)
        if result == true { onHeard() }
    }
}

struct LetterMeet: View {
    let ex: Exercise
    let sound: LetterSound
    let say: String
    let onDone: () -> Void
    @State private var plays = 0
    @Environment(\.verticalSizeClass) private var vertical

    var card: SoundCard { LetterSounds.card(sound, letter: ex.answer) }
    var characterReading: String? {
        guard !card.phoneticHoldsLetter, sound.ipa.isEmpty, let r = sound.reading, !r.isEmpty else { return nil }
        return r
    }

    var sideways: Bool { vertical == .compact }

    var body: some View {
        (sideways ? AnyLayout(HStackLayout(alignment: .center, spacing: 20)) : AnyLayout(VStackLayout(spacing: 14))) {
            Button { LangVoice.shared.speak(say, ex.lang); plays += 1 } label: { tile }
                .buttonStyle(TilePress())
                .frame(maxWidth: .infinity)
                .accessibilityHint(String(localized: "Plays the word"))
            VStack(spacing: 12) {
                SoundHint(sound: sound, reading: false)
                SoundButtons(text: say, lang: ex.lang, size: 56, plays: $plays)
                if LangListener.shared.canHear(ex.lang) {
                    SayItButton(say: say, lang: ex.lang) { plays += 1 }
                }
                Button("Got it", action: onDone).buttonStyle(D8Primary())
            }
            .frame(maxWidth: .infinity)
        }
        .frame(maxWidth: .infinity)
        .onAppear { plays += 1 }
    }

    var tile: some View {
        let width: CGFloat = sideways ? 190 : 250
        return ZStack {
            FlagFace(flag: D8Flag.of(ex.lang), emblem: false)
            RoundedRectangle(cornerRadius: PL.Radius.sm).fill(PL.paper.opacity(0.8)).padding(width * 0.05)
            VStack(spacing: 2) {
                HStack {
                    Text(langName(ex.lang).uppercased()).font(PL.capsFont(11)).tracking(0.8).foregroundStyle(PL.inkDim)
                    Spacer(minLength: 0)
                    Image(systemName: "speaker.wave.2.fill").font(PL.icon(18)).foregroundStyle(PL.ink.opacity(0.6))
                }
                Spacer(minLength: 0)
                Text(card.phoneticHoldsLetter ? card.word : ex.answer)
                    .font(PL.wordFont(sideways ? 64 : 84)).foregroundStyle(PL.ink)
                    .environment(\.layoutDirection, Lang.isRTL(ex.lang) ? .rightToLeft : .leftToRight)
                if let reading = characterReading {
                    Text(reading).font(PL.wordFont(sideways ? 32 : 40)).foregroundStyle(PL.vermilion)
                    Text(sound.example == ex.answer ? card.meaning : "\(sound.example) \(card.meaning)").font(PL.wordFont(sideways ? 20 : 26)).foregroundStyle(PL.ink)
                } else {
                    LetterInWord(sound: sound, letter: ex.answer, lang: ex.lang, shown: true, size: sideways ? 32 : 40, ink: PL.ink)
                    Text(card.meaning).font(PL.wordFont(sideways ? 20 : 26)).foregroundStyle(PL.ink)
                }
                Spacer(minLength: 0)
            }
            .lineLimit(1).minimumScaleFactor(0.5)
            .padding(width * 0.1)
        }
        .frame(width: width, height: width * 1.12)
        .modifier(Glaze(radius: 14, lip: 6))
        .accessibilityElement(children: .combine)
    }
}

struct LetterQuiz: View {
    let ex: Exercise
    let sound: LetterSound
    let say: String
    let onDone: (_ right: Bool, _ helped: Bool) -> Void
    var onPick: ((Bool) -> Void)?
    var asks = true
    @State private var plays = 0
    @State private var picked: String?
    @State private var hinted = false
    @State private var shake = 0
    @Environment(\.verticalSizeClass) private var vertical

    var right: Bool { picked == ex.answer }
    var sideways: Bool { vertical == .compact }
    var question: String {
        if ScriptCourse.isCharacter(ex.lang, ex.answer) { return String(localized: "Which character completes this word?") }
        return ScriptCourse.isTone(ex.lang, ex.answer) ? String(localized: "Which tone did you hear?") : String(localized: "Which letter makes this sound?")
    }

    var body: some View {
        (sideways ? AnyLayout(HStackLayout(alignment: .center, spacing: 20)) : AnyLayout(VStackLayout(spacing: 10))) {
            VStack(spacing: 10) {
                if asks {
                    Text(question)
                        .font(PL.small.font()).foregroundStyle(PL.inkDim)
                        .frame(maxWidth: .infinity)
                }
                HStack(alignment: .center, spacing: 12) {
                    SoundButtons(text: say, lang: ex.lang, size: 52, plays: $plays)
                    SoundWord(sound: sound, letter: ex.answer, lang: ex.lang, shown: picked != nil, tint: picked == nil ? PL.vermilion : PL.malachite, size: sideways ? 36 : 40)
                }
                ZStack {
                    SoundHint(sound: sound, reading: false).opacity(hinted || picked != nil ? 1 : 0).accessibilityHidden(!hinted && picked == nil)
                    Button { hinted = true; tap() } label: { Label("Hint", systemImage: "lightbulb.fill") }
                        .buttonStyle(PlainLink())
                        .opacity(hinted || picked != nil ? 0 : 1)
                        .disabled(hinted || picked != nil)
                }
            }
            .frame(maxWidth: .infinity)
            VStack(spacing: 10) {
                LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 10), count: 2), spacing: 10) {
                    ForEach(Array((ex.options ?? []).enumerated()), id: \.element) { k, o in
                        tile(o).optionKey(k)
                    }
                }
                DrillResult(shown: picked != nil, right: right, wrongText: String(localized: "It's “\(ex.answer)”, as in \(Self.example(sound)).")) { onDone(right, hinted) }
            }
            .frame(maxWidth: .infinity)
        }
        .animation(.easeOut(duration: 0.18), value: picked)
        .animation(.easeOut(duration: 0.18), value: hinted)
        .onAppear {
            #if DEBUG
            let args = ProcessInfo.processInfo.arguments
            if args.contains("-pickWrong") { picked = ex.options?.first { $0 != ex.answer } }
            if args.contains("-pickRight") { picked = ex.answer }
            #endif
        }
    }

    static func example(_ s: LetterSound) -> String {
        let card = LetterSounds.card(s, letter: "")
        return card.phoneticHoldsLetter ? "\(card.word) \(card.meaning)" : s.example
    }

    func tile(_ o: String) -> some View {
        let state: RowState = picked == nil ? .other : o == ex.answer ? .right : o == picked ? .wrong : .other
        let mine = LetterSounds.lookup(ex.lang, o).map { LetterSounds.spoken(ex.lang, $0) } ?? o
        return Button {
            if picked == nil {
                picked = o
                if let onPick { onPick(o == ex.answer) } else { haptic(o == ex.answer) }
                if o == ex.answer {
                    LangVoice.shared.speak(say, ex.lang)
                } else {
                    shake += 1
                    LangVoice.shared.speak(say, ex.lang)
                }
                plays += 1
            } else {
                LangVoice.shared.speak(o == ex.answer ? say : mine, ex.lang)
            }
        } label: {
            VStack(spacing: 2) {
                Text(o).font(PL.script(sideways ? 28 : 32)).lineLimit(1).minimumScaleFactor(0.5)
                    .overlay(alignment: .trailing) {
                        Image(systemName: "speaker.wave.2.fill").font(PL.small.font())
                            .fixedSize().alignmentGuide(.trailing) { $0[.leading] - 6 }
                            .opacity(picked == nil ? 0 : 1)
                            .accessibilityHidden(true)
                    }
                if picked != nil, let s = LetterSounds.lookup(ex.lang, o) {
                    Text(Self.example(s))
                        .font(PL.small.font()).foregroundStyle(state == .other ? PL.inkDim : PL.paper.opacity(0.85)).lineLimit(1).minimumScaleFactor(0.6)
                }
            }
            .padding(.vertical, 6)
            .frame(maxWidth: .infinity, minHeight: sideways ? 52 : 64)
        }
        .buttonStyle(GameAnswerStyle(state: state))
        .keyframeAnimator(initialValue: 0.0, trigger: state == .wrong ? shake : 0) { v, x in v.offset(x: x) } keyframes: { _ in
            LinearKeyframe(-8, duration: 0.06)
            LinearKeyframe(8, duration: 0.08)
            LinearKeyframe(-5, duration: 0.07)
            LinearKeyframe(0, duration: 0.06)
        }
        .opacity(picked != nil && state == .other ? 0.55 : 1)
        .environment(\.layoutDirection, Lang.isRTL(ex.lang) ? .rightToLeft : .leftToRight)
        .accessibilityLabel(o)
    }
}


