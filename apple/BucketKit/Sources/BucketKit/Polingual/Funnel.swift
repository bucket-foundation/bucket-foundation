import Foundation

public struct HeardSource: Hashable, Sendable, Identifiable {
    public let key: String
    public let label: String
    public var id: String { key }

    public static let all: [HeardSource] = [
        HeardSource(key: "tiktok", label: "TikTok"),
        HeardSource(key: "instagram", label: "Instagram"),
        HeardSource(key: "youtube", label: "YouTube"),
        HeardSource(key: "app_store", label: "App Store"),
        HeardSource(key: "search", label: "Google or another search"),
        HeardSource(key: "friend", label: "A friend or family"),
        HeardSource(key: "school", label: "School or a teacher"),
        HeardSource(key: "reddit", label: "Reddit"),
        HeardSource(key: "other", label: "Somewhere else"),
    ]
}

public final class PolingualFunnel: Sendable {
    public static let eventsURL = URL(string: "https://www.polingual.com/api/events")!
    public static let client = "ios"
    public static let visitorKey = "polingual.funnel.visitor"
    public static let oncePrefix = "polingual.funnel.once."
    public static let names: Set<String> = ["signup", "first_lesson", "paywall_view", "onboarding_view", "heard_about"]
    public static let once: Set<String> = ["signup", "first_lesson", "heard_about"]

    nonisolated(unsafe) let defaults: UserDefaults
    let transport: any Transport
    let url: URL
    let makeId: @Sendable () -> String

    public init(defaults: UserDefaults = .standard, transport: any Transport = URLSessionTransport(), url: URL = PolingualFunnel.eventsURL, makeId: @escaping @Sendable () -> String = { UUID().uuidString.lowercased() }) {
        self.defaults = defaults
        self.transport = transport
        self.url = url
        self.makeId = makeId
    }

    public static func signupStep(_ session: Session?) -> String? {
        session?.newAccount == true ? "signup" : nil
    }

    public var visitor: String {
        if let have = defaults.string(forKey: Self.visitorKey) { return have }
        let id = makeId()
        defaults.set(id, forKey: Self.visitorKey)
        return id
    }

    public func body(_ name: String, detail: String? = nil, lang: String? = nil) -> Data? {
        guard Self.names.contains(name) else { return nil }
        if Self.once.contains(name) {
            let key = Self.oncePrefix + name
            if defaults.string(forKey: key) != nil { return nil }
            defaults.set("1", forKey: key)
        }
        var event: [String: String] = ["name": name, "path": "/ios"]
        if let detail { event["detail"] = detail }
        if let lang { event["lang"] = lang }
        struct Body: Encodable { let visitor: String; let events: [[String: String]] }
        return try? JSONEncoder().encode(Body(visitor: visitor, events: [event]))
    }

    public func request(_ body: Data) -> URLRequest {
        var r = URLRequest(url: url, timeoutInterval: 10)
        r.httpMethod = "POST"
        r.setValue("application/json", forHTTPHeaderField: "content-type")
        r.setValue(Self.client, forHTTPHeaderField: "x-polingual-client")
        r.httpBody = body
        return r
    }

    @discardableResult
    public func send(_ name: String, detail: String? = nil, lang: String? = nil) async -> Int? {
        guard let b = body(name, detail: detail, lang: lang) else { return nil }
        return try? await transport.send(request(b)).1.statusCode
    }
}
