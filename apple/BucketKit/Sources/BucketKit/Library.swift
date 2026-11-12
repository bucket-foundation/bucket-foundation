import Foundation

public struct LibraryEntry: Codable, Sendable, Equatable, Identifiable {
    public let id: String
    public let title: [String: String]
    public let author: String
    public let year: Int?
    public let kind: String
    public let license: String
    public let source: String
    public let translation: String
    public let sentences: Int
    public let langs: [String]

    public func title(in order: [String]) -> String {
        LibraryText.pick(title, order) ?? id
    }
}

public struct LibraryIndex: Codable, Sendable, Equatable {
    public let version: Int
    public let books: [LibraryEntry]
}

public struct LibraryBook: Codable, Sendable, Equatable, Identifiable {
    public let id: String
    public let title: [String: String]
    public let author: String
    public let license: String
    public let source: String
    public let translation: String
    public let sentences: [[String: String]]

    public func title(in order: [String]) -> String {
        LibraryText.pick(title, order) ?? id
    }

    public func lines(_ index: Int, langs: [String]) -> [(lang: String, text: String)] {
        guard sentences.indices.contains(index) else { return [] }
        let s = sentences[index]
        let shown = langs.compactMap { l in s[l].map { (lang: l, text: $0) } }
        if !shown.isEmpty { return shown }
        return s["en"].map { [(lang: "en", text: $0)] } ?? []
    }

    public var sourceURL: URL? {
        guard let u = URL(string: source), u.scheme == "https" || u.scheme == "http" else { return nil }
        return u
    }
}

enum LibraryText {
    static func pick(_ map: [String: String], _ order: [String]) -> String? {
        for l in order + ["en"] { if let t = map[l], !t.isEmpty { return t } }
        return map.values.sorted().first
    }
}

public struct LibraryAPI: Sendable {
    public static let production = URL(string: "https://www.polingual.com/library/")!
    public static let defaultCache = BucketAPI.offlineDirectory("library")

    public let base: URL
    let transport: Transport
    let cacheDir: URL?

    public init(base: URL = LibraryAPI.production, transport: Transport = URLSessionTransport(), cacheDir: URL? = LibraryAPI.defaultCache) {
        self.base = base
        self.transport = transport
        self.cacheDir = cacheDir
    }

    public static func validId(_ id: String) -> Bool {
        !id.isEmpty && id.count <= 80 && id.allSatisfy { $0.isASCII && ($0.isLetter || $0.isNumber || $0 == "-" || $0 == "_") }
    }

    public func index() async throws -> LibraryIndex {
        try await fetch("index.json", preferCache: false)
    }

    public func book(_ id: String) async throws -> LibraryBook {
        guard Self.validId(id) else { throw BucketError.server(404, nil) }
        return try await fetch("\(id).json", preferCache: true)
    }

    public func cachedIndex() -> LibraryIndex? { cached("index.json") }

    public func cachedBook(_ id: String) -> LibraryBook? {
        Self.validId(id) ? cached("\(id).json") : nil
    }

    func cacheURL(_ file: String) -> URL? { cacheDir?.appending(path: file) }

    func cached<T: Decodable>(_ file: String) -> T? {
        guard let url = cacheURL(file), let data = try? Data(contentsOf: url) else { return nil }
        return try? JSONDecoder().decode(T.self, from: data)
    }

    func fetch<T: Decodable>(_ file: String, preferCache: Bool) async throws -> T {
        if preferCache, let hit: T = cached(file) { return hit }
        do {
            var r = URLRequest(url: base.appending(path: file))
            r.timeoutInterval = 15
            let (data, http) = try await transport.send(r)
            guard (200..<300).contains(http.statusCode) else { throw BucketError.server(http.statusCode, nil) }
            let value: T
            do { value = try JSONDecoder().decode(T.self, from: data) } catch { throw BucketError.decoding }
            if let url = cacheURL(file) {
                try? FileManager.default.createDirectory(at: url.deletingLastPathComponent(), withIntermediateDirectories: true)
                try? data.write(to: url, options: .atomic)
            }
            return value
        } catch {
            if let hit: T = cached(file) { return hit }
            throw error
        }
    }
}

public struct LibraryProgress: Sendable {
    public static let key = "library.progress"
    nonisolated(unsafe) let defaults: UserDefaults

    public init(defaults: UserDefaults = .standard) { self.defaults = defaults }

    var all: [String: Int] { defaults.dictionary(forKey: Self.key) as? [String: Int] ?? [:] }

    public func sentence(_ book: String) -> Int { max(0, all[book] ?? 0) }

    public func save(_ book: String, sentence: Int) {
        var map = all
        map[book] = max(0, sentence)
        defaults.set(map, forKey: Self.key)
    }

    public func clear(_ book: String) {
        var map = all
        map[book] = nil
        defaults.set(map, forKey: Self.key)
    }
}
