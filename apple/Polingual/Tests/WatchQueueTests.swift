import Foundation
import Testing
@testable import Polingual

struct WatchQueueTests {
    func card(_ id: String) -> WatchCard {
        WatchCard(id: id, systemId: "s", itemId: id, lang: "fr", prompt: "night", answer: WatchAnswer(lang: "fr", form: "nuit"))
    }

    @Test func gradesWaitUntilTheStoreIsReady() {
        let d = UserDefaults(suiteName: UUID().uuidString)!
        WatchQueue.enqueue([WatchGrade(card: card("a"), rating: 3, at: 10)], d)
        #expect(WatchQueue.drain(d, ready: false).isEmpty)
        #expect(WatchQueue.pending(d).count == 1)
        WatchQueue.enqueue([WatchGrade(card: card("b"), rating: 1, at: 11)], d)
        let drained = WatchQueue.drain(d, ready: true)
        #expect(drained.map(\.card.id) == ["a", "b"])
        #expect(WatchQueue.pending(d).isEmpty)
    }

    @Test func gradesOlderThanThePhoneReviewAreDropped() {
        let grades = [WatchGrade(card: card("old"), rating: 3, at: 100), WatchGrade(card: card("new"), rating: 3, at: 300), WatchGrade(card: card("legacy"), rating: 1, at: nil)]
        let reviews: [String: Double] = ["old": 200, "new": 200]
        #expect(WatchQueue.fresh(grades) { reviews[$0.card.id] }.map(\.card.id) == ["new", "legacy"])
    }

    @Test func gradedCardsStayHiddenUntilThePhoneDropsThem() {
        let deck = [card("a"), card("b"), card("c")]
        let first = WatchQueue.unseen(deck, graded: ["a", "z"])
        #expect(first.cards.map(\.id) == ["b", "c"])
        #expect(first.graded == ["a"])
        let later = WatchQueue.unseen([card("b"), card("d")], graded: first.graded)
        #expect(later.cards.map(\.id) == ["b", "d"])
        #expect(later.graded.isEmpty)
    }

    @Test func deckTakesTheOldestDueCardsFirst() {
        func due(_ id: String, _ at: Double?) -> WatchCard {
            var c = card(id)
            c.due = at
            return c
        }
        let cards = [due("late", 90), due("future", 500), due("early", 10), due("mid", 50), due("none", nil), due("tie-b", 50)]
        #expect(WatchQueue.oldestDue(cards, now: 100, limit: 20).map(\.id) == ["early", "mid", "tie-b", "late"])
        #expect(WatchQueue.oldestDue(cards, now: 100, limit: 2).map(\.id) == ["early", "mid"])
        #expect(WatchQueue.oldestDue([], now: 100, limit: 20).isEmpty)
    }
}
