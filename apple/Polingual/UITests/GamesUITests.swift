import XCTest

final class GamesUITests: XCTestCase {
    private func launch(_ extra: [String]) -> XCUIApplication {
        let app = XCUIApplication()
        app.launchArguments = ["-polingual.onboarded", "YES", "-polingualOpen", "-polingualOrientation", ProcessInfo.processInfo.environment["GAME_ORIENT"] ?? "portrait", "-startTab", "learn", "-openLang", "en:es,fr,de:none", "-polingualDemo", "40"] + extra
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
        var taps = 0
        let deadline = Date().addingTimeInterval(180)
        while taps < 20 && Date() < deadline {
            if end.exists { return }
            let choice = choices.firstMatch
            guard choice.exists && choice.isEnabled && choice.isHittable else {
                usleep(100_000)
                continue
            }
            choice.tap()
            taps += 1
            if taps == 2 { shot("\(name)-answered") }
        }
        XCTAssertTrue(end.waitForExistence(timeout: 10), "The round did not end")
    }

    override func setUp() {
        continueAfterFailure = false
    }

    func testDailySetCreditsTheDayAndHoldsTheResult() {
        let app = launch(["-openGame", "daily", "-freshDaily"])
        playQuiz(app, until: app.staticTexts["New set tomorrow."], name: "daily")
        shot("daily-end")
        app.terminate()
        let back = launch(["-openGame", "daily"])
        XCTAssertTrue(back.staticTexts["New set tomorrow."].waitForExistence(timeout: 60))
        XCTAssertTrue(back.buttons["Share your result"].waitForExistence(timeout: 10))
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
        let prompt = letters.staticTexts.matching(NSPredicate(format: "label IN %@", ["Which letter makes this sound?", "Which character completes this word?", "Which tone did you hear?"])).firstMatch
        XCTAssertTrue(prompt.waitForExistence(timeout: 60))
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
