import BucketKit
import Foundation
import UserNotifications
#if os(iOS)
import UIKit

final class PushAppDelegate: NSObject, UIApplicationDelegate {
    func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        let hex = PushToken.hex(deviceToken)
        Task { await PushRegistry.shared.received(hex) }
    }

    func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: Error) {}
}
#endif

extension Notification.Name {
    static let openToday = Notification.Name("bucket.openToday")
}

@MainActor
final class PushRegistry {
    static let shared = PushRegistry()

    var api = BucketAPI()
    var token: (@MainActor () async -> String?)?
    var user: (@MainActor () -> String?)?
    private(set) var device: String?

    func refresh() async {
        #if os(iOS)
        let status = await UNUserNotificationCenter.current().notificationSettings().authorizationStatus
        guard status == .authorized || status == .provisional || status == .ephemeral else { return }
        UIApplication.shared.registerForRemoteNotifications()
        #endif
    }

    func received(_ hex: String) async {
        device = hex
        await upload()
    }

    func upload() async {
        guard let device, let bearer = await token?() else { return }
        if await register(device, bearer: bearer) { PendingUnregister.clear() }
    }

    func unregister() async {
        guard let device else { return }
        let entry = PendingUnregister.Entry(device: device, user: user?())
        guard let bearer = await token?() else { return PendingUnregister.save(entry) }
        await attempt(entry, bearer: bearer)
    }

    func retryPending() async {
        guard let entry = PendingUnregister.load(), let current = user?(), let bearer = await token?() else { return }
        if current == entry.user {
            await attempt(entry, bearer: bearer)
        } else if await register(entry.device, bearer: bearer) {
            PendingUnregister.clear()
        }
    }

    private func register(_ device: String, bearer: String) async -> Bool {
        guard let bundle = Bundle.main.bundleIdentifier else { return false }
        return (try? await api.registerPush(token: bearer, device: device, env: .current, bundleId: bundle)) != nil
    }

    private func attempt(_ entry: PendingUnregister.Entry, bearer: String) async {
        do {
            try await api.unregisterPush(token: bearer, device: entry.device)
            PendingUnregister.clear()
        } catch {
            PendingUnregister.save(entry)
        }
    }
}

enum PendingUnregister {
    struct Entry: Codable, Equatable {
        let device: String
        let user: String?
    }

    static let key = "push.pendingUnregister"

    static func save(_ entry: Entry, defaults: UserDefaults = .standard) {
        defaults.set(try? JSONEncoder().encode(entry), forKey: key)
    }

    static func load(defaults: UserDefaults = .standard) -> Entry? {
        defaults.data(forKey: key).flatMap { try? JSONDecoder().decode(Entry.self, from: $0) }
    }

    static func clear(defaults: UserDefaults = .standard) {
        defaults.removeObject(forKey: key)
    }
}
