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
