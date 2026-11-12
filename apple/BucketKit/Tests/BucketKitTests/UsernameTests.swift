import Foundation
import Testing
@testable import BucketKit

struct UsernameTests {
    @Test func normalizeMatchesServerRules() {
        #expect(Username.normalize("  Gia_Rossi ") == "gia_rossi")
        #expect(Username.normalize("ab") == nil)
        #expect(Username.normalize("_gia") == nil)
        #expect(Username.normalize("gia-") == nil)
        #expect(Username.normalize("gia rossi") == nil)
        #expect(Username.normalize("admin") == nil)
        #expect(Username.normalize(String(repeating: "a", count: 32)) != nil)
        #expect(Username.normalize(String(repeating: "a", count: 33)) == nil)
    }

    @Test func suggestFoldsNamesIntoValidHandles() {
        #expect(Username.suggest(from: "Gia Rossi") == "gia_rossi")
        #expect(Username.suggest(from: "Zoë  O'Neil.") == "zoe_oneil")
        #expect(Username.suggest(from: "李") == "")
        #expect(Username.normalize(Username.suggest(from: "Nonna Maria")) == "nonna_maria")
    }

    @Test func checkReportsTakenFreeAndYours() async {
        let api = BucketAPI(transport: StubTransport { r in
            let q = URLComponents(url: r.url!, resolvingAgainstBaseURL: false)?.queryItems ?? []
            let handle = q.first { $0.name == "handle" }?.value
            if q.contains(where: { $0.name == "me" }) { return (200, json(["profile": ["handle": "gia", "displayName": "Gia", "isPublic": false]])) }
            return handle == "nonna" ? (200, json(["profile": ["handle": "nonna", "displayName": "Nonna"]])) : (404, json(["error": "not_found"]))
        }, cacheDir: nil)
        let store = await GroupStore(api: api) { "tok" }
        await store.loadProfile()
        #expect(await store.profile?.handle == "gia")
        #expect(await store.check(username: "") == .empty)
        #expect(await store.check(username: "a!") == .invalid)
        #expect(await store.check(username: "Gia") == .yours)
        #expect(await store.check(username: "nonna") == .taken)
        #expect(await store.check(username: "zia") == .free)
    }

    @Test func saveRenamesGroupsThenStoresHandle() async throws {
        let calls = LockedBox<[String]>([])
        let api = BucketAPI(transport: StubTransport { r in
            calls.mutate { $0.append(r.url!.path) }
            if r.url!.path.hasSuffix("groups/name") { return (200, json(["displayName": "Gia R", "groups": 1])) }
            let body = try! JSONSerialization.jsonObject(with: r.httpBody!) as! [String: Any]
            #expect(body["handle"] as? String == "gia_r")
            #expect(body["display_name"] as? String == "Gia R")
            return (200, json(["ok": true, "profile": ["handle": "gia_r", "displayName": "Gia R", "isPublic": false]]))
        }, cacheDir: nil)
        let store = await GroupStore(api: api) { "tok" }
        let p = try await store.saveName(displayName: "Gia R", username: " Gia_R ")
        #expect(p.handle == "gia_r")
        #expect(await store.profile == p)
        #expect(calls.value.map { $0.split(separator: "/").suffix(2).joined(separator: "/") } == ["groups/name", "academy/profile"])
    }

    @Test func saveSurfacesTakenAndInvalid() async {
        let api = BucketAPI(transport: StubTransport { r in
            r.url!.path.hasSuffix("groups/name") ? (200, json(["displayName": "Gia", "groups": 0])) : (409, json(["error": "handle_taken"]))
        }, cacheDir: nil)
        let store = await GroupStore(api: api) { "tok" }
        await #expect(throws: BucketError.handleTaken) { try await store.saveName(displayName: "Gia", username: "nonna") }
        await #expect(throws: BucketError.handleInvalid) { try await store.saveName(displayName: "Gia", username: "x") }
    }
}
