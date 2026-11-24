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

    @Test(arguments: [(852.0, 250.0, 380.0, 602.0), (852.0, 240.0, 360.0, 612.0), (667.0, 250.0, 380.0, 417.0), (667.0, 240.0, 360.0, 427.0), (759.0, 400.0, 380.0, 380.0)])
    func boardFitsThePhonesTheGamesRunOn(room: Double, chrome: Double, least: Double, want: Double) {
        let got = PlayBoard.height(room: CGFloat(room), chrome: CGFloat(chrome), least: CGFloat(least))
        #expect(Double(got) == want)
    }

    @Test func boardHonoursALeastAboveTheCap() {
        #expect(PlayBoard.height(room: 2000, chrome: 0, least: 700) == 700)
    }

    @Test(arguments: [(718.0, 240.0, 240.0), (718.0, 420.0, 402.0), (603.0, 420.0, 287.0), (603.0, 240.0, 240.0), (480.0, 420.0, 200.0), (0.0, 240.0, 200.0)])
    func sideColumnGrowsWithTypeAndLeavesTheBoardItsLanes(width: Double, wanted: Double, want: Double) {
        #expect(Double(PlayBoard.side(width: CGFloat(width), wanted: CGFloat(wanted), board: 316)) == want)
    }
}
