import BucketKit
import Foundation
import UserNotifications
import Testing
@testable import Polingual

@MainActor
struct SignUpFunnelTests {
    @Test func onboardingAsksWhereTheLearnerHeardBeforeLanguagesThenBuildsAPlan() {
        #expect(Onboarding.Step.allCases == [.welcome, .heard, .speak, .languages, .reason, .level, .motivation, .minutes, .time, .deadline, .plan, .say])
        #expect(Onboarding.Step.allCases.map(\.funnelName) == ["welcome", "heard_about", "speak", "languages", "reason", "level", "motivation", "minutes", "practice_time", "deadline", "plan", "say"])
        #expect(Onboarding.Step.allCases.allSatisfy { $0.funnelName.count <= 40 })
    }

    @Test func quizOptionsCoverEveryAnswerWithDistinctKeys() {
        for options in [QuizOption.reasons, QuizOption.levels, QuizOption.minutes, QuizOption.times, QuizOption.deadlines] {
            #expect(Set(options.map(\.key)).count == options.count)
            #expect(options.allSatisfy { !$0.label.isEmpty })
        }
        #expect(QuizOption.minutes.map(\.key) == ["5", "10", "15", "20"])
        #expect(QuizOption.levels.map(\.key).contains("get_by"))
    }

    @Test func planPaywallShowsOnceAfterOnboardingForLearnersWithoutAccess() {
        let d = UserDefaults(suiteName: "plan-paywall-\(UUID().uuidString)")!
        #expect(!PlanPaywall.take(open: false, d))
        PlanPaywall.arm(d)
        #expect(PlanPaywall.take(open: false, d))
        #expect(!PlanPaywall.take(open: false, d))
        PlanPaywall.arm(d)
        #expect(!PlanPaywall.take(open: true, d))
        #expect(!PlanPaywall.take(open: false, d))
    }

    @Test func swipingPastAnUnfinishedStepReturnsToIt() {
        #expect(Onboarding.blocked(.plan, ready: false, targets: 2) == .speak)
        #expect(Onboarding.blocked(.reason, ready: true, targets: 0) == .languages)
        #expect(Onboarding.blocked(.languages, ready: true, targets: 0) == nil)
        #expect(Onboarding.blocked(.plan, ready: true, targets: 1) == nil)
        #expect(Onboarding.blocked(.say, ready: true, targets: 0) == .languages)
    }

    @Test func planPaywallWaitsForAccessAndOtherRootSheets() {
        #expect(!PlanPaywall.ready(.checking, sheets: []))
        #expect(!PlanPaywall.ready(.locked, sheets: [.saveProgress]))
        #expect(PlanPaywall.ready(.locked, sheets: []))
    }

    @Test func planKeepsAReminderTimeTheLearnerAlreadySet() {
        let plan = PersonalPlan(QuizAnswers(time: .morning), languages: 1, now: .now)
        #expect(PlanPaywall.reminderMinute(plan, current: nil) == 480)
        #expect(PlanPaywall.reminderMinute(plan, current: 1200) == nil)
        #expect(PlanPaywall.reminderMinute(PersonalPlan(QuizAnswers(), languages: 1, now: .now), current: nil) == nil)
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
    @Test func trialReminderFiresTwoDaysBeforeTheTrialEnds() {
        let now = Date(timeIntervalSince1970: 1_800_000_000)
        let until = now.addingTimeInterval(7 * 86_400)
        #expect(TrialReminder.fireDate(until: until, now: now) == now.addingTimeInterval(5 * 86_400))
        #expect(TrialReminder.fireDate(until: now.addingTimeInterval(86_400), now: now) == nil)
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
