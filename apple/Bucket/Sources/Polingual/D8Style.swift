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
            .foregroundStyle(D8.ink)
            .frame(maxWidth: compact ? nil : .infinity, minHeight: compact ? 42 : 50, alignment: align)
            .padding(.horizontal, 16)
            .background(selected ? Color(hex: 0xEEF3FB) : .white, in: .rect(cornerRadius: 12))
            .overlay { RoundedRectangle(cornerRadius: 12).strokeBorder(selected ? D8.lapis : D8.keyline, lineWidth: selected ? 3 : 2) }
            .background(selected ? D8.lapis : D8.keyline, in: .rect(cornerRadius: 12).offset(y: down ? 1 : 4))
            .offset(y: down ? 3 : 0)
            .padding(.bottom, 4)
    }
}
