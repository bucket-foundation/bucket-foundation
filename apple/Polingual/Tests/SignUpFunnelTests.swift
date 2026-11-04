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

    @Test func saveSheetShowsOnceAccessOpensForSignedOutBuyer() {
        let trial = Access.trial(until: Date(timeIntervalSince1970: 1_900_000_000))
        #expect(SaveProgress.shown(pending: true, signedIn: false, access: trial))
        #expect(SaveProgress.shown(pending: true, signedIn: false, access: .subscribed(productID: Plan.yearly, until: nil)))
        #expect(!SaveProgress.shown(pending: true, signedIn: true, access: trial))
        #expect(!SaveProgress.shown(pending: false, signedIn: false, access: trial))
        #expect(!SaveProgress.shown(pending: true, signedIn: false, access: .locked))
        #expect(!SaveProgress.shown(pending: true, signedIn: false, access: .checking))
    }
}

struct TrialReminderPermissionTests {
    @Test func trialPurchaseAsksOnlyWhenUndecided() {
        #expect(TrialReminder.asks(.notDetermined))
        #expect(!TrialReminder.asks(.denied))
        #expect(!TrialReminder.asks(.authorized))
    }

    @Test func reminderSchedulesOnlyWhenAllowed() {
        #expect(TrialReminder.allowed(.authorized))
        #expect(TrialReminder.allowed(.provisional))
        #expect(!TrialReminder.allowed(.denied))
        #expect(!TrialReminder.allowed(.notDetermined))
    }
}
