import BucketKit
import SwiftUI

struct KnownLanguagesSheet: View {
    enum Mode { case update, settings }

    @Environment(LangStore.self) private var store
    @Environment(\.dismiss) private var dismiss
    @Environment(\.accessibilityReduceMotion) private var still
    let mode: Mode
    @State var picks: KnownPicks
    var chosen: (String) -> Void = { _ in }
    @State private var saving = false

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 14) {
                    Text("Which languages do you speak?")
                        .font(PL.title.font(scale: 0.94))
                        .foregroundStyle(PL.ink)
                        .accessibilityAddTraits(.isHeader)
                        .fixedSize(horizontal: false, vertical: true)
                    Text("Pick every one you can hold a conversation in.")
                        .foregroundStyle(Palette.muted)
                        .fixedSize(horizontal: false, vertical: true)
                    FlowLayout(spacing: 8) {
                        ForEach(KnownLanguages.speakable(device: picks.device), id: \.self) { l in
                            Chip(title: langName(l), langs: [l], on: picks.known.codes.contains(l)) {
                                picks.toggle(l, at: Date.now.timeIntervalSince1970 * 1000)
                            }
                        }
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    if picks.bases.count > 1 {
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Learn from").font(.caption.weight(.bold)).foregroundStyle(Palette.muted)
                            Text("Meanings and hints show in this language.")
                                .font(.caption)
                                .foregroundStyle(Palette.muted)
                                .fixedSize(horizontal: false, vertical: true)
                            FlowLayout(spacing: 8) {
                                ForEach(picks.bases, id: \.self) { l in
                                    Chip(title: langName(l), langs: [l], on: l == picks.root) { picks.choose(base: l) }
                                        .accessibilityLabel(Text("Learn from") + Text(verbatim: ", \(langName(l))"))
                                }
                            }
                        }
                        .transition(.opacity)
                    }
                }
                .padding()
                .animation(still ? nil : .spring(duration: 0.3), value: picks.bases)
            }
            .background(Palette.paper.ignoresSafeArea())
            .safeAreaInset(edge: .bottom) {
                Button("Done") { Task { await save() } }
                    .buttonStyle(D8Primary())
                    .disabled(!picks.ready || saving)
                    .padding()
                    .background(Palette.paper)
            }
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button(mode == .update ? "Later" : "Cancel") { dismiss() }
                        .accessibilityIdentifier("knownLanguagesLater")
                }
            }
        }
        .rootSheetProbe()
        .presentationDetents([.large])
    }

    func save() async {
        saving = true
        defer { saving = false }
        let changed = picks.codesToSave(over: store.known)
        if let changed { await store.setKnown(changed) }
        if mode == .update || changed != nil { Beta.shared.knownLanguagesSet(store.known, source: mode == .update ? .updateSheet : .settings) }
        chosen(picks.root)
        dismiss()
    }
}

struct KnownLanguagesPrompt: ViewModifier {
    @Environment(LangStore.self) private var store
    @Environment(Account.self) private var account
    @Environment(\.scenePhase) private var phase
    @AppStorage(KnownPrompt.askedKey) private var askedOwners = ""
    let busy: Bool
    @State private var open = false
    @State private var shown = false

    var owner: String? { account.session?.userId }

    var known: KnownLanguages {
        #if DEBUG
        if Launch.flag("-knownBlank") { return KnownLanguages([]) }
        #endif
        return store.known
    }

    var covered: Bool { RootSheets.shared.covered(besides: .knownLanguages) }

    var wanted: Bool {
        KnownPrompt.due(
            known: known, systems: store.systems, ready: store.status == .ready, signedIn: account.stage == .signedIn, pulled: store.pulled,
            asked: KnownPrompt.asked(askedOwners, owner: owner), busy: busy
        )
    }

    var due: Bool { wanted && !covered }

    func body(content: Content) -> some View {
        content
            .task(id: Offer(due: due, active: phase == .active)) {
                var attempts = 0
                try? await Task.sleep(for: .seconds(KnownPrompt.settleSeconds))
                if Task.isCancelled { return }
                while due, phase == .active, !shown, !Task.isCancelled, KnownPrompt.retries(after: attempts) {
                    let claimed = RootSheets.shared.claim(.knownLanguages)
                    attempts = RootSheets.attempts(attempts, claimed: claimed)
                    if claimed {
                        open = true
                        try? await Task.sleep(for: .seconds(KnownPrompt.offerSeconds))
                        if shown { return }
                        open = false
                    }
                    if Task.isCancelled { return }
                    try? await Task.sleep(for: .seconds(KnownPrompt.retrySeconds))
                }
            }
            .sheet(isPresented: $open, onDismiss: {
                if shown { askedOwners = KnownPrompt.marking(askedOwners, owner: owner) }
                shown = false
            }) {
                KnownLanguagesSheet(mode: .update, picks: KnownPrompt.seed(systems: store.systems, device: InterfaceLanguage.deviceRoot))
                    .onAppear { shown = true }
            }
            .rootSheet(.knownLanguages, open: open)
            .onChange(of: wanted && covered, initial: true) { _, waiting in RootSheets.shared.hold(.knownLanguages, waiting) }
            #if DEBUG
            .task { if Launch.flag("-knownLanguages") { open = true } }
            #endif
    }
}

private struct Offer: Hashable {
    let due: Bool
    let active: Bool
}

extension View {
    func knownLanguagesPrompt(busy: Bool) -> some View { modifier(KnownLanguagesPrompt(busy: busy)) }
}
