import Foundation

public struct LetterPrompt: Sendable, Equatable {
    public let lang: String
    public let ch: String
    public let sound: String
    public let choices: [String]
}

public enum DailySeed {
    public static let speedPairs = 15
    public static let firstWords = 200
    public static let speedPerLang = 12
    public static let voicePerLang = 6
    public static let letterRound = 8

    static func targetsKey(_ targets: [String]) -> String { targets.sorted { Array($0.utf16).lexicographicallyPrecedes(Array($1.utf16)) }.joined(separator: ",") }

    static func picks(_ deck: GameDeck, perLang: Int, using rng: inout SeededRandom) -> [GameWord] {
        var out: [GameWord] = []
        for l in deck.targets {
            let common = mixed(Array((deck.pools[l] ?? []).prefix(firstWords)), using: &rng)
            out += common.prefix(perLang).compactMap { deck.word($0.itemId, l) }
        }
        return out
    }

    public static func speedDeck(_ deck: GameDeck, day: String) -> [GameWord] {
        var rng = SeededRandom(seed: GameSeed.hash("speed|\(day)|\(deck.root)|\(targetsKey(deck.targets))"))
        return GameWords.balanced(picks(deck, perLang: speedPerLang, using: &rng))
    }

    public static func speedBoard(_ deck: GameDeck, day: String, slots: Int = 5) -> SpeedBoard {
        SpeedBoard(deck: speedDeck(deck, day: day), slots: slots, seed: GameSeed.hash("speed-board|\(day)"))
    }

    public static func voice(_ deck: GameDeck, corpus: LangCorpus, day: String) -> [GamePrompt] {
        var rng = SeededRandom(seed: GameSeed.hash("voice|\(day)|\(deck.root)|\(targetsKey(deck.targets))"))
        let words = picks(deck, perLang: voicePerLang, using: &rng)
        let clash: (GameWord, String) -> Bool = { w, l in l != w.lang && corpus.byId[w.itemId]?.form(l)?.lowercased() == w.form.lowercased() }
        return GameRounds.flags(words, own: deck.targets, mode: .voice, sameForm: clash, using: &rng)
    }

    public static func letterLang(day: String, targets: [String]) -> String {
        let own = targets.sorted().filter { LangScript.alphabetUnit($0) != nil }
        let pool = own.isEmpty ? LangScript.heritageLangs.filter { LangScript.alphabetUnit($0) != nil }.sorted() : own
        return pool[Int(GameSeed.hash("letters-lang|\(day)") % UInt64(pool.count))]
    }

    public static func letters(day: String, targets: [String]) -> [LetterPrompt] {
        let lang = letterLang(day: day, targets: targets)
        let letters = (LangScript.alphabetUnit(lang)?.letters ?? []).filter { !$0.ch.unicodeScalars.contains("\u{25CC}") }
        var rng = SeededRandom(seed: GameSeed.hash("letters|\(day)|\(lang)"))
        return mixed(letters, using: &rng).prefix(letterRound).map { l in
            let foils = mixed(letters.filter { $0.ch != l.ch && $0.sound != l.sound }, using: &rng).prefix(3).map(\.ch)
            return LetterPrompt(lang: lang, ch: l.ch, sound: l.sound, choices: mixed([l.ch] + foils, using: &rng))
        }
    }
}
