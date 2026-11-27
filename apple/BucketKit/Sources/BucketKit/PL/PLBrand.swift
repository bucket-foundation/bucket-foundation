import CoreGraphics
import SwiftUI

extension PL {
    public static func icon(_ size: CGFloat, _ weight: Font.Weight = .bold) -> Font { text(size, weight) }

    public static func script(_ size: CGFloat, _ weight: Font.Weight = .heavy) -> Font {
        PLFonts.register()
        let name = switch weight {
        case .heavy, .black, .bold: "Fredoka-Bold"
        case .semibold: "Fredoka-SemiBold"
        default: "Fredoka-Medium"
        }
        return .custom(name, size: size)
    }

    public static func text(_ size: CGFloat, _ weight: Font.Weight = .medium) -> Font {
        PLFonts.register()
        let name = switch weight {
        case .heavy, .black: "Nunito-ExtraBold"
        case .bold: "Nunito-Bold"
        case .semibold: "Nunito-SemiBold"
        default: "Nunito-Medium"
        }
        return .custom(name, size: size)
    }
}

public enum PLMark: String, Sendable {
    case polingual = "polingual-mark"
    case bucket = "bucket-mark"

    public var available: Bool { url != nil }

    var url: URL? { Bundle.module.url(forResource: rawValue, withExtension: "pdf", subdirectory: "Brand") }
}

public struct PLMarkView: View {
    let mark: PLMark

    public init(_ mark: PLMark) { self.mark = mark }

    public var body: some View {
        Canvas { ctx, size in
            guard let url = mark.url, let page = CGPDFDocument(url as CFURL)?.page(at: 1) else { return }
            let box = page.getBoxRect(.mediaBox)
            ctx.withCGContext { cg in
                cg.translateBy(x: 0, y: size.height)
                cg.scaleBy(x: size.width / box.width, y: -size.height / box.height)
                cg.drawPDFPage(page)
            }
        }
        .aspectRatio(1, contentMode: .fit)
        .accessibilityHidden(true)
    }
}
