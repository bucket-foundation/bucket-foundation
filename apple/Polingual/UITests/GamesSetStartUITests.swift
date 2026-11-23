import XCTest

@MainActor
final class GamesSetStartUITests: XCTestCase {
    override func setUp() {
        continueAfterFailure = false
    }

    override func tearDown() {
        XCUIDevice.shared.orientation = .portrait
    }

    private func launch(orientation: String) -> XCUIApplication {
        XCUIDevice.shared.orientation = orientation == "landscape" ? .landscapeLeft : .portrait
        let app = XCUIApplication()
        app.launchArguments = ["-polingual.onboarded", "YES", "-polingualLocked", "-freshGuest", "-adsOff", "-startTab", "games", "-polingualOrientation", orientation, "-polingual.saveProgress", "NO", "-polingual.knownAskedOwners", "guest"]
        app.launch()
        return app
    }

    private func shot(_ name: String) {
        guard let dir = ProcessInfo.processInfo.environment["GAME_SHOTS"] else { return }
        try? XCUIScreen.main.screenshot().pngRepresentation.write(to: URL(fileURLWithPath: dir).appendingPathComponent("\(name).png"))
    }

    private func checkStart(orientation: String) {
        let app = launch(orientation: orientation)
        let prompt = app.staticTexts["Pick the languages your games use."]
        XCTAssertTrue(prompt.waitForExistence(timeout: 60), "Play tab shows no set start")
        XCTAssertFalse(app.staticTexts["Start a language set in Learn. The games use the words you study."].exists)
        XCTAssertTrue(app.buttons["games.speak"].isHittable)
        let romance = app.buttons.matching(NSPredicate(format: "label BEGINSWITH %@", "Romance")).firstMatch
        XCTAssertTrue(romance.waitForExistence(timeout: 10))
        let scroll = app.scrollViews.firstMatch
        for _ in 0..<4 where !romance.isHittable {
            scroll.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.7)).press(forDuration: 0.05, thenDragTo: scroll.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.2)))
            usleep(600_000)
        }
        XCTAssertTrue(romance.isHittable)
        shot("games-start-\(orientation)")
        romance.tap()
        XCTAssertTrue(prompt.waitForNonExistence(timeout: 30), "Picking a preset left the set start on screen")
        XCTAssertTrue(app.buttons["lobbiesTile"].waitForExistence(timeout: 30), "The games board did not appear after the set was made")
        shot("games-start-\(orientation)-made")
    }

    func testLockedGuestStartsASetFromPlayPortrait() {
        checkStart(orientation: "portrait")
    }

    func testLockedGuestStartsASetFromPlayLandscape() {
        checkStart(orientation: "landscape")
    }
}
