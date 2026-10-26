import DeviceActivity
import ManagedSettings

final class SwapMonitor: DeviceActivityMonitor {
    override func intervalDidEnd(for activity: DeviceActivityName) {
        super.intervalDidEnd(for: activity)
        guard activity == SwapStore.passActivity else { return }
        SwapStore.shield(SwapStore.load())
    }
}
