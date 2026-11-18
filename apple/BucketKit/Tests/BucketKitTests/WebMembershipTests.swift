import Foundation
import Testing
@testable import BucketKit

struct EntitlementTransport: Transport {
    let status: Int
    let body: String
    var fails = false

    func send(_ request: URLRequest) async throws -> (Data, HTTPURLResponse) {
        if fails { throw URLError(.notConnectedToInternet) }
        #expect(request.url?.path == "/api/academy/entitlement")
        #expect(request.value(forHTTPHeaderField: "authorization") == "Bearer tok")
        return (Data(body.utf8), HTTPURLResponse(url: request.url!, statusCode: status, httpVersion: nil, headerFields: nil)!)
    }
}

@Suite struct WebEntitlementTests {
    static let now = Date(timeIntervalSince1970: 1_795_042_800)
    static let year = now.addingTimeInterval(365 * 86_400)

    static func web(_ user: String = "u1", expires: Date? = year, fetched: Date = now) -> WebEntitlement {
        WebEntitlement(userId: user, productId: "web.polingual.gift.year", expires: expires, fetched: fetched)
    }

    static func parse(_ json: String) -> WebEntitlementReply { WebEntitlement.parse(Data(json.utf8), userId: "u1", now: now) }

    @Test func webGrantParsesWithItsExpiry() {
        let reply = Self.parse(#"{"active":true,"productId":"web.polingual.gift.year","expiresAt":"2027-11-18T23:00:00.123456+00:00","trial":false}"#)
        #expect(reply == .entitled(WebEntitlement(userId: "u1", productId: "web.polingual.gift.year", expires: Self.year, fetched: Self.now)))
        #expect(Self.parse(#"{"active":true,"productId":"web.polingual.membership","expiresAt":"2027-11-18T23:00:00Z","trial":false}"#) == .entitled(WebEntitlement(userId: "u1", productId: "web.polingual.membership", expires: Self.year, fetched: Self.now)))
    }

    @Test func inactiveOrAppStoreRepliesAreNotAWebGrant() {
        #expect(Self.parse(#"{"active":false,"productId":null,"expiresAt":null,"trial":false}"#) == .none)
        #expect(Self.parse(#"{"active":true,"productId":"com.polingual.yearly","expiresAt":"2027-11-18T23:00:00Z","trial":false}"#) == .none)
        #expect(Self.parse(#"{"active":true,"productId":null,"expiresAt":null,"trial":false}"#) == .none)
        #expect(Self.parse(#"{"active":true,"productId":"web.polingual.gift.year","expiresAt":"2026-11-01T00:00:00Z","trial":false}"#) == .none)
    }

    @Test func unreadableRepliesCountAsFailure() {
        #expect(Self.parse("") == .failed)
        #expect(Self.parse("<html>Not Found</html>") == .failed)
        #expect(Self.parse(#"{"error":"unavailable"}"#) == .failed)
        #expect(Self.parse(#"{"active":true,"productId":"web.polingual.gift.year","expiresAt":"next year"}"#) == .failed)
    }

    @Test func datedGrantNeedsARefreshWithinSevenDays() {
        let grant = Self.web()
        #expect(grant.lapse == Self.now.addingTimeInterval(7 * 86_400))
        #expect(grant.valid(for: "u1", now: Self.now.addingTimeInterval(6 * 86_400)))
        #expect(!grant.valid(for: "u1", now: Self.now.addingTimeInterval(7 * 86_400 + 1)))
        #expect(MemberTier.merged(store: .locked, web: grant, userId: "u1", now: Self.now.addingTimeInterval(30 * 86_400)).tier == .locked)
        #expect(MemberTier.merged(store: .subscribed, web: grant, userId: "u1", now: Self.now.addingTimeInterval(30 * 86_400)).tier == .subscribed)
    }

    @Test func grantEndingSoonLapsesAtItsExpiry() {
        let soon = Self.web(expires: Self.now.addingTimeInterval(3_600))
        #expect(soon.lapse == Self.now.addingTimeInterval(3_600))
        #expect(!soon.valid(for: "u1", now: Self.now.addingTimeInterval(3_601)))
    }

    @Test func clockSetBackBeforeTheFetchIsRejected() {
        let grant = Self.web()
        #expect(grant.valid(for: "u1", now: Self.now.addingTimeInterval(-120)))
        #expect(!grant.valid(for: "u1", now: Self.now.addingTimeInterval(-600)))
        #expect(!grant.valid(for: "u1", now: Self.now.addingTimeInterval(-30 * 86_400)))
    }

    @Test func tamperedCacheIsIgnored() throws {
        let future = Self.web(expires: Self.now.addingTimeInterval(10 * 365 * 86_400), fetched: Self.now.addingTimeInterval(5 * 365 * 86_400))
        #expect(!future.valid(for: "u1", now: Self.now))
        let old = Self.web(expires: Self.now.addingTimeInterval(10 * 365 * 86_400), fetched: Self.now.addingTimeInterval(-30 * 86_400))
        #expect(!old.valid(for: "u1", now: Self.now))
        #expect(!Self.web("u9").valid(for: "u1", now: Self.now))
        #expect((try? JSONDecoder().decode(WebEntitlement.self, from: Data(#"{"userId":"u1","productId":"web.x"}"#.utf8))) == nil)
        #expect((try? JSONDecoder().decode(WebEntitlement.self, from: Data("garbage".utf8))) == nil)
    }

    static func keychainWorks() -> Bool {
        let vault = KeychainWebEntitlementVault(service: "com.polingual.webmembership.probe")
        vault.save(web())
        defer { vault.clear() }
        return vault.load() != nil
    }

    @Test(.enabled(if: keychainWorks()))
    func keychainVaultRoundTrips() {
        let vault = KeychainWebEntitlementVault(service: "com.polingual.webmembership.test")
        vault.clear()
        defer { vault.clear() }
        #expect(vault.load() == nil)
        vault.save(Self.web())
        #expect(vault.load() == Self.web())
        let renewed = Self.web(expires: Self.year.addingTimeInterval(86_400))
        vault.save(renewed)
        #expect(vault.load() == renewed)
        vault.clear()
        #expect(vault.load() == nil)
    }

    @Test func entitlementRoundTripsThroughCodable() throws {
        let data = try JSONEncoder().encode(Self.web())
        #expect(try JSONDecoder().decode(WebEntitlement.self, from: data) == Self.web())
        let open = Self.web(expires: nil)
        #expect(try JSONDecoder().decode(WebEntitlement.self, from: JSONEncoder().encode(open)) == open)
    }

    @Test func openEndedGrantLastsThreeDaysPastTheFetch() {
        let open = Self.web(expires: nil)
        #expect(open.valid(for: "u1", now: Self.now.addingTimeInterval(2 * 86_400)))
        #expect(!open.valid(for: "u1", now: Self.now.addingTimeInterval(4 * 86_400)))
    }

    @Test(arguments: [200, 301, 401, 403, 404, 500, 502, 503])
    func onlySuccessIsRead(_ status: Int) async {
        let body = #"{"active":true,"productId":"web.polingual.gift.year","expiresAt":"2027-11-18T23:00:00Z","trial":false}"#
        let api = BucketAPI(transport: EntitlementTransport(status: status, body: body))
        let reply = await api.webEntitlement(token: "tok", userId: "u1", now: Self.now)
        #expect(reply == (status == 200 ? .entitled(Self.web()) : .failed))
    }

    @Test func networkErrorIsAFailure() async {
        let api = BucketAPI(transport: EntitlementTransport(status: 200, body: "", fails: true))
        let reply = await api.webEntitlement(token: "tok", userId: "u1", now: Self.now)
        #expect(reply == .failed)
    }

    static let stores: [MemberTier] = [.checking, .locked, .beta, .trial, .subscribed]

    @Test(arguments: stores)
    func noWebEntitlementLeavesTheStoreTier(_ store: MemberTier) {
        let merged = MemberTier.merged(store: store, web: nil, userId: "u1", now: Self.now)
        #expect(merged.tier == store)
        #expect(merged.web == nil)
    }

    @Test func storeKitOnly() {
        #expect(MemberTier.merged(store: .subscribed, web: nil, userId: nil, now: Self.now).tier == .subscribed)
        #expect(MemberTier.merged(store: .trial, web: nil, userId: nil, now: Self.now).tier == .trial)
    }

    @Test(arguments: [MemberTier.checking, .locked, .beta])
    func webOnlySubscribes(_ store: MemberTier) {
        let merged = MemberTier.merged(store: store, web: Self.web(), userId: "u1", now: Self.now)
        #expect(merged.tier == .subscribed)
        #expect(merged.web == Self.web())
    }

    @Test(arguments: [MemberTier.trial, .subscribed])
    func bothKeepsTheStoreKitState(_ store: MemberTier) {
        let merged = MemberTier.merged(store: store, web: Self.web(), userId: "u1", now: Self.now)
        #expect(merged.tier == store)
        #expect(merged.web == nil)
    }

    @Test(arguments: stores)
    func expiredWebLeavesTheStoreTier(_ store: MemberTier) {
        let expired = Self.web(expires: Self.now.addingTimeInterval(-60))
        #expect(MemberTier.merged(store: store, web: expired, userId: "u1", now: Self.now).tier == store)
    }

    @Test func signedOutOrAnotherAccountGetsNothingFromTheCache() {
        #expect(MemberTier.merged(store: .locked, web: Self.web(), userId: nil, now: Self.now).tier == .locked)
        #expect(MemberTier.merged(store: .locked, web: Self.web(), userId: "u2", now: Self.now).tier == .locked)
    }

    @Test func webMembersAreUncappedAndAdFree() {
        for store in [MemberTier.locked, .beta] {
            #expect(store.capped)
            let tier = MemberTier.merged(store: store, web: Self.web(), userId: "u1", now: Self.now).tier
            #expect(!tier.capped)
            #expect(!tier.showsAds)
            #expect(tier.open)
        }
        #expect(MemberTier.locked.showsAds)
        #expect(!MemberTier.beta.showsAds)
        var budget = DailyBudget(day: "2026-11-18")
        budget.charge(newWords: 50, cards: 500, day: "2026-11-18")
        let limits = DailyLimits(newWords: 12, cards: 60)
        let tier = MemberTier.merged(store: .locked, web: Self.web(), userId: "u1", now: Self.now).tier
        #expect(!budget.spent(limits, capped: tier.capped))
        #expect(budget.retryOffer("daily", deck: "2026-11-18", capped: tier.capped, adReady: true) == .free)
        #expect(budget.spent(limits, capped: MemberTier.locked.capped))
    }
}

@MainActor
@Suite struct WebMembershipTests {
    @MainActor
    final class World {
        var now = WebEntitlementTests.now
        var reply = WebEntitlementReply.entitled(WebEntitlementTests.web())
        var calls = 0
        let vault = MemoryWebEntitlementVault()

        var during: (@MainActor () async -> Void)?
        var waits: [TimeInterval] = []
        var release: CheckedContinuation<Void, Never>?

        func membership(userId: String? = nil, holdLapse: Bool = false) -> WebMembership {
            WebMembership(
                vault: vault, userId: userId, clock: { self.now },
                wait: { delay in
                    self.waits.append(delay)
                    if holdLapse { await withCheckedContinuation { self.release = $0 } } else { try? await Task.sleep(for: .seconds(3_600)) }
                }
            ) { _, _ in
                self.calls += 1
                let reply = self.reply
                await self.during?()
                return reply
            }
        }
    }

    @Test func signedInFetchCachesTheGrant() async {
        let w = World()
        let m = w.membership()
        #expect(m.tier(store: .locked) == .locked)
        await m.refresh(userId: "u1") { "tok" }
        #expect(m.active == WebEntitlementTests.web())
        #expect(m.tier(store: .locked) == .subscribed)
        #expect(w.vault.load() == WebEntitlementTests.web())
    }

    @Test func signedOutNeverFetches() async {
        let w = World()
        let m = w.membership()
        await m.refresh(userId: nil) { "tok" }
        #expect(w.calls == 0)
        #expect(m.active == nil)
        #expect(m.tier(store: .locked) == .locked)
    }

    @Test func offlineUsesTheCacheUntilItExpires() async {
        let w = World()
        let first = w.membership()
        await first.refresh(userId: "u1") { "tok" }
        w.reply = .failed
        let relaunched = w.membership(userId: "u1")
        #expect(relaunched.tier(store: .locked) == .subscribed)
        await relaunched.refresh(userId: "u1") { "tok" }
        #expect(relaunched.tier(store: .locked) == .subscribed)
        await relaunched.refresh(userId: "u1") { nil }
        #expect(relaunched.tier(store: .locked) == .subscribed)
        w.now = WebEntitlementTests.year.addingTimeInterval(60)
        #expect(relaunched.active == nil)
        #expect(relaunched.tier(store: .locked) == .locked)
    }

    @Test func serverFailureLeavesStoreKitAccessAsItIs() async {
        let w = World()
        w.reply = .failed
        let m = w.membership()
        await m.refresh(userId: "u1") { "tok" }
        for store in WebEntitlementTests.stores { #expect(m.tier(store: store) == store) }
        #expect(w.vault.load() == nil)
    }

    @Test func serverSayingNoClearsTheCache() async {
        let w = World()
        let m = w.membership()
        await m.refresh(userId: "u1") { "tok" }
        w.reply = .none
        await m.refresh(userId: "u1") { "tok" }
        #expect(m.active == nil)
        #expect(w.vault.load() == nil)
        #expect(m.tier(store: .locked) == .locked)
    }

    @Test func signOutClearsTheCache() async {
        let w = World()
        let m = w.membership()
        await m.refresh(userId: "u1") { "tok" }
        await m.refresh(userId: nil) { "tok" }
        #expect(m.active == nil)
        #expect(m.cached == nil)
        #expect(w.vault.load() == nil)
        #expect(w.membership(userId: "u1").tier(store: .locked) == .locked)
    }

    @Test func anotherAccountNeverInheritsTheGrant() async {
        let w = World()
        let m = w.membership()
        await m.refresh(userId: "u1") { "tok" }
        w.reply = .failed
        await m.refresh(userId: "u2") { "tok" }
        #expect(m.active == nil)
        #expect(w.vault.load() == nil)
        #expect(m.tier(store: .locked) == .locked)
    }

    @Test func staleCacheIsIgnoredUntilASuccessfulRefresh() async {
        let w = World()
        let first = w.membership()
        await first.refresh(userId: "u1") { "tok" }
        w.now = w.now.addingTimeInterval(8 * 86_400)
        w.reply = .failed
        let m = w.membership(userId: "u1")
        #expect(m.active == nil)
        #expect(m.tier(store: .locked) == .locked)
        #expect(m.tier(store: .subscribed) == .subscribed)
        await m.refresh(userId: "u1") { "tok" }
        #expect(m.tier(store: .locked) == .locked)
        #expect(w.vault.load() != nil)
        w.reply = .entitled(WebEntitlementTests.web(fetched: w.now))
        await m.refresh(userId: "u1") { "tok" }
        #expect(m.tier(store: .locked) == .subscribed)
    }

    @Test func clockSetBackHidesTheCachedGrant() async {
        let w = World()
        let m = w.membership()
        await m.refresh(userId: "u1") { "tok" }
        w.now = w.now.addingTimeInterval(-86_400)
        #expect(m.active == nil)
        #expect(m.tier(store: .locked) == .locked)
    }

    @Test func lateReplyForTheOldAccountIsDiscarded() async {
        let w = World()
        let m = w.membership()
        w.during = {
            w.during = nil
            w.reply = .failed
            await m.refresh(userId: "u2") { "tok" }
        }
        await m.refresh(userId: "u1") { "tok" }
        #expect(m.userId == "u2")
        #expect(m.cached == nil)
        #expect(w.vault.load() == nil)
        #expect(m.tier(store: .locked) == .locked)
        #expect(w.calls == 2)
    }

    @Test func lateReplyAfterSignOutIsDiscarded() async {
        let w = World()
        let m = w.membership()
        w.during = {
            w.during = nil
            await m.refresh(userId: nil) { "tok" }
        }
        await m.refresh(userId: "u1") { "tok" }
        #expect(m.userId == nil)
        #expect(m.cached == nil)
        #expect(w.vault.load() == nil)
    }

    @Test func lapseIsReevaluatedMidSession() async {
        let w = World()
        w.reply = .entitled(WebEntitlementTests.web(expires: w.now.addingTimeInterval(3_600)))
        let m = w.membership(holdLapse: true)
        await m.refresh(userId: "u1") { "tok" }
        #expect(m.tier(store: .locked) == .subscribed)
        while w.release == nil { await Task.yield() }
        #expect(w.waits.last == 3_601)
        w.now = w.now.addingTimeInterval(3_602)
        w.release?.resume()
        while m.lapses == 0 { await Task.yield() }
        #expect(m.active == nil)
        #expect(m.tier(store: .locked) == .locked)
    }

    @Test func storeKitStateIsNeverReplaced() async {
        let w = World()
        let m = w.membership()
        await m.refresh(userId: "u1") { "tok" }
        #expect(m.tier(store: .subscribed) == .subscribed)
        #expect(m.tier(store: .trial) == .trial)
        #expect(MemberTier.merged(store: .trial, web: m.cached, userId: "u1", now: w.now).web == nil)
    }
}
