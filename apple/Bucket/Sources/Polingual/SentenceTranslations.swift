import BucketKit
import SwiftUI
@preconcurrency import Translation

struct SentenceTranslations: View {
    let text: String
    let source: String
    let targets: [String]
    var fallback: [String: String] = [:]
    var soft = Palette.muted
    @State private var results: [String: String] = [:]
    @State private var needsDownload: Set<String> = []
    @State private var missing: Set<String> = []
    @State private var download: TranslationSession.Configuration?
    @State private var round = 0
    @State private var downloading: String?
    @State private var failed: Set<String> = []

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
                    } else if needsDownload.contains(l) || missing.contains(l), let g = fallback[l] {
                        VStack(alignment: .leading, spacing: 6) {
                            Text("Word by word").font(.caption.weight(.semibold)).foregroundStyle(soft)
                            Text(g).font(.system(size: 18, weight: .bold, design: .rounded)).foregroundStyle(Palette.ink)
                                .environment(\.layoutDirection, Lang.isRTL(l) ? .rightToLeft : .leftToRight)
                                .textSelection(.enabled)
                            if needsDownload.contains(l) {
                                if failed.contains(l) {
                                    Text("The \(Lang.name(l)) download didn't finish.").font(.subheadline).foregroundStyle(soft)
                                }
                                Button(failed.contains(l) ? String(localized: "Try the download again") : String(localized: "Download \(Lang.name(l)) for full sentences")) { start(l) }
                                    .buttonStyle(D8Option(align: .center, compact: true))
                            }
                        }
                        Spacer(minLength: 4)
                        PlayButton(text: g, lang: l)
                    } else if needsDownload.contains(l) {
                        VStack(alignment: .leading, spacing: 6) {
                            if failed.contains(l) {
                                Text("The \(Lang.name(l)) download didn't finish.").font(.subheadline).foregroundStyle(soft)
                            }
                            Button(failed.contains(l) ? String(localized: "Try the download again") : String(localized: "Download \(Lang.name(l))")) { start(l) }
                                .buttonStyle(D8Option(align: .center, compact: true))
                        }
                    } else if missing.contains(l) {
                        Text("Translation isn't available for \(Lang.name(l)) on this device.").font(.subheadline).foregroundStyle(soft)
                    } else {
                        ProgressView()
                    }
                }
                .accessibilityElement(children: .combine)
            }
            if targets.contains(where: { fallback[$0] != nil && results[$0] == nil }) {
                TranslateCredit(soft: soft)
            }
        }
        .task(id: "\(source)|\(targets.joined(separator: ","))|\(text)|\(round)") { await run() }
        .translationTask(download) { session in
            let target = downloading
            do {
                try await session.prepareTranslation()
                if let target { failed.remove(target) }
            } catch {
                if let target { failed.insert(target) }
            }
            download = nil
            downloading = nil
            round += 1
        }
    }

    func start(_ l: String) {
        downloading = l
        download = TranslationSession.Configuration(source: language(source), target: language(l))
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
