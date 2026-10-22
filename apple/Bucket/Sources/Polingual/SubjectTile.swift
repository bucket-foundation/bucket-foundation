import BucketKit
import SwiftUI

struct Subject: Equatable {
    let symbol: String
    let name: String
    let native: String?
    let color: Color

    static let langFlags: [String: String] = [
        "en": "🇺🇸", "es": "🇪🇸", "fr": "🇫🇷", "it": "🇮🇹", "pt": "🇵🇹", "de": "🇩🇪", "nl": "🇳🇱", "sv": "🇸🇪", "pl": "🇵🇱", "fi": "🇫🇮",
        "ru": "🇷🇺", "el": "🇬🇷", "ar": "🇸🇦", "hi": "🇮🇳", "ja": "🇯🇵", "zh": "🇨🇳", "ko": "🇰🇷", "he": "🇮🇱", "fa": "🇮🇷", "tr": "🇹🇷",
        "cs": "🇨🇿", "id": "🇮🇩", "vi": "🇻🇳", "th": "🇹🇭", "ta": "🇮🇳", "la": "🏛️", "grc": "🏛️", "sa": "🕉️", "ang": "📜",
    ]

    static let langNative: [String: String] = [
        "en": "English", "es": "Español", "fr": "Français", "it": "Italiano", "pt": "Português", "de": "Deutsch", "nl": "Nederlands",
        "sv": "Svenska", "pl": "Polski", "fi": "Suomi", "ru": "Русский", "el": "Ελληνικά", "ar": "العربية", "hi": "हिन्दी", "ja": "日本語",
        "zh": "中文", "ko": "한국어", "he": "עברית", "fa": "فارسی", "tr": "Türkçe", "cs": "Čeština", "id": "Bahasa Indonesia",
        "vi": "Tiếng Việt", "th": "ไทย", "ta": "தமிழ்", "la": "Latina", "grc": "Ἑλληνική", "sa": "संस्कृतम्", "ang": "Englisc",
    ]

    static let langColors: [String: UInt32] = [
        "en": 0x3D5A80, "es": 0xC8553D, "fr": 0x2F5DA8, "it": 0x2E8B57, "pt": 0x1F6F50, "de": 0xB8860B, "nl": 0xE07A1F, "sv": 0x2A7AB0,
        "pl": 0xB0304A, "fi": 0x3B6EA8, "ru": 0x9B2335, "el": 0x2B7BB9, "ar": 0x1E7A4F, "hi": 0xD9822B, "ja": 0xBC002D, "zh": 0xC0392B,
        "ko": 0x30478C, "he": 0x2D5DA1, "fa": 0x23856D, "tr": 0xC0282D, "cs": 0x2F4F8F, "id": 0xB22234, "vi": 0xC9302C, "th": 0x2E3A87,
        "ta": 0x8E4585, "la": 0x7A5C2E, "grc": 0x5C6B7A, "sa": 0xB5651D, "ang": 0x6B5B3E,
    ]

    static let branchColors: [String: UInt32] = [
        "00-learning-to-learn": 0xB08A2E, "01-mathematics": 0x3D5A80, "02-physics": 0x2F5DA8, "03-chemistry": 0x2E8B57,
        "04-information": 0x6A4C93, "05-biophysics": 0xC8553D, "06-cosmology": 0x2E3A87, "07-mind": 0x8E4585,
    ]

    static func language(_ code: String) -> Subject {
        let hex = langColors[code] ?? 0x3B5E2B
        return Subject(symbol: langFlags[code] ?? "🌐", name: Lang.name(code), native: langNative[code].flatMap { $0 == Lang.name(code) ? nil : $0 }, color: Color(light: hex, dark: hex))
    }

    static func branch(_ entry: DeckEntry) -> Subject {
        let hex = branchColors[entry.id] ?? 0x3B5E2B
        return Subject(symbol: entry.mark.isEmpty ? "✦" : entry.mark, name: entry.title, native: nil, color: Color(light: hex, dark: hex))
    }
}

enum Squiggle {
    static let surface = Color(light: 0xFFFFFF, dark: 0x2A2620)
    static let line = Color(light: 0xE5E0D2, dark: 0x4A443A)
    static let text = Color(light: 0x2B2B2B, dark: 0xF2EDE0)
    static let muted = Color(light: 0x5E5A52, dark: 0xB5AE9E)
    static let pink = Color(light: 0xFF4B91, dark: 0xFF4B91)
    static let onPink = Color(light: 0x1A1A1A, dark: 0x1A1A1A)
    static let bounce = Animation.timingCurve(0.34, 1.56, 0.64, 1, duration: 0.3)
}

struct SquiggleCard: ViewModifier {
    var radius: CGFloat = 16

    func body(content: Content) -> some View {
        content
            .background(Squiggle.surface, in: .rect(cornerRadius: radius))
            .overlay(RoundedRectangle(cornerRadius: radius).stroke(Squiggle.line, lineWidth: 2))
            .background(Squiggle.line, in: .rect(cornerRadius: radius).offset(y: 4))
            .padding(.bottom, 4)
    }
}

struct SquiggleTag: View {
    let text: String

    var body: some View {
        Text(text)
            .font(.system(.caption, design: .rounded, weight: .semibold))
            .foregroundStyle(Squiggle.onPink)
            .padding(.horizontal, 8)
            .padding(.vertical, 4)
            .background(Squiggle.pink, in: .rect(cornerRadius: 8))
    }
}

struct SubjectTile: View {
    let subject: Subject
    var caption: String?
    var highlight = false
    @State private var pop = false

    var body: some View {
        HStack(spacing: 12) {
            Text(subject.symbol)
                .font(.system(size: 30, weight: .bold, design: .rounded))
                .foregroundStyle(.white)
                .minimumScaleFactor(0.5)
                .frame(width: 56, height: 56)
                .background(subject.color, in: .rect(cornerRadius: 12))
                .background(subject.color.opacity(0.55), in: .rect(cornerRadius: 12).offset(y: 3))
            VStack(alignment: .leading, spacing: 3) {
                Text(subject.name)
                    .font(.system(.title2, design: .rounded, weight: .bold))
                    .foregroundStyle(Squiggle.text)
                if let native = subject.native {
                    Text(native).font(.system(.subheadline, design: .rounded)).foregroundStyle(Squiggle.muted)
                }
                HStack(spacing: 6) {
                    if highlight { SquiggleTag(text: "New language") }
                    if let caption { Text(caption).font(.system(.caption, design: .rounded, weight: .semibold)).foregroundStyle(Squiggle.muted) }
                }
            }
            Spacer(minLength: 0)
        }
        .padding(12)
        .modifier(SquiggleCard())
        .scaleEffect(pop ? 1.03 : 1)
        .onAppear {
            guard highlight else { return }
            withAnimation(Squiggle.bounce) { pop = true }
            withAnimation(Squiggle.bounce.delay(0.3)) { pop = false }
        }
        .accessibilityElement(children: .combine)
        .accessibilityLabel("\(highlight ? "New language, " : "")\(subject.name)\(caption.map { ", \($0)" } ?? "")")
    }
}

struct WordSetTiles: View {
    let words: [LangWord]

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("In your other languages").font(.system(.subheadline, design: .rounded, weight: .semibold)).foregroundStyle(Squiggle.muted)
            LazyVGrid(columns: [GridItem(.adaptive(minimum: 104), spacing: 10)], spacing: 10) {
                ForEach(words, id: \.lang) { w in
                    let s = Subject.language(w.lang)
                    VStack(spacing: 4) {
                        Text(s.symbol).font(.title2)
                        Text(w.word).font(.system(.headline, design: .rounded, weight: .bold)).foregroundStyle(Squiggle.text).lineLimit(1).minimumScaleFactor(0.6)
                        Text(s.name).font(.system(.caption2, design: .rounded, weight: .semibold)).foregroundStyle(Squiggle.muted)
                    }
                    .frame(maxWidth: .infinity, minHeight: 88)
                    .modifier(SquiggleCard(radius: 14))
                    .overlay(alignment: .topTrailing) { PlayButton(text: w.word, lang: w.lang).padding(6).font(.caption) }
                    .accessibilityElement(children: .combine)
                }
            }
        }
    }
}
