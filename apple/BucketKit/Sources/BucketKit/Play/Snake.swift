import Foundation

public struct Pt: Sendable, Equatable, Hashable {
    public let x: Double
    public let y: Double

    public init(_ x: Double, _ y: Double) {
        self.x = x
        self.y = y
    }
}

public struct SnakeWord: Sendable, Equatable, Hashable {
    public let form: String
    public let lang: String
    public let meaning: String

    public init(form: String, lang: String, meaning: String) {
        self.form = form
        self.lang = lang
        self.meaning = meaning
    }
}

public struct SnakeDeck: Sendable, Equatable {
    public let lang: String
    public let good: [SnakeWord]
    public let decoys: [SnakeWord]

    public init(lang: String, good: [SnakeWord], decoys: [SnakeWord]) {
        self.lang = lang
        self.good = good
        self.decoys = decoys
    }
}

public struct Snake: Sendable, Equatable {
    public let id: String
    public let name: String
    public let bot: Bool
    public let skill: Double
    public var angle: Double
    public var body: [Pt]
    public var length: Int
    public var alive: Bool
    public let color: Int
}

public struct FieldWord: Sendable, Equatable, Hashable {
    public let id: Int
    public let x: Double
    public let y: Double
    public let form: String
    public let lang: String
    public let meaning: String
    public let good: Bool

    public init(id: Int, x: Double, y: Double, form: String, lang: String, meaning: String, good: Bool) {
        self.id = id
        self.x = x
        self.y = y
        self.form = form
        self.lang = lang
        self.meaning = meaning
        self.good = good
    }
}

public struct Arena: Sendable, Equatable {
    public var snakes: [Snake]
    public var words: [FieldWord]
    public var nextWord: Int
    public var eaten: [FieldWord]
    public var bad: [FieldWord]

    public init(snakes: [Snake], words: [FieldWord], nextWord: Int, eaten: [FieldWord] = [], bad: [FieldWord] = []) {
        self.snakes = snakes
        self.words = words
        self.nextWord = nextWord
        self.eaten = eaten
        self.bad = bad
    }
}

public struct Collision: Sendable, Equatable {
    public let arena: Arena
    public let died: [String]
}

public enum Snakes {
    public static let worldW = 1600.0
    public static let worldH = 1000.0
    public static let speed = 140.0
    public static let turn = 3.2
    public static let seg = 9.0
    public static let startLen = 8
    public static let minLen = 4
    public static let grow = 3
    public static let shrink = 3
    public static let eatR = 26.0
    public static let hitR = 10.0
    public static let wordsOnField = 18
    public static let goodShare = 0.55
    public static let botMax = 30
    public static let roundMs = 120_000
    public static let skill = ["easy": 0.55, "medium": 0.8, "hard": 0.95]
    public static let langChoices = ["es", "fr", "it", "pt", "de", "nl", "sv", "ja", "zh", "ko", "ru", "el", "ar", "hi", "tr"]

    public static func deck(_ items: [LangItem], lang: String, others: [String], seed: String) -> SnakeDeck {
        let good = ForeheadDeck.deck(items, langs: [lang], seed: seed, root: "en", size: 80).map { SnakeWord(form: $0.form, lang: $0.lang, meaning: $0.meaning) }
        let forms = Set(good.map { $0.form.lowercased() })
        let decoys = ForeheadDeck.deck(items, langs: others.filter { $0 != lang }, seed: "\(seed)1", root: "en", size: 80)
            .filter { !forms.contains($0.form.lowercased()) }.map { SnakeWord(form: $0.form, lang: $0.lang, meaning: $0.meaning) }
        return SnakeDeck(lang: lang, good: good, decoys: decoys)
    }

    public static func make(id: String, name: String, bot: Bool, skill: Double, at: Pt, angle: Double, color: Int) -> Snake {
        Snake(id: id, name: name, bot: bot, skill: skill, angle: angle, body: (0..<startLen).map { i in Pt(at.x - cos(angle) * seg * Double(i), at.y - sin(angle) * seg * Double(i)) }, length: startLen, alive: true, color: color)
    }

    public static func dist(_ a: Pt, _ b: Pt) -> Double { hypot(a.x - b.x, a.y - b.y) }

    public static func wrapAngle(_ a0: Double) -> Double {
        var a = a0
        while a > .pi { a -= 2 * .pi }
        while a < -.pi { a += 2 * .pi }
        return a
    }

    public static func steer(_ current: Double, _ target: Double, _ dt: Double) -> Double {
        let d = wrapAngle(target - current)
        let m = turn * dt
        return wrapAngle(current + min(max(d, -m), m))
    }

    public static func advance(_ s: Snake, target: Double, dt: Double) -> Snake {
        guard s.alive else { return s }
        let angle = steer(s.angle, target, dt)
        let head = s.body[0]
        var x = head.x + cos(angle) * speed * dt
        var y = head.y + sin(angle) * speed * dt
        var a = angle
        if x < 0 || x > worldW {
            x = min(max(x, 0), worldW)
            a = wrapAngle(.pi - a)
        }
        if y < 0 || y > worldH {
            y = min(max(y, 0), worldH)
            a = wrapAngle(-a)
        }
        let body = [Pt(x, y)] + s.body
        var out = [body[0]]
        var i = 1
        while i < body.count && out.count < s.length {
            if dist(out.last!, body[i]) >= seg || i == body.count - 1 { out.append(body[i]) }
            i += 1
        }
        var n = s
        n.angle = a
        n.body = out
        return n
    }

    public static func spawnWord(_ nextWord: Int, good: Bool, deck: SnakeDeck, rand: () -> Double) -> FieldWord {
        let list = good ? deck.good : deck.decoys
        let w = list[Int((rand() * Double(list.count)).rounded(.down))]
        let x = 60 + rand() * (worldW - 120)
        let y = 60 + rand() * (worldH - 120)
        return FieldWord(id: nextWord, x: x, y: y, form: w.form, lang: w.lang, meaning: w.meaning, good: good)
    }

    public static func botTarget(_ s: Snake, words: [FieldWord], rand: () -> Double) -> Double {
        let head = s.body[0]
        let options = words.filter { $0.good || rand() > s.skill }
        guard let best = options.min(by: { dist(head, Pt($0.x, $0.y)) < dist(head, Pt($1.x, $1.y)) }) else { return s.angle }
        return atan2(best.y - head.y, best.x - head.x)
    }

    public static func eat(_ arena: Arena, deck: SnakeDeck, rand: () -> Double) -> Arena {
        var words = arena.words
        var nextWord = arena.nextWord
        var eaten = arena.eaten
        var bad = arena.bad
        let snakes = arena.snakes.map { s -> Snake in
            guard s.alive else { return s }
            var length = s.length
            words = words.filter { w in
                if dist(s.body[0], Pt(w.x, w.y)) > eatR { return true }
                length = w.good ? length + grow : max(minLen, length - shrink)
                if !s.bot {
                    if w.good { eaten.append(w) } else { bad.append(w) }
                }
                return false
            }
            var n = s
            n.length = s.bot ? min(botMax, length) : length
            return n
        }
        while words.count < wordsOnField {
            words.append(spawnWord(nextWord, good: rand() < goodShare, deck: deck, rand: rand))
            nextWord += 1
        }
        return Arena(snakes: snakes, words: words, nextWord: nextWord, eaten: eaten, bad: bad)
    }

    public static func collide(_ arena: Arena) -> Collision {
        var died: [String] = []
        let snakes = arena.snakes.map { s -> Snake in
            guard s.alive else { return s }
            for o in arena.snakes where o.id != s.id && o.alive {
                if o.body.contains(where: { dist(s.body[0], $0) < hitR }) && s.length <= o.length {
                    died.append(s.id)
                    var n = s
                    n.alive = false
                    return n
                }
            }
            return s
        }
        var a = arena
        a.snakes = snakes
        return Collision(arena: a, died: died)
    }
}
