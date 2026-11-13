import CoreGraphics
import CoreText
import Foundation
import SwiftUI

extension Color {
    public init(plHex hex: UInt32, alpha: Double = 1) {
        self.init(.sRGB, red: Double((hex >> 16) & 0xFF) / 255, green: Double((hex >> 8) & 0xFF) / 255, blue: Double(hex & 0xFF) / 255, opacity: alpha)
    }
}

public enum PLFamily: String, Sendable { case display, body, mono }

public struct PLTypeSpec: Sendable, Equatable {
    public let family: PLFamily
    public let size: CGFloat
    public let weight: Int
    public let line: CGFloat

    public var fontWeight: Font.Weight {
        switch weight {
        case ..<450: .regular
        case ..<550: .medium
        case ..<650: .semibold
        case ..<750: .bold
        default: .heavy
        }
    }

    public func font(scale: CGFloat = 1) -> Font {
        PLFonts.register()
        let s = size * scale
        switch family {
        case .display: return Font.custom("Fredoka", size: s).weight(fontWeight)
        case .body: return Font.custom("Nunito", size: s).weight(fontWeight)
        case .mono: return Font.custom(weight >= 600 ? "SpaceMono-Bold" : "SpaceMono-Regular", size: s)
        }
    }
}

public enum PLFonts {
    private static let once: Bool = {
        guard let dir = Bundle.module.url(forResource: "Fonts", withExtension: nil),
              let files = try? FileManager.default.contentsOfDirectory(at: dir, includingPropertiesForKeys: nil) else { return false }
        for url in files where url.pathExtension == "ttf" {
            CTFontManagerRegisterFontsForURL(url as CFURL, .process, nil)
        }
        return true
    }()

    @discardableResult public static func register() -> Bool { once }
}

extension View {
    public func plType(_ spec: PLTypeSpec, scale: CGFloat = 1) -> some View {
        font(spec.font(scale: scale))
            .lineSpacing(max(0, spec.size * scale * (spec.line - 1.2)))
            .tracking(spec.family == .mono ? spec.size * scale * 0.12 : 0)
            .textCase(spec.family == .mono ? .uppercase : nil)
    }
}

final class PLArtCache: @unchecked Sendable {
    static let shared = PLArtCache()
    private var docs: [PLArt: CGPDFDocument] = [:]
    private let lock = NSLock()

    func doc(_ art: PLArt) -> CGPDFDocument? {
        lock.lock()
        defer { lock.unlock() }
        if let d = docs[art] { return d }
        guard let url = Bundle.module.url(forResource: art.rawValue, withExtension: "pdf", subdirectory: "Art"),
              let d = CGPDFDocument(url as CFURL) else { return nil }
        docs[art] = d
        return d
    }
}

extension PLArt {
    public var available: Bool { PLArtCache.shared.doc(self) != nil }
}

public struct PLArtView: View {
    let art: PLArt
    let shadow: Bool

    public init(_ art: PLArt, shadow: Bool = false) {
        self.art = art
        self.shadow = shadow
    }

    public var body: some View {
        Canvas { ctx, size in
            guard let page = PLArtCache.shared.doc(art)?.page(at: 1) else { return }
            let box = page.getBoxRect(.mediaBox)
            ctx.withCGContext { cg in
                cg.translateBy(x: 0, y: size.height)
                cg.scaleBy(x: size.width / box.width, y: -size.height / box.height)
                cg.drawPDFPage(page)
            }
        }
        .aspectRatio(art.size, contentMode: .fit)
        .shadow(color: shadow ? .black.opacity(0.35) : .clear, radius: 0, x: shadow ? 6 : 0, y: shadow ? 8 : 0)
        .accessibilityHidden(true)
    }
}

public enum PLButtonVariant: Sendable { case primary, secondary, accent, success, gold, ghost, quiet

    var face: Color {
        switch self {
        case .primary: PL.vermilion
        case .secondary: PL.lapis
        case .accent: PL.maya
        case .success: PL.malachite
        case .gold: PL.ochre
        case .ghost: PL.card
        case .quiet: .clear
        }
    }

    var lip: Color {
        switch self {
        case .primary: PL.vermilionDeep
        case .secondary: PL.lapisDeep
        case .accent: PL.lapis
        case .success: PL.malachiteDeep
        case .gold: PL.ochreDeep
        case .ghost: PL.hairline2
        case .quiet: .clear
        }
    }

    var text: Color {
        switch self {
        case .primary, .secondary, .success: PL.paper
        case .accent, .gold, .ghost: PL.ink
        case .quiet: PL.inkDim
        }
    }
}

public enum PLButtonSize: Sendable { case sm, md, lg, xl

    var height: CGFloat {
        switch self {
        case .sm: 44
        case .md: 50
        case .lg: 56
        case .xl: 64
        }
    }

    var text: CGFloat {
        switch self {
        case .sm: 15
        case .md: 17
        case .lg: 19
        case .xl: 22
        }
    }
}

public struct PLButtonStyle: ButtonStyle {
    var variant: PLButtonVariant
    var size: PLButtonSize
    var full: Bool
    @Environment(\.isEnabled) private var enabled

    public init(_ variant: PLButtonVariant = .primary, size: PLButtonSize = .md, full: Bool = true) {
        self.variant = variant
        self.size = size
        self.full = full
    }

    public func makeBody(configuration: Configuration) -> some View {
        let lip = variant == .quiet ? 0 : PL.Lip.md
        let down = configuration.isPressed ? min(3, lip) : 0
        let shape = RoundedRectangle(cornerRadius: PL.Radius.md, style: .continuous)
        configuration.label
            .font(PL.heading.font(scale: size.text / PL.heading.size))
            .foregroundStyle(enabled ? variant.text : PL.inkFaint)
            .multilineTextAlignment(.center)
            .padding(.horizontal, PL.Space.s5)
            .frame(maxWidth: full ? .infinity : nil, minHeight: size.height)
            .background(enabled ? variant.face : PL.paper3, in: shape)
            .overlay { if variant == .ghost { shape.strokeBorder(PL.hairline2, lineWidth: 2) } }
            .background(enabled ? variant.lip : PL.hairline2, in: shape.offset(y: lip - down))
            .offset(y: down)
            .padding(.bottom, lip)
            .contentShape(Rectangle())
            .animation(.easeOut(duration: PL.Motion.press), value: configuration.isPressed)
    }
}

extension ButtonStyle where Self == PLButtonStyle {
    public static func pl(_ variant: PLButtonVariant = .primary, size: PLButtonSize = .md, full: Bool = true) -> PLButtonStyle {
        PLButtonStyle(variant, size: size, full: full)
    }
}

public enum PLTone: Sendable { case paper, ink, tyrian, vermilion, lapis, malachite, ochre

    var face: Color {
        switch self {
        case .paper: PL.card
        case .ink: PL.ink
        case .tyrian: PL.tyrianDeep
        case .vermilion: PL.vermilion
        case .lapis: PL.lapis
        case .malachite: PL.malachite
        case .ochre: PL.ochre
        }
    }

    var lip: Color {
        switch self {
        case .paper: PL.hairline2
        case .ink: Color.black.opacity(0.45)
        case .tyrian: Color.black.opacity(0.4)
        case .vermilion: PL.vermilionDeep
        case .lapis: PL.lapisDeep
        case .malachite: PL.malachiteDeep
        case .ochre: PL.ochreDeep
        }
    }

    public var text: Color {
        switch self {
        case .paper, .ochre: PL.ink
        default: PL.paper
        }
    }

    public var dim: Color {
        switch self {
        case .paper, .ochre: PL.inkDim
        default: PL.paper.opacity(0.8)
        }
    }
}

public struct PLCard<Content: View>: View {
    let tone: PLTone
    let pad: CGFloat
    let content: Content

    public init(_ tone: PLTone = .paper, pad: CGFloat = PL.Space.s5, @ViewBuilder content: () -> Content) {
        self.tone = tone
        self.pad = pad
        self.content = content()
    }

    public var body: some View {
        let shape = RoundedRectangle(cornerRadius: PL.Radius.lg, style: .continuous)
        content
            .foregroundStyle(tone.text)
            .padding(pad)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(tone.face, in: shape)
            .overlay { shape.strokeBorder(tone == .paper ? PL.hairline2 : Color.clear, lineWidth: 2) }
            .background(tone.lip, in: shape.offset(y: PL.Lip.md))
            .padding(.bottom, PL.Lip.md)
    }
}

public struct PLPill: View {
    let text: String
    let active: Bool

    public init(_ text: String, active: Bool = false) {
        self.text = text
        self.active = active
    }

    public var body: some View {
        Text(text)
            .font(PL.small.font())
            .foregroundStyle(active ? PL.paper : PL.ink)
            .padding(.horizontal, PL.Space.s4)
            .frame(minHeight: 36)
            .background(active ? PL.ink : PL.card, in: Capsule())
            .overlay { Capsule().strokeBorder(active ? Color.clear : PL.hairline2, lineWidth: 2) }
    }
}

public struct PLBadge: View {
    let text: String
    let tone: PLTone

    public init(_ text: String, tone: PLTone = .ochre) {
        self.text = text
        self.tone = tone
    }

    public var body: some View {
        Text(text)
            .plType(PL.label)
            .foregroundStyle(tone.text)
            .padding(.horizontal, PL.Space.s2)
            .padding(.vertical, PL.Space.s1)
            .background(tone.face, in: RoundedRectangle(cornerRadius: 6, style: .continuous))
    }
}

public struct PLFlagTile<Flag: View>: View {
    let language: String
    let word: String
    let ipa: String?
    let gloss: String?
    let tilt: Double
    let flag: Flag

    public init(language: String, word: String, ipa: String? = nil, gloss: String? = nil, tilt: Double = -2, @ViewBuilder flag: () -> Flag) {
        self.language = language
        self.word = word
        self.ipa = ipa
        self.gloss = gloss
        self.tilt = tilt
        self.flag = flag()
    }

    public var body: some View {
        let shape = RoundedRectangle(cornerRadius: PL.Radius.lg, style: .continuous)
        VStack(alignment: .leading, spacing: PL.Space.s2) {
            Text(language).plType(PL.label).foregroundStyle(PL.inkDim)
            Text(word)
                .font(PL.word.font(scale: 0.8))
                .foregroundStyle(PL.ink)
                .minimumScaleFactor(0.6)
                .lineLimit(2)
            if let ipa { Text(ipa).font(PL.small.font()).foregroundStyle(PL.inkDim) }
            if let gloss { Text(gloss).font(PL.body.font()).foregroundStyle(PL.ink) }
        }
        .padding(PL.Space.s4)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background { PL.card.opacity(0.88).padding(.vertical, PL.Space.s5) }
        .background { flag.clipShape(shape) }
        .overlay { shape.strokeBorder(PL.ink.opacity(0.18), lineWidth: 2) }
        .background(PL.ink.opacity(0.35), in: shape.offset(y: PL.Lip.lg))
        .padding(.bottom, PL.Lip.lg)
        .rotationEffect(.degrees(tilt))
    }
}

public struct PLSticker: Identifiable, Sendable {
    public enum Anchor: Sendable { case topLeading, top, topTrailing, leading, trailing, bottomLeading, bottom, bottomTrailing

        var unit: UnitPoint {
            switch self {
            case .topLeading: .topLeading
            case .top: .top
            case .topTrailing: .topTrailing
            case .leading: .leading
            case .trailing: .trailing
            case .bottomLeading: .bottomLeading
            case .bottom: .bottom
            case .bottomTrailing: .bottomTrailing
            }
        }
    }

    public let id: String
    public let art: PLArt
    public let anchor: Anchor
    public let width: CGFloat
    public let offset: CGSize
    public let angle: Double
    public let shadow: Bool

    public init(_ art: PLArt, _ anchor: Anchor, width: CGFloat, x: CGFloat = 0, y: CGFloat = 0, angle: Double = 0, shadow: Bool = true) {
        self.id = "\(art.rawValue)-\(x)-\(y)"
        self.art = art
        self.anchor = anchor
        self.width = width
        self.offset = CGSize(width: x, height: y)
        self.angle = max(-14, min(14, angle))
        self.shadow = shadow
    }
}

public struct PLStickerLayer: View {
    let stickers: [PLSticker]

    public init(_ stickers: [PLSticker]) { self.stickers = stickers }

    public var body: some View {
        ZStack {
            ForEach(stickers) { s in
                PLArtView(s.art, shadow: s.shadow)
                    .frame(width: s.width)
                    .rotationEffect(.degrees(s.angle))
                    .offset(s.offset)
                    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: Alignment(horizontal: s.anchor.unit.x < 0.5 ? .leading : s.anchor.unit.x > 0.5 ? .trailing : .center, vertical: s.anchor.unit.y < 0.5 ? .top : s.anchor.unit.y > 0.5 ? .bottom : .center))
            }
        }
        .allowsHitTesting(false)
        .accessibilityHidden(true)
    }
}

public struct PLDotPaper: View {
    public init() {}

    public var body: some View {
        Canvas { ctx, size in
            let step: CGFloat = 22
            var y: CGFloat = step / 2
            while y < size.height {
                var x: CGFloat = step / 2
                while x < size.width {
                    ctx.fill(Path(ellipseIn: CGRect(x: x - 1.4, y: y - 1.4, width: 2.8, height: 2.8)), with: .color(PL.paper3))
                    x += step
                }
                y += step
            }
        }
        .background(PL.paper)
        .accessibilityHidden(true)
    }
}

public struct PLStarLattice: View {
    public init() {}

    public var body: some View {
        Canvas { ctx, size in
            let step: CGFloat = 56
            var lines = Path()
            var row = 0
            var y: CGFloat = 0
            while y < size.height + step {
                var x: CGFloat = row.isMultiple(of: 2) ? 0 : step / 2
                while x < size.width + step {
                    lines.move(to: CGPoint(x: x, y: y - step / 2))
                    lines.addLine(to: CGPoint(x: x + step / 2, y: y))
                    lines.addLine(to: CGPoint(x: x, y: y + step / 2))
                    lines.addLine(to: CGPoint(x: x - step / 2, y: y))
                    lines.closeSubpath()
                    let r: CGFloat = 5
                    var star = Path()
                    for i in 0..<8 {
                        let a = Double(i) * .pi / 4
                        let rr = i.isMultiple(of: 2) ? r : r * 0.35
                        let p = CGPoint(x: x + CGFloat(cos(a)) * rr, y: y + step / 2 + CGFloat(sin(a)) * rr)
                        if i == 0 { star.move(to: p) } else { star.addLine(to: p) }
                    }
                    star.closeSubpath()
                    ctx.fill(star, with: .color(PL.ochre.opacity(0.35)))
                    x += step
                }
                y += step / 2
                row += 1
            }
            ctx.stroke(lines, with: .color(PL.tyrianDeep.opacity(0.55)), lineWidth: 1.5)
        }
        .background(PL.tyrian)
        .accessibilityHidden(true)
    }
}

public struct PLDiagonalCut: View {
    let start: CGFloat
    let end: CGFloat

    public init(start: CGFloat = 0.62, end: CGFloat = 0.38) {
        self.start = start
        self.end = end
    }

    public var body: some View {
        ZStack {
            PLDotPaper()
            PLStarLattice()
                .mask {
                    GeometryReader { g in
                        Path { p in
                            p.move(to: CGPoint(x: 0, y: g.size.height * start))
                            p.addLine(to: CGPoint(x: g.size.width, y: g.size.height * end))
                            p.addLine(to: CGPoint(x: g.size.width, y: g.size.height))
                            p.addLine(to: CGPoint(x: 0, y: g.size.height))
                            p.closeSubpath()
                        }
                    }
                }
        }
        .accessibilityHidden(true)
    }
}

public enum PLGround: Sendable { case paper, lattice, cut(CGFloat, CGFloat) }

extension View {
    public func plGround(_ ground: PLGround, band: Bool = false) -> some View {
        background {
            ZStack(alignment: .bottom) {
                switch ground {
                case .paper: PLDotPaper()
                case .lattice: PLStarLattice()
                case .cut(let s, let e): PLDiagonalCut(start: s, end: e)
                }
                if band { PLFlagBand() }
            }
            .ignoresSafeArea()
        }
    }
}

public struct PLFlagBand: View {
    public init() {}

    public var body: some View {
        PLArtView(.flagBand)
            .frame(maxWidth: .infinity)
            .frame(height: 10)
            .clipped()
    }
}

public struct PLStreakFlame: View {
    let days: Int
    let caption: String
    let onDark: Bool

    public init(days: Int, caption: String, onDark: Bool = false) {
        self.days = days
        self.caption = caption
        self.onDark = onDark
    }

    public var body: some View {
        HStack(alignment: .center, spacing: PL.Space.s2) {
            PLArtView(.streakFlame).frame(height: 40)
            VStack(alignment: .leading, spacing: 0) {
                Text(days, format: .number).font(PL.title.font(scale: 0.8)).foregroundStyle(PL.vermilion)
                Text(caption).plType(PL.label).foregroundStyle(onDark ? PL.paper : PL.ink)
            }
        }
        .accessibilityElement(children: .combine)
    }
}
