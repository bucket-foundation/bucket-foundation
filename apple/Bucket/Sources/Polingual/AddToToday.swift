import BucketKit
import SwiftUI

extension TodayPlanStore {
    static let shared = TodayPlanStore(api: BucketAPI())
    static var hosted: Bool { Bundle.main.bundleIdentifier != "com.polingual.app" }
}

extension TodayItem {
    static func deck(_ e: DeckEntry) -> TodayItem { TodayItem(kind: .deck, ref: e.id, title: e.title) }
    static func system(_ s: LangSystem) -> TodayItem { TodayItem(kind: .system, ref: s.id, title: s.name) }
    static func game(_ g: GameKind) -> TodayItem { TodayItem(kind: .game, ref: g.rawValue, title: g.title) }
    static func topic(_ t: ContentTopic) -> TodayItem { TodayItem(kind: .content, ref: t.title, title: t.title) }
}

struct AddToToday: View {
    enum Look { case label, icon }

    let item: TodayItem
    var look = Look.label

    var body: some View {
        if TodayPlanStore.hosted {
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
            .tint(on ? D8.malachite : Palette.ink)
            .buttonStyle(.borderless)
            .accessibilityLabel(title)
            .accessibilityIdentifier("addToToday.\(item.id)")
        }
    }
}
