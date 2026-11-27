import BucketKit
import SwiftUI

extension PL {
    static func icon(_ size: CGFloat, _ weight: Font.Weight = .bold) -> Font { text(size, weight) }

    static func script(_ size: CGFloat, _ weight: Font.Weight = .heavy) -> Font {
        PLFonts.register()
        let name = switch weight {
        case .heavy, .black, .bold: "Fredoka-Bold"
        case .semibold: "Fredoka-SemiBold"
        default: "Fredoka-Medium"
        }
        return .custom(name, size: size)
    }

    static func text(_ size: CGFloat, _ weight: Font.Weight = .medium) -> Font {
        PLFonts.register()
        let name = switch weight {
        case .heavy, .black: "Nunito-ExtraBold"
        case .bold: "Nunito-Bold"
        case .semibold: "Nunito-SemiBold"
        default: "Nunito-Medium"
        }
        return .custom(name, size: size)
    }

    static func wordFont(_ size: CGFloat) -> Font { PL.title.font(scale: size / PL.title.size) }

    static func capsFont(_ size: CGFloat) -> Font { PL.label.font(scale: size / PL.label.size) }
}
