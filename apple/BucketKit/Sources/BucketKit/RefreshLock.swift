import Foundation

public protocol RefreshLock: Sendable {
    func acquire() async
    func release()
}

public protocol SuspensionGuard: Sendable {
    func hold(onExpire: @escaping @Sendable () -> Void) -> @Sendable () -> Void
}

public struct ExpiringActivityGuard: SuspensionGuard {
    public init() {}

    public func hold(onExpire: @escaping @Sendable () -> Void) -> @Sendable () -> Void {
        #if os(macOS)
        return {}
        #else
        let done = DispatchSemaphore(value: 0)
        ProcessInfo.processInfo.performExpiringActivity(withReason: "session-refresh") { expired in
            if expired {
                onExpire()
                done.signal()
            } else {
                done.wait()
            }
        }
        return { done.signal() }
        #endif
    }
}

public final class FileRefreshLock: RefreshLock, @unchecked Sendable {
    let fd: Int32
    let wait: Duration
    let suspension: SuspensionGuard?
    private let state = NSLock()
    private var held = false
    private var expired = false
    private var endHold: (@Sendable () -> Void)?

    public init?(path: URL, wait: Duration = .seconds(BucketAPI.refreshTimeout + 5), suspension: SuspensionGuard? = ExpiringActivityGuard()) {
        try? FileManager.default.createDirectory(at: path.deletingLastPathComponent(), withIntermediateDirectories: true)
        let fd = open(path.path, O_RDWR | O_CREAT | O_CLOEXEC, 0o600)
        guard fd >= 0 else { return nil }
        self.fd = fd
        self.wait = wait
        self.suspension = suspension
    }

    public convenience init?(appGroup: String) {
        guard let dir = FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: appGroup) else { return nil }
        self.init(path: dir.appending(path: "session-refresh.lock"))
    }

    deinit {
        release()
        close(fd)
    }

    public var isHeld: Bool { state.withLock { held } }

    public func acquire() async {
        state.withLock { expired = false }
        let end = suspension?.hold { [weak self] in self?.expire() }
        let gone = state.withLock { () -> Bool in
            if !expired { endHold = end }
            return expired
        }
        if gone {
            end?()
            return
        }
        let deadline = ContinuousClock.now.advanced(by: wait)
        while true {
            let busy = state.withLock { () -> Bool in
                if expired { return false }
                if flock(fd, LOCK_EX | LOCK_NB) == 0 {
                    held = true
                    return false
                }
                return errno == EWOULDBLOCK || errno == EINTR
            }
            guard busy, ContinuousClock.now < deadline, !Task.isCancelled else { break }
            try? await Task.sleep(for: .milliseconds(50))
        }
        if !isHeld { finishHold() }
    }

    public func release() {
        state.withLock {
            guard held else { return }
            held = false
            flock(fd, LOCK_UN)
        }
        finishHold()
    }

    func expire() {
        state.withLock {
            expired = true
            if held {
                held = false
                flock(fd, LOCK_UN)
            }
        }
        finishHold()
    }

    private func finishHold() {
        let end = state.withLock { () -> (@Sendable () -> Void)? in
            defer { endHold = nil }
            return endHold
        }
        end?()
    }
}
