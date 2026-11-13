import Foundation

public enum LangAudio {
    public static let base = "academy-app/audio"

    public static func key(_ lang: String, _ text: String) -> String {
        let s = "\(lang)\u{0}\(jsTrim(text.precomposedStringWithCanonicalMapping))"
        var h1: UInt32 = 0xdeadbeef
        var h2: UInt32 = 0x41c6ce57
        for c in s.utf16 {
            h1 = (h1 ^ UInt32(c)) &* 2654435761
            h2 = (h2 ^ UInt32(c)) &* 1597334677
        }
        h1 = ((h1 ^ (h1 >> 16)) &* 2246822507) ^ ((h2 ^ (h2 >> 13)) &* 3266489909)
        h2 = ((h2 ^ (h2 >> 16)) &* 2246822507) ^ ((h1 ^ (h1 >> 13)) &* 3266489909)
        return hex8(h2) + hex8(h1)
    }

    static func hex8(_ x: UInt32) -> String {
        let s = String(x, radix: 16)
        return String(repeating: "0", count: 8 - s.count) + s
    }

    public static func path(_ lang: String, _ text: String) -> String { "\(base)/\(lang)/\(key(lang, text)).mp3" }

    static let extraTags: [String: [String]] = ["zh": ["zh", "cmn"], "he": ["he", "iw"], "id": ["id", "in"], "fa": ["fa", "pes"]]

    static func norm(_ tag: String) -> String { tag.lowercased().replacingOccurrences(of: "_", with: "-") }

    public static func voiceTags(_ lang: String, _ bcp47: String) -> [String] {
        let base = String(norm(bcp47).split(separator: "-").first ?? "")
        return unique([base] + (extraTags[lang] ?? []))
    }

    public static func pickVoice(_ voiceLangs: [String], _ lang: String) -> String? {
        let bcp47 = Lang.info[lang]?.bcp47 ?? lang
        let full = norm(bcp47)
        if let exact = voiceLangs.first(where: { norm($0) == full }) { return exact }
        let tags = voiceTags(lang, bcp47)
        return voiceLangs.first { tags.contains(String(norm($0).split(separator: "-").first ?? "")) }
    }

    public struct Voice: Equatable, Sendable {
        public let id: String
        public let language: String
        public let quality: Int
        public let novelty: Bool

        public init(id: String, language: String, quality: Int, novelty: Bool = false) {
            self.id = id
            self.language = language
            self.quality = quality
            self.novelty = novelty
        }

        var odd: Bool { novelty || id.lowercased().contains("eloquence") }
    }

    public static func pickVoice(_ voices: [Voice], _ lang: String) -> Voice? {
        let full = norm(Lang.info[lang]?.bcp47 ?? lang)
        let tags = voiceTags(lang, Lang.info[lang]?.bcp47 ?? lang)
        let fits = voices.enumerated().compactMap { i, v -> (Int, Int, Int, Int, Voice)? in
            let tag = norm(v.language)
            let exact = tag == full
            guard exact || tags.contains(String(tag.split(separator: "-").first ?? "")) else { return nil }
            return (v.odd ? 1 : 0, exact ? 0 : 1, -v.quality, i, v)
        }
        return fits.min { ($0.0, $0.1, $0.2, $0.3) < ($1.0, $1.1, $1.2, $1.3) }?.4
    }
}
