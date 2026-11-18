import BucketKit
import SwiftUI

#if os(iOS) && canImport(GoogleMobileAds) && canImport(UserMessagingPlatform)
import AppTrackingTransparency
import GoogleMobileAds
import UIKit
import UserMessagingPlatform

@MainActor
@Observable
final class LobbyAds {
    static let shared = LobbyAds()
    let units = LobbyAdUnits.from(Bundle.main.infoDictionary ?? [:])
    var allowed = false
    private(set) var ready = false
    private(set) var privacyOptionsRequired = false
    @ObservationIgnored private var started = false
    @ObservationIgnored private var pacer = InterstitialPacer()
    @ObservationIgnored private var interstitial: InterstitialAd?
    @ObservationIgnored private var loading = false
    @ObservationIgnored private var reward: RewardWatch?
    @ObservationIgnored private var rewarded: RewardedAd?
    @ObservationIgnored private var loadingRewarded = false
    private(set) var rewardedReady = false

    func preloadRewarded() {
        guard allowed, ready, let unit = units?.rewarded, rewarded == nil, !loadingRewarded else { return }
        loadingRewarded = true
        Task {
            rewarded = try? await RewardedAd.load(with: unit, request: Request())
            rewardedReady = rewarded != nil
            loadingRewarded = false
        }
    }

    func showRewarded() async -> AdOutcome {
        guard allowed, ready, let ad = rewarded, let root = Self.topController() else { return .unavailable }
        rewarded = nil
        rewardedReady = false
        let outcome: AdOutcome = await withCheckedContinuation { done in
            let watch = RewardWatch { done.resume(returning: $0) }
            reward = watch
            ad.fullScreenContentDelegate = watch
            ad.present(from: root) { watch.earned = true }
        }
        reward = nil
        preloadRewarded()
        return outcome
    }

    func start() {
        guard allowed, units != nil, !started else { return }
        #if DEBUG
        if ProcessInfo.processInfo.arguments.contains("-adsOff") { return }
        #endif
        started = true
        Task { await gatherConsent() }
    }

    private func gatherConsent() async {
        let consent = ConsentInformation.shared
        try? await consent.requestConsentInfoUpdate(with: RequestParameters())
        if let root = Self.topController() { try? await ConsentForm.loadAndPresentIfRequired(from: root) }
        privacyOptionsRequired = consent.privacyOptionsRequirementStatus == .required
        if ATTrackingManager.trackingAuthorizationStatus == .notDetermined {
            _ = await ATTrackingManager.requestTrackingAuthorization()
        }
        guard consent.canRequestAds else {
            started = false
            return
        }
        _ = await MobileAds.shared.start()
        ready = true
        preload()
        preloadRewarded()
    }

    func showPrivacyOptions() {
        guard let root = Self.topController() else { return }
        Task {
            try? await ConsentForm.presentPrivacyOptionsForm(from: root)
            if !ConsentInformation.shared.canRequestAds {
                ready = false
                rewarded = nil
                rewardedReady = false
            }
        }
    }

    func preload() {
        guard allowed, ready, let units, interstitial == nil, !loading else { return }
        loading = true
        Task {
            interstitial = try? await InterstitialAd.load(with: units.interstitial, request: Request())
            loading = false
        }
    }

    func leftRoom(finishedGame: Bool) {
        guard allowed, ready, pacer.due(finishedGame: finishedGame, at: .now) else { return }
        guard let ad = interstitial, let root = Self.topController() else {
            preload()
            return
        }
        interstitial = nil
        pacer.shown(at: .now)
        ad.present(from: root)
        preload()
    }

    static func topController() -> UIViewController? {
        let scene = UIApplication.shared.connectedScenes.compactMap { $0 as? UIWindowScene }.first { $0.activationState == .foregroundActive }
        var top = scene?.keyWindow?.rootViewController
        while let next = top?.presentedViewController { top = next }
        return top
    }
}

@MainActor
final class RewardWatch: NSObject, @preconcurrency FullScreenContentDelegate {
    var earned = false
    private var finish: ((AdOutcome) -> Void)?

    init(finish: @escaping (AdOutcome) -> Void) { self.finish = finish }

    private func end(_ outcome: AdOutcome) {
        finish?(outcome)
        finish = nil
    }

    func adDidDismissFullScreenContent(_ ad: FullScreenPresentingAd) { end(earned ? .earned : .skipped) }

    func ad(_ ad: FullScreenPresentingAd, didFailToPresentFullScreenContentWithError error: Error) { end(.unavailable) }
}

struct LobbyBanner: View {
    var body: some View {
        if LobbyAds.shared.allowed, LobbyAds.shared.ready, let units = LobbyAds.shared.units {
            GeometryReader { geo in
                BannerRepresentable(unit: units.banner, width: geo.size.width)
            }
            .frame(height: 50)
            .accessibilityIdentifier("lobbyBanner")
        }
    }
}

struct AdPrivacyButton: View {
    var body: some View {
        if LobbyAds.shared.allowed, LobbyAds.shared.privacyOptionsRequired {
            Button("Ad privacy choices") { LobbyAds.shared.showPrivacyOptions() }
                .accessibilityIdentifier("adPrivacyChoices")
        }
    }
}

private struct BannerRepresentable: UIViewRepresentable {
    let unit: String
    let width: CGFloat

    func makeUIView(context: Context) -> BannerView {
        let view = BannerView(adSize: currentOrientationAnchoredAdaptiveBanner(width: max(width, 320)))
        view.adUnitID = unit
        view.rootViewController = LobbyAds.topController()
        view.load(Request())
        return view
    }

    func updateUIView(_ view: BannerView, context: Context) {}
}
#else
@MainActor
final class LobbyAds {
    static let shared = LobbyAds()
    var allowed = false
    func start() {}
    func leftRoom(finishedGame: Bool) {}
    var rewardedReady: Bool { false }
    func preloadRewarded() {}
    func showRewarded() async -> AdOutcome { .unavailable }
}

struct LobbyBanner: View {
    var body: some View { EmptyView() }
}

struct AdPrivacyButton: View {
    var body: some View { EmptyView() }
}
#endif
