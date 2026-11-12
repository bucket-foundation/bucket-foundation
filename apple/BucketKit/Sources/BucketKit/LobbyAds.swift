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
    static let unitPattern = /^ca-app-pub-\d{16}\/\d{10}$/

    public let mode: LobbyAdMode
    public let banner: String
    public let interstitial: String

    public static func from(_ info: [String: Any]) -> LobbyAdUnits? {
        let raw = (info["PolingualAds"] as? String)?.trimmingCharacters(in: .whitespaces).lowercased() ?? "off"
        switch LobbyAdMode(rawValue: raw) ?? .off {
        case .off:
            return nil
        case .test:
            return LobbyAdUnits(mode: .test, banner: testBanner, interstitial: testInterstitial)
        case .live:
            guard let banner = info["PolingualAdBanner"] as? String, let interstitial = info["PolingualAdInterstitial"] as? String,
                  banner.wholeMatch(of: unitPattern) != nil, interstitial.wholeMatch(of: unitPattern) != nil,
                  banner != testBanner, interstitial != testInterstitial
            else { return nil }
            return LobbyAdUnits(mode: .live, banner: banner, interstitial: interstitial)
        }
    }
}

public struct InterstitialPacer: Sendable {
    public static let minimumGap: TimeInterval = 180
    public private(set) var lastShown: Date?

    public init(lastShown: Date? = nil) { self.lastShown = lastShown }

    public func due(finishedGame: Bool, at now: Date) -> Bool {
        guard finishedGame else { return false }
        guard let lastShown else { return true }
        return now.timeIntervalSince(lastShown) >= Self.minimumGap
    }

    public mutating func shown(at now: Date) { lastShown = now }
}
