import Foundation
import Network

public final class Connectivity: @unchecked Sendable {
    public static let shared = Connectivity()
    private let monitor = NWPathMonitor()
    private let queue = DispatchQueue(label: "bucket.connectivity")
    private var last: Bool?
    private var handlers: [String: @MainActor (Bool) -> Void] = [:]
    private var started = false

    public func watch(_ key: String, _ handler: @escaping @MainActor (Bool) -> Void) {
        queue.async {
            self.handlers[key] = handler
            guard !self.started else { return }
            self.started = true
            self.monitor.pathUpdateHandler = { [weak self] path in
                guard let self else { return }
                let online = path.status == .satisfied
                guard online != self.last else { return }
                let restored = self.last == false && online
                self.last = online
                guard restored else { return }
                let hs = Array(self.handlers.values)
                Task { @MainActor in for h in hs { h(true) } }
            }
            self.monitor.start(queue: self.queue)
        }
    }
}
