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

struct SubjectTile: View {
    let subject: Subject
    var caption: String?
    var highlight = false

    var body: some View {
        HStack(spacing: 14) {
            Text(subject.symbol)
                .font(.system(size: 34, weight: .semibold, design: .serif))
                .foregroundStyle(.white)
                .minimumScaleFactor(0.5)
                .frame(width: 62, height: 62)
                .background(subject.color.gradient, in: .rect(cornerRadius: 14))
                .shadow(color: subject.color.opacity(0.35), radius: highlight ? 10 : 0, y: highlight ? 4 : 0)
            VStack(alignment: .leading, spacing: 2) {
                if highlight {
                    Text("NOW IN").font(.caption2.weight(.heavy)).tracking(1.4).foregroundStyle(subject.color)
                }
                Text(subject.name)
                    .font(.serif(.title2, weight: .bold))
                    .foregroundStyle(subject.color)
                if let native = subject.native {
                    Text(native).font(.subheadline).foregroundStyle(Palette.muted)
                }
                if let caption {
                    Text(caption.uppercased()).font(.caption2.weight(.semibold)).tracking(1.2).foregroundStyle(Palette.muted)
                }
            }
            Spacer(minLength: 0)
        }
        .padding(10)
        .background(subject.color.opacity(highlight ? 0.14 : 0.07), in: .rect(cornerRadius: 18))
        .overlay(RoundedRectangle(cornerRadius: 18).stroke(subject.color.opacity(highlight ? 0.6 : 0.25), lineWidth: highlight ? 2 : 1))
        .scaleEffect(highlight ? 1.02 : 1)
        .animation(.spring(duration: 0.4), value: highlight)
        .accessibilityElement(children: .combine)
        .accessibilityLabel("\(highlight ? "Now in " : "")\(subject.name)\(caption.map { ", \($0)" } ?? "")")
    }
}

struct WordSetTiles: View {
    let words: [LangWord]

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Eyebrow(text: "Across your set")
            LazyVGrid(columns: [GridItem(.adaptive(minimum: 104), spacing: 8)], spacing: 8) {
                ForEach(words, id: \.lang) { w in
                    let s = Subject.language(w.lang)
                    VStack(spacing: 4) {
                        Text(s.symbol).font(.title2)
                        Text(w.word).font(.serif(.headline, weight: .semibold)).foregroundStyle(Palette.ink).lineLimit(1).minimumScaleFactor(0.6)
                        Text(s.name).font(.caption2.weight(.semibold)).foregroundStyle(s.color)
                    }
                    .frame(maxWidth: .infinity, minHeight: 86)
                    .background(s.color.opacity(0.08), in: .rect(cornerRadius: 12))
                    .overlay(RoundedRectangle(cornerRadius: 12).stroke(s.color.opacity(0.3)))
                    .overlay(alignment: .topTrailing) { PlayButton(text: w.word, lang: w.lang).padding(4).font(.caption) }
                    .accessibilityElement(children: .combine)
                }
            }
        }
    }
}
