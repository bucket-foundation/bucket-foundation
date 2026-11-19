import XCTest

@MainActor
final class VoiceNoticeUITests: XCTestCase {
    override func setUp() {
        continueAfterFailure = false
    }

    func testMissingVoiceNoticeShowsOverASheetInBucket() {
        let app = XCUIApplication()
        app.launchArguments = ["-AppleLanguages", "(en)", "-AppleLocale", "en_US", "-voiceNotice", "de", "-knownBlank", "-polingual.knownAskedOwners", "none"]
        app.launch()
        VoiceNoticeCheck.overTheLanguagesSheet(app, shot: "bucket-voice-notice-over-sheet")
    }
}
