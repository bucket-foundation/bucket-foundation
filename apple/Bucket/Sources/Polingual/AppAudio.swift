import AVFoundation
import BucketKit
import MediaPlayer
import os
import SwiftUI
#if os(iOS)
import UIKit
#endif

@MainActor
@Observable
final class AppAudio {
    enum Source: Equatable {
        case radio(RadioStation)
    }

    static let shared = AppAudio()

    private(set) var source: Source?
    private(set) var paused = false
    private(set) var failedId: String?

    @ObservationIgnored private var player: AVPlayer?
    @ObservationIgnored private var watch: [Task<Void, Never>] = []
    @ObservationIgnored private var clock = PlayClock()
    @ObservationIgnored private let log = Logger(subsystem: "foundation.bucket", category: "audio")
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
        case nil: String(localized: "Live radio")
        }
    }

    var detail: String {
        switch source {
        case .radio(let s): return s.country
        case nil: return ""
        }
    }

    private init() {
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
        Task { [weak self] in
            for await _ in center.notifications(named: AVAudioSession.mediaServicesWereResetNotification) { self?.rebuild() }
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

    func togglePause() { paused ? resume() : pause() }

    func pause() {
        guard active, !paused else { return }
        paused = true
        switch source {
        case .radio: player?.pause()
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
        case nil: break
        }
        publish()
    }

    func stop() {
        watch.forEach { $0.cancel() }
        watch = []
        player?.pause()
        player = nil
        let had = source != nil
        source = nil
        paused = false
        publish()
        #if os(iOS)
        if had && !LangVoice.shared.synth.isSpeaking {
            do { try AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation) } catch { log.error("session release failed: \(error.localizedDescription)") }
        }
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

    func hold() {
        #if os(iOS)
        let session = AVAudioSession.sharedInstance()
        do {
            try session.setCategory(.playback, mode: .spokenAudio, options: [])
            try session.setActive(true)
        } catch {
            log.error("session hold failed: \(error.localizedDescription)")
        }
        #endif
        commands()
    }

    private func rebuild() {
        player = nil
        guard let source else { return }
        hold()
        guard !paused else { return }
        switch source {
        case .radio(let s): if let url = s.stream { startRadio(url, id: s.id) }
        }
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

    private func commands() {
        guard !commandsReady else { return }
        commandsReady = true
        let c = MPRemoteCommandCenter.shared()
        c.playCommand.addTarget { _ in
            Task { @MainActor in AppAudio.shared.resume() }
            return .success
        }
        c.pauseCommand.addTarget { _ in
            Task { @MainActor in AppAudio.shared.pause() }
            return .success
        }
        c.togglePlayPauseCommand.addTarget { _ in
            Task { @MainActor in AppAudio.shared.togglePause() }
            return .success
        }
        c.stopCommand.addTarget { _ in
            Task { @MainActor in AppAudio.shared.stop() }
            return .success
        }
        c.nextTrackCommand.isEnabled = false
        c.previousTrackCommand.isEnabled = false
    }

    private func publish() {
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
            MPMediaItemPropertyAlbumTitle: String(localized: "Live radio"),
            MPNowPlayingInfoPropertyPlaybackRate: paused ? 0.0 : 1.0,
        ]
        info[MPNowPlayingInfoPropertyIsLiveStream] = true
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
    @State private var audio = AppAudio.shared

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: "dot.radiowaves.left.and.right")
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
                Button { audio.togglePause() } label: { Image(systemName: audio.paused ? "play.fill" : "pause.fill") }
                    .accessibilityLabel(Text(audio.paused ? "Play" : "Pause"))
                Button { audio.stop() } label: { Image(systemName: "stop.fill") }
                    .accessibilityLabel(Text("Stop"))
            }
        }
        .buttonStyle(.borderless)
        .font(.body)
        .padding(.horizontal, 16)
        .accessibilityIdentifier("miniPlayer")
    }
}

struct AudioAccessory: ViewModifier {
    @State private var audio = AppAudio.shared

    func body(content: Content) -> some View {
        #if os(iOS)
        if #available(iOS 26.1, *) {
            content.tabViewBottomAccessory(isEnabled: audio.active) { MiniPlayer() }
        } else {
            content.tabViewBottomAccessory { MiniPlayer() }
        }
        #else
        content.safeAreaInset(edge: .bottom) {
            MiniPlayer().padding(.vertical, 8).background(.bar).opacity(audio.active ? 1 : 0).frame(height: audio.active ? nil : 0)
        }
        #endif
    }
}

extension View {
    func audioAccessory() -> some View { modifier(AudioAccessory()) }
}

extension Array {
    subscript(safe i: Int) -> Element? { indices.contains(i) ? self[i] : nil }
}
