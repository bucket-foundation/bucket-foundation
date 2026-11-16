import Foundation
import Testing
@testable import BucketKit

@MainActor
struct LobbyLiveTests {
    nonisolated static let env = ProcessInfo.processInfo.environment

    @Test(.enabled(if: env["LOBBY_E2E_BASE"] != nil && env["LOBBY_E2E_CODE_FILE"] != nil))
    func hostsAGameWithABrowserGuest() async throws {
        let base = try #require(URL(string: Self.env["LOBBY_E2E_BASE"] ?? ""))
        let api = BucketAPI(base: base, cacheDir: nil)
        let defaults = try #require(UserDefaults(suiteName: "lobby-e2e-\(UUID().uuidString)"))
        let store = LobbyStore(api: api, token: { nil }, guest: GuestPass(api: api, defaults: defaults) { "iPhone" })
        let lobby = try await store.create(name: "Two device test", root: "en", targets: ["es", "fr"], rounds: 3, roundSeconds: 6, listed: false, displayName: "iPhone")
        try lobby.code.write(toFile: Self.env["LOBBY_E2E_CODE_FILE"] ?? "", atomically: true, encoding: .utf8)
        try await store.setReady(true)
        let deadline = Date().addingTimeInterval(180)
        while (store.current?.readyCount ?? 0) < 2, Date() < deadline {
            try await Task.sleep(for: .seconds(1))
            await store.poll()
        }
        #expect(store.current?.readyCount == 2)
        try await store.start()
        while store.current?.status != .done, Date() < deadline {
            try await Task.sleep(for: .milliseconds(700))
            await store.poll()
            guard let now = store.current, let index = now.round?.index, index >= 0, store.picks[index] == nil, let prompt = now.prompt(index) else { continue }
            await store.pick(prompt.choices[0], round: index)
        }
        let done = try #require(store.current)
        print("LOBBY_E2E", done.code, done.status, done.standings.map { "\($0.name)=\($0.score)" }, "results", done.results.count)
        #expect(done.status == .done)
        #expect(done.players.count == 2)
        #expect(Set(done.results.map(\.userId)).count == 2)
        #expect(store.picks.count == 3)
    }
}
