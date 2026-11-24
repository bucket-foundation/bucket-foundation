import XCTest

@MainActor
enum VoiceNoticeCheck {
    static func overTheLanguagesSheet(_ app: XCUIApplication, shot: String) {
        let later = app.buttons["knownLanguagesLater"]
        XCTAssertTrue(later.waitForExistence(timeout: 60))
        let notice = app.descendants(matching: .any)["voiceNotice"]
        XCTAssertTrue(notice.waitForExistence(timeout: 20))
        XCTAssertTrue(notice.label.contains("German"))
        let noticeWindow = app.windows.containing(.any, identifier: "voiceNotice")
        XCTAssertEqual(noticeWindow.count, 1)
        XCTAssertFalse(noticeWindow.buttons["knownLanguagesLater"].exists)
        let screen = app.windows.firstMatch.frame
        XCTAssertTrue(screen.contains(notice.frame))
        if let dir = ProcessInfo.processInfo.environment["GAME_SHOTS"] {
            try? XCUIScreen.main.screenshot().pngRepresentation.write(to: URL(fileURLWithPath: dir).appendingPathComponent("\(shot).png"))
        }
        later.tap()
        XCTAssertTrue(later.waitForNonExistence(timeout: 20))
        XCTAssertTrue(notice.exists)
    }
}
