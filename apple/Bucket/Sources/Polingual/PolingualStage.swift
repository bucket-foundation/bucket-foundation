import BucketKit
import SwiftUI

enum Stickers {
    static let today: [PLSticker] = [
        PLSticker(.ticket, .bottomTrailing, width: 100, x: -44, y: -18, angle: -6),
        PLSticker(.seal, .topTrailing, width: 52, x: -2, y: 0, angle: 8),
        PLSticker(.pebble, .bottomTrailing, width: 24, x: -4, y: -2, angle: -10),
    ]
    static let learn: [PLSticker] = [
        PLSticker(.azulejo, .topTrailing, width: 54, x: -66, y: 2, angle: -8),
        PLSticker(.seal, .topTrailing, width: 50, x: -2, y: 6, angle: 6),
        PLSticker(.kente, .bottomTrailing, width: 86, x: -8, y: -2, angle: 4),
    ]
    static let listen: [PLSticker] = [
        PLSticker(.scriptKo, .topTrailing, width: 56, x: -70, y: 0, angle: -8, shadow: false),
        PLSticker(.seal, .topTrailing, width: 50, x: -2, y: 2, angle: 9),
        PLSticker(.star, .bottomTrailing, width: 38, x: -10, y: -4, angle: -12),
    ]
    static let translate: [PLSticker] = [
        PLSticker(.ticket, .topTrailing, width: 100, x: -46, y: 2, angle: -5),
        PLSticker(.azulejoGrid, .bottomTrailing, width: 46, x: -2, y: -2, angle: 7),
        PLSticker(.tornLabel, .bottomTrailing, width: 66, x: -60, y: 0, angle: -6),
    ]
    static let account: [PLSticker] = [
        PLSticker(.girih, .topTrailing, width: 52, x: -60, y: 2, angle: -9),
        PLSticker(.seal, .topTrailing, width: 48, x: -2, y: 8, angle: 8),
        PLSticker(.bunting, .bottomTrailing, width: 96, x: -6, y: 0, angle: 3, shadow: false),
    ]
    static let games: [PLSticker] = [
        PLSticker(.blocks, .topTrailing, width: 62, x: -64, y: 2, angle: -7),
        PLSticker(.star, .topTrailing, width: 46, x: -4, y: 4, angle: 10),
        PLSticker(.scriptKo, .bottomTrailing, width: 50, x: -10, y: 0, angle: -8, shadow: false),
    ]
    static let onboarding: [PLSticker] = [
        PLSticker(.ticket, .topLeading, width: 140, x: 0, y: 6, angle: -6),
        PLSticker(.tornLabel, .bottomLeading, width: 96, x: 36, y: 0, angle: 6),
        PLSticker(.seal, .topTrailing, width: 76, x: -4, y: 4, angle: 8),
        PLSticker(.kente, .bottomTrailing, width: 96, x: -6, y: -4, angle: -5),
    ]
    static let signIn: [PLSticker] = [
        PLSticker(.ticket, .topTrailing, width: 100, x: -48, y: 2, angle: -6),
        PLSticker(.seal, .topTrailing, width: 48, x: -2, y: 4, angle: 8),
        PLSticker(.star, .bottomTrailing, width: 36, x: -8, y: -2, angle: -10),
    ]
}

struct PLScreenTop: View {
    let title: String
    var subtitle: String?
    let stickers: [PLSticker]
    var onDark = false

    var body: some View {
        PLHeader(title, subtitle: subtitle, onDark: onDark)
            .padding(.trailing, 150)
            .frame(minHeight: 92, alignment: .bottomLeading)
            .overlay { PLStickerLayer(stickers) }
            .padding(.top, PL.Space.s2)
    }
}

extension View {
    func plChrome() -> some View {
        inlineTitle()
            .toolbar { ToolbarItem(placement: .principal) { Color.clear.frame(width: 1, height: 1).accessibilityHidden(true) } }
    }

    func plListTop() -> some View {
        listRowBackground(Color.clear)
            .listRowInsets(EdgeInsets(top: 0, leading: 4, bottom: PL.Space.s2, trailing: 4))
            .listRowSeparator(.hidden)
    }
}
