import Foundation

public enum TranslationIssue: String, Codable, Sendable, CaseIterable, Identifiable {
    case meaning, spelling, sound, script
    public var id: String { rawValue }
}

public struct ReportSubject: Sendable, Hashable {
    public var lang: String
    public var root: String?
    public var itemId: String?
    public var text: String?
    public var shown: String
    public var context: String

    public init(lang: String, root: String? = nil, itemId: String? = nil, text: String? = nil, shown: String, context: String) {
        self.lang = lang
        self.root = root
        self.itemId = itemId
        self.text = text
        self.shown = shown
        self.context = context
    }
}

public struct TranslationReport: Codable, Sendable, Equatable {
    public let id: String
    public let lang: String
    public let root: String?
    public let itemId: String?
    public let text: String?
    public let shown: String
    public let reason: TranslationIssue
    public let suggestion: String?
    public let context: String
    public let deviceId: String

    enum CodingKeys: String, CodingKey {
        case id, lang, root, text, shown, reason, suggestion, context
        case itemId = "item_id"
        case deviceId = "device_id"
    }

    public init(subject: ReportSubject, reason: TranslationIssue, suggestion: String?, deviceId: String, id: String = UUID().uuidString.lowercased()) {
        let trimmed = suggestion?.trimmingCharacters(in: .whitespacesAndNewlines)
        self.id = id
        lang = subject.lang
        root = subject.root
        itemId = subject.itemId.map { Self.clip($0, 120) }
        text = subject.text.map { Self.clip($0, 400) }
        shown = Self.clip(subject.shown, 400)
        self.reason = reason
        self.suggestion = trimmed.flatMap { $0.isEmpty ? nil : Self.clip($0, 400) }
        context = subject.context
        self.deviceId = deviceId
    }

    static func clip(_ s: String, _ max: Int) -> String {
        var out = String.UnicodeScalarView()
        out.append(contentsOf: s.unicodeScalars.prefix(max))
        return String(out)
    }
}

public actor TranslationReports {
    public static let maxQueue = 200
    public static let deviceKey = "translationReports.deviceId"

    let base: URL
    let transport: any Transport
    let file: URL
    let defaults: UserDefaults
    var queue: [TranslationReport]
    var flushing = false

    public init(base: URL = BucketAPI.production, transport: any Transport = URLSessionTransport(), file: URL, suite: String? = nil) {
        self.base = base
        self.transport = transport
        self.file = file
        self.defaults = suite.flatMap(UserDefaults.init(suiteName:)) ?? .standard
        queue = (try? JSONDecoder().decode([TranslationReport].self, from: Data(contentsOf: file))) ?? []
    }

    public var pending: Int { queue.count }

    public var deviceId: String {
        if let id = defaults.string(forKey: Self.deviceKey) { return id }
        let id = UUID().uuidString.lowercased()
        defaults.set(id, forKey: Self.deviceKey)
        return id
    }

    @discardableResult
    public func submit(_ subject: ReportSubject, reason: TranslationIssue, suggestion: String?, token: String?) async -> Int {
        queue.append(TranslationReport(subject: subject, reason: reason, suggestion: suggestion, deviceId: deviceId))
        if queue.count > Self.maxQueue { queue.removeFirst(queue.count - Self.maxQueue) }
        save()
        return await flush(token: token)
    }

    @discardableResult
    public func flush(token: String?) async -> Int {
        guard !flushing, !queue.isEmpty else { return 0 }
        flushing = true
        defer { flushing = false }
        var sent = 0
        while let next = queue.first {
            var status = await post(next, token: token)
            if status == 401, token != nil { status = await post(next, token: nil) }
            guard let status else { break }
            if status == 200 || status == 400 || status == 413 {
                queue.removeFirst()
                sent += status == 200 ? 1 : 0
                save()
            } else {
                break
            }
        }
        return sent
    }

    func post(_ report: TranslationReport, token: String?) async -> Int? {
        var r = URLRequest(url: base.appending(path: "api/academy/translation-report"))
        r.httpMethod = "POST"
        if let token { r.setValue("Bearer \(token)", forHTTPHeaderField: "authorization") }
        r.setValue("application/json", forHTTPHeaderField: "content-type")
        r.httpBody = try? JSONEncoder().encode(report)
        guard let (_, http) = try? await transport.send(r) else { return nil }
        return http.statusCode
    }

    func save() {
        try? FileManager.default.createDirectory(at: file.deletingLastPathComponent(), withIntermediateDirectories: true)
        try? JSONEncoder().encode(queue).write(to: file, options: .atomic)
    }
}
