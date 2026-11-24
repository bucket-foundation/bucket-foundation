import Foundation
import Testing
@testable import Polingual

@MainActor
struct ResultBannerSlotTests {
    @Test func eachPushedGameOwnsItsBannerState() {
        let games = ResultSlot()
        let elsewhere = ResultSlot()
        let result = UUID()
        elsewhere.appeared(result)
        #expect(elsewhere.showsBanner)
        #expect(!games.showsBanner)
    }

    @Test func switchingTabsAwayFromAResultAndBackToABoardHidesTheBanner() {
        let slot = ResultSlot()
        let result = UUID()
        slot.appeared(result)
        slot.appeared(result)
        slot.disappeared(result)
        #expect(!slot.showsBanner)
        slot.appeared(result)
        #expect(slot.showsBanner)
        slot.disappeared(result)
        #expect(!slot.showsBanner)
    }
}
