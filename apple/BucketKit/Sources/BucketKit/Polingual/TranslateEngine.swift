import Foundation
import NaturalLanguage

public enum TranslateLayer: String, Sendable, Equatable {
    case deck, word, form, roman, phrase, gloss
}

public struct TranslateAnswer: Sendable, Equatable {
    public let layer: TranslateLayer
    public let source: String
    public let headword: String
    public let rows: [String: String]
    public var itemId: String? = nil
}

public enum TranslateEngine {
    public static func answer(_ query: String, from sources: [String], to targets: [String], corpus: LangCorpus?, shelf: LexiconShelf) -> TranslateAnswer? {
        let q = query.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !q.isEmpty else { return nil }
        if let corpus, let hit = translateSearch(corpus, q, langs: Set(sources), limit: 1).first, hit.exact, let item = corpus.byId[hit.itemId] {
            var rows: [String: String] = [:]
            for t in targets where t != hit.matchedLang { if let f = item.form(t) { rows[t] = f } }
            if !targets.filter({ $0 != hit.matchedLang }).allSatisfy({ rows[$0] != nil }) {
                let fill = lexical(q, sources: [hit.matchedLang], targets: targets, shelf: shelf)
                for (t, f) in fill?.rows ?? [:] where rows[t] == nil { rows[t] = f }
            }
            if !rows.isEmpty { return TranslateAnswer(layer: .deck, source: hit.matchedLang, headword: item.form(hit.matchedLang) ?? q, rows: rows, itemId: item.id) }
        }
        if let lex = lexical(q, sources: sources, targets: targets, shelf: shelf) { return lex }
        if let corpus, let pooled = poolSentence(q, sources: sources, targets: targets, corpus: corpus) { return pooled }
        return gloss(q, sources: sources, targets: targets, shelf: shelf)
    }

    static func lexical(_ q: String, sources: [String], targets: [String], shelf: LexiconShelf) -> TranslateAnswer? {
        var best: (rank: Int, answer: TranslateAnswer)?
        for source in sources {
            guard let (match, entries, head) = lookup(q, source, shelf), let first = entries.first else { continue }
            let rows = render(source: source, head: head, entries: entries, targets: targets, shelf: shelf)
            guard !rows.isEmpty else { continue }
            let multi = q.split(whereSeparator: \.isWhitespace).count > 1
            let layer: TranslateLayer = match == .roman ? .roman : multi ? .phrase : match == .word ? .word : .form
            let rank = match == .word ? 0 : match == .form ? 1 : 2
            if rank < (best?.rank ?? 9) { best = (rank, TranslateAnswer(layer: layer, source: source, headword: first.word, rows: rows)) }
            if rank == 0 { break }
        }
        return best?.answer
    }

    static func lookup(_ q: String, _ source: String, _ shelf: LexiconShelf) -> (Lexicon.Match, [LexEntry], String)? {
        if source == "en" {
            let en = shelf.lexicon("en")
            if let hit = en?.lookup(q) { return (hit.match, hit.entries, hit.entries.first?.word ?? q) }
            return (.word, [LexEntry(word: q, english: [Lexicon.key(q)], gloss: nil, lemma: nil, roman: nil)], q)
        }
        guard let hit = shelf.lexicon(source)?.lookup(q) else { return nil }
        return (hit.match, hit.entries, hit.entries.first?.word ?? q)
    }

    static func render(source: String, head: String, entries: [LexEntry], targets: [String], shelf: LexiconShelf) -> [String: String] {
        var rows: [String: String] = [:]
        let english = entries.flatMap(\.english)
        for t in targets where t != source {
            if t == "en" {
                if source == "en" { continue }
                if let m = entries.lazy.compactMap(\.meaning).first { rows[t] = m }
                continue
            }
            guard let lex = shelf.lexicon(t) else { continue }
            let pivots = source == "en" ? [head] + english : english
            if let w = pivots.lazy.map({ lex.words(forEnglish: $0) }).first(where: { !$0.isEmpty }) {
                rows[t] = w.prefix(2).joined(separator: ", ")
            }
        }
        return rows
    }

    static func poolSentence(_ q: String, sources: [String], targets: [String], corpus: LangCorpus) -> TranslateAnswer? {
        let k = foldForSearch(q)
        guard k.contains(" ") || k.count > 4 else { return nil }
        for key in corpus.poolKeys {
            guard let s = corpus.pool[key] else { continue }
            for source in sources {
                guard let t = s.text(source), foldForSearch(t) == k else { continue }
                var rows: [String: String] = [:]
                for target in targets where target != source { if let x = s.text(target) { rows[target] = x } }
                if !rows.isEmpty { return TranslateAnswer(layer: .phrase, source: source, headword: t, rows: rows) }
            }
        }
        return nil
    }

    public static func tokens(_ text: String, lang: String) -> [String] {
        let tokenizer = NLTokenizer(unit: .word)
        tokenizer.string = text
        tokenizer.setLanguage(NLLanguage(rawValue: SentenceLanguage.appleCode(lang)))
        return tokenizer.tokens(for: text.startIndex..<text.endIndex).map { String(text[$0]) }
    }

    public static func gloss(_ q: String, sources: [String], targets: [String], shelf: LexiconShelf) -> TranslateAnswer? {
        var best: (score: Int, answer: TranslateAnswer)?
        for source in sources {
            let toks = tokens(q, lang: source)
            guard toks.count > 1 else { continue }
            var pieces: [String: [String]] = [:]
            var known = 0
            var i = 0
            while i < toks.count {
                var step = 1
                var rows: [String: String] = [:]
                for n in stride(from: min(4, toks.count - i), through: 1, by: -1) {
                    let joiner = ["ja", "zh", "th"].contains(source) ? "" : " "
                    let chunk = toks[i..<(i + n)].joined(separator: joiner)
                    guard let (_, entries, head) = lookup(chunk, source, shelf) else { continue }
                    let r = render(source: source, head: head, entries: entries, targets: targets, shelf: shelf)
                    if !r.isEmpty { rows = r; step = n; break }
                }
                if !rows.isEmpty { known += step }
                for t in targets where t != source {
                    let piece = rows[t].map { firstSense($0) } ?? toks[i..<(i + step)].joined(separator: " ")
                    pieces[t, default: []].append(piece)
                }
                i += step
            }
            guard known > 0 else { continue }
            let joined = pieces.mapValues { $0.joined(separator: " ") }
            if known > (best?.score ?? 0) { best = (known, TranslateAnswer(layer: .gloss, source: source, headword: q, rows: joined)) }
        }
        return best?.answer
    }

    static func firstSense(_ s: String) -> String {
        let cut = s.split(whereSeparator: { $0 == ";" || $0 == "," }).first.map(String.init) ?? s
        return cut.trimmingCharacters(in: .whitespaces)
    }
}
