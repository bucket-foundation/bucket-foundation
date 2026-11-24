import Foundation

public struct DailyEntry: Sendable, Equatable {
    public let game: String
    public let day: String
    public let savedAt: Double
    public let pattern: String
    public let raw: JSValue

    public init?(_ raw: JSValue) {
        guard let game = raw["game"]?.string, let day = raw["day"]?.string else { return nil }
        self.game = game
        self.day = day
        savedAt = raw["savedAt"]?.number ?? .infinity
        pattern = raw["pattern"]?.string ?? ""
        self.raw = raw
    }

    public static func result(game: String, day: String, score: Int, total: Int, pattern: String, savedAt: Double) -> DailyEntry {
        DailyEntry(.object(JSObject([
            ("game", .string(game)), ("day", .string(day)), ("score", .number(Double(score))), ("total", .number(Double(total))),
            ("pattern", .string(pattern)), ("savedAt", .number(savedAt)), ("words", .array([])),
        ])))!
    }
}

public enum DailyBook {
    public static let branch = "polingual-daily"
    public static let localKey = "polingual/daily/v1"
    public static let keep = 120

    public static let wire: [String: String] = ["daily": "daily-set", "mini": "mini", "wordGroups": "word-groups", "match": "speed-match", "voice": "which-voice", "letters": "letter-sprint"]

    public typealias Book = [String: DailyEntry]

    public static func key(_ game: String, _ day: String) -> String { "\(game)|\(day)" }

    static func earlier(_ x: DailyEntry?, _ y: DailyEntry?) -> DailyEntry? {
        guard let x else { return y }
        guard let y else { return x }
        return y.savedAt < x.savedAt ? y : x
    }

    public static func merge(_ a: Book, _ b: Book) -> Book {
        var all: Book = [:]
        for k in Set(a.keys).union(b.keys) { all[k] = earlier(a[k], b[k]) }
        let kept = all.sorted { ($0.value.savedAt.isFinite ? $0.value.savedAt : 0) > ($1.value.savedAt.isFinite ? $1.value.savedAt : 0) }.prefix(keep)
        return Book(uniqueKeysWithValues: kept.map { ($0.key, $0.value) })
    }

    public static func same(_ a: Book, _ b: Book) -> Bool {
        a.count == b.count && a.allSatisfy { k, v in b[k].map { $0.savedAt == v.savedAt && $0.pattern == v.pattern } ?? false }
    }

    public static func played(_ book: Book, game: String, day: String) -> Bool { book[key(game, day)] != nil }

    public static func decode(_ value: JSValue?) -> Book {
        guard let o = value?.object else { return [:] }
        var out: Book = [:]
        for (k, v) in o.entries { if let e = DailyEntry(v) { out[k] = e } }
        return out
    }

    public static func encode(_ book: Book) -> JSValue {
        .object(JSObject(book.keys.sorted().map { ($0, book[$0]!.raw) }))
    }

    public static func fromBranches(_ branches: JSObject) -> Book { decode(branches[branch]?["data"]?["results"]) }

    public static func branchData(_ book: Book) -> JSValue { .object(JSObject([("results", encode(book))])) }

    public static func sync(_ local: Book, tries: Int = 3, pull: () async -> Book?, push: (Book) async -> Bool) async -> Book? {
        var book = local
        for _ in 0..<tries {
            guard let theirs = await pull() else { return nil }
            book = merge(book, theirs)
            if same(book, theirs) { return book }
            guard await push(book) else { continue }
            let check = await pull()
            if let check, same(merge(book, check), check) { return merge(book, check) }
            if let check { book = merge(book, check) }
        }
        return nil
    }

    public static func readLocal(_ defaults: UserDefaults = .standard) -> Book {
        guard let text = defaults.string(forKey: localKey), let v = try? JSON.parse(text) else { return [:] }
        return decode(v)
    }

    public static func writeLocal(_ book: Book, _ defaults: UserDefaults = .standard) {
        defaults.set(JSON.stringify(encode(book)), forKey: localKey)
    }
}

public extension LangStore {
    func loadDailyBook(defaults: UserDefaults = .standard) async -> DailyBook.Book {
        let local = DailyBook.readLocal(defaults)
        guard let t = await token() else { return local }
        let api = api
        let synced = await DailyBook.sync(local, pull: { await api.progressPull(token: t).map(DailyBook.fromBranches) }, push: { (await api.progressPush(token: t, branch: DailyBook.branch, data: DailyBook.branchData($0))) == 200 })
        let book = synced ?? local
        DailyBook.writeLocal(book, defaults)
        return book
    }

    @discardableResult
    func recordDaily(_ entry: DailyEntry, defaults: UserDefaults = .standard) async -> DailyBook.Book {
        DailyBook.writeLocal(DailyBook.merge(DailyBook.readLocal(defaults), [DailyBook.key(entry.game, entry.day): entry]), defaults)
        return await loadDailyBook(defaults: defaults)
    }
}
