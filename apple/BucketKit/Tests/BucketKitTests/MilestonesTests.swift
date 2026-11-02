import Testing
@testable import BucketKit

@Suite struct MilestonesTests {
    @Test func earnsEveryThresholdCrossed() {
        let ids = Milestones.earned(mastered: ["es": 6], streak: 7).map(\.id)
        #expect(ids == ["streak:3", "streak:7", "mastered:es:1", "mastered:es:5"])
    }

    @Test func nextIsTheBiggestUnseen() {
        let earned = Milestones.earned(mastered: ["es": 12, "de": 1], streak: 3)
        #expect(Milestones.next(earned, seen: [])?.id == "mastered:es:10")
        #expect(Milestones.next(earned, seen: Set(earned.map(\.id))) == nil)
    }

    @Test func noMasteryNoMoment() {
        #expect(Milestones.next(Milestones.earned(mastered: ["es": 0], streak: 1), seen: []) == nil)
    }
}
