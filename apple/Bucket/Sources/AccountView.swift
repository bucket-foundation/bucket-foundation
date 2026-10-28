import AuthenticationServices
import BucketKit
import SwiftUI
import UserNotifications

struct AccountView: View {
    @Environment(Account.self) private var account
    @State private var confirmingReset = false
    @State private var confirmingDelete = false
    @State private var signingIn = false

    private static var privacyURL: URL {
        let polingual = Bundle.main.bundleIdentifier == "com.polingual.app"
        return URL(string: polingual ? "https://polingual.com/privacy" : "https://www.bucket.foundation/privacy")!
    }

    var body: some View {
        NavigationStack {
            Form {
                switch account.stage {
                case .signedOut, .codeSent:
                    Section {
                        Button("Sign in") { signingIn = true }
                            .buttonStyle(D8Primary())
                            .disabled(account.busy)
                    } footer: {
                        Text("Sign in with Apple or your email. The same account works on bucket.foundation.")
                    }
                case .signedIn:
                    Section {
                        LabeledContent("Status", value: "Signed in")
                        if let id = account.session?.userId { LabeledContent("Account", value: String(id.prefix(8))) }
                        Button("Sign out", role: .destructive) {
                            Beta.shared.signedOut()
                            Task { await account.signOutAfterSync() }
                        }
                        Button("Delete account", role: .destructive) { confirmingDelete = true }
                    } header: {
                        Eyebrow(text: "Account")
                    }
                }
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
            }
            .listRowBackground(Palette.card)
            .paper()
            .navigationTitle("Account")
            .sheet(isPresented: $signingIn) { SignInSheet() }
            .confirmationDialog("Delete your account?", isPresented: $confirmingDelete, titleVisibility: .visible) {
                Button("Delete account and data", role: .destructive) {
                    Beta.shared.signedOut()
                    Task { await account.deleteAccount() }
                }
                Button("Cancel", role: .cancel) {}
            } message: {
                Text("This removes your sign-in and your saved progress and profile from Bucket. It cannot be undone.")
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

struct SignInSheet: View {
    @Environment(Account.self) private var account
    @Environment(\.dismiss) private var dismiss
    @Environment(\.colorScheme) private var scheme
    @State private var email = ""
    @State private var code = ""
    @FocusState private var focused: Bool
    @State private var nonce: AppleNonce?

    var body: some View {
        NavigationStack {
            Form {
                switch account.stage {
                case .signedOut:
                    Section {
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
                        Eyebrow(text: "Or use email")
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
                    Section { Label("Signed in", systemImage: "checkmark.circle.fill") }
                }
                if let error = account.error {
                    Section { Text(error).foregroundStyle(.red) }
                }
                if account.busy {
                    Section { ProgressView() }
                }
            }
            .listRowBackground(Palette.card)
            .paper()
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
