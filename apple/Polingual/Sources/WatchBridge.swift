#if os(iOS)
import BucketKit
import Foundation
import WatchConnectivity

@MainActor
final class WatchBridge: NSObject, WCSessionDelegate {
    static let shared = WatchBridge()
    weak var store: LangStore?

    func start(_ store: LangStore) {
        self.store = store
        guard WCSession.isSupported() else { return }
        WCSession.default.delegate = self
        WCSession.default.activate()
    }

    func send(now: Date = .now) {
        guard let store, let corpus = store.corpus, WCSession.default.activationState == .activated, WCSession.default.isPaired, WCSession.default.isWatchAppInstalled else { return }
        let ms = now.timeIntervalSince1970 * 1000
        var cards: [WatchCard] = []
        for system in store.systems {
            for (id, card) in store.state(system.id).cards.entries {
                guard let due = card.due, due <= ms else { continue }
                let p = parseCardId(id)
                guard system.targets.contains(p.lang), let item = corpus.byId[p.itemId], let form = item.form(p.lang), let prompt = item.form(system.root) else { continue }
                cards.append(WatchCard(id: "\(system.id)|\(id)", systemId: system.id, itemId: p.itemId, lang: p.lang, prompt: prompt, answer: WatchAnswer(lang: p.lang, form: form)))
                if cards.count >= 20 { break }
            }
            if cards.count >= 20 { break }
        }
        guard let data = try? JSONEncoder().encode(cards) else { return }
        try? WCSession.default.updateApplicationContext([WatchKeys.deck: data])
    }

    func apply(_ grades: [WatchGrade]) {
        guard let store else { return }
        for g in grades {
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
