import Testing
@testable import BucketKit

@Suite struct FitScaleTests {
    @Test func contentThatFitsKeepsFullSize() {
        #expect(FitScale.scale(content: 300, available: 600) == 1)
        #expect(FitScale.scale(content: 600, available: 600) == 1)
    }

    @Test func tallContentShrinksToTheAvailableHeight() {
        #expect(FitScale.scale(content: 800, available: 400) == 0.5)
        #expect(FitScale.scale(content: 900, available: 300) * 900 == 300)
    }

    @Test func unmeasuredSizesKeepFullSize() {
        #expect(FitScale.scale(content: 0, available: 400) == 1)
        #expect(FitScale.scale(content: 400, available: 0) == 1)
    }
}
