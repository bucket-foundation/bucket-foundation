import BucketKit
import SwiftUI

struct SoundButtons: View {
    let text: String
    let lang: String
    var size: CGFloat = 64
    @Binding var plays: Int
    @State private var playing = false

    var body: some View {
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
        guard LangVoice.shared.speak(text, lang, slow: slow) else { return }
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

struct SoundHint: View {
    let sound: LetterSound

    var body: some View {
        HStack(alignment: .firstTextBaseline, spacing: 10) {
            Text("/\(sound.ipa)/")
                .font(.system(size: 17, weight: .bold, design: .rounded))
                .foregroundStyle(.white)
                .padding(.horizontal, 10).padding(.vertical, 4)
                .background(D8.lapis, in: .capsule)
            Text(sound.hint).font(.subheadline.weight(.medium)).foregroundStyle(Palette.ink)
                .fixedSize(horizontal: false, vertical: true)
        }
        .padding(12)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Palette.paper, in: .rect(cornerRadius: 14))
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
            if let result {
                HStack(spacing: 6) {
                    Image(systemName: result ? "sparkles" : "ear").symbolEffect(.bounce, value: tries)
                    Text(result ? Self.cheer(tries) : String(localized: "Close. Tap play, listen once more, then try again."))
                }
                .font(.subheadline.weight(.bold))
                .foregroundStyle(result ? D8.malachite : D8.lapis)
                .transition(.scale.combined(with: .opacity))
            }
        }
        .animation(.spring(duration: 0.35), value: result)
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

    var body: some View {
        VStack(spacing: 14) {
            WordTile(word: ex.answer, lang: ex.lang, reading: nil, size: 150, speakText: say, onTap: { LangVoice.shared.speak(say, ex.lang); plays += 1 }, glyph: true)
                .keyframeAnimator(initialValue: 1.0, trigger: plays) { v, s in v.scaleEffect(s) } keyframes: { _ in
                    SpringKeyframe(1.12, duration: 0.18)
                    SpringKeyframe(1.0, duration: 0.3)
                }
            Button { LangVoice.shared.speak(say, ex.lang); plays += 1 } label: {
                VStack(spacing: 2) {
                    LetterInWord(sound: sound, letter: ex.answer, lang: ex.lang, shown: true)
                    Text(sound.gloss).font(.subheadline.weight(.semibold)).foregroundStyle(Palette.muted)
                }
            }
            .buttonStyle(.plain)
            SoundButtons(text: say, lang: ex.lang, size: 56, plays: $plays)
            SoundHint(sound: sound)
            if LangListener.shared.canHear(ex.lang) {
                SayItButton(say: say, lang: ex.lang) { plays += 1 }
            }
            Button("Got it", action: onDone).buttonStyle(D8Primary())
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

    var body: some View {
        VStack(spacing: 16) {
            Text("Which letter makes this sound?")
                .font(.subheadline.weight(.semibold)).foregroundStyle(Palette.muted)
                .frame(maxWidth: .infinity)
            SoundButtons(text: say, lang: ex.lang, size: 72, plays: $plays)
            VStack(spacing: 2) {
                LetterInWord(sound: sound, letter: ex.answer, lang: ex.lang, shown: picked != nil, tint: picked == nil ? D8.vermilion : D8.malachite)
                    .keyframeAnimator(initialValue: 1.0, trigger: picked) { v, s in v.scaleEffect(s) } keyframes: { _ in
                        SpringKeyframe(1.15, duration: 0.2)
                        SpringKeyframe(1.0, duration: 0.35)
                    }
                Text(sound.gloss).font(.subheadline.weight(.semibold)).foregroundStyle(Palette.muted)
            }
            if hinted || picked != nil {
                SoundHint(sound: sound).transition(.scale(scale: 0.9).combined(with: .opacity))
            } else {
                Button { hinted = true; tap() } label: { Label("Hint", systemImage: "lightbulb.fill") }
                    .buttonStyle(PlainLink())
            }
            LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 10), count: vertical == .compact ? 4 : 2), spacing: 10) {
                ForEach(Array((ex.options ?? []).enumerated()), id: \.element) { k, o in
                    tile(o).optionKey(k)
                }
            }
            if let picked {
                HStack(spacing: 8) {
                    Image(systemName: right ? "star.fill" : "arrow.uturn.left").symbolEffect(.bounce, value: picked)
                    Text(right ? Self.cheer(ex.answer) : String(localized: "It's “\(ex.answer)”, as in \(sound.example)."))
                }
                .font(.headline).foregroundStyle(right ? D8.malachite : D8.vermilion)
                .frame(maxWidth: .infinity)
                .transition(.move(edge: .bottom).combined(with: .opacity))
                Button("Continue") { onDone(right, hinted) }
                    .buttonStyle(D8Primary())
                    .keyboardShortcut(.defaultAction)
            }
        }
        .animation(.spring(duration: 0.35), value: picked)
        .animation(.spring(duration: 0.3), value: hinted)
        .onAppear {
            #if DEBUG
            let args = ProcessInfo.processInfo.arguments
            if args.contains("-pickWrong") { picked = ex.options?.first { $0 != ex.answer } }
            if args.contains("-pickRight") { picked = ex.answer }
            #endif
        }
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
                Text(o).font(.system(size: 40, weight: .heavy, design: .rounded)).lineLimit(1).minimumScaleFactor(0.5)
                if picked != nil, let s = LetterSounds.lookup(ex.lang, o) {
                    Label(s.example, systemImage: "speaker.wave.2.fill").labelStyle(.titleAndIcon)
                        .font(.caption.weight(.semibold)).foregroundStyle(state == .right ? .white.opacity(0.85) : D8.label).lineLimit(1).minimumScaleFactor(0.6)
                }
            }
            .frame(maxWidth: .infinity, minHeight: 76)
            .foregroundStyle(state == .right ? .white : D8.ink)
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
        let face: Color = state == .right ? D8.malachite : state == .wrong ? Color(hex: 0xFBE9E5) : .white
        let lip: Color = state == .right ? D8.malachiteLip : state == .wrong ? D8.vermilion : D8.keyline
        configuration.label
            .background(face, in: .rect(cornerRadius: 16))
            .overlay { RoundedRectangle(cornerRadius: 16).strokeBorder(lip, lineWidth: 2) }
            .background(lip, in: .rect(cornerRadius: 16).offset(y: configuration.isPressed ? 1 : 4))
            .offset(y: configuration.isPressed ? 3 : 0)
    }
}
