import BucketKit
import SwiftUI

struct Onboarding: View {
    enum Step: Int, CaseIterable { case welcome, method, account }

    @Environment(Account.self) private var account
    let finish: () -> Void
    @State private var step = Step.welcome
    @State private var signingIn = false

    var body: some View {
        VStack(spacing: 0) {
            ScrollView {
                VStack(alignment: .leading, spacing: 22) {
                    switch step {
                    case .welcome: welcome
                    case .method: method
                    case .account: accountStep
                    }
                }
                .padding(.horizontal, 28)
                .padding(.top, 56)
                .frame(maxWidth: 560, alignment: .leading)
                .frame(maxWidth: .infinity)
            }
            footer
        }
        .background(Palette.paper.ignoresSafeArea())
        .sheet(isPresented: $signingIn) { AccountView() }
        .onChange(of: account.stage) { _, s in
            if s == .signedIn, step == .account {
                signingIn = false
                finish()
            }
        }
    }

    var welcome: some View {
        Group {
            Eyebrow(text: "Polingual")
            Text("Learn languages together")
                .font(.serif(.largeTitle, weight: .semibold))
                .foregroundStyle(Palette.ink)
            Text("Pick one language you know and a set you want. Every word comes back in each language of the set, so you see how they share roots.")
                .font(.serif(.title3))
                .foregroundStyle(Palette.muted)
            WordFamily(gloss: "night", forms: [("Spanish", "noche"), ("French", "nuit"), ("Italian", "notte"), ("Portuguese", "noite")])
        }
    }

    var method: some View {
        Group {
            Eyebrow(text: "How it works")
            Text("A short session a day")
                .font(.serif(.largeTitle, weight: .semibold))
                .foregroundStyle(Palette.ink)
            VStack(alignment: .leading, spacing: 18) {
                Point(icon: "scope", title: "Placement", detail: "A short test finds your level in each language, so you skip what you know.")
                Point(icon: "arrow.triangle.2.circlepath", title: "Spaced review", detail: "Words return right before you would forget them, mixed across your languages in one queue.")
                Point(icon: "mic", title: "Speak and listen", detail: "Hear each word and say it back. Polingual checks your pronunciation on the device.")
                Point(icon: "globe", title: "29 languages", detail: "From Spanish and Japanese to Latin, Sanskrit and Old English.")
            }
        }
    }

    var accountStep: some View {
        Group {
            Eyebrow(text: "Your progress")
            Text("One account with Bucket")
                .font(.serif(.largeTitle, weight: .semibold))
                .foregroundStyle(Palette.ink)
            Text("Sign in with the email you use for Bucket and your language systems follow you between Bucket, Polingual and bucket.foundation. You can sign in later from the account menu.")
                .font(.serif(.title3))
                .foregroundStyle(Palette.muted)
            if account.stage == .signedIn {
                Label("Signed in", systemImage: "checkmark.circle.fill").foregroundStyle(Palette.green)
            }
        }
    }

    var footer: some View {
        VStack(spacing: 12) {
            HStack(spacing: 8) {
                ForEach(Step.allCases, id: \.self) { s in
                    Capsule().fill(s == step ? Palette.gold : Palette.rule).frame(width: s == step ? 22 : 8, height: 8)
                }
            }
            .accessibilityHidden(true)
            if step == .account && account.stage != .signedIn {
                Button { signingIn = true } label: { Text("Sign in with email").frame(maxWidth: .infinity) }
                    .buttonStyle(.borderedProminent)
                    .controlSize(.large)
                Button("Not now", action: finish).buttonStyle(.borderless)
            } else {
                Button {
                    if let next = Step(rawValue: step.rawValue + 1) { withAnimation { step = next } } else { finish() }
                } label: {
                    Text("Continue").frame(maxWidth: .infinity)
                }
                .buttonStyle(.borderedProminent)
                .controlSize(.large)
            }
        }
        .padding(.horizontal, 28)
        .padding(.bottom, 24)
        .frame(maxWidth: 560)
    }
}

struct WordFamily: View {
    let gloss: String
    let forms: [(String, String)]

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text(gloss).font(.caption.weight(.semibold)).tracking(1.4).textCase(.uppercase).foregroundStyle(Palette.gold)
            ForEach(forms, id: \.0) { lang, word in
                HStack {
                    Text(word).font(.serif(.title2, weight: .semibold)).foregroundStyle(Palette.ink)
                    Spacer()
                    Text(lang).font(.subheadline).foregroundStyle(Palette.muted)
                }
                if lang != forms.last?.0 { Divider().overlay(Palette.rule) }
            }
        }
        .padding(18)
        .background(Palette.card, in: .rect(cornerRadius: 14))
        .overlay(RoundedRectangle(cornerRadius: 14).stroke(Palette.rule))
    }
}

struct Point: View {
    let icon: String
    let title: String
    let detail: String

    var body: some View {
        HStack(alignment: .top, spacing: 14) {
            Image(systemName: icon)
                .font(.title3)
                .foregroundStyle(Palette.green)
                .frame(width: 30)
            VStack(alignment: .leading, spacing: 3) {
                Text(title).font(.serif(.headline)).foregroundStyle(Palette.ink)
                Text(detail).font(.subheadline).foregroundStyle(Palette.muted)
            }
        }
    }
}
