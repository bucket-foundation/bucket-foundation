import Foundation
import Network
import Observation

@MainActor
@Observable
public final class NetworkWatch {
    public static let shared = NetworkWatch()

    public private(set) var online = true
    @ObservationIgnored private var handlers: [@MainActor () async -> Void] = []
    @ObservationIgnored private var monitor: NWPathMonitor?
    @ObservationIgnored private var syncing: Task<Void, Never>?

    public init() {}

    public func onReconnect(_ handler: @escaping @MainActor () async -> Void) {
        handlers.append(handler)
    }

    public func start() {
        guard monitor == nil else { return }
        let m = NWPathMonitor()
        m.pathUpdateHandler = { path in
            let up = path.status == .satisfied
            Task { @MainActor [weak self] in self?.update(up) }
        }
        m.start(queue: DispatchQueue(label: "foundation.bucket.network-watch"))
        monitor = m
    }

    public func update(_ up: Bool) {
        let returned = up && !online
        online = up
        if returned { resync() }
    }

    @discardableResult
    public func resync() -> Task<Void, Never> {
        if let running = syncing { return running }
        let all = handlers
        let task = Task { @MainActor [weak self] in
            for h in all { await h() }
            self?.syncing = nil
        }
        syncing = task
        return task
    }
}
