import Foundation
import Testing
@testable import BucketKit

@Suite struct RoundSpacingTests {
    func e(_ id: String, _ lang: String, _ stage: Stage) -> QueueEntry { QueueEntry(itemId: id, lang: lang, stage: stage) }

    func gaps(_ q: [QueueEntry]) -> [Int] {
        q.indices.compactMap { i in
            guard q[i].stage == .check, let j = q[..<i].lastIndex(where: { $0.stage == .intro && $0.itemId == q[i].itemId && $0.lang == q[i].lang }) else { return nil }
            return i - j - 1
        }
    }

    func rounds(_ count: Int) throws -> [[QueueEntry]] {
        let corpus = buildLangCorpus(core: try langFixture("core"), cognates: try langFixture("cognates"), phrases: try langFixture("phrases"), layers: try langFixture("layers"))
        let utc = TimeZone(identifier: "UTC")!
        let sys = try createSystem("en", ["fr", "es", "it"], now: 0)
        var state = EngineState()
        var now = 1_700_000_000_000.0
        var out: [[QueueEntry]] = []
        for _ in 0..<count {
            let q = spacedChecks(buildQueue(sys, corpus, state, now: now, tz: utc))
            out.append(q)
            for x in q where x.stage == .check || x.stage == .review {
                state = gradeCard(state, x.lang, x.itemId, 3, now: now, tz: "UTC")
                now += 5000
            }
        }
        return out
    }

    @Test func aFullRoundKeepsEveryCheckAtLeastTheGapAfterItsIntro() throws {
        let first = try rounds(1)[0]
        #expect(first.count >= 20)
        #expect(gaps(first).allSatisfy { $0 >= Lang.checkGap })
        #expect(first.filter { $0.stage == .check }.count == first.filter { $0.stage == .intro }.count)
    }

    @Test func anotherRoundNeverAsksAWordRightAfterItsIntro() throws {
        for q in try rounds(4) where q.count > Lang.checkGap * 2 {
            #expect(gaps(q).allSatisfy { $0 >= Lang.checkGap })
        }
    }

    @Test func everyNewWordInTheQueueStaysInTheRound() throws {
        let corpus = buildLangCorpus(core: try langFixture("core"), cognates: try langFixture("cognates"), phrases: try langFixture("phrases"), layers: try langFixture("layers"))
        let sys = try createSystem("en", ["fr", "es", "it"], now: 0)
        let q = buildQueue(sys, corpus, EngineState(), now: 1_700_000_000_000, tz: TimeZone(identifier: "UTC")!)
        let out = spacedChecks(q)
        #expect(out.count == q.count)
        #expect(Set(out.map { "\($0.lang):\($0.itemId):\($0.stage)" }) == Set(q.map { "\($0.lang):\($0.itemId):\($0.stage)" }))
    }

    @Test func requestedWordPairsGetSpacedByTheRestOfTheRound() {
        let q = [e("man", "fr", .intro), e("man", "fr", .check), e("a", "fr", .review), e("b", "es", .review), e("c", "it", .review), e("d", "fr", .review)]
        let out = spacedChecks(q)
        #expect(out.count == q.count)
        #expect(gaps(out).allSatisfy { $0 >= Lang.checkGap })
    }

    @Test func aNewWordAtTheTailMovesItsIntroUpFront() {
        let q = [e("a", "fr", .review), e("b", "es", .review), e("c", "it", .review), e("man", "fr", .intro), e("man", "fr", .check)]
        #expect(spacedChecks(q) == [e("man", "fr", .intro), e("a", "fr", .review), e("b", "es", .review), e("c", "it", .review), e("man", "fr", .check)])
    }

    @Test func aShortRoundKeepsTheNewWordWithItsCheckLast() {
        let q = [e("a", "fr", .review), e("man", "fr", .intro), e("man", "fr", .check)]
        #expect(spacedChecks(q) == [e("man", "fr", .intro), e("a", "fr", .review), e("man", "fr", .check)])
    }

    @Test func aMatchOnlyRoundStaysPlayable() {
        #expect(spacedChecks([e("four", "fr", .match)]) == [e("four", "fr", .match)])
        #expect(spacedChecks([e("man", "fr", .intro), e("man", "fr", .check), e("man", "fr", .match)]).count == 3)
    }

    @Test func checksWithoutAnIntroStayWhereTheyAre() {
        let q = [e("g", "fr", .check), e("a", "fr", .review)]
        #expect(spacedChecks(q) == q)
    }
}
