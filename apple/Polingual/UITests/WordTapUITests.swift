import XCTest

final class WordTapUITests: XCTestCase {
    private func launch(_ extra: [String]) -> XCUIApplication {
        let app = XCUIApplication()
        app.launchArguments = ["-polingual.onboarded", "YES", "-polingualOpen", "-polingualOrientation", "portrait", "-openLang", "en:es:study", "-forceKind", "choose"] + extra
        app.launch()
        return app
    }

    override func setUp() {
        continueAfterFailure = false
    }

    func testOptionTileTapEnablesCheck() {
        let app = launch([])
        let check = app.buttons["Check"]
        XCTAssertTrue(check.waitForExistence(timeout: 60))
        XCTAssertFalse(check.isEnabled)
        app.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.56)).tap()
        XCTAssertTrue(check.isEnabled)
    }

    func testWordTapInFullDetailKeepsTheSheetStack() throws {
        let app = launch(["-pickWrong"])
        let word = app.links.firstMatch
        XCTAssertTrue(word.waitForExistence(timeout: 60))
        word.tap()
        let full = app.buttons["Full detail"]
        XCTAssertTrue(full.waitForExistence(timeout: 10))
        full.tap()
        let done = app.buttons["Done"]
        XCTAssertTrue(done.waitForExistence(timeout: 10))
        let title = app.navigationBars.allElementsBoundByIndex.last?.identifier ?? ""
        let inSheet = app.links.allElementsBoundByIndex.last { $0.label.lowercased() != title.lowercased() }
        let target = try XCTUnwrap(inSheet, "Full detail shows no other tappable word")
        target.tap()
        let pushed = XCTNSPredicateExpectation(predicate: NSPredicate(format: "exists == false"), object: done)
        XCTAssertEqual(XCTWaiter().wait(for: [pushed], timeout: 5), .completed)
        let back = try XCTUnwrap(app.navigationBars.buttons.allElementsBoundByIndex.last)
        back.tap()
        XCTAssertTrue(done.waitForExistence(timeout: 5))
        done.tap()
        XCTAssertTrue(full.waitForExistence(timeout: 10))
    }
}
