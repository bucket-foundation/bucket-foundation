import Foundation

public enum BucketError: Error, Equatable, LocalizedError, Sendable {
    case badEmail
    case badCode
    case rateLimited(String?)
    case revoked
    case unavailable
    case server(Int, String?)
    case decoding
    case groupNotFound
    case groupFull
    case ownedLimit
    case joinedLimit
    case cheerLimit
    case nudgeNotNeeded
    case nameNotAllowed
    case shareLimit
    case textNotAllowed
    case imageTooLarge
    case imageNotAllowed
    case voiceTooLong
    case translateUnavailable

    public var errorDescription: String? {
        switch self {
        case .badEmail: "Enter a valid email address."
        case .badCode: "That code did not work. Check the newest email and try again."
        case .rateLimited(let m): m ?? "Too many tries. Wait ten minutes and try again."
        case .revoked: "Your session ended. Sign in again."
        case .unavailable: "Sign-in is unavailable right now."
        case .server(let s, let m): m ?? "Bucket answered \(s)."
        case .decoding: "Bucket sent a reply this version cannot read."
        case .groupNotFound: "That invite link no longer works. Ask for a new one."
        case .groupFull: "This group is full."
        case .nameNotAllowed: "That name is not allowed. Try another."
        case .ownedLimit: "You already own 10 groups."
        case .joinedLimit: "You already belong to 20 groups."
        case .cheerLimit: "You sent them 3 today. Try again tomorrow."
        case .nudgeNotNeeded: "They already studied today."
        case .shareLimit: "You shared a lot just now. Try again in an hour."
        case .textNotAllowed: "That text is not allowed. Try other words."
        case .imageTooLarge: "That image is too large to share."
        case .imageNotAllowed: "This image may be sensitive, so it was not sent."
        case .voiceTooLong: "Voice notes can be up to 60 seconds."
        case .translateUnavailable: "Translation is unavailable right now."
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
    let cacheDir: URL?

    public static let defaultCache = offlineDirectory("bucket-api")

    public static func offlineDirectory(_ name: String) -> URL? {
        guard var url = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask).first?.appending(path: name, directoryHint: .isDirectory) else { return nil }
        try? FileManager.default.createDirectory(at: url, withIntermediateDirectories: true)
        var values = URLResourceValues()
        values.isExcludedFromBackup = true
        try? url.setResourceValues(values)
        return url
    }

    public init(base: URL = BucketAPI.production, transport: Transport = URLSessionTransport(), cacheDir: URL? = BucketAPI.defaultCache) {
        self.base = base
        self.transport = transport
        self.cacheDir = cacheDir
    }

    public func deckIndex() async throws -> DeckIndex {
        try await cached("academy-app/corpus/index.json")
    }

    public func deck(_ entry: DeckEntry) async throws -> Deck {
        try await cached("academy-app/\(entry.file)")
    }

    public func questionDeck(_ branch: String) async throws -> QuestionDeck {
        try await cached("academy-app/corpus/questions/\(branch).json")
    }

    func cacheURL(_ path: String) -> URL? {
        guard let dir = cacheDir else { return nil }
        return dir.appending(path: path.replacingOccurrences(of: "/", with: "_"))
    }

    func cached<T: Decodable>(_ path: String) async throws -> T {
        do {
            let (data, http) = try await transport.send(URLRequest(url: base.appending(path: path)))
            let value: T = try decode(data, http)
            if let url = cacheURL(path) {
                try? FileManager.default.createDirectory(at: url.deletingLastPathComponent(), withIntermediateDirectories: true)
                try? data.write(to: url, options: .atomic)
            }
            return value
        } catch {
            guard let url = cacheURL(path), let data = try? Data(contentsOf: url) else { throw error }
            return try decodeBody(data)
        }
    }

    public func canonSearch(_ query: String, topK: Int = 20) async throws -> CanonSearch {
        var c = URLComponents(url: base.appending(path: "api/canon/search"), resolvingAgainstBaseURL: false)!
        c.queryItems = [URLQueryItem(name: "q", value: query), URLQueryItem(name: "top_k", value: String(topK))]
        let (data, http) = try await transport.send(URLRequest(url: c.url!))
        return try decode(data, http)
    }

    public func requestCode(email: String) async throws {
        _ = try await session(["action": "otp", "email": email, "app": Self.appName])
    }

    public static var appName: String { Bundle.main.bundleIdentifier?.hasPrefix("com.polingual") == true ? "polingual" : "bucket" }

    public func verify(email: String, code: String) async throws -> Session {
        let data = try await session(["action": "verify", "email": email, "code": code])
        return try decodeBody(data)
    }

    public func signInWithApple(idToken: String, nonce: String, authorizationCode: String? = nil) async throws -> Session {
        var body = ["action": "apple", "id_token": idToken, "nonce": nonce, "app": Self.appName]
        if let authorizationCode { body["authorization_code"] = authorizationCode }
        let data = try await session(body)
        return try decodeBody(data)
    }

    public func refresh(_ s: Session) async throws -> Session {
        let data = try await session(["action": "refresh", "refresh_token": s.refreshToken])
        return try decodeBody(data)
    }

    public func deleteAccount(token: String) async throws {
        _ = try await session(["action": "delete_account"], token: token)
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

    public func setAgeBand(token: String, band: AgeBand) async -> Int {
        var r = URLRequest(url: base.appending(path: "api/research-os/profile"))
        r.httpMethod = "POST"
        r.setValue("Bearer \(token)", forHTTPHeaderField: "authorization")
        r.setValue("application/json", forHTTPHeaderField: "content-type")
        r.httpBody = JSON.data(.object(JSObject([("role", .string("independent")), ("birthYearBucket", .string(band.rawValue))])))
        guard let (_, http) = try? await transport.send(r) else { return 0 }
        return http.statusCode
    }

    public func requestParentConsent(token: String, parentEmail: String) async -> Int {
        var r = URLRequest(url: base.appending(path: "api/research-os/consent"))
        r.httpMethod = "POST"
        r.setValue("Bearer \(token)", forHTTPHeaderField: "authorization")
        r.setValue("application/json", forHTTPHeaderField: "content-type")
        r.httpBody = JSON.data(.object(JSObject([("action", .string("request")), ("vendor", .string("email")), ("guardianContact", .string(parentEmail))])))
        guard let (_, http) = try? await transport.send(r) else { return 0 }
        return http.statusCode
    }

    func get<T: Decodable>(_ path: String) async throws -> T {
        let (data, http) = try await transport.send(URLRequest(url: base.appending(path: path)))
        return try decode(data, http)
    }

    func session(_ body: [String: String], token: String? = nil) async throws -> Data {
        var r = URLRequest(url: base.appending(path: "api/academy/session"))
        r.httpMethod = "POST"
        if let token { r.setValue("Bearer \(token)", forHTTPHeaderField: "authorization") }
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

public enum AgeBand: String, CaseIterable, Sendable {
    case adult = "18plus"
    case teen = "13to17"
    case child = "under13"

    public var label: String {
        switch self {
        case .adult: "18 or older"
        case .teen: "13 to 17"
        case .child: "Under 13"
        }
    }
}

extension BucketAPI {
    public static func debugBase(arguments: [String], environment: [String: String]) -> URL? {
        let raw: String? = {
            if let i = arguments.firstIndex(of: "-bucketBase"), i + 1 < arguments.count { return arguments[i + 1] }
            return environment["BUCKET_BASE_URL"]
        }()
        guard let raw, let url = URL(string: raw), let scheme = url.scheme, ["http", "https"].contains(scheme), url.host() != nil else { return nil }
        return url
    }
}
