import Foundation
import Testing
@testable import BucketKit

func libraryFixture(_ name: String) throws -> Data {
    let url = try #require(Bundle.module.url(forResource: name, withExtension: "json", subdirectory: "Fixtures/library"))
    return try Data(contentsOf: url)
}

func libraryCacheDir() -> URL {
    FileManager.default.temporaryDirectory.appending(path: "library-test-\(UUID().uuidString)", directoryHint: .isDirectory)
}

final class LibraryCalls: @unchecked Sendable {
    var paths: [String] = []
}

@Test func libraryIndexDecodesTheFixture() throws {
    let index = try JSONDecoder().decode(LibraryIndex.self, from: libraryFixture("index"))
    #expect(index.version == 1)
    #expect(index.books.map(\.id) == ["fox-and-grapes", "north-wind-and-sun"])
    let fox = index.books[0]
    #expect(fox.langs == ["en", "es", "ar"])
    #expect(fox.sentences == 3)
    #expect(fox.year == 1867)
    #expect(fox.translation == "machine")
    #expect(fox.title(in: ["es"]) == "La zorra y las uvas")
    #expect(fox.title(in: ["ja"]) == "The Fox and the Grapes")
}

@Test func libraryBookDecodesEverySentenceInEveryLanguage() throws {
    for name in ["fox-and-grapes", "north-wind-and-sun"] {
        let book = try JSONDecoder().decode(LibraryBook.self, from: libraryFixture(name))
        #expect(book.id == name)
        #expect(book.sentences.count == 3)
        for s in book.sentences { #expect(Set(s.keys) == ["en", "es", "ar"]) }
        #expect(book.sourceURL?.host() == "www.gutenberg.org")
        #expect(book.license.hasPrefix("Public domain"))
    }
}

@Test func libraryLinesFollowTheLearnerOrderAndFallBackToEnglish() throws {
    let book = try JSONDecoder().decode(LibraryBook.self, from: libraryFixture("fox-and-grapes"))
    #expect(book.lines(0, langs: ["ar", "es", "fr"]).map(\.lang) == ["ar", "es"])
    #expect(book.lines(2, langs: ["ja"]).map(\.lang) == ["en"])
    #expect(book.lines(3, langs: ["es"]).isEmpty)
}

@Test func libraryAPIFetchesCachesAndServesOffline() async throws {
    let dir = libraryCacheDir()
    defer { try? FileManager.default.removeItem(at: dir) }
    let calls = LibraryCalls()
    let index = try libraryFixture("index")
    let fox = try libraryFixture("fox-and-grapes")
    let online = LibraryAPI(transport: StubTransport { r in
        calls.paths.append(r.url!.path())
        return r.url!.lastPathComponent == "index.json" ? (200, index) : (200, fox)
    }, cacheDir: dir)
    #expect(try await online.index().books.count == 2)
    #expect(try await online.book("fox-and-grapes").sentences.count == 3)
    #expect(calls.paths == ["/library/index.json", "/library/fox-and-grapes.json"])
    #expect(try await online.book("fox-and-grapes").id == "fox-and-grapes")
    #expect(calls.paths.count == 2)

    let offline = LibraryAPI(transport: ThrowingTransport(error: URLError(.notConnectedToInternet)), cacheDir: dir)
    #expect(try await offline.index().books.count == 2)
    #expect(try await offline.book("fox-and-grapes").sentences.count == 3)
    #expect(offline.cachedBook("fox-and-grapes") != nil)
    await #expect(throws: (any Error).self) { try await offline.book("north-wind-and-sun") }
    await #expect(throws: (any Error).self) { try await offline.book("../index") }
}

@Test func libraryAPIRejectsServerErrors() async throws {
    let api = LibraryAPI(transport: StubTransport { _ in (500, Data()) }, cacheDir: libraryCacheDir())
    await #expect(throws: (any Error).self) { try await api.index() }
}

@Test func libraryProgressIsKeptPerBook() throws {
    let name = "library-progress-test"
    let defaults = try #require(UserDefaults(suiteName: name))
    defaults.removePersistentDomain(forName: name)
    defer { defaults.removePersistentDomain(forName: name) }
    let progress = LibraryProgress(defaults: defaults)
    #expect(progress.sentence("fox-and-grapes") == 0)
    progress.save("fox-and-grapes", sentence: 2)
    progress.save("north-wind-and-sun", sentence: 1)
    #expect(LibraryProgress(defaults: defaults).sentence("fox-and-grapes") == 2)
    #expect(progress.sentence("north-wind-and-sun") == 1)
    progress.clear("fox-and-grapes")
    #expect(progress.sentence("fox-and-grapes") == 0)
}
