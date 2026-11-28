import BucketKit
import SwiftUI

extension SetSort {
    var label: LocalizedStringKey {
        switch self {
        case .recent: "Most recent"
        case .masteryHigh: "Most mastered"
        case .masteryLow: "Least mastered"
        case .name: "Name"
        }
    }

    var symbol: String {
        switch self {
        case .recent: "clock"
        case .masteryHigh: "chart.bar.fill"
        case .masteryLow: "chart.bar"
        case .name: "textformat"
        }
    }

    static let storageKey = "langs.setSort"
}

struct SetSortMenu: View {
    @AppStorage(SetSort.storageKey) private var raw = SetSort.recent.rawValue

    var body: some View {
        let current = SetSort(rawValue: raw) ?? .recent
        Menu {
            Picker(selection: $raw) {
                ForEach(SetSort.allCases, id: \.self) { Label($0.label, systemImage: $0.symbol).tag($0.rawValue) }
            } label: {
                Text("Sort sets")
            }
        } label: {
            HStack(spacing: 4) {
                Image(systemName: "arrow.up.arrow.down")
                Text(current.label)
            }
            .font(PL.text(13, .bold))
            .foregroundStyle(PL.inkDim)
            .frame(minHeight: 44)
            .contentShape(.rect)
        }
        .accessibilityLabel(Text("Sort sets"))
        .accessibilityValue(Text(current.label))
        .accessibilityIdentifier("langs.sort")
    }
}

@MainActor enum SetSortCache {
    static var key = ""
    static var ids: [String] = []
}

extension LangStore {
    func sortedSystems(_ sort: SetSort) -> [LangSystem] {
        let key = sortKey(sort)
        if key != SetSortCache.key {
            SetSortCache.ids = computeSorted(sort).map(\.id)
            SetSortCache.key = key
        }
        let byId = Dictionary(systems.map { ($0.id, $0) }, uniquingKeysWith: { a, _ in a })
        return SetSortCache.ids.compactMap { byId[$0] }
    }

    private func sortKey(_ sort: SetSort) -> String {
        let sets = systems.map { s in
            let st = state(s.id)
            let reps = st.cards.keys.reduce(0.0) { $0 + (st.cards[$1]?.reps ?? 0) }
            return "\(s.id)|\(s.title)|\(s.targets)|\(s.updatedAt ?? s.createdAt)|\(st.cards.keys.count)|\(reps)|\(st.lastStudyDay ?? "")"
        }
        return "\(sort.rawValue)#\(corpus == nil)#" + sets.joined(separator: ",")
    }

    private func computeSorted(_ sort: SetSort) -> [LangSystem] {
        let now = Date().timeIntervalSince1970 * 1000
        var recent: [String: SetRecency] = [:]
        var mastery: [String: Double] = [:]
        for s in systems {
            recent[s.id] = setRecency(s, state(s.id))
            if sort == .masteryHigh || sort == .masteryLow, let corpus { mastery[s.id] = setMastery(s, corpus, state(s.id), now: now) }
        }
        return sortSystems(systems, by: sort, recent: recent, mastery: mastery, title: \.title)
    }
}
