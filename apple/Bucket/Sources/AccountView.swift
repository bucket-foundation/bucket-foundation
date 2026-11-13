import AuthenticationServices
import BucketKit
import SwiftUI
import UserNotifications

struct AccountView: View {
    @Environment(Account.self) private var account
    @Environment(GroupStore.self) private var groups
    @State private var openGroup: String?
    @State private var openMember: String?
    @State private var confirmingReset = false
    @State private var confirmingDelete = false
    @State private var signingIn = false
    @State private var emailing = false
    var subscription: (() -> Void)?
    var trialDaysLeft: Int?
    var trialReminderOff = false
    #if DEBUG
    @State private var demoShown = false
    #endif

    private static var privacyURL: URL {
        let polingual = Bundle.main.bundleIdentifier == "com.polingual.app"
        return URL(string: polingual ? "https://polingual.com/privacy" : "https://www.bucket.foundation/privacy")!
    }

    var body: some View {
        NavigationStack {
            Form {
                #if !BUCKET
                PLScreenTop(title: "Account", subtitle: "Your progress, saved", stickers: Stickers.account).plListTop()
                #endif
                switch account.stage {
                case .signedOut, .codeSent:
                    Section {
                        AppleSignInButton()
                        Button("Sign in with email") { emailing = true }
                            .buttonStyle(D8Option(align: .center))
                            .disabled(account.busy)
                    } footer: {
                        Text("Sign in with Apple or your email. The same account works on bucket.foundation.")
                    }
                case .signedIn:
                    Section {
                        LabeledContent("Status", value: "Signed in")
                        if let id = account.session?.userId { LabeledContent("Account", value: String(id.prefix(8))) }
                        if !groups.groups.isEmpty { MemberNameRow() }
                        Button("Sign out", role: .destructive) {
                            Beta.shared.signedOut()
                            Task { await account.signOutAfterSync() }
                        }
                    } header: {
                        Eyebrow(text: "Account")
                    }
                }
                if let subscription {
                    Section {
                        if let trialDaysLeft {
                            LabeledContent("Free trial", value: trialDaysLeft == 1 ? String(localized: "1 day left") : String(localized: "\(trialDaysLeft) days left"))
                            if trialReminderOff {
                                Text("Notifications are off, so no reminder comes before the trial ends.").font(.footnote).foregroundStyle(Palette.muted)
                            }
                        }
                        Button("Manage subscription", systemImage: "creditcard", action: subscription)
                    } header: {
                        Eyebrow(text: "Subscription")
                    }
                }
                FamilyAndFriends(signingIn: $signingIn)
                MyStrength()
                ReminderSettings()
                BetaSharing()
                FeedbackSettings()
                #if DEBUG
                Section {
                    Button("Reset to fresh install", role: .destructive) { confirmingReset = true }
                } header: {
                    Eyebrow(text: "Developer")
                }
                #endif
                if let error = account.error {
                    Section { Text(error).foregroundStyle(.red) }
                }
                if account.busy {
                    Section { ProgressView() }
                }
                Section {
                    Link("Privacy and data", destination: Self.privacyURL)
                    LabeledContent("Version", value: Bundle.main.versionLabel)
                } header: {
                    Eyebrow(text: "About")
                } footer: {
                    Text("build the past. build history. bucket is the new renaissance.")
                }
                if account.stage == .signedIn {
                    Section {
                        Button("Delete account", role: .destructive) { confirmingDelete = true }
                    } header: {
                        Text("Danger zone").font(.caption.weight(.heavy)).foregroundStyle(.red)
                    }
                }
            }
            .listRowBackground(Palette.card)
            .paper()
            .navigationTitle("Account")
            #if !BUCKET
            .plChrome()
            #endif
            .navigationDestination(item: $openGroup) { GroupView(groupId: $0) }
            .navigationDestination(item: $openMember) { id in
                if let g = groups.groups.first(where: { $0.members.contains { $0.userId == id } }), let m = g.members.first(where: { $0.userId == id }) {
                    MemberView(member: m, groupId: g.id)
                }
            }
            .task(id: account.stage == .signedIn) {
                #if DEBUG
                if DemoGroup.on {
                    guard !demoShown else { return }
                    demoShown = true
                    groups.groups = [DemoGroup.shown]
                    groups.items[DemoGroup.group.id] = DemoGroup.items
                    groups.donor?.publish(groups.shareTargets, donate: true)
                    switch DemoGroup.screen {
                    case "member", "graph": openMember = "u2"
                    case "account", "joined": break
                    default: openGroup = DemoGroup.group.id
                    }
                    return
                }
                #endif
                if account.stage == .signedIn { await groups.load() } else { groups.clear() }
            }
            .sheet(isPresented: $signingIn) { SignInSheet() }
            #if DEBUG
            .task { if ProcessInfo.processInfo.arguments.contains("-showSignIn") { signingIn = true } }
            #endif
            .sheet(isPresented: $emailing) { SignInSheet(emailOnly: true) }
            .sheet(isPresented: $confirmingDelete) {
                DeleteAccountSheet {
                    Beta.shared.signedOut()
                    Task { await account.deleteAccount() }
                }
            }
            #if DEBUG
            .confirmationDialog("Reset to a fresh install?", isPresented: $confirmingReset, titleVisibility: .visible) {
                Button("Reset and close the app", role: .destructive) { DevReset.run(account) }
                Button("Cancel", role: .cancel) {}
            } message: {
                Text("Signs out on this phone, clears local progress, settings, onboarding and the dev pass, then closes. Your synced account stays on the server.")
            }
            #endif
        }
    }
}

struct DeleteAccountSheet: View {
    @Environment(\.dismiss) private var dismiss
    @State private var typed = ""
    let onDelete: () -> Void

    private var word: String { String(localized: "delete") }
    private var matches: Bool { typed.trimmingCharacters(in: .whitespaces).lowercased() == word.lowercased() }

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    Text("This removes your sign-in and your saved progress and profile from Bucket. It cannot be undone.")
                    TextField(word, text: $typed)
                        .autocorrectionDisabled()
                        .textInputAutocapitalization(.never)
                    Button("Delete account and data", role: .destructive) {
                        dismiss()
                        onDelete()
                    }
                    .disabled(!matches)
                } footer: {
                    Text("Type \(word) to confirm.")
                }
            }
            .listRowBackground(Palette.card)
            .paper()
            .navigationTitle("Delete your account?")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
            }
        }
        .presentationDetents([.medium])
    }
}

struct SignInSheet: View {
    @Environment(Account.self) private var account
    @Environment(\.dismiss) private var dismiss
    @State private var email = ""
    @State private var code = ""
    @FocusState private var focused: Bool
    var emailOnly = false

    var body: some View {
        NavigationStack {
            Form {
                #if !BUCKET
                PLScreenTop(title: "Sign in", subtitle: "Save your streak on every device", stickers: Stickers.signIn).plListTop()
                #endif
                switch account.stage {
                case .signedOut:
                    if !emailOnly {
                        Section {
                            AppleSignInButton()
                        }
                    }
                    Section {
                        TextField("you@school.example", text: $email)
                            .textContentType(.emailAddress)
                            .autocorrectionDisabled()
                            .focused($focused)
                            .emailField()
                        Button("Send code") { Task { await account.sendCode(to: email) } }
                            .buttonStyle(D8Primary())
                            .disabled(account.busy || !email.contains("@"))
                    } header: {
                        Eyebrow(text: emailOnly ? "Email" : "Or use email")
                    } footer: {
                        Text("Bucket emails a one-time code. The same account works on bucket.foundation.")
                    }
                case .codeSent(let to):
                    Section {
                        TextField("Code", text: $code)
                            .textContentType(.oneTimeCode)
                            .focused($focused)
                            .codeField()
                        Button("Verify") { Task { await account.verify(code: code) } }
                            .buttonStyle(D8Primary())
                            .disabled(account.busy || code.filter(\.isNumber).count < 6)
                        Button("Use a different email", role: .cancel) {
                            code = ""
                            account.startOver()
                        }
                    } header: {
                        Eyebrow(text: "Check your email")
                    } footer: {
                        Text("Code sent to \(to).")
                    }
                case .signedIn:
                    Section { Label { Text("Signed in") } icon: { PLGlyphView(.check, size: 18).foregroundStyle(PL.malachite) } }
                }
                if let error = account.error {
                    Section { Text(error).foregroundStyle(.red) }
                }
                if account.busy {
                    Section { ProgressView() }
                }
            }
            .listRowBackground(Palette.card)
            #if BUCKET
            .paper()
            #else
            .scrollContentBackground(.hidden)
            .plGround(.cut(0.78, 0.5))
            .plChrome()
            #endif
            .navigationTitle("Sign in")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
            }
            .onChange(of: account.stage) { _, new in
                if new == .signedIn { dismiss() }
            }
        }
    }
}

struct AppleSignInButton: View {
    @Environment(Account.self) private var account
    @Environment(\.colorScheme) private var scheme
    @State private var nonce: AppleNonce?

    var body: some View {
        SignInWithAppleButton(.signIn) { request in
            let n = AppleNonce.make()
            nonce = n
            request.requestedScopes = [.email]
            request.nonce = n.hashed
        } onCompletion: { result in
            switch result {
            case .failure(let error):
                if (error as? ASAuthorizationError)?.code != .canceled {
                    account.error = String(localized: "Sign in with Apple didn't finish. Try again, or use your email below.")
                }
            case .success(let auth):
                guard let credential = auth.credential as? ASAuthorizationAppleIDCredential,
                      let token = credential.identityToken.flatMap({ String(data: $0, encoding: .utf8) }),
                      let raw = nonce?.raw else {
                    account.error = String(localized: "Apple didn't return a sign-in token. Try again, or use your email below.")
                    return
                }
                account.error = nil
                let code = credential.authorizationCode.flatMap { String(data: $0, encoding: .utf8) }
                Task { await account.signInWithApple(idToken: token, nonce: raw, authorizationCode: code) }
            }
        }
        .signInWithAppleButtonStyle(scheme == .dark ? .white : .black)
        .frame(height: 52)
        .clipShape(.rect(cornerRadius: 12))
        .disabled(account.busy)
    }
}

#if DEBUG
extension Notification.Name {
    static let devReset = Notification.Name("bucket.devReset")
}

enum DevReset {
    @MainActor
    static func run(_ account: Account) {
        NotificationCenter.default.post(name: .devReset, object: nil)
        UNUserNotificationCenter.current().removeAllPendingNotificationRequests()
        if account.stage == .signedIn {
            Beta.shared.signedOut()
            account.signOut()
        }
        if let id = Bundle.main.bundleIdentifier { UserDefaults.standard.removePersistentDomain(forName: id) }
        UserDefaults.standard.synchronize()
        Task {
            try? await Task.sleep(for: .milliseconds(600))
            exit(0)
        }
    }
}
#endif

extension View {
    @ViewBuilder func emailField() -> some View {
        #if os(iOS)
        keyboardType(.emailAddress).textInputAutocapitalization(.never)
        #else
        self
        #endif
    }

    @ViewBuilder func codeField() -> some View {
        #if os(iOS)
        keyboardType(.numberPad)
        #else
        self
        #endif
    }
}

extension Bundle {
    var versionLabel: String {
        let v = infoDictionary?["CFBundleShortVersionString"] as? String ?? "?"
        let b = infoDictionary?["CFBundleVersion"] as? String ?? "?"
        return "\(v) (\(b))"
    }
}

struct BetaSharing: View {
    @Environment(Account.self) private var account
    @AppStorage(BetaEvents.optOutKey) private var optedOut = false

    var body: some View {
        Section {
            Toggle("Share beta activity", isOn: Binding(get: { !optedOut }, set: { on in
                Task { await Beta.shared.events.setOptedOut(!on, token: await account.freshToken()) }
                optedOut = !on
            }))
        } header: {
            Eyebrow(text: "Beta testing")
        } footer: {
            Text("Sessions, cards answered and completions help us improve the app. No location, contacts or device ids. Turning this off deletes what we hold.")
        }
    }
}
