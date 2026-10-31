import Testing
@testable import BucketKit

@Suite struct AudioPaceTests {
    let lead = VoiceLine(lang: "es", text: "agua")
    let forms = ["es": "agua", "fr": "eau", "de": "Wasser", "it": "acqua", "pt": "água", "en": "water"]

    @Test func playsOnFirstOfferThenOneInEvery() {
        let plays = (0..<(AudioPace.every * 2)).map(AudioPace.due)
        #expect(plays.filter { $0 }.count == 2)
        #expect(plays.first == true)
        #expect(plays[AudioPace.every] == true)
    }

    @Test func chorusLeadsWithTheCardThenOtherTargets() {
        let lines = AudioPace.chorus(lead: lead, targets: ["fr", "es", "de"], root: "en") { forms[$0] }
        #expect(lines.map(\.lang) == ["es", "fr", "de"])
    }

    @Test func chorusSkipsTargetsWithoutAForm() {
        let lines = AudioPace.chorus(lead: lead, targets: ["es", "xx", "fr"], root: "en") { forms[$0] }
        #expect(lines.map(\.lang) == ["es", "fr"])
    }

    @Test func singleTargetAddsTheKnownLanguage() {
        let lines = AudioPace.chorus(lead: lead, targets: ["es"], root: "en") { forms[$0] }
        #expect(lines == [lead, VoiceLine(lang: "en", text: "water")])
    }

    @Test func chorusStopsAtMaxVoices() {
        let lines = AudioPace.chorus(lead: lead, targets: ["es", "fr", "de", "it", "pt"], root: "en") { forms[$0] }
        #expect(lines.count == AudioPace.maxVoices)
    }
}
