import BucketKit
import SwiftUI

enum Stickers {
    static let today: [PLSticker] = [
        PLSticker(.ticket, .topLeading, width: 150, x: 0, y: 6, angle: -6),
        PLSticker(.tornLabel, .bottomLeading, width: 104, x: 150, y: -4, angle: 5),
        PLSticker(.seal, .topTrailing, width: 76, x: -4, y: 4, angle: 8),
        PLSticker(.pebble, .bottomTrailing, width: 34, x: -96, y: -6, angle: -10),
    ]
    static let learn: [PLSticker] = [
        PLSticker(.azulejo, .topLeading, width: 80, x: 4, y: 8, angle: -8),
        PLSticker(.kente, .bottomLeading, width: 120, x: 104, y: -10, angle: 4),
        PLSticker(.seal, .topTrailing, width: 70, x: -6, y: 6, angle: 6),
        PLSticker(.star, .topLeading, width: 54, x: 120, y: 2, angle: -10),
    ]
    static let listen: [PLSticker] = [
        PLSticker(.scriptKo, .topLeading, width: 80, x: 0, y: 14, angle: -8, shadow: false),
        PLSticker(.calligraphyAin, .top, width: 86, x: -10, y: 4, angle: 6, shadow: false),
        PLSticker(.seal, .topTrailing, width: 70, x: -6, y: 8, angle: 9),
        PLSticker(.star, .bottomLeading, width: 48, x: 92, y: -4, angle: -12),
        PLSticker(.scriptRu, .bottomTrailing, width: 74, x: -84, y: -2, angle: -6, shadow: false),
    ]
    static let translate: [PLSticker] = [
        PLSticker(.ticket, .topLeading, width: 140, x: 0, y: 8, angle: -5),
        PLSticker(.azulejoGrid, .topTrailing, width: 72, x: -4, y: 6, angle: 7),
        PLSticker(.tornLabel, .bottomTrailing, width: 96, x: -84, y: -2, angle: -6),
    ]
    static let account: [PLSticker] = [
        PLSticker(.girih, .topLeading, width: 78, x: 4, y: 8, angle: -9),
        PLSticker(.bunting, .top, width: 150, x: 20, y: 0, angle: 3, shadow: false),
        PLSticker(.seal, .topTrailing, width: 66, x: -6, y: 18, angle: 8),
    ]
    static let games: [PLSticker] = [
        PLSticker(.blocks, .topLeading, width: 92, x: 2, y: 8, angle: -7),
        PLSticker(.bunting, .top, width: 140, x: 10, y: -2, angle: 2, shadow: false),
        PLSticker(.star, .topTrailing, width: 66, x: -8, y: 10, angle: 10),
        PLSticker(.scriptKo, .bottomTrailing, width: 62, x: -90, y: 0, angle: -8, shadow: false),
    ]
    static let paywall: [PLSticker] = [
        PLSticker(.ticket, .topLeading, width: 132, x: 0, y: 8, angle: -7),
        PLSticker(.seal, .topTrailing, width: 74, x: -6, y: 4, angle: 9),
        PLSticker(.calligraphyYong, .bottom, width: 72, x: 16, y: 6, angle: -4, shadow: false),
        PLSticker(.pebble, .bottomTrailing, width: 34, x: -100, y: -6, angle: 10),
    ]
    static let onboarding: [PLSticker] = [
        PLSticker(.ticket, .topLeading, width: 150, x: 0, y: 6, angle: -6),
        PLSticker(.tornLabel, .bottomLeading, width: 100, x: 36, y: 0, angle: 6),
        PLSticker(.seal, .topTrailing, width: 80, x: -4, y: 4, angle: 8),
        PLSticker(.kente, .bottomTrailing, width: 100, x: -6, y: -4, angle: -5),
    ]
    static let signIn: [PLSticker] = [
        PLSticker(.ticket, .topLeading, width: 130, x: 0, y: 6, angle: -6),
        PLSticker(.seal, .topTrailing, width: 70, x: -6, y: 6, angle: 8),
        PLSticker(.star, .bottomTrailing, width: 50, x: -92, y: -4, angle: -10),
    ]
}

struct PLScreenTop: View {
    let title: String
    var subtitle: String?
    let stickers: [PLSticker]
    var onDark = false
    var height: CGFloat = 116

    var body: some View {
        PLStage(stickers, height: height) {
            PLHeader(title, subtitle: subtitle, onDark: onDark)
                .padding(.top, PL.Space.s2)
        }
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
