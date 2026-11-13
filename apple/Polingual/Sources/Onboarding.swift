import BucketKit
import SwiftUI

struct Onboarding: View {
    enum Step: Int, CaseIterable { case welcome, languages }

    @Environment(LangStore.self) private var store
    let finish: (String?) -> Void
    @State private var step = PolingualLaunch.value("-onboardingStep").flatMap(Int.init).flatMap(Step.init(rawValue:)) ?? .welcome
    @State private var root = InterfaceLanguage.deviceRoot
    @State private var targets: [String] = ["fr", "es", "it", "de"].filter { $0 != InterfaceLanguage.deviceRoot }.prefix(3).map(\.self)
    @State private var creating = false
    @State private var failed: String?

    var body: some View {
        VStack(spacing: 0) {
            TabView(selection: $step) {
                ForEach(Step.allCases, id: \.self) { st in
                    page(st)
                        .frame(maxWidth: 560, maxHeight: .infinity, alignment: .topLeading)
                        .padding(.horizontal, 24)
                        .padding(.top, 16)
                        .padding(.bottom, 64)
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
        .background(Backdrop().ignoresSafeArea())
        .task { await store.load() }
    }

    @ViewBuilder
    func page(_ s: Step) -> some View {
        switch s {
        case .welcome: welcome
        case .languages: languages
        }
    }

    var welcome: some View {
        GeometryReader { g in
            if g.size.width > g.size.height {
                HStack(alignment: .center, spacing: 20) {
                    welcomeText.frame(maxWidth: .infinity, alignment: .leading)
                    PlayfulTiles().frame(maxWidth: .infinity)
                }
            } else {
                VStack(alignment: .leading, spacing: 16) {
                    welcomeText
                    PlayfulTiles()
                }
            }
        }
    }

    var welcomeText: some View {
        VStack(alignment: .leading, spacing: 16) {
            PLStickerLayer(Stickers.onboarding).frame(height: 96)
            PoMark()
            Text(accented("Language learning for **multilingual** learners.", D8.vermilion))
                .font(PL.title.font(scale: 0.94))
                .foregroundStyle(PL.ink)
                .minimumScaleFactor(0.6)
                .fixedSize(horizontal: false, vertical: true)
            StreakBadge()
        }
    }

    var languages: some View {
        VStack(alignment: .leading, spacing: 18) {
            PLStickerLayer(Array(Stickers.onboarding.prefix(3))).frame(height: 96)
            Text("Which languages?")
                .font(PL.title.font(scale: 0.94))
                .foregroundStyle(PL.ink)
            Text("Each word comes back in every language you pick.")
                .font(PL.body.font())
                .foregroundStyle(PL.inkDim)
            HStack(alignment: .top, spacing: 12) {
                ForEach(targets, id: \.self) { l in
                    VStack(spacing: 6) {
                        FlagTile(lang: l, size: 56)
                        Text(langName(l)).font(.caption.weight(.bold)).foregroundStyle(Palette.ink).lineLimit(1).minimumScaleFactor(0.7)
                    }
                    .frame(maxWidth: 72)
                    .transition(.scale.combined(with: .opacity))
                }
                if targets.isEmpty { Text("Pick at least one.").font(.subheadline).foregroundStyle(Palette.muted).frame(height: 76) }
            }
            .animation(.spring(duration: 0.35, bounce: 0.4), value: targets)
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(14)
            .background(PL.card, in: .rect(cornerRadius: PL.Radius.lg))
            .overlay { RoundedRectangle(cornerRadius: PL.Radius.lg).strokeBorder(PL.hairline2, lineWidth: 2) }
            FlowLayout(spacing: 8) {
                ForEach(Lang.presets, id: \.name) { p in
                    Chip(title: p.name, langs: p.targets, on: Set(p.targets.filter { $0 != root }) == Set(targets)) { targets = p.targets.filter { $0 != root } }
                }
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
                    Capsule().fill(s == step ? D8.parchment : D8.parchment.opacity(0.35)).frame(width: s == step ? 22 : 8, height: 8)
                }
            }
            .accessibilityHidden(true)
            Button(label) {
                if step == .languages {
                    Task { await complete() }
                } else {
                    advance()
                }
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
        case .languages: creating ? "Setting up" : failed == nil ? "Continue" : "Try again"
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
                    .font(PL.heading.font(scale: 22 / PL.heading.size))
                    .foregroundStyle(PL.paper)
                    .frame(width: 48, height: 48)
                    .background(PL.tyrian, in: .rect(cornerRadius: 12))
                Circle().fill(D8.vermilion).frame(width: 9, height: 9).padding(6)
            }
            Text("polingual").font(PL.heading.font()).foregroundStyle(PL.ink)
        }
        .accessibilityElement()
        .accessibilityLabel("Polingual")
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
    static let night: [(String, String, String)] = [
        ("es", "noche", "ˈnotʃe"), ("fr", "nuit", "nɥi"), ("it", "notte", "ˈnɔtte"), ("pt", "noite", "ˈnojtɨ"),
        ("de", "Nacht", "naxt"), ("nl", "nacht", "nɑxt"), ("sv", "natt", "natː"), ("ru", "ночь", "notʃʲ"),
        ("el", "νύχτα", "ˈnixta"), ("ja", "夜", "joɾɯ"), ("ko", "밤", "pam"), ("tr", "gece", "ɟedʒe"),
        ("hi", "रात", "raːt"), ("he", "לילה", "ˈlajla"), ("ar", "ليل", "lajl"), ("zh", "夜", "yè"),
    ]
    @State private var slots = [0, 1, 2, 3]
    @State private var angle: [Double] = [0, 0, 0, 0]
    @State private var shown = false
    @State private var floating = false

    var body: some View {
        GeometryReader { g in
            let side = compact ? min((g.size.width - 48) / 4, g.size.height - 16, 96) : min((g.size.width - 16) / 2, (g.size.height - 44) / 2, 170)
            VStack(spacing: 12) {
                if !compact {
                    Text(accented("One word, **night**, in every language", D8.lapis))
                        .font(PL.heading.font(scale: 0.75))
                        .foregroundStyle(PL.inkDim)
                }
                LazyVGrid(columns: Array(repeating: GridItem(.fixed(side), spacing: compact ? 12 : 16), count: compact ? 4 : 2), spacing: 16) {
                    ForEach(0..<4, id: \.self) { i in
                        let w = Self.night[slots[i]]
                        WordTile(word: w.1, lang: w.0, reading: Reading(ipa: w.2), size: side) {
                            tap()
                            LangVoice.shared.speak(w.1, w.0)
                        }
                            .rotation3DEffect(.degrees(angle[i]), axis: (x: 0, y: 1, z: 0), perspective: 0.4)
                            .rotationEffect(.degrees(i.isMultiple(of: 2) ? -2 : 1.5))
                            .offset(y: floating ? (i.isMultiple(of: 2) ? -4 : 4) : (i.isMultiple(of: 2) ? 3 : -3))
                            .animation(still ? nil : .easeInOut(duration: 2.4 + Double(i) * 0.35).repeatForever(autoreverses: true), value: floating)
                    }
                }
                .frame(maxWidth: .infinity)
                .opacity(shown ? 1 : 0)
                .offset(y: shown ? 0 : 16)
            }
        }
        .onAppear {
            withAnimation(.easeOut(duration: 0.6)) { shown = true }
            floating = true
            LangVoice.shared.warm()
        }
        .task {
            guard !still else { return }
            while !Task.isCancelled {
                try? await Task.sleep(for: .seconds(7))
                await flip(Int.random(in: 0..<4), speak: false)
            }
        }
    }

    func flip(_ i: Int, speak: Bool) async {
        if speak { tap() }
        let used = Set(slots)
        let next = (0..<Self.night.count).filter { !used.contains($0) }.randomElement() ?? slots[i]
        if still {
            slots[i] = next
        } else {
            withAnimation(.easeIn(duration: 0.24)) { angle[i] = 90 }
            try? await Task.sleep(for: .milliseconds(240))
            var t = Transaction()
            t.disablesAnimations = true
            withTransaction(t) {
                slots[i] = next
                angle[i] = -90
            }
            withAnimation(.easeOut(duration: 0.3)) { angle[i] = 0 }
        }
        if speak {
            let w = Self.night[next]
            if LangVoice.shared.canSpeak(w.1, w.0) { LangVoice.shared.speak(w.1, w.0) }
        }
    }
}

struct PlanLine: View {
    let icon: String
    let text: LocalizedStringKey

    var body: some View {
        HStack(spacing: 10) {
            Image(systemName: icon).font(.system(size: 15, weight: .bold)).foregroundStyle(D8.lapis).frame(width: 22)
            Text(text).font(.subheadline).foregroundStyle(Palette.ink)
        }
    }
}

struct Backdrop: View {
    var body: some View {
        PLDiagonalCut(start: 0.88, end: 0.8)
    }
}

struct StreakBadge: View {
    var body: some View {
        PLStreakFlame(days: 100, caption: String(localized: "DAY STREAK"))
            .accessibilityElement(children: .ignore)
            .accessibilityLabel("A 100 day streak")
    }
}

func accented(_ key: String.LocalizationValue, _ color: Color) -> AttributedString {
    var a = AttributedString(localized: key)
    for run in a.runs where run.inlinePresentationIntent?.contains(.stronglyEmphasized) == true {
        a[run.range].foregroundColor = color
        a[run.range].inlinePresentationIntent = nil
    }
    return a
}
