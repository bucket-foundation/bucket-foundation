import BucketKit
import SwiftUI
#if os(iOS)
import CoreMotion
#endif

@MainActor
final class TiltReader {
    #if os(iOS)
    let motion = CMMotionManager()
    #endif
    var available: Bool {
        #if os(iOS)
        motion.isDeviceMotionAvailable
        #else
        false
        #endif
    }

    func start() {
        #if os(iOS)
        guard motion.isDeviceMotionAvailable else { return }
        motion.deviceMotionUpdateInterval = 1.0 / 20
        motion.startDeviceMotionUpdates()
        #endif
    }

    var z: Double? {
        #if os(iOS)
        motion.deviceMotion.map { $0.gravity.z * 9.81 }
        #else
        nil
        #endif
    }

    func stop() {
        #if os(iOS)
        motion.stopDeviceMotionUpdates()
        #endif
    }
}

struct ForeheadGame: View {
    @Environment(LangStore.self) private var langs
    @State private var picked: [String] = []
    @State private var cards: [ForeheadCard] = []
    @State private var index = 0
    @State private var marks: [Bool] = []
    @State private var endsAt: Date?
    @State private var left = ForeheadDeck.seconds
    @State private var armed = true
    @State private var over = false
    @State private var root = "en"
    @State private var reader = TiltReader()
    @State private var recorded = false

    var card: ForeheadCard? { index < cards.count ? cards[index] : nil }

    var body: some View {
        PlayScene(game: .forehead, stickers: playStickers(.ticket, .star)) {
            if over || PlayLaunch.endGame {
                results
            } else if endsAt != nil, let card {
                play(card)
            } else {
                setup
            }
        }
        .task { await langs.load(); if picked.isEmpty { picked = Array(langs.playTargets.prefix(2)) } }
        .task(id: endsAt) { await clock() }
        .onDisappear { reader.stop() }
    }

    var setup: some View {
        VStack(alignment: .leading, spacing: PL.Space.s4) {
            Text("Hold the phone to your forehead. Friends give clues in any language. Tilt down when you get it, up to pass. No tilt sensor? Use the buttons.")
                .font(PL.body.font()).foregroundStyle(PL.paper)
            PlayLabel(text: "Languages on the cards")
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: PL.Space.s2) {
                    ForEach(Snakes.langChoices.filter { $0 != root }, id: \.self) { l in
                        Button { picked = ForeheadRules.toggle(picked, l) } label: { PLPill(Lang.name(l), active: picked.contains(l)) }.buttonStyle(.plain)
                    }
                }
            }
            Button("Start") { start() }.buttonStyle(.pl(.primary, size: .lg)).disabled(picked.isEmpty)
        }
    }

    func play(_ c: ForeheadCard) -> some View {
        VStack(spacing: PL.Space.s4) {
            HStack {
                PlayLabel(text: "\(marks.filter { $0 }.count) scored")
                Spacer()
                PlayLabel(text: "\(left)s")
            }
            PLCard {
                VStack(spacing: PL.Space.s2) {
                    PlayLabel(text: Lang.name(c.lang), onDark: false)
                    Text(c.form).font(PL.word.font(scale: 1.2)).foregroundStyle(PL.ink).lineLimit(2).minimumScaleFactor(0.4).multilineTextAlignment(.center)
                    if let r = c.reading?.roman ?? c.reading?.kana { Text(r).font(PL.body.font()).foregroundStyle(PL.inkDim) }
                }
                .frame(maxWidth: .infinity, minHeight: 220)
            }
            HStack(spacing: PL.Space.s3) {
                Button("Pass") { mark(false) }.buttonStyle(.pl(.ghost, size: .lg))
                Button("Got it") { mark(true) }.buttonStyle(.pl(.success, size: .lg))
            }
        }
    }

    var results: some View {
        let shown = Array(cards.prefix(marks.count))
        return PlayResults(
            title: "\(marks.filter { $0 }.count) scored",
            line: "\(marks.filter { !$0 }.count) passed. Hand the phone to the next player.",
            reveals: Array(shown.map { PlayRevealItem(lang: $0.lang, form: $0.form, meaning: $0.meaning) }.prefix(8)),
            root: root,
            again: { over = false; start() }
        )
        .onAppear {
            guard !recorded else { return }
            recorded = true
            langs.recordPlay(.forehead, zip(shown, marks).map { c, ok in PlayedWord(itemId: c.itemId, lang: c.lang, form: c.form, gloss: c.meaning, right: ok) }, points: marks.filter { $0 }.count)
        }
    }

    func start() {
        guard let corpus = langs.corpus else { return }
        root = langs.deckRoot(corpus)
        cards = ForeheadDeck.deck(corpus.items, langs: picked.filter { $0 != root }, seed: DealSeeds.fresh(), root: root)
        index = 0
        marks = []
        recorded = false
        armed = true
        left = ForeheadDeck.seconds
        endsAt = Date().addingTimeInterval(Double(ForeheadDeck.seconds))
        reader.start()
    }

    func mark(_ ok: Bool) {
        guard endsAt != nil, !over else { return }
        marks.append(ok)
        PlaySound.effect(ok, combo: marks.filter { $0 }.count)
        index += 1
        if RevealRules.forehead(cardsLeft: cards.count - index, secondsLeft: left) { finish() }
    }

    func finish() {
        over = true
        endsAt = nil
        reader.stop()
    }

    func clock() async {
        while let endsAt, !Task.isCancelled {
            left = max(0, Int(endsAt.timeIntervalSinceNow.rounded(.up)))
            if left <= 0 { finish(); return }
            let z = reader.z
            if armed, let t = TiltRules.classify(z) {
                armed = false
                mark(t == .score)
            } else if TiltRules.settled(z) {
                armed = true
            }
            try? await Task.sleep(for: .milliseconds(50))
        }
    }
}
