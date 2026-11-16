import StoreKit
import Testing
@testable import Polingual

@MainActor
struct FreeBetaTests {
    @Test func showsInSandbox() {
        #expect(FreeBeta.shows(environment: .sandbox, flag: "on", betaBuild: true))
    }

    @Test func hiddenOnTheAppStore() {
        #expect(!FreeBeta.shows(environment: .production, flag: "on", betaBuild: true))
        #expect(!FreeBeta.shows(environment: .xcode, flag: "on", betaBuild: true))
    }

    @Test func hiddenInStoreBuilds() {
        #expect(!FreeBeta.shows(environment: .sandbox, flag: "on", betaBuild: false))
        #expect(!FreeBeta.shows(environment: .production, flag: "on", betaBuild: false))
    }

    @Test func offUnlessFlagIsOn() {
        #expect(!FreeBeta.shows(environment: .sandbox, flag: "off", betaBuild: true))
        #expect(!FreeBeta.shows(environment: .sandbox, flag: "", betaBuild: true))
        #expect(!FreeBeta.shows(environment: .sandbox, flag: nil, betaBuild: true))
    }
}
