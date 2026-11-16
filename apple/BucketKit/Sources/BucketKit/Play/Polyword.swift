import Foundation

public enum PolyMark: Int, Sendable, Comparable {
    case miss = 1, near, hit

    public static func < (a: PolyMark, b: PolyMark) -> Bool { a.rawValue < b.rawValue }
}

public struct Hint: Sendable, Equatable, Hashable {
    public let lang: String
    public let word: String
    public var roman: String?

    public init(lang: String, word: String, roman: String? = nil) {
        self.lang = lang
        self.word = word
        self.roman = roman
    }
}

public struct PolyPuzzle: Sendable, Equatable {
    public let lang: String
    public let day: Int
    public let slug: String
    public let word: String
    public let answer: String
    public let gloss: String
    public let roman: String?
    public let hints: [Hint]
}

public enum GuessCheck: Sendable, Equatable {
    case ok(String)
    case bad(String)
}

public struct PolyGame: Sendable, Equatable {
    public var guesses: [String]
    public var done: Bool
    public var won: Bool
    public var archive: Bool

    public init(guesses: [String], done: Bool, won: Bool, archive: Bool = false) {
        self.guesses = guesses
        self.done = done
        self.won = won
        self.archive = archive
    }
}

public struct PolyStats: Sendable, Equatable {
    public let played: Int
    public let won: Int
    public let streak: Int
    public let best: Int
    public let dist: [Int]
}

public struct PolyDate: Sendable, Equatable, Hashable {
    public let year: Int
    public let month: Int
    public let day: Int

    public init(_ year: Int, _ month: Int, _ day: Int) {
        self.year = year
        self.month = month
        self.day = day
    }

    var ordinal: Int {
        let y = month <= 2 ? year - 1 : year
        let era = (y >= 0 ? y : y - 399) / 400
        let yoe = y - era * 400
        let doy = (153 * (month + (month > 2 ? -3 : 9)) + 2) / 5 + day - 1
        return era * 146097 + yoe * 365 + yoe / 4 - yoe / 100 + doy
    }

    init(ordinal z0: Int) {
        let z = z0
        let era = (z >= 0 ? z : z - 146096) / 146097
        let doe = z - era * 146097
        let yoe = (doe - doe / 1460 + doe / 36524 - doe / 146096) / 365
        let doy = doe - (365 * yoe + yoe / 4 - yoe / 100)
        let mp = (5 * doy + 2) / 153
        let d = doy - (153 * mp + 2) / 5 + 1
        let m = mp < 10 ? mp + 3 : mp - 9
        self.init(yoe + era * 400 + (m <= 2 ? 1 : 0), m, d)
    }
}

public enum Polyword {
    public static let maxGuesses = 6
    public static let epoch = PolyDate(2026, 11, 1)

    public static func fold(_ raw: String) -> String {
        let kept = raw.decomposedStringWithCanonicalMapping.unicodeScalars.filter {
            switch $0.properties.generalCategory {
            case .nonspacingMark, .spacingMark, .enclosingMark: false
            default: true
            }
        }
        return String(String.UnicodeScalarView(kept)).lowercased()
    }

    static func isAsciiLower(_ s: String) -> Bool { s.unicodeScalars.allSatisfy { (97...122).contains($0.value) } }

    public static func playable(_ word: String) -> Bool {
        let f = fold(word)
        return !f.isEmpty && isAsciiLower(f) && (f.count == 5 || f.count == 6)
    }

    public static func dayNumber(_ date: PolyDate) -> Int { date.ordinal - epoch.ordinal + 1 }

    public static func dateOfDay(_ day: Int) -> PolyDate { PolyDate(ordinal: epoch.ordinal + day - 1) }

    public static func hintsFor(_ forms: [String: HintForm], lang: String, order: [String], count: Int = maxGuesses - 1) -> [Hint] {
        order.filter { $0 != lang && forms[$0] != nil }.prefix(count).map { l in Hint(lang: l, word: forms[l]!.word, roman: forms[l]!.roman) }
    }

    public static func puzzleFor(_ bank: PolywordBank, lang: String, day: Int) -> PolyPuzzle? {
        guard let list = bank.langs[lang], !list.isEmpty, day >= 1 else { return nil }
        let slug = list[(day - 1) % list.count]
        guard let entry = bank.words[slug], let form = entry.forms[lang] else { return nil }
        return PolyPuzzle(lang: lang, day: day, slug: slug, word: form.word, answer: fold(form.word), gloss: entry.gloss, roman: form.roman, hints: hintsFor(entry.forms, lang: lang, order: bank.reveal))
    }

    public static func meaningIn(_ bank: PolywordBank, slug: String, gloss: String, root: String) -> (lang: String, text: String) {
        if root != "en", let f = bank.words[slug]?.forms[root] { return (root, f.word) }
        return ("en", gloss)
    }

    public static func score(_ guess: String, _ answer: String) -> [PolyMark] {
        let g = Array(guess), a = Array(answer)
        var marks = Array(repeating: PolyMark.miss, count: a.count)
        var left: [Character: Int] = [:]
        for i in a.indices {
            if i < g.count && g[i] == a[i] { marks[i] = .hit } else { left[a[i], default: 0] += 1 }
        }
        for i in a.indices where marks[i] != .hit && i < g.count {
            let n = left[g[i]] ?? 0
            if n > 0 {
                marks[i] = .near
                left[g[i]] = n - 1
            }
        }
        return marks
    }

    public static func keyMarks(_ guesses: [String], _ answer: String) -> [Character: PolyMark] {
        var out: [Character: PolyMark] = [:]
        for g in guesses {
            let chars = Array(g)
            for (i, m) in score(g, answer).enumerated() where i < chars.count {
                if (out[chars[i]]?.rawValue ?? 0) < m.rawValue { out[chars[i]] = m }
            }
        }
        return out
    }

    public static func checkGuess(_ raw: String, answer: String, previous: [String]) -> GuessCheck {
        let guess = fold(raw.trimmingCharacters(in: .whitespacesAndNewlines))
        if !isAsciiLower(guess) { return .bad("letters") }
        if guess.count != answer.count { return .bad("short") }
        if previous.contains(guess) { return .bad("repeat") }
        return .ok(guess)
    }

    public static func solved(_ guesses: [String], _ answer: String) -> Bool { guesses.contains(answer) }

    public static func finished(_ guesses: [String], _ answer: String) -> Bool { solved(guesses, answer) || guesses.count >= maxGuesses }

    public static func revealedHints(_ hints: [Hint], answer: String, guesses: [String]) -> [Hint] {
        finished(guesses, answer) ? hints : Array(hints.prefix(guesses.filter { $0 != answer }.count))
    }

    public static func stats(_ games: [Int: PolyGame], today: Int) -> PolyStats {
        let daily = games.filter { $0.value.done && !$0.value.archive }
        var dist = Array(repeating: 0, count: maxGuesses)
        var won = 0
        for g in daily.values where g.won {
            won += 1
            dist[min(g.guesses.count, maxGuesses) - 1] += 1
        }
        let wins = Set(daily.filter { $0.value.won }.keys)
        var best = 0, run = 0
        for d in wins.sorted() {
            run = wins.contains(d - 1) ? run + 1 : 1
            best = max(best, run)
        }
        var streak = 0
        var cursor = wins.contains(today) ? today : games[today]?.done == true ? 0 : today - 1
        while cursor > 0 && wins.contains(cursor) {
            streak += 1
            cursor -= 1
        }
        return PolyStats(played: daily.count, won: won, streak: streak, best: best, dist: dist)
    }

    static let square: [PolyMark: String] = [.hit: "🟩", .near: "🟨", .miss: "⬜"]

    public static func shareText(lang: String, day: Int, answer: String, hints: [Hint], guesses: [String], url: String, flag: (String) -> String) -> String {
        let head = "Polyword \(flag(lang)) #\(day) \(solved(guesses, answer) ? String(guesses.count) : "X")/\(maxGuesses)"
        var miss = 0
        let rows = guesses.map { g -> String in
            let sq = score(g, answer).map { square[$0]! }.joined()
            if g == answer { return sq }
            defer { miss += 1 }
            return miss < hints.count ? "\(sq) \(flag(hints[miss].lang))" : sq
        }
        return ([head, ""] + rows + ["", url]).joined(separator: "\n")
    }
}
