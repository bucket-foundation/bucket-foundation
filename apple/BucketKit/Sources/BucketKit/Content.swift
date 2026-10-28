import Foundation

public enum ContentKind: String, Sendable, CaseIterable {
    case read, listen, watch
}

public struct ContentTopic: Sendable, Equatable, Identifiable {
    public let branch: String
    public let title: String
    public var id: String { title }
}

public enum ContentCatalog {
    public static let branches: [(id: String, title: String)] = [
        ("01", "Mathematics"), ("02", "Physics"), ("03", "Chemistry"), ("04", "Information"),
        ("05", "Biophysics"), ("06", "Cosmology"), ("07", "Mind"),
    ]

    public static let topics: [ContentTopic] = [
        ("01", ["Mathematics", "Prime number", "Pythagorean theorem", "Calculus"]),
        ("02", ["Physics", "Gravity", "Energy", "Light"]),
        ("03", ["Chemistry", "Atom", "Water", "Periodic table"]),
        ("04", ["Information theory", "Computer", "Algorithm", "Cryptography"]),
        ("05", ["Biophysics", "DNA", "Cell (biology)", "Photosynthesis"]),
        ("06", ["Physical cosmology", "Universe", "Big Bang", "Galaxy"]),
        ("07", ["Mind", "Brain", "Memory", "Consciousness"]),
    ].flatMap { b in b.1.map { ContentTopic(branch: b.0, title: $0) } }

    public static func topics(in branch: String?) -> [ContentTopic] {
        guard let branch else { return topics }
        return topics.filter { $0.branch == branch }
    }

    public static let radioLanguage: [String: String] = [
        "zh": "chinese", "grc": "", "ang": "", "sa": "sanskrit", "fa": "persian", "el": "greek",
    ]

    public static func radioName(_ lang: String) -> String? {
        if let n = radioLanguage[lang] { return n.isEmpty ? nil : n }
        return Lang.info[lang]?.name.lowercased()
    }

    public static func wikipediaCode(_ lang: String) -> String? {
        lang == "grc" ? nil : lang
    }

    static let branchWords: [(String, [String])] = [
        ("01", ["math"]), ("02", ["physics", "science"]), ("03", ["chemistry"]),
        ("04", ["technology", "tech", "computer"]), ("05", ["health", "medicine", "biology"]),
        ("06", ["space", "astronomy"]), ("07", ["philosophy", "psychology"]),
    ]

    public static func branch(forTags tags: String) -> String {
        let t = tags.lowercased()
        return branchWords.first { $0.1.contains { t.contains($0) } }?.0 ?? "00"
    }

    public static func youtube(_ query: String) -> URL {
        var c = URLComponents(string: "https://www.youtube.com/results")!
        c.queryItems = [URLQueryItem(name: "search_query", value: query)]
        return c.url!
    }
}

public struct RadioStation: Decodable, Sendable, Equatable, Identifiable {
    public let stationuuid: String
    public let name: String
    public let urlResolved: String
    public let country: String
    public let countrycode: String
    public let tags: String
    public let favicon: String
    public var id: String { stationuuid }

    enum CodingKeys: String, CodingKey {
        case stationuuid, name, country, countrycode, tags, favicon
        case urlResolved = "url_resolved"
    }

    public init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        stationuuid = try c.decode(String.self, forKey: .stationuuid)
        name = (try c.decode(String.self, forKey: .name)).trimmingCharacters(in: .whitespacesAndNewlines)
        urlResolved = c.value(.urlResolved, "")
        country = c.value(.country, "")
        countrycode = c.value(.countrycode, "")
        tags = c.value(.tags, "")
        favicon = c.value(.favicon, "")
    }

    public var stream: URL? {
        guard let u = URL(string: urlResolved), u.scheme == "https" || u.scheme == "http" else { return nil }
        return u
    }

    public var branch: String { ContentCatalog.branch(forTags: tags) }
}

public struct WikiSummary: Decodable, Sendable, Equatable {
    public let title: String
    public let extract: String
}

struct LangLinks: Decodable {
    struct Query: Decodable { let pages: [Page] }
    struct Page: Decodable {
        let title: String
        let langlinks: [Link]?
    }
    struct Link: Decodable {
        let lang: String
        let title: String
    }
    let query: Query
}

public struct ContentAPI: Sendable {
    let transport: Transport
    public static let radioBase = URL(string: "https://de1.api.radio-browser.info")!
    public static let agent = "Bucket/2.0 (https://www.bucket.foundation)"

    public init(transport: Transport = URLSessionTransport()) { self.transport = transport }

    func get<T: Decodable>(_ url: URL) async throws -> T {
        var r = URLRequest(url: url)
        r.setValue(Self.agent, forHTTPHeaderField: "user-agent")
        r.timeoutInterval = 15
        let (data, http) = try await transport.send(r)
        guard (200..<300).contains(http.statusCode) else { throw BucketError.server(http.statusCode, nil) }
        do { return try JSONDecoder().decode(T.self, from: data) } catch { throw BucketError.decoding }
    }

    public func stations(_ lang: String, limit: Int = 25) async throws -> [RadioStation] {
        guard let name = ContentCatalog.radioName(lang) else { return [] }
        var c = URLComponents(url: Self.radioBase.appending(path: "json/stations/search"), resolvingAgainstBaseURL: false)!
        c.queryItems = [
            URLQueryItem(name: "language", value: name), URLQueryItem(name: "hidebroken", value: "true"),
            URLQueryItem(name: "order", value: "clickcount"), URLQueryItem(name: "reverse", value: "true"),
            URLQueryItem(name: "limit", value: String(limit)),
        ]
        let all: [RadioStation] = try await get(c.url!)
        var seen = Set<String>()
        return all.filter { $0.stream != nil && !$0.name.isEmpty && seen.insert($0.name.lowercased()).inserted }
    }

    public func titles(_ english: String) async throws -> [String: String] {
        var c = URLComponents(string: "https://en.wikipedia.org/w/api.php")!
        c.queryItems = [
            URLQueryItem(name: "action", value: "query"), URLQueryItem(name: "prop", value: "langlinks"),
            URLQueryItem(name: "titles", value: english), URLQueryItem(name: "lllimit", value: "500"),
            URLQueryItem(name: "format", value: "json"), URLQueryItem(name: "formatversion", value: "2"),
        ]
        let r: LangLinks = try await get(c.url!)
        var out = ["en": english]
        for l in r.query.pages.first?.langlinks ?? [] { out[l.lang] = l.title }
        return out
    }

    public func summary(_ lang: String, title: String) async throws -> WikiSummary {
        guard let code = ContentCatalog.wikipediaCode(lang) else { throw BucketError.server(404, nil) }
        let path = title.replacingOccurrences(of: " ", with: "_")
        let encoded = path.addingPercentEncoding(withAllowedCharacters: .urlPathAllowed.subtracting(CharacterSet(charactersIn: "/?#"))) ?? path
        return try await get(URL(string: "https://\(code).wikipedia.org/api/rest_v1/page/summary/\(encoded)")!)
    }
}

public enum WordTaps {
    public static func words(_ text: String) -> [(word: String, range: Range<String.Index>)] {
        var out: [(String, Range<String.Index>)] = []
        text.enumerateSubstrings(in: text.startIndex..<text.endIndex, options: .byWords) { sub, range, _, _ in
            if let sub, sub.contains(where: \.isLetter) { out.append((sub, range)) }
        }
        return out
    }

    public static func link(lang: String, word: String) -> URL? {
        var c = URLComponents()
        c.scheme = "bucket-speak"
        c.host = lang
        c.queryItems = [URLQueryItem(name: "w", value: word)]
        return c.url
    }

    public static func parse(_ url: URL) -> (lang: String, word: String)? {
        guard url.scheme == "bucket-speak", let lang = url.host(), let c = URLComponents(url: url, resolvingAgainstBaseURL: false),
              let w = c.queryItems?.first(where: { $0.name == "w" })?.value, !w.isEmpty else { return nil }
        return (lang, w)
    }
}
