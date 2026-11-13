import BucketKit
import SwiftUI

enum D8 {
    static let parchment = PL.paper
    static let ink = PL.ink
    static let vermilion = PL.vermilion
    static let vermilionLip = PL.vermilionDeep
    static let malachite = PL.malachite
    static let malachiteLip = PL.malachiteDeep
    static let lapis = PL.lapis
    static let keyline = PL.paper3
    static let label = PL.inkDim
    static let ipa = PL.inkDim
    static let panel = PL.paper.opacity(0.8)
    static let face = PL.card
    static let edge = PL.paper3
    static let wrongFace = PL.vermilion.opacity(0.12)
    static let pickedFace = PL.lapisSoft
    static let picked = PL.lapis
    static let rightText = PL.malachite
    static let disabled = PL.paper2
    static let disabledText = PL.inkFaint

    static func word(_ size: CGFloat) -> Font { PL.word.font(scale: size / PL.word.size).weight(.bold) }
    static func caps(_ size: CGFloat) -> Font { PL.label.font(scale: size / PL.label.size) }
}

struct D8Option: ButtonStyle {
    var selected = false
    var align: Alignment = .leading
    var compact = false

    func makeBody(configuration: Configuration) -> some View {
        let down = selected || configuration.isPressed
        configuration.label
            .font(PL.heading.font(scale: 18 / PL.heading.size))
            .foregroundStyle(Palette.ink)
            .frame(maxWidth: compact ? nil : .infinity, minHeight: FitScale.naturalTarget, alignment: align)
            .padding(.horizontal, 16)
            .background(selected ? D8.pickedFace : D8.face, in: .rect(cornerRadius: PL.Radius.md))
            .overlay { RoundedRectangle(cornerRadius: PL.Radius.md).strokeBorder(selected ? D8.picked : D8.edge, lineWidth: selected ? 3 : 2) }
            .background(selected ? D8.picked : D8.edge, in: .rect(cornerRadius: PL.Radius.md).offset(y: down ? 1 : 4))
            .offset(y: down ? 3 : 0)
            .padding(.bottom, 4)
    }
}
