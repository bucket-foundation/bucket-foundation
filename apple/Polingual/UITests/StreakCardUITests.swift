import XCTest

@MainActor
final class StreakCardUITests: XCTestCase {
    private func launch(day: Int) -> XCUIApplication {
        let app = XCUIApplication()
        app.launchArguments = ["-polingual.onboarded", "YES", "-polingualOpen", "-startTab", "today", "-openLang", "en:es,fr,de:none", "-polingual.saveProgress", "NO", "-uncountedDay", "\(day)"]
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

    func testUncountedDayNamesTodayAndAsksForStudy() {
        let app = launch(day: 29)
        let card = app.descendants(matching: .any).matching(NSPredicate(format: "label CONTAINS %@", "Day 29 of 100")).firstMatch
        XCTAssertTrue(card.waitForExistence(timeout: 60))
        XCTAssertTrue(card.label.contains("Study today to count day 29."))
        shot("gray-day-29")
    }
}
