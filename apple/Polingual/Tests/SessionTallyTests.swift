import Testing
@testable import Polingual

struct SessionTallyTests {
    @Test func gradedCardsShowTheScore() {
        #expect(SessionTally.kind(graded: 4, met: 3) == .score)
    }

    @Test func aLessonOfNewWordsCountsThemInsteadOfZeroOfZero() {
        #expect(SessionTally.kind(graded: 0, met: 5) == .met)
    }

    @Test func nothingAnsweredShowsTheStreakAlone() {
        #expect(SessionTally.kind(graded: 0, met: 0) == .streak)
    }
}
