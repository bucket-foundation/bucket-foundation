import Foundation

public struct LetterSound: Sendable, Equatable {
    public let ipa: String
    public let hint: String
    public let example: String
    public let gloss: String
}

public enum LetterSounds {
    static let tables: [String: [String: LetterSound]] = {
        var out: [String: [String: LetterSound]] = [:]
        for (lang, raw) in latin.merging(scripts) { a, _ in a }.merging(asia) { a, _ in a } {
            var table: [String: LetterSound] = [:]
            for line in raw.split(separator: "\n") {
                let f = line.split(separator: "|", omittingEmptySubsequences: false).map { $0.trimmingCharacters(in: .whitespaces) }
                guard f.count == 5 else { continue }
                table[f[0]] = LetterSound(ipa: f[1], hint: f[2], example: f[3], gloss: f[4])
            }
            out[lang] = table
        }
        return out
    }()

    public static func lookup(_ lang: String, _ ch: String) -> LetterSound? { tables[lang]?[ch] }

    public static func blanked(_ sound: LetterSound, _ ch: String) -> String? {
        let mark = ch.replacingOccurrences(of: "◌", with: "")
        guard let r = sound.example.range(of: mark, options: [.caseInsensitive]) else { return nil }
        return sound.example.replacingCharacters(in: r, with: "＿")
    }
}
