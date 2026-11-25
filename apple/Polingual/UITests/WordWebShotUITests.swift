import XCTest

final class WordWebShotUITests: XCTestCase {
    private func launch(_ lang: String, _ kind: String, _ extra: [String] = []) -> XCUIApplication {
        let app = XCUIApplication()
        app.launchArguments = ["-polingual.onboarded", "YES", "-polingualOpen", "-polingualOrientation", "portrait", "-startTab", "learn", "-openLang", lang, "-forceKind", kind, "-polingual.saveProgress", "NO", "-polingual.knownAskedOwners", "guest", "-AppleLanguages", "(en)"] + extra
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

    func testFindTheLetterCard() {
        let app = launch("en:ru:study", "letter")
        let header = app.staticTexts.matching(NSPredicate(format: "label ==[c] %@", "find the letter")).firstMatch
        XCTAssertTrue(header.waitForExistence(timeout: 60))
        XCTAssertEqual(app.staticTexts.matching(NSPredicate(format: "label ==[c] %@", "find the letter")).count, 1)
        shot("74-letter-before")
        app.coordinate(withNormalizedOffset: CGVector(dx: 0.3, dy: 0.62)).tap()
        sleep(1)
        shot("74-letter-after")
    }

    func testWordWebFullDetail() throws {
        let app = launch("en:es:study", "choose", ["-pickWrong"])
        let word = app.links.firstMatch
        XCTAssertTrue(word.waitForExistence(timeout: 60))
        let words = app.links.allElementsBoundByIndex.filter { $0.isHittable }
        try XCTUnwrap(words.max { $0.frame.width < $1.frame.width }, "No word on screen").tap()
        let full = app.buttons["Full detail"]
        XCTAssertTrue(full.waitForExistence(timeout: 10))
        sleep(2)
        shot("73-quick-card")
        full.tap()
        XCTAssertTrue(app.buttons["Done"].waitForExistence(timeout: 10))
        sleep(3)
        shot("73-full-detail-top")
        app.swipeUp()
        sleep(1)
        shot("73-full-detail-more")
    }
}
