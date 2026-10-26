import Foundation
import Testing
@testable import BucketKit

func questionDeck() throws -> QuestionDeck {
    let url = try #require(Bundle.module.url(forResource: "06-cosmology", withExtension: "json", subdirectory: "Fixtures/questions"))
    return try JSONDecoder().decode(QuestionDeck.self, from: Data(contentsOf: url))
}

@Test func shufflesMatchTheWebEngine() {
    #expect(QuestionEngine.shuffledIndices(4, seed: "s:equivalence-principle.pick") == [1, 2, 0, 3])
    #expect(QuestionEngine.shuffledIndices(6, seed: "abc") == [4, 1, 2, 0, 5, 3])
    #expect(QuestionEngine.parseNumber("6.0×10^3") == 6000)
    #expect(QuestionEngine.parseNumber("1,234") == 1234)
    #expect(QuestionEngine.parseNumber("12%") == 12)
    #expect(QuestionEngine.parseNumber("x").isNaN)
}

@Test func everyQuestionGradesItsOwnAnswerAsRight() throws {
    let deck = try questionDeck()
    #expect(deck.questions.count == 295)
    #expect(Set(deck.questions.map(\.kind)) == Set(QuestionKind.allCases))
    for q in deck.questions {
        let r: QuestionResponse
        switch q.kind {
        case .pick: r = .pick(Int(q.answer ?? -1))
        case .calculate: r = .calculate(String(q.answer ?? .nan))
        case .order: r = .order(Array(0..<(q.steps?.count ?? 0)))
        case .spotError: r = .spotError(q.error ?? -1)
        case .match: r = .match(Dictionary(uniqueKeysWithValues: (q.pairs ?? []).map { ($0.term, $0.meaning) }))
        }
        #expect(QuestionEngine.grade(q, r).rating == 3, "\(q.id)")
    }
}

@Test func orderAndMatchGivePartialCredit() throws {
    let deck = try questionDeck()
    let order = try #require(deck.questions.first { $0.kind == .order && ($0.steps?.count ?? 0) == 4 })
    #expect(QuestionEngine.grade(order, .order([0, 1, 3, 2])).rating == 2)
    #expect(QuestionEngine.grade(order, .order([3, 2, 1, 0])).rating == 1)
    let match = try #require(deck.questions.first { $0.kind == .match && ($0.pairs?.count ?? 0) >= 3 })
    let ps = match.pairs!
    var given = Dictionary(uniqueKeysWithValues: ps.map { ($0.term, $0.meaning) })
    given[ps[0].term] = ps[1].meaning
    given[ps[1].term] = ps[0].meaning
    #expect(QuestionEngine.grade(match, .match(given)).score == Double(ps.count - 3) / Double(ps.count - 1))
    #expect(QuestionEngine.grade(match, .pick(0)).rating == 1)
}
