import Foundation
import Testing
@testable import BucketKit

func questionDeck(_ name: String = "06-cosmology") throws -> QuestionDeck {
    let url = try #require(Bundle.module.url(forResource: name, withExtension: "json", subdirectory: "Fixtures/questions"))
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

@Test func everyQuestionGradesLikeTheWebEngine() throws {
    struct Raw: Decodable {
        let kind: String
        let choice: Int?
        let step: Int?
        let value: String?
        let order: [Int]?
        let pairs: [String: String]?
    }
    struct Grade: Decodable { let correct: Bool; let score: Double; let rating: Int }
    struct Case: Decodable { let r: Raw; let g: Grade }
    struct Row: Decodable { let branch: String; let id: String; let order: [Int]; let meanings: [Int]?; let cases: [Case] }
    let url = try #require(Bundle.module.url(forResource: "golden", withExtension: "json", subdirectory: "Fixtures/questions"))
    let rows = try JSONDecoder().decode([Row].self, from: Data(contentsOf: url))
    let decks = try ["00-learning-to-learn", "02-physics", "06-cosmology"].map { try questionDeck($0) }
    let byId = Dictionary(uniqueKeysWithValues: decks.flatMap { d in d.questions.map { ("\(d.branch)/\($0.id)", $0) } })
    #expect(rows.count == byId.count)
    var checked = 0
    for row in rows {
        let q = try #require(byId["\(row.branch)/\(row.id)"])
        let p = QuestionEngine.present(q, seed: "parity:\(row.branch)")
        #expect(p.order == row.order, "\(row.id) order")
        #expect(p.meanings == row.meanings, "\(row.id) meanings")
        for c in row.cases {
            let r: QuestionResponse
            switch c.r.kind {
            case "pick": r = .pick(c.r.choice ?? -1)
            case "spot-error": r = .spotError(c.r.step ?? -1)
            case "calculate": r = .calculate(c.r.value ?? "")
            case "order": r = .order(c.r.order ?? [])
            default: r = .match(c.r.pairs ?? [:])
            }
            let g = QuestionEngine.grade(q, r)
            #expect(g.correct == c.g.correct && g.rating == c.g.rating && abs(g.score - c.g.score) < 1e-9, "\(row.id) \(c.r.kind)")
            checked += 1
        }
    }
    #expect(checked == 3680)
}

@Test func missingQuestionDeckFallsBackToTheDrill() async throws {
    let dir = FileManager.default.temporaryDirectory.appending(path: "q-\(UUID().uuidString)")
    let api = BucketAPI(transport: StubTransport { _ in (404, Data("Not found".utf8)) }, cacheDir: dir)
    await #expect(throws: (any Error).self) { try await api.questionDeck("07-mind") }
    let deck = try? await api.questionDeck("07-mind")
    #expect(deck == nil)
}

@Test func everyPhysicsReviewCycleIncludesTheAppliedTask() throws {
    let deck = try questionDeck("02-physics")
    let atoms = Set(deck.questions.map(\.atom))
    let withApplied = atoms.filter { a in deck.questions(for: a).contains { $0.applied == true } }
    #expect(withApplied.count == 55)
    for atom in withApplied {
        let n = deck.rotation(for: atom).count
        #expect(n == 5 || n == 6, "\(atom)")
        for start in 0..<(2 * n) {
            let cycle = (start..<(start + n)).compactMap { deck.question(for: atom, reps: $0) }
            #expect(cycle.filter { $0.applied == true }.count == 1, "\(atom) from \(start)")
            #expect(Set(cycle.map(\.id)).count == n, "\(atom) from \(start)")
        }
    }
    #expect(deck.question(for: "nope", reps: 1) == nil)
    for atom in withApplied { #expect(deck.question(for: atom, reps: 1)?.applied == true, "\(atom) first review") }
    let pickOnly = try #require(withApplied.first)
    #expect(deck.question(for: pickOnly, reps: 3, kind: .pick)?.kind == .pick)
}

@Test func appliedFlagMustBeABoolean() {
    let bad = #"{"branch":"x","version":"0","questions":[{"id":"a","atom":"a","kind":"pick","prompt":"?","options":["a","b"],"answer":0,"applied":"yes"}]}"#
    #expect(throws: (any Error).self) { try JSONDecoder().decode(QuestionDeck.self, from: Data(bad.utf8)) }
    let good = #"{"branch":"x","version":"0","questions":[{"id":"a","atom":"a","kind":"pick","prompt":"?","options":["a","b"],"answer":0,"applied":true}]}"#
    #expect((try? JSONDecoder().decode(QuestionDeck.self, from: Data(good.utf8)))?.questions.first?.applied == true)
}

@Test func answeredEventsCarryTheQuestionKindAndAppliedFlag() throws {
    let q = try #require(try questionDeck("02-physics").questions.first { $0.applied == true })
    let props = BetaEvent.answeredProps(deck: "science:02-physics", correct: true, ms: 1200, kind: "review", question: q)
    #expect(props["question_kind"] == .string(q.kind.rawValue))
    #expect(props["applied"] == .bool(true) && props["kind"] == .string("review"))
    let drill = BetaEvent.answeredProps(deck: "science:02-physics", correct: false, ms: 900, kind: "review")
    #expect(drill["question_kind"] == nil && drill["applied"] == nil && drill["kind"] == .string("review"))
}
