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
                            Text("Base language").font(.caption.weight(.bold)).foregroundStyle(Palette.muted)
                            FlowLayout(spacing: 8) {
                                ForEach(picks.bases, id: \.self) { l in
                                    Chip(title: langName(l), langs: [l], on: l == picks.root) { picks.choose(base: l) }
                                        .accessibilityLabel(Text("Base language") + Text(verbatim: ", \(langName(l))"))
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
            .navigationTitle("Which languages do you speak?")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button(mode == .update ? "Later" : "Cancel") { dismiss() }
                }
            }
        }
        .presentationDetents([.large])
    }

    func save() async {
        saving = true
        defer { saving = false }
        if let codes = picks.codesToSave(over: store.known) { await store.setKnown(codes) }
        chosen(picks.root)
        dismiss()
    }
}

struct KnownLanguagesPrompt: ViewModifier {
    @Environment(LangStore.self) private var store
    @Environment(Account.self) private var account
    @AppStorage(KnownPrompt.askedKey) private var asked = false
    @State private var open = false

    var due: Bool {
        KnownPrompt.due(known: store.known, systems: store.systems, ready: store.status == .ready, signedIn: account.stage == .signedIn, pulled: store.pulled, asked: asked)
    }

    func body(content: Content) -> some View {
        content
            .onChange(of: due, initial: true) { _, now in if now { open = true } }
            .sheet(isPresented: $open, onDismiss: { asked = true }) {
                KnownLanguagesSheet(mode: .update, picks: KnownPrompt.seed(systems: store.systems, device: InterfaceLanguage.deviceRoot))
            }
            #if DEBUG
            .task { if Launch.flag("-knownLanguages") { open = true } }
            #endif
    }
}

extension View {
    func knownLanguagesPrompt() -> some View { modifier(KnownLanguagesPrompt()) }
}
