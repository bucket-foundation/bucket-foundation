import BucketKit
import SwiftUI

struct StudyLaunch: Identifiable {
    let entry: DeckEntry
    let deck: PreparedDeck
    var id: String { entry.id }
}

@MainActor
protocol Subjects {
    var decks: [DeckEntry] { get }
    var indexDone: Bool { get }
    func work(_ entry: DeckEntry) -> TodayView.Work?
    func state(_ id: String) -> EngineState
    func masteredPercent(_ deck: PreparedDeck) -> Int
    func load() async
    func prepared(_ entry: DeckEntry) async -> PreparedDeck?
    func study(_ launch: StudyLaunch) -> AnyView
    func section(open: @escaping (DeckEntry) -> Void, search: @escaping () -> Void) -> AnyView
    func deck(_ entry: DeckEntry) -> AnyView
    func atom(_ route: AtomRoute) -> AnyView
    func canon() -> AnyView
}
