import Foundation

public struct BetaFlags: Sendable, Equatable {
    public static let fallback: [String: String] = ["option_language": "same", "new_words": "4", "practice_order": "blocked", "cognate_hints": "off"]
    public static let cacheKey = "beta.flags"

    public let values: [String: String]

    public init(values: [String: String] = [:]) { self.values = values }

    public func value(_ experiment: String) -> String { values[experiment] ?? Self.fallback[experiment] ?? "" }

    public var crossLanguageOptions: Bool { value("option_language") == "cross" }
    public var newWords: Int { Int(value("new_words")) ?? 4 }
    public var mixedPractice: Bool { value("practice_order") == "mixed" }
    public var cognateHints: Bool { value("cognate_hints") == "on" }

    public static func parse(_ data: Data) -> BetaFlags? {
        struct Flag: Decodable { let value: String? }
        struct Reply: Decodable { let flags: [String: Flag] }
        guard let r = try? JSONDecoder().decode(Reply.self, from: data) else { return nil }
        return BetaFlags(values: r.flags.compactMapValues(\.value))
    }

    public static func cached(_ defaults: UserDefaults = .standard) -> BetaFlags {
        BetaFlags(values: defaults.dictionary(forKey: cacheKey) as? [String: String] ?? [:])
    }

    public static func fetch(app: String, token: String?, base: URL = BucketAPI.production, transport: any Transport = URLSessionTransport(), defaults: UserDefaults = .standard) async -> BetaFlags {
        guard let token else { return cached(defaults) }
        var c = URLComponents(url: base.appending(path: "api/beta/flags"), resolvingAgainstBaseURL: false)!
        c.queryItems = [URLQueryItem(name: "app", value: app)]
        var r = URLRequest(url: c.url!)
        r.setValue("Bearer \(token)", forHTTPHeaderField: "authorization")
        guard let (data, http) = try? await transport.send(r), http.statusCode == 200, let flags = parse(data) else { return cached(defaults) }
        defaults.set(flags.values, forKey: cacheKey)
        return flags
    }
}
