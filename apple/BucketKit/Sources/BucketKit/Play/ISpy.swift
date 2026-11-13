import Foundation

public struct SpyObject: Sendable, Equatable {
    public let id: String
    public let art: Int
    public let x: Double
    public let y: Double
    public let tilt: Double
}

public struct SpyDecor: Sendable, Equatable {
    public let art: String
    public let x: Double
    public let y: Double
    public let size: Double
    public let tilt: Double
}

public struct SpyScene: Sendable, Equatable {
    public let id: String
    public let name: String
    public let objects: [SpyObject]
    public let decor: [SpyDecor]
}

public struct SpyRound: Sendable, Equatable {
    public let round: Int
    public let scene: String
    public let lang: String
    public let itemId: String
    public let gloss: String
    public let choices: [String]
    public let answer: String
}

public struct SpyBot: Sendable, Equatable {
    public let id: String
    public let name: String
    public let skill: String
    public let flag: String
    public let accuracy: Double
    public let from: Double
    public let to: Double
}

public struct BotTurn: Sendable, Equatable {
    public let botId: String
    public let atMs: Int
    public let correct: Bool
}

public struct SpyTally: Sendable, Equatable {
    public var score = 0
    public var streak = 0

    public init(score: Int = 0, streak: Int = 0) {
        self.score = score
        self.streak = streak
    }
}

public enum ISpy {
    public static let roundSeconds = 12
    public static let rounds = 10
    public static let base = 100
    public static let speed = 100
    public static let streakStep = 25
    public static let streakCap = 4
    public static let arts = 7

    static func laid(_ ids: [String], _ seed: Int) -> [SpyObject] {
        ids.enumerated().map { i, id in
            let r = i / 5, c = i % 5
            let jitter = ((i * 37 + seed * 11) % 9) - 4
            let x = 11.0 + Double(c * 18) + (r % 2 == 1 ? 4 : 0) + Double(jitter) * 0.5
            let y = 11.0 + Double(r * 24) + Double(((i * 13 + seed) % 7) - 3) * 1.2
            return SpyObject(id: id, art: (i + seed) % arts, x: x, y: y, tilt: Double(((i * 29 + seed * 7) % 21) - 10) * 1.4)
        }
    }

    public static let decor = [
        SpyDecor(art: "calligraphy-ain", x: 2, y: 4, size: 26, tilt: -8), SpyDecor(art: "calligraphy-yong", x: 72, y: 56, size: 24, tilt: 9), SpyDecor(art: "script-ru", x: 84, y: 4, size: 12, tilt: 18),
        SpyDecor(art: "script-he", x: 46, y: 0, size: 10, tilt: -12), SpyDecor(art: "script-ko", x: 30, y: 84, size: 10, tilt: -6), SpyDecor(art: "girih", x: 56, y: 28, size: 22, tilt: 0),
        SpyDecor(art: "kente", x: -4, y: 90, size: 34, tilt: -3), SpyDecor(art: "azulejo", x: 90, y: 82, size: 14, tilt: 8), SpyDecor(art: "pebble", x: -2, y: 42, size: 7, tilt: 20), SpyDecor(art: "bunting", x: 18, y: -3, size: 22, tilt: 2),
    ]

    public static let scenes = [
        SpyScene(id: "market", name: "The market", objects: laid(["bread", "fish", "apple", "egg", "milk", "cheese", "meat", "rice", "orange", "chicken", "coffee", "tea", "salt", "wine", "money", "bag", "knife", "flower", "hundred", "cow"], 0), decor: decor),
        SpyScene(id: "street", name: "The street", objects: laid(["car", "dog", "cat", "house", "tree", "sun", "bird", "horse", "door", "window", "hat", "shoe", "key", "road", "stone", "child", "star", "moon", "city", "flower"], 3), decor: decor),
        SpyScene(id: "classroom", name: "The classroom", objects: laid(["book", "paper", "letter", "clock", "chair", "ball", "school", "one", "two", "three", "shirt", "apple", "child", "window", "door", "bag", "key", "water", "hundred", "hat"], 5), decor: decor),
        SpyScene(id: "harbor", name: "The harbor", objects: laid(["sea", "boat", "fish", "bird", "sun", "mountain", "river", "water", "stone", "fire", "star", "moon", "house", "tree", "dog", "bread", "wine", "money", "hat", "key"], 2), decor: decor),
    ]

    public static let bots = [
        SpyBot(id: "bot-ama", name: "Ama", skill: "hard", flag: "GH", accuracy: 0.85, from: 0.2, to: 0.55),
        SpyBot(id: "bot-ines", name: "Inês", skill: "medium", flag: "PT", accuracy: 0.65, from: 0.3, to: 0.75),
        SpyBot(id: "bot-kenji", name: "Kenji", skill: "easy", flag: "JP", accuracy: 0.45, from: 0.4, to: 0.95),
    ]

    public static let sets = [LangSet(id: "mix", label: "Chinese, Russian, Hindi, Spanish", targets: ["zh", "ru", "hi", "es"])] + LangSets.all

    public static func scene(_ id: String) -> SpyScene? { scenes.first { $0.id == id } }

    public static func hash(_ s: String) -> Int32 {
        var h: UInt32 = 2166136261
        for c in s.utf16 { h = (h ^ UInt32(c)) &* 16777619 }
        return Int32(bitPattern: h)
    }

    public static func unit(_ key: String) -> Double { Double(UInt32(bitPattern: hash(key))) / 4294967296.0 }

    public static func points(correct: Bool, ms: Int, roundSeconds: Int, streak: Int) -> Int {
        guard correct else { return 0 }
        let left = min(1, max(0, 1 - Double(ms) / Double(roundSeconds * 1000)))
        return base + jsRound(Double(speed) * left) + min(max(streak, 0), streakCap) * streakStep
    }

    public static func award(_ t: SpyTally, correct: Bool, ms: Int, roundSeconds: Int) -> (SpyTally, Int) {
        let p = points(correct: correct, ms: ms, roundSeconds: roundSeconds, streak: t.streak)
        return (SpyTally(score: t.score + p, streak: correct ? t.streak + 1 : 0), p)
    }

    public static func botTurns(seed: String, round: Int, roundSeconds: Int, bots: [SpyBot] = bots) -> [BotTurn] {
        let len = Double(roundSeconds * 1000)
        return bots.map { b in
            let key = "\(seed):\(round):\(b.id)"
            return BotTurn(botId: b.id, atMs: jsRound(len * (b.from + (b.to - b.from) * unit("at:\(key)"))), correct: unit("ok:\(key)") < b.accuracy)
        }
    }

    static func itemFor(_ items: [LangItem], _ id: String) -> LangItem? {
        items.first { $0.kind == .word && $0.id == id } ?? items.first { $0.kind == .word && $0.form("en") == id }
    }

    public static func rounds(_ items: [LangItem], seed: String, root: String, targets: [String], rounds: Int, sceneId: String? = nil) -> [SpyRound] {
        var rng = XorRng(hash(seed))
        let sc = sceneId.flatMap(scene) ?? scenes[Int((rng.next() * Double(scenes.count)).rounded(.down))]
        let choices = sc.objects.map(\.id)
        let langs = targets.filter { $0 != root }
        if langs.isEmpty { return [] }
        var seen = Set<String>()
        var ids = choices.filter { seen.insert($0).inserted }
        var i = ids.count - 1
        while i >= 1 {
            ids.swapAt(i, Int((rng.next() * Double(i + 1)).rounded(.down)))
            i -= 1
        }
        var out: [SpyRound] = []
        for id in ids {
            if out.count >= rounds { break }
            guard let item = itemFor(items, id) else { continue }
            let order = langs.indices.map { langs[(out.count + $0) % langs.count] }
            guard let lang = order.first(where: { item.form($0) != nil && item.form($0) != item.form(root) }) else { continue }
            out.append(SpyRound(round: out.count, scene: sc.id, lang: lang, itemId: item.id, gloss: item.form(lang)!, choices: choices, answer: id))
        }
        return out
    }
}
