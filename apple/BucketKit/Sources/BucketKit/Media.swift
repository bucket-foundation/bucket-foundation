import Foundation

public struct FoundVideo: Sendable, Equatable, Identifiable, Hashable {
    public let id: String
    public let title: String

    public init(id: String, title: String) {
        self.id = id
        self.title = title
    }

    public var embed: URL {
        URL(string: "https://www.youtube-nocookie.com/embed/\(id)?playsinline=1&autoplay=1&rel=0&modestbranding=1")!
    }
}

public enum YouTubeResults {
    static let marker = "\"videoRenderer\":{\"videoId\":\""
    static let titleMarker = "\"title\":{\"runs\":[{\"text\":\""

    public static func search(_ query: String, lang: String) -> URL {
        let native = Locale(identifier: lang).localizedString(forLanguageCode: lang) ?? ""
        let q = lang == "en" || native.isEmpty || query.localizedCaseInsensitiveContains(native) ? query : "\(query) \(native)"
        var c = URLComponents(string: "https://www.youtube.com/results")!
        c.queryItems = [URLQueryItem(name: "search_query", value: q), URLQueryItem(name: "hl", value: lang)]
        if let region = Lang.info[lang]?.bcp47.split(separator: "-").last, region.count == 2 { c.queryItems?.append(URLQueryItem(name: "gl", value: String(region))) }
        return c.url!
    }

    public static func parse(_ html: String, limit: Int = 8) -> [FoundVideo] {
        var out: [FoundVideo] = []
        var seen = Set<String>()
        var rest = html[...]
        while out.count < limit, let m = rest.range(of: marker) {
            let idEnd = rest.index(m.upperBound, offsetBy: 11, limitedBy: rest.endIndex) ?? rest.endIndex
            let id = String(rest[m.upperBound..<idEnd])
            rest = rest[idEnd...]
            guard id.count == 11, id.allSatisfy({ $0.isLetter || $0.isNumber || $0 == "-" || $0 == "_" }), seen.insert(id).inserted else { continue }
            let window = rest.prefix(4000)
            guard let t = window.range(of: titleMarker), let title = jsonString(window[t.upperBound...]) else { continue }
            out.append(FoundVideo(id: id, title: title))
        }
        return out
    }

    static func jsonString(_ s: Substring) -> String? {
        var escaped = false
        for i in s.indices {
            let c = s[i]
            if escaped { escaped = false; continue }
            if c == "\\" { escaped = true; continue }
            if c == "\"" {
                let raw = "\"" + s[s.startIndex..<i] + "\""
                return (try? JSONDecoder().decode(String.self, from: Data(raw.utf8)))
            }
        }
        return nil
    }
}

public struct ImmersionLog: Codable, Sendable, Equatable {
    public var seconds: [String: Double] = [:]

    public init() {}

    public static func day(_ date: Date, calendar: Calendar = .current) -> String {
        let c = calendar.dateComponents([.year, .month, .day], from: date)
        return String(format: "%04d-%02d-%02d", c.year ?? 0, c.month ?? 0, c.day ?? 0)
    }

    public mutating func add(_ s: Double, at date: Date, calendar: Calendar = .current) {
        guard s > 0 else { return }
        seconds[Self.day(date, calendar: calendar), default: 0] += s
        let keep = Set((0..<14).compactMap { calendar.date(byAdding: .day, value: -$0, to: date) }.map { Self.day($0, calendar: calendar) })
        seconds = seconds.filter { keep.contains($0.key) }
    }

    public func minutes(on date: Date, calendar: Calendar = .current) -> Int {
        Int((seconds[Self.day(date, calendar: calendar)] ?? 0) / 60)
    }
}
