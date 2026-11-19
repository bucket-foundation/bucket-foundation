import XCTest

@MainActor
final class RaceVoiceUITests: XCTestCase {
    private func shot(_ name: String) {
        guard let dir = ProcessInfo.processInfo.environment["GAME_SHOTS"] else { return }
        try? XCUIScreen.main.screenshot().pngRepresentation.write(to: URL(fileURLWithPath: dir).appendingPathComponent("\(name).png"))
    }

    override func setUp() {
        continueAfterFailure = false
    }

    func testStagedVoiceRaceDealsPlaysAndScores() {
        let app = XCUIApplication()
        app.launchArguments = ["-polingual.onboarded", "YES", "-polingualOpen", "-polingualOrientation", "portrait", "-startTab", "learn", "-openLang", "en:es,fr,de:none", "-polingualDemo", "40", "-polingual.saveProgress", "NO", "-polingual.knownAskedOwners", "guest", "-lobbyStage", "2", "-lobbyStageRace", "voice"]
        app.launch()
        XCTAssertTrue(app.staticTexts["lobbyRaceClock"].waitForExistence(timeout: 60), "The race header did not show")
        let choices = app.buttons.matching(identifier: "game-choice")
        XCTAssertTrue(choices.firstMatch.waitForExistence(timeout: 60), "The Voice race dealt no prompt")
        XCTAssertTrue(app.staticTexts["Highest score wins"].exists)
        shot("race-voice-play")
        let score = app.staticTexts["lobbyRaceScore"]
        var taps = 0
        let deadline = Date().addingTimeInterval(180)
        while !score.exists, taps < 40, Date() < deadline {
            guard let choice = try? choices.firstMatch.snapshot(), choice.isEnabled, !choice.frame.isEmpty else {
                usleep(100_000)
                continue
            }
            app.coordinate(withNormalizedOffset: .zero).withOffset(CGVector(dx: choice.frame.midX, dy: choice.frame.midY)).tap()
            taps += 1
        }
        XCTAssertTrue(score.waitForExistence(timeout: 10), "The race posted no score after \(taps) answers")
        XCTAssertTrue(score.label.hasPrefix("Your score: "))
        XCTAssertTrue(app.staticTexts["lobbyRaceClock"].exists)
        XCTAssertFalse(app.staticTexts["These come back in your next session"].exists, "A race writes no learner state, so no word comes back")
        shot("race-voice-score")
    }
}
