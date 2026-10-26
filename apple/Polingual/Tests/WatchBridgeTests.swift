#if os(iOS)
import Foundation
import Testing
@testable import Polingual

@MainActor
final class FakeSink: WatchGradeSink {
    var watchReady = false
    var reviews: [String: Double] = [:]
    var applied: [String] = []
    var flushes = 0

    func lastReview(_ g: WatchGrade) -> Double? { reviews[g.card.id] }
    func applyWatchGrade(_ g: WatchGrade) { applied.append("\(g.card.id)=\(g.rating)") }
    func watchGradesApplied() { flushes += 1 }
}

@MainActor
struct WatchBridgeTests {
    func grade(_ id: String, _ rating: Int, at: Double) -> WatchGrade {
        WatchGrade(card: WatchCard(id: id, systemId: "s", itemId: id, lang: "fr", prompt: "night", answer: WatchAnswer(lang: "fr", form: "nuit")), rating: rating, at: at)
    }

    @Test func gradesQueueUntilTheStoreIsReadyThenApplyWithoutStaleOnes() {
        let bridge = WatchBridge()
        bridge.defaults = UserDefaults(suiteName: UUID().uuidString)!
        let sink = FakeSink()
        sink.reviews = ["stale": 500]
        bridge.sink = sink

        bridge.apply([grade("a", 3, at: 100), grade("stale", 1, at: 200)])
        #expect(sink.applied.isEmpty)
        #expect(WatchQueue.pending(bridge.defaults).count == 2)

        bridge.apply([grade("b", 1, at: 300)])
        #expect(sink.applied.isEmpty)
        #expect(WatchQueue.pending(bridge.defaults).count == 3)

        sink.watchReady = true
        bridge.drain()
        #expect(sink.applied == ["a=3", "b=1"])
        #expect(sink.flushes == 1)
        #expect(WatchQueue.pending(bridge.defaults).isEmpty)

        bridge.drain()
        #expect(sink.flushes == 1)
    }

    @Test func withoutASinkGradesStayQueued() {
        let bridge = WatchBridge()
        bridge.defaults = UserDefaults(suiteName: UUID().uuidString)!
        bridge.apply([grade("a", 3, at: 1)])
        #expect(WatchQueue.pending(bridge.defaults).count == 1)
    }
}
#endif
