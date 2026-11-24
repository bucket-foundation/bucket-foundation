import Foundation
import Testing
@testable import BucketKit

final class FakeSuspension: SuspensionGuard, @unchecked Sendable {
    let expire = LockedBox<(@Sendable () -> Void)?>(nil)
    let ends = LockedBox(0)
    let expireAtOnce: Bool

    init(expireAtOnce: Bool = false) { self.expireAtOnce = expireAtOnce }

    func hold(onExpire: @escaping @Sendable () -> Void) -> @Sendable () -> Void {
        expire.mutate { $0 = onExpire }
        if expireAtOnce { onExpire() }
        return { self.ends.mutate { $0 += 1 } }
    }
}

@Suite struct RefreshLockTests {
    func lockPath() -> URL {
        FileManager.default.temporaryDirectory.appending(path: "refresh-\(UUID().uuidString)/session-refresh.lock")
    }

    func othersCanLock(_ path: URL) -> Bool {
        let fd = open(path.path, O_RDWR)
        defer { close(fd) }
        guard flock(fd, LOCK_EX | LOCK_NB) == 0 else { return false }
        flock(fd, LOCK_UN)
        return true
    }

    @Test func suspensionExpiryDropsTheSharedFileLock() async throws {
        let path = lockPath()
        let suspension = FakeSuspension()
        let lock = try #require(FileRefreshLock(path: path, suspension: suspension))
        await lock.acquire()
        #expect(lock.isHeld)
        #expect(!othersCanLock(path))
        let expire = try #require(suspension.expire.value)
        expire()
        #expect(!lock.isHeld)
        #expect(othersCanLock(path))
        #expect(suspension.ends.value == 1)
        lock.release()
        #expect(suspension.ends.value == 1)
    }

    @Test func noBackgroundTimeLeftReleasesAtOnce() async throws {
        let path = lockPath()
        let suspension = FakeSuspension(expireAtOnce: true)
        let lock = try #require(FileRefreshLock(path: path, suspension: suspension))
        await lock.acquire()
        #expect(!lock.isHeld)
        #expect(othersCanLock(path))
        #expect(suspension.ends.value == 1)
    }

    @Test func releaseEndsTheBackgroundHold() async throws {
        let path = lockPath()
        let suspension = FakeSuspension()
        let lock = try #require(FileRefreshLock(path: path, suspension: suspension))
        await lock.acquire()
        lock.release()
        #expect(othersCanLock(path))
        #expect(suspension.ends.value == 1)
    }

    @Test func aStuckHolderStopsBlockingAfterTheWait() async throws {
        let path = lockPath()
        let holder = try #require(FileRefreshLock(path: path, suspension: nil))
        let waiter = try #require(FileRefreshLock(path: path, wait: .milliseconds(200), suspension: nil))
        await holder.acquire()
        let start = ContinuousClock.now
        await waiter.acquire()
        #expect(ContinuousClock.now - start >= .milliseconds(200))
        #expect(!waiter.isHeld)
        waiter.release()
        #expect(holder.isHeld)
        #expect(!othersCanLock(path))
        holder.release()
    }

    @Test func expiryWhileWaitingStopsTheWait() async throws {
        let path = lockPath()
        let holder = try #require(FileRefreshLock(path: path, suspension: nil))
        let suspension = FakeSuspension()
        let waiter = try #require(FileRefreshLock(path: path, wait: .seconds(60), suspension: suspension))
        await holder.acquire()
        let pending = Task { await waiter.acquire() }
        while suspension.expire.value == nil { try await Task.sleep(for: .milliseconds(10)) }
        let expire = try #require(suspension.expire.value)
        expire()
        await pending.value
        #expect(!waiter.isHeld)
        #expect(suspension.ends.value == 1)
        holder.release()
        #expect(othersCanLock(path))
    }

    @Test func aWaiterTakesTheLockOnceTheHolderReleases() async throws {
        let path = lockPath()
        let holder = try #require(FileRefreshLock(path: path, suspension: nil))
        let waiter = try #require(FileRefreshLock(path: path, wait: .seconds(60), suspension: nil))
        await holder.acquire()
        let pending = Task { await waiter.acquire() }
        try await Task.sleep(for: .milliseconds(150))
        holder.release()
        await pending.value
        #expect(waiter.isHeld)
        waiter.release()
    }

    @Test func aCancelledWaiterStops() async throws {
        let path = lockPath()
        let holder = try #require(FileRefreshLock(path: path, suspension: nil))
        let waiter = try #require(FileRefreshLock(path: path, wait: .seconds(60), suspension: nil))
        await holder.acquire()
        let pending = Task { await waiter.acquire() }
        pending.cancel()
        await pending.value
        #expect(!waiter.isHeld)
        holder.release()
    }

    @Test func theWaitOutlastsTheRefreshRequest() async throws {
        let lock = try #require(FileRefreshLock(path: lockPath()))
        #expect(lock.wait > .seconds(BucketAPI.refreshTimeout))
        let seen = LockedBox<TimeInterval>(0)
        let api = BucketAPI(transport: StubTransport { r in
            seen.mutate { $0 = r.timeoutInterval }
            return (200, json(["access_token": "a1", "refresh_token": "r1", "expires_at": 4_000_000_000, "user_id": "u1"]))
        }, cacheDir: nil)
        _ = try await api.refresh(Session(accessToken: "old", refreshToken: "r0", expiresAt: 0, userId: "u1"))
        #expect(seen.value == BucketAPI.refreshTimeout)
    }

    @Test func theRealGuardHoldsAndReleasesOnTheMac() async throws {
        let path = lockPath()
        let lock = try #require(FileRefreshLock(path: path))
        await lock.acquire()
        #expect(lock.isHeld)
        lock.release()
        #expect(othersCanLock(path))
    }
}
