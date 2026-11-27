import BucketKit
import SwiftUI

func tapText(_ text: String, _ lang: String, color: Color = PL.ink) -> AttributedString {
    var out = WordTaps.attributed(text, lang: lang)
    for range in out.runs.filter({ $0.link != nil }).map(\.range) {
        out[range].foregroundColor = color
    }
    return out
}

struct PhraseWords: View {
    let text: String
    let lang: String

    var body: some View {
        if WordTaps.words(text).count > 1 {
            Text(tapText(text, lang))
                .font(PL.script(18, .semibold))
                .multilineTextAlignment(.center)
                .frame(maxWidth: .infinity)
                .environment(\.layoutDirection, Lang.isRTL(lang) ? .rightToLeft : .leftToRight)
        }
    }
}

extension EnvironmentValues {
    @Entry var wordTapsHosted = false
}

extension View {
    func wordTaps(reveal: Bool) -> some View { modifier(WordTapHost(reveal: reveal)) }
}

struct WordTapHost: ViewModifier {
    let reveal: Bool
    @Environment(LangStore.self) private var store: LangStore?
    @State private var shown: WordDetail?

    func body(content: Content) -> some View {
        content
            .environment(\.openURL, OpenURLAction { url in
                guard let p = WordTaps.parse(url) else { return .systemAction }
                if !LangListener.shared.active { LangVoice.shared.speak(p.word, p.lang) }
                shown = WordLookup.detail(p.word, lang: p.lang, corpus: store?.corpus, top: LangStore.topWords(p.lang) ?? [], root: store?.playRoot ?? "en")
                return .handled
            })
            .environment(\.wordTapsHosted, true)
            .sheet(item: $shown) { d in
                WordCard(detail: d, reveal: reveal)
                    .presentationDetents([.height(260)])
                    .presentationBackgroundInteraction(.enabled)
                    .presentationBackground(PL.card)
            }
    }
}

struct WordCard: View {
    static let stripCount = 6
    let detail: WordDetail
    let reveal: Bool
    @Environment(LangStore.self) private var store: LangStore?
    @State private var full = false
    @State private var web = WordWeb.empty

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 8) {
                HStack(spacing: 10) {
                    FlagTile(lang: detail.lang, size: 30)
                    Text(detail.word).font(D8.word(26)).foregroundStyle(PL.ink).lineLimit(1).minimumScaleFactor(0.5)
                    Spacer(minLength: 0)
                    PlayButton(text: detail.word, lang: detail.lang)
                }
                .environment(\.layoutDirection, Lang.isRTL(detail.lang) ? .rightToLeft : .leftToRight)
                if let r = readingText(detail.reading) { Text(r).font(PL.text(15)).foregroundStyle(PL.inkDim) }
                switch detail.cardLine(reveal: reveal) {
                case .meaning(let gloss):
                    HStack(alignment: .firstTextBaseline, spacing: 6) {
                        Text(langName(detail.rootLang).uppercased()).font(PL.text(11).monospaced()).foregroundStyle(PL.inkDim).accessibilityLabel("\(langName(detail.rootLang)) meaning")
                        Text(gloss).font(PL.text(17)).foregroundStyle(PL.ink)
                    }
                case .afterAnswer:
                    Text("The meaning shows after you answer.").font(PL.text(15)).foregroundStyle(PL.inkDim)
                case .noEntry:
                    Text("No entry for this word yet.").font(PL.text(15)).foregroundStyle(PL.inkDim)
                }
                if reveal {
                    strip
                    HStack {
                        Button("Full detail") { full = true }.buttonStyle(.borderless)
                        Spacer(minLength: 8)
                        WrongTranslationLink(subject: detail.gloss.map { ReportSubject(lang: detail.lang, itemId: detail.itemId, text: detail.word, shown: $0, context: "word:tap") })
                    }
                }
            }
            .padding(20)
            .frame(maxWidth: .infinity, alignment: .topLeading)
        }
        .scrollBounceBehavior(.basedOnSize)
        .task(id: detail) {
            guard reveal else { return }
            await WordWebLoader.load(detail, mine: store?.gameLangs ?? [], corpus: store?.corpus, all: false) { web = $0 }
        }
        .sheet(isPresented: $full) {
            NavigationStack {
                WordFactsView(detail: detail)
                    .toolbar {
                        ToolbarItem(placement: .confirmationAction) {
                            Button("Done") { full = false }
                        }
                    }
            }
        }
    }

    @ViewBuilder var strip: some View {
        let forms = web.forms.prefix(Self.stripCount)
        if !forms.isEmpty {
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 12) {
                    ForEach(Array(forms)) { f in
                        HStack(spacing: 4) {
                            FlagTile(lang: f.lang, size: 18)
                            Text(f.word).font(PL.text(15)).foregroundStyle(PL.ink).lineLimit(1)
                        }
                        .accessibilityElement(children: .combine)
                        .accessibilityLabel("\(Lang.name(f.lang)): \(f.word)")
                    }
                }
            }
            .accessibilityIdentifier("word-strip")
        }
    }
}
