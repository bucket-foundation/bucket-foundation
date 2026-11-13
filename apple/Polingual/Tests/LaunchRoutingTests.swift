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

    @Test func lockedUsersGetGamesAndTrialOrSubscribedGetTheStudio() {
        #expect(RootScreen.pick(onboarded: false, access: .subscribed(productID: "y", until: nil)) == .onboarding)
        #expect(RootScreen.pick(onboarded: true, access: .checking) == .loading)
        #expect(RootScreen.pick(onboarded: true, access: .locked) == .games)
        #expect(RootScreen.pick(onboarded: true, access: .trial(until: .distantFuture)) == .studio)
        #expect(RootScreen.pick(onboarded: true, access: .subscribed(productID: "y", until: nil)) == .studio)
        #expect(RootScreen.pick(onboarded: true, access: .beta) == .studio)
    }

    @Test func linkPendingAtMountPicksItsTab() {
        #expect(LaunchRouting.tab(for: nil, current: .learn) == .learn)
        #expect(LaunchRouting.tab(for: .group("7K3M9QX2PD"), current: .today) == .account)
        #expect(LaunchRouting.tab(for: .langs(root: "en", targets: ["es"]), current: .today) == .learn)
        #expect(LaunchRouting.tab(for: .voice, current: .account) == .learn)
        #expect(LaunchRouting.tab(for: .home, current: .learn) == .today)
    }
}
