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
        .mastered(lang: "es", count: 12, root: "en", words: [("noche", "night"), ("agua", "water"), ("Donaudampfschiff", "Danube steamer"), ("gracias", "thank you"), ("buenos días", "good morning"), ("casa", "house"), ("perro", "dog"), ("libro", "book"), ("ciudad", "city"), ("mañana", "tomorrow"), ("amigo", "friend"), ("comer", "to eat")].map { MasteredWord(form: $0.0, meaning: $0.1) }),
        .mastered(lang: "ja", count: 2, root: "en", words: [MasteredWord(form: "夜", meaning: "night"), MasteredWord(form: "水", meaning: "water")]),
        .mastered(lang: "sv", count: 140, root: "en", words: (0..<140).map { MasteredWord(form: "ord\($0)", meaning: "word \($0)") }),
        .masteredAll(sets: [
            MasteredSet(lang: "sv", count: 10, words: ["hej", "tack", "natt", "vatten", "hus", "hund", "bok", "stad", "vän", "äta"].map { MasteredWord(form: $0, meaning: $0) }),
            MasteredSet(lang: "de", count: 4, words: ["Nacht", "Wasser", "Donaudampfschiff", "danke"].map { MasteredWord(form: $0, meaning: $0) }),
            MasteredSet(lang: "ja", count: 2, words: [MasteredWord(form: "夜", meaning: "night"), MasteredWord(form: "水", meaning: "water")]),
        ], root: "en"),
        .masteredAll(sets: (0..<6).map { k in MasteredSet(lang: ["sv", "de", "nl", "fr", "es", "it"][k], count: 90, words: (0..<90).map { MasteredWord(form: "w\(k)x\($0)", meaning: "") }) }, root: "en"),
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

    @Test func masteredAllTextNamesEveryWord() throws {
        let sets = [MasteredSet(lang: "sv", count: 2, words: [MasteredWord(form: "hej", meaning: "hi"), MasteredWord(form: "tack", meaning: "thanks")]),
                    MasteredSet(lang: "de", count: 1, words: [MasteredWord(form: "Nacht", meaning: "night")])]
        let text = ShareObject.masteredAll(sets: sets, root: "en").text
        for w in sets.flatMap(\.words) { #expect(text.contains(w.form)) }
        #expect(text.hasPrefix("3 "))
    }

    @Test func masteredFlowCapKeepsLanguageOrder() {
        let sets = [MasteredSet(lang: "sv", count: 3, words: ["a", "b", "c"].map { MasteredWord(form: $0, meaning: "") }),
                    MasteredSet(lang: "de", count: 3, words: ["d", "e", "f"].map { MasteredWord(form: $0, meaning: "") })]
        let shown = MasteredWordFlow.shown(sets, cap: 4)
        #expect(shown.map(\.lang) == ["sv", "de"])
        #expect(shown.flatMap(\.words).map(\.form) == ["a", "b", "c", "d"])
    }

    @Test func scoreLinksOpenTheLanguages() {
        let page = ShareObject.score(ShareScore(source: "Match", right: 9, total: 12, langs: ["fr", "es"], root: "en")).page
        #expect(SharedLink(page.url) == .langs(root: "en", targets: ["fr", "es"]))
        #expect(SharedLink(ShareObject.score(ShareScore(source: "Physics", right: 3, total: 3)).page.url) == .home)
    }
}
