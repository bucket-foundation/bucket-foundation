import XCTest

final class GamesUITests: XCTestCase {
    private func launch(_ extra: [String]) -> XCUIApplication {
        let app = XCUIApplication()
        app.launchArguments = ["-polingual.onboarded", "YES", "-polingualOpen", "-polingualOrientation", ProcessInfo.processInfo.environment["GAME_ORIENT"] ?? "portrait", "-polingualExtra", "games", "-openLang", "en:es,fr,de:none", "-polingualDemo", "40"] + extra
        app.launch()
        return app
    }

    private func shot(_ name: String) {
        guard let dir = ProcessInfo.processInfo.environment["GAME_SHOTS"] else { return }
        try? XCUIScreen.main.screenshot().pngRepresentation.write(to: URL(fileURLWithPath: dir).appendingPathComponent("\(name).png"))
    }

    private func playQuiz(_ app: XCUIApplication, until end: XCUIElement, name: String) {
        let choices = app.buttons.matching(identifier: "game-choice")
        XCTAssertTrue(choices.firstMatch.waitForExistence(timeout: 60))
        for i in 0..<20 {
            while !end.exists && !(choices.firstMatch.exists && choices.firstMatch.isEnabled) { usleep(100_000) }
            if end.exists { return }
            choices.element(boundBy: i % choices.count).tap()
            if i == 1 { shot("\(name)-answered") }
        }
        XCTFail("The round did not end")
    }

    override func setUp() {
        continueAfterFailure = false
    }

    func testDailySetCreditsTheDayAndHoldsTheResult() {
        let app = launch(["-openGame", "daily"])
        playQuiz(app, until: app.staticTexts["New set tomorrow."], name: "daily")
        shot("daily-end")
        app.terminate()
        let back = launch(["-openGame", "daily"])
        XCTAssertTrue(back.staticTexts["New set tomorrow."].waitForExistence(timeout: 60))
        XCTAssertFalse(back.buttons["game-choice"].exists)
        XCTAssertFalse(back.buttons["Play again"].exists)
    }

    func testSameWordFinishes() {
        let app = launch(["-openGame", "same"])
        playQuiz(app, until: app.buttons["Play again"], name: "same")
        shot("same-end")
    }

    func testFlagsRoundEnds() {
        let app = launch(["-openGame", "flags"])
        playQuiz(app, until: app.buttons["Play again"], name: "flags")
        shot("flags-end")
    }

    func testWhichVoiceAndLetterSprintOpen() {
        let voice = launch(["-openGame", "voice"])
        XCTAssertTrue(voice.buttons.matching(identifier: "game-choice").firstMatch.waitForExistence(timeout: 60))
        shot("voice-play")
        voice.terminate()
        let letters = launch(["-openGame", "letters"])
        XCTAssertTrue(letters.staticTexts["Which letter makes this sound?"].waitForExistence(timeout: 60))
        shot("letters-play")
    }

    func testSpeedMatchRunsOutOfTime() {
        let app = launch(["-openGame", "match", "-gameSeconds", "8"])
        let meanings = app.buttons.matching(identifier: "game-meaning")
        let forms = app.buttons.matching(identifier: "game-form")
        XCTAssertTrue(meanings.firstMatch.waitForExistence(timeout: 60))
        meanings.element(boundBy: 0).tap()
        forms.element(boundBy: 0).tap()
        shot("match-play")
        XCTAssertTrue(app.buttons["Play again"].waitForExistence(timeout: 20))
        shot("match-end")
    }
}
