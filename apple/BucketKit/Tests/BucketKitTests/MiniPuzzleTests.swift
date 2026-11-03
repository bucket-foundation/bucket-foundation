import Testing
@testable import BucketKit

@Suite struct MiniPuzzleTests {
    static let forms = ["haus", "hund", "katze", "tisch", "stuhl", "wasser", "brot", "milch", "apfel", "schule", "kind", "buch", "nacht", "garten", "fisch", "vogel"]
    let words = forms.enumerated().map { GameWord(itemId: "i\($0.offset)", lang: "de", form: $0.element, gloss: "g\($0.offset)", root: "en", rank: $0.offset) }

    @Test func lettersSkipPhrasesAndLongWords() {
        #expect(MiniPuzzle.letters("haus") == ["H", "A", "U", "S"])
        #expect(MiniPuzzle.letters("guten tag") == nil)
        #expect(MiniPuzzle.letters("an") == nil)
        #expect(MiniPuzzle.letters("krankenhaus") == nil)
    }

    @Test func sameDayGivesTheSamePuzzle() {
        let a = MiniPuzzle.daily(words, day: "2026-11-02", root: "en", targets: ["de"])
        #expect(a != nil && a == MiniPuzzle.daily(words, day: "2026-11-02", root: "en", targets: ["de"]))
        #expect(a != MiniPuzzle.daily(words, day: "2026-11-03", root: "en", targets: ["de"]))
    }

    @Test func gridIsValidAcrossManyDays() throws {
        for d in 1...60 {
            let p = try #require(MiniPuzzle.daily(words, day: "day\(d)", root: "en", targets: ["de"]))
            #expect(p.entries.count >= 3 && p.rows <= MiniPuzzle.side && p.cols <= MiniPuzzle.side)
            #expect(Set(p.entries.map(\.word.id)).count == p.entries.count)
            var cells: [MiniCell: String] = [:]
            for e in p.entries {
                for (c, l) in zip(e.cells, e.letters) {
                    if let old = cells[c] { #expect(old == l) }
                    cells[c] = l
                }
            }
            #expect(Set(p.answers.values).isSubset(of: Set(p.keys)))
            #expect(p.entries.allSatisfy { $0.number > 0 })
        }
    }

    @Test func tooFewWordsGivesNothing() {
        #expect(MiniPuzzle.daily(Array(words.prefix(4)), day: "d", root: "en", targets: ["de"]) == nil)
        let han = ["水", "火", "山", "人", "日", "月", "木", "金", "土", "天"].enumerated().map { GameWord(itemId: "z\($0.offset)", lang: "zh", form: $0.element, gloss: "g", root: "en", rank: 0) }
        #expect(MiniPuzzle.daily(han, day: "d", root: "en", targets: ["zh"]) == nil)
    }
}
