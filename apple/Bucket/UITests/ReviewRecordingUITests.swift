import XCTest

final class ReviewRecordingUITests: XCTestCase {
    override func setUp() {
        continueAfterFailure = false
    }

    func testRecordingFlow() {
        let app = XCUIApplication()
        let lead = ReviewWalk(app: app).lead
        Thread.sleep(forTimeInterval: lead)
        app.launchArguments = ["-AppleLanguages", "(en)", "-AppleLocale", "en_US"] + (ReviewWalk.onDevice ? [] : ["-demoGroup", "joined"])
        app.launch()
        let walk = ReviewWalk(app: app)
        walk.tap(app.buttons["Account"].firstMatch, timeout: 60)
        walk.accountFlows()
    }
}
