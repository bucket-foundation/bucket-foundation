import BucketKit
import SwiftUI

struct MilestoneMoment: View {
    @Environment(\.dismiss) private var dismiss
    let milestone: Milestone
    let root: String
    let langs: [String]
    @State private var shown = false

    var title: String {
        switch milestone.kind {
        case .mastered(_, 1): String(localized: "First word mastered")
        case .mastered(_, let count): String(localized: "\(count) words mastered")
        case .streak(let days): String(localized: "\(days) day streak")
        }
    }

    var detail: String {
        switch milestone.kind {
        case .mastered(let lang, _): String(localized: "in \(langName(lang))")
        case .streak: String(localized: "Keep it going.")
        }
    }

    var object: ShareObject {
        switch milestone.kind {
        case .mastered(let lang, let count): .mastered(lang: lang, count: count, root: root)
        case .streak(let days): .streak(days: days, langs: langs, root: root)
        }
    }

    @ViewBuilder var mark: some View {
        switch milestone.kind {
        case .mastered(let lang, _): FlagTile(lang: lang, size: 96)
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
            Text(detail).font(.headline).foregroundStyle(Palette.muted)
            ShareObjectButton(object, wide: true).padding(.top, 6)
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
        let earned = Milestones.earned(mastered: mastered, streak: Int(langStreak(store)))
        let seen = Set(UserDefaults.standard.stringArray(forKey: Self.key) ?? [])
        guard let next = Milestones.next(earned, seen: seen) else { return }
        UserDefaults.standard.set(Array(seen.union(earned.map(\.id))), forKey: Self.key)
        moment = next
    }

    func body(content: Content) -> some View {
        content
            .sheet(item: $moment) { MilestoneMoment(milestone: $0, root: store.systems.first?.root ?? "en", langs: store.gameLangs) }
            .onChange(of: ready, initial: true) { check() }
            .onChange(of: store.status) { check() }
            .onAppear { check() }
    }
}
