import Foundation
import Testing
@testable import Polingual

@MainActor
@Suite(.serialized)
struct LaunchRoutingTests {
    @Test func staleStudyRequestFallsThroughToPlacement() {
        let now = Date(timeIntervalSince1970: 1_800_000_000)
        UserDefaults.standard.set(now.timeIntervalSince1970 - 600, forKey: StudyRequest.key)
        #expect(StudyRequest.pending)
        let taken = StudyRequest.pending && StudyRequest.take(now: now)
        #expect(!taken)
        #expect(!StudyRequest.pending)
        #expect(LaunchRouting.step(requestTaken: taken, firstSystem: "en-ru") == .place("en-ru"))
    }

    @Test func freshStudyRequestOpensStudy() {
        let now = Date(timeIntervalSince1970: 1_800_000_000)
        UserDefaults.standard.set(now.timeIntervalSince1970 - 5, forKey: StudyRequest.key)
        let taken = StudyRequest.pending && StudyRequest.take(now: now)
        #expect(taken)
        #expect(LaunchRouting.step(requestTaken: taken, firstSystem: "en-ru") == .study)
        #expect(LaunchRouting.step(requestTaken: false, firstSystem: "") == .none)
    }
}
