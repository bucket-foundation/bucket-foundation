import Foundation

public enum BucketError: Error, Equatable, LocalizedError, Sendable {
    case badEmail
    case badCode
    case rateLimited(String?)
    case revoked
    case unavailable
    case server(Int, String?)
    case decoding

    public var errorDescription: String? {
        switch self {
        case .badEmail: "Enter a valid email address."
        case .badCode: "That code did not work. Check the newest email and try again."
        case .rateLimited(let m): m ?? "Too many tries. Wait ten minutes and try again."
        case .revoked: "Your session ended. Sign in again."
        case .unavailable: "Sign-in is unavailable right now."
        case .server(let s, let m): m ?? "Bucket answered \(s)."
        case .decoding: "Bucket sent a reply this version cannot read."
        }
    }
}

public protocol Transport: Sendable {
    func send(_ request: URLRequest) async throws -> (Data, HTTPURLResponse)
}

public struct URLSessionTransport: Transport {
    let session: URLSession

    public init(session: URLSession = .shared) { self.session = session }

    public func send(_ request: URLRequest) async throws -> (Data, HTTPURLResponse) {
        let (data, response) = try await session.data(for: request)
        guard let http = response as? HTTPURLResponse else { throw BucketError.server(0, nil) }
        return (data, http)
    }
}

public struct BucketAPI: Sendable {
    public static let production = URL(string: "https://www.bucket.foundation")!

    public let base: URL
    let transport: Transport

    public init(base: URL = BucketAPI.production, transport: Transport = URLSessionTransport()) {
        self.base = base
        self.transport = transport
    }

    public func deckIndex() async throws -> DeckIndex {
        try await get("academy-app/corpus/index.json")
    }

    public func deck(_ entry: DeckEntry) async throws -> Deck {
        try await get("academy-app/\(entry.file)")
    }

    public func canonSearch(_ query: String, topK: Int = 20) async throws -> CanonSearch {
        var c = URLComponents(url: base.appending(path: "api/canon/search"), resolvingAgainstBaseURL: false)!
        c.queryItems = [URLQueryItem(name: "q", value: query), URLQueryItem(name: "top_k", value: String(topK))]
        let (data, http) = try await transport.send(URLRequest(url: c.url!))
        return try decode(data, http)
    }

    public func requestCode(email: String) async throws {
        _ = try await session(["action": "otp", "email": email])
    }

    public func verify(email: String, code: String) async throws -> Session {
        let data = try await session(["action": "verify", "email": email, "code": code])
        return try decodeBody(data)
    }

    public func refresh(_ s: Session) async throws -> Session {
        let data = try await session(["action": "refresh", "refresh_token": s.refreshToken])
        return try decodeBody(data)
    }

    public func raw(_ path: String) async throws -> Data {
        let (data, http) = try await transport.send(URLRequest(url: base.appending(path: path)))
        guard (200..<300).contains(http.statusCode) else { throw BucketError.server(http.statusCode, nil) }
        return data
    }

    public func progressPull(token: String) async -> JSObject? {
        var r = URLRequest(url: base.appending(path: "api/academy/progress"))
        r.setValue("Bearer \(token)", forHTTPHeaderField: "authorization")
        r.cachePolicy = .reloadIgnoringLocalCacheData
        guard let (data, http) = try? await transport.send(r), http.statusCode == 200, let j = try? JSON.parse(data) else { return nil }
        return j["branches"]?.object ?? JSObject()
    }

    public func progressPush(token: String, branch: String, data: JSValue) async -> Int {
        var r = URLRequest(url: base.appending(path: "api/academy/progress"))
        r.httpMethod = "POST"
        r.setValue("Bearer \(token)", forHTTPHeaderField: "authorization")
        r.setValue("application/json", forHTTPHeaderField: "content-type")
        r.httpBody = JSON.data(.object(JSObject([("branch", .string(branch)), ("data", data)])))
        guard let (_, http) = try? await transport.send(r) else { return 0 }
        return http.statusCode
    }

    func get<T: Decodable>(_ path: String) async throws -> T {
        let (data, http) = try await transport.send(URLRequest(url: base.appending(path: path)))
        return try decode(data, http)
    }

    func session(_ body: [String: String]) async throws -> Data {
        var r = URLRequest(url: base.appending(path: "api/academy/session"))
        r.httpMethod = "POST"
        r.setValue("application/json", forHTTPHeaderField: "content-type")
        r.httpBody = try JSONEncoder().encode(body)
        let (data, http) = try await transport.send(r)
        if http.statusCode == 200 { return data }
        throw Self.sessionError(status: http.statusCode, data: data)
    }

    static func sessionError(status: Int, data: Data) -> BucketError {
        let body = (try? JSONDecoder().decode([String: String].self, from: data)) ?? [:]
        switch (status, body["error"]) {
        case (400, "bad_email"): return .badEmail
        case (400, "bad_code"): return .badCode
        case (401, _): return .revoked
        case (429, _): return .rateLimited(body["message"])
        case (503, _): return .unavailable
        default: return .server(status, body["message"])
        }
    }

    func decode<T: Decodable>(_ data: Data, _ http: HTTPURLResponse) throws -> T {
        guard (200..<300).contains(http.statusCode) else { throw BucketError.server(http.statusCode, nil) }
        return try decodeBody(data)
    }

    func decodeBody<T: Decodable>(_ data: Data) throws -> T {
        do { return try JSONDecoder().decode(T.self, from: data) } catch { throw BucketError.decoding }
    }
}
