import BucketKit
import SwiftUI

extension CheerReaction {
    var label: String {
        switch self {
        case .highFive: String(localized: "High five")
        case .niceStreak: String(localized: "Nice streak")
        case .raceYou: String(localized: "Race you")
        case .keepGoing: String(localized: "Keep going")
        }
    }

    var symbol: String {
        switch self {
        case .highFive: "hand.wave.fill"
        case .niceStreak: "flame.fill"
        case .raceYou: "figure.run"
        case .keepGoing: "bolt.fill"
        }
    }

    var face: Color {
        switch self {
        case .highFive: D8.malachite
        case .niceStreak: D8.vermilion
        case .raceYou: D8.lapis
        case .keepGoing: Color(hex: 0x5B1A4A)
        }
    }
}

extension Cheer {
    var line: String {
        switch reaction {
        case .highFive: String(localized: "\(fromName) sent you a high five.")
        case .niceStreak: String(localized: "\(fromName) says nice streak.")
        case .raceYou: String(localized: "\(fromName) wants to race you this week.")
        case .keepGoing: String(localized: "\(fromName) says keep going.")
        case nil: kind == .cheer ? String(localized: "\(fromName) cheered you on.") : String(localized: "\(fromName) nudged you to study today.")
        }
    }

    var symbol: String { reaction?.symbol ?? (kind == .cheer ? "hands.clap.fill" : "bell.fill") }
}

struct StandingTile: View {
    let standing: GroupStanding

    var member: GroupMember { standing.member }
    var ink: Color { member.isMe ? D8.parchment : Palette.ink }
    var soft: Color { member.isMe ? D8.parchment.opacity(0.85) : Palette.muted }

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(spacing: 8) {
                Avatar(member: member, size: 40)
                Spacer(minLength: 0)
                Text("#\(standing.rank)").font(D8.word(22)).foregroundStyle(ink)
            }
            Text(member.isMe ? String(localized: "You") : member.name)
                .font(D8.word(18))
                .foregroundStyle(ink)
                .lineLimit(1)
                .minimumScaleFactor(0.7)
            VStack(alignment: .leading, spacing: 3) {
                stat("checkmark.circle.fill", String(localized: "\(member.weekReviews) this week"))
                stat("flame.fill", String(localized: "\(member.streak) day streak"))
                stat("star.fill", String(localized: "\(member.wordsMastered) mastered"))
            }
            HStack(spacing: 3) {
                ForEach(member.languages.prefix(4)) { FlagTile(lang: $0.lang, size: 22) }
                if member.languages.count > 4 {
                    Text(verbatim: "+\(member.languages.count - 4)").font(.caption2.weight(.bold)).foregroundStyle(soft)
                }
            }
            .frame(height: 24)
        }
        .padding(12)
        .frame(maxWidth: .infinity, alignment: .leading)
        .modifier(GameLip(face: member.isMe ? D8.lapis : D8.face, lip: member.isMe ? Color(hex: 0x12326A) : D8.edge))
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(Text(summary))
    }

    func stat(_ symbol: String, _ text: String) -> some View {
        HStack(spacing: 5) {
            Image(systemName: symbol).frame(width: 14)
            Text(text).lineLimit(1).minimumScaleFactor(0.7)
        }
        .font(.caption.weight(.semibold))
        .foregroundStyle(soft)
    }

    var summary: String {
        member.isMe
            ? String(localized: "You, rank \(standing.rank), \(member.weekReviews) cards this week, \(member.streak) day streak, \(member.wordsMastered) words mastered")
            : String(localized: "\(member.name), rank \(standing.rank), \(member.weekReviews) cards this week, \(member.streak) day streak, \(member.wordsMastered) words mastered")
    }
}

struct StandingsSection: View {
    let group: LearningGroup
    @Binding var opening: String?
    @Binding var removing: GroupMember?
    @Binding var reporting: ModerationTarget?
    @Binding var blocking: ModerationTarget?

    var body: some View {
        Section {
            LazyVGrid(columns: learnColumns, spacing: 14) {
                ForEach(group.standings) { s in
                    Button { opening = s.member.userId } label: { StandingTile(standing: s) }
                        .buttonStyle(.plain)
                        .contextMenu { actions(s.member) }
                }
            }
            .listRowBackground(Color.clear)
            .listRowInsets(EdgeInsets(top: 4, leading: 0, bottom: 4, trailing: 0))
            .listRowSeparator(.hidden)
            if group.members.count > 1 {
                ShareObjectButton(.standings(group.shareStandings()), wide: true)
                    .listRowBackground(Color.clear)
                    .listRowInsets(EdgeInsets(top: 4, leading: 0, bottom: 4, trailing: 0))
                    .listRowSeparator(.hidden)
            }
        } header: {
            Eyebrow(text: "This week")
        }
    }

    @ViewBuilder func actions(_ m: GroupMember) -> some View {
        if group.isOwner && !m.isMe {
            Button("Remove", systemImage: "person.badge.minus", role: .destructive) { removing = m }
        }
        if !m.isMe {
            Button("Report", systemImage: "flag") { reporting = ModerationTarget(member: m, groupId: group.id) }
            Button("Block", systemImage: "hand.raised", role: .destructive) { blocking = ModerationTarget(member: m, groupId: group.id) }
        }
    }
}

struct ReactionSection: View {
    let group: LearningGroup
    @State private var picked: String?

    var others: [GroupMember] { group.standings.map(\.member).filter { !$0.isMe } }

    var body: some View {
        if let target = others.first(where: { $0.userId == picked }) ?? others.first {
            Section {
                if others.count > 1 {
                    Picker("Send to", selection: Binding(get: { target.userId }, set: { picked = $0 })) {
                        ForEach(others) { Text($0.name).tag($0.userId) }
                    }
                    .pickerStyle(.menu)
                }
                ReactionRow(member: target, groupId: group.id).id(target.userId)
            } header: {
                Eyebrow(text: "Send a reaction")
            } footer: {
                Text("Reactions are presets. Blocking someone stops them.")
            }
        }
    }
}

struct ReactionRow: View {
    let member: GroupMember
    let groupId: String
    @Environment(GroupStore.self) private var groups
    @State private var sent: CheerReaction?
    @State private var note: String?

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(alignment: .top, spacing: 8) {
                ForEach(CheerReaction.allCases, id: \.self) { r in
                    Button { Task { await send(r) } } label: { face(r) }
                        .buttonStyle(.plain)
                        .disabled(sent != nil || groups.busy)
                        .accessibilityLabel(Text("\(r.label) to \(member.name)"))
                        .accessibilityIdentifier("reaction-\(r.rawValue)")
                }
            }
            if let note { Text(note).font(.footnote).foregroundStyle(Palette.muted) }
        }
        .padding(.vertical, 4)
    }

    func face(_ r: CheerReaction) -> some View {
        VStack(spacing: 4) {
            Image(systemName: sent == r ? "checkmark" : r.symbol).font(.title3.weight(.bold))
            Text(r.label)
                .font(.caption2.weight(.bold))
                .multilineTextAlignment(.center)
                .lineLimit(2, reservesSpace: true)
                .minimumScaleFactor(0.8)
        }
        .foregroundStyle(D8.parchment)
        .padding(.vertical, 8)
        .padding(.horizontal, 4)
        .frame(maxWidth: .infinity)
        .modifier(GameLip(face: r.face, lip: r.face.mix(with: .black, by: 0.3), radius: 12))
        .opacity(sent == nil || sent == r ? 1 : 0.5)
    }

    func send(_ r: CheerReaction) async {
        #if DEBUG
        if DemoGroup.on {
            sent = r
            return
        }
        #endif
        do {
            try await groups.react(r, to: member, in: groupId)
            sent = r
            haptic(true)
            note = nil
        } catch {
            note = error == .groupNotFound ? String(localized: "They are no longer in this group.") : groupMessage(error)
            if error == .groupNotFound { await groups.load() }
        }
    }
}
