import Testing
@testable import BucketKit

private actor Gate {
    private var isOpen = false
    private var waiting: [CheckedContinuation<Void, Never>] = []

    func wait() async {
        if isOpen { return }
        await withCheckedContinuation { waiting.append($0) }
    }

    func open() {
        isOpen = true
        waiting.forEach { $0.resume() }
        waiting = []
    }
}

private actor AskLog {
    private(set) var asks: [[String]] = []
    func add(_ batch: [String]) { asks.append(batch) }
}

@MainActor
private final class Tally {
    var holds = 0
    var releases = 0
    var found: [[String: String]] = []
}

@MainActor
struct WordLookupsTests {
    private static func order(_ groups: [[String]]) -> (Set<String>) -> [[String]] {
        { skip in groups.map { $0.filter { !skip.contains($0) } }.filter { !$0.isEmpty } }
    }

    nonisolated private static func forms(_ batch: [String]) -> [String: String] {
        Dictionary(uniqueKeysWithValues: batch.map { ($0, "form-\($0)") })
    }

    private static func waitFor(_ count: Int, in log: AskLog) async {
        while await log.asks.count < count { await Task.yield() }
    }

    @Test func aSecondViewAsksOnlyForLanguagesNotInFlight() async {
        let tally = Tally()
        let lookups = WordLookups(capacity: 4, hold: { tally.holds += 1 }, release: { tally.releases += 1 })
        let gate = Gate(), log = AskLog()
        let ask: WordLookups.Ask = { batch in
            await log.add(batch)
            await gate.wait()
            return Self.forms(batch)
        }
        let groups = Self.order([["es", "fr"], ["ja"]])
        let card = Task { await lookups.load(word: "Haus", lang: "de", batches: groups, ask: ask, found: { _ in }) }
        await Self.waitFor(1, in: log)
        let detail = Task { await lookups.load(word: "Haus", lang: "de", batches: groups, ask: ask, found: { tally.found.append($0) }) }
        await Self.waitFor(2, in: log)
        await gate.open()
        await card.value
        await detail.value
        #expect(await log.asks.flatMap { $0 }.sorted() == ["es", "fr", "ja"])
        #expect(await log.asks.first == ["es", "fr"])
        #expect(tally.found.last == ["es": "form-es", "fr": "form-fr", "ja": "form-ja"])
        #expect(lookups.entry(word: "Haus", lang: "de").asked == ["es", "fr", "ja"])
        #expect(tally.holds == 2)
        #expect(tally.releases == 2)
    }

    @Test func eachBatchSkipsLanguagesAnotherViewStartedMeanwhile() async {
        let lookups = WordLookups(capacity: 4)
        let gate = Gate(), log = AskLog()
        let ask: WordLookups.Ask = { batch in
            await log.add(batch)
            await gate.wait()
            return Self.forms(batch)
        }
        let card = Task { await lookups.load(word: "Haus", lang: "de", batches: Self.order([["es"], ["fr", "ja"]]), ask: ask, found: { _ in }) }
        await Self.waitFor(1, in: log)
        let detail = Task { await lookups.load(word: "Haus", lang: "de", batches: Self.order([["fr"]]), ask: ask, found: { _ in }) }
        await Self.waitFor(2, in: log)
        await gate.open()
        await card.value
        await detail.value
        #expect(await log.asks == [["es"], ["fr"], ["ja"]])
        #expect(lookups.entry(word: "Haus", lang: "de").found.count == 3)
    }

    @Test func aViewOpenedLaterReusesTheMemo() async {
        let lookups = WordLookups(capacity: 4)
        let log = AskLog()
        let ask: WordLookups.Ask = { batch in
            await log.add(batch)
            return Self.forms(batch)
        }
        await lookups.load(word: "Haus", lang: "de", batches: Self.order([["es"]]), ask: ask, found: { _ in })
        await lookups.load(word: "Haus", lang: "de", batches: Self.order([["es"], ["ja"]]), ask: ask, found: { _ in })
        #expect(await log.asks == [["es"], ["ja"]])
    }

    @Test func languagesWithoutAFormAreAskedOncePerLoad() async {
        let tally = Tally()
        let lookups = WordLookups(capacity: 4, hold: { tally.holds += 1 }, release: { tally.releases += 1 })
        let log = AskLog()
        let ask: WordLookups.Ask = { batch in
            await log.add(batch)
            return [:]
        }
        await lookups.load(word: "Haus", lang: "de", batches: Self.order([["es"], ["fr"]]), ask: ask, found: { tally.found.append($0) })
        #expect(await log.asks == [["es"], ["fr"]])
        #expect(tally.found == [[:], [:]])
        #expect(lookups.entry(word: "Haus", lang: "de").asked.isEmpty)
        #expect(tally.holds == 1)
        #expect(tally.releases == 1)
    }

    @Test func nothingToAskTakesNoShelfHold() async {
        let tally = Tally()
        let lookups = WordLookups(capacity: 4, hold: { tally.holds += 1 }, release: { tally.releases += 1 })
        await lookups.load(word: "Haus", lang: "de", batches: { _ in [] }, ask: { _ in nil }, found: { tally.found.append($0) })
        #expect(tally.holds == 0)
        #expect(tally.releases == 0)
        #expect(tally.found.isEmpty)
    }

    @Test func aCancelledViewStillFillsTheMemoAndReleasesTheShelf() async {
        let tally = Tally()
        let lookups = WordLookups(capacity: 4, hold: { tally.holds += 1 }, release: { tally.releases += 1 })
        let gate = Gate(), log = AskLog()
        let ask: WordLookups.Ask = { batch in
            await log.add(batch)
            await gate.wait()
            return Self.forms(batch)
        }
        let view = Task { await lookups.load(word: "Haus", lang: "de", batches: Self.order([["es"], ["ja"]]), ask: ask, found: { tally.found.append($0) }) }
        await Self.waitFor(1, in: log)
        view.cancel()
        await gate.open()
        await view.value
        #expect(await log.asks == [["es"]])
        #expect(tally.found.isEmpty)
        #expect(lookups.entry(word: "Haus", lang: "de").found == ["es": "form-es"])
        #expect(tally.holds == 1)
        #expect(tally.releases == 1)
    }
}
