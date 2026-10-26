import Foundation
import Testing
@testable import BucketKit

@Test func appleNonceHashesWithSHA256() {
    #expect(AppleNonce.sha256("abc") == "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad")
    let n = AppleNonce.make()
    #expect(n.raw.count == 32)
    #expect(n.hashed.count == 64)
    #expect(AppleNonce.make() != n)
}
