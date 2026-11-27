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
    @State private var feel = GameFeel()
    @State private var rounds: [AtlasRound] = []
    @State private var index = 0
    @State private var pin: LatLon?
    @State private var locked: Nearest?
    @State private var scores: [Int] = []
    @State private var heard = false
    @State private var root = "en"
    @State private var entered = false
    @State private var practice = PracticeRound()
    @State private var day = PlayDecks.deckDay()
    @State private var racing = false
    @State private var zoom = AtlasZoom()
    @State private var pinchFrom: AtlasZoom?
    @State private var dragFrom: AtlasZoom?
    @State private var dragBase = CGSize.zero

    var silent: Bool { LangVoice.shared.silent }
    var round: AtlasRound? { index < rounds.count ? rounds[index] : nil }
    var total: Int { scores.reduce(0, +) }

    var body: some View {
        PlayScene(game: .atlas, feel: feel, burst: false) {
            if rounds.isEmpty {
                ProgressView().tint(PL.paper)
            } else if !entered && !practice.practicing {
                RecordedRound(kind: .atlas, deck: day, practice: practice.score, root: root) { retry() }
            } else if let round, !PlayLaunch.endGame {
                play(round)
            } else {
                results
            }
        }
        .task {
            let race = LobbyRace.seed
            await langs.load()
            guard rounds.isEmpty, let corpus = langs.corpus else { return }
            root = langs.deckRoot(corpus)
            racing = race != nil
            day = LobbyRaceSeed.deckDay(race)
            entered = racing || !DailyLedger.shared.hasPlayed(.atlas, deck: day)
            rounds = Array(Atlas.rounds(corpus.items, date: day, root: root).prefix(Atlas.rounds))
        }
        .task(id: index) {
            guard let round, !silent else { return }
            try? await Task.sleep(for: .milliseconds(400))
            PlaySound.auto(round.form, round.lang)
        }
    }

    func play(_ r: AtlasRound) -> some View {
        VStack(alignment: .leading, spacing: PL.Space.s3) {
            HStack {
                PlayLabel(text: "Word \(index + 1) of \(rounds.count) · \(total) points")
                Spacer(minLength: 0)
                ComboSlot(streak: feel.streak, multiplier: false)
            }
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
                    PLGlyphView(.speaker, size: 28)
                        .foregroundStyle(PL.tyrian)
                        .frame(width: 52, height: 52)
                        .background(PL.paper, in: .circle)
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
            let centre = CGPoint(x: geo.size.width / 2, y: geo.size.height / 2)
            ZStack(alignment: .topLeading) {
                LandPath.land.applying(CGAffineTransform(a: k * zoom.scale, b: 0, c: 0, d: k * zoom.scale, tx: zoom.offset.width, ty: zoom.offset.height)).fill(PL.paper2)
                if let pin {
                    let p = Atlas.project(lon: pin.lon, lat: pin.lat)
                    PLGlyphView(.plus, size: 20).foregroundStyle(PL.vermilion).position(zoom.screen(CGPoint(x: p.x * k, y: p.y * k)))
                }
                if let locked {
                    let h = Atlas.project(lon: locked.home.lon, lat: locked.home.lat)
                    Circle().fill(PL.malachite).frame(width: 14, height: 14).position(zoom.screen(CGPoint(x: h.x * k, y: h.y * k)))
                }
            }
            .frame(width: geo.size.width, height: geo.size.height, alignment: .topLeading)
            .clipped()
            .contentShape(.rect)
            .onTapGesture { p in
                guard locked == nil else { return }
                let c = zoom.content(p)
                pin = Atlas.unproject(x: c.x / k, y: c.y / k)
            }
            .gesture(
                DragGesture(minimumDistance: 8)
                    .onChanged { v in
                        guard pinchFrom == nil else { return }
                        if dragFrom == nil { dragBase = v.translation }
                        let from = dragFrom ?? zoom
                        dragFrom = from
                        zoom = from.moved(by: CGSize(width: v.translation.width - dragBase.width, height: v.translation.height - dragBase.height), in: geo.size)
                    }
                    .onEnded { _ in dragFrom = nil },
                isEnabled: zoom.zoomed
            )
            .simultaneousGesture(
                MagnifyGesture()
                    .onChanged { v in
                        let from = pinchFrom ?? zoom
                        pinchFrom = from
                        dragFrom = nil
                        zoom = from.scaled(to: from.scale * v.magnification, around: v.startLocation, in: geo.size)
                    }
                    .onEnded { _ in
                        pinchFrom = nil
                        dragFrom = nil
                    }
            )
            .overlay(alignment: .bottomTrailing) {
                HStack(spacing: 0) {
                    zoomButton(.minus, "Zoom out") { zoom = zoom.scaled(to: zoom.scale / AtlasZoom.step, around: centre, in: geo.size) }
                        .disabled(!zoom.zoomed)
                    zoomButton(.plus, "Zoom in") { zoom = zoom.scaled(to: zoom.scale * AtlasZoom.step, around: centre, in: geo.size) }
                        .disabled(zoom.scale >= AtlasZoom.most)
                }
                .padding(4)
            }
        }
        .aspectRatio(Atlas.mapW / Atlas.mapH, contentMode: .fit)
        .background(PL.lapisDeep)
        .clipShape(.rect(cornerRadius: PL.Radius.md))
    }

    func zoomButton(_ glyph: PLGlyph, _ label: LocalizedStringKey, _ act: @escaping () -> Void) -> some View {
        Button {
            withAnimation(.easeOut(duration: 0.2)) { act() }
        } label: {
            PLGlyphView(glyph, size: 16)
                .foregroundStyle(PL.ink)
                .frame(width: 32, height: 32)
                .background(PL.paper.opacity(0.92), in: .circle)
                .frame(width: FitScale.naturalTarget, height: FitScale.naturalTarget)
                .contentShape(.rect)
        }
        .buttonStyle(.plain)
        .accessibilityLabel(label)
    }

    func lock(_ r: AtlasRound) {
        guard let pin, let n = Atlas.nearestHome(r.lang, pin) else { return }
        locked = n
        let pts = Atlas.points(n.km)
        scores.append(pts)
        feel.record(pts > Atlas.max / 2, points: max(1, pts / 100))
    }

    func next() {
        index += 1
        pin = nil
        locked = nil
        heard = false
        zoom = AtlasZoom()
    }

    func retry() {
        feel.reset()
        practice.begin()
        scores = []
        index = 0
        pin = nil
        locked = nil
        heard = false
        zoom = AtlasZoom()
    }

    var results: some View {
        let title = "\(total) points"
        let shape = GameShare.Shape.points(total, marks: scores.map { $0 > Atlas.max / 2 })
        return PlayResults(
            title: title,
            line: "Five words a day. Same words for everyone.",
            reveals: rounds.prefix(max(scores.count, 1)).map { PlayRevealItem(lang: $0.lang, form: $0.form, meaning: $0.meaning) },
            root: root,
            board: Boards.fromGhosts(Atlas.ghosts(date: day), you: total),
            share: practice.practicing ? nil : (.atlas, shape),
            retry: practice.practicing || racing ? nil : (.atlas, day, { retry() }),
            again: nil
        )
        .onAppear {
            let practicing = practice.practicing
            let record = practice.finish(score: title)
            if practicing { entered = false }
            guard record else { return }
            if !racing { DailyLedger.shared.markPlayed(.atlas, deck: day, title: title, shape: shape) }
            let words = zip(rounds, scores).map { r, s in PlayedWord(itemId: r.itemId, lang: r.lang, form: r.form, gloss: r.meaning, right: s > Atlas.max / 2) }
            langs.recordPlay(.atlas, words, points: total)
        }
    }
}
