import BucketKit
import SwiftUI
import UserNotifications

struct Spoke: Identifiable, Equatable {
    enum Mark: Equatable { case lang(String), branch(String) }
    let id: String
    let mark: Mark
    let strength: Double
}

extension GroupMember {
    var languageSpokes: [Spoke] { languages.map { Spoke(id: $0.lang, mark: .lang($0.lang), strength: $0.shownStrength) } }
    var subjectSpokes: [Spoke] { subjects.map { Spoke(id: $0.branch, mark: .branch(String($0.branch.prefix(2))), strength: $0.shownStrength) } }
}

struct RadarShape: Shape {
    let values: [Double]

    func path(in rect: CGRect) -> Path {
        let c = CGPoint(x: rect.midX, y: rect.midY)
        return Path(Radar.smoothPath(Radar.points(values, center: c, radius: min(rect.width, rect.height) / 2)))
    }
}

struct StrengthRadar: View {
    let spokes: [Spoke]
    var compare: [Spoke]? = nil
    var tint: Color = Palette.green
    var compareTint: Color = D8.lapis

    var body: some View {
        GeometryReader { g in
            let side = min(g.size.width, g.size.height)
            let radius = side / 2 - 22
            let c = CGPoint(x: g.size.width / 2, y: g.size.height / 2)
            let rect = CGRect(x: c.x - radius, y: c.y - radius, width: radius * 2, height: radius * 2)
            ZStack {
                ForEach([0.25, 0.5, 0.75, 1.0], id: \.self) { f in
                    Circle()
                        .stroke(Palette.rule, lineWidth: f == 1 ? 1.5 : 0.75)
                        .frame(width: radius * 2 * f, height: radius * 2 * f)
                        .position(c)
                }
                Path { p in
                    for i in spokes.indices {
                        let a = Radar.angle(i, spokes.count)
                        p.move(to: c)
                        p.addLine(to: CGPoint(x: c.x + radius * cos(a), y: c.y + radius * sin(a)))
                    }
                }
                .stroke(Palette.rule, lineWidth: 0.75)
                if let compare {
                    let values = spokes.map { s in compare.first { $0.id == s.id }?.strength ?? 0 }
                    RadarShape(values: values).path(in: rect).fill(compareTint.opacity(0.15))
                    RadarShape(values: values).path(in: rect).stroke(compareTint, style: StrokeStyle(lineWidth: 2, dash: [5, 4]))
                }
                RadarShape(values: spokes.map(\.strength)).path(in: rect).fill(tint.opacity(0.25))
                RadarShape(values: spokes.map(\.strength)).path(in: rect).stroke(tint, lineWidth: 2.5)
                ForEach(Array(spokes.enumerated()), id: \.element.id) { i, s in
                    let a = Radar.angle(i, spokes.count)
                    mark(s.mark)
                        .position(x: c.x + (radius + 14) * cos(a), y: c.y + (radius + 14) * sin(a))
                }
            }
        }
        .aspectRatio(1, contentMode: .fit)
        .accessibilityElement()
        .accessibilityLabel(Text(spokes.map { "\(label($0.mark)) \(Int(($0.strength * 100).rounded()))%" }.joined(separator: ", ")))
    }

    @ViewBuilder func mark(_ m: Spoke.Mark) -> some View {
        switch m {
        case .lang(let l): FlagTile(lang: l, size: 24)
        case .branch(let b): BranchTile(branch: b, size: 24)
        }
    }

    func label(_ m: Spoke.Mark) -> String {
        switch m {
        case .lang(let l): langName(l)
        case .branch(let b): b
        }
    }
}

struct StrengthBar: View {
    let value: Double

    var body: some View {
        GeometryReader { g in
            ZStack(alignment: .leading) {
                Capsule().fill(Palette.rule)
                Capsule().fill(Palette.green).frame(width: g.size.width * min(1, max(0, value)))
            }
        }
        .frame(height: 6)
        .accessibilityLabel(Text("\(Int((value * 100).rounded()))% strength"))
    }
}

struct StrengthGraph: View {
    let graph: MemberGraph

    var body: some View {
        let spots = graph.layout()
        Canvas { ctx, size in
            let inset: CGFloat = 14
            func at(_ id: String) -> CGPoint? {
                spots[id].map { CGPoint(x: inset + $0.x * (size.width - inset * 2), y: inset + $0.y * (size.height - inset * 2)) }
            }
            for e in graph.edges {
                guard let a = at(e.from), let b = at(e.to) else { continue }
                var p = Path()
                p.move(to: a)
                p.addLine(to: b)
                ctx.stroke(p, with: .color(Palette.rule), lineWidth: 1)
            }
            let r: CGFloat = graph.nodes.count > 40 ? 7 : 10
            for n in graph.nodes {
                guard let c = at(n.id) else { continue }
                let dot = Path(ellipseIn: CGRect(x: c.x - r, y: c.y - r, width: r * 2, height: r * 2))
                ctx.fill(dot, with: .color(Palette.paper))
                ctx.fill(dot, with: .color(Palette.green.opacity(0.12 + 0.88 * min(1, max(0, n.strength)))))
                ctx.stroke(dot, with: .color(Palette.green.opacity(0.6)), lineWidth: 1)
            }
        }
        .frame(height: graph.nodes.count > 30 ? 300 : 220)
        .accessibilityElement()
        .accessibilityLabel(Text(graph.nodes.sorted { $0.strength > $1.strength }.prefix(8).map { "\($0.title) \(Int(($0.strength * 100).rounded()))%" }.joined(separator: ", ")))
    }
}

struct StrengthGraphSection: View {
    let groupId: String
    let member: GroupMember
    @Environment(GroupStore.self) private var groups
    @State private var branch: String = ""
    @State private var graph: MemberGraph?
    @State private var loading = false

    var branches: [(id: String, title: String)] {
        member.languages.map { ("lang-\($0.lang)", langName($0.lang)) } + member.subjects.map { ($0.branch, $0.title) }
    }

    var body: some View {
        if !branches.isEmpty {
            Section {
                Picker("Branch", selection: $branch) {
                    ForEach(branches, id: \.id) { Text($0.title).tag($0.id) }
                }
                .pickerStyle(.menu)
                if let graph, !graph.nodes.isEmpty {
                    StrengthGraph(graph: graph)
                    let strongest = graph.nodes.sorted { $0.strength > $1.strength }.prefix(3).map(\.title)
                    if !strongest.isEmpty {
                        Text("Strongest: \(strongest.joined(separator: ", "))")
                            .font(.footnote)
                            .foregroundStyle(Palette.muted)
                    }
                } else if loading {
                    ProgressView()
                } else {
                    Text("Nothing to draw yet.").foregroundStyle(Palette.muted)
                }
            } header: {
                Eyebrow(text: "Strength graph")
            }
            .task(id: branch) { await load() }
            .onAppear {
                guard branch.isEmpty else { return }
                branch = member.subjects.first?.branch ?? branches[0].id
            }
        }
    }

    func load() async {
        guard !branch.isEmpty else { return }
        #if DEBUG
        if DemoGroup.on {
            graph = DemoGroup.graph(branch)
            return
        }
        #endif
        loading = true
        graph = await groups.graph(groupId, member.userId, branch: branch)
        loading = false
    }
}

struct RecentWordsSection: View {
    let member: GroupMember
    @Environment(LangStore.self) private var langs
    @State private var added: Set<String> = []

    var body: some View {
        if !member.recentWords.isEmpty {
            Section {
                ForEach(member.recentWords) { w in
                    HStack(spacing: 12) {
                        FlagTile(lang: w.lang, size: 26)
                        Button {
                            _ = LangVoice.shared.speak(w.form, w.lang)
                        } label: {
                            VStack(alignment: .leading, spacing: 2) {
                                Text(w.form).font(.headline)
                                Text(w.gloss).font(.footnote).foregroundStyle(Palette.muted)
                            }
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .contentShape(.rect)
                        }
                        .buttonStyle(.plain)
                        .accessibilityHint(Text("Plays the word"))
                        if let target = target(w) {
                            Button {
                                langs.grade(target.system, lang: w.lang, itemId: target.item, rating: 1)
                                added.insert(w.id)
                                haptic(true)
                            } label: {
                                Image(systemName: added.contains(w.id) ? "checkmark.circle.fill" : "plus.circle")
                                    .font(.title3)
                            }
                            .buttonStyle(.borderless)
                            .disabled(added.contains(w.id))
                            .accessibilityLabel(Text(added.contains(w.id) ? "Added to your deck" : "Add to your deck"))
                        }
                    }
                }
            } header: {
                Eyebrow(text: "Recent words")
            } footer: {
                Text("Tap a word to hear it. Plus adds it to your deck.")
            }
        }
    }

    func target(_ w: RecentWord) -> (system: String, item: String)? {
        guard let corpus = langs.corpus, let system = langs.systems.first(where: { $0.targets.contains(w.lang) }) else { return nil }
        guard let item = corpus.items.first(where: { $0.form(w.lang) == w.form }) else { return nil }
        if langs.state(system.id).cards.started(cardId(w.lang, item.id)) && !added.contains(w.id) { return nil }
        return (system.id, item.id)
    }
}

struct LearnTogetherSheet: View {
    let set: MemberSet
    let memberName: String
    @Environment(LangStore.self) private var langs
    @Environment(\.dismiss) private var dismiss
    @State private var failed = false
    @State private var working = false

    var existing: LangSystem? { langs.systems.first { $0.root == set.root && Set($0.targets) == Set(set.targets) } }

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    HStack(spacing: 6) { ForEach(set.targets, id: \.self) { FlagTile(lang: $0, size: 36) } }
                    Text(set.name).font(.serif(.title2, weight: .semibold))
                    Text("From \(langName(set.root)): \(set.targets.map(langName).joined(separator: ", "))")
                        .foregroundStyle(Palette.muted)
                } footer: {
                    Text("You get the same languages as \(memberName) and keep your own progress.")
                }
                Section {
                    Button(existing == nil ? String(localized: "Learn together") : String(localized: "Open in Learn")) {
                        Task { await start() }
                    }
                    .buttonStyle(D8Primary())
                    .disabled(working)
                }
                if failed { Section { Text("That set could not be made. Try again.").foregroundStyle(.red) } }
            }
            .listRowBackground(Palette.card)
            .paper()
            .navigationTitle("Learn together")
            .inlineTitle()
            .toolbar { ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } } }
        }
    }

    func start() async {
        working = true
        defer { working = false }
        await langs.load()
        if existing == nil {
            guard (try? await langs.create(root: set.root, targets: set.targets)) != nil else {
                failed = true
                return
            }
        }
        haptic(true)
        dismiss()
        #if BUCKET
        DeepLink.shared.pending = .langs(root: set.root, targets: set.targets)
        #endif
    }
}

struct GoalBar: View {
    let name: String
    let goal: GroupGoal

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack {
                Text(name).font(.subheadline.weight(.semibold))
                Spacer()
                Text("\(goal.done) of \(goal.weekly) cards this week")
                    .font(.footnote.monospacedDigit())
                    .foregroundStyle(Palette.muted)
            }
            ProgressView(value: goal.progress).tint(goal.progress >= 1 ? D8.malachite : Palette.green)
        }
        .accessibilityElement(children: .combine)
    }
}

struct GoalPicker: View {
    let group: LearningGroup
    @Environment(GroupStore.self) private var groups

    var body: some View {
        Menu {
            ForEach(GroupGoal.choices, id: \.self) { n in
                Button(String(localized: "\(n) cards a week")) { Task { await groups.setGoal(group.id, weekly: n) } }
            }
            if group.goal != nil {
                Button("Clear the goal", role: .destructive) { Task { await groups.setGoal(group.id, weekly: 0) } }
            }
        } label: {
            Label(group.goal == nil ? String(localized: "Set a weekly goal") : String(localized: "Change the weekly goal"), systemImage: "target")
        }
    }
}

struct Avatar: View {
    let member: GroupMember
    var size: CGFloat = 52

    var body: some View {
        ZStack {
            Circle().fill(Palette.card)
            Text(member.initials.isEmpty ? "?" : member.initials)
                .font(.system(size: size * 0.36, weight: .heavy, design: .rounded))
                .foregroundStyle(Palette.ink)
            Circle()
                .stroke(member.studiedToday ? D8.malachite : Palette.rule, style: StrokeStyle(lineWidth: member.studiedToday ? 4 : 2, dash: member.studiedToday ? [] : [4, 4]))
        }
        .frame(width: size, height: size)
    }
}

struct TodayStrip: View {
    @Environment(Account.self) private var account
    @Environment(GroupStore.self) private var groups
    @State private var sent: [String: CheerKind] = [:]
    @State private var note: String?

    var body: some View {
        if !groups.people.isEmpty || !groups.incoming.isEmpty || !groups.goals.isEmpty {
            Section {
                ForEach(groups.incoming.prefix(3)) { c in
                    Label(c.kind == .cheer ? String(localized: "\(c.fromName) cheered you on.") : String(localized: "\(c.fromName) nudged you to study today."),
                          systemImage: c.kind == .cheer ? "hands.clap.fill" : "bell.fill")
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(c.kind == .cheer ? D8.malachite : D8.vermilion)
                }
                if !groups.people.isEmpty {
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(alignment: .top, spacing: 14) {
                            ForEach(groups.people, id: \.member.userId) { p in
                                Button { Task { await send(p.member, p.groupId) } } label: {
                                    VStack(spacing: 4) {
                                        Avatar(member: p.member)
                                        Text(p.member.name.split(separator: " ").first.map(String.init) ?? p.member.name)
                                            .font(.caption.weight(.semibold))
                                            .lineLimit(1)
                                        Text(sent[p.member.userId].map { $0 == .cheer ? String(localized: "Cheered") : String(localized: "Nudged") }
                                             ?? (p.member.studiedToday ? String(localized: "Cheer") : String(localized: "Nudge")))
                                            .font(D8.caps(9))
                                            .textCase(.uppercase)
                                            .foregroundStyle(p.member.studiedToday ? D8.malachite : D8.vermilion)
                                    }
                                    .frame(width: 62)
                                }
                                .buttonStyle(.plain)
                                .disabled(sent[p.member.userId] != nil || groups.busy)
                                .accessibilityLabel(Text(p.member.studiedToday ? "Cheer \(p.member.name)" : "Nudge \(p.member.name)"))
                            }
                        }
                        .padding(.vertical, 4)
                    }
                }
                ForEach(groups.goals, id: \.group.id) { GoalBar(name: $0.group.name, goal: $0.goal) }
                if let note { Text(note).font(.footnote).foregroundStyle(Palette.muted) }
            } header: {
                Eyebrow(text: "Family and friends")
            }
            .listRowBackground(Palette.card)
            .task(id: groups.incoming.map(\.id)) {
                let ids = groups.incoming.map(\.id)
                guard !ids.isEmpty else { return }
                try? await Task.sleep(for: .seconds(4))
                guard !Task.isCancelled else { return }
                #if DEBUG
                if DemoGroup.on { return }
                #endif
                await groups.markSeen(ids)
            }
        }
    }

    func send(_ m: GroupMember, _ groupId: String) async {
        #if DEBUG
        if DemoGroup.on {
            sent[m.userId] = m.cheerKind
            return
        }
        #endif
        if await groups.cheer(m, in: groupId) != nil {
            sent[m.userId] = m.cheerKind
            haptic(true)
            note = nil
        } else {
            note = groupMessage(groups.error)
        }
    }
}

struct GroupsOnToday: ViewModifier {
    @Environment(Account.self) private var account
    @Environment(GroupStore.self) private var groups

    func body(content: Content) -> some View {
        content.task(id: account.stage == .signedIn) {
            #if DEBUG
            if DemoGroup.on {
                groups.groups = [DemoGroup.group]
                return
            }
            #endif
            if account.stage == .signedIn { await groups.load() }
        }
    }
}

extension View {
    func groupsOnToday() -> some View { modifier(GroupsOnToday()) }
}

enum CheerNotifier {
    static let key = "groups.notifiedCheers"

    static func fresh(_ cheers: [Cheer], defaults: UserDefaults = .standard) -> [Cheer] {
        let done = Set(defaults.stringArray(forKey: key) ?? [])
        return cheers.filter { !done.contains($0.id) }
    }

    static func remember(_ cheers: [Cheer], defaults: UserDefaults = .standard) {
        let done = (defaults.stringArray(forKey: key) ?? []) + cheers.map(\.id)
        defaults.set(Array(done.suffix(200)), forKey: key)
    }

    @MainActor
    static func post(_ store: GroupStore) async {
        await store.load()
        let new = fresh(store.incoming)
        guard !new.isEmpty else { return }
        remember(new)
        let center = UNUserNotificationCenter.current()
        guard await center.notificationSettings().authorizationStatus == .authorized else { return }
        for c in new.prefix(3) {
            let content = UNMutableNotificationContent()
            content.title = c.kind == .cheer ? String(localized: "\(c.fromName) cheered you on.") : String(localized: "\(c.fromName) nudged you to study today.")
            content.userInfo = ["study": true]
            content.sound = .default
            try? await center.add(UNNotificationRequest(identifier: "cheer-\(c.id)", content: content, trigger: nil))
        }
    }
}
