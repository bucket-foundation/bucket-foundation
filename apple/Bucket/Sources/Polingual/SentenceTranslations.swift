import BucketKit
import SwiftUI
@preconcurrency import Translation

struct SentenceTranslations: View {
    let text: String
    let source: String
    let targets: [String]
    @State private var results: [String: String] = [:]
    @State private var missing: Set<String> = []
    @State private var queue: [String] = []
    @State private var config: TranslationSession.Configuration?

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            ForEach(targets, id: \.self) { l in
                HStack(spacing: 10) {
                    FlagTile(lang: l, size: 26)
                    if let r = results[l] {
                        Text(r).font(.system(size: 18, weight: .bold, design: .rounded)).foregroundStyle(D8.ink)
                            .environment(\.layoutDirection, Lang.isRTL(l) ? .rightToLeft : .leftToRight)
                            .textSelection(.enabled)
                        Spacer(minLength: 4)
                        PlayButton(text: r, lang: l)
                    } else if missing.contains(l) {
                        Text("Translation isn't available for \(Lang.name(l)) on this device.").font(.subheadline).foregroundStyle(Palette.muted)
                    } else {
                        ProgressView()
                    }
                }
                .accessibilityElement(children: .combine)
            }
        }
        .task(id: "\(source)|\(targets.joined(separator: ","))|\(text)") { await start() }
        .translationTask(config) { session in
            guard let l = queue.first else { return }
            do {
                let reply = try await session.translate(text)
                results[l] = reply.targetText
            } catch {
                missing.insert(l)
            }
            queue.removeFirst()
            next()
        }
    }

    func start() async {
        try? await Task.sleep(for: .milliseconds(450))
        guard !Task.isCancelled else { return }
        results = [:]
        missing = []
        let availability = LanguageAvailability()
        let from = Locale.Language(identifier: SentenceLanguage.appleCode(source))
        var todo: [String] = []
        for l in targets {
            let status = await availability.status(from: from, to: Locale.Language(identifier: SentenceLanguage.appleCode(l)))
            if status == .unsupported { missing.insert(l) } else { todo.append(l) }
        }
        queue = todo
        config = nil
        next()
    }

    func next() {
        guard let l = queue.first else { return }
        config = TranslationSession.Configuration(source: Locale.Language(identifier: SentenceLanguage.appleCode(source)), target: Locale.Language(identifier: SentenceLanguage.appleCode(l)))
    }
}
