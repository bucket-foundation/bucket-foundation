import Foundation
import Observation

@MainActor
@Observable
public final class Account {
    public enum Stage: Equatable { case signedOut, codeSent(String), signedIn }
    public enum Ending: Equatable, Sendable { case signedOut, deleted, expired }

    public private(set) var stage: Stage
    public private(set) var ending: Ending?
    public private(set) var session: Session?
    public var error: String?
    public private(set) var busy = false

    let api: BucketAPI
    let store: SessionStore
    let lock: RefreshLock?

    public init(api: BucketAPI, store: SessionStore, lock: RefreshLock? = nil) {
        self.api = api
        self.store = store
        self.lock = lock
        let saved = store.load()
        session = saved
        stage = saved == nil ? .signedOut : .signedIn
    }

    public func sendCode(to email: String) async {
        let email = email.trimmingCharacters(in: .whitespacesAndNewlines)
        await run {
            try await self.api.requestCode(email: email)
            self.stage = .codeSent(email)
        }
    }

    public func verify(code: String) async {
        guard case .codeSent(let email) = stage else { return }
        let code = code.filter(\.isNumber)
        await run {
            let s = try await self.api.verify(email: email, code: code)
            try self.store.save(s)
            self.session = s
            self.ending = nil
            self.stage = .signedIn
        }
    }

    public func signInWithApple(idToken: String, nonce: String, authorizationCode: String? = nil) async {
        await run {
            let s = try await self.api.signInWithApple(idToken: idToken, nonce: nonce, authorizationCode: authorizationCode)
            try self.store.save(s)
            self.session = s
            self.ending = nil
            self.stage = .signedIn
        }
    }

    public static let refreshMargin = 60

    public func setAgeBand(_ band: AgeBand) async -> Bool {
        guard let t = await freshToken() else { return false }
        return (200..<300).contains(await api.setAgeBand(token: t, band: band))
    }

    public func requestParentConsent(email: String) async -> Bool {
        guard let t = await freshToken() else { return false }
        return (200..<300).contains(await api.requestParentConsent(token: t, parentEmail: email))
    }

    @ObservationIgnored private var refreshing: Task<String?, Never>?

    public func freshToken(now: @escaping @Sendable () -> Date = { .now }) async -> String? {
        guard let s = session else { return nil }
        if !s.expires(within: Self.refreshMargin, now: now()) { return s.accessToken }
        if let inFlight = refreshing { return await inFlight.value }
        let task = Task { () -> String? in
            defer { self.refreshing = nil }
            await self.lock?.acquire()
            defer { self.lock?.release() }
            var s = s
            if let stored = self.newer(than: s) {
                self.session = stored
                if !stored.expires(within: Self.refreshMargin, now: now()) { return stored.accessToken }
                s = stored
            }
            do {
                let next = try await self.api.refresh(s)
                try self.store.save(next)
                self.session = next
                return next.accessToken
            } catch BucketError.revoked {
                if let stored = self.newer(than: s), !stored.expires(within: 0, now: now()) {
                    self.session = stored
                    return stored.accessToken
                }
                self.end(.expired)
                return nil
            } catch {
                return s.expires(within: 0, now: now()) ? nil : s.accessToken
            }
        }
        refreshing = task
        return await task.value
    }

    func newer(than s: Session) -> Session? {
        guard let stored = store.load(), stored.userId == s.userId, stored.refreshToken != s.refreshToken, stored.expiresAt >= s.expiresAt else { return nil }
        return stored
    }

    public func startOver() {
        error = nil
        stage = .signedOut
    }

    public func deleteAccount() async {
        await run {
            guard let token = await self.freshToken() else { throw BucketError.revoked }
            try await self.api.deleteAccount(token: token)
            self.end(.deleted)
        }
    }

    @ObservationIgnored public var beforeSignOut: (@MainActor () async -> Void)?

    public func signOut() { end(.signedOut) }

    public func signOutAfterSync() async {
        await beforeSignOut?()
        end(.signedOut)
    }

    func end(_ how: Ending) {
        store.clear()
        session = nil
        ending = how
        stage = .signedOut
    }

    public var endedByUser: Bool { ending == .signedOut || ending == .deleted }

    func run(_ work: @escaping @MainActor () async throws -> Void) async {
        busy = true
        error = nil
        defer { busy = false }
        do { try await work() } catch { self.error = error.localizedDescription }
    }
}
