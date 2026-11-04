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
        let words = app.links.allElementsBoundByIndex.filter { $0.isHittable }
        try XCTUnwrap(words.max { $0.frame.width < $1.frame.width }, "No word on screen").tap()
        let full = app.buttons["Full detail"]
        XCTAssertTrue(full.waitForExistence(timeout: 10))
        full.tap()
        let done = app.buttons["Done"]
        XCTAssertTrue(done.waitForExistence(timeout: 10))
        let title = app.navigationBars.allElementsBoundByIndex.last?.identifier ?? ""
        let inSheet = app.links.allElementsBoundByIndex.last { $0.isHittable && $0.label.lowercased() != title.lowercased() }
        guard let target = inSheet else {
            throw XCTSkip("\(title) has no example sentence to tap")
        }
        target.tap()
        let pushed = XCTNSPredicateExpectation(predicate: NSPredicate(format: "exists == false"), object: done)
        XCTAssertEqual(XCTWaiter().wait(for: [pushed], timeout: 5), .completed)
        let back = try XCTUnwrap(app.navigationBars.buttons.matching(identifier: "BackButton").allElementsBoundByIndex.last { $0.isHittable }, "No back button")
        back.tap()
        XCTAssertTrue(done.waitForExistence(timeout: 5))
        done.tap()
        XCTAssertTrue(full.waitForExistence(timeout: 10))
    }
}
