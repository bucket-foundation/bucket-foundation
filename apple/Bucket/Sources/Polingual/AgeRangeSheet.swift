import SwiftUI
import BucketKit

struct AgeRangeSheet: View {
    @Environment(Account.self) private var account
    @Environment(LangStore.self) private var langs
    @Environment(GroupStore.self) private var groups
    @Environment(\.dismiss) private var dismiss
    @State private var saving = false
    @State private var failed = false
    @State private var askParent = false
    @State private var parentEmail = ""
    @State private var emailed = false

    var body: some View {
        NavigationStack {
            VStack(alignment: .leading, spacing: 16) {
                if emailed {
                    Text("We emailed your parent. Your progress saves once they approve.")
                    Button("Done") { dismiss() }.buttonStyle(D8Primary())
                } else if askParent {
                    Text("Enter a parent's email. We ask them to approve saving your progress.")
                        .foregroundStyle(Palette.muted)
                    TextField("Parent's email", text: $parentEmail)
                        .textContentType(.emailAddress)
                        .keyboardType(.emailAddress)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                        .textFieldStyle(.roundedBorder)
                    Button {
                        Task { await sendParent() }
                    } label: {
                        Text("Send")
                    }
                    .buttonStyle(D8Primary())
                    .disabled(saving || !parentEmail.contains("@"))
                } else {
                    Text("Choose your age range so your progress saves to your account and your group can see your stats.")
                        .foregroundStyle(Palette.muted)
                    ForEach(AgeBand.allCases, id: \.self) { band in
                        Button {
                            Task { await choose(band) }
                        } label: {
                            Text(band.label)
                        }
                        .buttonStyle(D8Option(align: .center))
                        .disabled(saving)
                    }
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
        if band == .child { askParent = true; return }
        await langs.syncAfterSignIn()
        await langs.flush()
        await groups.load()
        dismiss()
    }

    func sendParent() async {
        saving = true
        defer { saving = false }
        failed = false
        guard await account.requestParentConsent(email: parentEmail.trimmingCharacters(in: .whitespaces)) else { failed = true; return }
        emailed = true
    }
}

struct AgeRangePrompt: ViewModifier {
    @State private var open = false

    func body(content: Content) -> some View {
        content
            .onReceive(NotificationCenter.default.publisher(for: .askAgeRange)) { _ in open = true }
            .sheet(isPresented: $open) { AgeRangeSheet() }
            #if DEBUG
            .task { if Launch.flag("-ageRange") { open = true } }
            #endif
    }
}

extension Notification.Name {
    static let askAgeRange = Notification.Name("askAgeRange")
}

extension View {
    func ageRangePrompt() -> some View { modifier(AgeRangePrompt()) }
}
