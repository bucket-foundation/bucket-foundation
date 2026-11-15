import Foundation
import Testing
@testable import BucketKit

final class PathLog: @unchecked Sendable {
    var up = true
    var paths: [String] = []
}

private func fixture(_ name: String, _ sub: String) throws -> Data {
    let url = try #require(Bundle.module.url(forResource: name, withExtension: "json", subdirectory: sub))
    return try Data(contentsOf: url)
}

@Test func questionsFileFollowsTheDeckFileName() throws {
    let index = try JSONDecoder().decode(DeckIndex.self, from: fixture("index", "Fixtures"))
    let bio = try #require(index.decks.first { $0.id == "05-biophysics" })
    #expect(bio.questionsFile == "corpus/questions/biophysics.json")
    let math = try #require(index.decks.first { $0.id == "01-mathematics" })
    #expect(math.questionsFile == "corpus/questions/01-mathematics.json")
    #expect(PreparedDeck(branch: "x", atoms: []).questionsFile == "corpus/questions/x.json")
}

@Test func saveOfflineKeepsEveryScienceDeckForLaterOfflineUse() async throws {
    let indexData = try fixture("index", "Fixtures")
    let deckData = try fixture("deck", "Fixtures")
    let questionData = try fixture("06-cosmology", "Fixtures/questions")
    let log = PathLog()
    let dir = FileManager.default.temporaryDirectory.appending(path: "api-\(UUID().uuidString)")
    defer { try? FileManager.default.removeItem(at: dir) }
    let api = BucketAPI(transport: StubTransport { req in
        let path = req.url!.path
        log.paths.append(path)
        guard log.up else { return (503, Data()) }
        if path.hasSuffix("index.json") { return (200, indexData) }
        if path.contains("/questions/") { return (200, questionData) }
        return (200, deckData)
    }, cacheDir: dir)

    let entries = try await api.deckIndex().decks
    let science = entries.filter { !$0.isLanguage }
    log.paths = []
    let saved = await api.saveOffline(entries)
    #expect(saved == science.count * 2)
    #expect(!log.paths.contains { $0.contains("lang-") })
    #expect(log.paths.contains("/academy-app/corpus/questions/biophysics.json"))

    log.paths = []
    #expect(await api.saveOffline(entries) == 0)
    #expect(log.paths.isEmpty)

    log.up = false
    for entry in science {
        let deck = try await api.deck(entry)
        #expect(!deck.atoms.isEmpty)
        let questions = try await api.questions(at: entry.questionsFile)
        #expect(!questions.questions.isEmpty)
    }
}
