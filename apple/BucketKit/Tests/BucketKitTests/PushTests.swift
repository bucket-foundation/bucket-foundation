import Foundation
import Testing
@testable import BucketKit

@Suite struct PushTests {
    @Test func tokenIsLowercaseHex() {
        #expect(PushToken.hex(Data([0x00, 0xAB, 0x0F, 0xFF])) == "00ab0fff")
    }

    @Test func debugBuildsUseTheSandbox() {
        #if DEBUG
        #expect(PushEnvironment.current == .sandbox)
        #else
        #expect(PushEnvironment.current == .production)
        #endif
    }

    @Test func cheerNotificationsAreRecognized() {
        #expect(PushToken.isCheer(["group": "g1", "aps": [:] as [String: Any]]))
        #expect(PushToken.isCheer(["study": true]))
        #expect(!PushToken.isCheer(["other": 1]))
    }

    @Test func registerAndUnregisterUseTheContract() async throws {
        let seen = LockedBox<[URLRequest]>([])
        let api = BucketAPI(transport: StubTransport { r in
            seen.mutate { $0.append(r) }
            return (200, json(["ok": true]))
        }, cacheDir: nil)
        try await api.registerPush(token: "tok", device: "abcd", env: .sandbox, bundleId: "com.polingual.app")
        try await api.unregisterPush(token: "tok", device: "abcd")
        let r = seen.value
        #expect(r.map { $0.url!.path } == ["/api/academy/push/register", "/api/academy/push/register"])
        #expect(r.map { $0.httpMethod } == ["POST", "DELETE"])
        #expect(r.allSatisfy { $0.value(forHTTPHeaderField: "authorization") == "Bearer tok" })
        #expect(body(r[0]) == ["token": "abcd", "env": "sandbox", "bundleId": "com.polingual.app"])
        #expect(body(r[1]) == ["token": "abcd"])
    }

    @Test func unauthorizedMeansRevoked() async {
        let api = BucketAPI(transport: StubTransport { _ in (401, Data()) }, cacheDir: nil)
        await #expect(throws: BucketError.revoked) {
            try await api.registerPush(token: "t", device: "abcd", env: .production, bundleId: "foundation.bucket.app")
        }
    }
}
