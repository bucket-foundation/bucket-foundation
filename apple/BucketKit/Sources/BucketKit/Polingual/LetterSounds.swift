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

    public static func spoken(_ lang: String, _ sound: LetterSound) -> String {
        guard lang == "zh" || lang == "ko", let first = sound.gloss.split(separator: " ").first else { return sound.example }
        return String(first)
    }

    public static func parts(_ sound: LetterSound, _ ch: String) -> (before: String, letter: String, after: String)? {
        let mark = String(String.UnicodeScalarView(ch.unicodeScalars.filter { $0 != "◌" }))
        guard let r = sound.example.range(of: mark, options: [.caseInsensitive, .literal]) else { return nil }
        return (String(sound.example[..<r.lowerBound]), String(sound.example[r]), String(sound.example[r.upperBound...]))
    }

    public static func blanked(_ sound: LetterSound, _ ch: String) -> String? {
        parts(sound, ch).map { $0.before + "＿" + $0.after }
    }

    public static func heard(_ alts: [String], say: String) -> Bool {
        let target = foldForSearch(say)
        guard !target.isEmpty else { return false }
        return alts.contains { alt in
            let a = foldForSearch(alt)
            return a == target || a.split(whereSeparator: { !$0.isLetter && !$0.isNumber }).contains { $0 == target }
        }
    }
}
