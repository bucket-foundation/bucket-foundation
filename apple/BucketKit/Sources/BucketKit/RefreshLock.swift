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
    private var endHold: (@Sendable () -> Void)?

    public init?(path: URL, wait: Duration = .seconds(10), suspension: SuspensionGuard? = ExpiringActivityGuard()) {
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
        let deadline = ContinuousClock.now.advanced(by: wait)
        while flock(fd, LOCK_EX | LOCK_NB) != 0 {
            guard errno == EWOULDBLOCK || errno == EINTR, ContinuousClock.now < deadline else { return }
            try? await Task.sleep(for: .milliseconds(50))
        }
        state.withLock { held = true }
        let end = suspension?.hold { [weak self] in self?.release() }
        let stale = state.withLock { () -> Bool in
            guard held else { return true }
            endHold = end
            return false
        }
        if stale { end?() }
    }

    public func release() {
        let end = state.withLock { () -> (@Sendable () -> Void)? in
            guard held else { return nil }
            held = false
            flock(fd, LOCK_UN)
            defer { endHold = nil }
            return endHold
        }
        end?()
    }
}
