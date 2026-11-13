import BucketKit
import SwiftUI

struct SpokenTile: View {
    let text: String
    var detail: String?
    let lang: String
    let state: RowState
    var symbol: String?
    var selected = false
    let action: () -> Void
    @Environment(\.verticalSizeClass) private var vertical

    var body: some View {
        Button(action: action) {
            VStack(spacing: 2) {
                if let symbol { Image(systemName: symbol).font(.system(size: 20, weight: .bold)) }
                Text(text).font(.system(size: vertical == .compact ? 20 : 24, weight: .heavy, design: .rounded)).lineLimit(1).minimumScaleFactor(0.5)
                if let detail {
                    Text(detail).font(.caption.weight(.semibold)).foregroundStyle(state == .right ? .white.opacity(0.85) : Palette.muted).lineLimit(2).minimumScaleFactor(0.7).multilineTextAlignment(.center)
                }
            }
            .padding(.horizontal, 6).padding(.vertical, 6)
            .frame(maxWidth: .infinity, minHeight: vertical == .compact ? 52 : 68)
            .foregroundStyle(state == .right ? .white : Palette.ink)
        }
        .buttonStyle(LetterTileStyle(state: state))
        .overlay { if selected { RoundedRectangle(cornerRadius: 16).strokeBorder(D8.lapis, lineWidth: 3) } }
        .accessibilityAddTraits(selected ? .isSelected : [])
        .accessibilityLabel(detail.map { "\(text), \($0)" } ?? text)
    }
}

struct TileGrid<Content: View>: View {
    @ViewBuilder let content: Content

    var body: some View {
        LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 10), count: 2), spacing: 10) { content }
    }
}

struct NativeVoiceNote: View {
    var body: some View {
        Text("Device voice only. A native recording would show this contrast better.")
            .font(.caption.weight(.semibold)).foregroundStyle(Palette.muted)
            .frame(maxWidth: .infinity, alignment: .leading)
            .fixedSize(horizontal: false, vertical: true)
    }
}

struct DrillLine: View {
    let shown: Bool
    let text: String

    var body: some View {
        Label(text, systemImage: "arrow.uturn.left")
            .lineLimit(1).minimumScaleFactor(0.7)
            .font(.headline).foregroundStyle(D8.vermilion)
            .frame(maxWidth: .infinity)
            .opacity(shown ? 1 : 0)
            .accessibilityHidden(!shown)
    }
}

struct DrillResult: View {
    let shown: Bool
    let right: Bool
    let wrongText: String
    let onContinue: () -> Void

    var body: some View {
        DrillLine(shown: shown && !right, text: wrongText)
        Button("Continue", action: onContinue)
            .buttonStyle(D8Primary()).keyboardShortcut(.defaultAction)
            .disabled(!shown)
            .opacity(shown ? 1 : 0)
            .accessibilityHidden(!shown)
    }
}

@MainActor
func hearAll(_ words: [SpokenOption], _ lang: String) {
    LangVoice.shared.speakTogether(words.map { VoiceLine(lang: lang, text: $0.say) })
}

struct PairMeet: View {
    let ex: Exercise
    let onDone: () -> Void

    var words: [SpokenOption] { ex.spoken ?? [] }

    var body: some View {
        VStack(spacing: 12) {
            Text("Tap each one and hear the difference.").font(.subheadline.weight(.semibold)).foregroundStyle(Palette.muted).frame(maxWidth: .infinity)
            TileGrid {
                ForEach(words, id: \.key) { w in
                    SpokenTile(text: w.text, detail: w.gloss, lang: ex.lang, state: .other, symbol: "speaker.wave.2.fill") { LangVoice.shared.speak(w.say, ex.lang) }
                }
            }
            if let hint = ex.hint { Text(hint).font(.subheadline.weight(.medium)).foregroundStyle(Palette.ink).frame(maxWidth: .infinity, alignment: .leading).fixedSize(horizontal: false, vertical: true) }
            if ex.nativeVoice { NativeVoiceNote() }
            Button("Got it", action: onDone).buttonStyle(D8Primary())
        }
        .onAppear { hearAll(words, ex.lang) }
    }
}

struct PairDrill: View {
    let ex: Exercise
    let onDone: (_ right: Bool, _ helped: Bool) -> Void
    @State private var plays = 0
    @State private var picked: String?

    var words: [SpokenOption] { ex.spoken ?? [] }
    var target: SpokenOption? { words.first { $0.key == ex.answer } }
    var right: Bool { picked == ex.answer }

    var body: some View {
        VStack(spacing: 12) {
            Text("Which one did you hear?").font(.subheadline.weight(.semibold)).foregroundStyle(Palette.muted).frame(maxWidth: .infinity)
            SoundButtons(text: ex.prompt, lang: ex.lang, size: 64, plays: $plays)
            TileGrid {
                ForEach(words, id: \.key) { w in
                    let state: RowState = picked == nil ? .other : w.key == ex.answer ? .right : w.key == picked ? .wrong : .other
                    SpokenTile(text: w.text, detail: w.gloss, lang: ex.lang, state: state) { choose(w) }
                }
            }
            Group {
                if let hint = ex.hint { Text(hint).font(.subheadline.weight(.medium)).foregroundStyle(Palette.ink).frame(maxWidth: .infinity, alignment: .leading).fixedSize(horizontal: false, vertical: true) }
                Button { hearAll(words, ex.lang) } label: { Label("Hear them again", systemImage: "speaker.wave.2.fill") }.buttonStyle(D8Option(align: .center, compact: true)).disabled(picked == nil)
                if ex.nativeVoice { NativeVoiceNote() }
            }
            .opacity(picked == nil ? 0 : 1)
            .accessibilityHidden(picked == nil)
            DrillResult(shown: picked != nil, right: right, wrongText: String(localized: "That was “\(target?.text ?? picked ?? "")”.")) { onDone(right, false) }
        }
        .animation(.easeOut(duration: 0.18), value: picked)
        .onAppear {
            LangVoice.shared.speak(ex.prompt, ex.lang, kind: .auto)
            #if DEBUG
            let args = ProcessInfo.processInfo.arguments
            if args.contains("-pickWrong") { picked = words.first { $0.key != ex.answer }?.key }
            if args.contains("-pickRight") { picked = ex.answer }
            #endif
        }
    }

    func choose(_ w: SpokenOption) {
        guard picked == nil else {
            LangVoice.shared.speak(w.say, ex.lang)
            return
        }
        picked = w.key
        haptic(w.key == ex.answer)
        if w.key == ex.answer {
            LangVoice.shared.speak(w.say, ex.lang)
        } else {
            hearAll([w] + words.filter { $0.key == ex.answer }, ex.lang)
        }
    }
}

struct LetterSoundDrill: View {
    let ex: Exercise
    let sound: LetterSound
    let say: String
    let onDone: (_ right: Bool, _ helped: Bool) -> Void
    @State private var picked: String?

    var right: Bool { picked == ex.answer }
    var character: Bool { ScriptCourse.isCharacter(ex.lang, ex.answer) }

    var body: some View {
        VStack(spacing: 12) {
            Text(character ? String(localized: "What does this character say?") : String(localized: "What sound does this make?"))
                .font(.subheadline.weight(.semibold)).foregroundStyle(Palette.muted).frame(maxWidth: .infinity)
            Text(ex.answer.replacingOccurrences(of: "◌", with: ""))
                .font(.system(size: 76, weight: .heavy, design: .rounded)).lineLimit(1).minimumScaleFactor(0.5)
                .foregroundStyle(Palette.ink)
                .environment(\.layoutDirection, Lang.isRTL(ex.lang) ? .rightToLeft : .leftToRight)
            TileGrid {
                ForEach(ex.spoken ?? [], id: \.key) { o in
                    let state: RowState = picked == nil ? .other : o.key == ex.answer ? .right : o.key == picked ? .wrong : .other
                    SpokenTile(text: o.text, detail: picked == nil ? nil : o.gloss, lang: ex.lang, state: state) { choose(o) }
                }
            }
            SoundHint(sound: sound).opacity(picked == nil ? 0 : 1).accessibilityHidden(picked == nil)
            DrillResult(shown: picked != nil, right: right, wrongText: String(localized: "It's “\(ex.spoken?.first { $0.key == ex.answer }?.text ?? ex.answer)”, as in \(sound.example).")) { onDone(right, false) }
        }
        .animation(.easeOut(duration: 0.18), value: picked)
        .onAppear {
            #if DEBUG
            let args = ProcessInfo.processInfo.arguments
            if args.contains("-pickWrong") { picked = ex.spoken?.first { $0.key != ex.answer }?.key }
            if args.contains("-pickRight") { picked = ex.answer }
            #endif
        }
    }

    func choose(_ o: SpokenOption) {
        guard picked == nil else {
            LangVoice.shared.speak(o.say, ex.lang)
            return
        }
        picked = o.key
        haptic(o.key == ex.answer)
        if o.key == ex.answer {
            LangVoice.shared.speak(say, ex.lang)
        } else {
            LangVoice.shared.speak(say, ex.lang)
        }
    }
}

struct BlendDrill: View {
    let ex: Exercise
    let onDone: (_ right: Bool, _ helped: Bool) -> Void
    @State private var chosen: String?
    @State private var checked = false

    var options: [SpokenOption] { ex.spoken ?? [] }
    var right: Bool { chosen == ex.answer }
    var voiced: Bool { options.allSatisfy { LangVoice.shared.canSpeak($0.say, ex.lang) } }
    var taught: String { (ex.hint ?? "").replacingOccurrences(of: "◌", with: "").lowercased() }

    var body: some View {
        VStack(spacing: 12) {
            Text(voiced ? String(localized: "Sound it out, then find the word you hear.") : String(localized: "Sound it out, then find its meaning."))
                .font(.subheadline.weight(.semibold)).foregroundStyle(Palette.muted).frame(maxWidth: .infinity).multilineTextAlignment(.center)
            chips.environment(\.layoutDirection, Lang.isRTL(ex.lang) ? .rightToLeft : .leftToRight)
            ForEach(Array(options.enumerated()), id: \.element.key) { k, o in
                SpokenTile(text: label(k, o), detail: checked ? o.gloss : nil, lang: ex.lang, state: state(o), symbol: voiced && !checked ? "speaker.wave.2.fill" : nil, selected: !checked && o.key == chosen) { choose(o) }
            }
            DrillLine(shown: checked && !right, text: String(localized: "That word was “\(ex.answer)”."))
            Button(checked ? String(localized: "Continue") : String(localized: "Check")) {
                if checked { onDone(right, false); return }
                checked = true
                haptic(right)
                if let say = options.first(where: { $0.key == ex.answer })?.say { LangVoice.shared.speak(say, ex.lang) }
            }
            .buttonStyle(D8Primary()).keyboardShortcut(.defaultAction).disabled(chosen == nil)
        }
        .animation(.easeOut(duration: 0.18), value: checked)
        .onAppear {
            #if DEBUG
            let args = ProcessInfo.processInfo.arguments
            if args.contains("-pickWrong") { chosen = options.first { $0.key != ex.answer }?.key; checked = true }
            if args.contains("-pickRight") { chosen = ex.answer; checked = true }
            #endif
        }
    }

    var chips: some View {
        HStack(spacing: 4) {
            ForEach(Array((ex.segments ?? []).enumerated()), id: \.offset) { _, seg in
                Text(seg)
                    .font(D8.word(30)).lineLimit(1).minimumScaleFactor(0.4)
                    .padding(.horizontal, 8).padding(.vertical, 6)
                    .foregroundStyle(seg.lowercased() == taught ? .white : Palette.ink)
                    .background(seg.lowercased() == taught ? D8.vermilion : Palette.card, in: .rect(cornerRadius: 10))
                    .overlay(RoundedRectangle(cornerRadius: 10).strokeBorder(D8.keyline))
            }
        }
        .frame(maxWidth: .infinity)
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(ex.answer)
    }

    func label(_ k: Int, _ o: SpokenOption) -> String {
        checked ? o.text : voiced ? String(localized: "Word \(k + 1)") : o.gloss
    }

    func state(_ o: SpokenOption) -> RowState {
        guard checked else { return .other }
        return o.key == ex.answer ? .right : o.key == chosen ? .wrong : .other
    }

    func choose(_ o: SpokenOption) {
        LangVoice.shared.speak(o.say, ex.lang)
        if !checked { chosen = o.key }
    }
}
