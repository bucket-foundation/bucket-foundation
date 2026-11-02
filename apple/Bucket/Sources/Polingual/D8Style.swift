import BucketKit
import SwiftUI

enum D8 {
    static let parchment = Color(hex: 0xF6EEDC)
    static let ink = Color(hex: 0x231F20)
    static let vermilion = Color(hex: 0xD9381E)
    static let vermilionLip = Color(hex: 0x8E2312)
    static let malachite = Color(hex: 0x1E7A5A)
    static let malachiteLip = Color(hex: 0x135440)
    static let lapis = Color(hex: 0x1F4E9A)
    static let keyline = Color(hex: 0xE3D6B8)
    static let label = Color(hex: 0x555555)
    static let ipa = Color(hex: 0x444444)
    static let panel = Color(hex: 0xF6EEDC).opacity(0.8)
    static let face = Color(light: 0xFFFFFF, dark: 0x38332A)
    static let edge = Color(light: 0xE3D6B8, dark: 0x4D463A)
    static let pickedFace = Color(light: 0xEEF3FB, dark: 0x22344F)
    static let picked = Color(light: 0x1F4E9A, dark: 0x6C9BE8)
    static let disabled = Color(light: 0xE4DCCB, dark: 0x3A342C)
    static let disabledText = Color(light: 0x8A8070, dark: 0x8A8070)

    static func word(_ size: CGFloat) -> Font { .system(size: size, weight: .heavy, design: .rounded) }
    static func caps(_ size: CGFloat) -> Font { .system(size: size, weight: .bold, design: .monospaced) }
}

struct D8Option: ButtonStyle {
    var selected = false
    var align: Alignment = .leading
    var compact = false

    func makeBody(configuration: Configuration) -> some View {
        let down = selected || configuration.isPressed
        configuration.label
            .font(.system(size: 18, weight: .heavy, design: .rounded))
            .foregroundStyle(Palette.ink)
            .frame(maxWidth: compact ? nil : .infinity, minHeight: FitScale.naturalTarget, alignment: align)
            .padding(.horizontal, 16)
            .background(selected ? D8.pickedFace : D8.face, in: .rect(cornerRadius: 12))
            .overlay { RoundedRectangle(cornerRadius: 12).strokeBorder(selected ? D8.picked : D8.edge, lineWidth: selected ? 3 : 2) }
            .background(selected ? D8.picked : D8.edge, in: .rect(cornerRadius: 12).offset(y: down ? 1 : 4))
            .offset(y: down ? 3 : 0)
            .padding(.bottom, 4)
    }
}
