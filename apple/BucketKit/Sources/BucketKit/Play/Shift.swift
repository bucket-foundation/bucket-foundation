import Foundation

public struct ShiftTarget: Sendable, Equatable, Hashable {
    public let lang: String
    public let form: String
    public let meaning: String

    public init(lang: String, form: String, meaning: String) {
        self.lang = lang
        self.form = form
        self.meaning = meaning
    }
}

public struct ShiftBoard: Sendable, Equatable {
    public let date: String
    public let langs: [String]
    public let length: Int
    public let columns: [[String]]
    public let targets: [ShiftTarget]
    public let valid: [String: [String]]
}

public enum Shift {
    public static let langs = ["es", "fr", "it", "pt", "de", "nl", "sv"]
    public static let length = 4
    public static let perLang = 3

    public static func letters(_ s: String) -> [String] { s.unicodeScalars.map { String($0) } }

    public static func clean(_ form: String?, _ length: Int) -> String? {
        guard let form else { return nil }
        let f = form.precomposedStringWithCanonicalMapping.lowercased()
        let ls = letters(f)
        guard ls.count == length, f.unicodeScalars.allSatisfy({ $0.properties.generalCategory == .lowercaseLetter }) else { return nil }
        return f
    }

    public static func spellable(_ word: String, _ columns: [[String]]) -> Bool {
        let l = letters(word)
        return l.count == columns.count && l.enumerated().allSatisfy { columns[$0.offset].contains($0.element) }
    }

    public static func centerWord(_ columns: [[String]], _ offsets: [Int]) -> String {
        columns.enumerated().map { i, col in col[((offsets[i] % col.count) + col.count) % col.count] }.joined()
    }

    public static func rotate(_ offsets: [Int], column: Int, by: Int) -> [Int] { offsets.enumerated().map { $0.offset == column ? $0.element + by : $0.element } }

    public static func hintFor(_ target: String, revealed: Int) -> String {
        letters(target).enumerated().map { $0.offset < revealed ? $0.element : "_" }.joined(separator: " ")
    }

    public static func board(_ items: [LangItem], date: String, root: String = "en", length: Int = length) -> ShiftBoard? {
        var rand = WebRandom(WebRandom.seedOf("shift:\(date)"))
        let words = items.filter { $0.kind == .word && $0.form(root) != nil }
        let all = langs.enumerated().flatMap { i, a in langs.dropFirst(i + 1).map { [a, $0] } }
        for pair in rand.shuffled(all) {
            var targets: [ShiftTarget] = []
            var seen = Set<String>()
            for lang in pair {
                let pool = rand.shuffled(words.filter { clean($0.form(lang), length) != nil })
                for w in pool {
                    if targets.filter({ $0.lang == lang }).count >= perLang { break }
                    let f = clean(w.form(lang), length)!
                    guard seen.insert(f).inserted else { continue }
                    targets.append(ShiftTarget(lang: lang, form: f, meaning: w.form(root)!))
                }
            }
            if targets.count < perLang * 2 { continue }
            var columns: [[String]] = []
            for i in 0..<length {
                var s = Set<String>()
                columns.append(rand.shuffled(targets.map { letters($0.form)[i] }.filter { s.insert($0).inserted }))
            }
            var valid: [String: [String]] = [:]
            for w in words {
                for lang in pair {
                    if let f = clean(w.form(lang), length), spellable(f, columns), !(valid[f]?.contains(lang) ?? false) { valid[f, default: []].append(lang) }
                }
            }
            return ShiftBoard(date: date, langs: pair, length: length, columns: columns, targets: targets, valid: valid)
        }
        return nil
    }
}
