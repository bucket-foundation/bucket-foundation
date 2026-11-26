import BucketKit
import SwiftUI
import WebKit

enum InputStageCopy {
    static let title = "Before you start"
    static let start = "Start"
    static let done = "Done"
    static let skip = "Skip"
    static let tapHint = "Tap a word you do not know."
    static let showMeaning = "Show meaning"
    static let machine = "machine translation"
    static let play = "Play the clip"
    static let playNote = "Loads the video from YouTube"
    static let unavailable = "The video did not load. Read along below."
    static let fallback = "No video? Read along below."
    static let allKnown = "You know every word here."
    static func rest(_ n: Int) -> String { n == 1 ? "1 more word to tap while you read." : "\(n) more words to tap while you read." }
}

enum InputConfig {
    static var mode: InputMode {
        #if DEBUG
        InputMode.of(Bundle.main.object(forInfoDictionaryKey: "PolingualInputStage") as? String, debug: true)
        #else
        InputMode.of(Bundle.main.object(forInfoDictionaryKey: "PolingualInputStage") as? String, debug: false)
        #endif
    }

    static var base: String {
        let v = Bundle.main.object(forInfoDictionaryKey: "PolingualInputBase") as? String ?? ""
        #if DEBUG
        if let local = Launch.value("-inputBase"), local.hasPrefix("http://127.0.0.1:") || local.hasPrefix("http://localhost:") { return local }
        #endif
        return v.hasPrefix("https://") ? v : "https://polingual.com/input"
    }

    static var bandBase: String? {
        let v = Bundle.main.object(forInfoDictionaryKey: "PolingualInputBandBase") as? String ?? ""
        return v.isEmpty ? nil : v
    }

    static var debug: Bool {
        #if DEBUG
        return true
        #else
        return false
        #endif
    }

    static let repo = InputRepo(dir: FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask)[0].appendingPathComponent("input"), base: base, bandBase: bandBase, debug: debug)

    @MainActor
    static func load(store: LangStore, system: LangSystem, cards: Int) async -> InputPlanState? {
        var mode = mode
        var cards = cards
        #if DEBUG
        if Launch.flag("-inputNow") {
            mode = .demo
            cards = 1
        }
        #endif
        guard mode != .off, let corpus = store.corpus else { return nil }
        let state = store.state(system.id)
        for lang in system.targets {
            let now = Date().timeIntervalSince1970 * 1000
            guard let bundle = await repo.bundle(lang, bands: InputStage.bandsFor(InputStage.knownWords(state, lang: lang, now: now))) else { continue }
            let resolve = InputStage.resolver([lang: InputStage.lemmaCardMap(corpus, lang: lang)])
            let tier = Int(system.placement[lang] ?? 0)
            let freq = InputStage.freqIndex((LangStore.topWords(lang) ?? []).map { ($0.word, Double($0.rank), false) })
            if let p = InputPlanState.plan(mode: mode, lang: lang, bundle: bundle, resolve: resolve, state: state, cards: cards, tier: tier, systemId: system.id, device: LangStore.deviceId, now: now, freq: freq, experiment: InputExperiment.on(Bundle.main.object(forInfoDictionaryKey: "PolingualInputExperiment") as? String)) { return p }
        }
        return nil
    }
}

struct InputStageView: View {
    static let space = "input-viewport"
    let choice: StageChoice
    let lang: String
    let viewport: CGSize
    let gloss: (String) -> String?
    let onFinish: ([ExposureInput], Double) -> Void
    @State private var phase = 0

    var body: some View {
        if phase == 0 {
            GlossCard(choice: choice, gloss: gloss) { phase = 1 }
        } else {
            PlayCard(choice: choice, lang: lang, viewport: viewport, onFinish: onFinish)
        }
    }
}

private struct GlossCard: View {
    let choice: StageChoice
    let gloss: (String) -> String?
    let start: () -> Void

    var body: some View {
        let words = choice.plan.newWords + choice.plan.glossed
        let shown = words.filter { gloss($0) != nil }
        PLCard {
            VStack(alignment: .leading, spacing: PL.Space.s3) {
                Text(InputStageCopy.title).plType(PL.title).foregroundStyle(PL.ink)
                ForEach(shown, id: \.self) { w in
                    HStack(alignment: .firstTextBaseline, spacing: PL.Space.s3) {
                        Text(w).font(.system(size: 18, weight: .semibold)).foregroundStyle(choice.plan.newWords.contains(w) ? PL.vermilion : PL.ink)
                        Text(gloss(w) ?? "").font(.system(size: 16)).foregroundStyle(PL.inkDim)
                    }
                }
                if words.count > shown.count { Text(InputStageCopy.rest(words.count - shown.count)).foregroundStyle(PL.inkDim) }
                if words.isEmpty { Text(InputStageCopy.allKnown).foregroundStyle(PL.inkDim) }
                Button(InputStageCopy.start, action: start).buttonStyle(PLButtonStyle()).accessibilityIdentifier("input-start")
            }
        }
    }
}

private struct RowVisibility: PreferenceKey {
    static let defaultValue: [String: CGRect] = [:]
    static func reduce(value: inout [String: CGRect], nextValue: () -> [String: CGRect]) { value.merge(nextValue()) { $1 } }
}

private struct PlayCard: View {
    let choice: StageChoice
    let lang: String
    let viewport: CGSize
    let onFinish: ([ExposureInput], Double) -> Void
    @Environment(\.scenePhase) private var scenePhase
    @State private var view = Viewing()
    @State private var visible: Set<String> = []
    @State private var playing = false
    @State private var unavailable = false
    @State private var loadVideo = false
    @State private var lastInput = Date()
    @State private var finished = false
    private let tick = Timer.publish(every: 1, on: .main, in: .common).autoconnect()

    var needsPlayer: Bool { choice.items.first?.media != nil }

    func finish(completed: Bool) {
        guard !finished else { return }
        finished = true
        onFinish(InputStage.exposureRows(choice, viewing: view, completed: completed, playerUnavailable: unavailable), view.seenMs.values.reduce(0, +) / 1000)
    }

    var body: some View {
        PLCard {
            VStack(alignment: .leading, spacing: PL.Space.s4) {
                if let m = choice.items.first?.media { video(m) }
                ForEach(choice.items, id: \.id) { item in
                    SentenceRow(item: item, lang: lang, view: $view)
                        .background(GeometryReader { g in Color.clear.preference(key: RowVisibility.self, value: [item.id: g.frame(in: .named(InputStageView.space))]) })
                }
                Text(InputStageCopy.tapHint).foregroundStyle(PL.inkDim)
                Button(InputStageCopy.done) { finish(completed: true) }.buttonStyle(PLButtonStyle()).accessibilityIdentifier("input-done")
                Button(InputStageCopy.skip) {
                    finished = true
                    onFinish([], 0)
                }
                .foregroundStyle(PL.lapis).padding(PL.Space.s2).accessibilityIdentifier("input-skip")
            }
        }
        .simultaneousGesture(TapGesture().onEnded { lastInput = Date() })
        .simultaneousGesture(DragGesture(minimumDistance: 4).onChanged { _ in lastInput = Date() })
        .onPreferenceChange(RowVisibility.self) { frames in
            let screen = CGRect(origin: .zero, size: viewport)
            visible = Set(frames.filter { _, f in f.height > 0 && f.intersection(screen).height / f.height >= 0.6 }.keys)
        }
        .onReceive(tick) { _ in
            let on = Array(visible)
            view = InputStage.present(view, visible: on)
            let idle = Date().timeIntervalSince(lastInput) * 1000 >= SessionMix.idleMs
            let active = scenePhase == .active
            if SessionMix.isActive(visible: active, focused: active, playing: playing, needsPlayer: needsPlayer, idle: idle) {
                view = InputStage.addSeen(view, visible: on, ms: 1000)
            }
        }
        .onChange(of: scenePhase) { _, p in if p == .background { finish(completed: false) } }
        .onDisappear { finish(completed: false) }
    }

    @ViewBuilder func video(_ m: InputMedia) -> some View {
        if !loadVideo || unavailable {
            Button { loadVideo = true } label: {
                VStack(alignment: .leading, spacing: PL.Space.s1) {
                    Text(InputStageCopy.play).font(.system(size: 20, weight: .semibold)).foregroundStyle(PL.ink)
                    Text(unavailable ? InputStageCopy.unavailable : InputStageCopy.playNote).font(.system(size: 13)).foregroundStyle(PL.inkDim)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(PL.Space.s5)
                .background(PL.paper3, in: RoundedRectangle(cornerRadius: PL.Radius.sm))
            }
            .buttonStyle(.plain)
            .accessibilityIdentifier("input-play")
        } else {
            YouTubeClip(media: m, playing: $playing, failed: $unavailable).aspectRatio(16 / 9, contentMode: .fit)
        }
        Text(InputStageCopy.fallback).font(.system(size: 13)).foregroundStyle(PL.inkDim)
    }
}

private struct SentenceRow: View {
    let item: InputItem
    let lang: String
    @Binding var view: Viewing

    var body: some View {
        VStack(alignment: .leading, spacing: PL.Space.s2) {
            FlowLayout(spacing: 2) {
                ForEach(Array(item.tokens.enumerated()), id: \.offset) { _, t in
                    let on = view.taps[item.id]?.contains(t.lemma) == true
                    Button { view = InputStage.toggleTap(view, item: item.id, lemma: t.lemma) } label: {
                        Text(t.surface)
                            .font(.system(size: 20))
                            .foregroundStyle(PL.ink)
                            .padding(.horizontal, 3)
                            .padding(.vertical, 8)
                            .frame(minHeight: 44)
                            .background(on ? PL.ochre : PL.card, in: RoundedRectangle(cornerRadius: 6))
                    }
                    .buttonStyle(.plain)
                    .accessibilityLabel(t.surface)
                    .accessibilityValue(on ? "tapped" : "not tapped")
                }
            }
            .environment(\.layoutDirection, Lang.isRTL(lang) ? .rightToLeft : .leftToRight)
            if let tr = item.translation {
                if view.revealed.contains(item.id) {
                    Text(tr + (item.translationSource == "machine" ? "  · " + InputStageCopy.machine : "")).font(.system(size: 14)).foregroundStyle(PL.inkDim)
                } else {
                    Button(InputStageCopy.showMeaning) { view = InputStage.reveal(view, item: item.id) }
                        .font(.system(size: 13)).foregroundStyle(PL.lapis).buttonStyle(.plain)
                }
            }
        }
    }
}

#if canImport(UIKit)
typealias ClipRepresentable = UIViewRepresentable
#else
typealias ClipRepresentable = NSViewRepresentable
#endif

struct YouTubeClip: ClipRepresentable {
    let media: InputMedia
    @Binding var playing: Bool
    @Binding var failed: Bool

    static func html(_ m: InputMedia) -> String {
        let id = m.videoId.filter { $0.isLetter || $0.isNumber || $0 == "-" || $0 == "_" }
        return """
        <!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body,#p{margin:0;width:100%;height:100%;background:#000}</style></head><body><div id="p"></div>
        <script src="https://www.youtube.com/iframe_api"></script><script>
        function post(m){window.webkit.messageHandlers.clip.postMessage(m)}
        function onYouTubeIframeAPIReady(){new YT.Player('p',{videoId:'\(id)',playerVars:{playsinline:1,rel:0,controls:1,start:\(Int(m.start)),end:\(Int(m.end.rounded(.up)))},events:{onStateChange:function(e){post(e.data===1?'playing':'paused')},onError:function(){post('error')}}})}
        </script></body></html>
        """
    }

    final class Coordinator: NSObject, WKScriptMessageHandler {
        var parent: YouTubeClip
        init(_ p: YouTubeClip) { parent = p }
        func userContentController(_ c: WKUserContentController, didReceive message: WKScriptMessage) {
            switch message.body as? String {
            case "playing": parent.playing = true
            case "error":
                parent.playing = false
                parent.failed = true
            default: parent.playing = false
            }
        }
    }

    func makeCoordinator() -> Coordinator { Coordinator(self) }

    func make(_ context: Context) -> WKWebView {
        let cfg = WKWebViewConfiguration()
        #if canImport(UIKit)
        cfg.allowsInlineMediaPlayback = true
        cfg.mediaTypesRequiringUserActionForPlayback = []
        #endif
        cfg.userContentController.add(context.coordinator, name: "clip")
        let web = WKWebView(frame: .zero, configuration: cfg)
        web.loadHTMLString(Self.html(media), baseURL: URL(string: "https://polingual.com"))
        return web
    }

    static func teardown(_ web: WKWebView) {
        web.configuration.userContentController.removeScriptMessageHandler(forName: "clip")
        web.stopLoading()
    }

    #if canImport(UIKit)
    func makeUIView(context: Context) -> WKWebView { make(context) }
    func updateUIView(_ web: WKWebView, context: Context) { context.coordinator.parent = self }
    static func dismantleUIView(_ web: WKWebView, coordinator: Coordinator) { teardown(web) }
    #else
    func makeNSView(context: Context) -> WKWebView { make(context) }
    func updateNSView(_ web: WKWebView, context: Context) { context.coordinator.parent = self }
    static func dismantleNSView(_ web: WKWebView, coordinator: Coordinator) { teardown(web) }
    #endif
}
