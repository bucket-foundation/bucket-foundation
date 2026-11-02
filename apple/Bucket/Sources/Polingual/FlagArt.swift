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
                if emblem, let e = flag.emblem {
                    FlagEmblem(emblem: e, size: min(w, h) * e.scale, serif: flag.pigment)
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

struct FlagEmblem: View {
    let emblem: D8Flag.Emblem
    let size: CGFloat
    let serif: Bool

    var body: some View {
        let color = Color(hex: emblem.color)
        switch emblem.glyph {
        case "✡": Hexagram().stroke(color, lineWidth: size * 0.09).frame(width: size, height: size)
        case "☸": Chakra().stroke(color, lineWidth: size * 0.07).frame(width: size, height: size)
        case "☯": Taegeuk(size: size, red: color)
        default:
            Text(emblem.glyph)
                .font(.system(size: size, weight: .bold, design: serif ? .serif : .default))
                .foregroundStyle(color)
        }
    }
}

struct Chakra: Shape {
    func path(in r: CGRect) -> Path {
        var p = Path(ellipseIn: r)
        let radius = min(r.width, r.height) / 2
        for spoke in 0..<12 {
            let angle = Double(spoke) * .pi / 6
            p.move(to: CGPoint(x: r.midX + radius * cos(angle), y: r.midY + radius * sin(angle)))
            p.addLine(to: CGPoint(x: r.midX - radius * cos(angle), y: r.midY - radius * sin(angle)))
        }
        return p
    }
}

struct Taegeuk: View {
    let size: CGFloat
    let red: Color
    private let blue = Color(hex: 0x003478)

    var body: some View {
        ZStack {
            Circle().fill(blue)
            Circle().trim(from: 0.5, to: 1).fill(red)
            Circle().fill(red).frame(width: size / 2, height: size / 2).offset(x: -size / 4)
            Circle().fill(blue).frame(width: size / 2, height: size / 2).offset(x: size / 4)
        }
        .frame(width: size, height: size)
    }
}

struct Hexagram: Shape {
    func path(in r: CGRect) -> Path {
        var p = Path()
        let top = [CGPoint(x: r.midX, y: r.minY), CGPoint(x: r.maxX, y: r.minY + r.height * 0.75), CGPoint(x: r.minX, y: r.minY + r.height * 0.75)]
        let bottom = [CGPoint(x: r.midX, y: r.maxY), CGPoint(x: r.minX, y: r.minY + r.height * 0.25), CGPoint(x: r.maxX, y: r.minY + r.height * 0.25)]
        p.addLines(top + [top[0]])
        p.closeSubpath()
        p.addLines(bottom + [bottom[0]])
        p.closeSubpath()
        return p
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
            .compositingGroup()
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
