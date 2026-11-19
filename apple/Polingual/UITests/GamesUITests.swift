import XCTest

@MainActor
final class GamesUITests: XCTestCase {
    private func launch(_ extra: [String], orientation: String? = nil, asked: String = "guest") -> XCUIApplication {
        let app = XCUIApplication()
        app.launchArguments = ["-polingual.onboarded", "YES", "-polingualOpen", "-polingualOrientation", orientation ?? ProcessInfo.processInfo.environment["GAME_ORIENT"] ?? "portrait", "-startTab", "learn", "-openLang", "en:es,fr,de:none", "-polingualDemo", "40", "-polingual.saveProgress", "NO", "-polingual.knownAskedOwners", asked] + extra
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
            guard let choice = try? choices.firstMatch.snapshot(), choice.isEnabled, !choice.frame.isEmpty else {
                usleep(100_000)
                continue
            }
            app.coordinate(withNormalizedOffset: .zero).withOffset(CGVector(dx: choice.frame.midX, dy: choice.frame.midY)).tap()
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

    func testMiniKeyFillsTheActiveSquare() {
        let app = launch(["-openGame", "mini"])
        let empty = app.buttons.matching(NSPredicate(format: "label == %@", "Empty square"))
        XCTAssertTrue(empty.firstMatch.waitForExistence(timeout: 60))
        let before = empty.count
        let key = app.buttons.allElementsBoundByIndex.first { $0.label.count == 1 && $0.label.uppercased() == $0.label && $0.isHittable }
        XCTAssertNotNil(key)
        key?.tap()
        key?.tap()
        XCTAssertEqual(empty.count, before - 2)
        shot("mini-typed")
    }

    private func checkPolywordBoard(_ app: XCUIApplication, shot name: String) {
        let keys = app.buttons.matching(identifier: "polyword.key")
        XCTAssertTrue(keys.firstMatch.waitForExistence(timeout: 60))
        let screen = app.windows.firstMatch.frame
        let enter = app.buttons["polyword.enter"]
        let delete = app.buttons["polyword.delete"]
        XCTAssertEqual(keys.count, 26)
        for key in keys.allElementsBoundByIndex + [enter, delete] {
            XCTAssertGreaterThanOrEqual(key.frame.minX, screen.minX)
            XCTAssertLessThanOrEqual(key.frame.maxX, screen.maxX)
            XCTAssertLessThanOrEqual(key.frame.maxY, screen.maxY)
            XCTAssertTrue(key.isHittable)
        }
        let typed = app.staticTexts.matching(NSPredicate(format: "label IN %@", ["Q", "W", "E", "R", "T"]))
        XCTAssertFalse(enter.isEnabled)
        for letter in ["Q", "W", "E", "R", "T"] { keys.matching(NSPredicate(format: "label == %@", letter)).firstMatch.tap() }
        XCTAssertEqual(typed.count, 5)
        XCTAssertTrue(typed.firstMatch.isHittable, "The active row is hidden")
        XCTAssertTrue(enter.isEnabled)
        shot(name)
        delete.tap()
        XCTAssertEqual(typed.count, 4)
        XCTAssertFalse(enter.isEnabled)
    }

    func testPolywordKeyboardFitsTheScreen() {
        checkPolywordBoard(launch(["-openGame", "polyword"]), shot: "polyword-board")
    }

    func testPolywordKeyboardFitsInLandscape() {
        checkPolywordBoard(launch(["-openGame", "polyword"], orientation: "landscape"), shot: "polyword-landscape")
    }

    func testPolywordResultHidesTheKeyboard() {
        let app = launch(["-openGame", "polyword", "-endGame"])
        XCTAssertTrue(app.staticTexts["playResults"].waitForExistence(timeout: 60))
        XCTAssertEqual(app.buttons.matching(identifier: "polyword.key").count, 0)
        XCTAssertFalse(app.buttons["polyword.enter"].exists)
    }

    private func checkBabelBoard(orientation: String, shot name: String) {
        let app = launch(["-openGame", "babel"], orientation: orientation)
        let cells = app.buttons.matching(identifier: "babelCell")
        let hint = app.buttons["babelHint"]
        XCTAssertTrue(cells.firstMatch.waitForExistence(timeout: 60))
        let screen = app.windows.firstMatch.frame
        XCTAssertEqual(cells.count, 36)
        for cell in cells.allElementsBoundByIndex + [hint] {
            XCTAssertGreaterThanOrEqual(cell.frame.minY, screen.minY)
            XCTAssertLessThanOrEqual(cell.frame.maxY, screen.maxY)
            XCTAssertGreaterThanOrEqual(cell.frame.height, 44)
            XCTAssertTrue(cell.isHittable)
        }
        XCTAssertTrue(app.staticTexts["playTitle"].isHittable)
        XCTAssertTrue(app.buttons["startLearning"].isHittable)
        shot(name)
    }

    func testLanguagesSheetStaysOffAGame() {
        let app = launch(["-openGame", "babel", "-knownBlank"], asked: "none")
        XCTAssertTrue(app.buttons.matching(identifier: "babelCell").firstMatch.waitForExistence(timeout: 60))
        XCTAssertFalse(app.staticTexts["Which languages do you speak?"].waitForExistence(timeout: 12))
        XCTAssertTrue(app.buttons["babelHint"].isHittable)
    }

    func testLanguagesSheetStaysOffADailyGame() {
        let app = launch(["-openGame", "mini", "-knownBlank"], asked: "none")
        let square = app.buttons.matching(NSPredicate(format: "label == %@", "Empty square")).firstMatch
        XCTAssertTrue(square.waitForExistence(timeout: 60))
        XCTAssertFalse(app.staticTexts["Which languages do you speak?"].waitForExistence(timeout: 12))
        XCTAssertTrue(square.isHittable)
    }

    func testBabelBoardFitsTheScreen() {
        checkBabelBoard(orientation: "portrait", shot: "babel-board")
    }

    func testBabelBoardFitsInLandscape() {
        checkBabelBoard(orientation: "landscape", shot: "babel-landscape")
    }

    private func checkPlayStarts(_ game: String, start: String, board: XCUIElementQuery, orientation: String) {
        let app = launch(["-openGame", game], orientation: orientation)
        XCTAssertTrue(app.buttons[start].waitForExistence(timeout: 60))
        app.buttons[start].tap()
        XCTAssertTrue(board.firstMatch.waitForExistence(timeout: 20))
        let screen = app.windows.firstMatch.frame
        shot("\(game)-\(orientation)")
        XCTAssertGreaterThanOrEqual(board.firstMatch.frame.minY, screen.minY)
        XCTAssertLessThanOrEqual(board.firstMatch.frame.maxY, screen.maxY, "\(game) board runs past the screen in \(orientation)")
        XCTAssertGreaterThanOrEqual(board.firstMatch.frame.height, orientation == "portrait" ? screen.height * 0.5 : 200, "\(game) board leaves the screen unused in \(orientation)")
    }

    func testFlagTilesStartsInBothOrientations() {
        for orientation in ["portrait", "landscape"] {
            checkPlayStarts("flagTiles", start: "Start", board: XCUIApplication().buttons.matching(identifier: "flagLane-0"), orientation: orientation)
        }
    }

    func testWordSnakeStartsInBothOrientations() {
        for orientation in ["portrait", "landscape"] {
            checkPlayStarts("snake", start: "Start", board: XCUIApplication().descendants(matching: .any).matching(identifier: "snakeArena"), orientation: orientation)
            XCTAssertTrue(XCUIApplication().buttons["End round"].isHittable)
        }
    }

    func testTilesStartsInBothOrientations() {
        for orientation in ["portrait", "landscape"] {
            checkPlayStarts("tiles", start: "Go", board: XCUIApplication().descendants(matching: .any).matching(identifier: "tilesBoard"), orientation: orientation)
        }
    }

    func testTilesLandscapeKeepsLanesAtLargeType() {
        let app = launch(["-openGame", "tiles", "-UIPreferredContentSizeCategoryName", "UICTContentSizeCategoryAccessibilityL"], orientation: "landscape")
        XCTAssertTrue(app.buttons["Go"].waitForExistence(timeout: 60))
        app.buttons["Go"].tap()
        let board = app.descendants(matching: .any).matching(identifier: "tilesBoard").firstMatch
        let gloss = app.staticTexts["tilesGloss"]
        XCTAssertTrue(board.waitForExistence(timeout: 20))
        XCTAssertTrue(gloss.waitForExistence(timeout: 5))
        let screen = app.windows.firstMatch.frame
        shot("tiles-landscape-large-type")
        XCTAssertGreaterThanOrEqual(board.frame.width, 316, "The lanes lose their width at large type")
        XCTAssertLessThanOrEqual(board.frame.maxY, screen.maxY)
        XCTAssertLessThanOrEqual(gloss.frame.maxX, board.frame.minX, "The prompt runs under the board")
        XCTAssertGreaterThanOrEqual(gloss.frame.minX, screen.minX)
        XCTAssertGreaterThanOrEqual(board.frame.minX - screen.minX, 264, "The prompt column stays at its small-type width")
        XCTAssertGreaterThanOrEqual(gloss.frame.minY, screen.minY)
    }

    func testLearnListsNoGames() {
        let app = launch(["-learnScroll", "content"])
        let content = app.staticTexts["Content"]
        XCTAssertTrue(content.waitForExistence(timeout: 60))
        XCTAssertFalse(app.staticTexts["Games"].exists)
        XCTAssertFalse(app.staticTexts["Daily Set"].exists)
        shot("learn-no-games")
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
