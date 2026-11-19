import Testing
@testable import Polingual

@MainActor
struct VoiceNoticeTests {
    @Test func missingVoiceNamesTheLanguageAndClearsAfterTheHold() async throws {
        let notice = VoiceNotice()
        notice.missing("de", hold: .milliseconds(50))
        #expect(notice.message?.contains("German") == true)
        try await Task.sleep(for: .milliseconds(400))
        #expect(notice.message == nil)
    }

    @Test func aSecondMissingVoiceRestartsTheHold() async throws {
        let notice = VoiceNotice()
        notice.missing("de", hold: .milliseconds(50))
        notice.missing("fr", hold: .seconds(30))
        try await Task.sleep(for: .milliseconds(400))
        #expect(notice.message?.contains("French") == true)
    }
}
