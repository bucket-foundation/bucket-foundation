import AVFoundation
import BucketKit
import MediaPlayer
import SwiftUI
#if os(iOS)
import UIKit
#endif

@MainActor
@Observable
final class AppAudio: NSObject, AVSpeechSynthesizerDelegate {
    enum Source: Equatable {
        case radio(RadioStation)
        case listen
    }

    static let shared = AppAudio()

    private(set) var source: Source?
    private(set) var paused = false
    private(set) var failedId: String?
    private(set) var queue = ListenQueue(cards: [])

    @ObservationIgnored private var player: AVPlayer?
    @ObservationIgnored private var watch: [Task<Void, Never>] = []
    @ObservationIgnored private var runner: Task<Void, Never>?
    @ObservationIgnored private var clock = PlayClock()
    @ObservationIgnored private let synth = AVSpeechSynthesizer()
    @ObservationIgnored private var spoken: CheckedContinuation<Void, Never>?
    @ObservationIgnored private let silence = AVAudioEngine()
    @ObservationIgnored private let silenceNode = AVAudioPlayerNode()
    @ObservationIgnored private var resumeAfterInterruption = false
    @ObservationIgnored private var commandsReady = false

    var active: Bool { source != nil }
    var playing: String? {
        if case .radio(let s) = source, !paused { return s.id }
        return nil
    }

    var title: String {
        switch source {
        case .radio(let s): s.name
        case .listen: queue.current?.text ?? String(localized: "Listen")
        case nil: String(localized: "Listen")
        }
    }

    var detail: String {
        switch source {
        case .radio(let s): return s.country
        case .listen:
            guard let c = queue.current else { return "" }
            let p = queue.position
            return String(localized: "\(langName(c.lang)) · word \(p.number) of \(p.count)")
        case nil: return String(localized: "Your words, read aloud")
        }
    }

    override private init() {
        super.init()
        synth.delegate = self
        #if os(iOS)
        let center = NotificationCenter.default
        Task { [weak self] in
            for await n in center.notifications(named: AVAudioSession.interruptionNotification) {
                let type = n.userInfo?[AVAudioSessionInterruptionTypeKey] as? UInt
                let options = n.userInfo?[AVAudioSessionInterruptionOptionKey] as? UInt ?? 0
                self?.interrupted(began: type == AVAudioSession.InterruptionType.began.rawValue, resume: AVAudioSession.InterruptionOptions(rawValue: options).contains(.shouldResume))
            }
        }
        Task { [weak self] in
            for await n in center.notifications(named: AVAudioSession.routeChangeNotification) {
                let reason = n.userInfo?[AVAudioSessionRouteChangeReasonKey] as? UInt
                if reason == AVAudioSession.RouteChangeReason.oldDeviceUnavailable.rawValue { self?.pause() }
            }
        }
        #endif
    }

    func toggle(_ s: RadioStation) {
        if case .radio(let now) = source, now.id == s.id {
            paused ? resume() : stop()
            return
        }
        stop()
        guard let url = s.stream else { return }
        hold()
        source = .radio(s)
        failedId = nil
        paused = false
        startRadio(url, id: s.id)
        publish()
    }

    func listen(_ words: [GameWord]) {
        let q = ListenQueue(words: words)
        guard !q.isEmpty else { return }
        stop()
        queue = q
        source = .listen
        paused = false
        hold()
        keepAwake()
        run()
        publish()
        Beta.shared.log("listen_start", ["words": .number(Double(q.cards.count))])
    }

    func togglePause() { paused ? resume() : pause() }

    func pause() {
        guard active, !paused else { return }
        paused = true
        switch source {
        case .radio: player?.pause()
        case .listen:
            runner?.cancel()
            runner = nil
            hushSpeech()
            silenceNode.pause()
        case nil: break
        }
        publish()
    }

    func resume() {
        guard active, paused else { return }
        hold()
        paused = false
        switch source {
        case .radio(let s):
            if let p = player { p.play() } else if let url = s.stream { startRadio(url, id: s.id) }
        case .listen:
            keepAwake()
            run()
        case nil: break
        }
        publish()
    }

    func skip(_ forward: Bool) {
        guard source == .listen else { return }
        let moved = forward ? queue.next() : queue.previous()
        guard moved || !forward else { return }
        runner?.cancel()
        hushSpeech()
        if !paused { run() }
        publish()
    }

    func stop() {
        watch.forEach { $0.cancel() }
        watch = []
        runner?.cancel()
        runner = nil
        hushSpeech()
        player?.pause()
        player = nil
        if silence.isRunning {
            silenceNode.stop()
            silence.stop()
        }
        let had = source != nil
        source = nil
        paused = false
        queue = ListenQueue(cards: [])
        publish()
        #if os(iOS)
        if had { try? AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation) }
        #endif
    }

    private func interrupted(began: Bool, resume shouldResume: Bool) {
        if began {
            resumeAfterInterruption = active && !paused
            pause()
        } else if shouldResume && resumeAfterInterruption {
            resumeAfterInterruption = false
            resume()
        }
    }

    private func hold() {
        #if os(iOS)
        let session = AVAudioSession.sharedInstance()
        try? session.setCategory(.playback, mode: .spokenAudio, options: [])
        try? session.setActive(true)
        #endif
        commands()
    }

    private func startRadio(_ url: URL, id: String) {
        let item = AVPlayerItem(url: url)
        let p = AVPlayer(playerItem: item)
        player = p
        p.play()
        watch.forEach { $0.cancel() }
        watch = [
            Task { [weak self] in
                for await status in item.publisher(for: \.status).values where status == .failed {
                    self?.fail(id)
                    return
                }
            },
            Task { [weak self] in
                for await _ in NotificationCenter.default.notifications(named: AVPlayerItem.failedToPlayToEndTimeNotification, object: item) {
                    self?.fail(id)
                    return
                }
            },
            Task { [weak self] in
                while !Task.isCancelled {
                    try? await Task.sleep(for: .seconds(1))
                    self?.heard()
                }
            },
        ]
    }

    private func heard() {
        guard player?.timeControlStatus == .playing else { return }
        if clock.tick(1, day: dayKey(Date().timeIntervalSince1970 * 1000)) { TodayPlanStore.shared.finish(TodayActivity.listen.id) }
    }

    private func fail(_ id: String) {
        guard case .radio(let s) = source, s.id == id else { return }
        stop()
        failedId = id
    }

    private func run() {
        runner?.cancel()
        runner = Task { [weak self] in
            while let self, !Task.isCancelled {
                for step in self.queue.steps {
                    if Task.isCancelled { return }
                    switch step {
                    case .say(let text, let lang): await self.say(text, lang)
                    case .wait(let s): try? await Task.sleep(for: .seconds(s))
                    }
                }
                if Task.isCancelled { return }
                if self.clock.tick(5, day: dayKey(Date().timeIntervalSince1970 * 1000)) { TodayPlanStore.shared.finish(TodayActivity.listen.id) }
                self.queue.next()
                self.publish()
            }
        }
    }

    private func say(_ text: String, _ lang: String) async {
        if let v = LangVoice.shared.voice(lang) {
            let u = AVSpeechUtterance(string: text)
            u.voice = v
            u.rate = AVSpeechUtteranceDefaultSpeechRate * 0.85
            await withTaskCancellationHandler {
                await withCheckedContinuation { c in
                    spoken?.resume()
                    spoken = c
                    synth.speak(u)
                }
            } onCancel: {
                Task { @MainActor [weak self] in self?.hushSpeech() }
            }
        } else if let store = LangVoice.shared.store, store.hasClip(lang, text) {
            let item = AVPlayerItem(url: store.clipURL(lang, text))
            let p = AVPlayer(playerItem: item)
            player = p
            p.play()
            let ended = Task {
                for await _ in NotificationCenter.default.notifications(named: AVPlayerItem.didPlayToEndTimeNotification, object: item) { return }
            }
            let limit = Task {
                try? await Task.sleep(for: .seconds(6))
                ended.cancel()
            }
            await withTaskCancellationHandler { await ended.value } onCancel: { ended.cancel() }
            limit.cancel()
            p.pause()
            if player === p { player = nil }
        }
    }

    private func hushSpeech() {
        if synth.isSpeaking || synth.isPaused { synth.stopSpeaking(at: .immediate) }
        spoken?.resume()
        spoken = nil
        if source == .listen { player?.pause() }
    }

    nonisolated func speechSynthesizer(_ s: AVSpeechSynthesizer, didFinish utterance: AVSpeechUtterance) {
        Task { @MainActor [weak self] in
            self?.spoken?.resume()
            self?.spoken = nil
        }
    }

    nonisolated func speechSynthesizer(_ s: AVSpeechSynthesizer, didCancel utterance: AVSpeechUtterance) {
        Task { @MainActor [weak self] in
            self?.spoken?.resume()
            self?.spoken = nil
        }
    }

    private func keepAwake() {
        if silence.attachedNodes.contains(silenceNode) == false {
            silence.attach(silenceNode)
            let format = silence.mainMixerNode.outputFormat(forBus: 0)
            silence.connect(silenceNode, to: silence.mainMixerNode, format: format)
        }
        let format = silence.mainMixerNode.outputFormat(forBus: 0)
        guard format.sampleRate > 0, let buf = AVAudioPCMBuffer(pcmFormat: format, frameCapacity: AVAudioFrameCount(format.sampleRate)) else { return }
        buf.frameLength = buf.frameCapacity
        if !silence.isRunning {
            silence.prepare()
            guard (try? silence.start()) != nil else { return }
        }
        silenceNode.scheduleBuffer(buf, at: nil, options: .loops)
        silenceNode.play()
    }

    private func commands() {
        guard !commandsReady else { return }
        commandsReady = true
        let c = MPRemoteCommandCenter.shared()
        c.playCommand.addTarget { _ in
            MainActor.assumeIsolated { AppAudio.shared.resume() }
            return .success
        }
        c.pauseCommand.addTarget { _ in
            MainActor.assumeIsolated { AppAudio.shared.pause() }
            return .success
        }
        c.togglePlayPauseCommand.addTarget { _ in
            MainActor.assumeIsolated { AppAudio.shared.togglePause() }
            return .success
        }
        c.stopCommand.addTarget { _ in
            MainActor.assumeIsolated { AppAudio.shared.stop() }
            return .success
        }
        c.nextTrackCommand.addTarget { _ in
            MainActor.assumeIsolated { AppAudio.shared.skip(true) }
            return .success
        }
        c.previousTrackCommand.addTarget { _ in
            MainActor.assumeIsolated { AppAudio.shared.skip(false) }
            return .success
        }
    }

    private func publish() {
        let c = MPRemoteCommandCenter.shared()
        let listening = source == .listen
        c.nextTrackCommand.isEnabled = listening
        c.previousTrackCommand.isEnabled = listening && queue.hasPrevious
        let center = MPNowPlayingInfoCenter.default()
        guard active else {
            center.nowPlayingInfo = nil
            #if os(macOS)
            center.playbackState = .stopped
            #endif
            return
        }
        var info: [String: Any] = [
            MPMediaItemPropertyTitle: title,
            MPMediaItemPropertyArtist: detail,
            MPMediaItemPropertyAlbumTitle: String(localized: "Listen"),
            MPNowPlayingInfoPropertyPlaybackRate: paused ? 0.0 : 1.0,
        ]
        if case .radio = source { info[MPNowPlayingInfoPropertyIsLiveStream] = true }
        if listening {
            info[MPNowPlayingInfoPropertyPlaybackQueueIndex] = queue.index
            info[MPNowPlayingInfoPropertyPlaybackQueueCount] = queue.cards.count
        }
        if let art = Self.artwork { info[MPMediaItemPropertyArtwork] = art }
        center.nowPlayingInfo = info
        #if os(macOS)
        center.playbackState = paused ? .paused : .playing
        #endif
    }

    private static let artwork: MPMediaItemArtwork? = {
        #if os(iOS)
        let icons = Bundle.main.infoDictionary?["CFBundleIcons"] as? [String: Any]
        let primary = icons?["CFBundlePrimaryIcon"] as? [String: Any]
        let names = (primary?["CFBundleIconFiles"] as? [String]) ?? []
        let name = names.last ?? (primary?["CFBundleIconName"] as? String) ?? "AppIcon"
        guard let image = UIImage(named: name) else { return nil }
        return MPMediaItemArtwork(boundsSize: image.size) { _ in image }
        #else
        guard let image = NSApplication.shared.applicationIconImage else { return nil }
        return MPMediaItemArtwork(boundsSize: image.size) { _ in image }
        #endif
    }()
}

struct MiniPlayer: View {
    @Environment(LangStore.self) private var langs
    @State private var audio = AppAudio.shared

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: symbol)
                .font(.title3)
                .foregroundStyle(D8.vermilion)
                .frame(width: 28)
                .accessibilityHidden(true)
            VStack(alignment: .leading, spacing: 1) {
                Text(audio.title).font(.subheadline.weight(.semibold)).lineLimit(1)
                Text(audio.detail).font(.caption).foregroundStyle(.secondary).lineLimit(1)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .accessibilityElement(children: .combine)
            if audio.active {
                if audio.source == .listen {
                    Button { audio.skip(false) } label: { Image(systemName: "backward.fill") }
                        .disabled(!audio.queue.hasPrevious)
                        .accessibilityLabel(Text("Previous word"))
                }
                Button { audio.togglePause() } label: { Image(systemName: audio.paused ? "play.fill" : "pause.fill") }
                    .accessibilityLabel(Text(audio.paused ? "Play" : "Pause"))
                if audio.source == .listen {
                    Button { audio.skip(true) } label: { Image(systemName: "forward.fill") }
                        .accessibilityLabel(Text("Next word"))
                }
                Button { audio.stop() } label: { Image(systemName: "stop.fill") }
                    .accessibilityLabel(Text("Stop"))
            } else {
                Button { audio.listen(langs.gameWords) } label: { Image(systemName: "play.fill") }
                    .disabled(langs.gameWords.isEmpty)
                    .accessibilityLabel(Text("Listen hands-free"))
            }
        }
        .buttonStyle(.borderless)
        .font(.body)
        .padding(.horizontal, 16)
        .accessibilityIdentifier("miniPlayer")
    }

    var symbol: String {
        switch audio.source {
        case .radio: "dot.radiowaves.left.and.right"
        case .listen: "headphones"
        case nil: "headphones"
        }
    }
}

struct ListenTile: View {
    @Environment(LangStore.self) private var langs
    @State private var audio = AppAudio.shared

    var body: some View {
        let on = audio.source == .listen
        LearnTile(title: String(localized: "Listen hands-free"), detail: on ? audio.title : String(localized: "Word, meaning, next word. Keeps playing with the screen locked."), face: on ? D8.vermilion : D8.vermilion.opacity(0.85), open: { on ? audio.stop() : audio.listen(langs.gameWords) }) {
            LearnSymbol(name: on ? "stop.fill" : "headphones")
        }
        .accessibilityLabel(Text(on ? "Stop listening" : "Listen hands-free"))
    }
}

struct AudioAccessory: ViewModifier {
    @Environment(LangStore.self) private var langs
    @State private var audio = AppAudio.shared

    func body(content: Content) -> some View {
        #if os(iOS)
        if #available(iOS 26.1, *) {
            content.tabViewBottomAccessory(isEnabled: audio.active || !langs.gameWords.isEmpty) { MiniPlayer() }
        } else {
            content.tabViewBottomAccessory { MiniPlayer() }
        }
        #else
        content.safeAreaInset(edge: .bottom) {
            MiniPlayer().padding(.vertical, 8).background(.bar)
        }
        #endif
    }
}

extension View {
    func audioAccessory() -> some View { modifier(AudioAccessory()) }
}
