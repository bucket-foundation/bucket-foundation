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

    public init(js: JSValue?) {
        self.init(js?["codes"]?.stringArray ?? [], at: js?["at"]?.number ?? 0)
    }

    public var js: JSValue {
        .object(JSObject([("codes", .array(codes.map(JSValue.string))), ("at", .number(at))]))
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

    public static let starter = ["fr", "es", "it", "de", "pt", "nl", "ja", "zh"]

    public func starterTargets(root: String, count: Int = 3) -> [String] {
        let open = { (list: [String]) in list.filter { $0 != root && !codes.contains($0) } }
        let lead = open(Self.starter)
        return Array((lead.isEmpty ? open(Lang.codes.filter { !Self.classical.contains($0) }) : lead).prefix(count))
    }
}

public struct KnownPicks: Sendable, Equatable {
    public let device: String
    public private(set) var known: KnownLanguages
    public private(set) var chosenBase: String?
    public private(set) var targets: [String]

    public init(device: String, stored: KnownLanguages = KnownLanguages([])) {
        self.device = device
        known = stored.isBlank ? KnownLanguages([device]) : stored
        targets = []
        targets = known.starterTargets(root: root)
    }

    public var root: String {
        if let chosenBase, known.codes.contains(chosenBase) { return chosenBase }
        return known.base(device: device)
    }

    public var bases: [String] {
        let order = KnownLanguages.speakable(device: device)
        return known.codes.sorted { (order.firstIndex(of: $0) ?? order.count) < (order.firstIndex(of: $1) ?? order.count) }
    }

    public var ready: Bool { !known.isBlank }

    public var touched: Bool { known.at > 0 }

    public func codesToSave(over stored: KnownLanguages) -> [String]? {
        guard ready else { return nil }
        return touched || stored.isBlank ? known.codes : nil
    }

    public mutating func toggle(_ code: String, at now: Double) {
        known = known.isBlank ? KnownLanguages([code], at: now) : known.toggled(code, at: now)
        settle()
    }

    public mutating func choose(base code: String) {
        guard known.codes.contains(code) else { return }
        chosenBase = code
        settle()
    }

    public mutating func pick(_ preset: [String]) {
        targets = open(preset)
    }

    public func open(_ list: [String]) -> [String] {
        known.learnable(list).filter { $0 != root }
    }

    public func presets(_ all: [(name: String, targets: [String])]) -> [(name: String, targets: [String])] {
        var seen = Set<Set<String>>()
        return all.compactMap { p in
            let left = open(p.targets)
            guard !left.isEmpty, seen.insert(Set(left)).inserted else { return nil }
            return (p.name, left)
        }
    }

    mutating func settle() {
        targets = open(targets)
        if targets.isEmpty { targets = known.starterTargets(root: root) }
    }
}

public enum KnownPrompt {
    public static let askedKey = "polingual.knownAskedOwners"
    public static let guest = "guest"
    public static let offerSeconds = 2.0
    public static let retrySeconds = 4.0
    public static let retryLimit = 15

    public static func retries(after attempts: Int) -> Bool {
        attempts < retryLimit
    }

    public static func due(known: KnownLanguages, systems: [LangSystem], ready: Bool, signedIn: Bool, pulled: Bool, asked: Bool, busy: Bool = false) -> Bool {
        guard ready, !asked, !busy, known.isBlank, !systems.isEmpty else { return false }
        return !signedIn || pulled
    }

    public static func asked(_ owners: String, owner: String?) -> Bool {
        owners.split(separator: ",").contains(Substring(owner ?? guest))
    }

    public static func marking(_ owners: String, owner: String?) -> String {
        asked(owners, owner: owner) ? owners : (owners.split(separator: ",").map(String.init) + [owner ?? guest]).joined(separator: ",")
    }

    public static func seed(systems: [LangSystem], device: String) -> KnownPicks {
        let newest = systems.max { $0.createdAt < $1.createdAt }?.root
        let lead = newest.flatMap { KnownLanguages.speakable(device: device).contains($0) ? $0 : nil }
        return KnownPicks(device: lead ?? device)
    }

    public static func root(current: String, known: KnownLanguages, device: String) -> String {
        known.isBlank || known.codes.contains(current) ? current : KnownPicks(device: device, stored: known).root
    }

    public static func summary(_ known: KnownLanguages, device: String, name: (String) -> String) -> String {
        KnownPicks(device: device, stored: known).bases.map(name).joined(separator: ", ")
    }
}
