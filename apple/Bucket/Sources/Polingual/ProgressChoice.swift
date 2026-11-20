import BucketKit
import SwiftUI

@MainActor
@Observable
final class ProgressChoice {
    static let shared = ProgressChoice()
    static let claimTries = 60

    struct Ask: Equatable {
        let device: Int
        let account: Int
    }

    private(set) var ask: Ask?
    @ObservationIgnored private var answer: CheckedContinuation<ProgressKeep, Never>?

    var deciding: Bool { answer != nil }

    func signedIn(_ store: LangStore, account: String) {
        let device = store.deviceCards(account: account)
        Task {
            let keep = await decide(store, device: device)
            await store.syncAfterSignIn(account: account, keep: keep)
        }
    }

    func resync(_ store: LangStore, account: String) async {
        guard !deciding else { return }
        await store.syncAfterSignIn(account: account)
    }

    func decide(_ store: LangStore, device: Int) async -> ProgressKeep {
        guard device > 0, answer == nil, let held = await store.accountCards(), held > 0 else { return .both }
        return await withCheckedContinuation { c in
            answer = c
            ask = Ask(device: device, account: held)
        }
    }

    func choose(_ keep: ProgressKeep) {
        ask = nil
        answer?.resume(returning: keep)
        answer = nil
    }
}

struct ProgressChoicePrompt: ViewModifier {
    @State private var open = false
    private var choice: ProgressChoice { .shared }

    func body(content: Content) -> some View {
        content
            .task(id: choice.ask) {
                guard choice.ask != nil else { return }
                for _ in 0..<ProgressChoice.claimTries {
                    if Task.isCancelled { return }
                    if RootSheets.shared.claim(.progressChoice) { open = true; return }
                    try? await Task.sleep(for: .milliseconds(500))
                }
                choice.choose(.both)
            }
            .sheet(isPresented: $open, onDismiss: { choice.choose(.both) }) {
                if let ask = choice.ask {
                    ProgressChoiceSheet(ask: ask) { keep in
                        choice.choose(keep)
                        open = false
                    }
                }
            }
            .rootSheet(.progressChoice, open: open)
    }
}

struct ProgressChoiceSheet: View {
    let ask: ProgressChoice.Ask
    let pick: (ProgressKeep) -> Void

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    Text("This phone has \(ask.device) words you studied before signing in. Your account has \(ask.account).")
                        .foregroundStyle(Palette.muted)
                    option("Keep both", detail: "Combine them into one.", keep: .both, id: "keepBoth")
                    option("Keep this phone's", detail: "Your account takes this phone's progress in the languages both have.", keep: .device, id: "keepDevice")
                    option("Keep the account's", detail: "This phone's progress from before sign-in is removed.", keep: .account, id: "keepAccount")
                }
                .padding()
            }
            .navigationTitle("Which progress to keep?")
            .navigationBarTitleDisplayMode(.inline)
        }
        .interactiveDismissDisabled()
        .rootSheetProbe()
        .presentationDetents([.medium, .large])
    }

    func option(_ title: LocalizedStringKey, detail: LocalizedStringKey, keep: ProgressKeep, id: String) -> some View {
        Button { pick(keep) } label: {
            VStack(alignment: .leading, spacing: 4) {
                Text(title).font(.headline)
                Text(detail).font(.footnote).foregroundStyle(Palette.muted)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .buttonStyle(D8Option(align: .leading))
        .accessibilityIdentifier(id)
    }
}

extension View {
    func progressChoicePrompt() -> some View { modifier(ProgressChoicePrompt()) }
}
