import BucketKit
import LinkPresentation
import SwiftUI
#if os(iOS)
import UIKit
#endif

struct SharePage: Equatable {
    var path: String
    var items: [URLQueryItem] = []
    var title: String

    static let host = ShareRoute.host
    static let app = SharePage(path: "", title: String(localized: "Learn every subject and language together on Bucket"))

    init(path: String, items: [URLQueryItem] = [], title: String) {
        self.path = path
        self.items = items
        self.title = title
    }

    init(_ route: ShareRoute, title: String) {
        self.init(path: route.path, items: route.items, title: title)
    }

    var url: URL { ShareRoute(path: path, items: items).url }

    static func clip(_ s: String, _ n: Int) -> String { ShareRoute.clip(s, n) }

    static func word(id: String, gloss: String, forms: [(lang: String, form: String)]) -> SharePage {
        SharePage(.word(id: id, gloss: gloss, forms: forms.map { ShareForm(lang: $0.lang, form: $0.form) }), title: "\(gloss): " + forms.prefix(6).map(\.form).joined(separator: " · "))
    }

    static func word(_ item: LangItem, _ system: LangSystem) -> SharePage {
        word(id: item.id, gloss: item.form(system.root) ?? item.gloss, forms: system.targets.compactMap { l in item.form(l).map { (l, $0) } })
    }

    static func langs(_ system: LangSystem, streak: Int = 0) -> SharePage {
        SharePage(.langs(system.targets, root: system.root, streak: streak), title: String(localized: "Learning \(system.targets.map(langName).joined(separator: ", ")) together on Bucket"))
    }

    static func deck(_ entry: DeckEntry) -> SharePage {
        SharePage(.deck(id: entry.id, title: entry.title), title: entry.title)
    }

    static func atom(_ deck: DeckEntry, _ atom: Atom) -> SharePage {
        SharePage(.atom(deck: deck.id, deckTitle: deck.title, id: atom.id, title: atom.title, summary: atom.summary), title: atom.title)
    }
}

@MainActor
@Observable
final class ScreenShare {
    static let shared = ScreenShare()
    private var stack: [(id: UUID, page: SharePage)] = []
    var current: SharePage { stack.last?.page ?? .app }

    func push(_ id: UUID, _ page: SharePage) {
        stack.removeAll { $0.id == id }
        stack.append((id, page))
    }

    func set(_ id: UUID, _ page: SharePage) {
        if let i = stack.firstIndex(where: { $0.id == id }) { stack[i].page = page } else { stack.append((id, page)) }
    }

    func remove(_ id: UUID) { stack.removeAll { $0.id == id } }

    #if os(iOS)
    func present(_ page: SharePage, image: UIImage, finished: @escaping (_ target: String, _ sent: Bool) -> Void) {
        guard let top = Self.top(Self.keyWindow?.rootViewController) else { return }
        let sheet = UIActivityViewController(activityItems: [ShareLinkItem(page: page, image: image), image], applicationActivities: nil)
        sheet.popoverPresentationController?.sourceView = top.view
        sheet.popoverPresentationController?.sourceRect = CGRect(x: top.view.bounds.midX, y: top.view.bounds.maxY - 80, width: 1, height: 1)
        sheet.completionWithItemsHandler = { type, done, _, _ in finished(type?.rawValue ?? "", done) }
        top.present(sheet, animated: true)
    }

    static var keyWindow: UIWindow? {
        UIApplication.shared.connectedScenes.compactMap { $0 as? UIWindowScene }
            .filter { $0.activationState == .foregroundActive }
            .flatMap(\.windows).first(where: \.isKeyWindow)
    }

    static func top(_ vc: UIViewController?) -> UIViewController? {
        var vc = vc
        while let next = vc?.presentedViewController, !next.isBeingDismissed { vc = next }
        return vc
    }
    #endif
}

#if os(iOS)
final class ShareLinkItem: NSObject, UIActivityItemSource {
    let page: SharePage
    let image: UIImage

    init(page: SharePage, image: UIImage) {
        self.page = page
        self.image = image
    }

    func activityViewControllerPlaceholderItem(_ controller: UIActivityViewController) -> Any { page.url }

    func activityViewController(_ controller: UIActivityViewController, itemForActivityType type: UIActivity.ActivityType?) -> Any? { page.url }

    func activityViewController(_ controller: UIActivityViewController, subjectForActivityType type: UIActivity.ActivityType?) -> String { page.title }

    func activityViewControllerLinkMetadata(_ controller: UIActivityViewController) -> LPLinkMetadata? {
        let m = LPLinkMetadata()
        m.originalURL = page.url
        m.url = page.url
        m.title = page.title
        m.imageProvider = NSItemProvider(object: image)
        return m
    }
}
#endif

struct SharePageTag: ViewModifier {
    let page: SharePage
    @State private var id = UUID()

    func body(content: Content) -> some View {
        content
            .onAppear { ScreenShare.shared.push(id, page) }
            .onChange(of: page) { _, p in ScreenShare.shared.set(id, p) }
            .onDisappear { ScreenShare.shared.remove(id) }
    }
}

extension View {
    func sharePage(_ page: SharePage) -> some View { modifier(SharePageTag(page: page)) }
    func sharePage(_ page: SharePage?) -> some View { modifier(SharePageTag(page: page ?? .app)) }
}

enum SharedLink: Equatable {
    case word(String)
    case langs(root: String, targets: [String])
    case deck(String)
    case atom(deck: String, atom: String)
    case content(topic: String, lang: String?, fallback: ContentKind)
    case group(String)
    case voice
    case home

    init?(_ url: URL) {
        if url.host() == "voice", url.scheme == "bucket" || url.scheme == "polingual" {
            self = .voice
            return
        }
        guard url.host() == SharePage.host || url.host() == "bucket.foundation", let c = URLComponents(url: url, resolvingAgainstBaseURL: false) else { return nil }
        let q = Dictionary((c.queryItems ?? []).compactMap { i in i.value.map { (i.name, $0) } }, uniquingKeysWith: { a, _ in a })
        let parts = c.path.split(separator: "/").map(String.init)
        guard parts.first == "s" else { return nil }
        switch parts.dropFirst().first {
        case "w": self = q["g"].map { .word($0) } ?? .home
        case "l", "x":
            let targets = Array((q["l"] ?? "").split(separator: ".").map(String.init).filter { Lang.info[$0] != nil }.prefix(8))
            let root = q["r"].flatMap { Lang.info[$0] != nil ? $0 : nil } ?? "en"
            self = targets.isEmpty ? .home : .langs(root: root, targets: targets)
        case "d": self = q["id"].map { .deck($0) } ?? .home
        case "c":
            let topic = (q["id"] ?? q["t"] ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
            let lang = q["l"].flatMap { Lang.info[$0] != nil ? $0 : nil }
            let fallback: ContentKind = q["at"] != nil ? .watch : q["q"] != nil ? .read : .listen
            self = topic.isEmpty ? .home : .content(topic: topic, lang: lang, fallback: fallback)
        case "g": self = GroupInvite.code(from: url).map { .group($0) } ?? .home
        case "a":
            if let d = q["d"], let a = q["id"] { self = .atom(deck: d, atom: a) } else { self = q["d"].map { .deck($0) } ?? .home }
        default: self = .home
        }
    }
}

@MainActor
@Observable
final class DeepLink {
    static let shared = DeepLink()
    var pending: SharedLink?
    var translate: String?
    var listen = false

    func open(_ url: URL) {
        guard let link = SharedLink(url) else { return }
        if case .word(let g) = link { translate = g }
        if link == .voice { listen = true }
        pending = link
    }
}
