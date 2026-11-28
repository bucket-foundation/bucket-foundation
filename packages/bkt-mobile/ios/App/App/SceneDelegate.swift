import UIKit
import Capacitor

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard let windowScene = scene as? UIWindowScene else { return }

        window = UIWindow(windowScene: windowScene)
        window?.rootViewController = BucketBridgeViewController()
        window?.makeKeyAndVisible()

        SceneDelegateProxy.shared.scene(scene, willConnectTo: session, options: connectionOptions)
    }

    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        SceneDelegateProxy.shared.scene(scene, openURLContexts: URLContexts)
    }

    func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
        SceneDelegateProxy.shared.scene(scene, continue: userActivity)
    }
}

final class BucketBridgeViewController: CAPBridgeViewController {
    static let paper = UIColor { traits in
        traits.userInterfaceStyle == .dark
            ? UIColor(red: 0x1F / 255, green: 0x1C / 255, blue: 0x16 / 255, alpha: 1)
            : UIColor(red: 0xEF / 255, green: 0xE8 / 255, blue: 0xD4 / 255, alpha: 1)
    }

    override func capacitorDidLoad() {
        super.capacitorDidLoad()
        guard let web = webView else { return }
        let shell = UIView()
        shell.backgroundColor = Self.paper
        view = shell
        web.translatesAutoresizingMaskIntoConstraints = false
        web.scrollView.contentInsetAdjustmentBehavior = .never
        shell.addSubview(web)
        NSLayoutConstraint.activate([
            web.topAnchor.constraint(equalTo: shell.safeAreaLayoutGuide.topAnchor),
            web.bottomAnchor.constraint(equalTo: shell.bottomAnchor),
            web.leadingAnchor.constraint(equalTo: shell.leadingAnchor),
            web.trailingAnchor.constraint(equalTo: shell.trailingAnchor),
        ])
    }
}
