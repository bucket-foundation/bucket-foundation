import Foundation

public enum PushEnvironment: String, Sendable {
    case sandbox, production

    public static var current: PushEnvironment {
        #if DEBUG
        .sandbox
        #else
        .production
        #endif
    }
}

public enum PushToken {
    public static func hex(_ data: Data) -> String {
        data.map { String(format: "%02x", $0) }.joined()
    }

    public static func isCheer(_ userInfo: [AnyHashable: Any]) -> Bool {
        userInfo["group"] is String || userInfo["study"] as? Bool == true
    }
}

extension BucketAPI {
    public func registerPush(token: String, device: String, env: PushEnvironment, bundleId: String) async throws {
        try await pushCall(method: "POST", token: token, body: ["token": device, "env": env.rawValue, "bundleId": bundleId])
    }

    public func unregisterPush(token: String, device: String) async throws {
        try await pushCall(method: "DELETE", token: token, body: ["token": device])
    }

    func pushCall(method: String, token: String, body: [String: String]) async throws {
        var r = URLRequest(url: base.appending(path: "api/academy/push/register"))
        r.httpMethod = method
        r.cachePolicy = .reloadIgnoringLocalCacheData
        r.setValue("Bearer \(token)", forHTTPHeaderField: "authorization")
        r.setValue("application/json", forHTTPHeaderField: "content-type")
        r.httpBody = try JSONEncoder().encode(body)
        let (_, http) = try await transport.send(r)
        guard (200..<300).contains(http.statusCode) else { throw http.statusCode == 401 ? BucketError.revoked : BucketError.server(http.statusCode, nil) }
    }
}
