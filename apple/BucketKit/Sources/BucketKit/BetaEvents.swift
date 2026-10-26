import Foundation

public struct BetaEvent: Codable, Sendable, Equatable {
    public let id: String
    public let name: String
    public let ts: String
    public let sessionId: String?
    public let props: [String: JSONScalar]

    enum CodingKeys: String, CodingKey {
        case id, name, ts, props
        case sessionId = "session_id"
    }

    public init(id: String = UUID().uuidString.lowercased(), name: String, at date: Date = .now, sessionId: String?, props: [String: JSONScalar] = [:]) {
        self.id = id
        self.name = name
        self.ts = ISO8601DateFormatter().string(from: date)
        self.sessionId = sessionId
        self.props = props
    }
}

public enum JSONScalar: Codable, Sendable, Equatable {
    case string(String), number(Double), bool(Bool)

    public init(from decoder: Decoder) throws {
        let c = try decoder.singleValueContainer()
        if let b = try? c.decode(Bool.self) { self = .bool(b) } else if let n = try? c.decode(Double.self) { self = .number(n) } else { self = .string(try c.decode(String.self)) }
    }

    public func encode(to encoder: Encoder) throws {
        var c = encoder.singleValueContainer()
        switch self {
        case .string(let s): try c.encode(String(s.prefix(128)))
        case .number(let n): try c.encode(n)
        case .bool(let b): try c.encode(b)
        }
    }
}

public struct BetaFlush: Equatable, Sendable {
    public let sent: Int
    public let kept: Int
}

public actor BetaEvents {
    public static let batchSize = 100
    public static let maxQueue = 2000
    public static let optOutKey = "beta.optedOut"

    let app: String
    let base: URL
    let transport: any Transport
    let file: URL
    let defaults: UserDefaults
    var queue: [BetaEvent]
    var flushing = false

    public init(app: String, base: URL = BucketAPI.production, transport: any Transport = URLSessionTransport(), file: URL, suite: String? = nil) {
        self.app = app
        self.base = base
        self.transport = transport
        self.file = file
        self.defaults = suite.flatMap(UserDefaults.init(suiteName:)) ?? .standard
        queue = (try? JSONDecoder().decode([BetaEvent].self, from: Data(contentsOf: file))) ?? []
    }

    public var optedOut: Bool { defaults.bool(forKey: Self.optOutKey) }
    public var pending: Int { queue.count }

    public func log(_ event: BetaEvent) {
        guard !optedOut else { return }
        queue.append(event)
        if queue.count > Self.maxQueue { queue.removeFirst(queue.count - Self.maxQueue) }
        save()
    }

    public func flush(token: String?) async -> BetaFlush {
        guard let token, !flushing, !queue.isEmpty, !optedOut else { return BetaFlush(sent: 0, kept: queue.count) }
        flushing = true
        defer { flushing = false }
        var sent = 0
        while !queue.isEmpty {
            let batch = Array(queue.prefix(Self.batchSize))
            guard let status = await post(batch, token: token) else { break }
            if status == 200 || status == 400 || status == 413 {
                queue.removeFirst(batch.count)
                sent += status == 200 ? batch.count : 0
                save()
            } else {
                break
            }
        }
        return BetaFlush(sent: sent, kept: queue.count)
    }

    public func setOptedOut(_ out: Bool, token: String?) async {
        defaults.set(out, forKey: Self.optOutKey)
        if out {
            queue = []
            save()
        }
        guard let token else { return }
        var r = URLRequest(url: base.appending(path: "api/beta/opt-out"))
        r.httpMethod = "POST"
        r.setValue("Bearer \(token)", forHTTPHeaderField: "authorization")
        r.setValue("application/json", forHTTPHeaderField: "content-type")
        r.httpBody = try? JSONEncoder().encode(["opted_out": out])
        _ = try? await transport.send(r)
    }

    func post(_ batch: [BetaEvent], token: String) async -> Int? {
        struct Body: Encodable { let app: String; let events: [BetaEvent] }
        var r = URLRequest(url: base.appending(path: "api/beta/events"))
        r.httpMethod = "POST"
        r.setValue("Bearer \(token)", forHTTPHeaderField: "authorization")
        r.setValue("application/json", forHTTPHeaderField: "content-type")
        r.httpBody = try? JSONEncoder().encode(Body(app: app, events: batch))
        guard let (_, http) = try? await transport.send(r) else { return nil }
        return http.statusCode
    }

    func save() {
        try? FileManager.default.createDirectory(at: file.deletingLastPathComponent(), withIntermediateDirectories: true)
        try? JSONEncoder().encode(queue).write(to: file, options: .atomic)
    }
}
