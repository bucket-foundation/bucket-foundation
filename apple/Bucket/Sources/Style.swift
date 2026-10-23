import BucketKit
import SwiftUI

enum Palette {
    static let paper = Color(light: 0xEFE8D4, dark: 0x1F1C16)
    static let card = Color(light: 0xF7F2E4, dark: 0x2A2620)
    static let ink = Color(light: 0x23201A, dark: 0xECE5D3)
    static let muted = Color(light: 0x6B6455, dark: 0xA79F8C)
    static let green = Color(light: 0x3B5E2B, dark: 0x8DB87A)
    static let gold = Color(light: 0xB08A2E, dark: 0xD9B45A)
    static let rule = Color(light: 0xD8CFB6, dark: 0x3A352C)
}

extension Color {
    init(light: UInt32, dark: UInt32) {
        #if os(macOS)
        self.init(nsColor: NSColor(name: nil) { a in
            NSColor(hex: a.bestMatch(from: [.darkAqua, .aqua]) == .darkAqua ? dark : light)
        })
        #else
        self.init(uiColor: UIColor { t in UIColor(hex: t.userInterfaceStyle == .dark ? dark : light) })
        #endif
    }
}

#if os(macOS)
extension NSColor {
    convenience init(hex: UInt32) {
        self.init(srgbRed: CGFloat((hex >> 16) & 0xFF) / 255, green: CGFloat((hex >> 8) & 0xFF) / 255, blue: CGFloat(hex & 0xFF) / 255, alpha: 1)
    }
}
#else
extension UIColor {
    convenience init(hex: UInt32) {
        self.init(red: CGFloat((hex >> 16) & 0xFF) / 255, green: CGFloat((hex >> 8) & 0xFF) / 255, blue: CGFloat(hex & 0xFF) / 255, alpha: 1)
    }
}
#endif

extension Font {
    static func serif(_ style: Font.TextStyle, weight: Font.Weight = .regular) -> Font {
        .system(style, design: .serif, weight: weight)
    }
}

struct Eyebrow: View {
    let text: String

    var body: some View {
        Text(LocalizedStringKey(text))
            .textCase(.uppercase)
            .font(D8.caps(11))
            .tracking(1.2)
            .foregroundStyle(Palette.muted)
    }
}

struct PaperBackground: ViewModifier {
    func body(content: Content) -> some View {
        content
            .scrollContentBackground(.hidden)
            .background(Palette.paper.ignoresSafeArea())
    }
}

extension View {
    func paper() -> some View { modifier(PaperBackground()) }

    @ViewBuilder func inlineTitle() -> some View {
        #if os(iOS)
        navigationBarTitleDisplayMode(.inline)
        #else
        self
        #endif
    }
}

struct EquationView: View {
    let tex: String

    var body: some View {
        Text(TeXLite.render(tex))
            .font(.system(.title3, design: .serif))
            .foregroundStyle(Palette.ink)
            .multilineTextAlignment(.center)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 14)
            .padding(.horizontal, 12)
            .background(Palette.card, in: .rect(cornerRadius: 12))
            .overlay(RoundedRectangle(cornerRadius: 12).stroke(Palette.rule))
            .accessibilityLabel("Equation")
            .accessibilityValue(TeXLite.render(tex))
            .textSelection(.enabled)
    }
}

struct StateMessage: View {
    let title: String
    let detail: String?
    var retry: (() -> Void)?

    var body: some View {
        ContentUnavailableView {
            Label(title, systemImage: "exclamationmark.triangle")
        } description: {
            if let detail { Text(detail) }
        } actions: {
            if let retry { Button("Try again", action: retry).buttonStyle(D8Option(align: .center, compact: true)) }
        }
    }
}
