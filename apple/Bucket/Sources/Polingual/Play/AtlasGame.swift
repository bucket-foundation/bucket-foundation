import BucketKit
import SwiftUI

enum LandPath {
    static func parse(_ d: String) -> Path {
        var path = Path()
        var cmd: Character = "M"
        var nums: [Double] = []
        var token = ""
        func flushNumber() {
            if let v = Double(token) { nums.append(v) }
            token = ""
        }
        func emit() {
            guard nums.count >= 2 else { return }
            let p = CGPoint(x: nums[0], y: nums[1])
            if cmd == "M" { path.move(to: p) } else { path.addLine(to: p) }
            nums = []
        }
        for ch in d {
            if ch == "M" || ch == "L" || ch == "Z" {
                flushNumber()
                emit()
                if ch == "Z" { path.closeSubpath() } else { cmd = ch }
            } else if ch == " " || ch == "," {
                flushNumber()
                if nums.count == 2 { emit() }
            } else {
                token.append(ch)
            }
        }
        flushNumber()
        emit()
        return path
    }

    @MainActor static let land = parse(PlayAssets.land)
}

struct AtlasGame: View {
    @Environment(LangStore.self) private var langs
    @State private var rounds: [AtlasRound] = []
    @State private var index = 0
    @State private var pin: LatLon?
    @State private var locked: Nearest?
    @State private var scores: [Int] = []
    @State private var heard = false
    @State private var root = "en"
    @State private var recorded = false

    var silent: Bool { LangVoice.shared.silent }
    var round: AtlasRound? { index < rounds.count ? rounds[index] : nil }
    var total: Int { scores.reduce(0, +) }

    var body: some View {
        PlayScene(game: .atlas, stickers: playStickers(.azulejo, .girih)) {
            if rounds.isEmpty {
                ProgressView().tint(PL.paper)
            } else if let round, !PlayLaunch.endGame {
                play(round)
            } else {
                results
            }
        }
        .task {
            await langs.load()
            guard rounds.isEmpty, let corpus = langs.corpus else { return }
            root = langs.deckRoot(corpus)
            rounds = Array(Atlas.rounds(corpus.items, date: PlayDecks.deckDay(), root: root).prefix(Atlas.rounds))
        }
        .task(id: index) {
            guard let round, !silent else { return }
            try? await Task.sleep(for: .milliseconds(400))
            PlaySound.auto(round.form, round.lang)
        }
    }

    func play(_ r: AtlasRound) -> some View {
        VStack(alignment: .leading, spacing: PL.Space.s3) {
            PlayLabel(text: "Word \(index + 1) of \(rounds.count) · \(total) points")
            if silent { PlayNote(text: "Sound is off, so each word shows in writing. Turn sound on to play by ear.", art: .ticket) }
            HStack(spacing: PL.Space.s3) {
                if silent || locked != nil || heard {
                    Text(r.form).font(PL.word.font(scale: 0.8)).foregroundStyle(PL.paper).lineLimit(1).minimumScaleFactor(0.5)
                } else {
                    Text("Listen").font(PL.heading.font()).foregroundStyle(PL.paper)
                }
                Spacer()
                Button {
                    LangVoice.shared.speak(r.form, r.lang)
                    heard = heard || silent
                } label: {
                    PLGlyphView(.speaker, size: 26).foregroundStyle(PL.paper).frame(width: 48, height: 48)
                }
                .buttonStyle(.plain)
                .accessibilityLabel("Play the word")
            }
            map(r)
            if let locked {
                Text("\(Int(locked.km)) km from \(Lang.name(r.lang)) · \(Atlas.points(locked.km)) points").font(PL.body.font()).foregroundStyle(PL.paper)
                if RevealRules.atlas(guessed: true) { PlayReveal(lang: r.lang, form: r.form, meaning: r.meaning, root: root) }
                Button(index + 1 < rounds.count ? "Next word" : "See results") { next() }.buttonStyle(.pl(.primary, size: .lg))
            } else {
                Button("Lock in") { lock(r) }.buttonStyle(.pl(.primary, size: .lg)).disabled(pin == nil)
            }
        }
    }

    func map(_ r: AtlasRound) -> some View {
        GeometryReader { geo in
            let k = geo.size.width / Atlas.mapW
            ZStack(alignment: .topLeading) {
                LandPath.land.applying(CGAffineTransform(scaleX: k, y: k)).fill(PL.paper2)
                if let pin {
                    let p = Atlas.project(lon: pin.lon, lat: pin.lat)
                    PLGlyphView(.plus, size: 20).foregroundStyle(PL.vermilion).position(x: p.x * k, y: p.y * k)
                }
                if let locked {
                    let h = Atlas.project(lon: locked.home.lon, lat: locked.home.lat)
                    Circle().fill(PL.malachite).frame(width: 14, height: 14).position(x: h.x * k, y: h.y * k)
                }
            }
            .contentShape(.rect)
            .onTapGesture { p in if locked == nil { pin = Atlas.unproject(x: p.x / k, y: p.y / k) } }
        }
        .aspectRatio(Atlas.mapW / Atlas.mapH, contentMode: .fit)
        .background(PL.lapisDeep, in: .rect(cornerRadius: 12))
    }

    func lock(_ r: AtlasRound) {
        guard let pin, let n = Atlas.nearestHome(r.lang, pin) else { return }
        locked = n
        let pts = Atlas.points(n.km)
        scores.append(pts)
        PlaySound.effect(pts > Atlas.max / 2, combo: scores.count)
    }

    func next() {
        index += 1
        pin = nil
        locked = nil
        heard = false
    }

    var results: some View {
        PlayResults(
            title: "\(total) points",
            line: "Five words a day. Same words for everyone.",
            reveals: rounds.prefix(max(scores.count, 1)).map { PlayRevealItem(lang: $0.lang, form: $0.form, meaning: $0.meaning) },
            root: root,
            board: Boards.fromGhosts(Atlas.ghosts(date: PlayDecks.deckDay()), you: total),
            again: nil
        )
        .onAppear {
            guard !recorded else { return }
            recorded = true
            let words = zip(rounds, scores).map { r, s in PlayedWord(itemId: r.itemId, lang: r.lang, form: r.form, gloss: r.meaning, right: s > Atlas.max / 2) }
            langs.recordPlay(.atlas, words, points: total)
        }
    }
}
