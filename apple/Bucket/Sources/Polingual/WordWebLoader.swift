import BucketKit
import Foundation

@MainActor
enum WordWebLoader {
    nonisolated static let shelf = LexiconShelf(capacity: 2)
    nonisolated static let batchSize = LexiconShelf.ceiling - 1
    private static var holders = 0
    private static var memo = LookupMemo(capacity: 24)

    static func load(_ detail: WordDetail, mine: [String], corpus: LangCorpus?, all: Bool, update: (WordWeb) -> Void) async {
        let word = detail.word, lang = detail.lang
        let known = detail.itemId == nil ? memo.entry(word: word, lang: lang) : LookupMemo.Entry()
        update(LangReference.web(detail, corpus: corpus, mine: mine, found: known.found))
        guard detail.itemId == nil else { return }
        let batches = LangReference.lookupBatches(lang: lang, mine: mine, all: all, size: batchSize, asked: known.asked)
        guard !batches.isEmpty else { return }
        hold()
        defer { letGo() }
        for batch in batches {
            if Task.isCancelled { return }
            let lookup = Task.detached(priority: .userInitiated) {
                TranslateEngine.answer(word, from: [lang], to: batch, corpus: corpus, shelf: shelf)?.rows
            }
            let rows = await lookup.value
            if let rows { memo.record(word: word, lang: lang, asked: batch, rows: rows) }
            if Task.isCancelled { return }
            update(LangReference.web(detail, corpus: corpus, mine: mine, found: memo.entry(word: word, lang: lang).found))
        }
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
