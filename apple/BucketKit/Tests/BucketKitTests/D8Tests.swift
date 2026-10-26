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
