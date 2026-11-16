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
            LabeledContent("Your name") {
                VStack(alignment: .trailing, spacing: 2) {
                    Text(shown.isEmpty ? String(localized: "Add") : shown)
                    if let handle = groups.profile?.handle { Text(verbatim: "@\(handle)").font(.footnote).foregroundStyle(Palette.muted) }
                }
            }
        }
        .foregroundStyle(Palette.ink)
        .accessibilityIdentifier("accountName")
        .task { await groups.loadProfile() }
        .sheet(isPresented: $editing) { MemberNameSheet(withUsername: true) }
    }

    var shown: String { MemberName.prefill(stored: stored, current: groups.profile?.displayName ?? groups.me?.name) }
}

struct MemberNameSheet: View {
    var title: LocalizedStringKey = "Your name"
    var withUsername = false
    @Environment(GroupStore.self) private var groups
    @Environment(\.dismiss) private var dismiss
    @AppStorage(MemberName.storedKey) private var stored = ""
    @State private var name = ""
    @State private var username = ""
    @State private var usernameState = UsernameCheck.empty
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
                if withUsername {
                    Section {
                        HStack(spacing: 2) {
                            Text(verbatim: "@").foregroundStyle(Palette.muted)
                            TextField("Username", text: $username)
                                .textContentType(.username)
                                .textInputAutocapitalization(.never)
                                .autocorrectionDisabled()
                                .accessibilityIdentifier("username")
                        }
                    } header: {
                        Text("Username")
                    } footer: {
                        UsernameStatus(state: usernameState)
                    }
                }
                Section {
                    Button("Save") { Task { await save() } }
                        .buttonStyle(D8Primary())
                        .disabled(groups.busy || MemberName.clean(name).isEmpty || (withUsername && !usernameState.savable))
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
        .presentationDetents(withUsername ? [.large] : [.medium])
        .onAppear {
            name = MemberName.prefill(stored: stored, current: groups.profile?.displayName ?? groups.me?.name)
            username = groups.profile?.handle ?? Username.suggest(from: name)
        }
        .task(id: username) {
            guard withUsername else { return }
            usernameState = .checking
            try? await Task.sleep(for: .milliseconds(400))
            guard !Task.isCancelled else { return }
            let next = await groups.check(username: username)
            if !Task.isCancelled { usernameState = next }
        }
    }

    func save() async {
        let clean = MemberName.clean(name)
        guard !clean.isEmpty else { return }
        do {
            if withUsername {
                let p = try await groups.saveName(displayName: clean, username: username)
                stored = p.displayName ?? clean
            } else {
                stored = try await groups.rename(displayName: clean)
            }
            dismiss()
        } catch {
            self.error = asBucket(error)
        }
    }
}

struct UsernameStatus: View {
    let state: UsernameCheck

    var body: some View {
        switch state {
        case .empty, .invalid: Text("3 to 32 lowercase letters, numbers, - or _.")
        case .checking: Text("Checking")
        case .free: Label("Available", systemImage: "checkmark.circle").foregroundStyle(Palette.ink)
        case .yours: Label("Your username", systemImage: "checkmark.circle").foregroundStyle(Palette.ink)
        case .taken: Label("That username is taken. Try another.", systemImage: "xmark.circle").foregroundStyle(.red)
        case .unknown: Text("We check this username when you save.")
        }
    }
}

extension UsernameCheck {
    var savable: Bool { self == .free || self == .yours || self == .unknown }
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
