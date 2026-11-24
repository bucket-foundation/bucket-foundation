import XCTest

@MainActor
final class ChatModerationUITests: XCTestCase {
    private func shot(_ name: String) {
        guard let dir = ProcessInfo.processInfo.environment["GAME_SHOTS"] else { return }
        try? XCUIScreen.main.screenshot().pngRepresentation.write(to: URL(fileURLWithPath: dir).appendingPathComponent("\(name).png"))
    }

    override func setUp() {
        continueAfterFailure = false
    }

    func testStagedLobbyChatReportsThenBlocks() {
        let app = XCUIApplication()
        app.launchArguments = ["-polingual.onboarded", "YES", "-polingualOpen", "-polingualOrientation", "portrait", "-startTab", "learn", "-openLang", "en:es,fr,de:none", "-polingualDemo", "40", "-polingual.saveProgress", "NO", "-polingual.knownAskedOwners", "guest", "-lobbyStage", "3", "-lobbyStageChat", "1"]
        app.launch()
        let other = app.staticTexts["¿Listos?"]
        XCTAssertTrue(other.waitForExistence(timeout: 60), "The staged chat did not show")
        let menus = app.buttons.matching(identifier: "chatModerate")
        XCTAssertEqual(menus.count, 2, "Each message from another player gets one menu, my own gets none")
        shot("chat-log")

        menus.firstMatch.tap()
        let report = app.buttons["Report"]
        XCTAssertTrue(report.waitForExistence(timeout: 5))
        shot("chat-menu")
        report.tap()
        let harassment = app.buttons["Harassment"]
        XCTAssertTrue(harassment.waitForExistence(timeout: 5))
        XCTAssertTrue(app.buttons["Offensive name"].exists)
        XCTAssertTrue(app.buttons["Spam"].exists)
        XCTAssertTrue(app.buttons["Something else"].exists)
        shot("chat-report-reasons")
        harassment.tap()

        let sent = app.alerts["Report sent"]
        XCTAssertTrue(sent.waitForExistence(timeout: 5), "The report confirmation did not show")
        shot("chat-report-sent")
        sent.buttons.matching(NSPredicate(format: "label BEGINSWITH 'Block '")).firstMatch.tap()

        XCTAssertTrue(other.waitForNonExistence(timeout: 5), "A blocked player's message still shows")
        XCTAssertTrue(app.staticTexts["Ready when you are"].exists, "Blocking one player hid another")
        XCTAssertTrue(app.staticTexts["Let's go"].exists, "Blocking hid my own message")
        XCTAssertEqual(app.buttons.matching(identifier: "chatModerate").count, 1)
        shot("chat-after-block")

        app.buttons.matching(identifier: "chatModerate").firstMatch.tap()
        let block = app.buttons.matching(NSPredicate(format: "label BEGINSWITH 'Block '")).firstMatch
        XCTAssertTrue(block.waitForExistence(timeout: 5))
        block.tap()
        let confirm = app.sheets.buttons["Block"].exists ? app.sheets.buttons["Block"] : app.buttons["Block"]
        XCTAssertTrue(confirm.waitForExistence(timeout: 5), "The block confirmation did not show")
        shot("chat-block-confirm")
        confirm.tap()
        XCTAssertTrue(app.staticTexts["Ready when you are"].waitForNonExistence(timeout: 5))
        XCTAssertTrue(app.staticTexts["Let's go"].exists)
        XCTAssertEqual(app.buttons.matching(identifier: "chatModerate").count, 0)
        shot("chat-all-blocked")
    }
}
