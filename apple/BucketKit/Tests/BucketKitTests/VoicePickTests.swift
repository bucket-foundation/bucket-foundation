import Testing
@testable import BucketKit

struct VoicePickTests {
    typealias V = LangAudio.Voice

    @Test func prefersHigherQualityForTheSameLanguage() {
        let voices = [
            V(id: "com.apple.voice.compact.nl-NL.Xander", language: "nl-NL", quality: 1),
            V(id: "com.apple.voice.enhanced.nl-NL.Claire", language: "nl-NL", quality: 2),
        ]
        #expect(LangAudio.pickVoice(voices, "nl")?.id == "com.apple.voice.enhanced.nl-NL.Claire")
    }

    @Test func skipsEloquenceAndNoveltyVoices() {
        let voices = [
            V(id: "com.apple.eloquence.de-DE.Eddy", language: "de-DE", quality: 1),
            V(id: "com.apple.speech.synthesis.voice.Bubbles", language: "de-DE", quality: 1, novelty: true),
            V(id: "com.apple.voice.compact.de-DE.Anna", language: "de-DE", quality: 1),
        ]
        #expect(LangAudio.pickVoice(voices, "de")?.id == "com.apple.voice.compact.de-DE.Anna")
    }

    @Test func keepsTheExactRegionAheadOfQualityElsewhere() {
        let voices = [
            V(id: "com.apple.voice.premium.nl-BE.Ellen", language: "nl-BE", quality: 3),
            V(id: "com.apple.voice.compact.nl-NL.Xander", language: "nl-NL", quality: 1),
        ]
        #expect(LangAudio.pickVoice(voices, "nl")?.id == "com.apple.voice.compact.nl-NL.Xander")
    }

    @Test func fallsBackToTheBaseLanguageAndThenToAnOddVoice() {
        let base = [V(id: "com.apple.voice.compact.nl-BE.Ellen", language: "nl_BE", quality: 1)]
        #expect(LangAudio.pickVoice(base, "nl")?.id == "com.apple.voice.compact.nl-BE.Ellen")
        let odd = [V(id: "com.apple.eloquence.fi-FI.Eddy", language: "fi-FI", quality: 1)]
        #expect(LangAudio.pickVoice(odd, "fi")?.id == "com.apple.eloquence.fi-FI.Eddy")
        #expect(LangAudio.pickVoice(odd, "nl") == nil)
    }
}
