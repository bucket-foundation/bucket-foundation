import Foundation

public struct TranslateHit: Sendable, Equatable {
    public let itemId: String
    public let matchedLang: String
    public let exact: Bool
}

public func foldForSearch(_ s: String) -> String {
    s.folding(options: [.caseInsensitive, .diacriticInsensitive, .widthInsensitive], locale: nil)
        .trimmingCharacters(in: .whitespacesAndNewlines.union(.punctuationCharacters))
}

public func translateSearch(_ corpus: LangCorpus, _ query: String, langs: Set<String>? = nil, limit: Int = 8) -> [TranslateHit] {
    let q = foldForSearch(query)
    guard q.count >= 1 else { return [] }
    var exact: [TranslateHit] = []
    var prefix: [TranslateHit] = []
    var contains: [TranslateHit] = []
    for item in corpus.items {
        var best: (rank: Int, lang: String)?
        for (lang, form) in item.forms.sorted(by: { $0.key < $1.key }) where langs?.contains(lang) ?? true {
            let f = foldForSearch(form)
            let article = f.split(separator: " ", maxSplits: 1).count == 2 && Lang.articles[lang]?.contains { foldForSearch($0.1) == String(f.split(separator: " ")[0]) } == true
            let bare = article ? String(f.split(separator: " ", maxSplits: 1)[1]) : f
            let rank = f == q || bare == q ? 0 : f.hasPrefix(q) || bare.hasPrefix(q) ? 1 : q.count >= 3 && f.contains(q) ? 2 : 3
            if rank < (best?.rank ?? 3) { best = (rank, lang) }
        }
        guard let best else { continue }
        let hit = TranslateHit(itemId: item.id, matchedLang: best.lang, exact: best.rank == 0)
        switch best.rank {
        case 0: exact.append(hit)
        case 1: prefix.append(hit)
        default: contains.append(hit)
        }
    }
    let tier: (TranslateHit) -> Double = { corpus.byId[$0.itemId]?.tier ?? 99 }
    let sortHits: ([TranslateHit]) -> [TranslateHit] = { hits in hits.sorted { (tier($0), corpus.byId[$0.itemId]?.form($0.matchedLang)?.count ?? 0) < (tier($1), corpus.byId[$1.itemId]?.form($1.matchedLang)?.count ?? 0) } }
    return Array((sortHits(exact) + sortHits(prefix) + sortHits(contains)).prefix(limit))
}
