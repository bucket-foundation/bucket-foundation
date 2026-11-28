import BucketKit
import StoreKit
import SwiftUI
#if os(iOS)
import UIKit
#else
import AppKit
#endif

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

    static let gameWinsKey = "feedback.gameWins"
    static let gameWinsBeforeAsk = 3

    static var asksOff: Bool { ProcessInfo.processInfo.arguments.contains("-reviewAskOff") }

    static func quiet(now: Date, last: Double) -> Bool {
        last == 0 || now.timeIntervalSince1970 - last > 60 * 86_400
    }

    static func shouldAsk(streak: Int, graded: Int, correct: Int, now: Date = .now, last: Double) -> Bool {
        let accuracy = Double(correct) / Double(max(graded, 1))
        let strong = graded >= 10 && accuracy >= 0.9
        let milestone = [3, 7, 30].contains(streak) && graded >= 5 && accuracy >= 0.7
        return quiet(now: now, last: last) && (strong || milestone)
    }

    static func isGameWin(stars: Int?) -> Bool { stars == 3 }

    static func shouldAskAfterGame(wins: Int, now: Date = .now, last: Double) -> Bool {
        wins >= gameWinsBeforeAsk && quiet(now: now, last: last)
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
            guard !Feedback.asksOff, Feedback.shouldAsk(streak: streak, graded: graded, correct: correct, last: last) else { return }
            try? await Task.sleep(for: .seconds(1.2))
            last = Date().timeIntervalSince1970
            requestReview()
        }
    }
}

struct AskAfterGameWin: ViewModifier {
    @Environment(\.requestReview) private var requestReview
    @AppStorage(Feedback.lastAskKey) private var last = 0.0
    @AppStorage(Feedback.gameWinsKey) private var wins = 0
    @State private var counted = false
    let stars: Int?

    func body(content: Content) -> some View {
        content.task {
            guard !Feedback.asksOff, !counted, Feedback.isGameWin(stars: stars) else { return }
            counted = true
            wins += 1
            guard Feedback.shouldAskAfterGame(wins: wins, last: last) else { return }
            try? await Task.sleep(for: .seconds(1.5))
            guard !Task.isCancelled else { return }
            last = Date().timeIntervalSince1970
            wins = 0
            requestReview()
        }
    }
}

struct FeedbackLink: View {

    var body: some View {
        MailButton(url: Feedback.mailURL, address: Feedback.address) { Text("Tell us what to improve") }
            .buttonStyle(PlainLink())
    }
}

struct FeedbackSettings: View {
    @Environment(\.openURL) private var openURL

    var body: some View {
        Section {
            Button("Rate \(Feedback.appName) on the App Store") { openURL(Feedback.reviewURL) }
            MailButton(url: Feedback.mailURL, address: Feedback.address) { Text("Send feedback") }
            InviteFriend()
        } header: {
            Eyebrow(text: "Feedback")
        }
    }
}

struct MailButton<Label: View>: View {
    @Environment(\.openURL) private var openURL
    @State private var copied = false
    let url: URL
    let address: String
    @ViewBuilder let label: () -> Label

    var body: some View {
        Button {
            openURL(url) { accepted in
                guard !accepted else { return }
                #if os(iOS)
                UIPasteboard.general.string = address
                #else
                NSPasteboard.general.clearContents()
                NSPasteboard.general.setString(address, forType: .string)
                #endif
                copied = true
            }
        } label: { label() }
        .alert("Email address copied", isPresented: $copied) {
            Button("OK", role: .cancel) {}
        } message: {
            Text("Mail isn't set up on this device. Paste \(address) into any email app.")
        }
    }
}
