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
        let u = LobbyAdUnits.from(["PolingualAds": " Test ", "GADApplicationIdentifier": LobbyAdUnits.testApp, "PolingualAdBanner": ""])
        #expect(u == LobbyAdUnits(mode: .test, banner: LobbyAdUnits.testBanner, interstitial: LobbyAdUnits.testInterstitial))
    }

    @Test func testModeNeedsTheGoogleTestApp() {
        #expect(LobbyAdUnits.from(["PolingualAds": "test"]) == nil)
        #expect(LobbyAdUnits.from(["PolingualAds": "test", "GADApplicationIdentifier": "ca-app-pub-9735211554999350~3234425502"]) == nil)
    }

    @Test func liveModeNeedsRealUnitIds() {
        let app = "ca-app-pub-1234567890123456~1111111111"
        #expect(LobbyAdUnits.from(["PolingualAds": "live"]) == nil)
        #expect(LobbyAdUnits.from(["PolingualAds": "live", "GADApplicationIdentifier": app, "PolingualAdBanner": "x", "PolingualAdInterstitial": "y"]) == nil)
        #expect(LobbyAdUnits.from(["PolingualAds": "live", "GADApplicationIdentifier": app, "PolingualAdBanner": LobbyAdUnits.testBanner, "PolingualAdInterstitial": LobbyAdUnits.testInterstitial]) == nil)
        let banner = "ca-app-pub-1234567890123456/1234567890"
        let inter = "ca-app-pub-1234567890123456/0987654321"
        #expect(LobbyAdUnits.from(["PolingualAds": "live", "PolingualAdBanner": banner, "PolingualAdInterstitial": inter]) == nil)
        #expect(LobbyAdUnits.from(["PolingualAds": "live", "GADApplicationIdentifier": LobbyAdUnits.testApp, "PolingualAdBanner": banner, "PolingualAdInterstitial": inter]) == nil)
        #expect(LobbyAdUnits.from(["PolingualAds": "live", "GADApplicationIdentifier": "ca-app-pub-6543210987654321~1111111111", "PolingualAdBanner": banner, "PolingualAdInterstitial": inter]) == nil)
        #expect(LobbyAdUnits.from(["PolingualAds": "live", "GADApplicationIdentifier": app, "PolingualAdBanner": banner, "PolingualAdInterstitial": inter]) == LobbyAdUnits(mode: .live, banner: banner, interstitial: inter))
    }

    @Test func releaseAndDebugSettingsFromTheProjectResolve() throws {
        let yml = try String(contentsOf: URL(fileURLWithPath: #filePath).deletingLastPathComponent().appendingPathComponent("../../../project.yml").standardized, encoding: .utf8)
        func setting(_ config: String, _ key: String) -> String? {
            guard let target = yml.range(of: "PRODUCT_BUNDLE_IDENTIFIER: com.polingual.app\n"),
                  let block = yml.range(of: "        \(config):\n", range: target.upperBound..<yml.endIndex) else { return nil }
            let tail = yml[block.upperBound...]
            for line in tail.split(separator: "\n") {
                guard line.hasPrefix("          ") else { break }
                let parts = line.trimmingCharacters(in: .whitespaces).split(separator: ":", maxSplits: 1)
                if parts.count == 2, parts[0] == key { return parts[1].trimmingCharacters(in: .whitespaces).replacingOccurrences(of: "\"", with: "") }
            }
            return nil
        }
        func info(_ config: String) -> [String: Any] {
            ["PolingualAds": setting(config, "POLINGUAL_ADS") ?? "", "GADApplicationIdentifier": setting(config, "POLINGUAL_GAD_APP_ID") ?? "",
             "PolingualAdBanner": setting(config, "POLINGUAL_AD_BANNER") ?? "", "PolingualAdInterstitial": setting(config, "POLINGUAL_AD_INTERSTITIAL") ?? ""]
        }
        #expect(LobbyAdUnits.from(info("Debug"))?.mode == .test)
        let release = try #require(LobbyAdUnits.from(info("Release")))
        #expect(release.mode == .live)
        #expect(release.banner == "ca-app-pub-9735211554999350/3274128968")
        #expect(release.interstitial == "ca-app-pub-9735211554999350/4047833788")
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

struct DebugBaseTests {
    @Test func launchArgumentWinsOverEnvironment() {
        let url = BucketAPI.debugBase(arguments: ["app", "-bucketBase", "http://127.0.0.1:3000"], environment: ["BUCKET_BASE_URL": "http://10.0.0.2:3000"])
        #expect(url?.absoluteString == "http://127.0.0.1:3000")
        #expect(BucketAPI.debugBase(arguments: [], environment: ["BUCKET_BASE_URL": "http://10.0.0.2:3000"])?.host() == "10.0.0.2")
    }

    @Test func rejectsMissingOrOddValues() {
        #expect(BucketAPI.debugBase(arguments: [], environment: [:]) == nil)
        #expect(BucketAPI.debugBase(arguments: ["-bucketBase"], environment: [:]) == nil)
        #expect(BucketAPI.debugBase(arguments: ["-bucketBase", "file:///etc"], environment: [:]) == nil)
        #expect(BucketAPI.debugBase(arguments: ["-bucketBase", "nonsense"], environment: [:]) == nil)
    }
}
