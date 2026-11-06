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
        VStack(alignment: .leading, spacing: 10) {
            ForEach(targets, id: \.self) { l in
                HStack(spacing: 10) {
                    FlagTile(lang: l, size: 26)
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
                .accessibilityElement(children: .combine)
            }
            WrongTranslationLink(subject: report, visible: !results.isEmpty)
                .frame(maxWidth: .infinity, alignment: .trailing)
        }
        .task(id: "\(source)|\(targets.joined(separator: ","))|\(text)|\(round)") { await run() }
        .translationTask(download) { session in
            try? await session.prepareTranslation()
            download = nil
            round += 1
        }
    }

    var report: ReportSubject? {
        guard !results.isEmpty else { return nil }
        let shown = targets.compactMap { l in results[l].map { "\(l): \($0)" } }.joined(separator: "; ")
        return ReportSubject(lang: source, text: text, shown: shown, context: "translate:sentence")
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
