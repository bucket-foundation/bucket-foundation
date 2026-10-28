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
        guard let device, let bundle = Bundle.main.bundleIdentifier, let bearer = await token?() else { return }
        do {
            try await api.registerPush(token: bearer, device: device, env: .current, bundleId: bundle)
            PendingUnregister.clear()
        } catch {}
    }

    func unregister() async {
        guard let device, let bearer = await token?() else { return }
        await attempt(PendingUnregister.Entry(device: device, bearer: bearer))
    }

    func retryPending() async {
        guard let entry = PendingUnregister.load() else { return }
        await attempt(entry)
    }

    private func attempt(_ entry: PendingUnregister.Entry) async {
        do {
            try await api.unregisterPush(token: entry.bearer, device: entry.device)
            PendingUnregister.clear()
        } catch BucketError.revoked {
            PendingUnregister.clear()
        } catch {
            PendingUnregister.save(entry)
        }
    }
}

enum PendingUnregister {
    struct Entry: Codable, Equatable {
        let device: String
        let bearer: String
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
