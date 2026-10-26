import DeviceActivity
import FamilyControls
import Foundation
import ManagedSettings

enum SwapStore {
    static let group = "group.com.polingual.app"
    static let selectionKey = "swap.selection"
    static let passMinutes = 15
    static var passActivity: DeviceActivityName { DeviceActivityName("swap.pass") }
    static var settings: ManagedSettingsStore { ManagedSettingsStore(named: ManagedSettingsStore.Name("swap")) }

    static var defaults: UserDefaults { UserDefaults(suiteName: group) ?? .standard }

    static func load() -> FamilyActivitySelection {
        guard let data = defaults.data(forKey: selectionKey),
              let selection = try? JSONDecoder().decode(FamilyActivitySelection.self, from: data) else { return FamilyActivitySelection() }
        return selection
    }

    static func save(_ selection: FamilyActivitySelection) {
        defaults.set(try? JSONEncoder().encode(selection), forKey: selectionKey)
        shield(selection)
    }

    static func shield(_ selection: FamilyActivitySelection) {
        settings.shield.applications = selection.applicationTokens.isEmpty ? nil : selection.applicationTokens
        settings.shield.applicationCategories = selection.categoryTokens.isEmpty ? nil : .specific(selection.categoryTokens)
        settings.shield.webDomains = selection.webDomainTokens.isEmpty ? nil : selection.webDomainTokens
    }

    static func turnOff() {
        DeviceActivityCenter().stopMonitoring([passActivity])
        settings.clearAllSettings()
        defaults.removeObject(forKey: selectionKey)
    }

    static func grantPass(now: Date = .now) {
        settings.clearAllSettings()
        let cal = Calendar.current
        let parts: Set<Calendar.Component> = [.year, .month, .day, .hour, .minute, .second]
        let end = now.addingTimeInterval(TimeInterval(passMinutes * 60))
        let schedule = DeviceActivitySchedule(intervalStart: cal.dateComponents(parts, from: now), intervalEnd: cal.dateComponents(parts, from: end), repeats: false)
        let center = DeviceActivityCenter()
        center.stopMonitoring([passActivity])
        if (try? center.startMonitoring(passActivity, during: schedule)) == nil { shield(load()) }
    }
}
