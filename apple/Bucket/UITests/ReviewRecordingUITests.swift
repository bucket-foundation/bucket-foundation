import XCTest

final class ReviewRecordingUITests: XCTestCase {
    override func setUp() {
        continueAfterFailure = false
    }

    func testRecordingFlow() {
        let app = XCUIApplication()
        ReviewWalk(app: app).startRecording()
        app.launchArguments = ["-AppleLanguages", "(en)", "-AppleLocale", "en_US"] + (ReviewWalk.onDevice ? [] : ["-demoGroup", "joined"])
        app.launch()
        let walk = ReviewWalk(app: app)
        walk.threeTabs()
        walk.accountFlows()
        walk.toggleScreenRecording()
    }
}
