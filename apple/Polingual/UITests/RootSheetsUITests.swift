import XCTest

@MainActor
final class RootSheetsUITests: XCTestCase {
    private func launch(ageAfter: String? = nil) -> XCUIApplication {
        let app = XCUIApplication()
        app.launchArguments = ["-polingual.onboarded", "YES", "-polingualOpen", "-polingualOrientation", "portrait", "-startTab", "learn", "-openLang", "en:es,fr,de:none", "-polingualDemo", "40", "-polingual.saveProgress", "NO", "-polingual.knownAskedOwners", "none", "-knownBlank", "-rootSheetProbe", "-ageRange"] + (ageAfter.map { ["-ageRangeAfter", $0] } ?? [])
        app.launch()
        return app
    }

    private func waitForHeld(_ sheet: String, in app: XCUIApplication) -> Bool {
        let probe = app.descendants(matching: .any)["rootSheetsHeld"]
        let held = NSPredicate { element, _ in
            ((element as? XCUIElement)?.value as? String)?.split(separator: ",").contains(Substring(sheet)) ?? false
        }
        return XCTWaiter().wait(for: [XCTNSPredicateExpectation(predicate: held, object: probe)], timeout: 60) == .completed
    }

    private func shot(_ name: String) {
        guard let dir = ProcessInfo.processInfo.environment["GAME_SHOTS"] else { return }
        try? XCUIScreen.main.screenshot().pngRepresentation.write(to: URL(fileURLWithPath: dir).appendingPathComponent("\(name).png"))
    }

    override func setUp() {
        continueAfterFailure = false
    }

    func testLanguagesSheetWaitsForTheAgeSheet() {
        let app = launch()
        let age = app.staticTexts["Your age range"]
        let languages = app.staticTexts["Which languages do you speak?"]
        XCTAssertTrue(age.waitForExistence(timeout: 60))
        XCTAssertTrue(waitForHeld("knownLanguages", in: app))
        XCTAssertTrue(age.exists)
        XCTAssertFalse(languages.exists)
        shot("age-first")
        app.buttons["ageRangeLater"].tap()
        XCTAssertTrue(languages.waitForExistence(timeout: 20))
        XCTAssertFalse(age.exists)
        shot("languages-second")
    }

    func testQueuedAgeSheetOpensAfterTheLanguagesSheet() {
        let app = launch(ageAfter: "knownLanguages")
        let age = app.staticTexts["Your age range"]
        let languages = app.staticTexts["Which languages do you speak?"]
        XCTAssertTrue(languages.waitForExistence(timeout: 60))
        XCTAssertTrue(waitForHeld("ageRange", in: app))
        XCTAssertTrue(languages.exists)
        XCTAssertFalse(age.exists)
        shot("languages-first")
        app.buttons["knownLanguagesLater"].tap()
        XCTAssertTrue(age.waitForExistence(timeout: 20))
        XCTAssertFalse(languages.exists)
        shot("age-second")
    }
}
