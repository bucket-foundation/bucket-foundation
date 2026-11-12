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

struct TrialReminderPermissionTests {
    @Test func trialReminderFiresTheDayBeforeTheTrialEnds() {
        let now = Date(timeIntervalSince1970: 1_800_000_000)
        let until = now.addingTimeInterval(3 * 86_400)
        #expect(TrialReminder.fireDate(until: until, now: now) == now.addingTimeInterval(2 * 86_400))
        #expect(TrialReminder.fireDate(until: now.addingTimeInterval(3_600), now: now) == nil)
    }

    @Test func trialReminderReschedulesWhenPermissionArrives() {
        let trial = Access.trial(until: Date(timeIntervalSince1970: 1_800_000_000))
        #expect(TrialReminder.key(trial, allowed: false) != TrialReminder.key(trial, allowed: true))
        #expect(TrialReminder.key(.locked, allowed: true) == "none")
    }

    @Test func reminderSchedulesOnlyWhenAllowed() {
        #expect(TrialReminder.allowed(.authorized))
        #expect(TrialReminder.allowed(.provisional))
        #expect(!TrialReminder.allowed(.denied))
        #expect(!TrialReminder.allowed(.notDetermined))
    }

    @Test func outcomeReportsWhyNoReminderWasSet() {
        let now = Date(timeIntervalSince1970: 1_800_000_000)
        let until = now.addingTimeInterval(3 * 86_400)
        #expect(TrialReminder.outcome(.authorized, until: until, now: now) == .scheduled)
        #expect(TrialReminder.outcome(.denied, until: until, now: now) == .notAllowed)
        #expect(TrialReminder.outcome(.notDetermined, until: until, now: now) == .notAllowed)
        #expect(TrialReminder.outcome(.authorized, until: now.addingTimeInterval(3_600), now: now) == .tooLate)
    }
}

struct TodayExtrasTests {
    @Test func extrasWaitForASecondDay() {
        #expect(!TodayExtras.shown(days: [], today: "2026-11-5"))
        #expect(!TodayExtras.shown(days: ["2026-11-5"], today: "2026-11-5"))
        #expect(TodayExtras.shown(days: ["2026-11-4", "2026-11-5"], today: "2026-11-5"))
    }
}
