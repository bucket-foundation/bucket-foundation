import XCTest

@MainActor
final class LaunchLinkUITests: XCTestCase {
    override func setUp() {
        continueAfterFailure = false
    }

    func testALinkPendingAtLaunchPicksItsTabInBucket() {
        let app = XCUIApplication()
        app.launchArguments = ["-AppleLanguages", "(en)", "-AppleLocale", "en_US", "-startTab", "account", "-launchLink", "bucket://voice"]
        app.launch()
        let learn = app.tabBars.buttons["Learn"]
        XCTAssertTrue(learn.waitForExistence(timeout: 60))
        let selected = NSPredicate(format: "isSelected == true")
        XCTAssertEqual(XCTWaiter().wait(for: [XCTNSPredicateExpectation(predicate: selected, object: learn)], timeout: 20), .completed)
        XCTAssertFalse(app.tabBars.buttons["Account"].isSelected)
    }
}
