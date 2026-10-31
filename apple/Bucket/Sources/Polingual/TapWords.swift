import BucketKit
import SwiftUI

func tapText(_ text: String, _ lang: String, color: Color = Palette.ink) -> AttributedString {
    var out = AttributedString(text)
    for (word, range) in WordTaps.words(text) {
        guard let lower = AttributedString.Index(range.lowerBound, within: out),
              let upper = AttributedString.Index(range.upperBound, within: out),
              let url = WordTaps.link(lang: lang, word: word) else { continue }
        out[lower..<upper].link = url
        out[lower..<upper].foregroundColor = color
    }
    return out
}

struct PhraseWords: View {
    let text: String
    let lang: String

    var body: some View {
        if WordTaps.words(text).count > 1 {
            Text(tapText(text, lang))
                .font(.system(size: 18, weight: .semibold, design: .rounded))
                .multilineTextAlignment(.center)
                .frame(maxWidth: .infinity)
                .environment(\.layoutDirection, Lang.isRTL(lang) ? .rightToLeft : .leftToRight)
        }
    }
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
                LangVoice.shared.speak(p.word, p.lang)
                shown = WordLookup.detail(p.word, lang: p.lang, corpus: store?.corpus, top: LangStore.topWords(p.lang) ?? [])
                return .handled
            })
            .sheet(item: $shown) { d in
                WordCard(detail: d, reveal: reveal)
                    .presentationDetents([.height(190)])
                    .presentationBackgroundInteraction(.enabled)
                    .presentationBackground(Palette.card)
            }
    }
}

struct WordCard: View {
    let detail: WordDetail
    let reveal: Bool

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(spacing: 10) {
                FlagTile(lang: detail.lang, size: 30)
                Text(detail.word).font(D8.word(26)).foregroundStyle(D8.ink).lineLimit(1).minimumScaleFactor(0.5)
                Spacer(minLength: 0)
                PlayButton(text: detail.word, lang: detail.lang)
            }
            .environment(\.layoutDirection, Lang.isRTL(detail.lang) ? .rightToLeft : .leftToRight)
            if let r = readingText(detail.reading) { Text(r).font(.subheadline).foregroundStyle(D8.ipa) }
            if let g = detail.gloss {
                if reveal {
                    Text(g).font(.body).foregroundStyle(Palette.ink).lineLimit(2)
                } else {
                    Text("The meaning shows after you answer.").font(.subheadline).foregroundStyle(Palette.muted)
                }
            }
        }
        .padding(20)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    }
}
