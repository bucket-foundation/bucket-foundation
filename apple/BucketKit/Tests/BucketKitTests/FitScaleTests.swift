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

    @Test func subPointMeasurementFlipsDoNotMoveTheHeight() {
        var height = FitScale.settled(0, 324.66666666666663)
        #expect(height == 324.66666666666663)
        for measured in [324.3333333333333, 324.66666666666663, 324.3333333333333] {
            height = FitScale.settled(height, measured)
        }
        #expect(height == 324.66666666666663)
    }

    @Test func aWholePointChangeIsTaken() {
        #expect(FitScale.settled(324.5, 326) == 326)
        #expect(FitScale.settled(324.5, 0) == 0)
    }
}
