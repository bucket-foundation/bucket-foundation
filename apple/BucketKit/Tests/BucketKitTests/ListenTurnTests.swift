import Foundation
import Testing
@testable import BucketKit

@Suite struct ListenTurnTests {
    let ids = (0..<6).map { _ in UUID() }

    @Test func wordStartShowsItsCard() {
        var t = ListenTurn()
        t.enqueue(card: 2, word: ids[0], meaning: ids[1])
        #expect(t.started(ids[0]) == .show(card: 2))
    }

    @Test func meaningStartAsksForTheNextCardOnce() {
        var t = ListenTurn()
        t.enqueue(card: 0, word: ids[0], meaning: ids[1])
        #expect(t.started(ids[1]) == .lookahead(after: 0))
        t.enqueue(card: 1, word: ids[2], meaning: ids[3])
        #expect(t.started(ids[1]) == nil)
    }

    @Test func meaningEndFinishesTheCardAndKeepsTheLookahead() {
        var t = ListenTurn()
        t.enqueue(card: 0, word: ids[0], meaning: ids[1])
        t.enqueue(card: 1, word: ids[2], meaning: ids[3])
        let word = t.finished(ids[0])
        #expect(word == nil)
        let card = t.finished(ids[1])
        #expect(card == 0)
        #expect(t.queuedCards == [1])
    }

    @Test func staleCallbacksAreIgnored() {
        var t = ListenTurn()
        t.enqueue(card: 0, word: ids[0], meaning: ids[1])
        t.clear()
        t.enqueue(card: 3, word: ids[4], meaning: ids[5])
        #expect(t.started(ids[0]) == nil)
        let stale = t.finished(ids[1])
        #expect(stale == nil)
        #expect(t.queuedCards == [3])
    }
}

@Suite struct ListenSkipTests {
    let cards = [
        ListenCard(text: "agua", lang: "es", meaning: "water", meaningLang: "en"),
        ListenCard(text: "水", lang: "zz", meaning: "water", meaningLang: "en"),
        ListenCard(text: "chat", lang: "fr", meaning: "cat", meaningLang: "en"),
    ]
    let can: (ListenCard) -> Bool = { $0.lang != "zz" }

    @Test func playableSkipsSilentCards() {
        let q = ListenQueue(cards: cards)
        #expect(q.playable(from: 1, can) == 2)
        #expect(q.playable(from: 0, can) == 0)
    }

    @Test func playableWrapsToTheStart() {
        let q = ListenQueue(cards: cards)
        #expect(q.playable(from: q.after(2), can) == 0)
    }

    @Test func nothingPlayableGivesNil() {
        #expect(ListenQueue(cards: cards).playable(from: 0) { _ in false } == nil)
        #expect(ListenQueue(cards: []).playable(from: 0, can) == nil)
    }

    @Test func jumpStaysInRange() {
        var q = ListenQueue(cards: cards)
        q.jump(to: 2)
        #expect(q.index == 2)
        q.jump(to: 9)
        #expect(q.index == 2)
        #expect(q.after(2) == 0)
    }
}
