#if os(iOS)
import BucketKit
import Foundation
import WatchConnectivity

@MainActor
final class WatchBridge: NSObject, WCSessionDelegate {
    static let shared = WatchBridge()
    weak var store: LangStore?
    var allowed: () -> Bool = { true }
    var defaults = UserDefaults.standard

    func start(_ store: LangStore) {
        self.store = store
        guard WCSession.isSupported() else { return }
        WCSession.default.delegate = self
        WCSession.default.activate()
    }

    func send(now: Date = .now) {
        drain()
        guard let store, let corpus = store.corpus, WCSession.default.activationState == .activated, WCSession.default.isPaired, WCSession.default.isWatchAppInstalled else { return }
        let ms = now.timeIntervalSince1970 * 1000
        var cards: [WatchCard] = []
        guard allowed() else {
            try? WCSession.default.updateApplicationContext([WatchKeys.deck: (try? JSONEncoder().encode(cards)) ?? Data()])
            return
        }
        for system in store.systems {
            for (id, card) in store.state(system.id).cards.entries {
                guard let due = card.due, due <= ms else { continue }
                let p = parseCardId(id)
                guard system.targets.contains(p.lang), let item = corpus.byId[p.itemId], let form = item.form(p.lang), let prompt = item.form(system.root) else { continue }
                cards.append(WatchCard(id: "\(system.id)|\(id)", systemId: system.id, itemId: p.itemId, lang: p.lang, prompt: prompt, answer: WatchAnswer(lang: p.lang, form: form), due: due))
            }
        }
        cards = WatchQueue.oldestDue(cards, now: ms, limit: 20)
        guard let data = try? JSONEncoder().encode(cards) else { return }
        try? WCSession.default.updateApplicationContext([WatchKeys.deck: data])
    }

    var ready: Bool { store?.status == .ready && store?.systems.isEmpty == false }

    func apply(_ grades: [WatchGrade]) {
        WatchQueue.enqueue(grades, defaults)
        drain()
    }

    func drain() {
        guard let store else { return }
        let grades = WatchQueue.drain(defaults, ready: ready)
        guard !grades.isEmpty else { return }
        let fresh = WatchQueue.fresh(grades) { g in
            store.state(g.card.systemId).cards[cardId(g.card.lang, g.card.itemId)]?.lastReview
        }
        for g in fresh {
            store.grade(g.card.systemId, lang: g.card.lang, itemId: g.card.itemId, rating: Rating(g.rating))
        }
        Task { await store.flush() }
    }

    nonisolated func session(_ session: WCSession, activationDidCompleteWith activationState: WCSessionActivationState, error: Error?) {
        Task { @MainActor in self.send() }
    }

    nonisolated func sessionDidBecomeInactive(_ session: WCSession) {}

    nonisolated func sessionDidDeactivate(_ session: WCSession) { session.activate() }

    nonisolated func session(_ session: WCSession, didReceiveUserInfo userInfo: [String: Any] = [:]) {
        guard let data = userInfo[WatchKeys.grades] as? Data, let grades = try? JSONDecoder().decode([WatchGrade].self, from: data) else { return }
        Task { @MainActor in self.apply(grades) }
    }
}
#endif
