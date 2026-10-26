import Foundation
import Testing
@testable import BucketKit

@Test func everyNonLatinLanguageHasAnAlphabet() {
    let nonLatin = Lang.codes.filter { Lang.info[$0]?.latin == false }
    #expect(nonLatin.allSatisfy { LangScript.scripts[$0] != nil })
    for l in nonLatin {
        let u = LangScript.alphabetUnit(l)
        #expect((u?.letters.count ?? 0) >= 20, "\(l)")
        #expect(Set(u?.letters.map(\.ch) ?? []).count == u?.letters.count, "\(l)")
    }
    #expect(LangScript.alphabetUnit("es") == nil)
    #expect(LangScript.alphabetUnit("ru")?.letters.count == 33)
    #expect(LangScript.alphabetUnit("he")?.letters.count == 22)
    #expect(LangScript.alphabetUnit("th")?.letters.count == 44)
    #expect(LangScript.alphabetUnit("ja")?.letters.count == 46)
    #expect(LangScript.alphabetUnit("ja")?.letters[5].ch == "か")
}

@Test func spellingFoldsMarksByScript() {
    let j = LangScript.judgeSpelled
    #expect(j("שָׁלוֹם", ["שלום"], "he") == .exact)
    #expect(j("שלום", ["שָׁלוֹם"], "he") == .exact)
    #expect(j("كِتَاب", ["كتاب"], "ar") == .exact)
    #expect(j("كتـاب", ["كتاب"], "ar") == .exact)
    #expect(j("كتاي", ["كتاب"], "ar") == .close)
    #expect(j("يك", ["یک"], "fa") == .exact)
    #expect(j("еж", ["ёж"], "ru") == .exact)
    #expect(j("мои", ["мой"], "ru") != .exact)
    #expect(j("кни\u{301}га", ["книга"], "ru") == .exact)
    #expect(LangScript.foldMarks("ї", "uk") == "ї")
    #expect(LangScript.foldMarks("ϊ", "el") == "ι")
    #expect(j("Москва", ["москва"], "ru") == .exact)
    #expect(j("моско", ["москва"], "ru") == .wrong)
    #expect(j("καλημερα", ["καλημέρα"], "el") == .close)
    #expect(j("καλημέρα", ["καλημέρα"], "el") == .exact)
    #expect(j("नमस्ते", ["नमस्ते".decomposedStringWithCanonicalMapping], "hi") == .exact)
    #expect(j("नमसते", ["नमस्ते"], "hi") == .close)
    #expect(j("ﾈｺ", ["ネコ"], "ja") == .exact)
    #expect(j("한국", ["한국".decomposedStringWithCanonicalMapping], "ko") == .exact)
    #expect(j("", ["猫"], "zh") == .wrong)
    #expect(j("ねこ", ["猫", "ねこ"], "ja") == .exact)
    #expect(LangScript.foldMarks(" שָׁלוֹם! ", "he") == "שלום")
}

@Test func heritageModeSpellsHeardWords() throws {
    let corpus = buildLangCorpus(core: try langFixture("core"), cognates: try langFixture("cognates"), phrases: try langFixture("phrases"), layers: try langFixture("layers"))
    let sys = try createSystem("en", ["ru", "es"], [], now: 1)
    let item = try #require(corpus.items.first { $0.kind == .word && $0.form("ru") != nil && $0.form("en") != nil })
    var card = Card()
    card.reps = 3
    var rng = Rng(seed: 1)
    let ex = exerciseFor(corpus, sys, item, "ru", card, &rng, heritage: true)
    #expect(ex.kind == .spellHeard && ex.prompt == item.form("ru") && ex.answerLang == "ru")
    #expect(exerciseFor(corpus, sys, item, "ru", nil, &rng, heritage: true).kind == .intro)
    if let es = corpus.items.first(where: { $0.kind == .word && $0.form("es") != nil && $0.form("en") != nil }) {
        #expect(exerciseFor(corpus, sys, es, "es", card, &rng, heritage: true).kind != .spellHeard)
    }
    #expect((0..<20).allSatisfy { k in var r = Rng(seed: UInt32(k)); return exerciseFor(corpus, sys, item, "ru", card, &r).kind != .spellHeard })
    let g = gradeSpelling(ex, item.form("ru")!.uppercased())
    #expect(g.verdict == .exact && g.rating == 3)
    #expect(gradeSpelling(ex, "zzz").rating == 1)
}

@Test func letterCardsScheduleThroughTheCardFlow() {
    var rng = Rng(seed: 2)
    let lx = letterExercise("he", "en", 1, &rng)
    #expect(lx?.kind == .letter && lx?.answer == "ב" && lx?.prompt == "b/v" && lx?.options?.count == 4 && lx?.options?.contains("ב") == true)
    #expect(letterExercise("he", "en", 99, &rng) == nil && letterExercise("es", "en", 0, &rng) == nil)
    let now = 1_793_016_000_000.0
    var st = EngineState()
    #expect(LangScript.nextLetters(st, "ko", n: 3).map(\.ch).joined() == "ㄱㄴㄷ")
    st = gradeCard(st, "ko", LangScript.letterItemId("ㄱ"), 3, now: now, tz: "UTC")
    #expect(st.cards.has(LangScript.letterCardId("ko", "ㄱ")))
    #expect(LangScript.nextLetters(st, "ko", n: 1).first?.ch == "ㄴ")
    #expect(LangScript.dueLetters(st, "ko", now: now).isEmpty && LangScript.dueLetters(st, "ko", now: now + 30 * 86_400_000).count == 1)
    #expect(!LangScript.alphabetDone(st, "ko"))
    for l in LangScript.alphabetUnit("ko")!.letters { st = gradeCard(st, "ko", LangScript.letterItemId(l.ch), 3, now: now, tz: "UTC") }
    #expect(LangScript.alphabetDone(st, "ko") && LangScript.alphabetDone(st, "es"))
}

@Test func finalSigmaLowercasesLikeJavaScript() {
    #expect(LangScript.jsLowercased("ΟΔΟΣ") == "οδος")
    #expect(LangScript.jsLowercased("ΣΟΦΙΑ") == "σοφια")
    #expect(LangScript.jsLowercased("ΟΔΟΣ ΚΑΙ") == "οδος και")
    #expect(LangScript.jsLowercased("Σ") == "σ")
}
