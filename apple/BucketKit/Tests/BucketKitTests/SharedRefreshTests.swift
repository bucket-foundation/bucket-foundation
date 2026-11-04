import Foundation
import Testing
@testable import BucketKit

struct SlowRefreshTransport: Transport {
    let calls: LockedBox<[String]>

    func send(_ request: URLRequest) async throws -> (Data, HTTPURLResponse) {
        let body = (try? JSONSerialization.jsonObject(with: request.httpBody ?? Data()) as? [String: String]) ?? [:]
        let used = body["refresh_token"] ?? ""
        calls.mutate { $0.append(used) }
        try await Task.sleep(for: .milliseconds(150))
        let ok = HTTPURLResponse(url: request.url!, statusCode: used == "r0" ? 200 : 401, httpVersion: nil, headerFields: nil)!
        let data = used == "r0" ? json(["access_token": "a1", "refresh_token": "r1", "expires_at": 4_000_000_000, "user_id": "u1"]) : json(["error": "unauthorized"])
        return (data, ok)
    }
}

@Suite @MainActor struct SharedRefreshTests {
    let stale = Session(accessToken: "old", refreshToken: "r0", expiresAt: 0, userId: "u1")

    func lockPath() -> URL {
        FileManager.default.temporaryDirectory.appending(path: "refresh-\(UUID().uuidString)/session-refresh.lock")
    }

    @Test func appAndExtensionRefreshOnceThroughTheSharedLock() async throws {
        let calls = LockedBox<[String]>([])
        let store = MemorySessionStore(stale)
        let path = lockPath()
        let api = BucketAPI(transport: SlowRefreshTransport(calls: calls), cacheDir: nil)
        let app = Account(api: api, store: store, lock: try #require(FileRefreshLock(path: path)))
        let ext = Account(api: api, store: store, lock: try #require(FileRefreshLock(path: path)))
        async let a = app.freshToken()
        async let b = ext.freshToken()
        let (ta, tb) = await (a, b)
        #expect(ta == "a1" && tb == "a1")
        #expect(calls.value == ["r0"])
        #expect(app.stage == .signedIn && ext.stage == .signedIn)
        #expect(ext.session?.refreshToken == "r1")
    }

    @Test func aRevokedRefreshAdoptsTheSessionAnotherProcessSaved() async throws {
        let calls = LockedBox<[String]>([])
        let store = MemorySessionStore(stale)
        let api = BucketAPI(transport: SlowRefreshTransport(calls: calls), cacheDir: nil)
        let other = Account(api: api, store: store)
        let late = Account(api: api, store: store)
        #expect(await other.freshToken() == "a1")
        try store.save(Session(accessToken: "a1", refreshToken: "r1", expiresAt: 4_000_000_000, userId: "u1"))
        #expect(await late.freshToken() == "a1")
        #expect(calls.value == ["r0"])
        #expect(late.stage == .signedIn)
    }

    @Test func anotherUsersSessionIsNeverAdopted() async throws {
        let store = MemorySessionStore(stale)
        let api = BucketAPI(transport: StubTransport { _ in (401, json(["error": "unauthorized"])) }, cacheDir: nil)
        let account = Account(api: api, store: store)
        try store.save(Session(accessToken: "x", refreshToken: "rx", expiresAt: 4_000_000_000, userId: "someone-else"))
        #expect(await account.freshToken() == nil)
        #expect(account.stage == .signedOut)
    }
}

struct FlaggingScreen: ImageScreen {
    let flag: Bool
    func flagged(_ image: Data) async -> Bool { flag }
}

@Suite @MainActor struct ImageScreenTests {
    @Test func flaggedImagesNeverLeaveTheDevice() async throws {
        let sent = LockedBox<Int>(0)
        let store = GroupStore(api: BucketAPI(transport: StubTransport { _ in
            sent.mutate { $0 += 1 }
            return (200, json(["item": ShareSendTests.item]))
        }, cacheDir: nil), token: { "t" })
        store.imageScreen = FlaggingScreen(flag: true)
        let target = ShareTarget(groupId: "g1", name: "Rossi family", kind: .family, recipients: [ShareRecipient(userId: "u2", name: "Nonna")])
        await #expect(throws: BucketError.imageNotAllowed) { try await store.share(.image(Data([0xff, 0xd8, 0xff])), to: target) }
        #expect(sent.value == 0)
        try await store.share(.text("ciao"), to: target)
        store.imageScreen = FlaggingScreen(flag: false)
        try await store.share(.image(Data([0xff, 0xd8, 0xff])), to: target)
        #expect(sent.value == 2)
    }

    @Test func sensitiveScreenPassesWhenAnalysisIsOff() async throws {
        let png = try #require(ShareAvatar.png(initials: "A", seed: "a"))
        #expect(await SensitiveImageScreen().flagged(png) == false)
    }
}
