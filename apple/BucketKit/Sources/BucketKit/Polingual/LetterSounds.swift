import Foundation

public struct LetterSound: Sendable, Equatable {
    public let ipa: String
    public let hint: String
    public let example: String
    public let gloss: String
    public var flag: String? = nil
    public var reading: String? = nil
    public var say: String? = nil
}

public struct SoundCard: Sendable, Equatable {
    public let word: String
    public let phonetic: String?
    public let meaning: String
    public let phoneticHoldsLetter: Bool
}

public enum LetterSounds {
    public static func card(_ sound: LetterSound) -> SoundCard {
        let tokens = sound.gloss.split(separator: " ", maxSplits: 1).map(String.init)
        if tokens.count == 2, isHanOrKana(tokens[0]) {
            return SoundCard(word: tokens[0], phonetic: sound.example, meaning: tokens[1], phoneticHoldsLetter: true)
        }
        let reading = sound.reading.flatMap { $0.isEmpty || $0 == sound.example ? nil : $0 }
        return SoundCard(word: sound.example, phonetic: reading, meaning: sound.gloss, phoneticHoldsLetter: false)
    }

    static func isHanOrKana(_ s: String) -> Bool {
        !s.isEmpty && s.unicodeScalars.allSatisfy { $0.properties.isIdeographic || (0xAC00...0xD7A3).contains($0.value) || (0x3040...0x30FF).contains($0.value) }
    }

    static let tables: [String: [String: LetterSound]] = {
        var out: [String: [String: LetterSound]] = [:]
        for (lang, raw) in latin.merging(scripts) { a, _ in a }.merging(asia) { a, _ in a } {
            var table: [String: LetterSound] = [:]
            for line in (raw + "\n" + (course[lang] ?? "")).split(separator: "\n") {
                let f = line.split(separator: "|", omittingEmptySubsequences: false).map { $0.trimmingCharacters(in: .whitespaces) }
                guard f.count == 5 || f.count == 6 else { continue }
                table[f[0]] = LetterSound(ipa: f[1], hint: f[2], example: f[3], gloss: f[4], flag: f.count == 6 ? f[5] : nil)
            }
            for entry in CharacterTables.entries[lang] ?? [] { table[entry.ch] = CharacterTables.sound(entry, lang) }
            out[lang] = table
        }
        return out
    }()

    public static func lookup(_ lang: String, _ ch: String) -> LetterSound? { tables[lang]?[ch] }

    static let course: [String: String] = ["zh": toneSounds + "\n" + pinyinSounds, "ja": kanaMarkSounds]

    static let toneless: [Unicode.Scalar: Unicode.Scalar] = [
        "ā": "a", "á": "a", "ǎ": "a", "à": "a", "ē": "e", "é": "e", "ě": "e", "è": "e",
        "ī": "i", "í": "i", "ǐ": "i", "ì": "i", "ō": "o", "ó": "o", "ǒ": "o", "ò": "o",
        "ū": "u", "ú": "u", "ǔ": "u", "ù": "u", "ǖ": "ü", "ǘ": "ü", "ǚ": "ü", "ǜ": "ü",
    ]

    public static func spoken(_ lang: String, _ sound: LetterSound) -> String {
        if let say = sound.say { return say }
        guard lang == "zh" || lang == "ko", let first = sound.gloss.split(separator: " ").first else { return sound.example }
        return String(first)
    }

    public static func parts(_ sound: LetterSound, _ ch: String) -> (before: String, letter: String, after: String)? {
        located(sound, ch) { $0 } ?? located(sound, ch) { toneless[$0] ?? $0 }
    }

    static func located(_ sound: LetterSound, _ ch: String, fold: (Unicode.Scalar) -> Unicode.Scalar) -> (before: String, letter: String, after: String)? {
        let word = sound.example.unicodeScalars
        let mark = ch.unicodeScalars.filter { $0 != "◌" }.map(\.properties.lowercaseMapping)
        guard !mark.isEmpty else { return nil }
        var start = word.startIndex
        while start != word.endIndex {
            var end = start
            var matched = 0
            while matched < mark.count, end != word.endIndex, fold(word[end]).properties.lowercaseMapping == mark[matched] {
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
