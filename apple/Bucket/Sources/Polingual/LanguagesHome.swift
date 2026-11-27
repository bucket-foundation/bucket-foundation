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
            Text("Your language systems did not reach the server. They are saved on this device; the next change retries the sync.").noticeStyle()
        case .localOnly:
            Text("Saved on this device. Sign in to sync your language systems.").noticeStyle()
        case .offline:
            Text("Saved on this device. It syncs when the connection returns.").noticeStyle()
        case .refused:
            Text("Saved on this device. The server kept its copy because this one was empty; it retries after your next study.").noticeStyle()
        case .needsProfile:
            Button("Saved on this device. Choose your age range to sync.") { NotificationCenter.default.post(name: .askAgeRange, object: nil) }
                .font(PL.text(13))
        default:
            EmptyView()
        }
    }
}

extension Text {
    func noticeStyle() -> some View { font(.footnote).foregroundStyle(PL.inkDim) }
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
                Text(LocalizedStringKey(title)).font(PL.script(15, .bold)).foregroundStyle(PL.ink)
            }
            .padding(.horizontal, 12)
            .frame(minHeight: 42)
            .background(on ? PL.lapisSoft : PL.card, in: .rect(cornerRadius: PL.Radius.md))
            .overlay(RoundedRectangle(cornerRadius: PL.Radius.md).strokeBorder(on ? PL.lapis : PL.paper3, lineWidth: on ? 3 : 2))
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
            Text(corpus.attribution).font(PL.text(11)).foregroundStyle(PL.inkDim)
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
    @State private var root = InterfaceLanguage.deviceRoot
    @State private var targets: [String] = []
    @State private var speaking = false

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
            Button {
                speaking = true
            } label: {
                LabeledContent("Languages I speak") {
                    Text(KnownPrompt.summary(store.known, device: InterfaceLanguage.deviceRoot, name: langName))
                }
            }
            .tint(PL.ink)
            .onChange(of: store.known, initial: true) { _, known in
                root = KnownPrompt.root(current: root, known: known, device: InterfaceLanguage.deviceRoot)
            }
            .onChange(of: root) { _, v in targets.removeAll { $0 == v } }
            .sheet(isPresented: $speaking) {
                KnownLanguagesSheet(mode: .settings, picks: KnownPicks(device: InterfaceLanguage.deviceRoot, stored: store.known)) { root = $0 }
            }
            Button("Create my set") { create(targets, proxy) }
                .buttonStyle(D8Primary(compact: true))
                .disabled(err != nil || targets.isEmpty)
            if let err, !targets.isEmpty { Text(err.message).noticeStyle() }
        } header: {
            Eyebrow(text: "Or build your own")
        }
        .listRowBackground(PL.card)
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
                Text(LocalizedStringKey(name)).font(PL.script(17, .heavy)).foregroundStyle(PL.ink)
                Text(langs.map(langName).joined(separator: " · ")).font(PL.text(12)).foregroundStyle(PL.inkDim).lineLimit(2)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
            .padding(12)
            .background(PL.card, in: .rect(cornerRadius: PL.Radius.md))
            .overlay { RoundedRectangle(cornerRadius: PL.Radius.md).strokeBorder(PL.paper3, lineWidth: 2) }
            .background(PL.paper3, in: .rect(cornerRadius: PL.Radius.md).offset(y: 4))
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
