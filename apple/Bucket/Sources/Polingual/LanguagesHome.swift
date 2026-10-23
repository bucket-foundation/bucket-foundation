import BucketKit
import SwiftUI

enum LangRoute: Hashable {
    case home
    case system(String)
    case study(String)
    case place(String, String?)
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
                Text(title).font(.system(size: 15, weight: .bold, design: .rounded)).foregroundStyle(D8.ink)
            }
            .padding(.horizontal, 12)
            .frame(minHeight: 42)
            .background(on ? Color(hex: 0xEEF3FB) : .white, in: .rect(cornerRadius: 12))
            .overlay(RoundedRectangle(cornerRadius: 12).strokeBorder(on ? D8.lapis : D8.keyline, lineWidth: on ? 3 : 2))
        }
        .buttonStyle(TilePress())
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(langs.count > 1 ? "\(title): \(langs.map(Lang.name).joined(separator: ", "))" : title)
        .accessibilityAddTraits(on ? [.isButton, .isSelected] : .isButton)
    }
}

struct LanguagesHome: View {
    @Environment(LangStore.self) private var store
    @Environment(Gate.self) private var gate
    @Binding var path: NavigationPath
    @State private var root = "en"
    @State private var targets: [String] = []
    @State private var removing: LangSystem?

    var err: SystemError? { validateSystem(root, targets, store.systems) }

    var body: some View {
        Group {
            switch store.status {
            case .idle, .loading:
                ProgressView("Loading your language systems")
            case .error:
                StateMessage(title: "The language course did not load", detail: "The language corpus files did not arrive. Check the connection and try again.") {
                    Task { await store.load(force: true) }
                }
            case .ready:
                if let corpus = store.corpus { content(corpus) }
            }
        }
        .paper()
        .navigationTitle("Language systems")
        .task { await store.load() }
        .confirmationDialog("Remove \(removing?.name ?? "")?", isPresented: Binding(get: { removing != nil }, set: { if !$0 { removing = nil } }), titleVisibility: .visible) {
            Button("Remove", role: .destructive) {
                if let s = removing { Task { await store.remove(s.id) } }
            }
        } message: {
            Text("Progress stays saved and returns if you build the same system again.")
        }
    }

    func content(_ corpus: LangCorpus) -> some View {
        List {
            Section {
                Text("Learn a set of languages together from one root language. Each word comes back in every language of the set, mixed in one queue, with shared roots shown side by side.")
                    .font(.serif(.body))
                    .foregroundStyle(Palette.ink)
                    .listRowBackground(Color.clear)
            }
            if store.systems.isEmpty {
                Section {
                    VStack(alignment: .leading, spacing: 4) {
                        Text("No language systems yet").font(.serif(.headline))
                        Text("Build one below. English is the default root.").font(.subheadline).foregroundStyle(Palette.muted)
                    }
                }
                .listRowBackground(Palette.card)
            }
            ForEach(store.systems) { s in
                Section {
                    systemCard(s, corpus)
                }
                .listRowBackground(Palette.card)
            }
            Section {
                Picker("Root language", selection: $root) {
                    ForEach(Lang.codes, id: \.self) { Text(Lang.name($0)).tag($0) }
                }
                .onChange(of: root) { _, v in targets.removeAll { $0 == v } }
                VStack(alignment: .leading, spacing: 8) {
                    Eyebrow(text: "Presets")
                    FlowLayout(spacing: 8) {
                        ForEach(Lang.presets, id: \.name) { p in
                            Chip(title: p.name, langs: p.targets, on: false) {
                                targets = p.targets.filter { $0 != root }
                            }
                        }
                    }
                }
                VStack(alignment: .leading, spacing: 8) {
                    Eyebrow(text: "Languages to learn")
                    FlowLayout(spacing: 8) {
                        ForEach(Lang.codes.filter { $0 != root }, id: \.self) { c in
                            Chip(title: Lang.name(c), langs: [c], on: targets.contains(c)) {
                                if targets.contains(c) { targets.removeAll { $0 == c } } else { targets.append(c) }
                            }
                        }
                    }
                }
                Button("Create system", action: create)
                    .buttonStyle(D8Primary(compact: true))
                    .disabled(err != nil)
                if let err, !targets.isEmpty { Text(err.message).noticeStyle() }
            } header: {
                Eyebrow(text: "New system")
            }
            .listRowBackground(Palette.card)
            Section {
                if gate.guest && !store.systems.isEmpty {
                    Text("Saved on this device.").noticeStyle()
                    Button("Save to your account") { gate.require { Task { await store.persistSystems() } } }
                } else {
                    SaveNotice(state: store.saveState)
                }
                Text(corpus.attribution).font(.caption2).foregroundStyle(Palette.muted)
            }
            .listRowBackground(Color.clear)
        }
    }

    func systemCard(_ s: LangSystem, _ corpus: LangCorpus) -> some View {
        let sum = systemSummary(s, corpus, store.state(s.id), now: Date().timeIntervalSince1970 * 1000)
        let fresh = sum.started == 0 && s.placement.isEmpty
        return VStack(alignment: .leading, spacing: 10) {
            HStack(alignment: .firstTextBaseline) {
                Text(s.name).font(.serif(.title3, weight: .semibold)).foregroundStyle(Palette.ink)
                Spacer()
                Text("\(sum.started) of \(sum.total) cards").font(.caption).foregroundStyle(Palette.muted).monospacedDigit()
            }
            HStack(spacing: 4) { ForEach(s.targets, id: \.self) { FlagTile(lang: $0, size: 24) }; Text("from \(Lang.name(s.root))").font(.subheadline).foregroundStyle(Palette.muted).padding(.leading, 4) }
            HStack(spacing: 14) {
                Text("\(sum.due) due")
                Text("\(Int(sum.xp)) xp")
                Text("\(Int(sum.streak)) day streak")
                Text("\(sum.sharedRootItems) shared-root words")
            }
            .font(.caption)
            .foregroundStyle(Palette.muted)
            .monospacedDigit()
            FlowLayout(spacing: 8) {
                if fresh {
                    Button("Placement") { path.append(LangRoute.place(s.id, nil)) }.buttonStyle(D8Primary(compact: true))
                } else {
                    Button(sum.due > 0 ? "Review" : "Continue") { path.append(LangRoute.study(s.id)) }.buttonStyle(D8Primary(compact: true))
                }
                if sum.started == 0 {
                    Button("Start from zero") { path.append(LangRoute.study(s.id)) }.buttonStyle(D8Option(align: .center, compact: true))
                }
                Button("Progress") { path.append(LangRoute.system(s.id)) }.buttonStyle(D8Option(align: .center, compact: true))
                Button("Remove", role: .destructive) { removing = s }.buttonStyle(.borderless).font(.caption)
            }
        }
        .padding(.vertical, 6)
    }

    func create() {
        guard err == nil else { return }
        let make = {
            let r = root
            let t = targets
            targets = []
            Task { _ = try? await store.create(root: r, targets: t) }
        }
        if gate.guest && store.systems.isEmpty { make() } else { gate.require(make) }
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
