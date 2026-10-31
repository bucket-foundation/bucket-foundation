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
        let word = sound.example.unicodeScalars
        let mark = ch.unicodeScalars.filter { $0 != "◌" }.map(\.properties.lowercaseMapping)
        guard !mark.isEmpty else { return nil }
        var start = word.startIndex
        while start != word.endIndex {
            var end = start
            var matched = 0
            while matched < mark.count, end != word.endIndex, word[end].properties.lowercaseMapping == mark[matched] {
                end = word.index(after: end)
                matched += 1
            }
            if matched == mark.count {
                return (String(sound.example[..<start]), String(sound.example[start..<end]), String(sound.example[end...]))
            }
            start = word.index(after: start)
        }
        return nil
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
