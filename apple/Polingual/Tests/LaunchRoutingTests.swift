import Foundation
import Testing
@testable import Polingual

@MainActor
@Suite(.serialized)
struct LaunchRoutingTests {
    @Test func staleStudyRequestFallsThroughToPlacement() {
        let now = Date()
        UserDefaults.standard.set(now.timeIntervalSince1970 - 600, forKey: StudyRequest.key)
        defer { UserDefaults.standard.removeObject(forKey: StudyRequest.key) }
        #expect(!StudyRequest.fresh(now: now))
        #expect(LaunchRouting.step(studyFresh: StudyRequest.fresh(now: now), firstSystem: "en-ru") == .place("en-ru"))
    }

    @Test func freshStudyRequestWinsOverPlacementAndStaysForToday() {
        let now = Date()
        UserDefaults.standard.set(now.timeIntervalSince1970 - 5, forKey: StudyRequest.key)
        defer { UserDefaults.standard.removeObject(forKey: StudyRequest.key) }
        #expect(LaunchRouting.step(studyFresh: StudyRequest.fresh(now: now), firstSystem: "en-ru") == .study)
        #expect(StudyRequest.take(now: now))
        #expect(LaunchRouting.step(studyFresh: false, firstSystem: "") == .none)
    }

    @Test func everyoneGetsTheStudioOnceAccessIsKnown() {
        #expect(RootScreen.pick(onboarded: false, access: .subscribed(productID: "y", until: nil)) == .onboarding)
        #expect(RootScreen.pick(onboarded: true, access: .checking) == .loading)
        #expect(RootScreen.pick(onboarded: true, access: .locked) == .studio)
        #expect(RootScreen.pick(onboarded: true, access: .trial(until: .distantFuture)) == .studio)
        #expect(RootScreen.pick(onboarded: true, access: .subscribed(productID: "y", until: nil)) == .studio)
        #expect(RootScreen.pick(onboarded: true, access: .beta) == .studio)
    }

    @Test func nonPayersSeeAdsAndALockedPreviewOfTodayAndLearn() {
        #expect(Monetization.showsAds(.locked))
        #expect(Monetization.locked(.today, access: .locked))
        #expect(Monetization.locked(.learn, access: .locked))
        #expect(!Monetization.locked(.games, access: .locked))
        #expect(!Monetization.locked(.account, access: .locked))
        #expect(Monetization.startTab(access: .locked) == .games)
    }

    @Test func payersAndCheckingSeeNoAdsAndNothingLocked() {
        let open: [Access] = [.trial(until: .distantFuture), .subscribed(productID: Plan.yearly, until: nil), .beta]
        for access in open {
            #expect(!Monetization.showsAds(access))
            for tab in [AppTab.today, .learn, .games, .account] { #expect(!Monetization.locked(tab, access: access)) }
            #expect(Monetization.startTab(access: access) == .today)
        }
        #expect(!Monetization.showsAds(.checking))
    }

    @Test func linkPendingAtMountPicksItsTab() {
        #expect(LaunchRouting.tab(for: nil, current: .learn) == .learn)
        #expect(LaunchRouting.tab(for: .group("7K3M9QX2PD"), current: .today) == .account)
        #expect(LaunchRouting.tab(for: .langs(root: "en", targets: ["es"]), current: .today) == .learn)
        #expect(LaunchRouting.tab(for: .voice, current: .account) == .learn)
        #expect(LaunchRouting.tab(for: .home, current: .learn) == .today)
    }
}
