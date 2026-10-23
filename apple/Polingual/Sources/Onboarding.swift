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

    @State private var moreLanguages = false

    var body: some View {
        VStack(spacing: 0) {
            TabView(selection: $step) {
                ForEach(Step.allCases, id: \.self) { st in
                    page(st)
                        .frame(maxWidth: 560, maxHeight: .infinity, alignment: .topLeading)
                        .padding(.horizontal, 24)
                        .padding(.top, 16)
                        .frame(maxWidth: .infinity)
                        .tag(st)
                }
            }
            #if os(iOS)
            .tabViewStyle(.page(indexDisplayMode: .never))
            #endif
            .animation(.spring(duration: 0.4), value: step)
            footer
        }
        .background(Dots().ignoresSafeArea())
        .sheet(isPresented: $signingIn) { AccountView() }
        .sheet(isPresented: $moreLanguages) { languagePicker }
        .onChange(of: account.stage) { _, st in if st == .signedIn { signingIn = false } }
        .task { await store.load() }
    }

    @ViewBuilder
    func page(_ s: Step) -> some View {
        switch s {
        case .welcome: welcome
        case .languages: languages
        case .method: method
        case .daily: daily
        case .account: accountStep
        }
    }

    var welcome: some View {
        VStack(alignment: .leading, spacing: 16) {
            PoMark()
            (Text("Language learning for ") + Text("multilingual").foregroundStyle(D8.vermilion) + Text(" learners."))
                .font(.system(size: 34, weight: .heavy, design: .rounded))
                .foregroundStyle(Palette.ink)
                .minimumScaleFactor(0.7)
                .fixedSize(horizontal: false, vertical: true)
            PlayfulTiles()
        }
    }

    var languages: some View {
        VStack(alignment: .leading, spacing: 18) {
            Text("Which languages?")
                .font(.system(size: 34, weight: .heavy, design: .rounded))
                .foregroundStyle(Palette.ink)
            Text("Each word comes back in every language you pick.")
                .font(.body)
                .foregroundStyle(Palette.muted)
            HStack(alignment: .top, spacing: 12) {
                ForEach(targets, id: \.self) { l in
                    VStack(spacing: 6) {
                        FlagTile(lang: l, size: 56)
                        Text(Lang.name(l)).font(.caption.weight(.bold)).foregroundStyle(Palette.ink).lineLimit(1).minimumScaleFactor(0.7)
                    }
                    .frame(maxWidth: 72)
                    .transition(.scale.combined(with: .opacity))
                }
                if targets.isEmpty { Text("Pick at least one.").font(.subheadline).foregroundStyle(Palette.muted).frame(height: 76) }
            }
            .animation(.spring(duration: 0.35, bounce: 0.4), value: targets)
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(14)
            .background(Palette.card, in: .rect(cornerRadius: 18))
            FlowLayout(spacing: 8) {
                ForEach(Lang.presets, id: \.name) { p in
                    Chip(title: p.name, langs: p.targets, on: Set(p.targets.filter { $0 != root }) == Set(targets)) { targets = p.targets.filter { $0 != root } }
                }
            }
            Button("More languages · 29") { moreLanguages = true }.buttonStyle(D8Option(align: .center, compact: true))
        }
    }

    var languagePicker: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
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
                    Text(targets.count == 5 ? "Five at most. Tap one to swap it out." : "\(targets.count) of 5 picked")
                        .font(.footnote).foregroundStyle(Palette.muted)
                    FlowLayout(spacing: 8) {
                        ForEach(Lang.codes.filter { $0 != root }, id: \.self) { c in
                            Chip(title: Lang.name(c), langs: [c], on: targets.contains(c)) {
                                if let i = targets.firstIndex(of: c) { targets.remove(at: i) } else if targets.count < 5 { targets.append(c) }
                            }
                        }
                    }
                }
                .padding(20)
            }
            .background(Palette.paper.ignoresSafeArea())
            .navigationTitle("Languages")
            .inlineTitle()
            .toolbar { ToolbarItem(placement: .confirmationAction) { Button("Done") { moreLanguages = false } } }
        }
        .presentationDetents([.large])
    }

    var method: some View {
        VStack(alignment: .leading, spacing: 20) {
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
            Text("One nudge a day")
                .font(.system(size: 34, weight: .heavy, design: .rounded))
                .foregroundStyle(Palette.ink)
            Text("Polingual reminds you once a day, at the time you usually study, and only when words are due.")
                .font(.body)
                .foregroundStyle(Palette.muted)
            HStack(spacing: 8) {
                ForEach(Array(["M", "T", "W", "T", "F", "S", "S"].enumerated()), id: \.offset) { i, d in
                    VStack(spacing: 6) {
                        Image(systemName: i < 5 ? "checkmark" : "")
                            .font(.system(size: 15, weight: .heavy))
                            .foregroundStyle(.white)
                            .frame(width: 38, height: 38)
                            .background(i < 5 ? D8.vermilion : Palette.rule, in: .rect(cornerRadius: 10))
                            .modifier(Glaze(radius: 10, lip: i < 5 ? 3 : 0))
                        Text(d).font(.caption.weight(.bold)).foregroundStyle(Palette.muted)
                    }
                    .frame(maxWidth: .infinity)
                }
            }
            .padding(.vertical, 8)
            .accessibilityLabel("A five day streak")
            if reminders.enabled {
                Label("Reminder on", systemImage: "checkmark.circle.fill").font(.headline).foregroundStyle(D8.malachite)
            } else if reminders.denied {
                Text("Notifications are off for Polingual. You can turn them on later in Settings.").font(.subheadline).foregroundStyle(Palette.muted)
            } else {
                Button {
                    Task { _ = await reminders.enable() }
                } label: {
                    Label("Turn on my daily reminder", systemImage: "bell.fill")
                }
                .buttonStyle(D8Option(align: .center))
            }
        }
    }

    var accountStep: some View {
        VStack(alignment: .leading, spacing: 18) {
            Text("Your plan is ready")
                .font(.system(size: 34, weight: .heavy, design: .rounded))
                .foregroundStyle(Palette.ink)
            VStack(alignment: .leading, spacing: 14) {
                HStack(spacing: 6) {
                    ForEach(targets, id: \.self) { FlagTile(lang: $0, size: 34) }
                    Text(targets.map(Lang.name).joined(separator: " · ")).font(.headline).foregroundStyle(Palette.ink).lineLimit(2).minimumScaleFactor(0.7).padding(.leading, 4)
                }
                PlanLine(icon: "scope", text: "A short placement in each language")
                PlanLine(icon: "clock", text: "About 10 minutes a day, one mixed queue")
                PlanLine(icon: reminders.enabled ? "bell.fill" : "bell.slash", text: reminders.enabled ? "A daily reminder at your study time" : "No reminder, turn it on any time")
            }
            .padding(16)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Palette.card, in: .rect(cornerRadius: 18))
            if account.stage == .signedIn {
                Label("Signed in, progress syncs", systemImage: "checkmark.circle.fill").font(.headline).foregroundStyle(D8.malachite)
            } else {
                Button {
                    signingIn = true
                } label: {
                    Label("Sign in to sync iPhone, iPad and Mac", systemImage: "person.crop.circle")
                }
                .buttonStyle(D8Option(align: .center))
            }
            if let failed {
                Text(failed).font(.footnote).foregroundStyle(D8.vermilion)
                Button("Skip for now") { finish(nil) }.buttonStyle(PlainLink())
            }
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
            Button(label) {
                if step == .account { Task { await complete() } } else { advance() }
            }
            .buttonStyle(D8Primary())
            .disabled((step == .languages && targets.isEmpty) || creating)
        }
        .padding(.horizontal, 24)
        .padding(.bottom, 20)
        .frame(maxWidth: 560)
    }

    var label: String {
        switch step {
        case .welcome: "Get started"
        case .account: creating ? "Setting up" : failed == nil ? "Start learning" : "Try again"
        default: "Continue"
        }
    }

    func advance() {
        tap()
        if let next = Step(rawValue: step.rawValue + 1) { withAnimation(.spring(duration: 0.4)) { step = next } }
    }

    func complete() async {
        guard !creating else { return }
        failed = nil
        creating = true
        defer { creating = false }
        await store.load()
        let existing = store.systems.first { $0.root == root && Set($0.targets) == Set(targets) }
        if let existing { finish(existing.id); return }
        do {
            let s = try await store.create(root: root, targets: targets)
            finish(s.id)
        } catch {
            failed = "That set could not be created. Try again, or skip and build one from the home screen."
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

struct Dots: View {
    var body: some View {
        Canvas { ctx, size in
            let step: CGFloat = 24
            var y: CGFloat = step / 2
            while y < size.height {
                var x: CGFloat = step / 2
                while x < size.width {
                    ctx.fill(Path(ellipseIn: CGRect(x: x - 1.2, y: y - 1.2, width: 2.4, height: 2.4)), with: .color(Color(light: 0xE2D4B4, dark: 0x3A352C)))
                    x += step
                }
                y += step
            }
        }
        .background(Palette.paper)
        .accessibilityHidden(true)
    }
}

struct PlayfulTiles: View {
    var compact = false
    @Environment(\.accessibilityReduceMotion) private var still
    static let sets: [(gloss: String, words: [(String, String, String)])] = [
        ("night", [("es", "noche", "ˈnotʃe"), ("fr", "nuit", "nɥi"), ("it", "notte", "ˈnɔtte"), ("pt", "noite", "ˈnojtɨ")]),
        ("seven", [("de", "sieben", "ˈziːbn̩"), ("ja", "七", "nana"), ("el", "επτά", "epˈta"), ("hi", "सात", "saːt")]),
        ("hundred", [("ru", "сто", "sto"), ("he", "מאה", "meˈa"), ("zh", "百", "bǎi"), ("ar", "مئة", "miʔa")]),
    ]
    @State private var sets = [0, 0, 0, 0]
    var set: Int { sets[0] }
    @State private var shown = 0
    @State private var bounce = -1

    var body: some View {
        GeometryReader { g in
            let side = compact ? min((g.size.width - 48) / 4, g.size.height - 10, 96) : min((g.size.width - 16) / 2, (g.size.height - 44) / 2, 170)
            VStack(spacing: 12) {
                if !compact {
                (Text("One word, ") + Text(Self.sets[set].gloss).foregroundStyle(D8.lapis) + Text(", in four languages"))
                    .font(.system(size: 18, weight: .bold, design: .rounded))
                    .foregroundStyle(Palette.muted)
                    .contentTransition(.opacity)
                    .animation(.easeInOut, value: set)
                }
                LazyVGrid(columns: Array(repeating: GridItem(.fixed(side), spacing: compact ? 12 : 16), count: compact ? 4 : 2), spacing: 16) {
                    ForEach(0..<4, id: \.self) { i in
                        let w = Self.sets[sets[i]].words[i]
                        WordTile(word: w.1, lang: w.0, reading: Reading(ipa: w.2), size: side)
                            .id(sets[i])
                            .transition(.opacity.combined(with: .scale(scale: 0.97)))
                            .rotationEffect(.degrees(i.isMultiple(of: 2) ? -2 : 1.5))
                            .scaleEffect(i < shown ? (bounce == i ? 1.08 : 1) : 0.4)
                            .opacity(i < shown ? 1 : 0)
                            .simultaneousGesture(TapGesture().onEnded {
                                tap()
                                withAnimation(.spring(duration: 0.25, bounce: 0.6)) { bounce = i }
                                Task { try? await Task.sleep(for: .milliseconds(220)); withAnimation(.spring) { bounce = -1 } }
                            })
                    }
                }
                .frame(maxWidth: .infinity)
            }
        }
        .task {
            for i in 1...4 {
                withAnimation(still ? nil : .spring(duration: 0.45, bounce: 0.5)) { shown = i }
                try? await Task.sleep(for: .milliseconds(140))
            }
            guard !still else { return }
            while !Task.isCancelled {
                try? await Task.sleep(for: .seconds(4))
                for i in 0..<4 {
                    withAnimation(.easeInOut(duration: 0.7)) { sets[i] = (sets[i] + 1) % Self.sets.count }
                    try? await Task.sleep(for: .milliseconds(260))
                }
            }
        }
    }
}

struct PlanLine: View {
    let icon: String
    let text: String

    var body: some View {
        HStack(spacing: 10) {
            Image(systemName: icon).font(.system(size: 15, weight: .bold)).foregroundStyle(D8.lapis).frame(width: 22)
            Text(text).font(.subheadline).foregroundStyle(Palette.ink)
        }
    }
}
