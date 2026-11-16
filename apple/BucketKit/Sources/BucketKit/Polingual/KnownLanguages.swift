import Foundation

public struct KnownLanguages: Sendable, Equatable {
    public static let classical: Set<String> = ["la", "grc", "sa", "ang"]
    public static let common = ["en", "es", "fr", "pt", "zh", "hi", "ar"]
    public static let eventCodeLimit = 8
    public static let branch = "lang-known"

    public let codes: [String]
    public let at: Double

    public init(_ codes: [String], at: Double = 0) {
        self.codes = Set(codes).filter(Lang.codes.contains).sorted()
        self.at = at
    }

    public var isBlank: Bool { codes.isEmpty }

    public static func speakable(device: String) -> [String] {
        let listed = Lang.codes.filter { !classical.contains($0) }
        let lead = ([device] + common).filter(listed.contains)
        let rest = listed.filter { !lead.contains($0) }.sorted { Lang.name($0) < Lang.name($1) }
        var seen = Set<String>()
        return (lead + rest).filter { seen.insert($0).inserted }
    }

    public static func base(device: String, picks: [String]) -> String {
        let valid = picks.filter(Lang.codes.contains)
        if valid.contains(device) { return device }
        return valid.first ?? (Lang.codes.contains(device) ? device : "en")
    }

    public func base(device: String) -> String {
        let order = Self.speakable(device: device)
        let ranked = codes.sorted { (order.firstIndex(of: $0) ?? order.count) < (order.firstIndex(of: $1) ?? order.count) }
        return Self.base(device: device, picks: ranked)
    }

    public func toggled(_ code: String, at now: Double) -> KnownLanguages {
        guard Lang.codes.contains(code) else { return self }
        if codes.contains(code) {
            return codes.count > 1 ? KnownLanguages(codes.filter { $0 != code }, at: now) : self
        }
        return KnownLanguages(codes + [code], at: now)
    }

    public func learnable(_ targets: [String]) -> [String] {
        targets.filter { !codes.contains($0) }
    }

    public static func merged(_ a: KnownLanguages, _ b: KnownLanguages) -> KnownLanguages {
        if a.isBlank != b.isBlank { return a.isBlank ? b : a }
        return b.at > a.at ? b : a
    }

    public var eventCodes: String { codes.prefix(Self.eventCodeLimit).joined(separator: ",") }
}
