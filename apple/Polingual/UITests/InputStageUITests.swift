import XCTest

final class InputStageUITests: XCTestCase {
    override func setUp() {
        continueAfterFailure = false
    }

    func shot(_ name: String) {
        let dir = ProcessInfo.processInfo.environment["INPUT_SHOTS"] ?? NSTemporaryDirectory()
        try? XCUIScreen.main.screenshot().pngRepresentation.write(to: URL(fileURLWithPath: dir).appendingPathComponent("\(name).png"))
        let a = XCTAttachment(screenshot: XCUIScreen.main.screenshot())
        a.name = name
        a.lifetime = .keepAlways
        add(a)
    }

    func dismissPrompts(_ app: XCUIApplication, until target: XCUIElement, timeout: TimeInterval = 60) {
        let deadline = Date().addingTimeInterval(timeout)
        while !target.exists && Date() < deadline {
            for label in ["Not now", "Get started", "Continue"] where app.buttons[label].exists && app.buttons[label].isHittable {
                app.buttons[label].tap()
            }
            Thread.sleep(forTimeInterval: 1)
        }
    }

    func testInputStageTapAndReveal() throws {
        let base = ProcessInfo.processInfo.environment["INPUT_BASE"] ?? "http://127.0.0.1:8765"
        let app = XCUIApplication()
        app.launchArguments = ["-AppleLanguages", "(en)", "-AppleLocale", "en_US", "-adsOff", "-startTab", "learn", "-openLang", "en:es:study", "-inputNow", "-inputBase", base]
        app.launch()

        let start = app.buttons["input-start"]
        dismissPrompts(app, until: start)
        XCTAssertTrue(start.waitForExistence(timeout: 30))
        shot("1-gloss")
        start.tap()

        let done = app.buttons["input-done"]
        XCTAssertTrue(done.waitForExistence(timeout: 10))
        shot("2-play")

        let word = app.buttons.matching(NSPredicate(format: "value == %@", "not tapped")).firstMatch
        XCTAssertTrue(word.waitForExistence(timeout: 5))
        let label = word.label
        word.tap()
        XCTAssertEqual(app.buttons[label].firstMatch.value as? String, "tapped")
        shot("3-tapped")

        let meaning = app.buttons["Show meaning"].firstMatch
        XCTAssertTrue(meaning.waitForExistence(timeout: 5))
        meaning.tap()
        shot("4-meaning")
    }
}
