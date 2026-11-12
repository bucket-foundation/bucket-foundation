import Foundation
import UserNotifications
import Testing
@testable import Polingual

@MainActor
struct SignUpFunnelTests {
    @Test func onboardingIsTwoSteps() {
        #expect(Onboarding.Step.allCases == [.welcome, .languages])
    }

    @Test func purchaseOffersSaveOnlyWhenSignedOut() {
        #expect(SaveProgress.offer(signedIn: false))
        #expect(!SaveProgress.offer(signedIn: true))
    }

    @MainActor @Test func saveSheetShowsForAnySignedOutPlayerWithAPendingSave() {
        #expect(SaveProgress.shown(pending: true, signedIn: false))
        #expect(!SaveProgress.shown(pending: true, signedIn: true))
        #expect(!SaveProgress.shown(pending: false, signedIn: false))
        let defaults = UserDefaults(suiteName: "nudge-\(UUID().uuidString)")!
        SaveNudge.gameEnded(signedIn: true, defaults: defaults)
        #expect(!defaults.bool(forKey: SaveNudge.key))
        SaveNudge.gameEnded(signedIn: false, defaults: defaults)
        #expect(defaults.bool(forKey: SaveNudge.key))
    }
}
