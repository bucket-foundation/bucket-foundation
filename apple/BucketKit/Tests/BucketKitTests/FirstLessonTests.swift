import Foundation
import Testing
@testable import BucketKit

struct FirstLessonTests {
    @Test func aLockedLearnerMeetsThePaywallAfterTheFirstLesson() {
        #expect(FirstLesson.paywallAfter(open: false, done: true))
        #expect(!FirstLesson.paywallAfter(open: false, done: false))
        #expect(!FirstLesson.paywallAfter(open: true, done: true))
    }

    @Test func onlyAGradedSessionCountsAndItAnnouncesItself() {
        let defaults = UserDefaults(suiteName: "first-lesson-\(UUID().uuidString)")!
        let center = NotificationCenter()
        var heard = 0
        let token = center.addObserver(forName: FirstLesson.finished, object: nil, queue: nil) { _ in heard += 1 }
        #expect(!FirstLesson.mark(graded: 0, defaults: defaults, center: center))
        #expect(!FirstLesson.done(defaults))
        #expect(FirstLesson.mark(graded: 3, defaults: defaults, center: center))
        #expect(FirstLesson.done(defaults))
        #expect(heard == 1)
        center.removeObserver(token)
    }
}
