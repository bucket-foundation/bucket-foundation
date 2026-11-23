import BucketKit
import SwiftUI

extension EnvironmentValues {
    @Entry var gameReduceMotion = false
}

enum GameMotion {
    static func reduced(system: Bool, arguments: [String] = ProcessInfo.processInfo.arguments) -> Bool {
        #if DEBUG
        system || arguments.contains("-reduceMotion")
        #else
        system
        #endif
    }

    static func pop(_ reduce: Bool) -> Animation {
        reduce ? .easeOut(duration: PL.Motion.pop) : .timingCurve(0.2, 0.9, 0.3, 1.2, duration: PL.Motion.pop)
    }
}

@MainActor
@Observable
final class GameFeel {
    private(set) var rights = 0
    private(set) var wrongs = 0
    private(set) var climbs = 0
    private(set) var gain = 0
    private(set) var streak = ComboCount()
    @ObservationIgnored var sound: @MainActor (Bool, ComboCount) -> Void = GameFeel.play

    func record(_ right: Bool, points: Int = 1) {
        streak.record(right)
        if right { self.right(streak, points: points) } else { wrong(streak) }
    }

    func reset() { streak = ComboCount() }
    func right(_ streak: ComboCount, points: Int = 1) {
        gain = points * streak.multiplier
        rights += 1
        if streak.climbed { climbs += 1 }
        sound(true, streak)
    }

    func wrong(_ streak: ComboCount) {
        wrongs += 1
        sound(false, streak)
    }

    static func play(_ right: Bool, _ streak: ComboCount) {
        if right && streak.climbed && streak.tier >= .hot {
            GameSound.chord(streak.tier)
        } else {
            GameSound.play(right: right, combo: streak.current)
        }
    }
}

extension View {
    @ViewBuilder
    func gameFeedback(_ feel: GameFeel?) -> some View {
        if let feel {
            sensoryFeedback(.success, trigger: feel.rights)
                .sensoryFeedback(.error, trigger: feel.wrongs)
                .sensoryFeedback(.impact(weight: .heavy), trigger: feel.climbs)
        } else {
            self
        }
    }
}

struct GameBurst: View {
    let feel: GameFeel
    let reduce: Bool
    @State private var out = false
    @State private var shown = false
    @State private var fade: Task<Void, Never>?
    private let colors = [PL.ochre, PL.malachite, PL.vermilion, PL.maya, PL.paper]

    var body: some View {
        ZStack {
            ForEach(0..<12, id: \.self) { i in
                let angle = Double(i) / 12 * 2 * .pi
                Circle()
                    .fill(colors[i % colors.count])
                    .frame(width: PL.Space.s3, height: PL.Space.s3)
                    .offset(x: out && !reduce ? cos(angle) * 110 : 0, y: out && !reduce ? sin(angle) * 110 : 0)
            }
            Text("+\(feel.gain)")
                .font(PL.title.font())
                .foregroundStyle(PL.ochre)
                .shadow(color: PL.shadow, radius: 0, x: 3, y: 4)
                .scaleEffect(out && !reduce ? 1.2 : 1)
        }
        .opacity(shown ? 1 : 0)
        .allowsHitTesting(false)
        .accessibilityHidden(true)
        .onChange(of: feel.rights) { fire() }
        .onDisappear { fade?.cancel() }
    }

    func fire() {
        fade?.cancel()
        var reset = Transaction()
        reset.disablesAnimations = true
        withTransaction(reset) {
            out = false
            shown = true
        }
        withAnimation(GameMotion.pop(reduce)) { out = true }
        fade = Task {
            try? await Task.sleep(for: .seconds(PL.Motion.settle))
            guard !Task.isCancelled else { return }
            withAnimation(.easeOut(duration: PL.Motion.pop)) { shown = false }
        }
    }
}

struct ComboChip: View {
    let streak: ComboCount
    var multiplier = true
    @Environment(\.gameReduceMotion) private var reduce

    var body: some View {
        if streak.tier >= .warm {
            HStack(spacing: PL.Space.s2) {
                Image(systemName: "bolt.fill")
                Text("\(streak.current) in a row")
                if multiplier && streak.multiplier > 1 { Text("x\(streak.multiplier)") }
            }
            .font(PL.label.font(scale: 1.3))
            .textCase(.uppercase)
            .foregroundStyle(streak.tier == .warm ? PL.ink : PL.paper)
            .padding(.horizontal, PL.Space.s3)
            .padding(.vertical, PL.Space.s2)
            .background(tone, in: .capsule)
            .background(PL.shadow, in: .capsule.offset(y: PL.Lip.sm))
            .scaleEffect(reduce ? 1 : streak.climbed ? 1.12 : 1)
            .animation(GameMotion.pop(reduce), value: streak.current)
            .transition(reduce ? .opacity : .scale.combined(with: .opacity))
            .accessibilityElement(children: .combine)
            .accessibilityIdentifier("game-combo")
        }
    }

    var tone: Color {
        switch streak.tier {
        case .blazing: PL.vermilion
        case .hot: PL.malachite
        default: PL.ochre
        }
    }
}

struct GameHeader: View {
    let total: Int
    let results: [Bool]
    let streak: ComboCount

    var body: some View {
        VStack(spacing: PL.Space.s2) {
            GamePips(total: total, results: results, empty: PL.paper.opacity(0.25))
                .accessibilityIdentifier("game-header")
            ComboChip(streak: streak).frame(minHeight: PL.Space.s6)
        }
    }
}

struct GameAnswer: View {
    let text: String
    var flag: String?
    var state: RowState = .other
    var answer = false
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: PL.Space.s3) {
                if let flag { PlayFlag(lang: flag, size: 32) }
                Text(text).font(PL.heading.font(scale: 0.75)).lineLimit(2).minimumScaleFactor(0.6)
            }
            .padding(.horizontal, PL.Space.s4)
            .frame(maxWidth: .infinity, minHeight: 52)
        }
        .buttonStyle(GameAnswerStyle(state: state))
        .accessibilityIdentifier("game-answer")
        .accessibilityValue(GameLaunch.revealAnswer && answer ? "answer" : "")
    }
}

struct GameAnswerStyle: ButtonStyle {
    let state: RowState

    func makeBody(configuration: Configuration) -> some View {
        let down = configuration.isPressed
        configuration.label
            .foregroundStyle(state == .right || state == .wrong ? PL.paper : PL.ink)
            .environment(\.colorScheme, .light)
            .background(face, in: .rect(cornerRadius: PL.Radius.lg))
            .overlay { RoundedRectangle(cornerRadius: PL.Radius.lg).strokeBorder(lip, lineWidth: 2) }
            .background(lip, in: .rect(cornerRadius: PL.Radius.lg).offset(y: down ? 1 : PL.Lip.md))
            .offset(y: down ? 3 : 0)
            .padding(.bottom, PL.Lip.md)
            .animation(.easeOut(duration: PL.Motion.press), value: down)
    }

    var face: Color { state == .right ? PL.malachite : state == .wrong ? PL.vermilion : PL.card }
    var lip: Color { state == .right ? PL.malachiteDeep : state == .wrong ? PL.vermilionDeep : PL.paper3 }
}

@MainActor
enum GameStatusBar {
    private static var scenes = 0
    #if os(iOS)
    private static var before: UIStatusBarStyle?
    #endif

    static func enter() {
        #if os(iOS)
        if scenes == 0 { before = UIApplication.shared.statusBarStyle }
        #endif
        scenes += 1
        apply()
    }

    static func leave() {
        scenes = max(0, scenes - 1)
        apply()
    }

    static var light: Bool { scenes > 0 }

    private static func apply() {
        #if os(iOS)
        UIApplication.shared.setStatusBarStyle(light ? .lightContent : before ?? .default, animated: true)
        #endif
    }
}

extension View {
    func lightStatusBar() -> some View {
        onAppear { GameStatusBar.enter() }.onDisappear { GameStatusBar.leave() }
    }
}

struct GameShell<Content: View>: View {
    @Environment(\.verticalSizeClass) private var vertical
    @Environment(\.accessibilityReduceMotion) private var systemReduce
    let game: GameKind
    var feel: GameFeel?
    var fit = false
    var burst = true
    @ViewBuilder let content: () -> Content

    var reduce: Bool { GameMotion.reduced(system: systemReduce) }

    var body: some View {
        GeometryReader { geo in
            page.environment(\.playRoom, geo.size.height).environment(\.playSpan, geo.size.width)
        }
        .overlay { if let feel, burst { GameBurst(feel: feel, reduce: reduce) } }
        .gameFeedback(feel)
        .environment(\.gameReduceMotion, reduce)
        .plGround(.lattice, band: true)
        .navigationTitle(game.title)
        .inlineTitle()
        .toolbar {
            ToolbarItem(placement: .principal) {
                Text(game.title)
                    .font(PL.heading.font())
                    .foregroundStyle(PL.paper)
                    .lineLimit(1)
                    .minimumScaleFactor(0.6)
                    .accessibilityAddTraits(.isHeader)
                    .accessibilityIdentifier("playTitle")
            }
            ToolbarItem(placement: .confirmationAction) {
                StartLearningButton(size: .sm, full: false)
            }
        }
        .lightStatusBar()
        .fullHeightSession()
        .onDisappear { LangVoice.shared.hush() }
        .accessibilityIdentifier("play-\(game.rawValue)")
    }

    @ViewBuilder
    var page: some View {
        if fit {
            FitPage(center: vertical == .compact) { content() }
        } else {
            ScrollView {
                VStack(alignment: .leading, spacing: PL.Space.s4) {
                    content()
                }
                .padding(.horizontal, PL.Space.s4)
                .padding(.bottom, PlayFoot.pad(vertical))
            }
            .scrollContentBackground(.hidden)
        }
    }
}
