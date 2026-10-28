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

    static let host = "www.bucket.foundation"
    static let app = SharePage(path: "", title: String(localized: "Learn every subject and language together on Bucket"))

    var url: URL {
        var c = URLComponents()
        c.scheme = "https"
        c.host = Self.host
        c.path = "/s" + path
        c.queryItems = items.isEmpty ? nil : items
        return c.url ?? URL(string: "https://\(Self.host)/s")!
    }

    static func clip(_ s: String, _ n: Int) -> String {
        s.count <= n ? s : String(s.prefix(n - 1)) + "…"
    }

    static func word(id: String, gloss: String, forms: [(lang: String, form: String)]) -> SharePage {
        let shown = forms.prefix(6)
        return SharePage(path: "/w", items: [
            URLQueryItem(name: "id", value: id),
            URLQueryItem(name: "g", value: clip(gloss, 60)),
            URLQueryItem(name: "f", value: shown.map { "\($0.lang):\(clip($0.form, 40))" }.joined(separator: "|")),
        ], title: "\(gloss): " + shown.map(\.form).joined(separator: " · "))
    }

    static func word(_ item: LangItem, _ system: LangSystem) -> SharePage {
        word(id: item.id, gloss: item.form(system.root) ?? item.gloss, forms: system.targets.compactMap { l in item.form(l).map { (l, $0) } })
    }

    static func langs(_ system: LangSystem, streak: Int = 0) -> SharePage {
        var items = [URLQueryItem(name: "l", value: system.targets.joined(separator: ".")), URLQueryItem(name: "r", value: system.root)]
        if streak > 1 { items.append(URLQueryItem(name: "s", value: String(streak))) }
        return SharePage(path: "/l", items: items, title: String(localized: "Learning \(system.targets.map(langName).joined(separator: ", ")) together on Bucket"))
    }

    static func deck(_ entry: DeckEntry) -> SharePage {
        SharePage(path: "/d", items: [URLQueryItem(name: "id", value: entry.id), URLQueryItem(name: "t", value: clip(entry.title, 80))], title: entry.title)
    }

    static func atom(_ deck: DeckEntry, _ atom: Atom) -> SharePage {
        SharePage(path: "/a", items: [
            URLQueryItem(name: "d", value: deck.id),
            URLQueryItem(name: "id", value: atom.id),
            URLQueryItem(name: "t", value: clip(atom.title, 80)),
            URLQueryItem(name: "b", value: clip(deck.title, 60)),
            URLQueryItem(name: "q", value: clip(atom.summary, 160)),
        ], title: atom.title)
    }
}

@MainActor
@Observable
final class ScreenShare {
    static let shared = ScreenShare()
    private var stack: [(id: UUID, page: SharePage)] = []
    var current: SharePage { stack.last?.page ?? .app }

    func set(_ id: UUID, _ page: SharePage) {
        if let i = stack.firstIndex(where: { $0.id == id }) { stack[i].page = page } else { stack.append((id, page)) }
    }

    func remove(_ id: UUID) { stack.removeAll { $0.id == id } }

    #if os(iOS)
    private var presenting = false

    func screenshotTaken() {
        guard !presenting, let window = Self.keyWindow, let top = Self.top(window.rootViewController) else { return }
        let page = current
        let shot = UIGraphicsImageRenderer(bounds: window.bounds).image { _ in window.drawHierarchy(in: window.bounds, afterScreenUpdates: false) }
        let sheet = UIActivityViewController(activityItems: [ShareLinkItem(page: page, image: shot)], applicationActivities: nil)
        sheet.popoverPresentationController?.sourceView = top.view
        sheet.popoverPresentationController?.sourceRect = CGRect(x: top.view.bounds.midX, y: top.view.bounds.maxY - 80, width: 1, height: 1)
        sheet.completionWithItemsHandler = { [weak self] type, done, _, _ in
            self?.presenting = false
            Beta.shared.log("screenshot_share", ["path": .string(page.path), "to": .string(type?.rawValue ?? ""), "sent": .string(done ? "1" : "0")])
        }
        presenting = true
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
            .onAppear { ScreenShare.shared.set(id, page) }
            .onChange(of: page) { _, p in ScreenShare.shared.set(id, p) }
            .onDisappear { ScreenShare.shared.remove(id) }
    }
}

extension View {
    func sharePage(_ page: SharePage) -> some View { modifier(SharePageTag(page: page)) }
    func sharePage(_ page: SharePage?) -> some View { modifier(SharePageTag(page: page ?? .app)) }

    func sharesScreenshots() -> some View {
        #if os(iOS)
        onReceive(NotificationCenter.default.publisher(for: UIApplication.userDidTakeScreenshotNotification)) { _ in
            ScreenShare.shared.screenshotTaken()
        }
        #else
        self
        #endif
    }
}

enum SharedLink: Equatable {
    case word(String)
    case langs(root: String, targets: [String])
    case deck(String)
    case atom(deck: String, atom: String)
    case home

    init?(_ url: URL) {
        guard url.host() == SharePage.host || url.host() == "bucket.foundation" || url.scheme == "bucket", let c = URLComponents(url: url, resolvingAgainstBaseURL: false) else { return nil }
        let q = Dictionary((c.queryItems ?? []).compactMap { i in i.value.map { (i.name, $0) } }, uniquingKeysWith: { a, _ in a })
        let parts = c.path.split(separator: "/").map(String.init)
        guard parts.first == "s" else { return nil }
        switch parts.dropFirst().first {
        case "w": self = q["g"].map { .word($0) } ?? .home
        case "l":
            let targets = (q["l"] ?? "").split(separator: ".").map(String.init).filter { !$0.isEmpty }
            self = targets.isEmpty ? .home : .langs(root: q["r"] ?? "en", targets: targets)
        case "d": self = q["id"].map { .deck($0) } ?? .home
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

    func open(_ url: URL) {
        guard let link = SharedLink(url) else { return }
        if case .word(let g) = link { translate = g }
        pending = link
    }
}
