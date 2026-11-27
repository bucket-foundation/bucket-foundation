import BucketKit
import SwiftUI

extension PL {
    static func wordFont(_ size: CGFloat) -> Font { PL.title.font(scale: size / PL.title.size) }

    static func capsFont(_ size: CGFloat) -> Font { PL.label.font(scale: size / PL.label.size) }
}
