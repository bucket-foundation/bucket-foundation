import Foundation
import Network

public final class Connectivity: @unchecked Sendable {
    public static let shared = Connectivity()
    private let monitor = NWPathMonitor()
    private let queue = DispatchQueue(label: "bucket.connectivity")
    private var last: Bool?
    private var handlers: [@MainActor (Bool) -> Void] = []

    public func watch(_ handler: @escaping @MainActor (Bool) -> Void) {
        queue.async {
            self.handlers.append(handler)
            guard self.handlers.count == 1 else { return }
            self.monitor.pathUpdateHandler = { [weak self] path in
                guard let self else { return }
                let online = path.status == .satisfied
                guard online != self.last else { return }
                let restored = self.last == false && online
                self.last = online
                guard restored else { return }
                let hs = self.handlers
                Task { @MainActor in for h in hs { h(true) } }
            }
            self.monitor.start(queue: self.queue)
        }
    }
}
