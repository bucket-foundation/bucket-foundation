import BucketKit
import SwiftUI

#if os(iOS) && canImport(GoogleMobileAds)
import GoogleMobileAds
import UIKit

@MainActor
final class LobbyAds {
    static let shared = LobbyAds()
    let units = LobbyAdUnits.from(Bundle.main.infoDictionary ?? [:])
    private var started = false
    private var pacer = InterstitialPacer()
    private var interstitial: InterstitialAd?
    private var loading = false

    func start() {
        guard units != nil, !started else { return }
        started = true
        MobileAds.shared.start(completionHandler: nil)
        preload()
    }

    func preload() {
        guard let units, interstitial == nil, !loading else { return }
        loading = true
        Task {
            interstitial = try? await InterstitialAd.load(with: units.interstitial, request: Request())
            loading = false
        }
    }

    func leftRoom(finishedGame: Bool) {
        guard units != nil, pacer.due(finishedGame: finishedGame, at: .now) else { return }
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

struct LobbyBanner: View {
    var body: some View {
        if let units = LobbyAds.shared.units {
            GeometryReader { geo in
                BannerRepresentable(unit: units.banner, width: geo.size.width)
            }
            .frame(height: 50)
            .accessibilityIdentifier("lobbyBanner")
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
    func start() {}
    func leftRoom(finishedGame: Bool) {}
}

struct LobbyBanner: View {
    var body: some View { EmptyView() }
}
#endif
