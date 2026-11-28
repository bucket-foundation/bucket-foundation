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

    func meaningRoot(_ lang: String) -> String { WordLookup.meaningRoot(lang, systems: systems, daily: dailySystem) }

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

typealias PlayScene = GameShell

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
    var root: String? = nil
    var id: String { "\(lang):\(form)" }
}

extension PlayRevealItem {
    init(_ word: GameWord) {
        self.init(lang: word.lang, form: word.form, meaning: word.gloss, root: word.root)
    }
}

typealias PlayResults = GameResults

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

struct PlayFlag: View {
    let lang: String
    var size: CGFloat = 36

    var body: some View {
        FlagTile(lang: lang, size: size)
    }
}

enum PlaySound {
    @MainActor static func auto(_ text: String, _ lang: String) { LangVoice.shared.speak(text, lang, kind: .auto) }
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
