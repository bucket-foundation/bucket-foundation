import Foundation
import Testing
@testable import BucketKit

func words(_ n: Int) -> [GameWord] {
    (0..<n).map { GameWord(itemId: "i\($0)", lang: "fr", form: "mot\($0)", gloss: "word\($0)", root: "en") }
}

@Suite struct GamesTests {
    @Test func learnedWordsComeFromStartedCardsOnly() throws {
        let corpus = try translateCorpus()
        let system = LangSystem(id: "s", name: "es", root: "en", targets: ["es"], createdAt: 0)
        let item = try #require(corpus.items.first { isVocab($0) && $0.form("es") != nil && $0.form("en") != nil && $0.form("es") != $0.form("en") })
        let other = try #require(corpus.items.last { isVocab($0) && $0.form("es") != nil && $0.form("en") != nil && $0.form("es") != $0.form("en") })
        var state = gradeCard(EngineState(), "es", item.id, 3, now: 1_800_000_000_000)
        state = queueNew(state, "es", other.id, now: 1_800_000_000_000)
        let learned = GameWords.learned([system], states: ["s": state], corpus: corpus)
        #expect(learned.map(\.itemId) == [item.id])
        #expect(learned.first?.form == item.form("es"))
        #expect(!GameWords.starter([system], corpus: corpus).isEmpty)
    }

    @Test func wordsMissedOrDueLeadTheRound() throws {
        let corpus = try translateCorpus()
        let system = LangSystem(id: "s", name: "es", root: "en", targets: ["es"], createdAt: 0)
        let items = corpus.items.filter { isVocab($0) && $0.form("es") != nil && $0.form("en") != nil && $0.form("es") != $0.form("en") }.prefix(3)
        let now = 1_800_000_000_000.0
        var state = EngineState()
        for i in items { state = gradeCard(state, "es", i.id, 3, now: now) }
        let missed = cardId("es", items[items.startIndex].id)
        let later = now + 90 * DAY_MS
        let result = GameResult(game: "flags", hits: 1, missed: [missed])
        state = GameLedger.finishing(state, result, now: now + 1)
        let words = GameWords.learned([system], states: ["s": state], corpus: corpus, now: later)
        #expect(words.first { $0.id == missed }?.rank == GameWords.missedRank)
        #expect(words.filter { $0.id != missed }.allSatisfy { $0.rank == GameWords.dueRank })
        var rng = SeededRandom(seed: 4)
        #expect(GameWords.ordered(words, using: &rng).first?.id == missed)
    }

    @Test func finishedGameCreditsTheDayOnce() {
        let now = 1_800_000_000_000.0
        var state = EngineState()
        state.lastStudyDay = dayKey(now - DAY_MS, tzName: "UTC")
        state.streak = 4
        var next = GameLedger.finishing(state, GameResult(game: "match", points: 12, hits: 12, missed: []), now: now, tz: "UTC")
        #expect(next.streak == 5)
        #expect(next.xp == 0)
        #expect(next.history.count == 0)
        next = GameLedger.finishing(next, GameResult(game: "match", points: 9, hits: 25, missed: []), now: now + 1000, tz: "UTC")
        #expect(next.streak == 5)
        let ledger = GameLedger(next)
        #expect(ledger.best["match"] == 12)
        #expect(ledger.days[dayKey(now, tzName: "UTC")] == GameLedger.dayCredit)
    }

    @Test func emptyGameEarnsNothing() {
        let state = EngineState()
        #expect(GameLedger.finishing(state, GameResult(game: "match", hits: 0, missed: []), now: 1_800_000_000_000) == state)
    }

    @Test func missReturnsInStudyUntilGraded() throws {
        let corpus = try translateCorpus()
        let system = LangSystem(id: "s", name: "es", root: "en", targets: ["es"], createdAt: 0)
        let item = try #require(corpus.items.first { isVocab($0) && $0.form("es") != nil })
        let now = 1_800_000_000_000.0
        var state = gradeCard(EngineState(), "es", item.id, 3, now: now)
        let id = cardId("es", item.id)
        state = GameLedger.finishing(state, GameResult(game: "flags", hits: 0, missed: [id, "es:never-started"]), now: now + 1000)
        #expect(GameLedger.queue(system, state) == [QueueEntry(itemId: item.id, lang: "es", stage: .review)])
        let reviewed = gradeCard(state, "es", item.id, 3, now: now + 2000)
        #expect(GameLedger.queue(system, reviewed).isEmpty)
        #expect(reviewed.cards[id]?.lastReview == now + 2000)
    }

    @Test func hitNeverPromotesACard() throws {
        let corpus = try translateCorpus()
        let item = try #require(corpus.items.first { isVocab($0) && $0.form("es") != nil })
        let now = 1_800_000_000_000.0
        let state = gradeCard(EngineState(), "es", item.id, 3, now: now)
        let id = cardId("es", item.id)
        let next = GameLedger.finishing(state, GameResult(game: "flags", hits: 10, missed: []), now: now + 1000)
        #expect(next.cards[id] == state.cards[id])
    }

    @Test func mergeKeepsBestAndDropsResolvedMisses() throws {
        let corpus = try translateCorpus()
        let item = try #require(corpus.items.first { isVocab($0) && $0.form("es") != nil })
        let now = 1_800_000_000_000.0
        let base = gradeCard(EngineState(), "es", item.id, 3, now: now)
        let id = cardId("es", item.id)
        let missed = GameLedger.finishing(base, GameResult(game: "flags", points: 3, hits: 3, missed: [id]), now: now + 1000)
        let graded = GameLedger.finishing(gradeCard(missed, "es", item.id, 3, now: now + 2000), GameResult(game: "flags", points: 7, hits: 7, missed: []), now: now + 3000)
        let merged = mergeState(graded, missed)
        let ledger = GameLedger(merged)
        #expect(ledger.best["flags"] == 7)
        #expect(ledger.misses.isEmpty)
        let plain = mergeState(EngineState(), EngineState())
        #expect(plain.settingsExtra[GameLedger.key] == nil)
        #expect(EngineState(js: merged.js) == merged)
    }

    @Test func missCapKeepsTheNewest() throws {
        let corpus = try translateCorpus()
        let items = corpus.items.filter { isVocab($0) && $0.form("es") != nil }.prefix(GameLedger.missCap + 4)
        let now = 1_800_000_000_000.0
        var state = EngineState()
        for i in items { state = gradeCard(state, "es", i.id, 3, now: now) }
        var t = now + 1000
        for i in items {
            state = GameLedger.finishing(state, GameResult(game: "flags", hits: 0, missed: [cardId("es", i.id)]), now: t)
            t += 1000
        }
        let open = GameLedger(state).pending(state)
        #expect(open.count == GameLedger.missCap)
        #expect(open.last == cardId("es", items.last!.id))
    }

    @Test func dailySetIsTheSameForEveryoneOnTheSet() throws {
        let corpus = try translateCorpus()
        let a = GameRounds.daily(GameDeck(corpus, root: "en", targets: ["es", "fr"]), day: "2026-11-2")
        let b = GameRounds.daily(GameDeck(corpus, root: "en", targets: ["fr", "es"]), day: "2026-11-2")
        let c = GameRounds.daily(GameDeck(corpus, root: "en", targets: ["es", "fr"]), day: "2026-11-3")
        #expect(a.count == GameRounds.dailyLength)
        #expect(a == b)
        #expect(a.map(\.word.itemId) != c.map(\.word.itemId))
        #expect(Set(a.map(\.word.itemId)).count == a.count)
        #expect(Set(a.map(\.word.lang)) == ["es", "fr"])
        for p in a {
            #expect(p.choices.contains(p.answer))
            #expect(p.choices.count == 4)
            #expect(Set(p.choices).count == 4)
        }
    }

    @Test func sameWordShowsOneMeaningAcrossLanguages() throws {
        let corpus = try translateCorpus()
        var rng = SeededRandom(seed: 5)
        let deck = GameDeck(corpus, root: "en", targets: ["es", "fr", "de", "it"])
        let round = GameRounds.sameWord(deck, words: [], using: &rng)
        let groups = Dictionary(grouping: round, by: \.group)
        #expect(groups.count == GameRounds.sameWordMeanings)
        for prompts in groups.values {
            #expect(prompts.count >= 2 && prompts.count <= GameRounds.sameWordLangs)
            #expect(Set(prompts.map(\.word.itemId)).count == 1)
            #expect(Set(prompts.map(\.word.lang)).count == prompts.count)
            #expect(Set(prompts.map(\.word.gloss)).count == 1)
            let other = prompts.map(\.word.form)
            for p in prompts {
                #expect(p.choices.contains(p.answer))
                #expect(p.choices.contains { $0 != p.answer && other.contains($0) })
                #expect(Set(p.choices).count == p.choices.count)
            }
        }
    }

    @Test func foilsAvoidTheSameMeaning() throws {
        let corpus = try translateCorpus()
        var rng = SeededRandom(seed: 2)
        let deck = GameDeck(corpus, root: "en", targets: ["es"])
        let word = try #require(deck.word(deck.shared()[0], "es"))
        let foils = deck.foils(for: word, using: &rng)
        #expect(foils.count == 3)
        #expect(!foils.contains(word.form))
    }

    @Test func flagDistractorsStayInTheScriptFamily() {
        var rng = SeededRandom(seed: 9)
        let wrong = GameFamilies.distractors(for: "es", own: ["es", "ja", "fr"], using: &rng)
        #expect(wrong.count == 3)
        #expect(wrong.contains("fr"))
        #expect(!wrong.contains("ja"))
        #expect(Set(GameFamilies.distractors(for: "ja", own: ["ja", "es"], using: &rng)) == ["zh", "ko"])
        #expect(!GameFamilies.distractors(for: "es", own: ["es"], excluding: ["pt"], using: &rng).contains("pt"))
    }

    @Test func flagRoundRotatesLanguagesWithoutRepeats() {
        var rng = SeededRandom(seed: 3)
        let pool = words(8) + (0..<8).map { GameWord(itemId: "e\($0)", lang: "es", form: "pal\($0)", gloss: "e\($0)", root: "en") }
        let round = GameRounds.flags(pool, own: ["fr", "es"], mode: .flag, using: &rng)
        #expect(round.count == GameRounds.quizLength)
        #expect(Set(round.map(\.word.id)).count == round.count)
        #expect(round.filter { $0.word.lang == "es" }.count == 5)
        #expect(round.allSatisfy { $0.choices.contains($0.answer) && $0.answer == $0.word.lang })
    }

    @Test func runCountsHitsAndMissedWords() {
        let prompts = words(3).enumerated().map { GamePrompt(id: $0.offset, mode: .form, word: $0.element, choices: [$0.element.form, "x"], answer: $0.element.form) }
        var run = GameRun(prompts)
        #expect(run.answer(prompts[0].answer) == true)
        #expect(run.answer("x") == nil)
        run.advance()
        #expect(run.answer("x") == false)
        run.advance()
        #expect(run.answer(prompts[2].answer) == true)
        run.advance()
        #expect(run.done)
        #expect(run.pattern == "101")
        #expect(run.hits == 2)
        #expect(run.missed == [prompts[1].word])
    }

    @Test func speedBoardKeepsDealingAndHidesTheLastPair() {
        var board = SpeedBoard(deck: words(12), slots: 4, seed: 11)
        #expect(board.playable)
        #expect(board.tapForm("missing") == .ignored)
        let first = board.meanings[0]!
        #expect(board.tapMeaning(first.id) == .picked)
        let wrong = board.forms.compactMap { $0 }.first { $0.id != first.id }!
        #expect(board.tapForm(wrong.id) == .missed(first))
        #expect(board.missed == [first])
        for _ in 0..<30 {
            let m = board.meanings.compactMap { $0 }.first!
            _ = board.tapForm(m.id)
            #expect(board.tapMeaning(m.id) == .matched(m))
            #expect(board.meanings.compactMap { $0 }.count >= 3)
            #expect(Set(board.meanings.compactMap { $0?.gloss }).count == board.meanings.compactMap { $0 }.count)
            #expect(Set(board.meanings.compactMap { $0?.id }) == Set(board.forms.compactMap { $0?.id }))
        }
        #expect(board.hits == 30)
        #expect(board.bestCombo == 30)
        #expect(board.points == 4 + 26 * 2)
        #expect(board.seen.count == 12)
    }

    @Test func speedBoardNeedsThreeWords() {
        #expect(!SpeedBoard(deck: words(2), seed: 1).playable)
        #expect(SpeedBoard(deck: words(3), seed: 1).playable)
    }

    @Test func letterRoundLeadsWithDueLetters() {
        let system = LangSystem(id: "s", name: "s", root: "en", targets: ["es"], createdAt: 0)
        var rng = SeededRandom(seed: 6)
        let round = GameLetters.deal([system], states: [:], now: 0, using: &rng)
        #expect(round.count == GameLetters.roundLength)
        #expect(round.allSatisfy { LetterSounds.lookup("es", $0.form) != nil })
        var state = EngineState()
        let due = round[3]
        state = gradeCard(state, "es", due.itemId, 3, now: 1000)
        var again = SeededRandom(seed: 6)
        #expect(GameLetters.deal([system], states: ["s": state], now: 1000 + 400 * DAY_MS, using: &again).first?.form == due.form)
    }

    @Test func groupQuestScalesToActiveMembers() {
        func member(_ id: String, week: Int, today: Int = 0, me: Bool = false) -> GroupMember {
            GroupMember(userId: id, name: id, role: .member, isMe: me, streak: 0, todayReviews: today, weekReviews: week, lastActivity: nil, languages: [], subjects: [])
        }
        let group = LearningGroup(id: "g", name: "G", kind: .family, code: "c", role: .owner, members: [member("a", week: 60, me: true), member("b", week: 40, today: 5), member("c", week: 0), member("d", week: 0)], goal: GroupGoal(weekly: 201, done: 100))
        let quest = GroupQuest(group)!
        #expect(quest.target == 101)
        #expect(quest.active.map(\.userId) == ["a", "b"])
        #expect(quest.idle.map(\.userId) == ["c", "d"])
        #expect(quest.nudgeable.map(\.userId) == ["c", "d"])
        #expect(!quest.complete)
        var off = group
        off.goal = nil
        #expect(GroupQuest(off) == nil)
    }
}
