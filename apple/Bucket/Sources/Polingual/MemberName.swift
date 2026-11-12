import BucketKit
import SwiftUI

enum MemberName {
    static let storedKey = "groups.displayName"
    static let askedKey = "groups.nameAsked"

    static func ask(signedIn: Bool, loaded: Bool, unchosen: Bool, asked: Bool) -> Bool {
        signedIn && loaded && unchosen && !asked
    }

    static func prefill(stored: String, current: String?) -> String {
        let saved = clean(stored)
        return saved.isEmpty ? clean(current ?? "") : saved
    }

    static func clean(_ s: String) -> String {
        String(s.split(whereSeparator: \.isWhitespace).joined(separator: " ").prefix(40))
    }
}

struct MemberNameRow: View {
    @Environment(GroupStore.self) private var groups
    @AppStorage(MemberName.storedKey) private var stored = ""
    @State private var editing = false

    var body: some View {
        Button { editing = true } label: {
            LabeledContent("Your name", value: shown)
        }
        .foregroundStyle(Palette.ink)
        .sheet(isPresented: $editing) { MemberNameSheet() }
    }

    var shown: String { MemberName.prefill(stored: stored, current: groups.me?.name) }
}

struct MemberNameSheet: View {
    var title: LocalizedStringKey = "Your name"
    @Environment(GroupStore.self) private var groups
    @Environment(\.dismiss) private var dismiss
    @AppStorage(MemberName.storedKey) private var stored = ""
    @State private var name = ""
    @State private var error: BucketError?

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    TextField("Name others see", text: $name)
                        .textContentType(.givenName)
                        .submitLabel(.done)
                        .onSubmit { Task { await save() } }
                } footer: {
                    Text("Your groups see this name next to your streak and cheers.")
                }
                Section {
                    Button("Save") { Task { await save() } }
                        .buttonStyle(D8Primary())
                        .disabled(groups.busy || MemberName.clean(name).isEmpty)
                }
                if let m = groupMessage(error) { Section { Text(m).foregroundStyle(.red) } }
                if groups.busy { Section { ProgressView() } }
            }
            .listRowBackground(Palette.card)
            .paper()
            .navigationTitle(title)
            .inlineTitle()
            .toolbar { ToolbarItem(placement: .cancellationAction) { Button("Not now") { dismiss() } } }
        }
        .presentationDetents([.medium])
        .onAppear {
            name = MemberName.prefill(stored: stored, current: groups.me?.name)
        }
    }

    func save() async {
        let clean = MemberName.clean(name)
        guard !clean.isEmpty else { return }
        do {
            stored = try await groups.rename(displayName: clean)
            dismiss()
        } catch {
            self.error = asBucket(error)
        }
    }
}

struct MemberNamePrompt: ViewModifier {
    @Environment(Account.self) private var account
    @Environment(GroupStore.self) private var groups
    @AppStorage(MemberName.askedKey) private var asked = false
    @State private var open = false

    func body(content: Content) -> some View {
        content
            .onChange(of: due, initial: true) { _, now in
                guard now else { return }
                asked = true
                open = true
            }
            .sheet(isPresented: $open) { MemberNameSheet(title: "What should your group call you?") }
    }

    var due: Bool {
        MemberName.ask(signedIn: account.stage == .signedIn, loaded: groups.loaded, unchosen: groups.needsName, asked: asked)
    }
}

extension View {
    func memberNamePrompt() -> some View { modifier(MemberNamePrompt()) }
}
