import BucketKit
import Foundation
import Observation

@MainActor
@Observable
final class Library {
    enum Load<T> { case idle, loading, ready(T), failed(String) }

    private(set) var index: Load<[DeckEntry]> = .idle
    private(set) var decks: [String: Deck] = [:]
    private(set) var deckErrors: [String: String] = [:]

    let api: BucketAPI

    init(api: BucketAPI) { self.api = api }

    var scienceDecks: [DeckEntry] {
        if case .ready(let d) = index { return d.filter { !$0.isLanguage } }
        return []
    }

    var languageDecks: [DeckEntry] {
        if case .ready(let d) = index { return d.filter(\.isLanguage) }
        return []
    }


    func loadIndex() async {
        if case .ready = index { return }
        index = .loading
        do {
            index = .ready(try await api.deckIndex().decks)
        } catch {
            index = .failed(error.localizedDescription)
        }
    }

    func retryIndex() async {
        index = .idle
        await loadIndex()
    }

    func deck(_ entry: DeckEntry) async -> Deck? {
        if let d = decks[entry.id] { return d }
        deckErrors[entry.id] = nil
        do {
            let d = try await api.deck(entry)
            decks[entry.id] = d
            return d
        } catch {
            deckErrors[entry.id] = error.localizedDescription
            return nil
        }
    }
}
