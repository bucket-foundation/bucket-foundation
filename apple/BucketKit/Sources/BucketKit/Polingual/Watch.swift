import Foundation

public struct WatchCue: Sendable, Equatable {
    public let start: Double
    public let end: Double
    public let text: String

    public init(start: Double, end: Double, text: String) {
        self.start = start
        self.end = end
        self.text = text
    }
}

public enum VTT {
    public static func parse(_ source: String) -> [WatchCue] {
        let text = source.replacingOccurrences(of: "\r\n", with: "\n").replacingOccurrences(of: "\r", with: "\n")
        let blocks = text.components(separatedBy: "\n\n")
        var cues: [WatchCue] = []
        for block in blocks {
            var lines = block.split(separator: "\n", omittingEmptySubsequences: false).map(String.init)
            while let first = lines.first, first.trimmingCharacters(in: .whitespaces).isEmpty { lines.removeFirst() }
            guard let timing = lines.firstIndex(where: { $0.contains("-->") }), timing <= 1 else { continue }
            let head = lines[0].trimmingCharacters(in: .whitespaces)
            if timing == 1, head.hasPrefix("NOTE") || head.hasPrefix("STYLE") || head.hasPrefix("WEBVTT") { continue }
            let parts = lines[timing].components(separatedBy: "-->")
            guard parts.count == 2,
                  let start = seconds(parts[0]),
                  let end = seconds(parts[1].split(separator: " ", omittingEmptySubsequences: true).first.map(String.init) ?? ""),
                  end >= start else { continue }
            let body = lines[(timing + 1)...].filter { !$0.trimmingCharacters(in: .whitespaces).isEmpty }.map(clean).joined(separator: "\n")
            guard !body.isEmpty else { continue }
            cues.append(WatchCue(start: start, end: end, text: body))
        }
        return cues.sorted { $0.start < $1.start }
    }

    public static func seconds(_ stamp: String) -> Double? {
        let s = stamp.trimmingCharacters(in: .whitespaces).replacingOccurrences(of: ",", with: ".")
        let fields = s.split(separator: ":").map(String.init)
        guard (2...3).contains(fields.count), let last = Double(fields[fields.count - 1]) else { return nil }
        var total = last
        var scale = 60.0
        for field in fields.dropLast().reversed() {
            guard let v = Int(field), v >= 0 else { return nil }
            total += Double(v) * scale
            scale *= 60
        }
        return total
    }

    public static func cue(at time: Double, in cues: [WatchCue]) -> WatchCue? {
        var lo = 0
        var hi = cues.count
        while lo < hi {
            let mid = (lo + hi) / 2
            if cues[mid].start <= time { lo = mid + 1 } else { hi = mid }
        }
        return cues[..<lo].last { time < $0.end }
    }

    static func clean(_ line: String) -> String {
        line.replacing(/<[^>]*>/, with: "")
            .replacingOccurrences(of: "&lt;", with: "<")
            .replacingOccurrences(of: "&gt;", with: ">")
            .replacingOccurrences(of: "&nbsp;", with: " ")
            .replacingOccurrences(of: "&amp;", with: "&")
            .trimmingCharacters(in: .whitespaces)
    }
}

public struct WatchFilm: Codable, Sendable, Equatable, Hashable, Identifiable {
    public let id: String
    public let title: [String: String]
    public let duration: Double
    public let license: String
    public let credit: String
    public let source: URL
    public let video: URL
    public let poster: URL
    public let langs: [String]
    public let cues: Int
    public let translation: String
    public let updated: String

    public func title(_ lang: String) -> String {
        title[lang] ?? title["en"] ?? id
    }

    public var minutes: Int { max(1, Int((duration / 60).rounded())) }

    public func subtitleLangs(for learner: [String]) -> [String] {
        let shown = learner.filter(langs.contains)
        return shown.isEmpty ? ["en"] : shown
    }
}

public struct WatchIndex: Codable, Sendable, Equatable {
    public let version: Int
    public let films: [WatchFilm]
}

public struct WatchAPI: Sendable {
    public static let base = URL(string: "https://www.polingual.com/watch/")!
    let transport: Transport
    let base: URL

    public init(transport: Transport = URLSessionTransport(), base: URL = WatchAPI.base) {
        self.transport = transport
        self.base = base
    }

    public func url(film: String, lang: String) -> URL {
        base.appending(path: film).appending(path: "\(lang).vtt")
    }

    func data(_ url: URL) async throws -> Data {
        if url.isFileURL { return try Data(contentsOf: url) }
        var r = URLRequest(url: url)
        r.setValue(ContentAPI.agent, forHTTPHeaderField: "user-agent")
        r.timeoutInterval = 20
        let (data, http) = try await transport.send(r)
        guard (200..<300).contains(http.statusCode) else { throw BucketError.server(http.statusCode, nil) }
        return data
    }

    public func index() async throws -> WatchIndex {
        let data = try await data(base.appending(path: "index.json"))
        do { return try JSONDecoder().decode(WatchIndex.self, from: data) } catch { throw BucketError.decoding }
    }

    public func cues(film: String, lang: String) async throws -> [WatchCue] {
        let data = try await data(url(film: film, lang: lang))
        guard let text = String(data: data, encoding: .utf8) else { throw BucketError.decoding }
        return VTT.parse(text)
    }
}
