import Foundation
import Testing
@testable import BucketKit

struct ArabicVerbFormTests {
    static let tests = URL(fileURLWithPath: #filePath).deletingLastPathComponent()
    static let shared = tests.deletingLastPathComponent().deletingLastPathComponent().deletingLastPathComponent().appending(path: "Shared/Corpus")
    static let imperfectPrefixes: Set<Character> = ["ي", "ت", "أ", "ن"]

    func json(_ name: String) throws -> JSValue { try JSON.parse(Data(contentsOf: Self.shared.appending(path: name))) }

    func bare(_ s: String) -> String { String(String.UnicodeScalarView(s.unicodeScalars.filter { !(0x064B...0x0652).contains($0.value) && $0.value != 0x0670 })) }

    @Test func arabicVerbsShowThePresentTense() throws {
        let corpus = buildLangCorpus(core: try json("lang-core.json"), cognates: try json("lang-cognates.json"), phrases: try json("lang-phrases.json"), layers: try json("lang-layers.json"))
        let past = try JSONDecoder().decode([String: [String]].self, from: Data(contentsOf: Self.tests.appending(path: "Fixtures/lang/arabic-past-verbs.json")))
        let verbs = corpus.items.filter { $0.kind == .word && $0.category == "verb" }
        #expect(Set(verbs.map(\.id)) == Set(past.keys))
        for item in verbs {
            let word = try #require(item.forms["ar"], "\(item.id) has no Arabic form")
            let plain = bare(word)
            #expect(plain.first.map(Self.imperfectPrefixes.contains) == true, "\(item.id): \(word) lacks an imperfect prefix")
            let pastForms = past[item.id] ?? []
            #expect(!pastForms.contains(word) && !pastForms.map(bare).contains(plain), "\(item.id): \(word) is the past citation form")
            #expect(word.unicodeScalars.contains { $0.value == 0x064E || $0.value == 0x064F }, "\(item.id): \(word) lacks vowel marks")
            let reading = item.readings["ar"]
            #expect(reading?.roman?.isEmpty == false, "\(item.id) has no Arabic romanization")
            #expect(reading?.ipa?.isEmpty == false, "\(item.id) has no Arabic IPA")
        }
    }
}
