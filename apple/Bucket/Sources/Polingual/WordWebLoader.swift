import BucketKit
import Foundation

@MainActor
enum WordWebLoader {
    nonisolated static let shelf = LexiconShelf(capacity: 2)
    nonisolated static let batchSize = LexiconShelf.ceiling - 1
    private static var holders = 0

    static func load(_ detail: WordDetail, mine: [String], corpus: LangCorpus?, all: Bool, update: (WordWeb) -> Void) async {
        update(LangReference.web(detail, corpus: corpus, mine: mine))
        guard detail.itemId == nil else { return }
        let batches = LangReference.lookupBatches(lang: detail.lang, mine: mine, all: all, size: batchSize)
        guard !batches.isEmpty else { return }
        hold()
        defer { letGo() }
        let word = detail.word, lang = detail.lang
        var found: [String: String] = [:]
        for batch in batches {
            if Task.isCancelled { return }
            let rows = await Task.detached(priority: .userInitiated) {
                TranslateEngine.answer(word, from: [lang], to: batch, corpus: corpus, shelf: shelf)?.rows ?? [:]
            }.value
            if Task.isCancelled { return }
            found.merge(rows) { kept, _ in kept }
            update(LangReference.web(detail, corpus: corpus, mine: mine, found: found))
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
