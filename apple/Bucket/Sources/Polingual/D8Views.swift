import BucketKit
import SwiftUI

struct FlagTile: View {
    let lang: String
    var size: CGFloat = 44

    var body: some View {
        FlagFace(flag: D8Flag.of(lang))
            .frame(width: size, height: size)
            .overlay { Shine() }
            .modifier(Glaze(radius: size * 0.23))
            .accessibilityElement()
            .accessibilityLabel("\(langName(lang)) flag")
    }
}

struct CardHeader: View {
    let lang: String?
    let text: String

    var body: some View {
        HStack(spacing: 10) {
            if let lang { FlagTile(lang: lang) }
            Text(text).font(.subheadline).foregroundStyle(Palette.muted)
        }
    }
}

func readingText(_ r: Reading?) -> String? {
    guard let r else { return nil }
    let parts = [r.kana, r.roman, r.ipa.map { "/\($0)/" }].compactMap { $0 }.filter { !$0.trimmingCharacters(in: .whitespaces).isEmpty && $0 != "//" }
    return parts.isEmpty ? nil : parts.joined(separator: " · ")
}

struct WordTile: View {
    let word: String?
    let lang: String
    let reading: Reading?
    var size: CGFloat = 200
    var speakText: String?
    var onTap: (() -> Void)?

    var body: some View {
        let inset = size * 0.06
        let say = speakText ?? word ?? ""
        let canSay = LangVoice.shared.canSpeak(say, lang)
        Button {
            if let onTap { onTap(); return }
            if canSay { LangVoice.shared.speak(say, lang) }
        } label: {
            ZStack {
                FlagFace(flag: D8Flag.of(lang), emblem: false)
                RoundedRectangle(cornerRadius: 6).fill(D8.panel).padding(inset)
                VStack(spacing: 4) {
                    Text(langName(lang).uppercased()).font(D8.caps(size * 0.055)).tracking(0.8).foregroundStyle(D8.label)
                        .frame(maxWidth: .infinity, alignment: .leading)
                    Spacer(minLength: 0)
                    if let word {
                        let phrase = word.contains(" ")
                        let layout = phrase ? AnyLayout(VStackLayout(spacing: 4)) : AnyLayout(HStackLayout(spacing: 6))
                        layout {
                            Text(word)
                                .font(D8.word(size * (D8Fit.long(word) ? 0.15 : 0.21)))
                                .lineLimit(phrase ? 3 : 1)
                                .multilineTextAlignment(.center)
                                .minimumScaleFactor(phrase ? 0.75 : 0.4)
                                .fixedSize(horizontal: false, vertical: phrase)
                                .foregroundStyle(D8.ink)
                            if canSay { Image(systemName: "speaker.wave.2.fill").font(.system(size: size * 0.09)).foregroundStyle(D8.ink.opacity(0.55)) }
                        }
                        .environment(\.layoutDirection, Lang.isRTL(lang) ? .rightToLeft : .leftToRight)
                    } else {
                        Image(systemName: "speaker.wave.2.fill").font(.system(size: size * 0.24)).foregroundStyle(D8.ink.opacity(0.6))
                    }
                    Spacer(minLength: 0)
                    Text(word == nil ? " " : readingText(reading) ?? " ").font(.system(size: size * 0.075)).foregroundStyle(D8.ipa).lineLimit(word?.contains(" ") == true ? 2 : 1).minimumScaleFactor(0.6).multilineTextAlignment(.center)
                }
                .padding(.horizontal, inset * 1.7)
                .padding(.vertical, inset * 1.5)
                Shine()
            }
            .frame(width: size, height: size)
            .modifier(Glaze(radius: 14, lip: 6))
        }
        .buttonStyle(TilePress())
        .frame(maxWidth: .infinity)
        .accessibilityLabel([langName(lang), word, readingText(reading).map { "IPA \($0)" }].compactMap { $0 }.joined(separator: ", "))
        .accessibilityHint(canSay ? "Plays the word" : "")
    }
}

struct TilePress: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label.offset(y: configuration.isPressed ? 3 : 0).animation(.snappy(duration: 0.12), value: configuration.isPressed)
    }
}

enum TileState { case plain, right }

struct WideTile: View {
    let word: String
    let lang: String
    let reading: Reading?
    var state: TileState = .plain
    var label: Bool = true

    var body: some View {
        let canSay = LangVoice.shared.canSpeak(word, lang)
        Button {
            if canSay { LangVoice.shared.speak(word, lang) }
        } label: {
            VStack(spacing: 2) {
                HStack(spacing: 6) {
                    Text(word)
                        .font(D8.word(D8Fit.wide(word) && !word.contains(" ") ? 18 : 24))
                        .multilineTextAlignment(.center)
                        .fixedSize(horizontal: false, vertical: true)
                        .foregroundStyle(D8.ink)
                    if canSay { Image(systemName: "speaker.wave.2.fill").font(.system(size: 17)).foregroundStyle(D8.ink.opacity(0.55)) }
                }
                .environment(\.layoutDirection, Lang.isRTL(lang) ? .rightToLeft : .leftToRight)
                if let r = readingText(reading) {
                    Text(r).font(.footnote).foregroundStyle(D8.ipa).lineLimit(2).multilineTextAlignment(.center)
                }
            }
            .frame(maxWidth: .infinity)
            .padding(.horizontal, 12)
            .padding(.top, label ? 22 : 10)
            .padding(.bottom, 8)
            .overlay(alignment: .topLeading) {
                if label {
                    Text(langName(lang).uppercased()).font(D8.caps(11)).tracking(0.9).foregroundStyle(D8.label).padding(.leading, 10).padding(.top, 7)
                }
            }
            .background(D8.panel, in: .rect(cornerRadius: 6))
            .padding(10)
            .background { FlagFace(flag: D8Flag.of(lang), emblem: false) }
            .overlay { Shine() }
            .modifier(Glaze(radius: 14, lip: 6))
            .padding(state == .right ? 6 : 0)
            .overlay {
                if state == .right { RoundedRectangle(cornerRadius: 18).strokeBorder(D8.malachite, lineWidth: 3) }
            }
            .overlay(alignment: .topTrailing) {
                if state == .right {
                    Image(systemName: "checkmark")
                        .font(.system(size: 13, weight: .heavy))
                        .foregroundStyle(.white)
                        .frame(width: 26, height: 26)
                        .background(D8.malachite, in: .circle)
                        .offset(x: 8, y: -8)
                }
            }
        }
        .buttonStyle(TilePress())
        .accessibilityLabel("\(langName(lang)), \(word)\(state == .right ? ", right answer" : "")")
        .accessibilityHint(canSay ? "Plays the word" : "")
    }
}

enum RowState { case right, wrong, other }

struct AnswerRow: View {
    let word: String
    let lang: String
    let state: RowState
    var flag = true
    var reading: Reading?
    var say: String?

    var body: some View {
        let spoken = say ?? word
        let canSay = state == .right && LangVoice.shared.canSpeak(spoken, lang)
        Group {
            if canSay {
                Button { LangVoice.shared.speak(spoken, lang) } label: { row(canSay) }
                    .buttonStyle(.plain)
                    .accessibilityHint("Plays the word")
            } else {
                row(canSay)
            }
        }
        .accessibilityElement(children: .combine)
        .accessibilityLabel("\(word), \(langName(lang))\(state == .right ? ", right answer" : state == .wrong ? ", your pick, wrong" : "")")
    }

    func row(_ canSay: Bool) -> some View {
        HStack(spacing: 10) {
            if flag { FlagTile(lang: lang, size: state == .right ? 30 : 26) }
            VStack(alignment: .leading, spacing: 1) {
                HStack(spacing: 6) {
                    Text(word).font(.system(size: state == .right ? 19 : 17, weight: .bold, design: .rounded))
                        .strikethrough(state == .wrong, color: D8.vermilion).foregroundStyle(Palette.ink).lineLimit(2)
                    if canSay { Image(systemName: "speaker.wave.2.fill").font(.system(size: 13)).foregroundStyle(Palette.muted) }
                }
                .environment(\.layoutDirection, Lang.isRTL(lang) ? .rightToLeft : .leftToRight)
                if state == .right, let r = readingText(reading) { Text(r).font(.caption).foregroundStyle(Palette.muted) }
            }
            Spacer(minLength: 0)
            if state != .other {
                Image(systemName: state == .right ? "checkmark" : "xmark").font(.system(size: 12, weight: .heavy)).foregroundStyle(.white)
                    .frame(width: 22, height: 22).background(state == .right ? D8.malachite : D8.vermilion, in: .circle)
            }
        }
        .padding(.horizontal, 12)
        .padding(.vertical, state == .right ? 8 : 0)
        .frame(minHeight: 44)
        .background(state == .right ? D8.malachite.opacity(0.1) : .clear, in: .rect(cornerRadius: 12))
        .overlay {
            if state != .other { RoundedRectangle(cornerRadius: 12).strokeBorder(state == .right ? D8.malachite : D8.vermilion, lineWidth: 2) }
        }
        .opacity(state == .other ? 0.38 : 1)
    }

}

struct MiniTile: View {
    let word: String?
    let lang: String
    let reading: Reading?

    var body: some View {
        VStack(spacing: 1) {
            Text(word ?? "?").font(D8.word(18)).lineLimit(1).minimumScaleFactor(0.5).foregroundStyle(word == nil ? D8.disabledText : D8.ink)
            Text(readingText(reading) ?? " ").font(.caption2).foregroundStyle(D8.ipa).lineLimit(1).minimumScaleFactor(0.6)
        }
        .frame(maxWidth: .infinity)
        .padding(.top, 16)
        .padding(.bottom, 6)
        .padding(.horizontal, 4)
        .overlay(alignment: .topLeading) {
            Text(langName(lang).uppercased()).font(D8.caps(8)).tracking(0.6).foregroundStyle(D8.label).padding(.leading, 6).padding(.top, 5)
        }
        .background(D8.panel, in: .rect(cornerRadius: 5))
        .padding(6)
        .background { FlagFace(flag: D8Flag.of(lang)) }
        .modifier(Glaze(radius: 10, lip: 4))
        .overlay {
            if word == nil { RoundedRectangle(cornerRadius: 13).strokeBorder(Palette.muted, style: StrokeStyle(lineWidth: 2, dash: [5, 4])).padding(-3) }
        }
        .accessibilityElement(children: .combine)
    }
}

struct D8Primary: ButtonStyle {
    @Environment(\.isEnabled) private var enabled
    var compact = false

    func makeBody(configuration: Configuration) -> some View {
        let pressed = configuration.isPressed && enabled
        configuration.label
            .font(.system(size: 18, weight: .heavy, design: .rounded))
            .foregroundStyle(enabled ? .white : D8.disabledText)
            .padding(.horizontal, compact ? 18 : 0)
            .frame(maxWidth: compact ? nil : .infinity, minHeight: compact ? 42 : 50)
            .background(enabled ? D8.vermilion : D8.disabled, in: .rect(cornerRadius: 12))
            .background(enabled ? D8.vermilionLip : D8.disabled.opacity(0.6), in: .rect(cornerRadius: 12).offset(y: pressed ? 1 : 4))
            .offset(y: pressed ? 3 : 0)
            .padding(.bottom, 4)
    }
}

struct PlainLink: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label.font(.subheadline.weight(.bold)).underline().foregroundStyle(Palette.muted).frame(maxWidth: .infinity).opacity(configuration.isPressed ? 0.6 : 1)
    }
}

struct BranchTile: View {
    let branch: String
    var size: CGFloat = 44

    static let pigments: [String: (UInt32, String)] = [
        "00": (0xC8952C, "✦"), "01": (0x1F4E9A, "∑"), "02": (0xD9381E, "Φ"), "03": (0x1E7A5A, "χ"),
        "04": (0x231F20, "∫"), "05": (0x5B1A4A, "ψ"), "06": (0x2E6FA8, "★"), "07": (0x8E2312, "∞"), "la": (0x5B1A4A, "Aa"),
    ]

    var body: some View {
        let p = Self.pigments[String(branch.prefix(2))] ?? (0x5d5650, String(branch.prefix(1)).uppercased())
        Text(p.1)
            .font(.system(size: size * 0.48, weight: .bold, design: .serif))
            .foregroundStyle(D8.parchment)
            .frame(width: size, height: size)
            .background(Color(hex: p.0))
            .overlay { Shine() }
            .modifier(Glaze(radius: size * 0.23))
            .accessibilityHidden(true)
    }
}

func langName(_ code: String) -> String {
    guard Locale.current.language.languageCode?.identifier != "en",
          let tag = Lang.info[code]?.bcp47,
          let name = Locale.current.localizedString(forLanguageCode: String(tag.prefix { $0 != "-" })) else { return Lang.name(code) }
    return name.prefix(1).uppercased() + name.dropFirst()
}
