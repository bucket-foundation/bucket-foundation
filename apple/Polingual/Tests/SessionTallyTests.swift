import Testing
@testable import Polingual
import BucketKit

struct SessionTallyTests {
    @Test func gradedCardsShowTheScore() {
        #expect(SessionTally.kind(graded: 4, met: 3) == .score)
    }

    @Test func aLessonOfNewWordsCountsThemInsteadOfZeroOfZero() {
        #expect(SessionTally.kind(graded: 0, met: 5) == .met)
    }

    @Test func onlyAnUngradedIntroCountsAsAWordMet() {
        #expect(SessionTally.met(answered: 0, kind: .intro) == 1)
        #expect(SessionTally.met(answered: 1, kind: .intro) == 0)
        #expect(SessionTally.met(answered: 0, kind: .choose) == 0)
        #expect(SessionTally.met(answered: 0, kind: nil) == 0)
        let lesson: [(Int, ExerciseKind)] = [(0, .intro), (0, .intro), (2, .choose), (0, .letter), (0, .intro)]
        #expect(lesson.reduce(0) { $0 + SessionTally.met(answered: $1.0, kind: $1.1) } == 3)
    }

    @Test func nothingAnsweredShowsTheStreakAlone() {
        #expect(SessionTally.kind(graded: 0, met: 0) == .streak)
    }
}
