import BucketKit
import SwiftUI

enum SaveProgress {
    static let key = SaveNudge.key

    static func offer(signedIn: Bool) -> Bool { !signedIn }

    static func shown(pending: Bool, signedIn: Bool) -> Bool {
        pending && !signedIn
    }
}

struct SaveProgressSheet: View {
    @Environment(Account.self) private var account
    @Environment(\.dismiss) private var dismiss
    @State private var emailing = false

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 18) {
                PoMark()
                Text("Save your progress")
                    .font(.system(size: 34, weight: .heavy, design: .rounded))
                    .foregroundStyle(Palette.ink)
                    .fixedSize(horizontal: false, vertical: true)
                Text("Sign in so your words, streak and scores stay with you.")
                    .font(.body)
                    .foregroundStyle(Palette.muted)
                    .fixedSize(horizontal: false, vertical: true)
                VStack(alignment: .leading, spacing: 14) {
                    PlanLine(icon: "arrow.triangle.2.circlepath", text: "Progress syncs across iPhone, iPad and Mac")
                    PlanLine(icon: "iphone.gen3", text: "A new phone picks up where you left off")
                }
                .padding(16)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(Palette.card, in: .rect(cornerRadius: 18))
                AppleSignInButton()
                Button("Use email instead") { emailing = true }
                    .buttonStyle(D8Option(align: .center))
                    .disabled(account.busy)
                if let error = account.error {
                    Text(error).font(.footnote).foregroundStyle(D8.vermilion)
                }
                if account.busy { ProgressView().frame(maxWidth: .infinity) }
                Button("Not now") { dismiss() }
                    .font(.system(size: 15, weight: .semibold))
                    .foregroundStyle(Palette.muted)
                    .buttonStyle(LinkPad())
                    .frame(maxWidth: .infinity)
            }
            .padding(24)
            .frame(maxWidth: 560)
            .frame(maxWidth: .infinity)
        }
        .background(Dots().ignoresSafeArea())
        .sheet(isPresented: $emailing) { SignInSheet(emailOnly: true) }
        .onChange(of: account.stage) { _, st in
            if st == .signedIn {
                emailing = false
                dismiss()
            }
        }
    }
}
