import XCTest

@MainActor
final class VoiceNoticeUITests: XCTestCase {
    override func setUp() {
        continueAfterFailure = false
    }

    func testMissingVoiceNoticeShowsOverASheet() {
        let app = XCUIApplication()
        app.launchArguments = ["-polingual.onboarded", "YES", "-polingualOpen", "-polingualOrientation", "portrait", "-startTab", "learn", "-openLang", "en:es,fr,de:none", "-polingualDemo", "40", "-polingual.saveProgress", "NO", "-polingual.knownAskedOwners", "none", "-knownBlank", "-voiceNotice", "de"]
        app.launch()
        VoiceNoticeCheck.overTheLanguagesSheet(app, shot: "polingual-voice-notice-over-sheet")
    }
}
