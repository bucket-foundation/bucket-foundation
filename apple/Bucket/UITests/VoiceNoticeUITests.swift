import XCTest

@MainActor
final class VoiceNoticeUITests: XCTestCase {
    override func setUp() {
        continueAfterFailure = false
    }

    func testMissingVoiceNoticeShowsInBucket() {
        let app = XCUIApplication()
        app.launchArguments = ["-AppleLanguages", "(en)", "-AppleLocale", "en_US", "-voiceNotice", "de"]
        app.launch()
        let notice = app.descendants(matching: .any)["voiceNotice"]
        XCTAssertTrue(notice.waitForExistence(timeout: 60))
        XCTAssertTrue(notice.label.contains("German"))
        let later = app.buttons["knownLanguagesLater"]
        if later.waitForExistence(timeout: 5) { later.tap() }
        XCTAssertTrue(notice.waitForExistence(timeout: 10))
        XCTAssertTrue(notice.isHittable)
        if let dir = ProcessInfo.processInfo.environment["GAME_SHOTS"] {
            try? XCUIScreen.main.screenshot().pngRepresentation.write(to: URL(fileURLWithPath: dir).appendingPathComponent("bucket-voice-notice.png"))
        }
    }
}
