import Foundation
import Testing
@testable import BucketKit

@Suite struct SessionMixTests {
    let utc = TimeZone(identifier: "UTC")!
    let now = 1_700_000_000_000.0

    func corpus() throws -> LangCorpus {
        buildLangCorpus(core: try langFixture("core"), cognates: try langFixture("cognates"), phrases: try langFixture("phrases"), layers: try langFixture("layers"))
    }

    func masteredCard() -> Card {
        var c = Card(state: "review")
        c.stability = 200
        c.reps = 8
        return c
    }

    @Test func curriculumRunsFromMostFrequentTier() throws {
        let corpus = try corpus()
        let sys = try createSystem("en", ["es"], now: 0)
        let list = SessionMix.curriculum(corpus, sys, "es")
        #expect(list.count > 10)
        #expect(zip(list, list.dropFirst()).allSatisfy { $0.tier <= $1.tier })
        #expect(list.contains { $0.kind == .phrase } && list.contains { $0.kind == .word })
        let ordered = SessionMix.frequencyFirst(corpus).items
        #expect(zip(ordered, ordered.dropFirst()).allSatisfy { $0.tier <= $1.tier })
    }

    @Test func stageMovesAMasteredWordToSentences() throws {
        let corpus = try corpus()
        let word = try #require(corpus.items.first { $0.kind == .word && $0.form("es") != nil })
        var state = EngineState()
        #expect(SessionMix.stage(word, state, "es") == .word)
        #expect(SessionMix.mastery(state, "es", word.id) == 0)
        state.cards[cardId("es", word.id)] = masteredCard()
        #expect(SessionMix.mastered(state, "es", word.id))
        #expect(SessionMix.stage(word, state, "es") == .sentence)
    }

    @Test func soundStaysASmallMinorityEarly() {
        var tally = SoundTally()
        for _ in 0..<40 {
            let kind: ExerciseKind = SessionMix.soundAllowed(tally, started: 0) ? .listen : .choose
            tally.record(kind)
        }
        #expect(tally.asked == 40)
        #expect(Double(tally.sounds) / 40 <= 0.1)
        #expect(SessionMix.soundShare(started: 0) < SessionMix.soundShare(started: 500))
    }

    @Test func blockedSoundNeverYieldsASoundExercise() throws {
        let corpus = try corpus()
        let sys = try createSystem("en", ["es", "ru"], now: 0)
        let mix = ExerciseMix(sound: false, compare: false)
        for item in corpus.items.filter(isVocab).prefix(40) {
            for lang in sys.targets where item.form(lang) != nil {
                for reps in [1.0, 2, 5] {
                    var c = Card(state: "review")
                    c.reps = reps
                    c.stability = 3
                    for k in 0..<10 {
                        var rng = Rng(seed: UInt32(k))
                        let ex = exerciseFor(corpus, sys, item, lang, c, &rng, speech: true, heritage: true, mix: mix)
                        #expect(!SessionMix.soundKinds.contains(ex.kind))
                        #expect(!SessionMix.compareKinds.contains(ex.kind))
                    }
                }
            }
        }
    }

    @Test func alternateBreaksLanguageRuns() {
        let q = (0..<6).map { QueueEntry(itemId: "a\($0)", lang: "es", stage: .review) } + (0..<6).map { QueueEntry(itemId: "b\($0)", lang: "fr", stage: .review) }
        let out = SessionMix.alternate(q)
        #expect(out.count == q.count)
        #expect(SessionMix.longestRun(out) == 1)
        #expect(out.filter { $0.lang == "es" }.map(\.itemId) == (0..<6).map { "a\($0)" })
    }

    @Test func alternateKeepsIntroBeforeCheck() {
        let q = [QueueEntry(itemId: "x", lang: "es", stage: .intro), QueueEntry(itemId: "y", lang: "es", stage: .intro), QueueEntry(itemId: "x", lang: "es", stage: .check), QueueEntry(itemId: "z", lang: "fr", stage: .intro), QueueEntry(itemId: "z", lang: "fr", stage: .check)]
        let out = SessionMix.alternate(q)
        let i = out.firstIndex(of: QueueEntry(itemId: "x", lang: "es", stage: .intro))!
        let j = out.firstIndex(of: QueueEntry(itemId: "x", lang: "es", stage: .check))!
        #expect(i < j)
    }

    @Test func sessionQueueAlternatesLanguages() throws {
        let corpus = try corpus()
        let sys = try createSystem("en", ["fr", "es", "it"], now: 0)
        let q = SessionMix.queue(sys, corpus, EngineState(), now: now, tz: utc)
        #expect(q.count >= 10)
        #expect(SessionMix.longestRun(q) <= 2)
        #expect(SessionMix.longestRun(buildQueue(sys, corpus, EngineState(), now: now, tz: utc)) >= SessionMix.longestRun(q))
    }

    @Test func comparisonsWaitForMastery() throws {
        let corpus = try corpus()
        let sys = try createSystem("en", ["fr", "es"], now: 0)
        let item = try #require(corpus.items.first { isVocab($0) && $0.form("fr") != nil && $0.form("es") != nil && $0.form("en") != nil })
        let match = [QueueEntry(itemId: item.id, lang: "fr", stage: .match)]
        var state = EngineState()
        state.cards[cardId("fr", item.id)] = masteredCard()
        #expect(SessionMix.gateComparisons(match, sys, corpus, state).isEmpty)
        state.cards[cardId("es", item.id)] = masteredCard()
        #expect(SessionMix.gateComparisons(match, sys, corpus, state) == match)
        #expect(!SessionMix.queue(sys, corpus, EngineState(), now: now, tz: utc).contains { $0.stage == .match })
    }

    @Test func beginnerMixBlocksComparisons() throws {
        let corpus = try corpus()
        let sys = try createSystem("en", ["fr", "es", "it"], now: 0)
        let item = try #require(corpus.items.first { isVocab($0) && sharedRootLangs($0, sys).count >= 2 })
        let lang = sharedRootLangs(item, sys)[0]
        var state = EngineState()
        #expect(!SessionMix.exerciseMix(sys, item, lang, state, tally: SoundTally()).compare)
        for l in sys.targets { state.cards[cardId(l, item.id)] = masteredCard() }
        #expect(SessionMix.exerciseMix(sys, item, lang, state, tally: SoundTally()).compare)
    }
}
