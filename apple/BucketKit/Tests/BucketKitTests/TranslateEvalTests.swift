import Foundation
import Testing
@testable import BucketKit

struct EvalScore {
    var asked = 0
    var answered = 0
    var judged = 0
    var right = 0

    mutating func add(_ answer: String?, _ ok: (String) -> Bool?) {
        asked += 1
        guard let answer, !answer.isEmpty else { return }
        answered += 1
        guard let verdict = ok(answer) else { return }
        judged += 1
        if verdict { right += 1 }
    }

    var cell: String {
        guard asked > 0 else { return "  -   /  -  " }
        let cov = Double(answered) / Double(asked) * 100
        let prec = judged > 0 ? Double(right) / Double(judged) * 100 : 0
        return String(format: "%5.1f / %5.1f", cov, prec)
    }
}

enum EvalMatch {
    static func norm(_ s: String) -> String {
        var t = s.lowercased()
        t = t.replacingOccurrences(of: #"\([^)]*\)"#, with: " ", options: .regularExpression)
        t = t.replacingOccurrences(of: #"[^\p{L}\p{N}' ]"#, with: " ", options: .regularExpression)
        var words = t.split(separator: " ").map(String.init)
        while let f = words.first, ["to", "a", "an", "the"].contains(f), words.count > 1 { words.removeFirst() }
        return words.joined(separator: " ")
    }

    static func senses(_ s: String) -> [String] {
        s.split(whereSeparator: { ";,/·".contains($0) }).map { norm(String($0)) }.filter { !$0.isEmpty }
    }

    static func englishWord(_ answer: String, _ refs: [String]) -> Bool? {
        let r = Set(refs.flatMap(senses))
        guard !r.isEmpty else { return nil }
        let a = senses(answer)
        if a.contains(where: r.contains) { return true }
        let tokens = Set(a.flatMap { $0.split(separator: " ").map(String.init) })
        return r.contains { !$0.contains(" ") && tokens.contains($0) }
    }

    static func targetWord(_ answer: String, _ refs: [String]) -> Bool? {
        guard !refs.isEmpty else { return nil }
        let r = Set(refs.map(Lexicon.fold))
        return answer.split(separator: ",").contains { r.contains(Lexicon.fold(String($0))) }
    }

    static func units(_ s: String, _ lang: String) -> [String] {
        if ["ja", "zh", "th"].contains(lang) { return s.filter { $0.isLetter || $0.isNumber }.map(String.init) }
        return norm(s).split(separator: " ").map(String.init)
    }

    static func f1(_ a: [String], _ b: [String]) -> Double {
        guard !a.isEmpty, !b.isEmpty else { return 0 }
        var pool = b
        var hit = 0
        for x in a { if let i = pool.firstIndex(of: x) { hit += 1; pool.remove(at: i) } }
        let p = Double(hit) / Double(a.count), r = Double(hit) / Double(b.count)
        return p + r == 0 ? 0 : 2 * p * r / (p + r)
    }

    static func sentence(_ answer: String, _ refs: [String], _ lang: String) -> Bool? {
        guard !refs.isEmpty else { return nil }
        return f1(units(answer, lang), units(refs[0], lang)) >= 0.5
    }

    static func stem(_ w: String) -> String {
        for suffix in ["ing", "ed", "es", "s"] where w.count > suffix.count + 2 && w.hasSuffix(suffix) { return String(w.dropLast(suffix.count)) }
        return w
    }

    static func aligned(_ answer: String, _ refs: [String]) -> Bool? {
        guard !refs.isEmpty else { return nil }
        let r = Set(refs.map { stem($0.lowercased()) })
        let tokens = senses(answer).flatMap { $0.split(separator: " ").map { stem(String($0)) } }
        return tokens.contains(where: r.contains)
    }
}

struct EvalSet: Decodable {
    let words: [[Entry]]?
    let tail: [[Entry]]?
    let phrases: [[Entry]]?
    let sentences: [[Entry]]?
    let aligned: [[Entry]]?

    enum Entry: Decodable {
        case text(String), list([String]), map([String: [String]])
        init(from decoder: Decoder) throws {
            let c = try decoder.singleValueContainer()
            if let s = try? c.decode(String.self) { self = .text(s) }
            else if let l = try? c.decode([String].self) { self = .list(l) }
            else { self = .map(try c.decode([String: [String]].self)) }
        }
        var text: String { if case .text(let s) = self { return s }; return "" }
        var list: [String] { if case .list(let l) = self { return l }; if case .text(let s) = self { return [s] }; return [] }
        var map: [String: [String]] { if case .map(let m) = self { return m }; return [:] }
    }
}

enum TranslateEval {
    static let apple: URL = URL(fileURLWithPath: #filePath).deletingLastPathComponent().deletingLastPathComponent().deletingLastPathComponent().deletingLastPathComponent()
    static let langs = Lang.codes.filter { $0 != "en" }

    static func corpus() throws -> LangCorpus {
        let dir = apple.appending(path: "Shared/Corpus")
        func f(_ n: String) throws -> JSValue { try JSON.parse(Data(contentsOf: dir.appending(path: n))) }
        return buildLangCorpus(core: try f("lang-core.json"), cognates: try f("lang-cognates.json"), phrases: try f("lang-phrases.json"), layers: try f("lang-layers.json"))
    }

    static func set(_ lang: String) -> EvalSet? {
        guard let url = Bundle.module.url(forResource: lang, withExtension: "json", subdirectory: "Fixtures/translate-eval"), let d = try? Data(contentsOf: url) else { return nil }
        return try? JSONDecoder().decode(EvalSet.self, from: d)
    }

    static func baseline(_ q: String, from: String, to: String, corpus: LangCorpus, wordMode: Bool) -> String? {
        let hits = translateSearch(corpus, q, langs: [from], limit: 6)
        let sentence = hits.first?.exact != true && (SentenceLanguage.isSentence(q) || hits.isEmpty)
        if sentence && !wordMode { return nil }
        guard let id = hits.first?.itemId, let item = corpus.byId[id] else { return nil }
        if to == "en" { return item.form("en") ?? item.gloss }
        return item.form(to)
    }

    static func current(_ q: String, from: String, to: String, corpus: LangCorpus, shelf: LexiconShelf) -> String? {
        TranslateEngine.answer(q, from: [from], to: [to], corpus: corpus, shelf: shelf)?.rows[to]
    }

    static func run(mode: String) throws -> String {
        let corpus = try corpus()
        let shelf = LexiconShelf(capacity: 64, load: LexiconShelf.directory(apple.appending(path: "Shared/Corpus/lexicon")))
        let ask: (String, String, String, Bool) -> String? = { q, from, to, word in
            mode == "baseline" ? baseline(q, from: from, to: to, corpus: corpus, wordMode: word) : current(q, from: from, to: to, corpus: corpus, shelf: shelf)
        }
        var lines = ["lang  | wiktionary word | tail word     | tatoeba word  | phrase        | sentence"]
        var total = [EvalScore](repeating: EvalScore(), count: 5)
        for lang in langs {
            guard let set = set(lang) else { continue }
            var s = [EvalScore](repeating: EvalScore(), count: 5)
            for row in set.words ?? [] { s[0].add(ask(row[0].text, lang, "en", true)) { EvalMatch.englishWord($0, row[1].list) } }
            for row in set.tail ?? [] { s[1].add(ask(row[0].text, lang, "en", true)) { EvalMatch.englishWord($0, row[1].list) } }
            for row in set.aligned ?? [] { s[2].add(ask(row[0].text, lang, "en", true)) { EvalMatch.aligned($0, row[1].list) } }
            for row in set.phrases ?? [] { s[3].add(ask(row[0].text, lang, "en", false)) { EvalMatch.sentence($0, row[1].list, "en") } }
            for row in set.sentences ?? [] { s[4].add(ask(row[0].text, lang, "en", false)) { EvalMatch.sentence($0, row[1].list, "en") } }
            for i in 0..<5 { total[i].asked += s[i].asked; total[i].answered += s[i].answered; total[i].judged += s[i].judged; total[i].right += s[i].right }
            lines.append("\(lang.padding(toLength: 5, withPad: " ", startingAt: 0)) | \(s.map(\.cell).joined(separator: " | "))")
        }
        if let en = set("en") {
            var s = [EvalScore](repeating: EvalScore(), count: 5)
            for row in en.words ?? [] {
                for (lang, refs) in row[1].map where langs.contains(lang) { s[0].add(ask(row[0].text, "en", lang, true)) { EvalMatch.targetWord($0, refs) } }
            }
            for row in en.phrases ?? [] { s[3].add(ask(row[0].text, "en", row[1].text, false)) { EvalMatch.sentence($0, [row[2].text], row[1].text) } }
            for row in en.sentences ?? [] { s[4].add(ask(row[0].text, "en", row[1].text, false)) { EvalMatch.sentence($0, [row[2].text], row[1].text) } }
            lines.append("en→L  | \(s.map(\.cell).joined(separator: " | "))")
        }
        lines.append("all L | \(total.map(\.cell).joined(separator: " | "))")
        return lines.joined(separator: "\n")
    }
}

@Test(.enabled(if: ProcessInfo.processInfo.environment["TRANSLATE_EVAL"] != nil))
func translateEvalReport() throws {
    let mode = ProcessInfo.processInfo.environment["TRANSLATE_EVAL"] ?? "current"
    let report = try TranslateEval.run(mode: mode)
    print("TRANSLATE_EVAL \(mode)\n\(report)")
    if let out = ProcessInfo.processInfo.environment["TRANSLATE_EVAL_OUT"] { try report.write(toFile: out, atomically: true, encoding: .utf8) }
}

@Test func translateMeetsCoverageAndPrecisionFloors() throws {
    let shelf = LexiconShelf(load: LexiconShelf.directory(TranslateEval.apple.appending(path: "Shared/Corpus/lexicon")))
    for lang in ["es", "ru", "ja", "ar"] {
        let set = try #require(TranslateEval.set(lang))
        var wiki = EvalScore(), tatoeba = EvalScore()
        for row in (set.words ?? []).prefix(150) {
            wiki.add(TranslateEngine.answer(row[0].text, from: [lang], to: ["en"], corpus: nil, shelf: shelf)?.rows["en"]) { EvalMatch.englishWord($0, row[1].list) }
        }
        for row in (set.aligned ?? []).prefix(100) {
            tatoeba.add(TranslateEngine.answer(row[0].text, from: [lang], to: ["en"], corpus: nil, shelf: shelf)?.rows["en"]) { EvalMatch.aligned($0, row[1].list) }
        }
        #expect(Double(wiki.answered) / Double(wiki.asked) >= 0.95, "\(lang) word coverage")
        #expect(Double(wiki.right) / Double(max(wiki.judged, 1)) >= 0.9, "\(lang) word precision")
        #expect(Double(tatoeba.answered) / Double(max(tatoeba.asked, 1)) >= 0.9, "\(lang) tatoeba coverage")
        #expect(Double(tatoeba.right) / Double(max(tatoeba.judged, 1)) >= 0.5, "\(lang) tatoeba precision")
    }
}
