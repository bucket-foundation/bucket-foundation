import BucketKit
import SwiftUI

private struct AccountHostKey: EnvironmentKey {
    static let defaultValue: AccountHost? = nil
}

extension EnvironmentValues {
    var accountHost: AccountHost? {
        get { self[AccountHostKey.self] }
        set { self[AccountHostKey.self] = newValue }
    }
}

struct AccountsSection: View {
    let host: AccountHost

    var body: some View {
        Section {
            ForEach(host.choices) { choice in
                Button {
                    Task { await host.open(choice.userId) }
                } label: {
                    HStack(spacing: 12) {
                        Text(choice.initial)
                            .font(.headline.weight(.heavy))
                            .foregroundStyle(.white)
                            .frame(width: 32, height: 32)
                            .background(Circle().fill(PL.tyrian))
                            .accessibilityHidden(true)
                        Group {
                            if choice.label.isEmpty { Text("Account \(choice.shortId)") } else { Text(verbatim: choice.label) }
                        }
                        .foregroundStyle(Palette.ink)
                        Spacer(minLength: 8)
                        if choice.active { PLGlyphView(.check, size: 18).foregroundStyle(PL.tyrian) }
                    }
                    .frame(minHeight: 44)
                    .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
                .disabled(host.switching || choice.active)
                .accessibilityAddTraits(choice.active ? .isSelected : [])
                .accessibilityIdentifier("account.\(choice.shortId)")
            }
            if host.canAdd {
                Button("Add account") { Task { await host.add() } }
                    .frame(minHeight: 44)
                    .disabled(host.switching)
                    .accessibilityIdentifier("account.add")
            }
            if host.switching { ProgressView().frame(maxWidth: .infinity) }
        } header: {
            Eyebrow(text: "Accounts")
        } footer: {
            Text("Up to \(AccountIndex.cap) accounts on this device. Each keeps its own progress.")
        }
        .onAppear { host.refresh() }
    }
}
