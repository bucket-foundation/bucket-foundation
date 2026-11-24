import Foundation

public enum LobbyAdMode: String, Sendable {
    case off
    case test
    case live
}

public struct LobbyAdUnits: Equatable, Sendable {
    public static let testApp = "ca-app-pub-3940256099942544~1458002511"
    public static let testBanner = "ca-app-pub-3940256099942544/2435281174"
    public static let testInterstitial = "ca-app-pub-3940256099942544/4411468910"
    public static let testRewarded = "ca-app-pub-3940256099942544/1712485313"
    nonisolated(unsafe) static let unitPattern = /^ca-app-pub-\d{16}\/\d{10}$/
    nonisolated(unsafe) static let appPattern = /^ca-app-pub-\d{16}~\d{10}$/

    public let mode: LobbyAdMode
    public let banner: String
    public let interstitial: String
    public var rewarded: String?

    static func liveRewarded(_ info: [String: Any], app: String) -> String? {
        guard let unit = (info["PolingualAdRewarded"] as? String)?.trimmingCharacters(in: .whitespaces),
              unit.wholeMatch(of: unitPattern) != nil, unit != testRewarded,
              app.split(separator: "~").first == unit.split(separator: "/").first
        else { return nil }
        return unit
    }

    public static func from(_ info: [String: Any]) -> LobbyAdUnits? {
        let raw = (info["PolingualAds"] as? String)?.trimmingCharacters(in: .whitespaces).lowercased() ?? "off"
        switch LobbyAdMode(rawValue: raw) ?? .off {
        case .off:
            return nil
        case .test:
            guard info["GADApplicationIdentifier"] as? String == testApp else { return nil }
            return LobbyAdUnits(mode: .test, banner: testBanner, interstitial: testInterstitial, rewarded: testRewarded)
        case .live:
            guard let app = info["GADApplicationIdentifier"] as? String, app.wholeMatch(of: appPattern) != nil, app != testApp,
                  let banner = info["PolingualAdBanner"] as? String, let interstitial = info["PolingualAdInterstitial"] as? String,
                  banner.wholeMatch(of: unitPattern) != nil, interstitial.wholeMatch(of: unitPattern) != nil,
                  banner != testBanner, interstitial != testInterstitial,
                  app.split(separator: "~").first == banner.split(separator: "/").first,
                  app.split(separator: "~").first == interstitial.split(separator: "/").first
            else { return nil }
            return LobbyAdUnits(mode: .live, banner: banner, interstitial: interstitial, rewarded: liveRewarded(info, app: app))
        }
    }
}

public struct InterstitialPacer: Sendable {
    public static let minimumGap: TimeInterval = 180
    public static let minimumGames = 2
    public private(set) var lastShown: Date?

    public init(lastShown: Date? = nil) { self.lastShown = lastShown }

    public func due(finishedGame: Bool, gamesThisSession: Int, at now: Date) -> Bool {
        guard finishedGame, gamesThisSession >= Self.minimumGames else { return false }
        guard let lastShown else { return true }
        return now.timeIntervalSince(lastShown) >= Self.minimumGap
    }

    public mutating func shown(at now: Date) { lastShown = now }
}

public enum AdSurface: Sendable, CaseIterable {
    case today, learn, gamesHub, gameBoard, gameResult, lobby
}

public enum AdGate {
    public static func banner(on surface: AdSurface, allowed: Bool, consented: Bool) -> Bool {
        guard allowed, consented else { return false }
        return surface == .gamesHub || surface == .gameResult || surface == .lobby
    }

    public static func interstitial(from surface: AdSurface, allowed: Bool, consented: Bool) -> Bool {
        guard allowed, consented else { return false }
        return surface == .gamesHub || surface == .lobby
    }

    public static func rewarded(allowed: Bool, consented: Bool, unit: String?) -> Bool {
        allowed && consented && unit?.isEmpty == false
    }
}

public struct ResultVisibility: Sendable, Equatable {
    public private(set) var visible: Set<UUID> = []

    public init() {}

    public var showsBanner: Bool { !visible.isEmpty }

    public mutating func appeared(_ id: UUID) { visible.insert(id) }

    public mutating func disappeared(_ id: UUID) { visible.remove(id) }
}
