import Testing
@testable import BucketKit

@Test func latinTargetsTeachOnlyLettersTheRootLacks() {
    let fromEnglish = ScriptCourse.units("es", root: "en")
    #expect(fromEnglish.count == 1 && fromEnglish[0].letters.contains { $0.ch == "ñ" } && !fromEnglish[0].letters.contains { $0.ch == "b" })
    let fromSpanish = ScriptCourse.units("pt", root: "es")[0].letters.map(\.ch)
    #expect(fromSpanish.contains("ã") && !fromSpanish.contains("ñ"))
    let fromRussian = ScriptCourse.units("es", root: "ru")[0].letters.map(\.ch)
    #expect(fromRussian.contains("b") && fromRussian.contains("ñ"))
    #expect(ScriptCourse.units("en", root: "en").isEmpty)
}

@Test func otherScriptsGetAlphabetsAndCharacters() {
    #expect(ScriptCourse.units("ja", root: "en").map(\.script) == ["kana", "Hani"] || ScriptCourse.units("ja", root: "en").count == 2)
    #expect(ScriptCourse.units("zh", root: "en").first?.title == "Chinese characters")
    #expect(ScriptCourse.units("zh", root: "ja").isEmpty)
    #expect(ScriptCourse.units("ru", root: "en").count == 1)
    #expect(ScriptCourse.isCharacter("zh", "的"))
}

@Test func writingQueueStartsWithFreshLettersAndExercisesResolve() {
    let system = LangSystem(id: "s", name: "E", root: "en", targets: ["zh", "de"], createdAt: 0)
    let q = ScriptCourse.queue(system, EngineState(), now: 0)
    #expect(q.filter { $0.lang == "zh" }.count == lettersPerSession && q.filter { $0.lang == "de" }.count == lettersPerSession)
    var rng = Rng(seed: 7)
    for e in q { #expect(ScriptCourse.exercise(e.lang, "en", e.itemId, &rng)?.kind == .letter) }
}

@Test func latinUnitsHaveOneEntryPerLetterAndCompareSounds() {
    for lang in ["es", "de", "tr", "pl", "fr", "en"] {
        for root in ["en", "ru", "es", "fr"] {
            guard let unit = ScriptCourse.latinUnit(lang, root: root) else { continue }
            #expect(Set(unit.letters.map(\.ch)).count == unit.letters.count, "\(lang) from \(root)")
        }
    }
    #expect(ScriptCourse.latinUnit("de", root: "ru")!.letters.first { $0.ch == "w" }?.sound == "v")
    #expect(ScriptCourse.latinUnit("es", root: "fr")!.letters.contains { $0.ch == "ch" })
}
