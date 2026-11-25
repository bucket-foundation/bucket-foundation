import BucketKit
import Foundation

@MainActor
enum WordWebLoader {
    nonisolated static let shelf = LexiconShelf(capacity: 2)
    nonisolated static let batchSize = LexiconShelf.ceiling - 1
    private static var holders = 0
    private static let lookups = WordLookups(capacity: 24, hold: hold, release: letGo)

    static func load(_ detail: WordDetail, mine: [String], corpus: LangCorpus?, all: Bool, update: (WordWeb) -> Void) async {
        let word = detail.word, lang = detail.lang
        let known = detail.itemId == nil ? lookups.entry(word: word, lang: lang) : LookupMemo.Entry()
        update(LangReference.web(detail, corpus: corpus, mine: mine, found: known.found))
        guard detail.itemId == nil else { return }
        await lookups.load(word: word, lang: lang, batches: { skip in
            LangReference.lookupBatches(lang: lang, mine: mine, all: all, size: batchSize, asked: skip)
        }, ask: { batch in
            TranslateEngine.answer(word, from: [lang], to: batch, corpus: corpus, shelf: shelf)?.rows
        }, found: { found in
            update(LangReference.web(detail, corpus: corpus, mine: mine, found: found))
        })
    }

    private static func hold() {
        holders += 1
        shelf.reserve(LexiconShelf.ceiling)
    }

    private static func letGo() {
        holders -= 1
        if holders == 0 { shelf.release() }
    }
}
