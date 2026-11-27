import BucketKit
import SwiftUI

struct ProgressChoicePrompt: ViewModifier {
    static let showSeconds = 2.0
    static let maxMisses = 30
    @State private var open = false
    @State private var shown = false
    private var choice: ProgressChoice { .shared }

    func body(content: Content) -> some View {
        content
            .task(id: choice.ask) {
                guard choice.ask != nil else { return }
                var misses = 0
                while !Task.isCancelled, choice.ask != nil {
                    if RootSheets.shared.claim(.progressChoice) {
                        shown = false
                        open = true
                        try? await Task.sleep(for: .seconds(ProgressChoicePrompt.showSeconds))
                        if shown || Task.isCancelled { return }
                        open = false
                        misses += 1
                        if misses >= ProgressChoicePrompt.maxMisses { choice.choose(.both); return }
                    }
                    try? await Task.sleep(for: .milliseconds(500))
                }
            }
            .sheet(isPresented: $open, onDismiss: { if shown { choice.choose(.both) } }) {
                if let ask = choice.ask {
                    ProgressChoiceSheet(ask: ask) { keep in
                        choice.choose(keep)
                        open = false
                    }
                    .onAppear { shown = true }
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
                        .foregroundStyle(PL.inkDim)
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
                Text(title).font(PL.text(17, .bold))
                Text(detail).font(PL.text(13)).foregroundStyle(PL.inkDim)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .buttonStyle(PLOption(align: .leading))
        .accessibilityIdentifier(id)
    }
}

extension View {
    func progressChoicePrompt() -> some View { modifier(ProgressChoicePrompt()) }
}
