import BucketKit
import SwiftUI

@MainActor
enum PlayAssets {
    static func data(_ name: String, _ ext: String) -> Data? {
        let url = Bundle.main.url(forResource: name, withExtension: ext, subdirectory: "Corpus/play") ?? Bundle.main.url(forResource: name, withExtension: ext)
        return url.flatMap { try? Data(contentsOf: $0) }
    }

    static let bank: PolywordBank? = data("polyword-bank", "json").flatMap { try? JSONDecoder().decode(PolywordBank.self, from: $0) }
    static let words: [PlayWord] = data("words", "json").flatMap { try? JSONDecoder().decode([PlayWord].self, from: $0) } ?? []
    static let land: String = data("land", "txt").flatMap { String(data: $0, encoding: .utf8) } ?? ""
}

enum PlayLaunch {
    static var endGame: Bool {
        #if DEBUG
        Launch.flag("-endGame")
        #else
        false
        #endif
    }
}

extension LangStore {
    var playRoot: String { dailySystem?.root ?? "en" }

    var playTargets: [String] {
        let t = dailySystem?.targets ?? []
        return t.isEmpty ? ["es", "fr", "de"] : t
    }

    func deckRoot(_ corpus: LangCorpus) -> String { PlayDecks.root(playRoot, items: corpus.items) }
}

struct StartLearningButton: View {
    @Environment(\.learnUpsell) private var upsell
    var size: PLButtonSize = .md
    var full = true

    var body: some View {
        Button("Start learning") {
            if let upsell { upsell() } else { NotificationCenter.default.post(name: .startStudy, object: nil) }
        }
        .buttonStyle(.pl(.secondary, size: size, full: full))
        .accessibilityIdentifier("startLearning")
    }
}

extension EnvironmentValues {
    @Entry var playRoom: CGFloat = 0
    @Entry var playSpan: CGFloat = 0
}

struct PlayBoardFrame: ViewModifier {
    @Environment(\.playRoom) private var room
    @Environment(\.verticalSizeClass) private var vertical
    let chrome: CGFloat
    let least: CGFloat

    func body(content: Content) -> some View {
        content.frame(height: PlayBoard.height(room: room, chrome: chrome + PlayFoot.pad(vertical), least: least))
    }
}

enum PlayFoot {
    static func pad(_ vertical: UserInterfaceSizeClass?) -> CGFloat { vertical == .compact ? PL.Space.s2 : PL.Space.s6 }
}

extension View {
    func playBoard(chrome: CGFloat, least: CGFloat) -> some View { modifier(PlayBoardFrame(chrome: chrome, least: least)) }
}

struct PlaySplit<Side: View, Main: View>: View {
    @Environment(\.playSpan) private var span
    @ScaledMetric private var wanted: CGFloat = 240
    let board: CGFloat
    @ViewBuilder let side: () -> Side
    @ViewBuilder let main: () -> Main

    var body: some View {
        HStack(alignment: .top, spacing: PL.Space.s4) {
            side().frame(width: PlayBoard.side(width: span - PL.Space.s4 * 3, wanted: wanted, board: board))
            main()
        }
    }
}

@MainActor
@Observable
final class PlayActivity {
    static let shared = PlayActivity()
    private(set) var scenes = 0
    var playing: Bool { scenes > 0 }
    func enter() { scenes += 1 }
    func leave() { scenes = max(0, scenes - 1) }
}

extension View {
    func playActivity() -> some View {
        onAppear { PlayActivity.shared.enter() }.onDisappear { PlayActivity.shared.leave() }
    }
}

struct PlayScene<Content: View>: View {
    @Environment(\.verticalSizeClass) private var vertical
    let game: GameKind
    @ViewBuilder let content: () -> Content

    var body: some View {
        GeometryReader { geo in
            page.environment(\.playRoom, geo.size.height).environment(\.playSpan, geo.size.width)
        }
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
        .fullHeightSession()
        .onDisappear { LangVoice.shared.hush() }
        .accessibilityIdentifier("play-\(game.rawValue)")
    }

    var page: some View {
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

struct PlayLabel: View {
    let text: String
    var onDark = true

    var body: some View {
        Text(LocalizedStringKey(text)).textCase(.uppercase).font(PL.label.font()).tracking(1.2).foregroundStyle(onDark ? PL.paper.opacity(0.85) : PL.inkDim)
    }
}

struct PlayReveal: View {
    let lang: String
    let form: String
    let meaning: String
    let root: String

    var body: some View {
        PLCard {
            VStack(alignment: .leading, spacing: PL.Space.s2) {
                HStack(alignment: .firstTextBaseline, spacing: PL.Space.s3) {
                    Text(form).font(PL.word.font(scale: 0.8)).foregroundStyle(PL.ink).lineLimit(2).minimumScaleFactor(0.6)
                    PlayLabel(text: langName(lang), onDark: false)
                    Spacer(minLength: 0)
                    Button {
                        LangVoice.shared.speak(form, lang)
                    } label: {
                        PLGlyphView(.speaker, size: 22).foregroundStyle(PL.lapis).frame(width: 44, height: 44)
                    }
                    .buttonStyle(.plain)
                    .accessibilityLabel("Play \(form)")
                }
                if let w = PlayLookup.word(PlayAssets.words, lang: lang, form: form), let f = w.form(lang), let sound = f.ipa ?? f.roman ?? f.kana {
                    Text(sound).font(PL.small.font()).foregroundStyle(PL.inkDim)
                }
                HStack(spacing: PL.Space.s2) {
                    PlayLabel(text: langName(root), onDark: false)
                    Text(meaning).font(PL.body.font()).foregroundStyle(PL.ink)
                }
            }
        }
    }
}

struct PlayRevealItem: Identifiable, Hashable {
    let lang: String
    let form: String
    let meaning: String
    var id: String { "\(lang):\(form)" }
}

struct PlayResults: View {
    let title: String
    let line: String
    var reveals: [PlayRevealItem] = []
    let root: String
    var board: [BoardRow] = []
    var againLabel = "Play again"
    var share: (kind: GameKind, shape: GameShare.Shape)?
    var retry: (kind: GameKind, deck: String?, start: () -> Void)?
    let again: (() -> Void)?
    @Environment(LangStore.self) private var langs

    var body: some View {
        VStack(alignment: .leading, spacing: PL.Space.s4) {
            PLCard(.tyrian) {
                VStack(alignment: .leading, spacing: PL.Space.s2) {
                    Text(LocalizedStringKey(title)).font(PL.title.font()).foregroundStyle(PL.paper).accessibilityIdentifier("playResults")
                    Text(LocalizedStringKey(line)).font(PL.body.font()).foregroundStyle(PL.paper.opacity(0.9))
                }
            }
            if !board.isEmpty {
                PLCard {
                    VStack(spacing: PL.Space.s2) {
                        ForEach(Array(board.enumerated()), id: \.offset) { i, r in
                            HStack {
                                Text("\(i + 1)  \(r.name)").font(PL.body.font()).foregroundStyle(r.me ? PL.vermilion : PL.ink)
                                Spacer()
                                Text("\(r.score)").font(PL.body.font()).monospacedDigit().foregroundStyle(PL.ink)
                            }
                        }
                    }
                }
            }
            ForEach(reveals) { PlayReveal(lang: $0.lang, form: $0.form, meaning: $0.meaning, root: root) }
            if let share { GameShareButton(kind: share.kind, text: langs.shareText(share.kind, share.shape), style: .pl(.primary, size: .lg)) }
            if let retry { TryAgainOffer(kind: retry.kind, deck: retry.deck, start: retry.start) }
            if let kind = share?.kind ?? retry?.kind { LiveResultActions(kind: kind) }
            if let again {
                if let kind = share?.kind, DailyLedger.shared.spent {
                    DailyLimitCard(place: "game:\(kind.rawValue)")
                } else {
                    Button(LocalizedStringKey(againLabel), action: again).buttonStyle(.pl(.primary, size: .lg))
                }
            }
            StartLearningButton()
        }
        .resultScreen()
    }
}

struct PlayNote: View {
    let text: String
    var art: PLArt = .seal

    var body: some View {
        HStack(spacing: PL.Space.s3) {
            PLArtView(art).frame(width: 44)
            Text(LocalizedStringKey(text)).font(PL.body.font()).foregroundStyle(PL.paper)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

struct PlayChoice: View {
    let text: String
    var state: Bool? = nil
    let action: () -> Void

    var body: some View {
        Button(text, action: action)
            .buttonStyle(.pl(state == true ? .success : state == false ? .accent : .ghost, size: .md))
    }
}

struct PlayFlag: View {
    let lang: String
    var size: CGFloat = 36

    var body: some View {
        FlagTile(lang: lang, size: size)
    }
}

enum PlaySound {
    @MainActor static func auto(_ text: String, _ lang: String) { LangVoice.shared.speak(text, lang, kind: .auto) }
    @MainActor static func effect(_ right: Bool, combo: Int = 0) {
        GameSound.play(right: right, combo: combo)
        haptic(right)
    }
}

func playWords(_ items: [PlayRevealItem]) -> [PlayRevealItem] {
    var seen = Set<String>()
    return items.filter { seen.insert($0.id).inserted }
}

struct PlayedWord {
    let itemId: String
    let lang: String
    let form: String
    let gloss: String
    let right: Bool
}

extension LangStore {
    @discardableResult
    func recordPlay(_ kind: GameKind, _ words: [PlayedWord], points: Int) -> Bool {
        let root = playRoot
        let played = words.map { GameWord(itemId: $0.itemId, lang: $0.lang, form: $0.form, gloss: $0.gloss, root: root) }
        let missed = zip(words, played).filter { !$0.0.right }.map(\.1)
        return recordGame(kind, played: played, hits: words.filter(\.right).count, points: points, missed: missed)
    }
}

func localPolyDate(_ d: Date = Date()) -> PolyDate {
    let c = Calendar.current.dateComponents([.year, .month, .day], from: d)
    return PolyDate(c.year!, c.month!, c.day!)
}
