import BucketKit
import SwiftUI

struct SharedItemsSection: View {
    let group: LearningGroup
    @Binding var blocking: ModerationTarget?
    @Environment(GroupStore.self) private var groups
    @State private var reporting: SharedItem?
    @State private var removing: SharedItem?
    @State private var reported = false
    @State private var failure: String?

    var list: [SharedItem] { groups.items[group.id] ?? [] }

    var body: some View {
        Section {
            VoiceNoteComposer(group: group)
            if list.isEmpty {
                Text("Tap Share in any app and pick \(group.name) to send a link, a photo or a note here.")
                    .font(.callout)
                    .foregroundStyle(Palette.muted)
            }
            ForEach(list) { item in
                SharedItemRow(item: item, to: recipient(item))
                    .swipeActions { actions(item) }
                    .contextMenu { actions(item) }
                    .accessibilityActions { actions(item) }
            }
        } header: {
            Eyebrow(text: "Shared")
        } footer: {
            if !list.isEmpty { Text("Report anything that breaks the group rules. We review every report.") }
        }
        .task(id: group.id) {
            #if DEBUG
            if DemoGroup.on { return }
            #endif
            await groups.loadItems(group.id)
        }
        .confirmationDialog(String(localized: "Report this item?"), isPresented: Binding(get: { reporting != nil }, set: { if !$0 { reporting = nil } }), titleVisibility: .visible, presenting: reporting) { item in
            ForEach(ReportReason.allCases.filter { $0 != .offensiveName }, id: \.self) { reason in
                Button(reason.label) { act { try await groups.reportItem(item, reason: reason); reported = true } }
            }
            Button("Offensive content") { act { try await groups.reportItem(item, reason: .offensiveName); reported = true } }
            Button("Cancel", role: .cancel) {}
        } message: { _ in
            Text("The item disappears for you now. We review the report.")
        }
        .confirmationDialog(String(localized: "Remove this item?"), isPresented: Binding(get: { removing != nil }, set: { if !$0 { removing = nil } }), titleVisibility: .visible, presenting: removing) { item in
            Button("Remove", role: .destructive) { act { try await groups.removeItem(item) } }
            Button("Cancel", role: .cancel) {}
        } message: { _ in
            Text("It disappears for everyone in the group.")
        }
        .alert("Report sent", isPresented: $reported) {
            Button("OK", role: .cancel) {}
        } message: {
            Text("We will review this report and act on it.")
        }
        .alert("That did not work", isPresented: Binding(get: { failure != nil }, set: { if !$0 { failure = nil } }), presenting: failure) { _ in
            Button("OK", role: .cancel) {}
        } message: { Text($0) }
    }

    @ViewBuilder
    func actions(_ item: SharedItem) -> some View {
        ForEach(Array(item.actions(in: group).enumerated()), id: \.offset) { _, action in
            switch action {
            case .remove:
                Button("Remove", systemImage: "trash", role: .destructive) { removing = item }
            case .report:
                Button("Report", systemImage: "flag") { reporting = item }.tint(Palette.muted)
            case .block(let m):
                Button("Block", systemImage: "hand.raised") { blocking = ModerationTarget(member: m, groupId: group.id) }.tint(D8.vermilion)
            }
        }
    }

    func recipient(_ item: SharedItem) -> String? {
        item.to.flatMap { id in group.members.first { $0.userId == id }?.firstName }
    }

    func act(_ work: @escaping () async throws -> Void) {
        Task {
            #if DEBUG
            if DemoGroup.on {
                if let item = reporting ?? removing { groups.items[group.id]?.removeAll { $0.id == item.id } }
                return
            }
            #endif
            do { try await work() } catch { failure = shareMessage(asBucket(error)) }
        }
    }
}

func shareMessage(_ e: BucketError) -> String {
    switch e {
    case .shareLimit: String(localized: "You shared a lot just now. Try again in an hour.")
    case .textNotAllowed: String(localized: "That text is not allowed. Try other words.")
    case .imageTooLarge: String(localized: "That image is too large to share.")
    case .imageNotAllowed: String(localized: "This image may be sensitive, so it was not sent.")
    case .voiceTooLong: String(localized: "Voice notes can be up to 60 seconds.")
    default: groupMessage(e) ?? String(localized: "Something went wrong. Try again.")
    }
}

struct SharedItemRow: View {
    let item: SharedItem
    let to: String?

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack(spacing: 6) {
                Text(item.mine ? String(localized: "You") : item.fromName).font(.subheadline.weight(.semibold))
                if let to {
                    Image(systemName: "arrow.right").font(.caption2).foregroundStyle(Palette.muted)
                    Text(to).font(.subheadline).foregroundStyle(Palette.muted)
                }
                Spacer(minLength: 8)
                if let at = item.sentAt { Text(at, style: .relative).font(.caption).foregroundStyle(Palette.muted) }
            }
            switch item.kind {
            case .url:
                if let link = item.link {
                    Link(destination: link) {
                        Label(link.host() ?? link.absoluteString, systemImage: "link").font(.callout.weight(.semibold)).lineLimit(1)
                    }
                    Text(link.absoluteString).font(.caption.monospaced()).foregroundStyle(Palette.muted).lineLimit(2)
                }
                if let text = item.text { Text(text).font(.callout) }
            case .text:
                Text(item.text ?? "").font(.callout)
            case .image:
                AsyncImage(url: item.image) { image in
                    image.resizable().scaledToFit()
                } placeholder: {
                    RoundedRectangle(cornerRadius: 8).fill(Palette.card).frame(height: 120)
                }
                .frame(maxHeight: 220)
                .clipShape(RoundedRectangle(cornerRadius: 8))
                if let text = item.text { Text(text).font(.callout) }
            case .voice:
                VoiceNoteBody(item: item)
            }
        }
        .padding(.vertical, 2)
        .accessibilityElement(children: item.kind == .voice ? .contain : .combine)
    }
}
