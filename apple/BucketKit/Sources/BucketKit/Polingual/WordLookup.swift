import Foundation

public struct WordDetail: Sendable, Equatable, Identifiable {
    public let word: String
    public let lang: String
    public let gloss: String?
    public let reading: Reading?

    public var id: String { "\(lang):\(word)" }
}

public enum WordLookup {
    public static func detail(_ word: String, lang: String, corpus: LangCorpus?, top: [TopWord]) -> WordDetail {
        let keys = candidates(word, lang)
        let item = corpus?.items.first { i in i.form(lang).map { keys.contains(fold($0, lang)) } ?? false }
        let ranked = top.first { keys.contains(fold($0.word, lang)) }
        let gloss = (item?.gloss ?? ranked?.meaning).flatMap { fold($0, lang) == fold(word, lang) ? nil : $0 }
        let reading = item?.readings[lang] ?? ranked?.ipa.map { Reading(ipa: $0.trimmingCharacters(in: CharacterSet(charactersIn: "/"))) }
        return WordDetail(word: word, lang: lang, gloss: gloss, reading: reading)
    }

    static func fold(_ s: String, _ lang: String) -> String {
        s.trimmingCharacters(in: .whitespacesAndNewlines).lowercased(with: Locale(identifier: lang))
    }

    static func candidates(_ word: String, _ lang: String) -> Set<String> {
        let whole = fold(word, lang)
        guard let mark = whole.lastIndex(where: { $0 == "'" || $0 == "’" }) else { return [whole] }
        let tail = String(whole[whole.index(after: mark)...])
        return tail.isEmpty ? [whole] : [whole, tail]
    }
}
