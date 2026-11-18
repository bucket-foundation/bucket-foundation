import CoreGraphics
import Testing
@testable import BucketKit

struct PlayBoardTests {
    @Test func boardTakesTheRoomLeftByTheChrome() {
        #expect(PlayBoard.height(room: 760, chrome: 250, least: 380) == 510)
    }

    @Test func boardKeepsItsLeastHeightInLandscape() {
        #expect(PlayBoard.height(room: 330, chrome: 250, least: 380) == 380)
    }

    @Test func boardKeepsItsLeastHeightBeforeTheRoomIsKnown() {
        #expect(PlayBoard.height(room: 0, chrome: 240, least: 360) == 360)
    }

    @Test func boardStopsGrowingOnTallScreens() {
        #expect(PlayBoard.height(room: 1300, chrome: 250, least: 380) == PlayBoard.most)
    }
}
