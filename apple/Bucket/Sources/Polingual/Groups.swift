import BucketKit
import SwiftUI

extension SharePage {
    static func group(_ g: LearningGroup) -> SharePage {
        group(code: g.code, name: g.name, kind: g.kind)
    }

    static func group(code: String, name: String, kind: GroupKind) -> SharePage {
        SharePage(path: "/g", items: [
            URLQueryItem(name: "c", value: code),
            URLQueryItem(name: "n", value: clip(name, 60)),
            URLQueryItem(name: "k", value: kind.rawValue),
        ], title: String(localized: "Join \(name) on Bucket"))
    }
}

extension GroupKind {
    var label: String { self == .family ? String(localized: "Family") : String(localized: "Friends") }
    var inviteLabel: String { self == .family ? String(localized: "Invite family") : String(localized: "Invite friends") }
    var symbol: String { self == .family ? "house" : "person.2" }
}

func asBucket(_ e: any Error) -> BucketError { e as? BucketError ?? .server(0, nil) }

func groupMessage(_ e: BucketError?) -> String? {
    switch e {
    case nil: nil
    case .groupNotFound: String(localized: "That invite link no longer works. Ask for a new one.")
    case .groupFull: String(localized: "This group is full.")
    case .revoked: String(localized: "Sign in again to continue.")
    case .rateLimited: String(localized: "Too many tries. Wait a few minutes and try again.")
    case .ownedLimit: String(localized: "You already own 10 groups.")
    case .joinedLimit: String(localized: "You already belong to 20 groups.")
    case .cheerLimit: String(localized: "You sent them 3 today. Try again tomorrow.")
    case .nudgeNotNeeded: String(localized: "They already studied today.")
    default: String(localized: "Something went wrong. Try again.")
    }
}

enum GroupSheet: Identifiable {
    case create(GroupKind)
    case invite(String)
    case enterCode
    case join(String)

    var id: String {
        switch self {
        case .create(let k): "create-\(k.rawValue)"
        case .invite(let g): "invite-\(g)"
        case .enterCode: "code"
        case .join(let c): "join-\(c)"
        }
    }
}

struct FamilyAndFriends: View {
    @Environment(Account.self) private var account
    @Environment(GroupStore.self) private var groups
    @Binding var signingIn: Bool
    @State private var sheet: GroupSheet?

    var body: some View {
        Section {
            ForEach(groups.groups) { g in
                NavigationLink { GroupView(groupId: g.id) } label: { GroupRow(group: g) }
            }
            ForEach(GroupKind.allCases, id: \.self) { kind in
                Button {
                    if account.stage != .signedIn && groups.groups.isEmpty {
                        signingIn = true
                    } else if let g = groups.first(kind) {
                        sheet = .invite(g.id)
                    } else {
                        sheet = .create(kind)
                    }
                } label: {
                    Label(kind.inviteLabel, systemImage: kind.symbol)
                }
            }
            Button {
                if account.stage != .signedIn { signingIn = true } else { sheet = .enterCode }
            } label: {
                Label("Have an invite code?", systemImage: "ticket")
            }
        } header: {
            Eyebrow(text: "Family and friends")
        } footer: {
            Text(account.stage == .signedIn ? String(localized: "Members see each other's languages and streaks.") : String(localized: "Sign in to invite family and friends."))
        }
        .sheet(item: $sheet) { s in
            switch s {
            case .create(let kind): CreateGroupSheet(kind: kind) { sheet = .invite($0.id) }
            case .invite(let id): InviteSheet(groupId: id)
            case .enterCode: EnterCodeSheet { sheet = .join($0) }
            case .join(let code): JoinGroupSheet(code: code)
            }
        }
    }
}

struct GroupRow: View {
    let group: LearningGroup

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: group.kind.symbol)
                .foregroundStyle(Palette.green)
                .frame(width: 28)
            VStack(alignment: .leading, spacing: 2) {
                Text(group.name).font(.headline)
                Text("\(group.members.count) of \(group.kind.capacity) members")
                    .font(.footnote)
                    .foregroundStyle(Palette.muted)
            }
        }
    }
}

struct CreateGroupSheet: View {
    let kind: GroupKind
    let created: (LearningGroup) -> Void
    @Environment(GroupStore.self) private var groups
    @Environment(\.dismiss) private var dismiss
    @AppStorage("groups.displayName") private var displayName = ""
    @State private var name = ""
    @State private var error: BucketError?

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    TextField("Name others see", text: $displayName)
                        .textContentType(.givenName)
                } header: {
                    Eyebrow(text: "Your name")
                }
                Section {
                    TextField(kind.label, text: $name)
                } header: {
                    Eyebrow(text: "Group name")
                } footer: {
                    Text(kind == .family ? String(localized: "A family group holds up to 6 people.") : String(localized: "A friends group holds up to 30 people."))
                }
                Section {
                    Button("Create and invite") {
                        Task {
                            let n = name.trimmingCharacters(in: .whitespaces)
                            do {
                                created(try await groups.create(name: String((n.isEmpty ? kind.label : n).prefix(60)), kind: kind, displayName: String(trimmedName.prefix(40))))
                            } catch {
                                self.error = asBucket(error)
                            }
                        }
                    }
                    .buttonStyle(D8Primary())
                    .disabled(groups.busy || trimmedName.isEmpty)
                }
                if let m = groupMessage(error) { Section { Text(m).foregroundStyle(.red) } }
                if groups.busy { Section { ProgressView() } }
            }
            .listRowBackground(Palette.card)
            .paper()
            .navigationTitle(kind.inviteLabel)
            .inlineTitle()
            .toolbar { ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } } }
        }
    }

    var trimmedName: String { displayName.trimmingCharacters(in: .whitespacesAndNewlines) }
}

struct InviteSheet: View {
    let groupId: String
    @Environment(GroupStore.self) private var groups
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            Form {
                if let g = groups.group(groupId) {
                    let page = SharePage.group(g)
                    Section {
                        Text(g.name).font(.serif(.title2, weight: .semibold))
                        Text("Anyone who opens this link can join \(g.name).")
                            .foregroundStyle(Palette.muted)
                        ShareLink(item: page.url, subject: Text(page.title), message: Text(page.title)) {
                            Label("Share invite link", systemImage: "square.and.arrow.up")
                        }
                        .buttonStyle(D8Primary())
                        LabeledContent("Invite code", value: g.code)
                            .font(.body.monospaced())
                            .textSelection(.enabled)
                    } footer: {
                        Text("\(g.members.count) of \(g.kind.capacity) members")
                    }
                }
            }
            .listRowBackground(Palette.card)
            .paper()
            .navigationTitle("Invite")
            .inlineTitle()
            .toolbar { ToolbarItem(placement: .confirmationAction) { Button("Done") { dismiss() } } }
        }
    }
}

struct GroupView: View {
    let groupId: String
    @Environment(GroupStore.self) private var groups
    @Environment(\.dismiss) private var dismiss
    @State private var removing: GroupMember?
    @State private var leaving = false
    @State private var inviting = false
    @State private var resetting = false
    @State private var error: BucketError?
    #if !BUCKET
    @State private var paywall = false
    #endif

    var body: some View {
        Group {
            if let g = groups.group(groupId) {
                content(g).sharePage(SharePage.group(g))
            } else {
                ContentUnavailableView("This group is gone", systemImage: "person.2.slash")
            }
        }
        .paper()
        .refreshable { await groups.load() }
    }

    func content(_ g: LearningGroup) -> some View {
        List {
            Section {
                ForEach(g.members) { m in
                    NavigationLink { MemberView(member: m, groupId: g.id) } label: { MemberRow(member: m) }
                        .swipeActions {
                            if g.isOwner && !m.isMe {
                                Button("Remove", role: .destructive) { removing = m }
                            }
                        }
                        .contextMenu {
                            if g.isOwner && !m.isMe {
                                Button("Remove", systemImage: "person.badge.minus", role: .destructive) { removing = m }
                            }
                        }
                }
            } header: {
                Eyebrow(text: "Members")
            } footer: {
                Text("\(g.members.count) of \(g.kind.capacity) members")
            }
            if g.goal != nil || g.isOwner {
                Section {
                    if let goal = g.goal { GoalBar(name: String(localized: "Weekly goal"), goal: goal) }
                    if g.isOwner { GoalPicker(group: g, error: $error) }
                } header: {
                    Eyebrow(text: "Shared goal")
                } footer: {
                    Text("Every card anyone in the group studies counts toward the goal.")
                }
            }
            Section {
                Button { inviting = true } label: { Label(g.kind.inviteLabel, systemImage: "person.badge.plus") }
                    .disabled(g.isFull)
                if g.isOwner {
                    Button { resetting = true } label: { Label("Reset invite link", systemImage: "arrow.clockwise") }
                }
                Button("Leave group", role: .destructive) { leaving = true }
            } footer: {
                if g.isOwner { Text("Resetting the link stops the old one from working.") }
            }
            #if !BUCKET
            if g.kind == .family {
                Section {
                    Text("Polingual Family covers six people through Apple Family Sharing.")
                    Button("See Polingual Family") { paywall = true }
                } header: {
                    Eyebrow(text: "Polingual Family")
                }
            }
            #endif
            if let m = groupMessage(error) { Section { Text(m).foregroundStyle(.red) } }
        }
        .listRowBackground(Palette.card)
        .scrollContentBackground(.hidden)
        .navigationTitle(g.name)
        .sheet(isPresented: $inviting) { InviteSheet(groupId: g.id) }
        #if !BUCKET
        .sheet(isPresented: $paywall) { Paywall(family: true) }
        #endif
        .confirmationDialog(String(localized: "Remove \(removing?.name ?? "")?"), isPresented: Binding(get: { removing != nil }, set: { if !$0 { removing = nil } }), titleVisibility: .visible) {
            Button("Remove", role: .destructive) {
                if let m = removing { act { try await groups.remove(m.userId, from: g.id) } }
            }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text("They can rejoin only with a new invite link.")
        }
        .confirmationDialog(String(localized: "Reset the invite link?"), isPresented: $resetting, titleVisibility: .visible) {
            Button("Reset link", role: .destructive) { act { try await groups.rotate(g.id) } }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text("Resetting the link stops the old one from working.")
        }
        .confirmationDialog(String(localized: "Leave \(g.name)?"), isPresented: $leaving, titleVisibility: .visible) {
            Button("Leave group", role: .destructive) {
                act {
                    try await groups.leave(g.id)
                    dismiss()
                }
            }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text(g.isOwner && g.members.count > 1 ? String(localized: "The member who joined first becomes the owner.") : String(localized: "You can come back with an invite link."))
        }
    }

    func act(_ work: @escaping () async throws -> Void) {
        Task {
            do {
                try await work()
                error = nil
            } catch {
                self.error = asBucket(error)
            }
        }
    }
}

struct MemberRow: View {
    let member: GroupMember

    var body: some View {
        HStack(spacing: 12) {
            VStack(alignment: .leading, spacing: 4) {
                HStack(spacing: 6) {
                    Text(member.name).font(.headline)
                    if member.isMe { Badge(text: String(localized: "You")) }
                    if member.role == .owner { Badge(text: String(localized: "Owner")) }
                }
                HStack(spacing: 10) {
                    HStack(spacing: 3) {
                        Image(systemName: "flame.fill")
                        Text(member.streak, format: .number)
                    }
                    .foregroundStyle(member.streak > 0 ? D8.vermilion : Palette.muted)
                    .accessibilityLabel(Text("\(member.streak) day streak"))
                    Text("\(member.todayReviews) today")
                        .foregroundStyle(Palette.muted)
                }
                .font(.footnote.weight(.semibold))
            }
            Spacer(minLength: 8)
            HStack(spacing: 3) {
                ForEach(member.languages.prefix(4)) { FlagTile(lang: $0.lang, size: 22) }
            }
        }
        .padding(.vertical, 2)
    }
}

struct Badge: View {
    let text: String

    var body: some View {
        Text(text)
            .font(D8.caps(10))
            .textCase(.uppercase)
            .padding(.horizontal, 6)
            .padding(.vertical, 2)
            .foregroundStyle(Palette.green)
            .overlay { Capsule().strokeBorder(Palette.green.opacity(0.6)) }
    }
}

struct MemberView: View {
    let member: GroupMember
    let groupId: String
    @Environment(GroupStore.self) private var groups
    @State private var comparing = false
    @State private var together: MemberSet?

    var me: GroupMember? { member.isMe ? nil : groups.group(groupId)?.me }

    var graphFirst: Bool {
        #if DEBUG
        DemoGroup.screen == "graph"
        #else
        false
        #endif
    }

    var body: some View {
        List {
            if graphFirst { StrengthGraphSection(groupId: groupId, member: member) }
            Section {
                LabeledContent("Streak", value: String(localized: "\(member.streak) days"))
                LabeledContent("Today", value: String(localized: "\(member.todayReviews) cards"))
                LabeledContent("This week", value: String(localized: "\(member.weekReviews) cards"))
                if let d = member.lastActive {
                    LabeledContent("Last active", value: d.formatted(.relative(presentation: .named)))
                }
            }
            if member.languages.count >= 3 {
                Section {
                    StrengthRadar(spokes: member.languageSpokes, compare: comparing ? me?.languageSpokes : nil)
                        .frame(maxWidth: 340)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 8)
                    if me != nil {
                        Toggle("Compare with me", isOn: $comparing)
                    }
                } header: {
                    Eyebrow(text: "Language strength")
                } footer: {
                    if comparing { Text("Dashed line: you.") }
                }
            }
            Section {
                if member.languages.isEmpty {
                    Text("No languages yet.").foregroundStyle(Palette.muted)
                }
                ForEach(member.languages) { l in
                    HStack(spacing: 12) {
                        FlagTile(lang: l.lang, size: 32)
                        VStack(alignment: .leading, spacing: 4) {
                            Text(langName(l.lang)).font(.headline)
                            Text("\(l.learned) learned · \(l.mastered) mastered")
                                .font(.footnote)
                                .foregroundStyle(Palette.muted)
                            StrengthBar(value: l.shownStrength)
                        }
                    }
                }
            } header: {
                Eyebrow(text: "Languages")
            }
            if !member.sets.isEmpty && !member.isMe {
                Section {
                    ForEach(member.sets) { set in
                        Button { together = set } label: {
                            HStack(spacing: 10) {
                                HStack(spacing: 2) { ForEach(set.targets.prefix(4), id: \.self) { FlagTile(lang: $0, size: 22) } }
                                Text(set.name).font(.headline).foregroundStyle(Palette.ink)
                                Spacer()
                                Text("Learn together").font(.footnote.weight(.semibold))
                            }
                        }
                    }
                } header: {
                    Eyebrow(text: "Language sets")
                }
            }
            RecentWordsSection(member: member)
            if member.subjects.count >= 3 {
                Section {
                    StrengthRadar(spokes: member.subjectSpokes, compare: comparing ? me?.subjectSpokes : nil, tint: D8.lapis, compareTint: D8.vermilion)
                        .frame(maxWidth: 340)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 8)
                } header: {
                    Eyebrow(text: "Subject strength")
                }
            }
            Section {
                if member.subjects.isEmpty {
                    Text("No subjects yet.").foregroundStyle(Palette.muted)
                }
                ForEach(member.subjects) { s in
                    HStack(spacing: 12) {
                        BranchTile(branch: String(s.branch.prefix(2)), size: 32)
                        VStack(alignment: .leading, spacing: 4) {
                            Text(s.title).font(.headline)
                            Text("\(s.started) started · \(s.mastered) mastered")
                                .font(.footnote)
                                .foregroundStyle(Palette.muted)
                            StrengthBar(value: s.shownStrength)
                        }
                    }
                }
            } header: {
                Eyebrow(text: "Subjects")
            }
            if !graphFirst { StrengthGraphSection(groupId: groupId, member: member) }
        }
        .listRowBackground(Palette.card)
        .scrollContentBackground(.hidden)
        .paper()
        .navigationTitle(member.name)
        .sheet(item: $together) { LearnTogetherSheet(set: $0, memberName: member.name) }
    }
}

struct MyStrength: View {
    @Environment(GroupStore.self) private var groups

    var body: some View {
        if let me = groups.me, me.languages.count >= 3 || me.subjects.count >= 3 {
            Section {
                if me.languages.count >= 3 {
                    StrengthRadar(spokes: me.languageSpokes)
                        .frame(maxWidth: 300)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 6)
                }
                if me.subjects.count >= 3 {
                    StrengthRadar(spokes: me.subjectSpokes, tint: D8.lapis)
                        .frame(maxWidth: 300)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 6)
                }
            } header: {
                Eyebrow(text: "Your strength")
            } footer: {
                Text("Each spoke is one language or subject. The farther out, the more you remember right now.")
            }
        }
    }
}

struct JoinGroupSheet: View {
    let code: String
    @Environment(GroupStore.self) private var groups
    @Environment(\.dismiss) private var dismiss
    @AppStorage("groups.displayName") private var displayName = ""
    @State private var preview: GroupPreview?
    @State private var previewError: BucketError?
    @State private var joinError: BucketError?
    @State private var api = BucketAPI()

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    if let p = preview {
                        Label(p.kind.label, systemImage: p.kind.symbol).foregroundStyle(Palette.muted)
                        Text(p.name).font(.serif(.title, weight: .semibold))
                        if let owner = p.owner, !owner.isEmpty {
                            Text("\(owner) invited you. \(p.members) of \(p.kind.capacity) members.")
                                .foregroundStyle(Palette.muted)
                        }
                    } else if previewError == nil {
                        ProgressView()
                    }
                }
                Section {
                    TextField("Name others see", text: $displayName)
                        .textContentType(.givenName)
                } header: {
                    Eyebrow(text: "Your name")
                } footer: {
                    Text("Members see each other's languages and streaks.")
                }
                Section {
                    Button("Join") {
                        Task {
                            do {
                                try await groups.join(code: code, displayName: String(trimmedName.prefix(40)))
                                dismiss()
                            } catch {
                                joinError = asBucket(error)
                            }
                        }
                    }
                    .buttonStyle(D8Primary())
                    .disabled(groups.busy || trimmedName.isEmpty || previewError == .groupNotFound)
                }
                if let m = groupMessage(joinError ?? previewError) { Section { Text(m).foregroundStyle(.red) } }
                if groups.busy { Section { ProgressView() } }
            }
            .listRowBackground(Palette.card)
            .paper()
            .navigationTitle("Join group")
            .inlineTitle()
            .toolbar { ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } } }
            .task {
                do { preview = try await api.groupPreview(code: code) } catch { previewError = error as? BucketError ?? .server(0, nil) }
            }
        }
    }

    var trimmedName: String { displayName.trimmingCharacters(in: .whitespacesAndNewlines) }
}

struct EnterCodeSheet: View {
    let found: (String) -> Void
    @Environment(\.dismiss) private var dismiss
    @State private var text = ""

    var code: String? { GroupInvite.code(text) }

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    TextField("Invite code", text: $text)
                        .font(.body.monospaced())
                        .autocorrectionDisabled()
                        .codeCapitals()
                } footer: {
                    Text("The code is the 10 letters and numbers at the end of the invite link.")
                }
                Section {
                    Button("Continue") { if let code { found(code) } }
                        .buttonStyle(D8Primary())
                        .disabled(code == nil)
                }
            }
            .listRowBackground(Palette.card)
            .paper()
            .navigationTitle("Have an invite code?")
            .inlineTitle()
            .toolbar { ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } } }
        }
    }
}

extension View {
    @ViewBuilder func codeCapitals() -> some View {
        #if os(iOS)
        textInputAutocapitalization(.characters)
        #else
        self
        #endif
    }
}

struct InviteCode: Identifiable, Equatable {
    let id: String
}

struct GroupInviteFlow: ViewModifier {
    @Environment(Account.self) private var account
    @State private var waiting: String?
    @State private var signingIn = false
    @State private var joining: InviteCode?

    func body(content: Content) -> some View {
        content
            .onChange(of: DeepLink.shared.pending, initial: true) { _, link in
                guard case .group(let code) = link else { return }
                DeepLink.shared.pending = nil
                if account.stage == .signedIn {
                    joining = InviteCode(id: code)
                } else {
                    waiting = code
                    signingIn = true
                }
            }
            .onChange(of: account.stage) { _, stage in
                guard stage == .signedIn, let code = waiting else { return }
                waiting = nil
                Task {
                    try? await Task.sleep(for: .milliseconds(600))
                    joining = InviteCode(id: code)
                }
            }
            .sheet(isPresented: $signingIn, onDismiss: {
                if account.stage != .signedIn { waiting = nil }
            }) { SignInSheet() }
            .sheet(item: $joining) { JoinGroupSheet(code: $0.id) }
    }
}

extension View {
    func groupInvites() -> some View { modifier(GroupInviteFlow()) }
}

#if DEBUG
enum DemoGroup {
    static var on: Bool { ProcessInfo.processInfo.arguments.contains("-demoGroup") }

    static var screen: String? {
        let args = ProcessInfo.processInfo.arguments
        guard let i = args.firstIndex(of: "-demoGroup"), i + 1 < args.count, !args[i + 1].hasPrefix("-") else { return nil }
        return args[i + 1]
    }

    static func langs(_ xs: [(String, Int, Int, Double)]) -> [MemberLanguage] {
        xs.map { MemberLanguage(lang: $0.0, learned: $0.1, mastered: $0.2, strength: $0.3) }
    }

    static let subjects = [
        MemberSubject(branch: "01-mathematics", title: "Mathematics", started: 14, mastered: 3, strength: 0.62),
        MemberSubject(branch: "02-physics", title: "Physics", started: 9, mastered: 2, strength: 0.48),
        MemberSubject(branch: "03-chemistry", title: "Chemistry", started: 6, mastered: 1, strength: 0.35),
        MemberSubject(branch: "04-information", title: "Information", started: 4, mastered: 0, strength: 0.22),
    ]

    static let group = LearningGroup(id: "demo", name: "Rossi family", kind: .family, code: "7K3M9QX2PD", role: .owner, members: [
        GroupMember(userId: "u1", name: "Gia Rossi", role: .owner, isMe: true, streak: 12, todayReviews: 34, weekReviews: 160, lastActivity: nil,
                    languages: langs([("it", 420, 160, 0.82), ("es", 196, 44, 0.55), ("fr", 120, 20, 0.4), ("de", 60, 4, 0.2), ("pt", 90, 12, 0.36)]),
                    subjects: subjects),
        GroupMember(userId: "u2", name: "Marco", role: .member, isMe: false, streak: 5, todayReviews: 18, weekReviews: 96, lastActivity: nil,
                    languages: langs([("fr", 310, 120, 0.74), ("de", 140, 30, 0.46), ("it", 80, 10, 0.3), ("es", 220, 70, 0.6), ("pt", 40, 2, 0.15)]),
                    subjects: [
                        MemberSubject(branch: "01-mathematics", title: "Mathematics", started: 20, mastered: 9, strength: 0.71),
                        MemberSubject(branch: "02-physics", title: "Physics", started: 16, mastered: 6, strength: 0.66),
                        MemberSubject(branch: "03-chemistry", title: "Chemistry", started: 3, mastered: 0, strength: 0.18),
                        MemberSubject(branch: "04-information", title: "Information", started: 11, mastered: 4, strength: 0.52),
                    ],
                    recentWords: [
                        RecentWord(lang: "fr", form: "la nuit", gloss: "night", learnedAt: "2026-10-28"),
                        RecentWord(lang: "de", form: "der Apfel", gloss: "apple", learnedAt: "2026-10-28"),
                        RecentWord(lang: "es", form: "el río", gloss: "river", learnedAt: "2026-10-27"),
                    ],
                    sets: [MemberSet(id: "s1", name: "Romance and German", root: "en", targets: ["fr", "es", "de"])]),
        GroupMember(userId: "u3", name: "Nonna Lucia", role: .member, isMe: false, streak: 41, todayReviews: 22, weekReviews: 150, lastActivity: nil,
                    languages: langs([("en", 640, 300, 0.7)]), subjects: []),
        GroupMember(userId: "u4", name: "Sofia", role: .member, isMe: false, streak: 0, todayReviews: 0, weekReviews: 12, lastActivity: nil,
                    languages: langs([("ja", 30, 0, 0.12), ("pt", 12, 0, 0.05), ("zh", 8, 0, 0.04)]), subjects: []),
    ], goal: GroupGoal(weekly: 500, done: 418, weekStart: "2026-10-26"), cheers: [
        Cheer(id: "c1", from: "u3", fromName: "Nonna Lucia", to: "u1", kind: .cheer, at: "2026-10-28", seen: false),
    ])

    static func graph(_ branch: String) -> MemberGraph {
        if branch.hasPrefix("lang-") {
            let words = ["la nuit", "le jour", "l'eau", "le pain", "la mer", "le ciel", "la main", "le temps", "la rue", "le livre", "la porte", "le feu", "la lune", "le vent", "la voix", "le nom", "la vie", "le cœur", "la tête", "le soir", "la ville", "le monde", "la terre", "le chat"]
            return MemberGraph(nodes: words.enumerated().map { i, w in GraphNode(id: w, title: w, strength: Double((i * 37) % 100) / 100) }, edges: [])
        }
        let titles = ["Sets", "Logic", "Numbers", "Functions", "Limits", "Derivatives", "Integrals", "Series", "Vectors", "Matrices", "Proof", "Groups"]
        let nodes = titles.enumerated().map { i, t in GraphNode(id: t, title: t, strength: [0.95, 0.9, 0.85, 0.7, 0.55, 0.4, 0.2, 0.1, 0.75, 0.5, 0.8, 0.3][i]) }
        let edges = [("Sets", "Functions"), ("Logic", "Proof"), ("Numbers", "Functions"), ("Functions", "Limits"), ("Limits", "Derivatives"), ("Derivatives", "Integrals"), ("Limits", "Series"), ("Numbers", "Vectors"), ("Vectors", "Matrices"), ("Proof", "Groups"), ("Sets", "Groups"), ("Matrices", "Groups")]
        return MemberGraph(nodes: nodes, edges: edges.map { GraphEdge(from: $0.0, to: $0.1) })
    }
}
#endif
