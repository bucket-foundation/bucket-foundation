import BucketKit
import SwiftUI

enum LangRoute: Hashable {
    case system(String)
    case study(String)
    case place(String, String?)
    case alphabet(String, String)
    case reference(String)
}

struct SaveNotice: View {
    let state: SaveResult

    var body: some View {
        switch state {
        case .failed:
            Text("Your language systems did not reach the server after three tries. They are saved on this device; the next change retries the sync.").noticeStyle()
        case .localOnly:
            Text("Saved on this device. Sign in to sync your language systems.").noticeStyle()
        case .needsProfile:
            Text("Saved on this device. Finish your learner profile at bucket.foundation to sync.").noticeStyle()
        default:
            EmptyView()
        }
    }
}

extension Text {
    func noticeStyle() -> some View { font(.footnote).foregroundStyle(Palette.muted) }
}

struct Chip: View {
    let title: String
    var langs: [String] = []
    let on: Bool
    let action: () -> Void

    var body: some View {
        Button {
            tap()
            action()
        } label: {
            HStack(spacing: 8) {
                if !langs.isEmpty {
                    HStack(spacing: 3) { ForEach(langs.prefix(3), id: \.self) { FlagTile(lang: $0, size: 20) } }
                }
                Text(LocalizedStringKey(title)).font(.system(size: 15, weight: .bold, design: .rounded)).foregroundStyle(Palette.ink)
            }
            .padding(.horizontal, 12)
            .frame(minHeight: 42)
            .background(on ? D8.pickedFace : D8.face, in: .rect(cornerRadius: 12))
            .overlay(RoundedRectangle(cornerRadius: 12).strokeBorder(on ? D8.picked : D8.edge, lineWidth: on ? 3 : 2))
        }
        .buttonStyle(TilePress())
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(langs.count > 1 ? "\(title): \(langs.map(langName).joined(separator: ", "))" : title)
        .accessibilityAddTraits(on ? [.isButton, .isSelected] : .isButton)
    }
}

extension LanguageSections {
    static let presets: [(name: String, targets: [String])] = Lang.presets + [
        ("Slavic", ["ru", "pl", "cs"]),
        ("Middle Eastern", ["ar", "fa", "he", "tr"]),
        ("South Asian", ["hi", "ta", "sa"]),
        ("Classical", ["la", "grc", "sa"]),
        ("Mediterranean", ["es", "it", "el", "tr"]),
    ]
}

struct LanguageFooter: View {
    @Environment(LangStore.self) private var store
    @Environment(Gate.self) private var gate
    let corpus: LangCorpus

    var body: some View {
        Section {
            if gate.guest && !store.systems.isEmpty {
                Button("Save to your account") { gate.require { Task { await store.persistSystems() } } }
            } else {
                SaveNotice(state: store.saveState)
            }
            Text(corpus.attribution).font(.caption2).foregroundStyle(Palette.muted)
        }
        .listRowBackground(Color.clear)
    }
}

struct LanguageSections: View {
    @Environment(LangStore.self) private var store
    @Environment(Gate.self) private var gate
    @Binding var path: NavigationPath
    let corpus: LangCorpus
    let proxy: ScrollViewProxy
    @State private var root = "en"
    @State private var targets: [String] = []

    var err: SystemError? { validateSystem(root, targets, store.systems) }
    var pickable: [String] { Lang.codes.filter { $0 != root } }

    var body: some View {
        Section {
            LazyVGrid(columns: [GridItem(.flexible(), spacing: 10), GridItem(.flexible())], spacing: 10) {
                ForEach(Self.presets, id: \.name) { presetCard($0) }
            }
            .padding(.vertical, 6)
        } header: {
            Eyebrow(text: "Start a set")
        }
        .id("start")
        .listRowBackground(Color.clear)
        Section {
            chips
            Picker("I already speak", selection: $root) {
                ForEach(Lang.codes, id: \.self) { Text(langName($0)).tag($0) }
            }
            .onChange(of: root) { _, v in targets.removeAll { $0 == v } }
            Button("Create my set") { create(targets, proxy) }
                .buttonStyle(D8Primary(compact: true))
                .disabled(err != nil || targets.isEmpty)
            if let err, !targets.isEmpty { Text(err.message).noticeStyle() }
        } header: {
            Eyebrow(text: "Or build your own")
        }
        .listRowBackground(Palette.card)
    }

    var chips: some View {
        FlowLayout(spacing: 8) {
            ForEach(pickable, id: \.self) { c in
                Chip(title: langName(c), langs: [c], on: targets.contains(c)) {
                    if targets.contains(c) { targets.removeAll { $0 == c } } else { targets.append(c) }
                }
            }
        }
    }

    func presetCard(_ p: (name: String, targets: [String])) -> some View {
        PresetCard(name: p.name, langs: p.targets.filter { $0 != root }) {
            create(p.targets.filter { $0 != root }, proxy)
        }
    }

    func create(_ picked: [String], _ proxy: ScrollViewProxy) {
        guard !picked.isEmpty else { return }
        let r = root
        let make = {
            targets = []
            Task {
                let existing = store.systems.first { $0.root == r && Set($0.targets) == Set(picked) }
                let made: LangSystem? = if let existing { existing } else { try? await store.create(root: r, targets: picked) }
                guard let made else { return }
                haptic(true)
                path.append(LangRoute.system(made.id))
            }
        }
        if gate.guest && store.systems.isEmpty { make() } else { gate.require(make) }
    }
}

struct PresetCard: View {
    let name: String
    let langs: [String]
    let action: () -> Void

    var body: some View {
        Button {
            tap()
            action()
        } label: {
            VStack(alignment: .leading, spacing: 8) {
                HStack(spacing: 4) { ForEach(langs.prefix(4), id: \.self) { FlagTile(lang: $0, size: 26) } }
                Text(LocalizedStringKey(name)).font(.system(size: 17, weight: .heavy, design: .rounded)).foregroundStyle(Palette.ink)
                Text(langs.map(langName).joined(separator: " · ")).font(.caption).foregroundStyle(Palette.muted).lineLimit(2)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
            .padding(12)
            .background(D8.face, in: .rect(cornerRadius: 14))
            .overlay { RoundedRectangle(cornerRadius: 14).strokeBorder(D8.edge, lineWidth: 2) }
            .background(D8.edge, in: .rect(cornerRadius: 14).offset(y: 4))
        }
        .buttonStyle(TilePress())
        .accessibilityLabel("\(name): \(langs.map(langName).joined(separator: ", "))")
    }
}

struct FlowLayout: Layout {
    var spacing: CGFloat = 8

    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        let rows = arrange(proposal.width ?? .infinity, subviews)
        return CGSize(width: proposal.width ?? rows.map(\.width).max() ?? 0, height: rows.reduce(0) { $0 + $1.height } + spacing * CGFloat(max(0, rows.count - 1)))
    }

    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        var y = bounds.minY
        for row in arrange(bounds.width, subviews) {
            var x = bounds.minX
            for i in row.items {
                let size = subviews[i].sizeThatFits(.unspecified)
                subviews[i].place(at: CGPoint(x: x, y: y), proposal: ProposedViewSize(size))
                x += size.width + spacing
            }
            y += row.height + spacing
        }
    }

    struct Row {
        var items: [Int] = []
        var width: CGFloat = 0
        var height: CGFloat = 0
    }

    func arrange(_ maxWidth: CGFloat, _ subviews: Subviews) -> [Row] {
        var rows: [Row] = [Row()]
        for i in subviews.indices {
            let size = subviews[i].sizeThatFits(.unspecified)
            if !rows[rows.count - 1].items.isEmpty && rows[rows.count - 1].width + spacing + size.width > maxWidth { rows.append(Row()) }
            var r = rows[rows.count - 1]
            r.width += (r.items.isEmpty ? 0 : spacing) + size.width
            r.height = max(r.height, size.height)
            r.items.append(i)
            rows[rows.count - 1] = r
        }
        return rows
    }
}
