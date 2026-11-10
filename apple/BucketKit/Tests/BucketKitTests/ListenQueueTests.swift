import Testing
@testable import BucketKit

@Suite struct ListenQueueTests {
    let words = [
        GameWord(itemId: "a", lang: "es", form: "agua", gloss: "water", root: "en", rank: 3),
        GameWord(itemId: "b", lang: "es", form: "casa", gloss: "house", root: "en", rank: 1),
        GameWord(itemId: "a", lang: "es", form: "agua", gloss: "water", root: "en", rank: 3),
        GameWord(itemId: "c", lang: "fr", form: "chat", gloss: "cat", root: "en", rank: 2),
        GameWord(itemId: "d", lang: "es", form: "", gloss: "empty", root: "en"),
        GameWord(itemId: "e", lang: "es", form: "taxi", gloss: "taxi", root: "en"),
    ]

    @Test func buildsFromWordsByRankWithoutRepeats() {
        let q = ListenQueue(words: words)
        #expect(q.cards.map(\.text) == ["casa", "chat", "agua"])
        #expect(q.current == ListenCard(text: "casa", lang: "es", meaning: "house", meaningLang: "en"))
    }

    @Test func limitCapsTheSession() {
        #expect(ListenQueue(words: words, limit: 2).cards.count == 2)
        #expect(ListenQueue(words: words, limit: 0).isEmpty)
    }

    @Test func stepsSayWordPauseMeaningPause() {
        let q = ListenQueue(words: words)
        #expect(q.steps == [.say(text: "casa", lang: "es"), .wait(ListenQueue.gap), .say(text: "house", lang: "en"), .wait(ListenQueue.afterMeaning)])
    }

    @Test func nextWalksForwardAndWraps() {
        var q = ListenQueue(words: words)
        let moved1 = q.next()
        #expect(moved1)
        let moved2 = q.next()
        #expect(moved2)
        #expect(q.current?.text == "agua")
        #expect(!q.hasNext)
        let moved3 = q.next(wrap: false)
        #expect(!moved3)
        #expect(q.current?.text == "agua")
        let moved4 = q.next()
        #expect(moved4)
        #expect(q.position.number == 1)
    }

    @Test func previousStopsAtTheFirstWord() {
        var q = ListenQueue(words: words)
        let moved5 = q.previous()
        #expect(!moved5)
        q.next()
        let moved6 = q.previous()
        #expect(moved6)
        #expect(q.index == 0)
    }

    @Test func emptyQueueHasNoSteps() {
        var q = ListenQueue(cards: [])
        #expect(q.current == nil)
        #expect(q.steps.isEmpty)
        let moved7 = q.next()
        #expect(!moved7)
        #expect(q.position.number == 0)
    }

    @Test func startIsClamped() {
        let cards = ListenQueue(words: words).cards
        #expect(ListenQueue(cards: cards, start: 9).index == 2)
        #expect(ListenQueue(cards: cards, start: -1).index == 0)
    }
}
