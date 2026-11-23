import XCTest

@MainActor
final class GamesUITests: XCTestCase {
    private func launch(_ extra: [String], orientation: String? = nil, asked: String = "guest", motion: Bool = false) -> XCUIApplication {
        let app = XCUIApplication()
        app.launchArguments = ["-polingual.onboarded", "YES", "-polingualOpen", "-polingualOrientation", orientation ?? ProcessInfo.processInfo.environment["GAME_ORIENT"] ?? "portrait", "-startTab", "learn", "-openLang", "en:es,fr,de:none", "-polingualDemo", "40", "-polingual.saveProgress", "NO", "-polingual.knownAskedOwners", asked] + (motion ? [] : ["-reduceMotion"]) + extra
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
        XCTAssertTrue(back.descendants(matching: .any)["game-stars"].exists)
        XCTAssertFalse(back.descendants(matching: .any)["game-credit"].exists, "A held daily result credits again")
        XCTAssertFalse(back.buttons["game-choice"].exists)
        XCTAssertFalse(back.buttons["Play again"].exists)
    }

    func testMiniKeyFillsTheActiveSquare() {
        let app = launch(["-openGame", "mini", "-freshDaily"])
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

    private func polywordSize(_ app: XCUIApplication) -> Int {
        let label = app.staticTexts.matching(NSPredicate(format: "label CONTAINS[c] %@", " letters")).firstMatch
        guard label.waitForExistence(timeout: 10) else { return 0 }
        let words = label.label.lowercased().components(separatedBy: " ")
        guard let at = words.firstIndex(of: "letters"), at > 0 else { return 0 }
        return Int(words[at - 1]) ?? 0
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
        let size = polywordSize(app)
        XCTAssertGreaterThan(size, 0, "The board does not show its word length")
        let letters = Array("QWERTYUIOPASDFGHJKLZ".prefix(size)).map(String.init)
        let typed = app.staticTexts.matching(NSPredicate(format: "label IN %@", letters))
        XCTAssertFalse(enter.isEnabled)
        for letter in letters { keys.matching(NSPredicate(format: "label == %@", letter)).firstMatch.tap() }
        XCTAssertEqual(typed.count, size)
        XCTAssertTrue(typed.firstMatch.isHittable, "The active row is hidden")
        XCTAssertTrue(enter.isEnabled)
        shot(name)
        delete.tap()
        XCTAssertEqual(typed.count, size - 1)
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

    func testComboChipShowsAfterThreeRight() {
        let app = launch(["-openGame", "flags", "-revealAnswer"])
        let choice = app.buttons["game-choice"].firstMatch
        let combo = app.descendants(matching: .any)["game-combo"]
        XCTAssertTrue(choice.waitForExistence(timeout: 60))
        let header = app.descendants(matching: .any)["game-header"]
        XCTAssertTrue(header.exists)
        for _ in 0..<8 where !combo.exists {
            let right = app.buttons.matching(NSPredicate(format: "identifier == %@ AND value == %@", "game-choice", "answer")).firstMatch
            expectation(for: NSPredicate(format: "isEnabled == true"), evaluatedWith: right)
            waitForExpectations(timeout: 10)
            let before = header.label
            right.tap()
            expectation(for: NSPredicate(format: "label != %@", before), evaluatedWith: header)
            waitForExpectations(timeout: 5)
        }
        XCTAssertTrue(combo.waitForExistence(timeout: 3))
        shot("flags-combo")
    }

    func testAnswerFeedbackLeavesTheNextPromptTappable() {
        let app = launch(["-openGame", "flags", "-revealAnswer"], motion: true)
        let choice = app.buttons["game-choice"].firstMatch
        XCTAssertTrue(choice.waitForExistence(timeout: 60))
        let right = app.buttons.matching(NSPredicate(format: "identifier == %@ AND value == %@", "game-choice", "answer")).firstMatch
        right.tap()
        shot("burst")
        let wrong = app.buttons.matching(NSPredicate(format: "identifier == %@ AND value != %@", "game-choice", "answer")).firstMatch
        expectation(for: NSPredicate(format: "isEnabled == true"), evaluatedWith: wrong)
        waitForExpectations(timeout: 10)
        XCTAssertTrue(wrong.isHittable)
        wrong.tap()
        usleep(400_000)
        shot("wrong")
        XCTAssertFalse(app.descendants(matching: .any)["game-combo"].exists)
    }

    func testZeroHitRunStillGetsResults() {
        let app = launch(["-openGame", "flags", "-revealAnswer"])
        let choice = app.buttons["game-choice"].firstMatch
        let results = app.staticTexts["playResults"]
        XCTAssertTrue(choice.waitForExistence(timeout: 60))
        for _ in 0..<20 where !results.exists {
            let wrong = app.buttons.matching(NSPredicate(format: "identifier == %@ AND value != %@ AND isEnabled == true", "game-choice", "answer")).firstMatch
            guard wrong.waitForExistence(timeout: 5) else { continue }
            wrong.tap()
            expectation(for: NSPredicate(format: "isEnabled == false OR exists == false"), evaluatedWith: choice)
            waitForExpectations(timeout: 5)
        }
        XCTAssertTrue(results.waitForExistence(timeout: 10))
        XCTAssertEqual(results.label, "0 of 10")
        XCTAssertEqual(app.descendants(matching: .any)["game-stars"].label, "0 of 3 stars")
        XCTAssertTrue(app.descendants(matching: .any)["game-credit"].exists)
        XCTAssertTrue(app.buttons["Play again"].exists)
        shot("flags-zero")
    }

    func testStatusBarReturnsAfterAGame() {
        let app = launch(["-openGame", "flags", "-showPaywall"])
        XCTAssertTrue(app.buttons["Restore"].waitForExistence(timeout: 60))
        shot("statusbar-paywall-over-game")
        app.swipeDown(velocity: .fast)
        let choice = app.buttons["game-choice"].firstMatch
        XCTAssertTrue(choice.waitForExistence(timeout: 20))
        app.navigationBars.buttons.element(boundBy: 0).tap()
        let newSet = app.buttons.matching(NSPredicate(format: "label CONTAINS %@", "New set")).firstMatch
        XCTAssertTrue(newSet.waitForExistence(timeout: 20))
        shot("statusbar-learn-after-game")
        newSet.tap()
        sleep(2)
        shot("statusbar-sheet-after-game")
    }

    func testMiniShowAnswersEndsOnResults() {
        let app = launch(["-openGame", "mini", "-freshDaily"])
        let show = app.buttons["Show answers"]
        XCTAssertTrue(show.waitForExistence(timeout: 60))
        shot("mini-board")
        show.tap()
        XCTAssertTrue(app.staticTexts["playResults"].waitForExistence(timeout: 10))
        XCTAssertEqual(app.descendants(matching: .any)["game-stars"].label, "0 of 3 stars")
        shot("mini-end")
    }

    func testWordGroupsRoundEndsOnResults() {
        let app = launch(["-openGame", "wordGroups", "-freshDaily"])
        let tiles = app.buttons.matching(identifier: "groups.tile")
        let submit = app.buttons["groups.submit"]
        let results = app.staticTexts["playResults"]
        XCTAssertTrue(tiles.firstMatch.waitForExistence(timeout: 60))
        shot("groups-board")
        let deselect = app.buttons["Deselect"]
        let shuffle = app.buttons["Shuffle"]
        let left = app.descendants(matching: .any).matching(NSPredicate(format: "label ENDSWITH %@", "mistakes left")).firstMatch
        for _ in 0..<24 where !results.exists {
            guard tiles.count >= 4 else { break }
            if deselect.isEnabled { deselect.tap() }
            shuffle.tap()
            for i in 0..<4 { tiles.element(boundBy: i).tap() }
            guard submit.isEnabled else { continue }
            let count = tiles.count
            let mistakes = left.exists ? left.label : ""
            submit.tap()
            let moved = XCTNSPredicateExpectation(predicate: NSPredicate { _, _ in
                results.exists || tiles.count < count || (left.exists && left.label != mistakes) || app.staticTexts["Already tried"].exists
            }, object: nil)
            XCTAssertEqual(XCTWaiter.wait(for: [moved], timeout: 5), .completed, "The guess did not land")
        }
        XCTAssertTrue(results.waitForExistence(timeout: 10))
        XCTAssertTrue(app.descendants(matching: .any)["game-stars"].exists)
        shot("groups-end")
    }

    func testDuelShowsTheComboChip() {
        let app = launch(["-openGame", "duel", "-revealAnswer"])
        let combo = app.descendants(matching: .any)["game-combo"]
        let right = app.buttons.matching(NSPredicate(format: "identifier == %@ AND value == %@ AND isEnabled == true", "game-answer", "answer")).firstMatch
        let next = app.buttons["Next round"]
        XCTAssertTrue(right.waitForExistence(timeout: 60))
        for _ in 0..<6 where !combo.exists {
            if right.waitForExistence(timeout: 5) { right.tap() }
            if next.waitForExistence(timeout: 2) {
                shot("duel-reveal")
                next.tap()
            }
        }
        XCTAssertTrue(combo.waitForExistence(timeout: 3))
        shot("duel-combo")
    }

    func testRealTimeGamesEndOnResults() {
        for game in ["snake", "shift", "atlas", "forehead"] {
            let app = launch(["-openGame", game, "-endGame"])
            XCTAssertTrue(app.staticTexts["playResults"].waitForExistence(timeout: 60), "\(game) did not reach results")
            shot("\(game)-end")
            app.terminate()
        }
    }

    func testRealTimeChipsShowMidPlay() {
        for game in ["snake", "shift", "atlas"] {
            let app = launch(["-openGame", game, "-demoCombo", "5"])
            XCTAssertTrue(app.staticTexts["playTitle"].waitForExistence(timeout: 60))
            let start = app.buttons["Start"]
            let again = app.buttons["Try again"].firstMatch
            if start.waitForExistence(timeout: 3) { start.tap() } else if again.exists { again.tap() }
            XCTAssertTrue(app.descendants(matching: .any)["game-combo"].waitForExistence(timeout: 10), "\(game) shows no chip")
            sleep(2)
            shot("\(game)-midplay")
            app.terminate()
        }
    }

    func testShiftComboChipStaysOffUntilAStreak() {
        let app = launch(["-openGame", "shift"])
        XCTAssertTrue(app.staticTexts["playTitle"].waitForExistence(timeout: 60))
        XCTAssertFalse(app.descendants(matching: .any)["game-combo"].exists)
        shot("shift-board")
    }

    func testLiveStartOpensFromResults() {
        let app = launch(["-openGame", "flags", "-endGame"])
        let live = app.buttons["Play live"]
        XCTAssertTrue(live.waitForExistence(timeout: 60))
        live.tap()
        XCTAssertTrue(app.textFields["liveName"].waitForExistence(timeout: 20))
        XCTAssertTrue(app.buttons["liveGo"].exists)
        shot("live-start")
    }

    func testLiveLobbiesAndLettersOpen() {
        let app = launch([])
        let play = app.buttons["Play"].firstMatch
        XCTAssertTrue(play.waitForExistence(timeout: 60))
        play.tap()
        let live = app.buttons.matching(NSPredicate(format: "label CONTAINS %@", "Live Lobbies")).firstMatch
        XCTAssertTrue(live.waitForExistence(timeout: 20))
        live.tap()
        sleep(3)
        shot("lobbies")
        app.terminate()
        let letters = launch(["-openGame", "letters"])
        XCTAssertTrue(letters.staticTexts["playTitle"].waitForExistence(timeout: 60))
        sleep(2)
        shot("letters")
    }

    func testLobbyOpensEveryGame() {
        let app = launch(["-reduceMotion"])
        let play = app.buttons["Play"].firstMatch
        XCTAssertTrue(play.waitForExistence(timeout: 60))
        play.tap()
        let tiles = app.buttons.matching(NSPredicate(format: "identifier BEGINSWITH %@", "lobby-"))
        XCTAssertTrue(tiles.firstMatch.waitForExistence(timeout: 20))
        shot("lobby")
        let ids = tiles.allElementsBoundByIndex.map(\.identifier)
        XCTAssertGreaterThanOrEqual(ids.count, 10)
        for id in ids {
            let tile = app.buttons[id]
            var tries = 0
            while !tile.isHittable && tries < 12 {
                app.swipeUp(velocity: .slow)
                tries += 1
            }
            guard tile.isEnabled else { continue }
            tile.tap()
            XCTAssertTrue(app.staticTexts["playTitle"].waitForExistence(timeout: 20), "\(id) did not open")
            app.navigationBars.buttons.element(boundBy: 0).tap()
            XCTAssertTrue(tiles.firstMatch.waitForExistence(timeout: 10))
            for _ in 0..<12 where !app.buttons[ids[0]].isHittable { app.swipeDown(velocity: .fast) }
        }
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
        XCTAssertTrue(app.staticTexts["playResults"].exists)
        XCTAssertTrue(app.descendants(matching: .any)["game-stars"].exists)
        shot("match-end")
    }

    func testLetterSprintEndsOnResults() {
        let app = launch(["-openGame", "letters", "-endGame"])
        XCTAssertTrue(app.staticTexts["playResults"].waitForExistence(timeout: 60))
        XCTAssertTrue(app.descendants(matching: .any)["game-stars"].exists)
        XCTAssertTrue(app.buttons["Play again"].exists)
        shot("letters-end")
    }
}
