import Foundation
import Testing
@testable import BucketKit

func soundUnits() -> [AlphabetUnit] {
    let latin = ScriptCourse.latinLetters.keys.sorted().compactMap { ScriptCourse.latinUnit($0, root: "en") }
    let basic = ["en", "id"].compactMap { ScriptCourse.latinUnit($0, root: "ru") }
    return latin + basic + LangScript.scripts.keys.sorted().compactMap { LangScript.alphabetUnit($0) }
}

@Test func everyTaughtLetterHasAnExampleWordThatContainsIt() {
    var missing: [String] = []
    for unit in soundUnits() {
        for l in unit.letters {
            guard let s = LetterSounds.lookup(unit.lang, l.ch) else { missing.append("\(unit.lang) \(l.ch) missing"); continue }
            if s.ipa.isEmpty || s.hint.isEmpty || s.gloss.isEmpty { missing.append("\(unit.lang) \(l.ch) empty field") }
            if LetterSounds.blanked(s, l.ch) == nil { missing.append("\(unit.lang) \(l.ch) example \(s.example) lacks it") }
        }
    }
    #expect(missing.isEmpty, "\(missing.count): \(missing.prefix(40).joined(separator: ", "))")
}

@Test func blankedHidesTheLetterInTheExample() {
    let s = LetterSound(ipa: "e", hint: "h", example: "café", gloss: "coffee")
    #expect(LetterSounds.blanked(s, "é") == "caf＿")
    #expect(LetterSounds.blanked(s, "ô") == nil)
    #expect(LetterSounds.parts(s, "é")?.before == "caf")
    #expect(LetterSounds.parts(s, "é")?.letter == "é")
}

@Test func partsMarkSharpSAndNotTheLettersItFoldsTo() {
    let s = LetterSound(ipa: "s", hint: "h", example: "Straße", gloss: "street")
    #expect(LetterSounds.parts(s, "ß")?.before == "Stra")
    #expect(LetterSounds.parts(s, "ß")?.letter == "ß")
    #expect(LetterSounds.parts(s, "ß")?.after == "e")
    #expect(LetterSounds.blanked(s, "ß") == "Stra＿e")
    #expect(LetterSounds.parts(s, "s")?.letter == "S")
}

@Test func partsMarkOnlyTheTaughtLetterInEveryExample() {
    var wrong: [String] = []
    for unit in soundUnits() {
        for l in unit.letters {
            guard let s = LetterSounds.lookup(unit.lang, l.ch), let p = LetterSounds.parts(s, l.ch) else { continue }
            let taught = String(String.UnicodeScalarView(l.ch.unicodeScalars.filter { $0 != "◌" }))
            if p.letter.lowercased() != taught.lowercased() { wrong.append("\(unit.lang) \(l.ch) marked \(p.letter)") }
        }
    }
    #expect(wrong.isEmpty, "\(wrong.count): \(wrong.prefix(40).joined(separator: ", "))")
}

@Test func heardMatchesTheSpokenWordInAnyAlternative() {
    #expect(LetterSounds.heard(["Le café", "cafe"], say: "café"))
    #expect(LetterSounds.heard(["Café!"], say: "café"))
    #expect(!LetterSounds.heard(["caffè latte"], say: "café"))
    #expect(!LetterSounds.heard([], say: "café"))
}

@Test func soundCardPutsTheCharacterOverItsPinyinAndMeaning() {
    let ma = LetterSounds.card(LetterSounds.lookup("zh", "mā")!)
    #expect(ma == SoundCard(word: "妈", phonetic: "mā", meaning: "mom", phoneticHoldsLetter: true))
    let ga = LetterSounds.card(LetterSounds.lookup("ko", "ㄱ")!)
    #expect(ga.word == "가" && ga.phonetic == "ㄱㅏ" && ga.meaning == "go")
    let rain = LetterSounds.card(LetterSounds.lookup("ja", "あ")!)
    #expect(rain == SoundCard(word: "あめ", phonetic: nil, meaning: "rain", phoneticHoldsLetter: false))
    let cafe = LetterSounds.card(LetterSound(ipa: "e", hint: "h", example: "café", gloss: "coffee"))
    #expect(cafe == SoundCard(word: "café", phonetic: nil, meaning: "coffee", phoneticHoldsLetter: false))
}

@Test func soundCardKeepsTheCharacterWordReading() {
    let s = LetterSound(ipa: "", hint: "h", example: "我的", gloss: "mine", reading: "wǒ de")
    #expect(LetterSounds.card(s) == SoundCard(word: "我的", phonetic: "wǒ de", meaning: "mine", phoneticHoldsLetter: false))
}
