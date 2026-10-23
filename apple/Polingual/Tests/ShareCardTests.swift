import Foundation
import SwiftUI
import Testing
@testable import Polingual

@MainActor
@Test func shareCardRendersAndMessageLinksTheApp() throws {
    let image = ImageRenderer(content: ShareCard(langs: ["fr", "es", "it"], streak: 7, learned: 124))
    image.scale = 2
    let ui = try #require(image.uiImage)
    #expect(ui.size.width > 500)
    if let out = ProcessInfo.processInfo.environment["SHARE_CARD_OUT"], let data = ui.pngData() { try data.write(to: URL(fileURLWithPath: out)) }
    let text = Share.message(langs: ["fr", "es"], streak: 7)
    #expect(text.hasPrefix("7 days in a row learning French, Spanish together on Polingual"))
    #expect(text.contains("apps.apple.com/app/id6825177856"))
}
