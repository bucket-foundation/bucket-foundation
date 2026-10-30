import BucketKit
import SwiftUI
#if os(iOS)
import AVFoundation
import SafariServices
#endif

@MainActor
final class InApp: NSObject {
    static let shared = InApp()
    private var counter: Task<Void, Never>?

    static func stays(_ url: URL) -> Bool {
        guard let scheme = url.scheme?.lowercased(), scheme == "http" || scheme == "https" else { return false }
        let host = url.host()?.lowercased() ?? ""
        return host != "apps.apple.com" && host != "itunes.apple.com"
    }

    func open(_ url: URL) -> OpenURLAction.Result {
        #if os(iOS)
        guard Self.stays(url), present(url) else { return .systemAction }
        return .handled
        #else
        return .systemAction
        #endif
    }

    func watch(_ query: String, lang: String) {
        RadioPlayer.shared.stop()
        let url = YouTubeResults.search(query, lang: lang)
        #if os(iOS)
        try? AVAudioSession.sharedInstance().setCategory(.playback, mode: .moviePlayback)
        if present(url) {
            counter?.cancel()
            counter = Immersion.shared.counting { true }
            return
        }
        #endif
        _ = open(url)
    }

    #if os(iOS)
    func present(_ url: URL) -> Bool {
        guard let top = Self.top() else { return false }
        let config = SFSafariViewController.Configuration()
        config.entersReaderIfAvailable = false
        let vc = SFSafariViewController(url: url, configuration: config)
        vc.preferredControlTintColor = UIColor(D8.vermilion)
        vc.dismissButtonStyle = .done
        vc.delegate = self
        top.present(vc, animated: true)
        return true
    }

    static func top() -> UIViewController? {
        let scenes = UIApplication.shared.connectedScenes.compactMap { $0 as? UIWindowScene }
        var vc = (scenes.first { $0.activationState == .foregroundActive } ?? scenes.first)?.keyWindow?.rootViewController
        while let next = vc?.presentedViewController, !next.isBeingDismissed { vc = next }
        return vc
    }
    #endif
}

#if os(iOS)
extension InApp: SFSafariViewControllerDelegate {
    nonisolated func safariViewControllerDidFinish(_ controller: SFSafariViewController) {
        Task { @MainActor in
            counter?.cancel()
            counter = nil
        }
    }
}
#endif

extension View {
    func keepsLinksInApp() -> some View {
        environment(\.openURL, OpenURLAction { InApp.shared.open($0) })
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
                if active() && !Task.isCancelled { add(now.timeIntervalSince(last)) }
                last = now
            }
        }
    }
}
