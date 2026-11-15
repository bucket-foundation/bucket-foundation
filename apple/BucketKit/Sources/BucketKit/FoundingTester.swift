import Foundation

public enum FoundingTester {
    public static let cacheKey = "polingual.founding"
    public static let lastUserKey = "polingual.founding.lastUser"

    public static func parse(_ data: Data) -> Bool? {
        struct Reply: Decodable { let founding: Bool }
        return (try? JSONDecoder().decode(Reply.self, from: data))?.founding
    }

    public static func remember(user: String?, defaults: UserDefaults = .standard) {
        guard let user else { return }
        defaults.set(user, forKey: lastUserKey)
    }

    public static func forget(defaults: UserDefaults = .standard) {
        defaults.removeObject(forKey: lastUserKey)
    }

    public static func cached(user: String?, defaults: UserDefaults = .standard) -> Bool {
        guard let user = user ?? defaults.string(forKey: lastUserKey) else { return false }
        return (defaults.dictionary(forKey: cacheKey) as? [String: Bool])?[user] ?? false
    }

    public static func fetch(user: String?, token: String?, base: URL = BucketAPI.production, transport: any Transport = URLSessionTransport(), defaults: UserDefaults = .standard) async -> Bool {
        remember(user: user, defaults: defaults)
        let known = cached(user: user, defaults: defaults)
        guard let id = user ?? defaults.string(forKey: lastUserKey), let token else { return known }
        var r = URLRequest(url: base.appending(path: "api/polingual/entitlement"), timeoutInterval: 6)
        r.setValue("Bearer \(token)", forHTTPHeaderField: "authorization")
        guard let (data, http) = try? await transport.send(r) else { return known }
        if http.statusCode == 401 || http.statusCode == 403 {
            store(nil, for: id, defaults: defaults)
            return false
        }
        guard http.statusCode == 200, let founding = parse(data) else { return known }
        store(founding, for: id, defaults: defaults)
        return founding
    }

    static func store(_ founding: Bool?, for id: String, defaults: UserDefaults) {
        var all = defaults.dictionary(forKey: cacheKey) as? [String: Bool] ?? [:]
        all[id] = founding
        defaults.set(all, forKey: cacheKey)
    }
}
