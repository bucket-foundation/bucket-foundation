import BucketKit
import SwiftUI
@preconcurrency import Translation

struct SentenceTranslations: View {
    let text: String
    let source: String
    let targets: [String]
    @State private var results: [String: String] = [:]
    @State private var needsDownload: Set<String> = []
    @State private var missing: Set<String> = []
    @State private var download: TranslationSession.Configuration?
    @State private var round = 0

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            ForEach(Array(targets.enumerated()), id: \.element) { i, l in
                HStack(spacing: 12) {
                    FlagTile(lang: l, size: 28)
                    if let r = results[l] {
                        Text(r).font(.system(size: 18, weight: .bold, design: .rounded)).foregroundStyle(Palette.ink)
                            .environment(\.layoutDirection, Lang.isRTL(l) ? .rightToLeft : .leftToRight)
                            .textSelection(.enabled)
                        Spacer(minLength: 4)
                        PlayButton(text: r, lang: l)
                    } else if needsDownload.contains(l) {
                        Button("Download \(Lang.name(l))") { download = TranslationSession.Configuration(source: language(source), target: language(l)) }
                            .buttonStyle(D8Option(align: .center, compact: true))
                    } else if missing.contains(l) {
                        Text("Translation isn't available for \(Lang.name(l)) on this device.").font(.subheadline).foregroundStyle(Palette.muted)
                    } else {
                        ProgressView()
                    }
                }
                .padding(.horizontal, 14)
                .padding(.vertical, 10)
                .accessibilityElement(children: .combine)
                if i < targets.count - 1 { Divider().overlay(Palette.muted.opacity(0.15)).padding(.leading, 54) }
            }
        }
        .background(Palette.paper, in: .rect(cornerRadius: 16))
        .task(id: "\(source)|\(targets.joined(separator: ","))|\(text)|\(round)") { await run() }
        .translationTask(download) { session in
            try? await session.prepareTranslation()
            download = nil
            round += 1
        }
    }

    func language(_ code: String) -> Locale.Language { Locale.Language(identifier: SentenceLanguage.appleCode(code)) }

    func run() async {
        try? await Task.sleep(for: .milliseconds(700))
        guard !Task.isCancelled else { return }
        let availability = LanguageAvailability()
        var found: [String: String] = [:]
        var download: Set<String> = []
        var missing: Set<String> = []
        for l in targets {
            switch await availability.status(from: language(source), to: language(l)) {
            case .installed:
                let session = TranslationSession(installedSource: language(source), target: language(l))
                if let reply = try? await session.translate(text) { found[l] = reply.targetText } else { missing.insert(l) }
            case .supported:
                download.insert(l)
            default:
                missing.insert(l)
            }
            guard !Task.isCancelled else { return }
        }
        results = found
        needsDownload = download
        self.missing = missing
    }
}
