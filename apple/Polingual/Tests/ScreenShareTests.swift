import Foundation
import Testing
@testable import Polingual
#if os(iOS)
import UIKit
#endif

@MainActor
struct ScreenShareTests {
    @Test func wordLinkRoundTrips() {
        let page = SharePage.word(id: "night", gloss: "night", forms: [("fr", "nuit"), ("es", "noche"), ("de", "Nacht")])
        #expect(page.url.absoluteString.hasPrefix("https://www.polingual.com/s/w?"))
        #expect(SharedLink(page.url) == .word("night"))
    }

    @Test func langsAtomAndDeckLinksParse() {
        #expect(SharedLink(URL(string: "https://www.bucket.foundation/s/l?l=fr.es.it&r=en")!) == .langs(root: "en", targets: ["fr", "es", "it"]))
        #expect(SharedLink(URL(string: "https://www.bucket.foundation/s/a?d=physics&id=newton-2")!) == .atom(deck: "physics", atom: "newton-2"))
        #expect(SharedLink(URL(string: "https://www.bucket.foundation/s/d?id=math")!) == .deck("math"))
        #expect(SharedLink(URL(string: "https://www.bucket.foundation/s/c?t=Gravedad&b=Wikipedia&l=es&id=Gravity&q=La%20gravedad")!) == .content(topic: "Gravity", lang: "es", fallback: .read))
        #expect(SharedLink(URL(string: "https://www.bucket.foundation/s/c?t=Radio%20Uno&b=Spain")!) == .content(topic: "Radio Uno", lang: nil, fallback: .listen))
        #expect(SharedLink(URL(string: "https://www.bucket.foundation/s/c?id=Gravity&l=zz-bad")!) == .content(topic: "Gravity", lang: nil, fallback: .listen))
        #expect(SharedLink(URL(string: "https://www.bucket.foundation/s/c?t=Talk&q=hello")!) == .content(topic: "Talk", lang: nil, fallback: .read))
        #expect(SharedLink(URL(string: "https://www.bucket.foundation/s/c?t=Talk&at=30")!) == .content(topic: "Talk", lang: nil, fallback: .watch))
        #expect(SharedLink(URL(string: "https://www.bucket.foundation/s/c?t=%20%20")!) == .home)
        #expect(SharedLink(URL(string: "https://www.bucket.foundation/s/c")!) == .home)
        #expect(SharedLink(URL(string: "https://www.bucket.foundation/s")!) == .home)
        #expect(SharedLink(URL(string: "https://example.com/s/w?g=x")!) == nil)
        #expect(SharedLink(URL(string: "https://polingual.com/s/d?id=math")!) == .deck("math"))
        #expect(SharedLink(URL(string: "https://www.polingual.com/s/w?g=night")!) == .word("night"))
    }

    @Test func polingualSharesPolingualLinks() {
        #expect(SharePage.app.url.host() == "www.polingual.com")
        #expect(SharePage.app.title.contains("Polingual"))
        #expect(SharePage.group(code: "7K3M9QX2PD", name: "Club", kind: .friends).title == "Join Club on Polingual")
        #expect(Share.appLink.absoluteString == "https://www.polingual.com/?utm_source=app_share")
        let es = Bundle.main.path(forResource: "es", ofType: "lproj").flatMap(Bundle.init(path:))
        #expect(es?.localizedString(forKey: "Join %@ on %@", value: nil, table: nil) == "Únete a %1$@ en %2$@")
        #expect(es?.localizedString(forKey: "Learn languages together on Polingual", value: nil, table: nil) == "Aprende idiomas juntos en Polingual")
    }

    @Test func groupInviteLinkRoundTrips() {
        let page = SharePage.group(code: "7K3M9QX2PD", name: "Rossi family", kind: .family)
        #expect(page.url.absoluteString == "https://www.polingual.com/s/g?c=7K3M9QX2PD&n=Rossi%20family&k=family")
        #expect(SharedLink(page.url) == .group("7K3M9QX2PD"))
        #expect(SharedLink(URL(string: "https://www.bucket.foundation/s/g?c=bad")!) == .home)
    }

    @Test func groupLinkWaitsForTheJoinSheet() {
        DeepLink.shared.open(URL(string: "https://bucket.foundation/s/g?c=7K3M9QX2PD")!)
        #expect(DeepLink.shared.pending == .group("7K3M9QX2PD"))
        #expect(DeepLink.shared.translate == nil)
        DeepLink.shared.pending = nil
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

#if os(iOS)
@MainActor
struct ShareLinkItemTests {
    let page = SharePage.group(code: "7K3M9QX2PD", name: "Club", kind: .friends)

    @Test func appleTargetsGetTheLinkForARichPreview() {
        for type in [UIActivity.ActivityType.message, .mail, .airDrop, .copyToPasteboard] {
            #expect(ShareLinkItem.item(page, for: type) as? URL == page.url)
        }
    }

    @Test func otherTargetsGetTitleAndLinkOnce() {
        for type in [UIActivity.ActivityType("net.whatsapp.WhatsApp.ShareExtension"), UIActivity.ActivityType("ph.telegra.Telegraph.Share")] {
            let text = ShareLinkItem.item(page, for: type) as? String
            #expect(text == "Join Club on Polingual\n" + page.url.absoluteString)
            #expect(text?.components(separatedBy: page.url.absoluteString).count == 2)
        }
    }
}
#endif
