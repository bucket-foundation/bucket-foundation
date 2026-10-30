import BucketKit
import SwiftUI

extension Color {
    init(hex: UInt32) {
        self.init(.sRGB, red: Double((hex >> 16) & 0xFF) / 255, green: Double((hex >> 8) & 0xFF) / 255, blue: Double(hex & 0xFF) / 255)
    }
}

struct FlagFace: View {
    let flag: D8Flag
    var emblem = true

    var body: some View {
        GeometryReader { g in
            let w = g.size.width, h = g.size.height
            ZStack(alignment: .topLeading) {
                bands(w, h)
                if let c = flag.canton {
                    Rectangle().fill(Color(hex: c.color)).frame(width: w * c.width, height: h * c.height)
                }
                if let c = flag.cross {
                    Rectangle().fill(Color(hex: c)).frame(width: w, height: h * 0.2).offset(y: h * 0.4)
                    Rectangle().fill(Color(hex: c)).frame(width: w * 0.2, height: h).offset(x: w * 0.3)
                }
                if let c = flag.hoist {
                    Path { p in
                        p.move(to: .zero)
                        p.addLine(to: CGPoint(x: w * 0.5, y: h / 2))
                        p.addLine(to: CGPoint(x: 0, y: h))
                        p.closeSubpath()
                    }
                    .fill(Color(hex: c))
                }
                if emblem, let e = flag.emblem, e.glyph == "☸" {
                    Chakra(color: Color(hex: e.color))
                        .frame(width: min(w, h) * e.scale, height: min(w, h) * e.scale)
                        .position(x: w * e.x, y: h * e.y)
                } else if emblem, let e = flag.emblem {
                    Text(e.glyph)
                        .font(.system(size: min(w, h) * e.scale, weight: .bold, design: flag.pigment ? .serif : .default))
                        .foregroundStyle(Color(hex: e.color))
                        .position(x: w * e.x, y: h * e.y)
                }
            }
        }
        .accessibilityHidden(true)
    }

    @ViewBuilder
    func bands(_ w: CGFloat, _ h: CGFloat) -> some View {
        let total = flag.bands.reduce(0) { $0 + $1.weight }
        if flag.layout == .horizontal {
            VStack(spacing: 0) {
                ForEach(Array(flag.bands.enumerated()), id: \.offset) { _, b in
                    Rectangle().fill(Color(hex: b.color)).frame(height: h * b.weight / total)
                }
            }
        } else {
            HStack(spacing: 0) {
                ForEach(Array(flag.bands.enumerated()), id: \.offset) { _, b in
                    Rectangle().fill(Color(hex: b.color)).frame(width: w * b.weight / total)
                }
            }
        }
    }
}

struct Glaze: ViewModifier {
    let radius: CGFloat
    var lip: CGFloat = 0

    func body(content: Content) -> some View {
        content
            .overlay {
                RoundedRectangle(cornerRadius: radius)
                    .strokeBorder(.black.opacity(0.15), lineWidth: 2)
            }
            .overlay(alignment: .bottom) {
                LinearGradient(colors: [.clear, .black.opacity(0.18)], startPoint: .top, endPoint: .bottom)
                    .frame(height: radius * 2.4)
                    .allowsHitTesting(false)
            }
            .overlay(alignment: .top) {
                LinearGradient(colors: [.white.opacity(0.25), .clear], startPoint: .top, endPoint: .bottom)
                    .frame(height: radius * 2)
                    .allowsHitTesting(false)
            }
            .clipShape(.rect(cornerRadius: radius))
            .shadow(color: Color(hex: 0x231F20).opacity(lip > 0 ? 0.3 : 0), radius: 0, x: 0, y: lip)
    }
}

struct Shine: View {
    var body: some View {
        GeometryReader { g in
            Ellipse().fill(.white.opacity(0.45))
                .frame(width: g.size.width * 0.32, height: max(8, g.size.height * 0.09))
                .rotationEffect(.degrees(-16))
                .position(x: g.size.width * 0.74, y: max(10, g.size.height * 0.1))
        }
        .allowsHitTesting(false)
    }
}

struct Chakra: View {
    let color: Color

    var body: some View {
        Canvas { ctx, size in
            let r = min(size.width, size.height) / 2
            let c = CGPoint(x: size.width / 2, y: size.height / 2)
            let line = max(1, r * 0.12)
            ctx.stroke(Path(ellipseIn: CGRect(x: c.x - r + line / 2, y: c.y - r + line / 2, width: 2 * r - line, height: 2 * r - line)), with: .color(color), lineWidth: line)
            var spokes = Path()
            for i in 0..<24 {
                let a = Double(i) / 24 * 2 * .pi
                spokes.move(to: c)
                spokes.addLine(to: CGPoint(x: c.x + cos(a) * (r - line), y: c.y + sin(a) * (r - line)))
            }
            ctx.stroke(spokes, with: .color(color), lineWidth: max(0.5, r * 0.05))
            ctx.fill(Path(ellipseIn: CGRect(x: c.x - r * 0.18, y: c.y - r * 0.18, width: r * 0.36, height: r * 0.36)), with: .color(color))
        }
    }
}
