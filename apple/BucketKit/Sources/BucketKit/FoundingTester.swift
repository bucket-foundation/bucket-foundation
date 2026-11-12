import Foundation

public enum FoundingTester {
    public static let cacheKey = "polingual.founding"

    public static func parse(_ data: Data) -> Bool? {
        struct Reply: Decodable { let founding: Bool }
        return (try? JSONDecoder().decode(Reply.self, from: data))?.founding
    }

    public static func cached(user: String, defaults: UserDefaults = .standard) -> Bool {
        (defaults.dictionary(forKey: cacheKey) as? [String: Bool])?[user] ?? false
    }

    public static func fetch(user: String?, token: String?, base: URL = BucketAPI.production, transport: any Transport = URLSessionTransport(), defaults: UserDefaults = .standard) async -> Bool {
        guard let user, let token else { return false }
        var r = URLRequest(url: base.appending(path: "api/polingual/entitlement"), timeoutInterval: 6)
        r.setValue("Bearer \(token)", forHTTPHeaderField: "authorization")
        guard let (data, http) = try? await transport.send(r), http.statusCode == 200, let founding = parse(data) else {
            return cached(user: user, defaults: defaults)
        }
        var all = defaults.dictionary(forKey: cacheKey) as? [String: Bool] ?? [:]
        all[user] = founding
        defaults.set(all, forKey: cacheKey)
        return founding
    }
}
