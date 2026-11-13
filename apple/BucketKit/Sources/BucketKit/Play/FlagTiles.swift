import Foundation

public struct FlagRunTile: Sendable, Equatable, Hashable {
    public let lang: String
    public let form: String
    public let meaning: String
    public let itemId: String
}

public struct FlagTilesDeck: Sendable, Equatable {
    public let date: String
    public let langs: [String]
    public let tiles: [FlagRunTile]
}

public enum RunPhase: Sendable, Equatable { case ready, running, missed, over }

public struct RunState: Sendable, Equatable {
    public var phase: RunPhase = .ready
    public var index = 0
    public var score = 0
    public var continued = false
    public var missed: Int?
    public var picked: Int?

    public init(phase: RunPhase = .ready, index: Int = 0, score: Int = 0, continued: Bool = false, missed: Int? = nil, picked: Int? = nil) {
        self.phase = phase
        self.index = index
        self.score = score
        self.continued = continued
        self.missed = missed
        self.picked = picked
    }
}

public enum RunEvent: Sendable, Equatable {
    case start
    case tap(lane: Int, answer: Int)
    case timeout
    case `continue`
    case end
}

public enum FlagTilesRules {
    public static let lanes = 4
    public static let deckSize = 240
    public static let step = 10
    public static let fallStartMs = 3400
    public static let fallMinMs = 1100
    public static let fallFactor = 0.88
    public static let pool = ["es", "fr", "de", "it", "pt", "nl", "sv", "ja", "zh", "ko", "ru", "ar", "hi", "el", "tr"]

    public static func step(_ s: RunState, _ e: RunEvent) -> RunState {
        var n = s
        switch e {
        case .start:
            return RunState(phase: .running)
        case let .tap(lane, answer) where s.phase == .running:
            if lane == answer {
                n.index += 1
                n.score += 1
            } else {
                n.phase = .missed
                n.missed = s.index
                n.picked = lane
            }
        case .timeout where s.phase == .running:
            n.phase = .missed
            n.missed = s.index
            n.picked = nil
        case .continue where s.phase == .missed && !s.continued:
            n.phase = .running
            n.continued = true
            n.index += 1
            n.picked = nil
        case .end where s.phase == .missed:
            n.phase = .over
        default:
            break
        }
        return n
    }

    public static func fallMs(_ index: Int) -> Int { max(fallMinMs, jsRound(Double(fallStartMs) * pow(fallFactor, Double(index / step)))) }

    public static func deck(_ items: [LangItem], date: String, root: String = "en") -> FlagTilesDeck {
        var rand = WebRandom(WebRandom.seedOf("flag-tiles:\(date)"))
        let words = items.filter { $0.kind == .word && $0.form(root) != nil }
        let usable = pool.filter { l in words.lazy.filter { $0.form(l) != nil }.count >= 40 }
        let langs = Array(rand.shuffled(usable).prefix(lanes)).sorted()
        var tiles: [FlagRunTile] = []
        var seen = Set<String>()
        for item in rand.shuffled(Array(words.prefix(3000))) {
            if tiles.count >= deckSize { break }
            let options = langs.filter { l in
                guard let f = item.form(l), f != item.form(root) else { return false }
                return langs.allSatisfy { $0 == l || item.form($0) != f }
            }
            if options.isEmpty { continue }
            let lang = options[rand.below(options.count)]
            let form = item.form(lang)!
            let key = "\(lang):\(form)"
            if seen.contains(key) || form.utf16.count > 24 { continue }
            seen.insert(key)
            tiles.append(FlagRunTile(lang: lang, form: form, meaning: item.form(root)!, itemId: item.id))
        }
        return FlagTilesDeck(date: date, langs: langs, tiles: tiles)
    }

    public static func ghosts(date: String, count: Int = 5) -> [Ghost] {
        let span = ["easy": (6, 18), "medium": (14, 34), "hard": (28, 60)]
        let picked = stableSorted(Bots.all, by: { WebRandom.unit("ghost:\(date):\($0.userId)") }).prefix(count).map { b in
            let (lo, hi) = span[b.skill]!
            return Ghost(name: b.name, flag: b.flag, skill: b.skill, score: lo + Int((WebRandom.unit("ghost-score:\(date):\(b.userId)") * Double(hi - lo + 1)).rounded(.down)))
        }
        return stableSorted(Array(picked), by: \.score, descending: true)
    }
}

public struct TileSchedule: Sendable, Equatable {
    public let index: Int
    public let lane: Int
    public let spawnMs: Int
    public let fallMs: Int

    public init(index: Int, lane: Int, spawnMs: Int, fallMs: Int) {
        self.index = index
        self.lane = lane
        self.spawnMs = spawnMs
        self.fallMs = fallMs
    }
}

public enum Lanes {
    public static let tileLanes = 4
    static let fallFrom = 0.62
    static let fallTo = 0.42
    static let spawnSpan = 0.55
    static let submitAt = 0.9

    public static let keys: [String: Int] = ["d": 0, "f": 1, "j": 2, "k": 3, "1": 0, "2": 1, "3": 2, "4": 3, "arrowleft": 0, "arrowdown": 1, "arrowup": 2, "arrowright": 3]

    public static func ramp(round: Int, rounds: Int) -> Double {
        guard rounds > 1 else { return 0 }
        let x = min(1, max(0, Double(round) / Double(rounds - 1)))
        return x * x
    }

    public static func schedule(count: Int, round: Int, rounds: Int, roundSeconds: Int) -> [TileSchedule] {
        let len = Double(roundSeconds * 1000)
        let fall = jsRound(len * (fallFrom - (fallFrom - fallTo) * ramp(round: round, rounds: rounds)))
        let span = min(len * spawnSpan, len * submitAt - Double(fall) - 100)
        return (0..<max(0, count)).map { i in
            TileSchedule(index: i, lane: (i * 3 + round) % tileLanes, spawnMs: count <= 1 ? 0 : jsRound(span * Double(i) / Double(count - 1)), fallMs: fall)
        }
    }

    public static func target(choices: Int, schedule: [TileSchedule], lane: Int, elapsedMs: Double, tapped: Set<Int>) -> Int? {
        var best: (index: Int, progress: Double)?
        for s in schedule where s.lane == lane && !tapped.contains(s.index) && s.index < choices {
            let progress = (elapsedMs - Double(s.spawnMs)) / Double(s.fallMs)
            guard (0...1).contains(progress) else { continue }
            if best == nil || progress > best!.progress { best = (s.index, progress) }
        }
        return best?.index
    }
}
