import BucketKit
import SwiftUI

extension PL {
    static func icon(_ size: CGFloat, _ weight: Font.Weight = .bold) -> Font { .system(size: size, weight: weight) }

    static func script(_ size: CGFloat, _ weight: Font.Weight = .heavy) -> Font { .system(size: size, weight: weight, design: .rounded) }

    static func wordFont(_ size: CGFloat) -> Font { PL.title.font(scale: size / PL.title.size) }

    static func capsFont(_ size: CGFloat) -> Font { PL.label.font(scale: size / PL.label.size) }
}
