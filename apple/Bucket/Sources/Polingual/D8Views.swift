import BucketKit
import SwiftUI

enum D8 {
    static let parchment = Color(hex: 0xF6EEDC)
    static let ink = Color(hex: 0x231F20)
    static let vermilion = Color(hex: 0xD9381E)
    static let vermilionLip = Color(hex: 0x8E2312)
    static let malachite = Color(hex: 0x1E7A5A)
    static let malachiteLip = Color(hex: 0x135440)
    static let lapis = Color(hex: 0x1F4E9A)
    static let keyline = Color(hex: 0xE3D6B8)
    static let label = Color(hex: 0x555555)
    static let ipa = Color(hex: 0x444444)
    static let panel = Color(hex: 0xF6EEDC).opacity(0.8)
    static let disabled = Color(light: 0xE4DCCB, dark: 0x3A342C)
    static let disabledText = Color(light: 0x8A8070, dark: 0x8A8070)

    static func word(_ size: CGFloat) -> Font { .system(size: size, weight: .heavy, design: .rounded) }
    static func caps(_ size: CGFloat) -> Font { .system(size: size, weight: .bold, design: .monospaced) }
}

extension Color {
    init(hex: UInt32) {
        self.init(.sRGB, red: Double((hex >> 16) & 0xFF) / 255, green: Double((hex >> 8) & 0xFF) / 255, blue: Double(hex & 0xFF) / 255)
    }
}

struct FlagFace: View {
    let flag: D8Flag
    var emblem = true

    var body: some View {
        GeometryReader { g in
            let w = g.size.width, h = g.size.height
            ZStack(alignment: .topLeading) {
                bands(w, h)
                if let c = flag.canton {
                    Rectangle().fill(Color(hex: c.color)).frame(width: w * c.width, height: h * c.height)
                }
                if let c = flag.cross {
                    Rectangle().fill(Color(hex: c)).frame(width: w, height: h * 0.2).offset(y: h * 0.4)
                    Rectangle().fill(Color(hex: c)).frame(width: w * 0.2, height: h).offset(x: w * 0.3)
                }
                if let c = flag.hoist {
                    Path { p in
                        p.move(to: .zero)
                        p.addLine(to: CGPoint(x: w * 0.5, y: h / 2))
                        p.addLine(to: CGPoint(x: 0, y: h))
                        p.closeSubpath()
                    }
                    .fill(Color(hex: c))
                }
                if emblem, let e = flag.emblem {
                    Text(e.glyph)
                        .font(.system(size: min(w, h) * e.scale, weight: .bold, design: flag.pigment ? .serif : .default))
                        .foregroundStyle(Color(hex: e.color))
                        .position(x: w * e.x, y: h * e.y)
                }
            }
        }
        .accessibilityHidden(true)
    }

    @ViewBuilder
    func bands(_ w: CGFloat, _ h: CGFloat) -> some View {
        let total = flag.bands.reduce(0) { $0 + $1.weight }
        if flag.layout == .horizontal {
            VStack(spacing: 0) {
                ForEach(Array(flag.bands.enumerated()), id: \.offset) { _, b in
                    Rectangle().fill(Color(hex: b.color)).frame(height: h * b.weight / total)
                }
            }
        } else {
            HStack(spacing: 0) {
                ForEach(Array(flag.bands.enumerated()), id: \.offset) { _, b in
                    Rectangle().fill(Color(hex: b.color)).frame(width: w * b.weight / total)
                }
            }
        }
    }
}

struct Glaze: ViewModifier {
    let radius: CGFloat
    var lip: CGFloat = 0

    func body(content: Content) -> some View {
        content
            .overlay {
                RoundedRectangle(cornerRadius: radius)
                    .strokeBorder(.black.opacity(0.15), lineWidth: 2)
            }
            .overlay(alignment: .bottom) {
                LinearGradient(colors: [.clear, .black.opacity(0.18)], startPoint: .top, endPoint: .bottom)
                    .frame(height: radius * 2.4)
                    .allowsHitTesting(false)
            }
            .overlay(alignment: .top) {
                LinearGradient(colors: [.white.opacity(0.25), .clear], startPoint: .top, endPoint: .bottom)
                    .frame(height: radius * 2)
                    .allowsHitTesting(false)
            }
            .clipShape(.rect(cornerRadius: radius))
            .shadow(color: D8.ink.opacity(lip > 0 ? 0.3 : 0), radius: 0, x: 0, y: lip)
    }
}

struct Shine: View {
    var body: some View {
        GeometryReader { g in
            Ellipse().fill(.white.opacity(0.45))
                .frame(width: g.size.width * 0.32, height: max(8, g.size.height * 0.09))
                .rotationEffect(.degrees(-16))
                .position(x: g.size.width * 0.74, y: max(10, g.size.height * 0.1))
        }
        .allowsHitTesting(false)
    }
}

struct FlagTile: View {
    let lang: String
    var size: CGFloat = 44

    var body: some View {
        FlagFace(flag: D8Flag.of(lang))
            .frame(width: size, height: size)
            .overlay { Shine() }
            .modifier(Glaze(radius: size * 0.23))
            .accessibilityElement()
            .accessibilityLabel("\(Lang.name(lang)) flag")
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
    if let ipa = r.ipa, !ipa.isEmpty { return "/\(ipa)/" }
    if let k = r.kana, !k.isEmpty { return [k, r.roman].compactMap { $0 }.joined(separator: " · ") }
    if let roman = r.roman, !roman.isEmpty { return roman }
    return nil
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
                    Text(Lang.name(lang).uppercased()).font(D8.caps(size * 0.055)).tracking(0.8).foregroundStyle(D8.label)
                        .frame(maxWidth: .infinity, alignment: .leading)
                    Spacer(minLength: 0)
                    if let word {
                        HStack(spacing: 6) {
                            Text(word)
                                .font(D8.word(size * (D8Fit.long(word) ? 0.15 : 0.21)))
                                .lineLimit(1)
                                .minimumScaleFactor(0.4)
                                .foregroundStyle(D8.ink)
                            if canSay { Image(systemName: "speaker.wave.2.fill").font(.system(size: size * 0.09)).foregroundStyle(D8.ink.opacity(0.55)) }
                        }
                        .environment(\.layoutDirection, Lang.isRTL(lang) ? .rightToLeft : .leftToRight)
                    } else {
                        Image(systemName: "speaker.wave.2.fill").font(.system(size: size * 0.24)).foregroundStyle(D8.ink.opacity(0.6))
                    }
                    Spacer(minLength: 0)
                    Text(word == nil ? " " : readingText(reading) ?? " ").font(.system(size: size * 0.075)).foregroundStyle(D8.ipa).lineLimit(1).minimumScaleFactor(0.6)
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
        .accessibilityLabel([Lang.name(lang), word, readingText(reading).map { "IPA \($0)" }].compactMap { $0 }.joined(separator: ", "))
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
                    Text(Lang.name(lang).uppercased()).font(D8.caps(11)).tracking(0.9).foregroundStyle(D8.label).padding(.leading, 10).padding(.top, 7)
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
        .accessibilityLabel("\(Lang.name(lang)), \(word)\(state == .right ? ", right answer" : "")")
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

    var body: some View {
        let canSay = state == .right && LangVoice.shared.canSpeak(word, lang)
        Group {
            if canSay {
                Button { LangVoice.shared.speak(word, lang) } label: { row(canSay) }
                    .buttonStyle(.plain)
                    .accessibilityHint("Plays the word")
            } else {
                row(canSay)
            }
        }
        .accessibilityElement(children: .combine)
        .accessibilityLabel("\(word), \(Lang.name(lang))\(state == .right ? ", right answer" : state == .wrong ? ", your pick, wrong" : "")")
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
            Text(Lang.name(lang).uppercased()).font(D8.caps(8)).tracking(0.6).foregroundStyle(D8.label).padding(.leading, 6).padding(.top, 5)
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

struct D8Option: ButtonStyle {
    var selected = false
    var align: Alignment = .leading
    var compact = false

    func makeBody(configuration: Configuration) -> some View {
        let down = selected || configuration.isPressed
        configuration.label
            .font(.system(size: 18, weight: .heavy, design: .rounded))
            .foregroundStyle(D8.ink)
            .frame(maxWidth: compact ? nil : .infinity, minHeight: compact ? 42 : 50, alignment: align)
            .padding(.horizontal, 16)
            .background(selected ? Color(hex: 0xEEF3FB) : .white, in: .rect(cornerRadius: 12))
            .overlay { RoundedRectangle(cornerRadius: 12).strokeBorder(selected ? D8.lapis : D8.keyline, lineWidth: selected ? 3 : 2) }
            .background(selected ? D8.lapis : D8.keyline, in: .rect(cornerRadius: 12).offset(y: down ? 1 : 4))
            .offset(y: down ? 3 : 0)
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
