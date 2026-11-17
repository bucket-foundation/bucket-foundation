import CoreGraphics
import Testing
@testable import BucketKit

@Suite struct NightTilesTests {
    @Test func shortSpaceLaysTheTilesInOneRow() {
        let fit = NightTiles.fit(width: 329, height: 112, compact: false)
        #expect(fit.row)
        #expect(fit.side == 64)
        #expect(fit.side * 4 + 36 <= 329)
    }

    @Test func tallSpaceKeepsTheTwoByTwoGrid() {
        let fit = NightTiles.fit(width: 329, height: 380, compact: false)
        #expect(!fit.row)
        #expect(fit.side == 156.5)
    }

    @Test func compactKeepsItsRow() {
        #expect(NightTiles.fit(width: 600, height: 120, compact: true) == NightTiles.Fit(side: 96, row: true))
        #expect(NightTiles.fit(width: 329, height: 10, compact: false).side == 0)
    }
}
