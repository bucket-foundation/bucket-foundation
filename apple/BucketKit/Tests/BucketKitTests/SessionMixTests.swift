import Foundation
import Testing
@testable import BucketKit

@Suite struct SessionMixTests {
    let utc = TimeZone(identifier: "UTC")!
    let now = 1_700_000_000_000.0
    static let top1000 = URL(fileURLWithPath: #filePath).deletingLastPathComponent().deletingLastPathComponent().deletingLastPathComponent().deletingLastPathComponent().appending(path: "Shared/Corpus/top1000")

    func corpus() throws -> LangCorpus {
        buildLangCorpus(core: try langFixture("core"), cognates: try langFixture("cognates"), phrases: try langFixture("phrases"), layers: try langFixture("layers"))
    }

    func freq(_ langs: [String]) throws -> FrequencyRank {
        var top: [String: [TopWord]] = [:]
        for l in langs { top[l] = try JSONDecoder().decode([TopWord].self, from: Data(contentsOf: Self.top1000.appending(path: "\(l).json"))) }
        return FrequencyRank(top)
    }

    func masteredCard() -> Card {
        var c = Card(state: "review")
        c.stability = 200
        c.reps = 8
        return c
    }

    func gaps(_ q: [QueueEntry]) -> [Int] {
        q.indices.compactMap { i in
            guard q[i].stage == .check, let j = q[..<i].lastIndex(where: { $0.stage == .intro && $0.itemId == q[i].itemId && $0.lang == q[i].lang }) else { return nil }
            return i - j - 1
        }
    }

    @Test func curriculumFollowsTheTop1000Rank() throws {
        let corpus = try corpus()
        let sys = try createSystem("en", ["es"], now: 0)
        let f = try freq(["es"])
        let list = SessionMix.curriculum(corpus, sys, "es", f)
        let ranks = list.map { f.rank($0, "es") }
        #expect(ranks == ranks.sorted())
        #expect(ranks.contains { $0 < 1000 })
        #expect(list.contains { $0.kind == .phrase } && list.contains { $0.kind == .word })
        let ranked = try #require(list.first { f.ranks["es"]?[$0.form("es")!.lowercased()] != nil })
        #expect(f.rank(ranked, "es") == f.ranks["es"]![ranked.form("es")!.lowercased()])
    }

    @Test func masteryIsTrackedPerWordPhraseAndSentence() throws {
        let corpus = try corpus()
        let sys = try createSystem("en", ["es"], now: 0)
        let word = try #require(corpus.items.first { $0.kind == .word && $0.form("es") != nil })
        let phrase = try #require(corpus.items.first { $0.kind == .phrase && $0.form("es") != nil })
        var state = EngineState()
        #expect(SessionMix.stage(word, state, "es") == .word)
        state = gradeCard(state, "es", word.id, 3, now: now, tz: "UTC")
        state = gradeCard(state, "es", phrase.id, 3, now: now, tz: "UTC")
        state = gradeCard(state, "es", SessionMix.sentenceItemId("s1"), 3, now: now, tz: "UTC")
        let table = SessionMix.masteryTable(sys, corpus, state, "es")
        #expect(table.contains { $0.id == word.id && $0.stage == .word && $0.mastery > 0 })
        #expect(table.contains { $0.id == phrase.id && $0.stage == .phrase && $0.mastery > 0 })
        #expect(table.contains { $0.id == "sent:s1" && $0.stage == .sentence && $0.mastery > 0 })
        state.cards[cardId("es", word.id)] = masteredCard()
        #expect(SessionMix.stage(word, state, "es") == .sentence)
    }

    @Test func soundCapHoldsAcrossTheRealSessionBuilder() throws {
        let corpus = try corpus()
        let sys = try createSystem("en", ["ru", "es", "fr"], now: 0)
        let state = EngineState()
        let writing = ScriptCourse.queue(sys, state, now: now)
        #expect(!writing.isEmpty)
        let lead = corpus.items.filter { isVocab($0) && $0.form("ru") != nil }.prefix(2).flatMap { [QueueEntry(itemId: $0.id, lang: "ru", stage: .intro), QueueEntry(itemId: $0.id, lang: "ru", stage: .check)] }
        let q = SessionMix.session(sys, corpus, state, now: now, freq: try freq(sys.targets), lead: Array(lead), replay: GameLedger.queue(sys, state), writing: writing, tz: utc, heritage: true)
        #expect(q.contains { $0.stage == .letter })
        var round = StudyRound(q)
        var rng = Rng(seed: 7)
        var seen = state
        for (i, e) in round.queue.enumerated() {
            if e.stage == .letter { seen.cards[cardId(e.lang, e.itemId)] = Card(state: "review") }
            guard let ex = SessionMix.exercise(e, sys, corpus, seen, tally: round.tally, &rng, speech: true, heritage: true) else { continue }
            round.record(ex.kind, key: "\(i)")
            round.record(ex.kind, key: "\(i)")
        }
        #expect(round.tally.asked >= 10)
        #expect(Double(round.tally.sounds) <= SessionMix.soundShare(started: 0) * Double(round.tally.asked))
    }

    @Test func cappedSoundSkipsAContrastPairInsteadOfAskingForItsLetter() throws {
        let sys = try createSystem("en", ["es"], now: 0)
        let entry = QueueEntry(itemId: LangScript.letterItemId("pero/perro"), lang: "es", stage: .letter)
        var rng = Rng(seed: 3)
        #expect(!SessionMix.soundAllowed(SoundTally(), started: 0))
        #expect(SessionMix.letterExercise(entry, sys, EngineState(), tally: SoundTally(), &rng) == nil)
        #expect(ScriptCourse.drill(.letter, "es", "en", entry.itemId, &rng) == nil)
        #expect(ScriptCourse.drill(.blend, "es", "en", entry.itemId, &rng) == nil)
        var open = SoundTally()
        for k in 0..<9 { open.record(.choose, key: "\(k)") }
        #expect(SessionMix.letterExercise(entry, sys, EngineState(), tally: open, &rng)?.kind == .minimalPair)
        let plain = QueueEntry(itemId: LangScript.letterItemId("ñ"), lang: "es", stage: .letter)
        #expect(SessionMix.letterExercise(plain, sys, EngineState(), tally: SoundTally(), &rng)?.kind != nil)
    }

    @Test func tallyCountsAKeyOnceAndRestartClearsIt() {
        var round = StudyRound([])
        round.record(.listen, key: "0")
        round.record(.listen, key: "0")
        round.record(.intro, key: "1")
        #expect(round.tally.asked == 1 && round.tally.sounds == 1)
        round.restart([QueueEntry(itemId: "a", lang: "es", stage: .review)])
        #expect(round.tally == SoundTally())
        #expect(round.queue.count == 1)
    }

    @Test func blockedSoundAndCompareNeverYieldThoseKinds() throws {
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

    @Test func openMixReproducesTheDefaultExercise() throws {
        let corpus = try corpus()
        let sys = try createSystem("en", ["es", "fr", "ru"], now: 0)
        for item in corpus.items.prefix(60) {
            for lang in sys.targets where item.form(lang) != nil {
                for reps in [0.0, 1, 2, 5] {
                    var c = Card(state: reps == 0 ? "new" : "review")
                    c.reps = reps
                    for k in 0..<6 {
                        var a = Rng(seed: UInt32(k)), b = Rng(seed: UInt32(k))
                        let x = exerciseFor(corpus, sys, item, lang, reps == 0 ? nil : c, &a, speech: true, afterIntro: k % 2 == 0, heritage: k % 3 == 0)
                        let y = exerciseFor(corpus, sys, item, lang, reps == 0 ? nil : c, &b, speech: true, afterIntro: k % 2 == 0, heritage: k % 3 == 0, mix: .open)
                        #expect(x.kind == y.kind && x.prompt == y.prompt && x.answer == y.answer && x.options == y.options && x.tokens == y.tokens)
                        #expect(a.next() == b.next())
                    }
                }
            }
        }
    }

    @Test func alternateBreaksRunsAndKeepsOrderPerLanguage() {
        let q = (0..<6).map { QueueEntry(itemId: "a\($0)", lang: "es", stage: .review) } + (0..<6).map { QueueEntry(itemId: "b\($0)", lang: "fr", stage: .review) }
        let out = SessionMix.alternate(q)
        #expect(SessionMix.longestRun(out) == 1)
        #expect(out.filter { $0.lang == "es" }.map(\.itemId) == (0..<6).map { "a\($0)" })
    }

    @Test func sessionAlternatesAndKeepsCheckGaps() throws {
        let corpus = try corpus()
        let sys = try createSystem("en", ["fr", "es", "it"], now: 0)
        let q = SessionMix.session(sys, corpus, EngineState(), now: now, freq: try freq(sys.targets), tz: utc)
        #expect(q.count >= 20)
        #expect(SessionMix.longestRun(q) <= 2)
        #expect(gaps(q).allSatisfy { $0 >= Lang.checkGap })
        #expect(q.filter { $0.stage == .check }.count == q.filter { $0.stage == .intro }.count)
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
        #expect(!SessionMix.session(sys, corpus, EngineState(), now: now, freq: try freq(sys.targets), tz: utc).contains { $0.stage == .match })
    }

    @Test func falseFriendsOpenAtHalfMastery() throws {
        let corpus = try corpus()
        let sys = try createSystem("en", ["fr", "es", "it"], now: 0)
        let item = try #require(corpus.items.first { i in sys.targets.contains { i.falseFriends[$0] != nil } })
        let lang = try #require(sys.targets.first { item.falseFriends[$0] != nil })
        var state = EngineState()
        #expect(!SessionMix.exerciseMix(sys, item, lang, state, tally: SoundTally()).compare)
        var c = Card(state: "review")
        c.stability = 16
        state.cards[cardId(lang, item.id)] = c
        #expect(SessionMix.mastery(state, lang, item.id) >= 0.5 && SessionMix.mastery(state, lang, item.id) < 0.8)
        #expect(SessionMix.exerciseMix(sys, item, lang, state, tally: SoundTally()).compare)
    }
}

@Suite struct SentenceCardTests {
    @Test func sentenceCardsStayOutOfWordBudgetsAndCounts() throws {
        let sys = try createSystem("en", ["es"], now: 0)
        let now = 1_700_000_000_000.0
        let utc = TimeZone(identifier: "UTC")!
        var state = EngineState()
        for k in 0..<70 { state = gradeCard(state, "es", SessionMix.sentenceItemId("s\(k)"), 3, now: now, tz: "UTC") }
        #expect(isSentenceCard(cardId("es", "sent:s1")) && !isSentenceCard(cardId("es", "w-1")))
        #expect(newToday(state, "es", now: now, tz: utc) == 0)
        #expect(SessionMix.startedCount(state, sys) == 0)
        #expect(learnerLevel(state, "es") == 1)
        #expect(GameLedger.queue(sys, state).isEmpty)
    }

    @Test func sentenceGradeMovesTheScheduleWithoutCountingTwice() throws {
        let now = 1_700_000_000_000.0
        let word = cardId("es", "w1")
        let sentence = cardId("es", SessionMix.sentenceItemId("s1"))
        var state = gradeCard(EngineState(), "es", "w1", 3, now: now, tz: "UTC")
        let once = state
        state = gradeCard(state, "es", SessionMix.sentenceItemId("s1"), 3, now: now, tz: "UTC", counted: false)
        let day = dayKey(now, tzName: "UTC")
        #expect(state.history[day]?.new == 1)
        #expect(state.history[day]?.reviews == 0)
        #expect(state.xp == once.xp)
        #expect(state.streak == once.streak)
        #expect(state.prof[sentence] == nil)
        #expect(state.cards.started(sentence))
        #expect(state.cards[sentence]?.introduced == day)
        #expect(state.cards[word] == once.cards[word])
        let again = gradeCard(state, "es", SessionMix.sentenceItemId("s1"), 1, now: now + 60_000, tz: "UTC", counted: false)
        #expect(again.cards[sentence]?.lastReview != state.cards[sentence]?.lastReview)
        #expect(again.history[day]?.reviews == 0)
    }
}
