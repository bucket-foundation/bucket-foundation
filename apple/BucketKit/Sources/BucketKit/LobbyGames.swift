import Foundation

public enum LobbyGame: String, Codable, Sendable, CaseIterable {
    case daily
    case sameWord = "same-word"
    case flags
    case live
}

extension GameRounds {
    public static func lobby(_ game: LobbyGame, corpus: LangCorpus, root: String, targets: [String], seed: UInt64, count: Int) -> [GamePrompt] {
        let deck = GameDeck(corpus, root: root, targets: targets)
        switch game {
        case .sameWord:
            var rng = SeededRandom(seed: seed)
            return Array(sameWord(deck, words: [], using: &rng).prefix(count))
        case .flags:
            var rng = SeededRandom(seed: seed)
            let words = deck.daily(count: count, using: &rng)
            return flags(words, own: targets, mode: .flag, count: count, sameForm: { w, l in
                guard l != w.lang, let f = corpus.byId[w.itemId]?.form(l) else { return false }
                return f.lowercased() == w.form.lowercased()
            }, using: &rng)
        case .daily, .live:
            return lobby(deck, seed: seed, count: count)
        }
    }
}
