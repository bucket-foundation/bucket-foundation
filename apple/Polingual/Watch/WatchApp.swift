import SwiftUI
import WatchConnectivity

@MainActor
@Observable
final class WatchModel: NSObject, WCSessionDelegate {
    var cards: [WatchCard] = []
    var index = 0
    var revealed = false
    var done = 0
    var graded: Set<String> = Set(UserDefaults.standard.stringArray(forKey: WatchQueue.gradedKey) ?? [])

    override init() {
        super.init()
        if let data = UserDefaults.standard.data(forKey: WatchKeys.deck), let saved = try? JSONDecoder().decode([WatchCard].self, from: data) { cards = WatchQueue.unseen(saved, graded: graded).cards }
        if WCSession.isSupported() {
            WCSession.default.delegate = self
            WCSession.default.activate()
        }
    }

    var current: WatchCard? { index < cards.count ? cards[index] : nil }

    func grade(_ rating: Int) {
        guard let card = current else { return }
        graded.insert(card.id)
        UserDefaults.standard.set(Array(graded), forKey: WatchQueue.gradedKey)
        if let data = try? JSONEncoder().encode([WatchGrade(card: card, rating: rating, at: Date().timeIntervalSince1970 * 1000)]) {
            WCSession.default.transferUserInfo([WatchKeys.grades: data])
        }
        done += 1
        index += 1
        revealed = false
    }

    nonisolated func session(_ session: WCSession, activationDidCompleteWith activationState: WCSessionActivationState, error: Error?) {
        let data = session.receivedApplicationContext[WatchKeys.deck] as? Data
        Task { @MainActor in self.take(data) }
    }

    nonisolated func session(_ session: WCSession, didReceiveApplicationContext applicationContext: [String: Any]) {
        let data = applicationContext[WatchKeys.deck] as? Data
        Task { @MainActor in self.take(data) }
    }

    func take(_ data: Data?) {
        guard let data, let deck = try? JSONDecoder().decode([WatchCard].self, from: data) else { return }
        UserDefaults.standard.set(data, forKey: WatchKeys.deck)
        let next = WatchQueue.unseen(deck, graded: graded)
        graded = next.graded
        UserDefaults.standard.set(Array(graded), forKey: WatchQueue.gradedKey)
        if next.cards.map(\.id) != cards.map(\.id) {
            cards = next.cards
            index = 0
            revealed = false
        }
    }
}

@main
struct PolingualWatchApp: App {
    @State private var model = WatchModel()

    var body: some Scene {
        WindowGroup { ReviewView().environment(model) }
    }
}

struct ReviewView: View {
    @Environment(WatchModel.self) private var model

    var body: some View {
        if let card = model.current {
            VStack(spacing: 8) {
                Text("\(model.index + 1) of \(model.cards.count)").font(.caption2).foregroundStyle(.secondary)
                Text(card.prompt).font(.title3.bold()).multilineTextAlignment(.center).minimumScaleFactor(0.6)
                if model.revealed {
                    Text(card.answer.form).font(.headline).foregroundStyle(Color(red: 0.36, green: 0.1, blue: 0.29)).minimumScaleFactor(0.6)
                    HStack {
                        Button("Again") { model.grade(1) }.tint(.red)
                        Button("Got it") { model.grade(3) }.tint(.green)
                    }
                } else {
                    Button("Show") { model.revealed = true }
                }
            }
            .padding(.horizontal, 4)
        } else {
            VStack(spacing: 6) {
                Image(systemName: "checkmark.circle.fill").font(.largeTitle).foregroundStyle(.green)
                Text(model.done > 0 ? "\(model.done) reviewed" : "Nothing due").font(.headline)
                Text("Open Polingual on your iPhone for new words.").font(.caption2).multilineTextAlignment(.center).foregroundStyle(.secondary)
            }
        }
    }
}
