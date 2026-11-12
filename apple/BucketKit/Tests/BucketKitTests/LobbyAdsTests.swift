import Foundation
import Testing
@testable import BucketKit

struct LobbyAdsTests {
    @Test func adsStayOffUnlessTheModeIsSet() {
        #expect(LobbyAdUnits.from([:]) == nil)
        #expect(LobbyAdUnits.from(["PolingualAds": "off"]) == nil)
        #expect(LobbyAdUnits.from(["PolingualAds": "banana"]) == nil)
    }

    @Test func testModeUsesGoogleTestUnits() {
        let u = LobbyAdUnits.from(["PolingualAds": " Test "])
        #expect(u == LobbyAdUnits(mode: .test, banner: LobbyAdUnits.testBanner, interstitial: LobbyAdUnits.testInterstitial))
    }

    @Test func liveModeNeedsRealUnitIds() {
        #expect(LobbyAdUnits.from(["PolingualAds": "live"]) == nil)
        #expect(LobbyAdUnits.from(["PolingualAds": "live", "PolingualAdBanner": "x", "PolingualAdInterstitial": "y"]) == nil)
        #expect(LobbyAdUnits.from(["PolingualAds": "live", "PolingualAdBanner": LobbyAdUnits.testBanner, "PolingualAdInterstitial": LobbyAdUnits.testInterstitial]) == nil)
        let banner = "ca-app-pub-1234567890123456/1234567890"
        let inter = "ca-app-pub-1234567890123456/0987654321"
        #expect(LobbyAdUnits.from(["PolingualAds": "live", "PolingualAdBanner": banner, "PolingualAdInterstitial": inter]) == LobbyAdUnits(mode: .live, banner: banner, interstitial: inter))
    }

    @Test func interstitialWaitsForAFinishedGameAndThreeMinutes() {
        let t0 = Date(timeIntervalSince1970: 1_000)
        var pacer = InterstitialPacer()
        #expect(!pacer.due(finishedGame: false, at: t0))
        #expect(pacer.due(finishedGame: true, at: t0))
        pacer.shown(at: t0)
        #expect(!pacer.due(finishedGame: true, at: t0.addingTimeInterval(179)))
        #expect(pacer.due(finishedGame: true, at: t0.addingTimeInterval(180)))
    }
}
