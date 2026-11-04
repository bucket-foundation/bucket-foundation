import StoreKit
import Testing
@testable import Polingual

@MainActor
struct FreeBetaTests {
    @Test func showsInSandbox() {
        #expect(FreeBeta.shows(environment: .sandbox, flag: nil))
        #expect(FreeBeta.shows(environment: .sandbox, flag: "on"))
    }

    @Test func hiddenOnTheAppStore() {
        #expect(!FreeBeta.shows(environment: .production, flag: nil))
        #expect(!FreeBeta.shows(environment: .xcode, flag: nil))
    }

    @Test func flagTurnsItOff() {
        #expect(!FreeBeta.shows(environment: .sandbox, flag: "off"))
    }
}
