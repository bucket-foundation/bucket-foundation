import Foundation
import NaturalLanguage

public struct LexEntry: Sendable, Equatable {
    public let word: String
    public let english: [String]
    public let gloss: String?
    public let lemma: String?
    public let roman: String?

    public var meaning: String? {
        if !english.isEmpty { return english.prefix(3).joined(separator: "; ") }
        return gloss
    }
}

public struct Lexicon: Sendable {
    public let lang: String
    let entries: [LexEntry]
    let exact: [String: [Int]]
    let loose: [String: [Int]]
    let fromEnglish: [String: [String]]
    let roman: [String: [Int]]

    public static let foldsMarks: Set<String> = ["en", "es", "fr", "it", "pt", "de", "nl", "sv", "pl", "fi", "tr", "cs", "id", "vi", "la", "ang", "ru", "el", "grc", "ar", "he", "fa"]

    public init(lang: String, tsv: String) {
        self.lang = lang
        var entries: [LexEntry] = []
        var exact: [String: [Int]] = [:]
        var loose: [String: [Int]] = [:]
        var fromEnglish: [String: [String]] = [:]
        var roman: [String: [Int]] = [:]
        let marks = Lexicon.foldsMarks.contains(lang)
        for line in tsv.split(separator: "\n", omittingEmptySubsequences: true) {
            let cols = line.split(separator: "\t", omittingEmptySubsequences: false).map(String.init)
            guard cols.count >= 2, !cols[0].isEmpty else { continue }
            if cols[0].hasPrefix("=") {
                fromEnglish[Lexicon.key(String(cols[0].dropFirst())), default: []].append(contentsOf: cols[1].split(separator: "|").map(String.init))
                continue
            }
            let entry: LexEntry
            if cols[1].hasPrefix(">") {
                entry = LexEntry(word: cols[0], english: [], gloss: nil, lemma: String(cols[1].dropFirst()), roman: nil)
            } else {
                let english = cols[1].split(separator: "|").map(String.init)
                let gloss = cols.count > 2 && !cols[2].isEmpty ? cols[2] : nil
                let rom = cols.count > 3 && !cols[3].isEmpty ? cols[3] : nil
                entry = LexEntry(word: cols[0], english: english, gloss: gloss, lemma: nil, roman: rom)
            }
            let i = entries.count
            entries.append(entry)
            exact[Lexicon.key(entry.word), default: []].append(i)
            if marks { loose[Lexicon.fold(entry.word), default: []].append(i) }
            if let r = entry.roman {
                for part in r.split(separator: ",") { roman[Lexicon.romanKey(String(part)), default: []].append(i) }
            }
        }
        self.entries = entries
        self.exact = exact
        self.loose = loose
        self.fromEnglish = fromEnglish
        self.roman = roman
    }

    public static func key(_ s: String) -> String {
        s.lowercased().trimmingCharacters(in: .whitespacesAndNewlines.union(.punctuationCharacters).union(.symbols))
            .replacingOccurrences(of: "’", with: "'")
            .replacingOccurrences(of: "ς", with: "σ")
    }

    static let clitics: [String: (prefixes: [String], suffixes: [String])] = [
        "ar": (["وبال", "وال", "بال", "فال", "كال", "لل", "ال", "و", "ف", "ب", "ل", "ك", "س"], ["هما", "كما", "ها", "هم", "هن", "كم", "نا", "ني", "ه", "ك", "ي", "ات", "ون", "ين", "ة"]),
        "he": (["וה", "שה", "וב", "ול", "ומ", "וש", "ה", "ו", "ב", "ל", "מ", "ש", "כ"], ["ים", "ות", "יך", "נו", "כם", "הם", "ה", "י", "ו"]),
        "fa": (["نمی", "می", "ن", "ب"], ["هایی", "هایم", "های", "ها", "ترین", "تر", "ام", "ات", "اش", "ای", "ی", "م", "د", "ند", "یم", "ید"]),
    ]

    func stripped(_ k: String) -> [String] {
        guard let rule = Lexicon.clitics[lang] else { return [] }
        var out: [String] = []
        let pres = [""] + rule.prefixes.filter { k.hasPrefix($0) }
        let sufs = [""] + rule.suffixes.filter { k.hasSuffix($0) }
        for p in pres {
            for s in sufs where !(p.isEmpty && s.isEmpty) {
                guard k.count - p.count - s.count >= 2 else { continue }
                let core = String(k.dropFirst(p.count).dropLast(s.count))
                out.append(core)
                if lang == "he" && s == "ות" { out.append(core + "ה") }
                if lang == "ar" && s == "ات" { out.append(core + "ة") }
            }
        }
        return out
    }

    public static func fold(_ s: String) -> String {
        key(s).folding(options: [.diacriticInsensitive, .widthInsensitive], locale: nil)
    }

    public static func romanKey(_ s: String) -> String {
        fold(s.applyingTransform(.toLatin, reverse: false) ?? s).filter { $0.isLetter }
    }

    public var count: Int { entries.count }

    func resolve(_ ids: [Int]) -> [LexEntry] {
        var out: [LexEntry] = []
        for i in ids {
            let e = entries[i]
            if let lemma = e.lemma {
                out += (exact[Lexicon.key(lemma)] ?? []).map { entries[$0] }.filter { $0.lemma == nil }
            } else {
                out.append(e)
            }
        }
        return out
    }

    public enum Match: Sendable, Equatable { case word, form, roman }

    public func lookup(_ query: String) -> (match: Match, entries: [LexEntry])? {
        let k = Lexicon.key(query)
        guard !k.isEmpty else { return nil }
        if let ids = exact[k] {
            let direct = ids.map { entries[$0] }.filter { $0.lemma == nil }
            if !direct.isEmpty { return (.word, direct) }
            let viaLemma = resolve(ids)
            if !viaLemma.isEmpty { return (.form, viaLemma) }
        }
        if Lexicon.foldsMarks.contains(lang), let ids = loose[Lexicon.fold(query)] {
            let hits = resolve(ids)
            if !hits.isEmpty { return (.form, hits) }
        }
        for core in stripped(k) {
            if let ids = exact[core] {
                let hits = resolve(ids)
                if !hits.isEmpty { return (.form, hits) }
            }
        }
        if let lemma = Lexicon.tagLemma(query, lang: lang), Lexicon.key(lemma) != k, let ids = exact[Lexicon.key(lemma)] {
            let hits = resolve(ids)
            if !hits.isEmpty { return (.form, hits) }
        }
        if !roman.isEmpty || !(Lang.info[lang]?.latin ?? true), query.unicodeScalars.allSatisfy({ $0.isASCII }) {
            if let hits = romanLookup(query), !hits.isEmpty { return (.roman, hits) }
        }
        return nil
    }

    func romanLookup(_ query: String) -> [LexEntry]? {
        var q = query.lowercased()
        if lang == "ja" {
            q = q.replacingOccurrences(of: "nn", with: "n'")
            if let kana = q.applyingTransform(.latinToHiragana, reverse: false), let ids = exact[Lexicon.key(kana)] { return resolve(ids) }
        }
        let rk = Lexicon.romanKey(q)
        guard rk.count >= 2 else { return nil }
        if let ids = roman[rk] { return resolve(ids) }
        return nil
    }

    public func words(forEnglish english: String) -> [String] {
        let k = Lexicon.key(english)
        if let hit = fromEnglish[k] { return hit }
        if k.hasPrefix("to "), let hit = fromEnglish[String(k.dropFirst(3))] { return hit }
        return []
    }

    static let lemmaLangs: Set<String> = ["en", "fr", "it", "de"]

    static func tagLemma(_ word: String, lang: String) -> String? {
        guard lemmaLangs.contains(lang), !word.contains(" ") else { return nil }
        let tagger = NLTagger(tagSchemes: [.lemma])
        tagger.string = word
        tagger.setLanguage(NLLanguage(rawValue: lang), range: word.startIndex..<word.endIndex)
        return tagger.tag(at: word.startIndex, unit: .word, scheme: .lemma).0?.rawValue
    }
}

public final class LexiconShelf: @unchecked Sendable {
    private let lock = NSLock()
    private var cache: [String: Lexicon] = [:]
    private var missing: Set<String> = []
    let load: @Sendable (String) -> Data?

    public init(load: @escaping @Sendable (String) -> Data? = LexiconShelf.bundled) {
        self.load = load
    }

    public static let bundled: @Sendable (String) -> Data? = { lang in
        Bundle.main.url(forResource: lang, withExtension: "tsv.z", subdirectory: "Corpus/lexicon").flatMap { try? Data(contentsOf: $0) }
    }

    public static func directory(_ dir: URL) -> @Sendable (String) -> Data? {
        { lang in try? Data(contentsOf: dir.appending(path: "\(lang).tsv.z")) }
    }

    static func inflate(_ data: Data) -> Data? {
        try? (data as NSData).decompressed(using: .zlib) as Data
    }

    public func lexicon(_ lang: String) -> Lexicon? {
        if let hit = lock.withLock({ cache[lang] }) { return hit }
        if lock.withLock({ missing.contains(lang) }) { return nil }
        guard let packed = load(lang), let data = LexiconShelf.inflate(packed), let text = String(data: data, encoding: .utf8) else {
            lock.withLock { _ = missing.insert(lang) }
            return nil
        }
        let lex = Lexicon(lang: lang, tsv: text)
        lock.withLock { cache[lang] = lex }
        return lex
    }
}
