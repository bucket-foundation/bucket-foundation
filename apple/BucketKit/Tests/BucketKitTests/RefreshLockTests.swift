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

    @Test func theRealGuardHoldsAndReleasesOnTheMac() async throws {
        let path = lockPath()
        let lock = try #require(FileRefreshLock(path: path))
        await lock.acquire()
        #expect(lock.isHeld)
        lock.release()
        #expect(othersCanLock(path))
    }
}
