import ManagedSettings
import ManagedSettingsUI
import UIKit

final class SwapShieldConfiguration: ShieldConfigurationDataSource {
    static let parchment = UIColor(red: 0xF6 / 255, green: 0xEE / 255, blue: 0xDC / 255, alpha: 1)
    static let ink = UIColor(red: 0x23 / 255, green: 0x1F / 255, blue: 0x20 / 255, alpha: 1)
    static let plum = UIColor(red: 0x5B / 255, green: 0x1A / 255, blue: 0x4A / 255, alpha: 1)

    override func configuration(shielding application: Application) -> ShieldConfiguration {
        make(application.localizedDisplayName)
    }

    override func configuration(shielding application: Application, in category: ActivityCategory) -> ShieldConfiguration {
        make(application.localizedDisplayName)
    }

    override func configuration(shielding webDomain: WebDomain) -> ShieldConfiguration {
        make(webDomain.domain)
    }

    override func configuration(shielding webDomain: WebDomain, in category: ActivityCategory) -> ShieldConfiguration {
        make(webDomain.domain)
    }

    func make(_ name: String?) -> ShieldConfiguration {
        let app = name ?? String(localized: "this app")
        return ShieldConfiguration(
            backgroundBlurStyle: .systemUltraThinMaterialLight,
            backgroundColor: Self.parchment,
            icon: UIImage(named: "ShieldMark"),
            title: ShieldConfiguration.Label(text: String(localized: "Polingual first"), color: Self.ink),
            subtitle: ShieldConfiguration.Label(text: String(localized: "Two minutes of words before \(app)."), color: Self.ink.withAlphaComponent(0.7)),
            primaryButtonLabel: ShieldConfiguration.Label(text: String(localized: "Study in Polingual"), color: .white),
            primaryButtonBackgroundColor: Self.plum,
            secondaryButtonLabel: ShieldConfiguration.Label(text: String(localized: "Open \(app) for 15 minutes"), color: Self.plum)
        )
    }
}
