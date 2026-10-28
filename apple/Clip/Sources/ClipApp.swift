import AVFoundation
import BucketKit
import StoreKit
import SwiftUI

@main
struct BucketClipApp: App {
    @State private var link = ClipLink.launch

    var body: some Scene {
        WindowGroup {
            ClipView(link: link)
                .onContinueUserActivity(NSUserActivityTypeBrowsingWeb) { a in if let u = a.webpageURL { link = ClipLink(u) } }
                .onOpenURL { link = ClipLink($0) }
        }
    }
}

struct ClipLink: Equatable {
    var kind: String
    var q: [String: String]

    static let home = ClipLink(kind: "", q: [:])

    static var launch: ClipLink {
        #if DEBUG
        let args = ProcessInfo.processInfo.arguments
        if let i = args.firstIndex(of: "-clipURL"), i + 1 < args.count, let u = URL(string: args[i + 1]) { return ClipLink(u) }
        #endif
        return home
    }

    init(kind: String, q: [String: String]) {
        self.kind = kind
        self.q = q
    }

    init(_ url: URL) {
        let c = URLComponents(url: url, resolvingAgainstBaseURL: false)
        let parts = (c?.path ?? "").split(separator: "/").map(String.init)
        kind = parts.first == "s" && parts.count > 1 ? parts[1] : ""
        q = Dictionary((c?.queryItems ?? []).compactMap { i in i.value.map { (i.name, $0) } }, uniquingKeysWith: { a, _ in a })
    }

    var forms: [(lang: String, form: String)] {
        (q["f"] ?? "").split(separator: "|").compactMap { pair -> (lang: String, form: String)? in
            let parts = pair.split(separator: ":", maxSplits: 1).map(String.init)
            return parts.count == 2 ? (parts[0], parts[1]) : nil
        }
    }

    var langs: [String] { (q["l"] ?? "").split(separator: ".").map(String.init) }
}

struct ClipFlag: View {
    let lang: String
    var size: CGFloat = 44

    var body: some View {
        FlagFace(flag: D8Flag.of(lang))
            .frame(width: size, height: size)
            .overlay { Shine() }
            .modifier(Glaze(radius: size * 0.23))
            .accessibilityLabel("\(Lang.name(lang)) flag")
    }
}

@MainActor
final class ClipVoice {
    static let shared = ClipVoice()
    private let synth = AVSpeechSynthesizer()

    func speak(_ text: String, _ lang: String) {
        let u = AVSpeechUtterance(string: text)
        u.voice = AVSpeechSynthesisVoice(language: Lang.info[lang]?.bcp47 ?? lang)
        synth.stopSpeaking(at: .immediate)
        synth.speak(u)
    }
}

struct ClipView: View {
    let link: ClipLink
    @State private var overlay = false

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 22) {
                Eyebrow(text: "Bucket")
                content
                Button { overlay = true } label: {
                    Text("Get Bucket").font(.headline).frame(maxWidth: .infinity).padding(.vertical, 14)
                }
                .buttonStyle(.borderedProminent)
                .tint(Palette.green)
                Text("Free on the App Store. Learn every subject and language at your own pace.")
                    .font(.footnote).foregroundStyle(Palette.muted)
            }
            .padding(24)
            .frame(maxWidth: 640, alignment: .leading)
            .frame(maxWidth: .infinity)
        }
        .paper()
        .appStoreOverlay(isPresented: $overlay) { SKOverlay.AppClipConfiguration(position: .bottom) }
        .task { overlay = true }
    }

    @ViewBuilder var content: some View {
        switch link.kind {
        case "w":
            Text(link.q["g"] ?? "").font(.serif(.title, weight: .semibold)).foregroundStyle(Palette.ink)
            ForEach(link.forms, id: \.lang) { w in
                Button { ClipVoice.shared.speak(w.form, w.lang) } label: {
                    HStack(spacing: 14) {
                        ClipFlag(lang: w.lang, size: 48)
                        VStack(alignment: .leading, spacing: 2) {
                            Text(w.form).font(.system(size: 30, weight: .heavy, design: .rounded)).foregroundStyle(Palette.ink)
                            Text(Lang.name(w.lang)).font(.caption).foregroundStyle(Palette.muted)
                        }
                        Spacer()
                        Image(systemName: "speaker.wave.2.fill").foregroundStyle(Palette.green)
                    }
                }
                .buttonStyle(.plain)
            }
        case "l":
            HStack(spacing: 10) { ForEach(link.langs, id: \.self) { ClipFlag(lang: $0, size: 56) } }
            Text("Learning \(link.langs.map(Lang.name).joined(separator: ", ")) together")
                .font(.serif(.title, weight: .semibold)).foregroundStyle(Palette.ink)
            if let s = link.q["s"] { Label("\(s) day streak", systemImage: "flame.fill").font(.headline).foregroundStyle(.orange) }
        case "d":
            Text(link.q["t"] ?? "").font(.serif(.largeTitle, weight: .semibold)).foregroundStyle(Palette.ink)
            Text("A Bucket course with lessons, quizzes and daily review.").font(.serif(.title3)).foregroundStyle(Palette.ink.opacity(0.85))
        case "a":
            if let b = link.q["b"] { Eyebrow(text: b) }
            Text(link.q["t"] ?? "").font(.serif(.largeTitle, weight: .semibold)).foregroundStyle(Palette.ink)
            if let s = link.q["q"] { Text(s).font(.serif(.title3)).foregroundStyle(Palette.ink.opacity(0.85)) }
        default:
            Text("Learn every subject and language together").font(.serif(.largeTitle, weight: .semibold)).foregroundStyle(Palette.ink)
        }
    }
}
