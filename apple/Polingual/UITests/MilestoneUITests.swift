import XCTest

@MainActor
final class MilestoneUITests: XCTestCase {
    private func launch(_ milestone: String) -> XCUIApplication {
        let app = XCUIApplication()
        app.launchArguments = ["-polingual.onboarded", "YES", "-polingualOpen", "-startTab", "today", "-openLang", "en:es,fr,de:none", "-polingual.saveProgress", "NO",
                               "-AppleLanguages", "(en)", "-milestone", milestone]
        app.launch()
        return app
    }

    private func shot(_ name: String) {
        guard let dir = ProcessInfo.processInfo.environment["GAME_SHOTS"] else { return }
        try? XCUIScreen.main.screenshot().pngRepresentation.write(to: URL(fileURLWithPath: dir).appendingPathComponent("\(name).png"))
    }

    private func text(_ app: XCUIApplication, _ label: String) -> XCUIElement {
        app.staticTexts.matching(NSPredicate(format: "label CONTAINS %@", label)).firstMatch
    }

    override func setUp() {
        continueAfterFailure = false
    }

    func testCountingSkillShowsAndOffersItsCard() {
        let app = launch("skill:count:es")
        XCTAssertTrue(text(app, "Count to 10").waitForExistence(timeout: 60))
        XCTAssertTrue(text(app, "in Spanish").exists)
        shot("skill-count-es")
        app.buttons.matching(NSPredicate(format: "label CONTAINS %@", "Share")).firstMatch.tap()
        XCTAssertTrue(text(app, "Share your milestone").waitForExistence(timeout: 20))
        shot("skill-count-es-share")
    }

    func testOrderingSkillShows() {
        let app = launch("skill:order:de")
        XCTAssertTrue(text(app, "Order food").waitForExistence(timeout: 60))
        XCTAssertTrue(text(app, "in German").exists)
        shot("skill-order-de")
    }

    func testHelloNamesEveryLanguage() {
        let app = launch("hello:es:fr:de")
        XCTAssertTrue(text(app, "Hello in 3 languages").waitForExistence(timeout: 60))
        XCTAssertTrue(text(app, "hola").exists)
        shot("hello-3")
        app.buttons.matching(NSPredicate(format: "label CONTAINS %@", "Share")).firstMatch.tap()
        XCTAssertTrue(text(app, "Share this word").waitForExistence(timeout: 20))
        shot("hello-3-share")
    }

    func testFirstSentenceShowsTheSentence() {
        let app = launch("skill:sentence:es")
        XCTAssertTrue(text(app, "First sentence").waitForExistence(timeout: 60))
        XCTAssertFalse(text(app, "in Spanish").exists)
        shot("skill-sentence-es")
        app.buttons.matching(NSPredicate(format: "label CONTAINS %@", "Share")).firstMatch.tap()
        XCTAssertTrue(text(app, "Share your milestone").waitForExistence(timeout: 20))
        shot("skill-sentence-es-share")
    }
}
