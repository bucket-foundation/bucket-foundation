import BucketKit
import SwiftUI

extension TodayPlanStore {
    static let shared = TodayPlanStore(api: BucketAPI())
}

extension TodayItem {
    static func deck(_ e: DeckEntry) -> TodayItem { TodayItem(kind: .deck, ref: e.id, title: e.title) }
    static func system(_ s: LangSystem) -> TodayItem { TodayItem(kind: .system, ref: s.id, title: s.name) }
    static func game(_ g: GameKind) -> TodayItem { TodayItem(kind: .game, ref: g.rawValue, title: g.title) }
    static func topic(_ t: ContentTopic) -> TodayItem { TodayItem(kind: .content, ref: t.title, title: t.title) }
    static func activity(_ a: TodayActivity) -> TodayItem { TodayItem(a, title: a.title) }
}

extension TodayActivity {
    var title: String {
        switch self {
        case .listen: ContentKind.listen.title
        case .watch: ContentKind.watch.title
        case .alphabet(let lang): LangScript.alphabetUnit(lang)?.title ?? langName(lang)
        }
    }
}

@MainActor
enum WatchDwell {
    static let key = "today.watch.openedAt"

    static func opened() {
        UserDefaults.standard.set(Date().timeIntervalSince1970 * 1000, forKey: key)
        #if os(macOS)
        Task {
            try? await Task.sleep(for: .seconds(AwayDwell.watchMilliseconds / 1000))
            returned()
        }
        #endif
    }

    static func returned() {
        guard let at = UserDefaults.standard.object(forKey: key) as? Double else { return }
        UserDefaults.standard.removeObject(forKey: key)
        if AwayDwell.earned(openedAt: at, now: Date().timeIntervalSince1970 * 1000) { TodayPlanStore.shared.finish(TodayActivity.watch.id) }
    }
}

struct AddToToday: View {
    enum Look { case label, icon }

    let item: TodayItem
    var look = Look.label
    var color: Color?

    var body: some View {
        let plan = TodayPlanStore.shared
        let on = plan.contains(item.id)
        let title = on ? String(localized: "On Today") : String(localized: "Add to Today")
        Button {
            if on { plan.remove(item.id) } else { plan.add(item) }
        } label: {
            switch look {
            case .label: Label(title, systemImage: on ? "checkmark.circle.fill" : "plus.circle")
            case .icon: Image(systemName: on ? "checkmark.circle.fill" : "plus.circle").font(.title2)
            }
        }
        .tint(color ?? (on ? D8.malachite : Palette.ink))
        .buttonStyle(.borderless)
        .accessibilityLabel(title)
        .accessibilityIdentifier("addToToday.\(item.id)")
    }
}
