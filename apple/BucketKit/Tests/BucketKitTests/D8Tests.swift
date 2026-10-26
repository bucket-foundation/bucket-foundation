import Foundation
import Testing
@testable import BucketKit

@Test func everyLanguageHasAFlagWithoutEmoji() {
    for code in Lang.codes {
        let flag = D8Flag.table[code]
        #expect(flag != nil, "missing flag for \(code)")
        if let glyph = flag?.emblem?.glyph {
            #expect(!glyph.unicodeScalars.contains { $0.properties.isEmojiPresentation }, "emoji emblem for \(code)")
        }
    }
}

@Test func tileFitRules() {
    #expect(!D8Fit.long("siete"))
    #expect(D8Fit.long("embarazada"))
    #expect(!D8Fit.wide("embarazada"))
    #expect(D8Fit.wide("Geschwindigkeitsbegrenzung"))
    #expect(D8Fit.wide("¿Dónde está?"))
}

@Test func translateOptionsComeFromTheOtherLanguages() throws {
    let corpus = buildLangCorpus(core: try langFixture("core"), cognates: try langFixture("cognates"), phrases: try langFixture("phrases"), layers: try langFixture("layers"))
    let system = try createSystem("en", ["fr", "es", "it"], [], now: 0)
    let item = try #require(corpus.items.first { it in Set(["fr", "es", "it"].compactMap { it.form($0) }).count == 3 })
    var ex = Exercise(kind: .choose, itemId: item.id, lang: "es", root: "en", prompt: item.form("en") ?? "", promptLang: "en", answer: item.form("es")!, answerLang: "es")
    ex.options = [item.form("es")!, "uno", "dos", "tres"]
    var rng = Rng(seed: 7)
    let out = crossLanguageOptions(ex, item, system, &rng)
    let options = try #require(out.options)
    #expect(options.count == 4)
    #expect(Set(options).count == 4)
    #expect(options.contains(item.form("es")!))
    #expect(options.contains(item.form("fr")!))
    #expect(options.contains(item.form("it")!))
    #expect(out.optionLangs?[item.form("fr")!] == "fr")
    #expect(out.optionLangs?[item.form("es")!] == "es")
}

@Test func singleLanguageSystemsKeepSameLanguageOptions() throws {
    let corpus = buildLangCorpus(core: try langFixture("core"), cognates: try langFixture("cognates"), phrases: try langFixture("phrases"), layers: try langFixture("layers"))
    let system = try createSystem("en", ["es"], [], now: 0)
    let item = try #require(corpus.items.first { $0.form("es") != nil })
    var ex = Exercise(kind: .choose, itemId: item.id, lang: "es", root: "en", prompt: "x", promptLang: "en", answer: item.form("es")!, answerLang: "es")
    ex.options = [item.form("es")!, "uno", "dos", "tres"]
    var rng = Rng(seed: 7)
    let out = crossLanguageOptions(ex, item, system, &rng)
    #expect(out.options == ex.options)
    #expect(out.optionLangs == nil)
}

@Test func italianAndFrenchArticlesFollowTheNoun() {
    #expect(Lang.contextualArticle("it", "m", "zero") == "lo")
    #expect(Lang.contextualArticle("it", "m", "studente") == "lo")
    #expect(Lang.contextualArticle("it", "m", "gnomo") == "lo")
    #expect(Lang.contextualArticle("it", "m", "amico") == "l'")
    #expect(Lang.contextualArticle("it", "f", "acqua") == "l'")
    #expect(Lang.contextualArticle("it", "m", "libro") == nil)
    #expect(Lang.contextualArticle("it", "m", "sole") == nil)
    #expect(Lang.contextualArticle("fr", "f", "eau") == "l'")
    #expect(Lang.contextualArticle("es", "f", "agua") == "el")
    #expect(Lang.contextualArticle("es", "f", "casa") == nil)
}

@Test func articleWordMatchesTheWebEngine() {
    #expect(Lang.articleWord("it", "m", "libro") == "il")
    #expect(Lang.articleWord("it", "m", "zero") == "lo")
    #expect(Lang.articleWord("it", "f", "acqua") == "l'")
    #expect(Lang.articleWord("it", "m", "hotel") == "il")
    #expect(Lang.articleWord("fr", "m", "homme") == "l'")
    #expect(Lang.articleWord("fr", "m", "haricot") == "le")
    #expect(Lang.articleWord("es", "f", "agua") == "el")
    #expect(Lang.articleWord("de", "f", "Kirche") == "die")
    #expect(Lang.articleWord("en", "m", "x") == nil)
}

@Test func flagMissCountersSurviveAReload() {
    var st = EngineState()
    st = FlagMisses.recording(st, "fr")
    st = FlagMisses.recording(st, "fr")
    st = FlagMisses.recording(st, "it")
    let reloaded = EngineState(js: st.js)
    #expect(FlagMisses.count(reloaded, "fr") == 2)
    #expect(FlagMisses.count(reloaded, "it") == 1)
    #expect(FlagMisses.count(reloaded, "es") == 0)
}

@Test func namelessFlagMissLeavesTheWordUnratedAndCounts() {
    let pairs = [LangWord(lang: "fr", word: "nuit"), LangWord(lang: "es", word: "noche"), LangWord(lang: "it", word: "notte")]
    var st = EngineState()
    for _ in 0..<FlagMisses.hitsToHideName { st = FlagMisses.recordingHit(st, "it") }
    #expect(!FlagMisses.showsName(st, "it") && FlagMisses.showsName(st, "fr"))
    let out = FlagMisses.gradeMatch(pairs, ["fr": "it", "it": "fr", "es": "es"], st)
    #expect(out.ratings.first { $0.lang == "fr" }?.rating == nil)
    #expect(out.ratings.first { $0.lang == "it" }?.rating == 1)
    #expect(out.ratings.first { $0.lang == "es" }?.rating == 3)
    #expect(FlagMisses.count(out.state, "it") == 1)
    #expect(FlagMisses.showsName(out.state, "it"))
}

@Test func namedFlagsGradeLikeGradeMatch() {
    let pairs = [LangWord(lang: "fr", word: "nuit"), LangWord(lang: "es", word: "noche"), LangWord(lang: "it", word: "notte")]
    for assign in [["fr": "fr", "es": "es", "it": "it"], ["fr": "es", "es": "fr", "it": "it"], ["fr": "it", "es": "fr", "it": "es"]] {
        let plain = gradeMatch(pairs, assign).map { $0.correct ? 3 : 1 }
        let flags = FlagMisses.gradeMatch(pairs, assign, EngineState()).ratings.map { $0.rating }
        #expect(flags == plain.map { Optional($0) })
    }
}

@Test func flagMatchGradingMatchesTheWebGolden() throws {
    struct Case: Decodable {
        let name: String
        let hits: [String: Int]
        let misses: [String: Int]
        let assign: [String: String]
    }
    func fixture(_ name: String) throws -> Data {
        let url = try #require(Bundle.module.url(forResource: name, withExtension: "json", subdirectory: "Fixtures/lang"))
        return try Data(contentsOf: url)
    }
    let cases = try JSONDecoder().decode([Case].self, from: fixture("flag-match-cases"))
    let golden = try JSONDecoder().decode([[String]].self, from: fixture("flag-match-golden"))
    #expect(cases.count == golden.count)
    let langs = ["fr", "es", "it"]
    let pairs = langs.map { LangWord(lang: $0, word: "w-\($0)") }
    func table(_ m: [String: Int]) -> JSValue { .object(JSObject(m.sorted { $0.key < $1.key }.map { ($0.key, .number(Double($0.value))) })) }
    func render(_ v: JSValue?) -> String {
        guard let o = v?.object else { return "" }
        return o.keys.sorted().map { "\($0)=\(Int(o[$0]?.number ?? 0))" }.joined(separator: ",")
    }
    for (c, want) in zip(cases, golden) {
        var st = EngineState()
        if !c.hits.isEmpty { st.settingsExtra["flagHits"] = table(c.hits) }
        if !c.misses.isEmpty { st.settingsExtra["flagMisses"] = table(c.misses) }
        let out = FlagMisses.gradeMatch(pairs, c.assign, st)
        let ratings = langs.map { l in "\(l)=\(out.ratings.first { $0.lang == l }?.rating.map(String.init) ?? "none")" }.joined(separator: ",")
        let shows = langs.map { "\($0)=\(FlagMisses.showsName(out.state, $0))" }.joined(separator: ",")
        let got = [c.name, ratings, render(out.state.settingsExtra["flagHits"]), render(out.state.settingsExtra["flagMisses"]), shows]
        #expect(got == want, "\(c.name)")
    }
}

@Test func flagCountersFromTwoDevicesBothSurviveTheMerge() {
    var phone = EngineState()
    phone = FlagMisses.recordingHit(phone, "fr")
    phone = FlagMisses.recordingHit(phone, "fr")
    phone = FlagMisses.recording(phone, "it")
    var ipad = EngineState()
    ipad = FlagMisses.recordingHit(ipad, "es")
    ipad = FlagMisses.recordingHit(ipad, "fr")
    ipad = FlagMisses.recording(ipad, "de")
    for merged in [mergeState(phone, ipad), mergeState(ipad, phone)] {
        #expect(FlagMisses.hits(merged, "fr") == 2)
        #expect(FlagMisses.hits(merged, "es") == 1)
        #expect(FlagMisses.count(merged, "it") == 1)
        #expect(FlagMisses.count(merged, "de") == 1)
    }
    let roundTrip = mergeState(EngineState(js: phone.js), EngineState(js: ipad.js))
    #expect(FlagMisses.hits(roundTrip, "es") == 1 && FlagMisses.count(roundTrip, "it") == 1)
}

@Test func aMissOnOneDeviceBeatsStaleHitsFromAnother() {
    var stale = EngineState()
    for _ in 0..<3 { stale = FlagMisses.recordingHit(stale, "it") }
    var fresh = stale
    fresh = FlagMisses.recording(fresh, "it")
    #expect(!FlagMisses.showsName(stale, "it"))
    #expect(FlagMisses.showsName(fresh, "it"))
    for merged in [mergeState(stale, fresh), mergeState(fresh, stale)] {
        #expect(FlagMisses.count(merged, "it") == 1)
        #expect(FlagMisses.hits(merged, "it") == 0)
        #expect(FlagMisses.showsName(merged, "it"))
    }
    var later = fresh
    later = FlagMisses.recordingHit(later, "it")
    let tie = mergeState(fresh, later)
    #expect(FlagMisses.count(tie, "it") == 1 && FlagMisses.hits(tie, "it") == 1)
}

@Test func flagMergeMatchesTheWebGolden() throws {
    let url = try #require(Bundle.module.url(forResource: "flag-merge-golden", withExtension: "json", subdirectory: "Fixtures/lang"))
    let root = try #require(JSONSerialization.jsonObject(with: Data(contentsOf: url)) as? [String: Any])
    func settings(_ side: Any?) -> JSObject {
        let side = side as? [String: [String: Int]] ?? [:]
        return JSObject(side.keys.sorted().map { k in (k, .object(JSObject((side[k] ?? [:]).sorted { $0.key < $1.key }.map { ($0.key, .number(Double($0.value))) }))) })
    }
    func ints(_ v: JSValue?) -> [String: Int] {
        var out: [String: Int] = [:]
        for k in v?.object?.keys ?? [] { out[k] = Int(v?.object?[k]?.number ?? 0) }
        return out
    }
    func merged(_ sides: [JSObject]) -> JSObject {
        sides.dropFirst().reduce(sides[0]) { acc, next in
            var out = JSObject()
            FlagMisses.mergeSynced(&out, acc, next)
            return out
        }
    }
    func orders(_ xs: [JSObject]) -> [[JSObject]] {
        xs.count <= 1 ? [xs] : xs.indices.flatMap { i in orders(Array(xs[..<i] + xs[(i + 1)...])).map { [xs[i]] + $0 } }
    }
    let cases = [root] + (root["cases"] as? [[String: Any]] ?? [])
    #expect(cases.count == 4)
    for c in cases {
        let want = c["synced"] as? [String: [String: Int]] ?? [:]
        let sides = ["a", "b", "c"].compactMap { c[$0] }.map(settings)
        for order in orders(sides) {
            let out = merged(order)
            #expect(ints(out["flagHits"]) == want["flagHits"] ?? [:], "\(c["name"] ?? "root")")
            #expect(ints(out["flagMisses"]) == want["flagMisses"] ?? [:], "\(c["name"] ?? "root")")
        }
    }
    #expect((root["synced"] as? [String: [String: Int]])?["flagHits"]?["it"] == 0)
}
