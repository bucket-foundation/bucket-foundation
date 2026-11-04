import StoreKit
import Testing
@testable import Polingual

@MainActor
struct FreeBetaTests {
    @Test func showsInSandbox() {
        #expect(FreeBeta.shows(environment: .sandbox, flag: "on"))
    }

    @Test func hiddenOnTheAppStore() {
        #expect(!FreeBeta.shows(environment: .production, flag: "on"))
        #expect(!FreeBeta.shows(environment: .xcode, flag: "on"))
    }

    @Test func offUnlessFlagIsOn() {
        #expect(!FreeBeta.shows(environment: .sandbox, flag: "off"))
        #expect(!FreeBeta.shows(environment: .sandbox, flag: ""))
        #expect(!FreeBeta.shows(environment: .sandbox, flag: nil))
    }
}
