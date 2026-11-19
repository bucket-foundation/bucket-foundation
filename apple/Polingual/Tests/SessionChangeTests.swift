import BucketKit
import Foundation
import Testing
@testable import Polingual

final class GuestCalls: @unchecked Sendable {
    private let lock = NSLock()
    private var seen: [String] = []
    var all: [String] { lock.withLock { seen } }
    func add(_ call: String) { lock.withLock { seen.append(call) } }
}

struct GuestMergeTransport: Transport {
    let calls: GuestCalls
    func send(_ request: URLRequest) async throws -> (Data, HTTPURLResponse) {
        let path = request.url!.path
        calls.add("\(path) \(request.value(forHTTPHeaderField: "authorization") ?? "-")")
        let body = if path.hasSuffix("/guest") {
            #"{"token":"g1.abc.def","userId":"u-guest","expiresAt":"2099-01-01T00:00:00Z"}"#
        } else if path.hasSuffix("/merge") {
            #"{"ok":true,"merged":1}"#
        } else {
            #"{"lobbies":[]}"#
        }
        return (Data(body.utf8), HTTPURLResponse(url: request.url!, statusCode: 200, httpVersion: nil, headerFields: nil)!)
    }
}

@MainActor
final class SignedInFlag {
    var on = false
}

@MainActor
struct SessionChangeTests {
    @Test func signInAndUserSignOutAreTheOnlyChanges() {
        #expect(SessionChange.of(old: .signedOut, new: .signedIn, endedByUser: false) == .signedIn)
        #expect(SessionChange.of(old: .codeSent("a@b.c"), new: .signedIn, endedByUser: false) == .signedIn)
        #expect(SessionChange.of(old: .signedIn, new: .signedIn, endedByUser: false) == .none)
        #expect(SessionChange.of(old: .signedIn, new: .signedOut, endedByUser: true) == .endedByUser)
        #expect(SessionChange.of(old: .signedIn, new: .signedOut, endedByUser: false) == .none)
        #expect(SessionChange.of(old: .signedOut, new: .codeSent("a@b.c"), endedByUser: true) == .none)
        #expect(SessionChange.of(old: .codeSent("a@b.c"), new: .signedOut, endedByUser: true) == .none)
    }

    @Test func signInMergesTheGuestLobbySeat() async throws {
        let calls = GuestCalls()
        let api = BucketAPI(transport: GuestMergeTransport(calls: calls), cacheDir: nil)
        let defaults = try #require(UserDefaults(suiteName: "guest-\(UUID().uuidString)"))
        let pass = GuestPass(api: api, defaults: defaults) { "Gia" }
        let signedIn = SignedInFlag()
        let lobbies = LobbyStore(api: api, token: { signedIn.on ? "user" : nil }, guest: pass)
        await lobbies.refresh()
        #expect(pass.userId == "u-guest")
        #expect(SessionChange.none.mergeGuest(lobbies) == nil)
        #expect(SessionChange.endedByUser.mergeGuest(lobbies) == nil)
        signedIn.on = true
        await SessionChange.signedIn.mergeGuest(lobbies)?.value
        #expect(calls.all.last == "/api/academy/lobbies/guest/merge Bearer user")
        #expect(calls.all.filter { $0.contains("/merge") }.count == 1)
        #expect(pass.userId == nil)
    }

    @Test func aLinkPicksItsTabAndNoLinkKeepsTheTab() {
        #expect(AppTab.following(nil, current: .games) == .games)
        #expect(AppTab.following(.voice, current: .account) == .learn)
        #expect(AppTab.following(.group("7K3M9QX2PD"), current: .today) == .account)
        #expect(AppTab.following(.home, current: .learn) == .today)
    }
}
