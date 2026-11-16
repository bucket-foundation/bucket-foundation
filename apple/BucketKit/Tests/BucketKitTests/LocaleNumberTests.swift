import Foundation
import Testing
@testable import BucketKit

private let commaLocales = ["es-ES", "es-AR", "es-CL", "es_CO"]

private func near(_ a: Double, _ b: Double) -> Bool {
    a.isFinite && abs(a - b) <= abs(b) * 1e-12 + 1e-15
}

private func calc(_ answer: Double) -> Question {
    Question(id: "c", atom: "a", kind: .calculate, prompt: "?", answer: answer)
}

@Test func englishKeepsTheLegacyReading() {
    for locale in [nil, "en", "en-US", "en_GB"] {
        #expect(QuestionEngine.parseNumber("1,234", locale: locale) == 1234)
        #expect(QuestionEngine.parseNumber("1,00,000", locale: locale) == 100000)
        #expect(QuestionEngine.parseNumber("0,5", locale: locale) == 5)
        #expect(QuestionEngine.parseNumber("6.0×10^3", locale: locale) == 6000)
        #expect(QuestionEngine.parseNumber("12%", locale: locale) == 12)
        #expect(QuestionEngine.parseNumber("1/4", locale: locale).isNaN)
    }
}

@Test(arguments: ["es"] + commaLocales)
func spanishReadsBothDecimalMarks(_ locale: String) {
    let cases: [(String, Double)] = [
        ("3,5", 3.5), ("0,25", 0.25), ("3.5", 3.5), ("0.375", 0.375), ("0,375", 0.375), ("1,2345", 1.2345),
        ("1.234,5", 1234.5), ("1,234.5", 1234.5), ("1.234.567", 1234567), ("1,234,567", 1234567), ("1 234,5", 1234.5),
        ("-3,5", -3.5), ("\u{2212}0,25", -0.25), ("6,022e23", 6.022e23), ("6,022 × 10^23", 6.022e23),
        ("-1,6e-19", -1.6e-19), ("1/4", 0.25), ("1,5/3", 0.5), (",5", 0.5), ("5,", 5),
    ]
    for (input, want) in cases {
        #expect(near(QuestionEngine.parseNumber(input, locale: locale), want), "\(input) \(locale)")
    }
    for bad in ["1,23.4", "12.34,5", "1/0", "1'234", "6'3", "1,,2", ",", "."] {
        #expect(QuestionEngine.parseNumber(bad, locale: locale).isNaN, "\(bad) \(locale)")
    }
}

@Test func aLoneMarkBeforeThreeDigitsIsAmbiguous() {
    #expect(LocaleNumber.parse("1,234") == .ambiguous(mark: ",", grouped: 1234, decimal: 1.234, whole: "1234", other: "1.234"))
    #expect(LocaleNumber.parse("12,500") == .ambiguous(mark: ",", grouped: 12500, decimal: 12.5, whole: "12500", other: "12.500"))
    #expect(LocaleNumber.parse("-1,234") == .ambiguous(mark: ",", grouped: -1234, decimal: -1.234, whole: "1234", other: "1.234"))
    #expect(LocaleNumber.parse("1.234") == .ambiguous(mark: ".", grouped: 1234, decimal: 1.234, whole: "1234", other: "1,234"))
    #expect(LocaleNumber.parse("0,250") == .ok(0.25))
    #expect(LocaleNumber.parse("1,234,5") == .invalid)
    #expect(LocaleNumber.resolve(LocaleNumber.parse("12,500"), locale: "es") == nil)
    for locale in commaLocales {
        #expect(LocaleNumber.resolve(LocaleNumber.parse("1.234"), locale: locale) == 1234)
        #expect(LocaleNumber.resolve(LocaleNumber.parse("1,234"), locale: locale) == 1.234)
    }
}

@Test func plainSpanishGetsAHintOnAnAmbiguousAnswer() {
    let q = calc(1234)
    #expect(QuestionEngine.grade(q, .calculate("1,234")).correct)
    #expect(QuestionEngine.grade(q, .calculate("1,234"), locale: "en").correct)
    let es = QuestionEngine.grade(q, .calculate("1,234"), locale: "es")
    #expect(!es.correct)
    #expect(es.hint == DecimalHint(whole: "1234", other: "1.234"))
    #expect(QuestionEngine.grade(q, .calculate("1.234"), locale: "es").hint == DecimalHint(whole: "1234", other: "1,234"))
    #expect(QuestionEngine.grade(q, .calculate("1.234"), locale: "es-AR").correct)
    let dec = calc(2.5)
    #expect(QuestionEngine.grade(dec, .calculate("2,5"), locale: "es").correct)
    #expect(QuestionEngine.grade(dec, .calculate("2,5")).hint == nil)
    #expect(QuestionEngine.grade(dec, .calculate("x"), locale: "es").hint == nil)
}

@Test func everyCalculateKeyGradesWithAPointAndWithASpanishComma() throws {
    let url = try #require(Bundle.module.url(forResource: "questions", withExtension: nil, subdirectory: "Fixtures"))
    let files = try FileManager.default.contentsOfDirectory(at: url, includingPropertiesForKeys: nil).filter { $0.pathExtension == "json" && $0.lastPathComponent != "golden.json" }
    let es = NumberFormatter()
    es.locale = Locale(identifier: "es")
    es.usesGroupingSeparator = false
    es.usesSignificantDigits = true
    es.maximumSignificantDigits = 15
    var n = 0
    for f in files {
        let deck = try JSONDecoder().decode(QuestionDeck.self, from: Data(contentsOf: f))
        for q in deck.questions where q.kind == .calculate {
            let a = try #require(q.answer)
            #expect(QuestionEngine.grade(q, .calculate(String(a)), locale: "en").correct, "\(q.id)")
            let comma = try #require(es.string(from: a as NSNumber))
            for locale in commaLocales {
                #expect(QuestionEngine.grade(q, .calculate(comma), locale: locale).correct, "\(q.id) \(comma) \(locale)")
            }
            for value in [String(a), comma] {
                let g = QuestionEngine.grade(q, .calculate(value), locale: "es")
                #expect(g.correct || g.hint != nil, "\(q.id) \(value) es")
            }
            n += 1
        }
    }
    #expect(n > 0)
}
