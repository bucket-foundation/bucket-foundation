import BucketKit
import SwiftUI

enum WantedWords {
    static func key(_ systemId: String) -> String { "wanted.\(systemId)" }

    static func list(_ systemId: String) -> [String] { UserDefaults.standard.stringArray(forKey: key(systemId)) ?? [] }

    static func add(_ itemId: String, to systemId: String) {
        let now = list(systemId)
        guard !now.contains(itemId) else { return }
        UserDefaults.standard.set(Array((now + [itemId]).suffix(40)), forKey: key(systemId))
    }

    static func take(_ systemId: String, carded: (String) -> Bool, limit: Int = 2) -> [String] {
        let pending = list(systemId).filter { !carded($0) }
        let picked = Array(pending.prefix(limit))
        UserDefaults.standard.set(Array(pending.dropFirst(limit)), forKey: key(systemId))
        return picked
    }
}

struct TranslateCard: View {
    @Environment(LangStore.self) private var store
    @State private var query = TranslateCard.debugQuery
    @State private var picked: String?
    @State private var added: Set<String> = []
    @FocusState private var focused: Bool

    static var debugQuery: String {
        #if DEBUG
        let args = ProcessInfo.processInfo.arguments
        if let i = args.firstIndex(of: "-translate"), i + 1 < args.count { return args[i + 1] }
        #endif
        return ""
    }

    var langs: [String] {
        var out: [String] = []
        for s in store.systems {
            for l in [s.root] + s.targets where !out.contains(l) { out.append(l) }
        }
        return out
    }

    var body: some View {
        if let corpus = store.corpus, !store.systems.isEmpty {
            let hits = translateSearch(corpus, query, langs: Set(langs), limit: 6)
            VStack(alignment: .leading, spacing: 12) {
                HStack(spacing: 10) {
                    Image(systemName: "character.bubble.fill").foregroundStyle(D8.lapis)
                    TextField("Translate a word", text: $query)
                        .font(.system(size: 17, weight: .semibold, design: .rounded))
                        .autocorrectionDisabled()
                        .submitLabel(.search)
                        .focused($focused)
                        .onSubmit { if let id = picked ?? hits.first?.itemId { add(id, corpus) } }
                    if !query.isEmpty {
                        Button { query = "" } label: { Image(systemName: "xmark.circle.fill").foregroundStyle(Palette.muted) }
                            .buttonStyle(.borderless)
                            .accessibilityLabel("Clear")
                    }
                }
                .padding(.horizontal, 14)
                .frame(minHeight: 48)
                .background(.white, in: .rect(cornerRadius: 12))
                .overlay { RoundedRectangle(cornerRadius: 12).strokeBorder(D8.keyline, lineWidth: 2) }
                if !query.isEmpty {
                    if let id = picked ?? hits.first?.itemId, let item = corpus.byId[id] {
                        ForEach(langs, id: \.self) { l in
                            if let f = item.form(l) {
                                HStack(spacing: 10) {
                                    FlagTile(lang: l, size: 26)
                                    Text(f).font(.system(size: 18, weight: .bold, design: .rounded)).foregroundStyle(D8.ink)
                                        .environment(\.layoutDirection, Lang.isRTL(l) ? .rightToLeft : .leftToRight)
                                    Spacer(minLength: 4)
                                    PlayButton(text: f, lang: l)
                                }
                                .accessibilityElement(children: .combine)
                            }
                        }
                        if added.contains(id) {
                            Label("Added to your next session", systemImage: "checkmark.circle.fill")
                                .font(.subheadline.weight(.semibold))
                                .foregroundStyle(D8.malachite)
                        } else {
                            Button("Add to my deck") { add(id, corpus) }
                                .buttonStyle(D8Option(align: .center, compact: true))
                        }
                        let shown = Set(langs.compactMap { item.form($0).map(foldForSearch) })
                        let similar = hits.filter { h in h.itemId != id && !shown.contains(foldForSearch(corpus.byId[h.itemId]?.form(h.matchedLang) ?? "")) }
                        if !similar.isEmpty {
                            Text("Similar").font(.caption.weight(.semibold)).foregroundStyle(Palette.muted)
                            ScrollView(.horizontal, showsIndicators: false) {
                                HStack(spacing: 8) {
                                    ForEach(similar, id: \.itemId) { h in
                                        if let f = corpus.byId[h.itemId]?.form(h.matchedLang) {
                                            Chip(title: f, langs: [h.matchedLang], on: false) { picked = h.itemId }
                                        }
                                    }
                                }
                            }
                        }
                    } else {
                        Text("Not in your languages yet. Try the word in another language you know.")
                            .font(.subheadline)
                            .foregroundStyle(Palette.muted)
                    }
                }
            }
            .padding(.vertical, 6)
            .onChange(of: query) { picked = nil }
        }
    }

    func add(_ itemId: String, _ corpus: LangCorpus) {
        guard let item = corpus.byId[itemId] else { return }
        for s in store.systems where s.targets.contains(where: { item.form($0) != nil }) {
            let state = store.state(s.id)
            let carded = s.targets.contains { state.cards.has(cardId($0, itemId)) }
            if !carded { WantedWords.add(itemId, to: s.id) }
        }
        added.insert(itemId)
        haptic(true)
    }
}
