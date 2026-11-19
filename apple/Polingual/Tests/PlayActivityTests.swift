import Testing
@testable import Polingual

@MainActor
struct PlayActivityTests {
    @Test func idleUntilASessionEnters() {
        #expect(!PlayActivity().playing)
    }

    @Test func oneSessionHoldsUntilItLeaves() {
        let activity = PlayActivity()
        activity.enter()
        #expect(activity.playing)
        activity.leave()
        #expect(!activity.playing)
    }

    @Test func aPushedSessionKeepsTheHoldWhileTheFirstIsCovered() {
        let activity = PlayActivity()
        activity.enter()
        activity.enter()
        activity.leave()
        #expect(activity.playing)
        activity.leave()
        #expect(!activity.playing)
    }

    @Test func anExtraLeaveDoesNotCancelTheNextSession() {
        let activity = PlayActivity()
        activity.leave()
        activity.enter()
        #expect(activity.playing)
        #expect(activity.scenes == 1)
    }
}
