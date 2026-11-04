import Foundation

public protocol RefreshLock: Sendable {
    func acquire() async
    func release()
}

public final class FileRefreshLock: RefreshLock, @unchecked Sendable {
    let fd: Int32

    public init?(path: URL) {
        try? FileManager.default.createDirectory(at: path.deletingLastPathComponent(), withIntermediateDirectories: true)
        let fd = open(path.path, O_RDWR | O_CREAT | O_CLOEXEC, 0o600)
        guard fd >= 0 else { return nil }
        self.fd = fd
    }

    public convenience init?(appGroup: String) {
        guard let dir = FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: appGroup) else { return nil }
        self.init(path: dir.appending(path: "session-refresh.lock"))
    }

    deinit { close(fd) }

    public func acquire() async {
        let fd = fd
        await Task.detached { _ = flock(fd, LOCK_EX) }.value
    }

    public func release() {
        flock(fd, LOCK_UN)
    }
}
