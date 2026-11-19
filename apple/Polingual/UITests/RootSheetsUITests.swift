import XCTest

@MainActor
final class RootSheetsUITests: XCTestCase {
    private func launch(ageDelay: String) -> XCUIApplication {
        let app = XCUIApplication()
        app.launchArguments = ["-polingual.onboarded", "YES", "-polingualOpen", "-polingualOrientation", "portrait", "-startTab", "learn", "-openLang", "en:es,fr,de:none", "-polingualDemo", "40", "-polingual.saveProgress", "NO", "-polingual.knownAskedOwners", "none", "-knownBlank", "-ageRange", "-ageRangeDelay", ageDelay]
        app.launch()
        return app
    }

    private func shot(_ name: String) {
        guard let dir = ProcessInfo.processInfo.environment["GAME_SHOTS"] else { return }
        try? XCUIScreen.main.screenshot().pngRepresentation.write(to: URL(fileURLWithPath: dir).appendingPathComponent("\(name).png"))
    }

    override func setUp() {
        continueAfterFailure = false
    }

    func testLanguagesSheetWaitsForTheAgeSheet() {
        let app = launch(ageDelay: "0")
        let age = app.staticTexts["Your age range"]
        let languages = app.staticTexts["Which languages do you speak?"]
        XCTAssertTrue(age.waitForExistence(timeout: 60))
        XCTAssertFalse(languages.waitForExistence(timeout: 8))
        XCTAssertTrue(age.exists)
        shot("age-first")
        app.buttons["Later"].tap()
        XCTAssertTrue(languages.waitForExistence(timeout: 20))
        XCTAssertFalse(age.exists)
        shot("languages-second")
    }

    func testQueuedAgeSheetOpensAfterTheLanguagesSheet() {
        let app = launch(ageDelay: "6")
        let age = app.staticTexts["Your age range"]
        let languages = app.staticTexts["Which languages do you speak?"]
        XCTAssertTrue(languages.waitForExistence(timeout: 60))
        XCTAssertFalse(age.waitForExistence(timeout: 10))
        XCTAssertTrue(languages.exists)
        shot("languages-first")
        app.buttons["Later"].tap()
        XCTAssertTrue(age.waitForExistence(timeout: 20))
        XCTAssertFalse(languages.exists)
        shot("age-second")
    }
}
