import Foundation

public enum YouTubeResults {
    public static func search(_ query: String, lang: String) -> URL {
        let native = Locale(identifier: lang).localizedString(forLanguageCode: lang) ?? ""
        let q = lang == "en" || native.isEmpty || query.localizedCaseInsensitiveContains(native) ? query : "\(query) \(native)"
        var c = URLComponents(string: "https://www.youtube.com/results")!
        c.queryItems = [URLQueryItem(name: "search_query", value: q), URLQueryItem(name: "hl", value: lang)]
        if let region = Lang.info[lang]?.bcp47.split(separator: "-").last, region.count == 2 { c.queryItems?.append(URLQueryItem(name: "gl", value: String(region))) }
        return c.url!
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
