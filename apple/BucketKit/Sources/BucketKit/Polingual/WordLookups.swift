import Foundation

@MainActor
public final class WordLookups {
    public typealias Ask = @Sendable (_ targets: [String]) async -> [String: String]?

    private var memo: LookupMemo
    private var runs = LookupRuns<Task<[String: String]?, Never>>()
    private let hold: @MainActor () -> Void
    private let release: @MainActor () -> Void

    public init(capacity: Int, hold: @escaping @MainActor () -> Void = {}, release: @escaping @MainActor () -> Void = {}) {
        memo = LookupMemo(capacity: capacity)
        self.hold = hold
        self.release = release
    }

    public func entry(word: String, lang: String) -> LookupMemo.Entry {
        memo.entry(word: word, lang: lang)
    }

    public func load(word: String, lang: String, batches: (Set<String>) -> [[String]], ask: @escaping Ask, found: ([String: String]) -> Void) async {
        var tried: Set<String> = []
        var joined: Set<Task<[String: String]?, Never>> = []
        var held = false
        defer { if held { release() } }
        while true {
            if Task.isCancelled { return }
            let open = runs.running(word: word, lang: lang)
            joined.formUnion(open.values)
            let skip = memo.entry(word: word, lang: lang).asked.union(open.keys).union(tried)
            guard let batch = batches(skip).first, !batch.isEmpty else { break }
            if !held { hold(); held = true }
            tried.formUnion(batch)
            let lookup = Task.detached(priority: .userInitiated) { await ask(batch) }
            runs.start(lookup, word: word, lang: lang, targets: batch)
            let rows = await lookup.value
            runs.finish(lookup, word: word, lang: lang)
            guard take(rows, word: word, lang: lang) else { return }
            found(memo.entry(word: word, lang: lang).found)
        }
        for lookup in joined {
            let rows = await lookup.value
            guard take(rows, word: word, lang: lang) else { return }
            found(memo.entry(word: word, lang: lang).found)
        }
    }

    private func take(_ rows: [String: String]?, word: String, lang: String) -> Bool {
        if let rows, !rows.isEmpty { memo.record(word: word, lang: lang, asked: Array(rows.keys), rows: rows) }
        return !Task.isCancelled
    }
}
