import BucketKit
import SwiftUI

struct Onboarding: View {
    enum Step: Int, CaseIterable { case welcome, languages, method, daily, account }

    @Environment(Account.self) private var account
    @Environment(LangStore.self) private var store
    @Environment(Reminders.self) private var reminders
    let finish: (String?) -> Void
    @State private var step = PolingualLaunch.value("-onboardingStep").flatMap(Int.init).flatMap(Step.init(rawValue:)) ?? .welcome
    @State private var signingIn = false
    @State private var root = "en"
    @State private var targets: [String] = ["fr", "es", "it"]
    @State private var creating = false
    @State private var failed: String?

    var body: some View {
        VStack(spacing: 0) {
            ScrollView {
                VStack(alignment: .leading, spacing: 22) {
                    switch step {
                    case .welcome: welcome
                    case .languages: languages
                    case .method: method
                    case .daily: daily
                    case .account: accountStep
                    }
                }
                .padding(.horizontal, 24)
                .padding(.top, 28)
                .frame(maxWidth: 560, alignment: .leading)
                .frame(maxWidth: .infinity)
            }
            .scrollBounceBehavior(.basedOnSize)
            footer
        }
        .background(Palette.paper.ignoresSafeArea())
        .sheet(isPresented: $signingIn) { AccountView() }
        .onChange(of: account.stage) { _, s in
            if s == .signedIn, step == .account {
                signingIn = false
                Task { await complete() }
            }
        }
        .task { await store.load() }
    }

    var welcome: some View {
        VStack(alignment: .leading, spacing: 22) {
            PoMark()
            (Text("Language learning for ") + Text("multilingual").foregroundStyle(D8.vermilion) + Text(" learners."))
                .font(.system(size: 38, weight: .heavy, design: .rounded))
                .foregroundStyle(Palette.ink)
                .fixedSize(horizontal: false, vertical: true)
            Text("One word, every language you study. Tap a tile to hear it.")
                .font(.title3)
                .foregroundStyle(Palette.muted)
            LazyVGrid(columns: [GridItem(.flexible(), spacing: 14), GridItem(.flexible())], spacing: 18) {
                ForEach(Array([("es", "noche", "ˈnot͡ʃe"), ("fr", "nuit", "nɥi"), ("it", "notte", "ˈnɔtte"), ("pt", "noite", "ˈnojtɨ")].enumerated()), id: \.offset) { i, w in
                    WordTile(word: w.1, lang: w.0, reading: Reading(ipa: w.2), size: 150)
                        .rotationEffect(.degrees(i.isMultiple(of: 2) ? -2 : 1.5))
                }
            }
            .padding(.top, 4)
        }
    }

    var languages: some View {
        VStack(alignment: .leading, spacing: 18) {
            Eyebrow(text: "Your set")
            Text("Which languages?")
                .font(.system(size: 34, weight: .heavy, design: .rounded))
                .foregroundStyle(Palette.ink)
            Text("Pick a set. Each word comes back in every language you choose, mixed in one daily queue.")
                .font(.body)
                .foregroundStyle(Palette.muted)
            FlowLayout(spacing: 8) {
                ForEach(Lang.presets, id: \.name) { p in
                    Chip(title: p.name, langs: p.targets, on: Set(p.targets) == Set(targets)) { targets = p.targets.filter { $0 != root } }
                }
            }
            Eyebrow(text: "Or choose your own")
            FlowLayout(spacing: 8) {
                ForEach(Lang.codes.filter { $0 != root }, id: \.self) { c in
                    Chip(title: Lang.name(c), langs: [c], on: targets.contains(c)) {
                        if let i = targets.firstIndex(of: c) { targets.remove(at: i) } else if targets.count < 5 { targets.append(c) }
                    }
                }
            }
            HStack {
                Text("I already speak").foregroundStyle(Palette.muted)
                Spacer()
                Picker("I already speak", selection: $root) {
                    ForEach(Lang.codes, id: \.self) { Text(Lang.name($0)).tag($0) }
                }
                .labelsHidden()
                .tint(Palette.ink)
            }
            .onChange(of: root) { _, r in targets.removeAll { $0 == r } }
            Text(targets.isEmpty ? "Pick at least one language." : "\(targets.count) of 5 · \(targets.map(Lang.name).joined(separator: ", "))")
                .font(.footnote)
                .foregroundStyle(Palette.muted)
        }
    }

    var method: some View {
        VStack(alignment: .leading, spacing: 20) {
            Eyebrow(text: "How it works")
            Text("A short session a day")
                .font(.system(size: 34, weight: .heavy, design: .rounded))
                .foregroundStyle(Palette.ink)
            Point(icon: "scope", color: D8.lapis, title: "Placement", detail: "A short test finds your level in each language, so you skip what you know.")
            Point(icon: "arrow.triangle.2.circlepath", color: D8.malachite, title: "Spaced review", detail: "Words return right before you would forget them, across all your languages.")
            Point(icon: "speaker.wave.2.fill", color: D8.vermilion, title: "Hear and say it", detail: "Every word is spoken, and you can say it back to check yourself.")
            Point(icon: "leaf.fill", color: Color(hex: 0xC8952C), title: "Shared roots", detail: "See noche, nuit and notte side by side and remember all three.")
        }
    }

    var daily: some View {
        VStack(alignment: .leading, spacing: 18) {
            Eyebrow(text: "Your streak")
            Text("One nudge a day")
                .font(.system(size: 34, weight: .heavy, design: .rounded))
                .foregroundStyle(Palette.ink)
            Text("Polingual reminds you once a day, at the time you usually study, and only when words are due.")
                .font(.body)
                .foregroundStyle(Palette.muted)
            if reminders.enabled {
                Label("Reminder on", systemImage: "checkmark.circle.fill").font(.headline).foregroundStyle(D8.malachite)
            } else if reminders.denied {
                Text("Notifications are off for Polingual. You can turn them on later in Settings.").font(.subheadline).foregroundStyle(Palette.muted)
            }
        }
    }

    var accountStep: some View {
        VStack(alignment: .leading, spacing: 18) {
            Eyebrow(text: "Your progress")
            Text("Keep it everywhere")
                .font(.system(size: 34, weight: .heavy, design: .rounded))
                .foregroundStyle(Palette.ink)
            Text("Sign in with your email and your languages follow you to iPad, Mac, Bucket and polingual.com. You can do this later from the account menu.")
                .font(.body)
                .foregroundStyle(Palette.muted)
            if account.stage == .signedIn {
                Label("Signed in", systemImage: "checkmark.circle.fill").font(.headline).foregroundStyle(D8.malachite)
            }
            if let failed { Text(failed).font(.footnote).foregroundStyle(D8.vermilion) }
        }
    }

    var footer: some View {
        VStack(spacing: 12) {
            HStack(spacing: 8) {
                ForEach(Step.allCases, id: \.self) { s in
                    Capsule().fill(s == step ? D8.vermilion : Palette.rule).frame(width: s == step ? 22 : 8, height: 8)
                }
            }
            .accessibilityHidden(true)
            switch step {
            case .daily where !reminders.enabled && !reminders.denied:
                Button("Remind me daily") { Task { _ = await reminders.enable(); advance() } }.buttonStyle(D8Primary())
                Button("Not now", action: advance).buttonStyle(PlainLink())
            case .account where account.stage != .signedIn:
                Button("Sign in with email") { signingIn = true }.buttonStyle(D8Primary())
                Button("Not now") { Task { await complete() } }.buttonStyle(PlainLink()).disabled(creating)
            case .account:
                Button(creating ? "Setting up" : "Start learning") { Task { await complete() } }.buttonStyle(D8Primary()).disabled(creating)
            default:
                Button(step == .welcome ? "Get started" : "Continue", action: advance)
                    .buttonStyle(D8Primary())
                    .disabled(step == .languages && targets.isEmpty)
            }
        }
        .padding(.horizontal, 24)
        .padding(.bottom, 20)
        .frame(maxWidth: 560)
    }

    func advance() {
        tap()
        if let next = Step(rawValue: step.rawValue + 1) { withAnimation(.snappy) { step = next } }
    }

    func complete() async {
        guard !creating else { return }
        creating = true
        defer { creating = false }
        await store.load()
        let existing = store.systems.first { $0.root == root && Set($0.targets) == Set(targets) }
        if let existing { finish(existing.id); return }
        do {
            let s = try await store.create(root: root, targets: targets)
            finish(s.id)
        } catch {
            failed = "That set could not be created. You can build one from the home screen."
            finish(nil)
        }
    }
}

struct PoMark: View {
    var body: some View {
        HStack(spacing: 10) {
            ZStack(alignment: .topTrailing) {
                Text("Po")
                    .font(.system(size: 22, weight: .heavy, design: .rounded))
                    .foregroundStyle(D8.parchment)
                    .frame(width: 48, height: 48)
                    .background(Color(hex: 0x5B1A4A), in: .rect(cornerRadius: 12))
                Circle().fill(D8.vermilion).frame(width: 9, height: 9).padding(6)
            }
            Text("polingual").font(.system(size: 24, weight: .heavy, design: .rounded)).foregroundStyle(Palette.ink)
        }
        .accessibilityElement()
        .accessibilityLabel("Polingual")
    }
}

struct Point: View {
    let icon: String
    let color: Color
    let title: String
    let detail: String

    var body: some View {
        HStack(alignment: .top, spacing: 14) {
            Image(systemName: icon)
                .font(.system(size: 18, weight: .bold))
                .foregroundStyle(D8.parchment)
                .frame(width: 40, height: 40)
                .background(color, in: .rect(cornerRadius: 10))
                .modifier(Glaze(radius: 10))
            VStack(alignment: .leading, spacing: 3) {
                Text(title).font(.headline).foregroundStyle(Palette.ink)
                Text(detail).font(.subheadline).foregroundStyle(Palette.muted)
            }
        }
    }
}
