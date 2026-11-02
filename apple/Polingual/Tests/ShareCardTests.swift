import Foundation
import SwiftUI
import Testing
import BucketKit
@testable import Polingual

@MainActor
struct ShareCardTests {
    static let night = ShareForm(lang: "ja", form: "夜")
    static let forms = [ShareForm(lang: "fr", form: "nuit"), ShareForm(lang: "es", form: "noche"), ShareForm(lang: "de", form: "Nacht"), ShareForm(lang: "ar", form: "ليل"), night, ShareForm(lang: "ru", form: "ночь")]
    static let every: [ShareObject] = [
        .streak(days: 37, langs: ["fr", "es", "it"], root: "en"),
        .system(name: "Romance", root: "en", targets: ["fr", "es", "it", "pt"], streak: 37, learned: 124),
        .system(name: "Everything at once", root: "en", targets: ["fr", "es", "it", "pt", "de", "nl", "sv", "ja"], streak: 0, learned: 0),
        .language("es", root: "en"),
        .flag("he", root: "en"),
        .word(id: "night", gloss: "night", forms: Array(forms.prefix(4))),
        .word(id: "night", gloss: "night", forms: forms),
        .tile(form: ShareForm(lang: "es", form: "noche"), gloss: "night", reading: "/ˈno.tʃe/"),
        .tile(form: ShareForm(lang: "de", form: "Donaudampfschifffahrt"), gloss: "Danube steam shipping", reading: nil),
        .score(ShareScore(source: "Match", right: 9, total: 12, langs: ["fr", "es"], root: "en", streak: 37)),
        .content(ShareMoment(title: "Gravity", source: "Spanish Wikipedia", branch: "02", lang: "es", quote: "La gravedad es la fuerza de atracción entre todas las cosas que tienen masa, desde las manzanas hasta las galaxias más lejanas.")),
        .content(ShareMoment(title: "Radio Nacional", source: "Spain", branch: "00", lang: "es")),
        .content(ShareMoment(title: "Newton's second law", source: "Physics", branch: "02", quote: "Force equals mass times acceleration.", seconds: 667)),
        .standings(ShareStandings(group: "Rossi family", rows: [
            ShareStanding(rank: 1, name: "Gia", weekly: 160, streak: 12, mastered: 240, langs: ["it", "es", "fr", "de"], isMe: true),
            ShareStanding(rank: 2, name: "NL", weekly: 150, streak: 41, mastered: 300, langs: ["en"], isMe: false),
            ShareStanding(rank: 3, name: "M", weekly: 96, streak: 5, mastered: 232, langs: ["fr", "de", "es"], isMe: false),
            ShareStanding(rank: 4, name: "S", weekly: 12, streak: 0, mastered: 0, langs: ["ja", "pt"], isMe: false),
            ShareStanding(rank: 5, name: "BW", weekly: 12000, streak: 365, mastered: 9000, langs: ["zh"], isMe: false),
            ShareStanding(rank: 6, name: "L", weekly: 0, streak: 0, mastered: 0, langs: [], isMe: false),
        ], members: 6)),
    ]

    @Test func everyCardRendersAtFullResolution() throws {
        let out = ProcessInfo.processInfo.environment["SHARE_CARD_OUT"]
        for (i, object) in Self.every.enumerated() {
            for style in object.styles {
                let image = try #require(Share.renderer(object, style).uiImage)
                #expect(image.cgImage?.width == 1080)
                #expect(image.cgImage?.height == 1350)
                if let out, let data = image.pngData() { try data.write(to: URL(fileURLWithPath: out).appending(path: "\(i)-\(object.kind)-\(style.rawValue).png")) }
            }
        }
    }

    @Test func everyFlagRenders() throws {
        let out = ProcessInfo.processInfo.environment["SHARE_CARD_OUT"]
        for start in stride(from: 0, to: Lang.codes.count, by: 9) {
            let langs = Array(Lang.codes[start..<min(start + 9, Lang.codes.count)])
            let object = ShareObject.system(name: "flags", root: "en", targets: langs, streak: 0, learned: 0)
            let image = try #require(Share.renderer(object, .wall).uiImage)
            if let out, let data = image.pngData() { try data.write(to: URL(fileURLWithPath: out).appending(path: "flags-\(start).png")) }
        }
    }

    @Test func everyObjectNamesItsSheetAndKeepsItsLink() {
        for object in Self.every {
            #expect(!object.sheetTitle.isEmpty)
            #expect(!object.text.isEmpty)
            #expect(object.page.url == object.route.url)
        }
    }

    @Test func scoreLinksOpenTheLanguages() {
        let page = ShareObject.score(ShareScore(source: "Match", right: 9, total: 12, langs: ["fr", "es"], root: "en")).page
        #expect(SharedLink(page.url) == .langs(root: "en", targets: ["fr", "es"]))
        #expect(SharedLink(ShareObject.score(ShareScore(source: "Physics", right: 3, total: 3)).page.url) == .home)
    }
}
