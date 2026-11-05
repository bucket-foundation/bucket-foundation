import SwiftUI
import BucketKit

struct AgeRangeSheet: View {
    @Environment(Account.self) private var account
    @Environment(LangStore.self) private var langs
    @Environment(GroupStore.self) private var groups
    @Environment(\.dismiss) private var dismiss
    @State private var saving = false
    @State private var failed = false

    var body: some View {
        NavigationStack {
            VStack(alignment: .leading, spacing: 16) {
                Text("Choose your age range so your progress saves to your account and your group can see your stats.")
                    .foregroundStyle(Palette.muted)
                ForEach(AgeBand.allCases, id: \.self) { band in
                    Button {
                        Task { await choose(band) }
                    } label: {
                        Text(band.label).frame(maxWidth: .infinity)
                    }
                    .buttonStyle(.bordered)
                    .controlSize(.large)
                    .disabled(saving)
                }
                if failed {
                    Text("That did not save. Check your connection and try again.").font(.footnote).foregroundStyle(.red)
                }
                Spacer()
            }
            .padding()
            .navigationTitle("Your age range")
            .toolbar { ToolbarItem(placement: .cancellationAction) { Button("Later") { dismiss() } } }
        }
        .presentationDetents([.medium])
    }

    func choose(_ band: AgeBand) async {
        saving = true
        defer { saving = false }
        guard await account.setAgeBand(band) else { failed = true; return }
        await langs.syncAfterSignIn()
        await langs.flush()
        await groups.load()
        dismiss()
    }
}

struct AgeRangePrompt: ViewModifier {
    @Environment(LangStore.self) private var langs
    @State private var open = false
    @State private var asked = false

    func body(content: Content) -> some View {
        content
            .onChange(of: langs.saveState) { _, s in ask(s) }
            .onReceive(NotificationCenter.default.publisher(for: .askAgeRange)) { _ in open = true }
            .sheet(isPresented: $open) { AgeRangeSheet() }
    }

    func ask(_ s: SaveResult) {
        guard s == .needsProfile, !asked else { return }
        asked = true
        open = true
    }
}

extension Notification.Name {
    static let askAgeRange = Notification.Name("askAgeRange")
}

extension View {
    func ageRangePrompt() -> some View { modifier(AgeRangePrompt()) }
}
