import Foundation
import Testing
@testable import BucketKit

struct ArabicVerbFormTests {
    static let shared = URL(fileURLWithPath: #filePath).deletingLastPathComponent().deletingLastPathComponent().deletingLastPathComponent().deletingLastPathComponent().appending(path: "Shared/Corpus")

    func json(_ name: String) throws -> JSValue { try JSON.parse(Data(contentsOf: Self.shared.appending(path: name))) }

    static let pastForms: Set<String> = ["أكل", "ذهب", "شرب", "كتب", "قال", "جاء", "اشترى", "فكر", "عاش", "رأى", "أراد", "نام"]

    func bare(_ s: String) -> String { String(s.unicodeScalars.filter { !(0x064B...0x0652).contains($0.value) && $0.value != 0x0670 }.map(Character.init)) }

    @Test func arabicVerbsShowThePresentTense() throws {
        let corpus = buildLangCorpus(core: try json("lang-core.json"), cognates: try json("lang-cognates.json"), phrases: try json("lang-phrases.json"), layers: try json("lang-layers.json"))
        let verbs = corpus.items.filter { $0.kind == .word && $0.category == "verb" }
        #expect(verbs.count >= 40)
        for item in verbs {
            let word = try #require(item.forms["ar"], "\(item.id) has no Arabic form")
            let plain = bare(word)
            #expect(plain.hasPrefix("ي"), "\(item.id): \(word) is not a present-tense form")
            #expect(!Self.pastForms.contains(plain), "\(item.id): \(word) is the past citation form")
            #expect(word.unicodeScalars.contains { $0.value == 0x064E || $0.value == 0x064F }, "\(item.id): \(word) lacks vowel marks")
        }
    }
}
