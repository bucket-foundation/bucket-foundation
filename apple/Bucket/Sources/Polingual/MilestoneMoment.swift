import BucketKit
import SwiftUI

struct MilestoneMoment: View {
    @Environment(\.dismiss) private var dismiss
    let milestone: Milestone
    let root: String
    let langs: [String]
    var mastered: [ShareObject] = []
    var words: [MasteredWord] = []
    var hellos: [ShareForm] = []
    @State private var shown = false

    var title: String {
        switch milestone.kind {
        case .mastered(_, 1): String(localized: "First word mastered")
        case .mastered(_, let count): String(localized: "\(count) words mastered")
        case .streak(let days): dayStreak(days)
        case .skill(let skill, _): skill.title
        case .hello(let langs): String(localized: "Hello in \(langs.count) languages")
        }
    }

    var detail: String {
        switch milestone.kind {
        case .skill(.sentence, let lang): words.first?.form ?? String(localized: "in \(langName(lang))")
        case .mastered(let lang, _), .skill(_, let lang): String(localized: "in \(langName(lang))")
        case .streak: String(localized: "Keep it going.")
        case .hello: hellos.map(\.form).joined(separator: " · ")
        }
    }

    var objects: [ShareObject] {
        switch milestone.kind {
        case .mastered(let lang, let count): mastered.isEmpty ? [.mastered(lang: lang, count: count, root: root)] : mastered
        case .streak(let days): [.streak(days: days, langs: langs, root: root)]
        case .skill(let skill, let lang): [.skill(skill, lang: lang, root: root, words: words)]
        case .hello(let langs):
            hellos.isEmpty ? langs.map { .language($0, root: root) } : [.word(id: Milestones.helloItem, gloss: hellos.first { $0.lang == root }?.form ?? "hello", forms: hellos.filter { $0.lang != root })]
        }
    }

    @ViewBuilder var mark: some View {
        switch milestone.kind {
        case .mastered(let lang, _), .skill(_, let lang): FlagTile(lang: lang, size: 96)
        case .hello(let langs):
            HStack(spacing: -18) {
                ForEach(langs.prefix(5), id: \.self) { FlagTile(lang: $0, size: 72) }
            }
        case .streak:
            Image(systemName: "flame.fill").font(.system(size: 84))
                .foregroundStyle(LinearGradient(colors: [Color(hex: 0xE9A23B), D8.vermilion], startPoint: .top, endPoint: .bottom))
        }
    }

    var body: some View {
        VStack(spacing: 14) {
            mark
                .scaleEffect(shown ? 1 : 0.6)
                .rotationEffect(.degrees(shown ? 0 : -8))
            Text(title).font(.system(size: 30, weight: .heavy, design: .rounded)).foregroundStyle(Palette.ink).multilineTextAlignment(.center)
            Text(detail).font(.headline).foregroundStyle(Palette.muted).multilineTextAlignment(.center).lineLimit(3).minimumScaleFactor(0.7)
            ShareObjectButton(objects: objects, wide: true).padding(.top, 6)
            Button("Keep going") { dismiss() }.buttonStyle(.borderless).font(.headline).tint(Palette.ink)
        }
        .padding(24)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .paper()
        .presentationDetents([.medium])
        .accessibilityIdentifier("milestone")
        .onAppear {
            haptic(true)
            withAnimation(.spring(duration: 0.5, bounce: 0.5)) { shown = true }
        }
    }
}

struct MilestoneMoments: ViewModifier {
    static let key = "milestones.seen"

    @Environment(LangStore.self) private var store
    let ready: Bool
    @State private var moment: Milestone?

    func check() {
        guard ready, moment == nil, let corpus = store.corpus else { return }
        let now = Date().timeIntervalSince1970 * 1000
        var mastered: [String: Int] = [:]
        for s in store.systems {
            for p in langProgress(s, corpus, store.state(s.id), now: now) { mastered[p.lang] = max(mastered[p.lang] ?? 0, Int(p.mastered)) }
        }
        var feats = Feats()
        for s in store.systems { feats.merge(Milestones.feats(s, corpus, store.state(s.id))) }
        let earned = Milestones.earned(mastered: mastered, streak: Int(langStreak(store)), feats: feats)
        let seen = Set(UserDefaults.standard.stringArray(forKey: Self.key) ?? [])
        guard let next = Milestones.next(earned, seen: seen) else { return }
        UserDefaults.standard.set(Array(seen.union(Milestones.settled(next, earned))), forKey: Self.key)
        moment = next
    }

    var root: String { store.systems.first?.root ?? "en" }

    func shares(_ milestone: Milestone) -> [ShareObject] {
        guard case .mastered(let lang, _) = milestone.kind else { return [] }
        return store.masteredShares(root: root, first: lang)
    }

    func words(_ milestone: Milestone) -> [MasteredWord] {
        guard case .skill(let skill, let lang) = milestone.kind, let corpus = store.corpus else { return [] }
        guard skill == .sentence else { return Milestones.words(skill, lang: lang, root: root, corpus) }
        var first = store.systems.compactMap { Milestones.firstSentence(lang, root: $0.root, corpus, store.state($0.id)) }.min()?.id
        #if DEBUG
        if first == nil { first = corpus.poolKeys.sorted().first { corpus.pool[$0]?.text(lang) != nil && corpus.pool[$0]?.text(root) != nil } }
        #endif
        return first.map { Milestones.sentence($0, lang: lang, root: root, corpus) } ?? []
    }

    func hellos(_ milestone: Milestone) -> [ShareForm] {
        guard case .hello(let langs) = milestone.kind, let corpus = store.corpus else { return [] }
        return Milestones.hello(langs: [root] + langs.filter { $0 != root }, corpus)
    }

    func body(content: Content) -> some View {
        content
            .sheet(item: $moment) { MilestoneMoment(milestone: $0, root: root, langs: store.gameLangs, mastered: shares($0), words: words($0), hellos: hellos($0)) }
            .onChange(of: ready, initial: true) { check() }
            .onChange(of: store.status) { check() }
            .onAppear { check() }
            #if DEBUG
            .task {
                let args = ProcessInfo.processInfo.arguments
                guard let i = args.firstIndex(of: "-milestone"), i + 1 < args.count else { return }
                while store.corpus == nil, !Task.isCancelled { try? await Task.sleep(for: .milliseconds(100)) }
                let spec = args[i + 1]
                let parts = spec.split(separator: ":").map(String.init)
                if parts.count == 2, let n = Int(parts[1]) { moment = Milestone(kind: .mastered(lang: parts[0], count: n)) }
                if parts.count == 3, parts[0] == "skill", let skill = Skill(rawValue: parts[1]) { moment = Milestone(kind: .skill(skill, lang: parts[2])) }
                if parts.count >= 3, parts[0] == "hello" { moment = Milestone(kind: .hello(langs: Array(parts.dropFirst()))) }
            }
            #endif
    }
}
