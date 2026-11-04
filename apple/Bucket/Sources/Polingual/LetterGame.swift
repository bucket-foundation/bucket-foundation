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
                    .font(.caption.weight(.semibold)).foregroundStyle(Palette.muted)
            }
        }
    }

    var buttons: some View {
        HStack(spacing: 14) {
            Button { play(slow: false) } label: {
                Image(systemName: "speaker.wave.3.fill")
                    .font(.system(size: size * 0.4, weight: .bold))
                    .foregroundStyle(.white)
                    .symbolEffect(.variableColor.iterative, isActive: playing)
                    .frame(width: size, height: size)
                    .background(D8.vermilion, in: .circle)
                    .background(D8.vermilionLip, in: .circle.offset(y: 4))
            }
            .buttonStyle(.plain)
            .accessibilityLabel("Hear it")
            Button { play(slow: true) } label: {
                Image(systemName: "tortoise.fill")
                    .font(.system(size: size * 0.3, weight: .bold))
                    .foregroundStyle(D8.vermilion)
                    .frame(width: size * 0.7, height: size * 0.7)
                    .background(D8.vermilion.opacity(0.12), in: .circle)
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
    var tint: Color = D8.vermilion
    var size: CGFloat = 46

    var body: some View {
        Text(attributed)
            .font(D8.word(size))
            .foregroundStyle(Palette.ink)
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
    var tint: Color = D8.vermilion
    var size: CGFloat = 44

    var body: some View {
        let card = LetterSounds.card(sound, letter: letter)
        VStack(spacing: 4) {
            if card.phoneticHoldsLetter {
                Text(card.word).font(D8.word(size)).foregroundStyle(Palette.ink).lineLimit(1).minimumScaleFactor(0.5)
                    .opacity(shown ? 1 : 0).accessibilityHidden(!shown)
                LetterInWord(sound: sound, letter: letter, lang: lang, shown: shown, tint: tint, size: size * 0.6)
            } else {
                LetterInWord(sound: sound, letter: letter, lang: lang, shown: shown, tint: tint, size: size)
                if let phonetic = card.phonetic {
                    Text(phonetic).font(D8.word(size * 0.5)).foregroundStyle(D8.lapis).lineLimit(1).minimumScaleFactor(0.5)
                        .opacity(shown ? 1 : 0).accessibilityHidden(!shown)
                }
            }
            Text(card.meaning).font(.headline).foregroundStyle(Palette.ink).lineLimit(1).minimumScaleFactor(0.7)
                .opacity(shown || !card.phoneticHoldsLetter ? 1 : 0).accessibilityHidden(!shown && card.phoneticHoldsLetter)
        }
        .frame(maxWidth: .infinity)
        .accessibilityElement(children: .combine)
    }
}

struct PlayFlash: ViewModifier {
    let trigger: Int

    func body(content: Content) -> some View {
        content.keyframeAnimator(initialValue: 0.0, trigger: trigger) { view, glow in
            view.overlay(RoundedRectangle(cornerRadius: 14).stroke(D8.lapis, lineWidth: 4).opacity(glow))
        } keyframes: { _ in
            LinearKeyframe(1, duration: 0.06)
            LinearKeyframe(0, duration: 0.3)
        }
    }
}

extension View {
    func playFlash(_ trigger: Int) -> some View { modifier(PlayFlash(trigger: trigger)) }
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
                    .font(.subheadline.weight(.bold)).foregroundStyle(D8.vermilion)
                    .fixedSize(horizontal: false, vertical: true)
            }
            HStack(alignment: .firstTextBaseline, spacing: 10) {
                if let capsule {
                    Text(capsule)
                        .font(.system(size: 17, weight: .bold, design: .rounded))
                        .foregroundStyle(.white)
                        .padding(.horizontal, 10).padding(.vertical, 4)
                        .background(D8.lapis, in: .capsule)
                }
                Text(sound.hint).font(.subheadline.weight(.medium)).foregroundStyle(Palette.ink)
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
            .buttonStyle(D8Option(align: .center, compact: true))
            HStack(spacing: 6) {
                Image(systemName: result == true ? "sparkles" : "ear")
                Text(result == true ? Self.cheer(tries) : String(localized: "Close. Tap play, listen once more, then try again."))
                    .lineLimit(1).minimumScaleFactor(0.7)
            }
            .font(.subheadline.weight(.bold))
            .foregroundStyle(result == true ? D8.malachite : D8.lapis)
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

    var sideways: Bool { vertical == .compact }

    var body: some View {
        (sideways ? AnyLayout(HStackLayout(alignment: .center, spacing: 20)) : AnyLayout(VStackLayout(spacing: 14))) {
            HStack(alignment: .center, spacing: 16) {
                WordTile(word: ex.answer, lang: ex.lang, reading: nil, size: sideways ? 84 : 96, speakText: say, onTap: { LangVoice.shared.speak(say, ex.lang); plays += 1 }, glyph: true)
                    .playFlash(plays)
                Button { LangVoice.shared.speak(say, ex.lang); plays += 1 } label: {
                    SoundWord(sound: sound, letter: ex.answer, lang: ex.lang, size: sideways ? 36 : 44)
                }
                .buttonStyle(.plain)
            }
            .frame(maxWidth: .infinity)
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
}

struct LetterQuiz: View {
    let ex: Exercise
    let sound: LetterSound
    let say: String
    let onDone: (_ right: Bool, _ helped: Bool) -> Void
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
                Text(question)
                    .font(.subheadline.weight(.semibold)).foregroundStyle(Palette.muted)
                    .frame(maxWidth: .infinity)
                SoundButtons(text: say, lang: ex.lang, size: sideways ? 52 : 64, plays: $plays)
                SoundWord(sound: sound, letter: ex.answer, lang: ex.lang, shown: picked != nil, tint: picked == nil ? D8.vermilion : D8.malachite, size: sideways ? 36 : 44)
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
                Group {
                    HStack(spacing: 8) {
                        Image(systemName: right ? "star.fill" : "arrow.uturn.left")
                        Text(right ? Self.cheer(ex.answer) : String(localized: "It's “\(ex.answer)”, as in \(Self.example(sound))."))
                            .lineLimit(1).minimumScaleFactor(0.7)
                    }
                    .font(.headline).foregroundStyle(right ? D8.malachite : D8.vermilion)
                    .frame(maxWidth: .infinity)
                    Button("Continue") { onDone(right, hinted) }
                        .buttonStyle(D8Primary())
                        .keyboardShortcut(.defaultAction)
                        .disabled(picked == nil)
                }
                .opacity(picked == nil ? 0 : 1)
                .accessibilityHidden(picked == nil)
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

    static func cheer(_ seed: String) -> String {
        let all = [String(localized: "Great ear!"), String(localized: "That's the sound!"), String(localized: "You heard it!"), String(localized: "Right on!")]
        return all[abs(seed.unicodeScalars.reduce(0) { $0 &+ Int($1.value) }) % all.count]
    }

    func tile(_ o: String) -> some View {
        let state: RowState = picked == nil ? .other : o == ex.answer ? .right : o == picked ? .wrong : .other
        return Button {
            if picked == nil {
                picked = o
                haptic(o == ex.answer)
                if o != ex.answer { shake += 1 }
                LangVoice.shared.speak(say, ex.lang)
                plays += 1
            } else if let s = LetterSounds.lookup(ex.lang, o) {
                LangVoice.shared.speak(LetterSounds.spoken(ex.lang, s), ex.lang)
            }
        } label: {
            VStack(spacing: 2) {
                Text(o).font(.system(size: sideways ? 28 : 36, weight: .heavy, design: .rounded)).lineLimit(1).minimumScaleFactor(0.5)
                if let s = LetterSounds.lookup(ex.lang, o) {
                    Label(Self.example(s), systemImage: "speaker.wave.2.fill").labelStyle(.titleAndIcon)
                        .font(.caption.weight(.semibold)).foregroundStyle(state == .right ? .white.opacity(0.85) : Palette.muted).lineLimit(1).minimumScaleFactor(0.6)
                        .opacity(picked == nil ? 0 : 1)
                        .accessibilityHidden(picked == nil)
                }
            }
            .frame(maxWidth: .infinity, minHeight: sideways ? 52 : 64)
            .foregroundStyle(state == .right ? .white : Palette.ink)
        }
        .buttonStyle(LetterTileStyle(state: state))
        .keyframeAnimator(initialValue: 0.0, trigger: state == .wrong ? shake : 0) { v, x in v.offset(x: x) } keyframes: { _ in
            LinearKeyframe(-8, duration: 0.06)
            LinearKeyframe(8, duration: 0.08)
            LinearKeyframe(-5, duration: 0.07)
            LinearKeyframe(0, duration: 0.06)
        }
        .scaleEffect(state == .right ? 1.05 : 1)
        .opacity(picked != nil && state == .other ? 0.55 : 1)
        .environment(\.layoutDirection, Lang.isRTL(ex.lang) ? .rightToLeft : .leftToRight)
        .accessibilityLabel(o)
    }
}

struct LetterTileStyle: ButtonStyle {
    let state: RowState

    func makeBody(configuration: Configuration) -> some View {
        let face: Color = state == .right ? D8.malachite : state == .wrong ? D8.wrongFace : D8.face
        let lip: Color = state == .right ? D8.malachiteLip : state == .wrong ? D8.vermilion : D8.edge
        configuration.label
            .background(face, in: .rect(cornerRadius: 16))
            .overlay { RoundedRectangle(cornerRadius: 16).strokeBorder(lip, lineWidth: 2) }
            .background(lip, in: .rect(cornerRadius: 16).offset(y: configuration.isPressed ? 1 : 4))
            .offset(y: configuration.isPressed ? 3 : 0)
    }
}
