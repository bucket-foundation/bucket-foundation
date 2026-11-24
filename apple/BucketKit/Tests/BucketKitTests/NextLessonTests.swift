import Foundation
import Testing
@testable import BucketKit

@Suite struct NextLessonTests {
    func sys(_ id: String) -> LangSystem { LangSystem(id: id, name: id, root: "en", targets: ["de"], createdAt: 0) }

    @Test func currentSetIsLeftOut() {
        let sets = NextLesson.otherSets(after: "germanic", systems: [sys("germanic"), sys("romance")], lastStudyDay: { _ in "2026-11-16" })
        #expect(sets.map(\.id) == ["romance"])
    }

    @Test func oneSetOffersNoOtherSet() {
        #expect(NextLesson.otherSets(after: "germanic", systems: [sys("germanic")], lastStudyDay: { _ in nil }).isEmpty)
    }

    @Test func leastRecentlyStudiedSetComesFirst() {
        let days = ["romance": "2026-11-16", "slavic": "2026-11-10", "cjk": "2026-11-14"]
        let sets = NextLesson.otherSets(after: "germanic", systems: [sys("germanic"), sys("romance"), sys("slavic"), sys("cjk")], lastStudyDay: { days[$0] }, limit: 3)
        #expect(sets.map(\.id) == ["slavic", "cjk", "romance"])
    }

    @Test func neverStudiedSetLeadsAndTiesKeepTheLearnerOrder() {
        let days = ["romance": "2026-11-16"]
        let sets = NextLesson.otherSets(after: "germanic", systems: [sys("romance"), sys("slavic"), sys("germanic"), sys("cjk")], lastStudyDay: { days[$0] }, limit: 3)
        #expect(sets.map(\.id) == ["slavic", "cjk", "romance"])
    }

    @Test func listStopsAtTheLimitSoTheScreenFits() {
        let all = ["a", "b", "c", "d", "e"].map(sys)
        #expect(NextLesson.otherSets(after: "a", systems: all, lastStudyDay: { _ in nil }).count == NextLesson.otherSetLimit)
        #expect(NextLesson.otherSets(after: "a", systems: all, lastStudyDay: { _ in nil }, limit: 0).isEmpty)
    }
}
