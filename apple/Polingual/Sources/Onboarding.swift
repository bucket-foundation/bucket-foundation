import BucketKit
import SwiftUI

struct Onboarding: View {
    enum Step: Int, CaseIterable { case welcome, method, account }

    @Environment(Account.self) private var account
    let finish: () -> Void
    @State private var step = PolingualLaunch.value("-onboardingStep").flatMap(Int.init).flatMap(Step.init(rawValue:)) ?? .welcome
    @State private var signingIn = false

    var body: some View {
        VStack(spacing: 0) {
            GeometryReader { geo in
                ScrollView {
                    VStack(alignment: .leading, spacing: 22) {
                        switch step {
                        case .welcome: welcome
                        case .method: method
                        case .account: accountStep
                        }
                    }
                    .padding(.horizontal, 28)
                    .padding(.vertical, 32)
                    .frame(maxWidth: geo.size.width > 700 ? 680 : 560, alignment: .leading)
                    .frame(maxWidth: .infinity, minHeight: geo.size.height, alignment: geo.size.width > 700 ? .center : .top)
                }
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
            Text("One word. Every language you want.")
                .font(.serif(.largeTitle, weight: .semibold))
                .foregroundStyle(Palette.ink)
                .fixedSize(horizontal: false, vertical: true)
            Text("Pick the languages you want and learn them side by side, with shared roots, placement and a daily review.")
                .font(.serif(.title3))
                .foregroundStyle(Palette.muted)
                .fixedSize(horizontal: false, vertical: true)
            WordWheel()
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
                Point(icon: "mic", title: "Speak and listen", detail: "Hear each word and say it back. Apple speech recognition checks your pronunciation.")
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
            if step == .welcome {
                Text("3 days free, then pick monthly or yearly").font(.footnote).foregroundStyle(Palette.muted)
            }
            if step == .account && account.stage != .signedIn {
                Button { signingIn = true } label: { Text("Sign in with email").frame(maxWidth: .infinity) }
                    .buttonStyle(.borderedProminent)
                    .controlSize(.large)
                Button("Not now", action: finish).buttonStyle(.borderless)
            } else {
                Button {
                    if let next = Step(rawValue: step.rawValue + 1) { withAnimation { step = next } } else { finish() }
                } label: {
                    Text(step == .welcome ? "Start free" : "Continue").frame(maxWidth: .infinity)
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

struct WordWheel: View {
    struct Meaning {
        let gloss: String
        let root: String?
        let forms: [String]
    }

    static let langs = ["es", "fr", "it", "pt", "de", "nl", "ru", "el", "ar", "hi", "zh", "ko"]
    static let romance: Set<String> = ["es", "fr", "it", "pt"]
    static let germanic: Set<String> = ["de", "nl"]
    static let meanings = [
        Meaning(gloss: "night", root: nil, forms: ["noche", "nuit", "notte", "noite", "Nacht", "nacht", "ночь", "νύχτα", "لَيْلَة", "रात", "夜晚", "밤"]),
        Meaning(gloss: "star", root: "*h₂stḗr", forms: ["estrella", "étoile", "stella", "estrela", "Stern", "ster", "звезда", "αστέρι", "نَجْم", "तारा", "星星", "별"]),
        Meaning(gloss: "water", root: "*h₂ekʷeh₂", forms: ["agua", "eau", "acqua", "água", "Wasser", "water", "вода", "νερό", "مَاء", "पानी", "水", "물"]),
        Meaning(gloss: "mother", root: "*méh₂tēr", forms: ["madre", "mère", "madre", "mãe", "Mutter", "moeder", "мать", "μητέρα", "أُمّ", "माँ", "妈妈", "엄마"]),
        Meaning(gloss: "heart", root: "*ḱḗr", forms: ["corazón", "cœur", "cuore", "coração", "Herz", "hart", "сердце", "καρδιά", "قَلْب", "दिल", "心脏", "심장"]),
    ]

    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @Environment(\.horizontalSizeClass) private var sizeClass
    @State private var index = 0

    var meaning: Meaning { Self.meanings[index] }

    func tint(_ lang: String) -> Color {
        Self.romance.contains(lang) ? Palette.green : Self.germanic.contains(lang) ? Palette.gold : Palette.muted
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack(alignment: .firstTextBaseline, spacing: 10) {
                Text(meaning.gloss.uppercased())
                    .font(.caption.weight(.semibold))
                    .tracking(1.6)
                    .foregroundStyle(Palette.ink)
                if let root = meaning.root {
                    Text("one root, \(root)").font(.caption).foregroundStyle(Palette.muted)
                }
                Spacer()
                HStack(spacing: 5) {
                    ForEach(Self.meanings.indices, id: \.self) { i in
                        Circle().fill(i == index ? Palette.gold : Palette.rule).frame(width: 6, height: 6)
                    }
                }
            }
            LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 8), count: sizeClass == .regular ? 4 : 3), spacing: 8) {
                ForEach(Array(Self.langs.enumerated()), id: \.offset) { i, lang in
                    VStack(spacing: 4) {
                        Text(meaning.forms[i])
                            .font(.serif(sizeClass == .regular ? .title2 : .title3, weight: .semibold))
                            .foregroundStyle(Palette.ink)
                            .lineLimit(1)
                            .minimumScaleFactor(0.6)
                            .id("\(index)-\(i)")
                            .transition(.opacity.combined(with: .scale(scale: 0.92)))
                        Text(Lang.name(lang)).font(.caption2).foregroundStyle(tint(lang))
                    }
                    .frame(maxWidth: .infinity, minHeight: sizeClass == .regular ? 84 : 64)
                    .background(tint(lang).opacity(0.08), in: .rect(cornerRadius: 12))
                    .overlay(RoundedRectangle(cornerRadius: 12).stroke(tint(lang).opacity(0.25)))
                    .accessibilityElement(children: .combine)
                }
            }
            HStack(spacing: 14) {
                Label("Romance", systemImage: "circle.fill").foregroundStyle(Palette.green)
                Label("Germanic", systemImage: "circle.fill").foregroundStyle(Palette.gold)
                Label("29 languages in all", systemImage: "circle.fill").foregroundStyle(Palette.muted)
            }
            .font(.caption2)
            .labelStyle(.titleAndIcon)
            .imageScale(.small)
        }
        .task {
            guard !reduceMotion else { return }
            while !Task.isCancelled {
                try? await Task.sleep(for: .seconds(3.2))
                withAnimation(.easeInOut(duration: 0.6)) { index = (index + 1) % Self.meanings.count }
            }
        }
        .accessibilityLabel("The word \(meaning.gloss) in 12 languages")
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
