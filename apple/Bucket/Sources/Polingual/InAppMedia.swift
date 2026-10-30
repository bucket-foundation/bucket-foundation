import BucketKit
import SwiftUI
import WebKit

@MainActor
@Observable
final class InApp {
    static let shared = InApp()
    var page: WebPage?
    var video: VideoQuery?

    struct WebPage: Identifiable {
        let url: URL
        var id: String { url.absoluteString }
    }

    struct VideoQuery: Identifiable {
        let query: String
        let lang: String
        var id: String { "\(lang):\(query)" }
    }

    static func stays(_ url: URL) -> Bool {
        guard let scheme = url.scheme?.lowercased(), scheme == "http" || scheme == "https" else { return false }
        let host = url.host()?.lowercased() ?? ""
        return !(host == "apps.apple.com" || host == "itunes.apple.com" || host.hasSuffix("bucket.foundation") && url.path.hasPrefix("/join"))
    }

    func open(_ url: URL) -> OpenURLAction.Result {
        guard Self.stays(url) else { return .systemAction }
        page = WebPage(url: url)
        return .handled
    }

    func watch(_ query: String, _ lang: String) {
        RadioPlayer.shared.stop()
        video = VideoQuery(query: query, lang: lang)
    }
}

extension View {
    func keepsLinksInApp() -> some View {
        modifier(InAppLinks())
    }
}

struct InAppLinks: ViewModifier {
    @State private var inApp = InApp.shared

    func body(content: Content) -> some View {
        content
            .environment(\.openURL, OpenURLAction { InApp.shared.open($0) })
            .sheet(item: $inApp.page) { p in BrowserSheet(start: p.url) }
            .sheet(item: $inApp.video) { v in VideoSheet(query: v.query, lang: v.lang) }
    }
}

@MainActor
@Observable
final class WebState {
    var title = ""
    var canGoBack = false
    var url: URL?
    var loading = false
}

enum WebSource: Equatable {
    case url(URL)
    case html(String, base: URL)
}

final class WebCoordinator: NSObject, WKNavigationDelegate, WKUIDelegate {
    let state: WebState
    let followNewWindows: Bool
    var observers: [NSKeyValueObservation] = []
    var lastSource: WebSource?

    init(state: WebState, followNewWindows: Bool) {
        self.state = state
        self.followNewWindows = followNewWindows
    }

    func watch(_ web: WKWebView) {
        observers = [
            web.observe(\.title) { [weak self] w, _ in let t = w.title ?? ""; Task { @MainActor in self?.state.title = t } },
            web.observe(\.canGoBack) { [weak self] w, _ in let b = w.canGoBack; Task { @MainActor in self?.state.canGoBack = b } },
            web.observe(\.url) { [weak self] w, _ in let u = w.url; Task { @MainActor in self?.state.url = u } },
            web.observe(\.isLoading) { [weak self] w, _ in let l = w.isLoading; Task { @MainActor in self?.state.loading = l } },
        ]
    }

    func webView(_ webView: WKWebView, decidePolicyFor action: WKNavigationAction) async -> WKNavigationActionPolicy {
        guard let scheme = action.request.url?.scheme?.lowercased() else { return .allow }
        return ["http", "https", "about", "data", "blob"].contains(scheme) ? .allow : .cancel
    }

    func webView(_ webView: WKWebView, createWebViewWith configuration: WKWebViewConfiguration, for action: WKNavigationAction, windowFeatures: WKWindowFeatures) -> WKWebView? {
        if followNewWindows, let url = action.request.url { webView.load(URLRequest(url: url)) }
        return nil
    }
}

#if os(iOS)
struct WebView: UIViewRepresentable {
    let source: WebSource
    let state: WebState
    var followNewWindows = true
    var web: Binding<WKWebView?>?

    func makeCoordinator() -> WebCoordinator { WebCoordinator(state: state, followNewWindows: followNewWindows) }

    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        config.allowsInlineMediaPlayback = true
        config.mediaTypesRequiringUserActionForPlayback = []
        let w = WKWebView(frame: .zero, configuration: config)
        w.navigationDelegate = context.coordinator
        w.uiDelegate = context.coordinator
        w.allowsBackForwardNavigationGestures = true
        w.isOpaque = false
        w.backgroundColor = .clear
        context.coordinator.watch(w)
        load(w)
        DispatchQueue.main.async { web?.wrappedValue = w }
        return w
    }

    func updateUIView(_ w: WKWebView, context: Context) {
        if context.coordinator.lastSource != source { load(w) }
    }

    func load(_ w: WKWebView) {
        (w.navigationDelegate as? WebCoordinator)?.lastSource = source
        switch source {
        case .url(let u): w.load(URLRequest(url: u))
        case .html(let h, let base): w.loadHTMLString(h, baseURL: base)
        }
    }
}

#endif

struct BrowserSheet: View {
    let start: URL
    @State private var state = WebState()
    @State private var web: WKWebView?
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            Group {
                #if os(iOS)
                WebView(source: .url(start), state: state, web: $web)
                    .ignoresSafeArea(edges: .bottom)
                #else
                Link(start.absoluteString, destination: start)
                #endif
            }
            .overlay(alignment: .top) { if state.loading { ProgressView().progressViewStyle(.linear).tint(D8.vermilion) } }
            .navigationTitle(state.title.isEmpty ? (start.host() ?? "") : state.title)
            .inlineTitle()
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Done") { dismiss() } }
                ToolbarItemGroup(placement: .primaryAction) {
                    Button { web?.goBack() } label: { Image(systemName: "chevron.backward") }
                        .disabled(!state.canGoBack)
                        .accessibilityLabel("Back")
                    ShareLink(item: state.url ?? start) { Image(systemName: "square.and.arrow.up") }
                        .accessibilityLabel("Share")
                }
            }
        }
        .environment(\.openURL, OpenURLAction { _ in .handled })
    }
}

@MainActor
@Observable
final class Immersion {
    static let shared = Immersion()
    private static let key = "content.immersion"
    private(set) var log: ImmersionLog = {
        guard let d = UserDefaults.standard.data(forKey: Immersion.key), let l = try? JSONDecoder().decode(ImmersionLog.self, from: d) else { return ImmersionLog() }
        return l
    }()

    var today: Int { log.minutes(on: .now) }

    func add(_ seconds: Double) {
        log.add(seconds, at: .now)
        if let d = try? JSONEncoder().encode(log) { UserDefaults.standard.set(d, forKey: Self.key) }
    }

    func counting(while active: @escaping @MainActor () -> Bool) -> Task<Void, Never> {
        Task { @MainActor in
            var last = Date()
            while !Task.isCancelled {
                try? await Task.sleep(for: .seconds(15))
                let now = Date()
                if active() { add(now.timeIntervalSince(last)) }
                last = now
            }
        }
    }
}

enum VideoSearch {
    static func find(_ query: String, lang: String) async -> [FoundVideo] {
        var req = URLRequest(url: YouTubeResults.search(query, lang: lang), timeoutInterval: 12)
        req.setValue("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15", forHTTPHeaderField: "User-Agent")
        req.setValue("\(Lang.info[lang]?.bcp47 ?? lang),\(lang);q=0.9", forHTTPHeaderField: "Accept-Language")
        guard let (data, _) = try? await URLSession.shared.data(for: req), let html = String(data: data, encoding: .utf8) else { return [] }
        return YouTubeResults.parse(html)
    }

    static func page(_ v: FoundVideo) -> String {
        """
        <!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1">
        <style>html,body{margin:0;background:#000;height:100%}iframe{position:absolute;inset:0;width:100%;height:100%;border:0}</style></head>
        <body><iframe src="\(v.embed.absoluteString)" referrerpolicy="strict-origin-when-cross-origin" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe></body></html>
        """
    }
}

struct VideoSheet: View {
    let query: String
    let lang: String
    @State private var videos: [FoundVideo] = []
    @State private var current: FoundVideo?
    @State private var searched = false
    @State private var state = WebState()
    @State private var counter: Task<Void, Never>?
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                if let current {
                    #if os(iOS)
                    WebView(source: .html(VideoSearch.page(current), base: URL(string: "https://bucket.foundation")!), state: state, followNewWindows: false)
                        .aspectRatio(16 / 9, contentMode: .fit)
                        .background(.black)
                        .id(current.id)
                    #endif
                    List {
                        Section {
                            Text(current.title).font(.headline).foregroundStyle(Palette.ink)
                        }
                        .listRowBackground(Palette.card)
                        if videos.count > 1 {
                            Section {
                                ForEach(videos.filter { $0 != current }) { v in
                                    Button { self.current = v } label: {
                                        HStack(spacing: 12) {
                                            AsyncImage(url: URL(string: "https://i.ytimg.com/vi/\(v.id)/mqdefault.jpg")) { $0.resizable().scaledToFill() } placeholder: { D8.lapis.opacity(0.2) }
                                                .frame(width: 96, height: 54)
                                                .clipShape(.rect(cornerRadius: 8))
                                            Text(v.title).font(.subheadline.weight(.semibold)).foregroundStyle(Palette.ink).lineLimit(2)
                                        }
                                    }
                                }
                            } header: {
                                Eyebrow(text: String(localized: "More videos"))
                            }
                            .listRowBackground(Palette.card)
                        }
                    }
                    .paper()
                } else if searched {
                    #if os(iOS)
                    WebView(source: .url(YouTubeResults.search(query, lang: lang)), state: state)
                    #endif
                } else {
                    ProgressView().frame(maxWidth: .infinity, maxHeight: .infinity)
                }
            }
            .navigationTitle(query)
            .inlineTitle()
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Done") { dismiss() } }
                ToolbarItem(placement: .primaryAction) {
                    HStack(spacing: 6) {
                        FlagTile(lang: lang, size: 22)
                        Text("\(Immersion.shared.today) min today").font(.caption.weight(.semibold).monospacedDigit()).foregroundStyle(Palette.muted)
                    }
                }
            }
        }
        .task {
            videos = await VideoSearch.find(query, lang: lang)
            current = videos.first
            searched = true
        }
        .onAppear { counter = Immersion.shared.counting { true } }
        .onDisappear { counter?.cancel() }
    }
}
