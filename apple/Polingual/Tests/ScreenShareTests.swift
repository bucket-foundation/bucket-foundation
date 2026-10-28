import Foundation
import Testing
@testable import Polingual

@MainActor
struct ScreenShareTests {
    @Test func wordLinkRoundTrips() {
        let page = SharePage.word(id: "night", gloss: "night", forms: [("fr", "nuit"), ("es", "noche"), ("de", "Nacht")])
        #expect(page.url.absoluteString.hasPrefix("https://bucket.foundation/s/w?"))
        #expect(SharedLink(page.url) == .word("night"))
    }

    @Test func langsAtomAndDeckLinksParse() {
        #expect(SharedLink(URL(string: "https://bucket.foundation/s/l?l=fr.es.it&r=en")!) == .langs(root: "en", targets: ["fr", "es", "it"]))
        #expect(SharedLink(URL(string: "https://bucket.foundation/s/a?d=physics&id=newton-2")!) == .atom(deck: "physics", atom: "newton-2"))
        #expect(SharedLink(URL(string: "https://bucket.foundation/s/d?id=math")!) == .deck("math"))
        #expect(SharedLink(URL(string: "https://bucket.foundation/s")!) == .home)
        #expect(SharedLink(URL(string: "https://example.com/s/w?g=x")!) == nil)
    }

    @Test func longFieldsAreClipped() {
        let page = SharePage.word(id: "x", gloss: String(repeating: "a", count: 200), forms: [("fr", String(repeating: "b", count: 200))])
        #expect(page.url.absoluteString.count < 200)
    }

    @Test func innermostTaggedScreenWins() {
        let s = ScreenShare.shared
        let outer = UUID(), inner = UUID()
        let word = SharePage.word(id: "night", gloss: "night", forms: [("fr", "nuit")])
        let langs = SharePage(path: "/l", items: [URLQueryItem(name: "l", value: "fr")], title: "fr")
        s.set(outer, langs)
        s.set(inner, word)
        #expect(s.current == word)
        s.remove(inner)
        #expect(s.current == langs)
        s.remove(outer)
        #expect(s.current == .app)
    }
}
