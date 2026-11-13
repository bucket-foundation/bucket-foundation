import Foundation

public struct LatLon: Sendable, Equatable, Hashable {
    public let lat: Double
    public let lon: Double

    public init(_ lat: Double, _ lon: Double) {
        self.lat = lat
        self.lon = lon
    }
}

public struct AtlasRound: Sendable, Equatable, Hashable {
    public let lang: String
    public let form: String
    public let meaning: String
    public let itemId: String
}

public struct Nearest: Sendable, Equatable {
    public let home: LatLon
    public let km: Double
}

public struct Ghost: Sendable, Equatable, Hashable {
    public let name: String
    public let flag: String
    public let skill: String
    public let score: Int
}

public enum Atlas {
    public static let rounds = 5
    public static let max = 5000
    public static let scaleKm = 1800.0
    public static let mapW = 720.0
    public static let mapH = 360.0

    public static let homeLangs = ["es", "fr", "de", "it", "pt", "nl", "sv", "ja", "zh", "ko", "ru", "ar", "hi", "el", "tr"]

    public static let homes: [String: [LatLon]] = [
        "es": [LatLon(40.4, -3.7), LatLon(19.4, -99.1), LatLon(4.7, -74.1), LatLon(-34.6, -58.4), LatLon(-12.0, -77.0), LatLon(-33.4, -70.6)],
        "fr": [LatLon(48.9, 2.4), LatLon(45.5, -73.6), LatLon(50.8, 4.4), LatLon(14.7, -17.4), LatLon(5.3, -4.0)],
        "de": [LatLon(52.5, 13.4), LatLon(48.2, 16.4), LatLon(47.4, 8.5)],
        "it": [LatLon(41.9, 12.5), LatLon(45.5, 9.2)],
        "pt": [LatLon(38.7, -9.1), LatLon(-23.5, -46.6), LatLon(-15.8, -47.9), LatLon(-8.8, 13.2)],
        "nl": [LatLon(52.4, 4.9), LatLon(51.2, 4.4)],
        "sv": [LatLon(59.3, 18.1), LatLon(57.7, 12.0)],
        "ja": [LatLon(35.7, 139.7), LatLon(34.7, 135.5)],
        "zh": [LatLon(39.9, 116.4), LatLon(31.2, 121.5), LatLon(25.0, 121.5), LatLon(1.35, 103.8)],
        "ko": [LatLon(37.6, 127.0), LatLon(35.2, 129.1)],
        "ru": [LatLon(55.8, 37.6), LatLon(59.9, 30.3), LatLon(55.0, 82.9), LatLon(43.2, 76.9)],
        "ar": [LatLon(30.0, 31.2), LatLon(24.7, 46.7), LatLon(33.9, 35.5), LatLon(33.6, -7.6), LatLon(33.3, 44.4)],
        "hi": [LatLon(28.6, 77.2), LatLon(19.1, 72.9), LatLon(25.6, 85.1)],
        "el": [LatLon(38.0, 23.7), LatLon(35.2, 33.4)],
        "tr": [LatLon(41.0, 29.0), LatLon(39.9, 32.9)],
    ]

    public static func rounds(_ items: [LangItem], date: String, count: Int = rounds + 1, root: String = "en") -> [AtlasRound] {
        var rand = WebRandom(WebRandom.seedOf("voice-atlas:\(date)"))
        let words = items.filter { $0.kind == .word && $0.form(root) != nil }
        var out: [AtlasRound] = []
        var used = Set<String>()
        var tries = 0
        while out.count < count && tries < 400 {
            tries += 1
            let free = homeLangs.filter { !used.contains($0) }
            if free.isEmpty { break }
            let lang = free[rand.below(free.count)]
            let pool = words.filter { w in w.form(lang).map { $0 != w.form(root) && $0.utf16.count <= 24 } ?? false }
            used.insert(lang)
            if pool.isEmpty { continue }
            let item = pool[Int((rand.next() * Double(Swift.min(pool.count, 800))).rounded(.down))]
            out.append(AtlasRound(lang: lang, form: item.form(lang)!, meaning: item.form(root)!, itemId: item.id))
        }
        return out
    }

    public static func distanceKm(_ a: LatLon, _ b: LatLon) -> Double {
        let rad = Double.pi / 180
        let dLat = (b.lat - a.lat) * rad
        let dLon = (b.lon - a.lon) * rad
        let s1 = sin(dLat / 2), s2 = sin(dLon / 2)
        let h = s1 * s1 + cos(a.lat * rad) * cos(b.lat * rad) * s2 * s2
        return 2 * 6371 * asin(Swift.min(1.0, h.squareRoot()))
    }

    public static func nearestHome(_ lang: String, _ pin: LatLon) -> Nearest? {
        homes[lang]?.map { Nearest(home: $0, km: distanceKm(pin, $0)) }.min { $0.km < $1.km }
    }

    public static func points(_ km: Double) -> Int { km <= 150 ? max : playRound(Double(max) * exp(-(km - 150) / scaleKm)) }

    public static func project(lon: Double, lat: Double) -> (x: Double, y: Double) { ((lon + 180) / 360 * mapW, (90 - lat) / 180 * mapH) }

    public static func unproject(x: Double, y: Double) -> LatLon { LatLon(90 - y / mapH * 180, x / mapW * 360 - 180) }

    public static func ghosts(date: String, count: Int = 5) -> [Ghost] {
        let span = ["easy": (4000, 11000), "medium": (9000, 17000), "hard": (15000, 23500)]
        let picked = stableSorted(Bots.all, by: { WebRandom.unit("atlas:\(date):\($0.userId)") }).prefix(count).map { b in
            let (lo, hi) = span[b.skill]!
            return Ghost(name: b.name, flag: b.flag, skill: b.skill, score: lo + Int((WebRandom.unit("atlas-score:\(date):\(b.userId)") * Double(hi - lo)).rounded(.down)))
        }
        return stableSorted(Array(picked), by: \.score, descending: true)
    }
}
