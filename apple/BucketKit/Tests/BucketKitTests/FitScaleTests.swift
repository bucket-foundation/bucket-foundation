import Testing
@testable import BucketKit

@Suite struct FitScaleTests {
    @Test func contentThatFitsKeepsFullSize() {
        #expect(FitScale.scale(content: 300, available: 600) == 1)
        #expect(FitScale.scale(content: 600, available: 600) == 1)
    }

    @Test func tallContentShrinksToTheAvailableHeight() {
        #expect(FitScale.scale(content: 500, available: 450) == 0.9)
    }

    @Test func aControlAtItsNaturalSizeStaysTappableAtTheFloor() {
        let smallest = FitScale.scale(content: 10_000, available: 1)
        #expect(smallest == FitScale.floor)
        #expect(FitScale.naturalTarget * smallest >= FitScale.minTarget)
    }

    @Test func shrinkingStopsAtTheFloorAndTheOverflowScrolls() {
        let s = FitScale.scale(content: 800, available: 400)
        #expect(s == FitScale.floor)
        #expect(FitScale.overflows(content: 800, available: 400, scale: s))
        #expect(!FitScale.overflows(content: 500, available: 400, scale: 0.8))
        #expect(!FitScale.overflows(content: 300, available: 600, scale: 1))
    }

    @Test func unmeasuredSizesKeepFullSize() {
        #expect(FitScale.scale(content: 0, available: 400) == 1)
        #expect(FitScale.scale(content: 400, available: 0) == 1)
    }
}
