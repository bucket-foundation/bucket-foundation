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

struct PlayScene<Content: View>: View {
    let game: GameKind
    let stickers: [PLSticker]
    @ViewBuilder let content: () -> Content

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: PL.Space.s4) {
                HStack(alignment: .bottom) {
                    PLHeader(game.title, subtitle: game.detail, onDark: true)
                    StartLearningButton(size: .sm, full: false)
                }
                .frame(minHeight: 92, alignment: .bottomLeading)
                .background { PLStickerLayer(stickers).padding(.trailing, 120) }
                content()
            }
            .padding(.horizontal, PL.Space.s4)
            .padding(.bottom, PL.Space.s6)
        }
        .scrollContentBackground(.hidden)
        .plGround(.lattice, band: true)
        .navigationTitle(game.title)
        .plChrome()
        .fullHeightSession()
        .onDisappear { LangVoice.shared.hush() }
        .accessibilityIdentifier("play-\(game.rawValue)")
    }
}

struct PlayLabel: View {
    let text: String
    var onDark = true

    var body: some View {
        Text(text.uppercased()).font(PL.label.font()).tracking(1.2).foregroundStyle(onDark ? PL.paper.opacity(0.85) : PL.inkDim)
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
                    PlayLabel(text: Lang.name(lang), onDark: false)
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
                    PlayLabel(text: Lang.name(root), onDark: false)
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
    let again: (() -> Void)?

    var body: some View {
        VStack(alignment: .leading, spacing: PL.Space.s4) {
            PLCard(.tyrian) {
                VStack(alignment: .leading, spacing: PL.Space.s2) {
                    Text(title).font(PL.title.font()).foregroundStyle(PL.paper).accessibilityIdentifier("playResults")
                    Text(line).font(PL.body.font()).foregroundStyle(PL.paper.opacity(0.9))
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
            if let again { Button(againLabel, action: again).buttonStyle(.pl(.primary, size: .lg)) }
            StartLearningButton()
        }
    }
}

struct PlayNote: View {
    let text: String
    var art: PLArt = .seal

    var body: some View {
        HStack(spacing: PL.Space.s3) {
            PLArtView(art).frame(width: 44)
            Text(text).font(PL.body.font()).foregroundStyle(PL.paper)
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

func playStickers(_ main: PLArt, _ second: PLArt = .seal) -> [PLSticker] {
    [
        PLSticker(main, .bottomTrailing, width: 92, x: -10, y: -6, angle: 8),
        PLSticker(second, .topTrailing, width: 48, x: -4, y: 0, angle: -9),
        PLSticker(.pebble, .bottomTrailing, width: 22, x: -2, y: -2, angle: 12),
    ]
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
