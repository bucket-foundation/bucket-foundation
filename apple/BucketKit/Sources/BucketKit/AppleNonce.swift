import CryptoKit
import Foundation

public struct AppleNonce: Sendable, Equatable {
    public let raw: String
    public var hashed: String { Self.sha256(raw) }

    public init(raw: String) { self.raw = raw }

    public static func make(length: Int = 32) -> AppleNonce {
        let charset = Array("0123456789ABCDEFGHIJKLMNOPQRSTUVXYZabcdefghijklmnopqrstuvwxyz-._")
        var rng = SystemRandomNumberGenerator()
        return AppleNonce(raw: String((0..<length).map { _ in charset[Int(rng.next(upperBound: UInt(charset.count)))] }))
    }

    public static func sha256(_ s: String) -> String {
        SHA256.hash(data: Data(s.utf8)).map { String(format: "%02x", $0) }.joined()
    }
}
