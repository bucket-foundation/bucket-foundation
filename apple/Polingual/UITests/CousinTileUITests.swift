import XCTest

final class CousinTileUITests: XCTestCase {
    private func launch(_ extra: [String]) -> XCUIApplication {
        let app = XCUIApplication()
        app.launchArguments = ["-polingual.onboarded", "YES", "-polingualOpen", "-polingualOrientation", "portrait", "-startTab", "learn", "-openLang", "en:de,sv:study", "-forceKind", "cognate", "-forceItem", "nose"] + extra
        app.launch()
        return app
    }

    override func setUp() {
        continueAfterFailure = false
    }

    func testCousinTileOpensItsWord() throws {
        let app = launch([])
        let answer = app.buttons["cousinAnswer"]
        XCTAssertTrue(answer.waitForExistence(timeout: 60))
        XCTAssertFalse(answer.isEnabled)
        let cousin = try XCTUnwrap(app.buttons.matching(identifier: "cousinTile").allElementsBoundByIndex.first { $0.isHittable }, "No cousin tile")
        cousin.tap()
        XCTAssertTrue(app.staticTexts["The meaning shows after you answer."].waitForExistence(timeout: 10))
    }

    func testAnswerTileFillsAndPlaysAfterAnswer() {
        let app = launch(["-pickWrong"])
        let answer = app.buttons["cousinAnswer"]
        XCTAssertTrue(answer.waitForExistence(timeout: 60))
        XCTAssertTrue(answer.isEnabled)
        XCTAssertFalse(answer.label.contains("?"))
        answer.tap()
        XCTAssertTrue(app.buttons["Full detail"].waitForExistence(timeout: 10))
    }
}
