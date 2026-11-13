import Foundation
import Testing
@testable import BucketKit

struct SoundPolicyTests {
    @Test func silentModeStopsAutoAndEffectsButNotTaps() {
        #expect(SoundPolicy.allows(.tap, silent: true))
        #expect(!SoundPolicy.allows(.auto, silent: true))
        #expect(!SoundPolicy.allows(.effect, silent: true))
        #expect(SoundPolicy.allows(.auto, silent: false))
        #expect(SoundPolicy.honorsMuteSwitch(.auto))
        #expect(SoundPolicy.honorsMuteSwitch(.effect))
        #expect(!SoundPolicy.honorsMuteSwitch(.tap))
    }

    @Test func coldStartNeverCachesAnEmptyVoiceList() {
        var cache = VoiceCache<String>()
        var calls = 0
        var list: [String] = []
        let choose: ([String], String) -> String? = { l, lang in l.first { $0.hasPrefix(lang) } }
        #expect(cache.pick("es", load: { calls += 1; return list }, choose: choose) == nil)
        #expect(!cache.loaded)
        list = ["es-ES", "fr-FR"]
        #expect(cache.pick("es", load: { calls += 1; return list }, choose: choose) == "es-ES")
        #expect(calls == 2)
        #expect(cache.pick("es", load: { calls += 1; return list }, choose: choose) == "es-ES")
        #expect(calls == 2)
    }

    @Test func missingLanguageIsRetriedOnTheNextTap() {
        var cache = VoiceCache<String>()
        var list = ["fr-FR"]
        let choose: ([String], String) -> String? = { l, lang in l.first { $0.hasPrefix(lang) } }
        #expect(cache.pick("nl", load: { list }, choose: choose) == nil)
        list = ["fr-FR", "nl-NL"]
        cache.fill(list)
        #expect(cache.pick("nl", load: { list }, choose: choose) == "nl-NL")
    }

    @Test func rapidTapsRenewABusySynthesizer() {
        let taps = [false, true, true, true]
        #expect(taps.map { SoundPolicy.start(busy: $0) } == [.speak, .renewThenSpeak, .renewThenSpeak, .renewThenSpeak])
        #expect(SoundPolicy.retryAfter(.tap) <= SoundPolicy.tapBudget)
    }

    @Test func latencyBudget() {
        var l = TapLatency()
        for s in [0.08, 0.12, 0.21] { l.record(s) }
        #expect(l.median == 0.12)
        #expect(l.withinBudget)
        l.record(0.5)
        #expect(!l.withinBudget)
    }
}

struct SilentDeckTests {
    @Test func silentModeDefersEverySoundCardAndKeepsVisualOnes() {
        for k in SilentDeck.soundKinds { #expect(!SilentDeck.shows(k, silent: true)) }
        for k in [ExerciseKind.choose, .reverse, .translate, .cloze, .match, .gender, .conjugate] {
            #expect(SilentDeck.shows(k, silent: true))
        }
        for k in SilentDeck.soundKinds { #expect(SilentDeck.shows(k, silent: false)) }
        #expect(!SilentDeck.shows(.intro, spoken: true, silent: true))
    }

    @Test func deferredCardsReturnWithTheirScheduleUntouched() {
        let ids = ["a", "b", "c", "d"]
        let kinds: [ExerciseKind] = [.choose, .listen, .typeHeard, .reverse]
        var state = EngineState()
        let quiet = SilentDeck.pass(kinds, silent: true)
        #expect(quiet.shown == [0, 3])
        #expect(quiet.deferred == [1, 2])
        for i in quiet.shown { state = gradeCard(state, "es", ids[i], 3, now: 1_000) }
        for i in quiet.deferred { #expect(state.cards[cardId("es", ids[i])] == nil) }
        for i in quiet.shown { #expect(state.cards[cardId("es", ids[i])] != nil) }
        let back = SilentDeck.pass(quiet.deferred.map { kinds[$0] }, silent: false)
        #expect(back.shown.count == quiet.deferred.count)
        #expect(back.deferred.isEmpty)
    }

    @Test func soundOnlySessionIsReported() {
        #expect(SilentDeck.onlySound(graded: 0, deferred: 3))
        #expect(!SilentDeck.onlySound(graded: 1, deferred: 3))
        #expect(!SilentDeck.onlySound(graded: 0, deferred: 0))
    }

    @Test func chorusOnlyOnTheIntroCard() {
        #expect(SilentDeck.chorusAllowed(.intro))
        #expect(!SilentDeck.chorusAllowed(.match))
        #expect(!SilentDeck.chorusAllowed(.choose))
    }
}
