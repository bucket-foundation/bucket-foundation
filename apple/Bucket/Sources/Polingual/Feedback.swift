import BucketKit
import StoreKit
import SwiftUI

enum Feedback {
    static var isPolingual: Bool { BucketAPI.appName == "polingual" }
    static var appID: String { isPolingual ? "6825177856" : "6825123451" }
    static var appName: String { isPolingual ? "Polingual" : "Bucket" }
    static var address: String { isPolingual ? "support@polingual.com" : "gian@bucket.foundation" }
    static var reviewURL: URL { URL(string: "https://apps.apple.com/app/id\(appID)?action=write-review")! }

    static var mailURL: URL {
        let version = Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? ""
        let build = Bundle.main.object(forInfoDictionaryKey: "CFBundleVersion") as? String ?? ""
        #if os(iOS)
        let device = "\(UIDevice.current.model) iOS \(UIDevice.current.systemVersion)"
        #else
        let device = "Mac"
        #endif
        var c = URLComponents()
        c.scheme = "mailto"
        c.path = address
        c.queryItems = [
            URLQueryItem(name: "subject", value: "\(appName) feedback"),
            URLQueryItem(name: "body", value: "\n\n\(appName) \(version) (\(build)), \(device)"),
        ]
        return c.url!
    }

    static let lastAskKey = "feedback.lastReviewAsk"

    static func shouldAsk(streak: Int, graded: Int, correct: Int, now: Date = .now, last: Double) -> Bool {
        let quiet = last == 0 || now.timeIntervalSince1970 - last > 60 * 86_400
        let strong = graded >= 10 && Double(correct) / Double(max(graded, 1)) >= 0.9
        return quiet && (strong || [3, 7, 30].contains(streak))
    }
}

struct AskForReview: ViewModifier {
    @Environment(\.requestReview) private var requestReview
    @AppStorage(Feedback.lastAskKey) private var last = 0.0
    let streak: Int
    let graded: Int
    let correct: Int

    func body(content: Content) -> some View {
        content.task {
            guard Feedback.shouldAsk(streak: streak, graded: graded, correct: correct, last: last) else { return }
            try? await Task.sleep(for: .seconds(1.2))
            last = Date().timeIntervalSince1970
            requestReview()
        }
    }
}

struct FeedbackLink: View {
    @Environment(\.openURL) private var openURL

    var body: some View {
        Button("Tell us what to improve") { openURL(Feedback.mailURL) }
            .buttonStyle(PlainLink())
    }
}

struct FeedbackSettings: View {
    @Environment(\.openURL) private var openURL

    var body: some View {
        Section {
            Button("Rate \(Feedback.appName) on the App Store") { openURL(Feedback.reviewURL) }
            Button("Send feedback") { openURL(Feedback.mailURL) }
        } header: {
            Eyebrow(text: "Feedback")
        }
    }
}
