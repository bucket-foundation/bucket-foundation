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
        try? await api.registerPush(token: bearer, device: device, env: .current, bundleId: bundle)
    }

    func unregister() async {
        guard let device, let bearer = await token?() else { return }
        try? await api.unregisterPush(token: bearer, device: device)
    }
}
