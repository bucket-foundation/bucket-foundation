import ManagedSettings
import UserNotifications

final class SwapShieldAction: ShieldActionDelegate {
    override func handle(action: ShieldAction, for application: ApplicationToken, completionHandler: @escaping (ShieldActionResponse) -> Void) {
        respond(action, completionHandler)
    }

    override func handle(action: ShieldAction, for webDomain: WebDomainToken, completionHandler: @escaping (ShieldActionResponse) -> Void) {
        respond(action, completionHandler)
    }

    override func handle(action: ShieldAction, for category: ActivityCategoryToken, completionHandler: @escaping (ShieldActionResponse) -> Void) {
        respond(action, completionHandler)
    }

    func respond(_ action: ShieldAction, _ done: @escaping (ShieldActionResponse) -> Void) {
        switch action {
        case .primaryButtonPressed:
            let content = UNMutableNotificationContent()
            content.title = String(localized: "Your words are ready")
            content.body = String(localized: "Tap to start two minutes in Polingual.")
            content.userInfo = ["study": true]
            content.interruptionLevel = .timeSensitive
            UNUserNotificationCenter.current().add(UNNotificationRequest(identifier: "swap.study", content: content, trigger: nil)) { _ in done(.close) }
        case .secondaryButtonPressed:
            SwapStore.grantPass()
            done(.defer)
        @unknown default:
            done(.close)
        }
    }
}
