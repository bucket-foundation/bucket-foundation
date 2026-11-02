import BucketKit
import SwiftUI
#if os(iOS)
import UIKit
#endif

extension ShareObject {
    var text: String {
        switch self {
        case .streak(let days, let langs, _):
            langs.isEmpty ? String(localized: "\(days) day streak on \(Feedback.appName)") : String(localized: "\(days) days in a row learning \(langs.map(langName).joined(separator: ", ")) on \(Feedback.appName)")
        case .system(_, _, let targets, _, _): String(localized: "Learning \(targets.map(langName).joined(separator: ", ")) together on \(Feedback.appName)")
        case .language(let lang, _), .flag(let lang, _): String(localized: "Learning \(langName(lang)) on \(Feedback.appName)")
        case .mastered(let lang, let count, _): String(localized: "\(count) words mastered in \(langName(lang)) on \(Feedback.appName)")
        case .word(_, let gloss, let forms): "\(gloss): " + forms.prefix(6).map(\.form).joined(separator: " · ")
        case .tile(let form, let gloss, _): form.form == gloss ? form.form : "\(form.form): \(gloss)"
        case .score(let s): String(localized: "\(s.right) of \(s.total) right in \(s.source) on \(Feedback.appName)")
        case .content(let m): m.quote ?? m.title
        }
    }

    var sheetTitle: String {
        switch self {
        case .streak: String(localized: "Share your streak")
        case .system: String(localized: "Share your language system")
        case .language: String(localized: "Share this language")
        case .mastered: String(localized: "Share your words")
        case .word: String(localized: "Share this word")
        case .tile: String(localized: "Share this tile")
        case .flag: String(localized: "Share this flag")
        case .score: String(localized: "Share your score")
        case .content: String(localized: "Share this moment")
        }
    }

    var page: SharePage { SharePage(route, title: text) }
}

private let plum = Color(hex: 0x5B1A4A)
private let stone = Color(hex: 0x5d5650)

struct ShareCardView: View {
    static let size = CGSize(width: 540, height: 675)
    let object: ShareObject
    let style: ShareStyle

    var body: some View {
        face
            .frame(width: Self.size.width, height: Self.size.height)
            .clipped()
            .environment(\.colorScheme, .light)
    }

    @ViewBuilder var face: some View {
        switch object {
        case .streak(let days, let langs, _):
            switch style {
            case .hundred: HundredCard(days: days)
            case .ledger: ShareCard(langs: langs, streak: days, learned: 0)
            default: FlameCard(days: days, langs: langs)
            }
        case .system(let name, let root, let targets, let streak, let learned):
            switch style {
            case .wall: FlagWallCard(name: name, langs: targets)
            case .ledger: ShareCard(langs: targets, streak: streak, learned: learned)
            default: TreeCard(name: name, root: root, targets: targets)
            }
        case .language(let lang, _):
            if style == .plate { FlagPlateCard(lang: lang, dark: false) } else { FlagBannerCard(lang: lang, word: nil, reading: nil, line: String(localized: "Learning it on \(Feedback.appName)")) }
        case .mastered(let lang, let count, _):
            if style == .banner { FlagBannerCard(lang: lang, word: "\(count)", reading: nil, line: String(localized: "words mastered")) } else { MasteredCard(lang: lang, count: count) }
        case .flag(let lang, _):
            if style == .plate { FlagPlateCard(lang: lang, dark: true) } else { FlagBannerCard(lang: lang, word: nil, reading: nil, line: nil) }
        case .word(_, let gloss, let forms):
            switch style {
            case .wall: TileWallCard(gloss: gloss, forms: forms)
            case .tile: TileCard(form: forms.first ?? ShareForm(lang: "en", form: gloss), gloss: gloss, reading: nil)
            default: WordShareCard(gloss: gloss, words: forms.map { (lang: $0.lang, form: $0.form) })
            }
        case .tile(let form, let gloss, let reading):
            if style == .banner { FlagBannerCard(lang: form.lang, word: form.form, reading: reading, line: gloss == form.form ? nil : gloss) } else { TileCard(form: form, gloss: gloss, reading: reading) }
        case .score(let s):
            if style == .ring { RingCard(score: s) } else { NumberCard(score: s) }
        case .content(let m):
            switch style {
            case .moment: MomentCard(moment: m)
            case .quote: QuoteCard(moment: m)
            default: CoverCard(moment: m)
            }
        }
    }
}

struct CardFoot: View {
    var color = D8.ink
    var trailing: String?

    var body: some View {
        HStack {
            ShareBrand(mark: 36, color: color)
            Spacer(minLength: 8)
            Text(trailing ?? (Feedback.isPolingual ? String(localized: "polingual.com") : String(localized: "bucket.foundation")))
                .font(trailing == nil ? D8.caps(15) : .system(size: 22, weight: .heavy, design: .rounded))
                .foregroundStyle(color)
        }
    }
}

struct CardFlags: View {
    let langs: [String]
    var size: CGFloat = 52

    var body: some View {
        HStack(spacing: 10) {
            ForEach(langs.prefix(6), id: \.self) { FlagTile(lang: $0, size: size) }
        }
    }
}

struct FlameCard: View {
    let days: Int
    let langs: [String]

    var body: some View {
        VStack(spacing: 0) {
            Spacer(minLength: 0)
            Image(systemName: "flame.fill").font(.system(size: 92)).foregroundStyle(D8.parchment)
            Text("\(days)").font(.system(size: 180, weight: .heavy, design: .rounded)).foregroundStyle(.white).lineLimit(1).minimumScaleFactor(0.5)
            Text("DAY STREAK").font(D8.caps(26)).tracking(4).foregroundStyle(D8.parchment)
            Spacer(minLength: 0)
            CardFlags(langs: langs).padding(.bottom, 28)
            CardFoot(color: .white)
        }
        .padding(40)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(LinearGradient(colors: [Color(hex: 0xE9A23B), D8.vermilion, D8.vermilionLip], startPoint: .top, endPoint: .bottom))
    }
}

struct HundredCard: View {
    let days: Int

    var body: some View {
        let g = StreakGoal(streak: Double(days))
        VStack(alignment: .leading, spacing: 22) {
            Text(g.reached ? String(localized: "Day \(g.day)") : String(localized: "Day \(g.day) of 100"))
                .font(.system(size: 48, weight: .heavy, design: .rounded)).foregroundStyle(D8.parchment)
            Grid(horizontalSpacing: 10, verticalSpacing: 10) {
                ForEach(0..<10, id: \.self) { row in
                    GridRow {
                        ForEach(0..<10, id: \.self) { col in
                            Circle().fill(row * 10 + col < g.day ? D8.vermilion : D8.parchment.opacity(0.14)).frame(width: 36, height: 36)
                        }
                    }
                }
            }
            .frame(maxWidth: .infinity)
            Spacer(minLength: 0)
            CardFoot(color: D8.parchment)
        }
        .padding(40)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(D8.ink)
    }
}

struct TreeCard: View {
    let name: String
    let root: String
    let targets: [String]

    var body: some View {
        let shown = Array(targets.prefix(8))
        let row = min(108, 372 / CGFloat(max(1, shown.count)))
        VStack(alignment: .leading, spacing: 0) {
            Text(name).font(.system(size: 38, weight: .heavy, design: .rounded)).foregroundStyle(D8.ink).lineLimit(1).minimumScaleFactor(0.5)
            Text(shown.count == 1 ? String(localized: "One root, one language") : String(localized: "One root, \(shown.count) languages")).font(D8.caps(16)).tracking(1.2).foregroundStyle(stone).padding(.top, 4).padding(.bottom, 20)
            HStack(spacing: 14) {
                FlagTile(lang: root, size: 64)
                Text(langName(root)).font(.system(size: 28, weight: .heavy, design: .rounded)).foregroundStyle(D8.ink)
            }
            ForEach(Array(shown.enumerated()), id: \.element) { i, l in
                HStack(spacing: 12) {
                    ZStack(alignment: .topLeading) {
                        Rectangle().fill(plum).frame(width: 5, height: i == shown.count - 1 ? row / 2 + 2 : row)
                        Rectangle().fill(plum).frame(width: 34, height: 5).offset(y: row / 2 - 2)
                    }
                    .frame(width: 34, height: row, alignment: .topLeading)
                    .padding(.leading, 30)
                    FlagTile(lang: l, size: row - 12)
                    Text(langName(l)).font(.system(size: min(26, row * 0.5), weight: .bold, design: .rounded)).foregroundStyle(D8.ink)
                }
            }
            Spacer(minLength: 0)
            CardFoot()
        }
        .padding(40)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
        .background(D8.parchment)
    }
}

struct FlagWallCard: View {
    let name: String
    let langs: [String]

    var body: some View {
        let shown = Array(langs.prefix(9))
        let cols = shown.count <= 1 ? 1 : shown.count <= 4 ? 2 : 3
        let size: CGFloat = cols == 1 ? 300 : cols == 2 ? 200 : 136
        VStack(spacing: 18) {
            Spacer(minLength: 0)
            LazyVGrid(columns: Array(repeating: GridItem(.fixed(size), spacing: 16), count: cols), spacing: 16) {
                ForEach(shown, id: \.self) { FlagTile(lang: $0, size: size) }
            }
            Spacer(minLength: 0)
            Text(name).font(.system(size: 34, weight: .heavy, design: .rounded)).foregroundStyle(D8.parchment).lineLimit(1).minimumScaleFactor(0.5)
            CardFoot(color: D8.parchment)
        }
        .padding(40)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(D8.ink)
    }
}

struct FlagBannerCard: View {
    let lang: String
    let word: String?
    let reading: String?
    let line: String?

    var body: some View {
        VStack(spacing: 0) {
            FlagFace(flag: D8Flag.of(lang), emblem: word == nil)
            VStack(alignment: .leading, spacing: 8) {
                if let word {
                    Text(langName(lang).uppercased()).font(D8.caps(18)).tracking(2).foregroundStyle(stone)
                    Text(word).font(D8.word(68)).foregroundStyle(D8.ink).lineLimit(2).minimumScaleFactor(0.4)
                        .environment(\.layoutDirection, Lang.isRTL(lang) ? .rightToLeft : .leftToRight)
                } else {
                    Text(langName(lang)).font(D8.word(64)).foregroundStyle(D8.ink).lineLimit(1).minimumScaleFactor(0.5)
                }
                if let reading { Text(reading).font(.system(size: 22)).foregroundStyle(D8.ipa).lineLimit(1).minimumScaleFactor(0.6) }
                if let line { Text(line).font(.system(size: 24, weight: .bold, design: .rounded)).foregroundStyle(stone).lineLimit(2) }
                CardFoot().padding(.top, 10)
            }
            .padding(32)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(D8.parchment)
        }
    }
}

struct FlagPlateCard: View {
    let lang: String
    let dark: Bool

    var body: some View {
        let ink = dark ? D8.parchment : D8.ink
        VStack(spacing: 20) {
            Spacer(minLength: 0)
            FlagTile(lang: lang, size: 300)
            Text(langName(lang)).font(D8.word(54)).foregroundStyle(ink).lineLimit(1).minimumScaleFactor(0.5)
            Spacer(minLength: 0)
            CardFoot(color: ink)
        }
        .padding(40)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(dark ? D8.ink : D8.parchment)
    }
}

struct TileCard: View {
    let form: ShareForm
    let gloss: String
    let reading: String?

    var body: some View {
        VStack(spacing: 18) {
            Spacer(minLength: 0)
            TileFace(word: form.form, lang: form.lang, reading: reading, size: 420)
                .frame(width: 420, height: 420)
                .modifier(Glaze(radius: 30, lip: 10))
            if gloss != form.form {
                Text(gloss).font(.system(size: 30, weight: .bold, design: .rounded)).foregroundStyle(stone).lineLimit(1).minimumScaleFactor(0.5)
            }
            Spacer(minLength: 0)
            CardFoot()
        }
        .padding(40)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(D8.parchment)
    }
}

struct TileWallCard: View {
    let gloss: String
    let forms: [ShareForm]

    var body: some View {
        let shown = Array(forms.prefix(6))
        let size: CGFloat = shown.count <= 4 ? 216 : 142
        VStack(spacing: 16) {
            Text(gloss).font(D8.word(38)).foregroundStyle(D8.parchment).lineLimit(1).minimumScaleFactor(0.5).frame(maxWidth: .infinity, alignment: .leading)
            Spacer(minLength: 0)
            LazyVGrid(columns: Array(repeating: GridItem(.fixed(size), spacing: 14), count: shown.count <= 4 ? 2 : 3), spacing: 14) {
                ForEach(shown, id: \.lang) { f in
                    TileFace(word: f.form, lang: f.lang, reading: nil, size: size)
                        .frame(width: size, height: size)
                        .modifier(Glaze(radius: size * 0.07))
                }
            }
            Spacer(minLength: 0)
            CardFoot(color: D8.parchment)
        }
        .padding(40)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(D8.ink)
    }
}

struct MasteredCard: View {
    let lang: String
    let count: Int

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            FlagTile(lang: lang, size: 96)
            Spacer(minLength: 0)
            Text("\(count)").font(.system(size: 170, weight: .heavy, design: .rounded)).foregroundStyle(.white).lineLimit(1).minimumScaleFactor(0.5)
            Text(count == 1 ? String(localized: "word mastered") : String(localized: "words mastered")).font(.system(size: 34, weight: .bold, design: .rounded)).foregroundStyle(D8.parchment)
            Text(langName(lang)).font(.system(size: 30, weight: .bold, design: .rounded)).foregroundStyle(D8.parchment.opacity(0.8))
            Spacer(minLength: 0)
            CardFoot(color: .white)
        }
        .padding(40)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
        .background(D8.malachite)
    }
}

struct NumberCard: View {
    let score: ShareScore

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            Text(score.source.uppercased()).font(D8.caps(22)).tracking(2.5).foregroundStyle(D8.parchment.opacity(0.8)).lineLimit(1).minimumScaleFactor(0.5)
            Spacer(minLength: 0)
            HStack(alignment: .lastTextBaseline, spacing: 6) {
                Text("\(score.right)").font(.system(size: 170, weight: .heavy, design: .rounded)).foregroundStyle(.white).lineLimit(1).minimumScaleFactor(0.5)
                Text("/\(score.total)").font(.system(size: 64, weight: .heavy, design: .rounded)).foregroundStyle(D8.parchment.opacity(0.7)).lineLimit(1).minimumScaleFactor(0.5)
            }
            Text("\(score.right) of \(score.total) right").font(.system(size: 30, weight: .bold, design: .rounded)).foregroundStyle(D8.parchment)
            Spacer(minLength: 0)
            CardFlags(langs: score.langs).padding(.bottom, 26)
            CardFoot(color: .white)
        }
        .padding(40)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
        .background(D8.lapis)
    }
}

struct RingCard: View {
    let score: ShareScore

    var body: some View {
        VStack(spacing: 16) {
            Text(score.source).font(.system(size: 34, weight: .heavy, design: .rounded)).foregroundStyle(D8.ink).lineLimit(1).minimumScaleFactor(0.5)
            Spacer(minLength: 0)
            ZStack {
                Circle().stroke(D8.keyline, lineWidth: 30)
                Circle().trim(from: 0, to: Double(score.percent) / 100).stroke(D8.malachite, style: StrokeStyle(lineWidth: 30, lineCap: .round)).rotationEffect(.degrees(-90))
                Text("\(score.percent)%").font(.system(size: 92, weight: .heavy, design: .rounded)).foregroundStyle(D8.ink)
            }
            .frame(width: 300, height: 300)
            Spacer(minLength: 0)
            Text("\(score.right) of \(score.total) right").font(.system(size: 28, weight: .bold, design: .rounded)).foregroundStyle(stone)
            if score.streak > 1 { Text("\(score.streak) day streak").font(D8.caps(18)).tracking(1.5).foregroundStyle(D8.vermilion) }
            CardFoot()
        }
        .padding(40)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(D8.parchment)
    }
}

struct MomentArt: View {
    let moment: ShareMoment
    var size: CGFloat = 76

    var body: some View {
        if let lang = moment.lang { FlagTile(lang: lang, size: size) } else { BranchTile(branch: moment.branch, size: size) }
    }
}

struct MomentHeader: View {
    let moment: ShareMoment

    var body: some View {
        HStack(spacing: 14) {
            MomentArt(moment: moment)
            VStack(alignment: .leading, spacing: 2) {
                Text(moment.title).font(.system(size: 26, weight: .heavy, design: .rounded)).foregroundStyle(.white).lineLimit(1).minimumScaleFactor(0.6)
                Text(moment.source).font(.system(size: 21, weight: .semibold, design: .rounded)).foregroundStyle(.white.opacity(0.75)).lineLimit(1)
            }
        }
    }
}

extension ShareMoment {
    var playLine: String? { clock.map { String(localized: "Play from \($0)") } }
}

struct QuoteCard: View {
    let moment: ShareMoment

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            MomentHeader(moment: moment)
            Spacer(minLength: 0)
            Text(moment.quote ?? moment.title)
                .font(.system(size: 42, weight: .heavy, design: .rounded))
                .foregroundStyle(.white)
                .minimumScaleFactor(0.5)
                .lineSpacing(2)
                .frame(maxWidth: .infinity, alignment: .leading)
                .environment(\.layoutDirection, moment.lang.map(Lang.isRTL) == true ? .rightToLeft : .leftToRight)
            Spacer(minLength: 0)
            CardFoot(color: .white, trailing: moment.playLine)
        }
        .padding(40)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
        .background {
            ZStack(alignment: .topLeading) {
                Color(hex: 0x6B1414)
                Text(verbatim: "\u{201C}").font(.system(size: 460, weight: .black, design: .serif)).foregroundStyle(.white.opacity(0.1)).offset(x: 20, y: 40)
            }
        }
    }
}

struct CoverCard: View {
    let moment: ShareMoment

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            Spacer(minLength: 0)
            MomentArt(moment: moment, size: 220)
            Text(moment.title).font(.system(size: 52, weight: .heavy, design: .rounded)).foregroundStyle(D8.ink).lineLimit(3).minimumScaleFactor(0.5).padding(.top, 14)
            Text(moment.source).font(.system(size: 26, weight: .semibold, design: .rounded)).foregroundStyle(stone).lineLimit(2)
            Spacer(minLength: 0)
            CardFoot(trailing: moment.playLine)
        }
        .padding(40)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
        .background(D8.parchment)
    }
}

struct MomentCard: View {
    let moment: ShareMoment

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            MomentHeader(moment: moment)
            Spacer(minLength: 0)
            Text("Play from").font(D8.caps(24)).tracking(3).foregroundStyle(.white.opacity(0.8))
            Text(moment.clock ?? "").font(.system(size: 130, weight: .heavy, design: .rounded)).foregroundStyle(.white).lineLimit(1).minimumScaleFactor(0.5)
            Spacer(minLength: 0)
            CardFoot(color: .white)
        }
        .padding(40)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
        .background(D8.lapis)
    }
}

struct ObjectShareSheet: View {
    let object: ShareObject
    @State private var picked: ShareStyle?
    @State private var copied = false

    var style: ShareStyle { picked ?? object.styles[0] }

    var body: some View {
        GeometryReader { g in
            let width = min(g.size.width - 72, (g.size.height - 190) * 0.8, 420)
            VStack(spacing: 14) {
                Text(object.sheetTitle).font(.headline).foregroundStyle(Palette.ink).padding(.top, 22)
                ScrollView(.horizontal, showsIndicators: false) {
                    LazyHStack(spacing: 14) {
                        ForEach(object.styles) { s in
                            ShareCardView(object: object, style: s)
                                .scaleEffect(width / ShareCardView.size.width, anchor: .topLeading)
                                .frame(width: width, height: width * 1.25, alignment: .topLeading)
                                .clipShape(.rect(cornerRadius: 18))
                                .accessibilityElement()
                                .accessibilityLabel(Text("\(object.sheetTitle), card \((object.styles.firstIndex(of: s) ?? 0) + 1)"))
                                .id(s)
                        }
                    }
                    .scrollTargetLayout()
                }
                .contentMargins(.horizontal, max(0, (g.size.width - width) / 2), for: .scrollContent)
                .scrollTargetBehavior(.viewAligned)
                .scrollPosition(id: $picked, anchor: .center)
                .frame(height: width * 1.25)
                HStack(spacing: 8) {
                    ForEach(object.styles) { s in
                        Circle().fill(s == style ? D8.vermilion : Palette.muted.opacity(0.3)).frame(width: 8, height: 8)
                    }
                }
                .accessibilityHidden(true)
                Spacer(minLength: 0)
                HStack(spacing: 12) {
                    Button {
                        copy()
                    } label: {
                        Label(copied ? String(localized: "Copied") : String(localized: "Copy link"), systemImage: copied ? "checkmark" : "link")
                    }
                    .buttonStyle(D8Option(align: .center))
                    send
                }
                .padding(.horizontal, 20)
                .padding(.bottom, 12)
            }
            .frame(maxWidth: .infinity)
        }
        .background(Palette.paper.ignoresSafeArea())
        .presentationDetents([.large])
        .presentationDragIndicator(.visible)
    }

    @ViewBuilder var send: some View {
        #if os(iOS)
        Button {
            guard let image = Share.renderer(object, style).uiImage else { return }
            let object = object, style = style
            ScreenShare.shared.present(object.page, image: image) { target, sent in
                Beta.shared.log("card_share", ["object": .string(object.kind), "style": .string(style.rawValue), "to": .string(target), "sent": .string(sent ? "1" : "0")])
            }
        } label: {
            Label("Share", systemImage: "square.and.arrow.up").frame(maxWidth: .infinity)
        }
        .buttonStyle(D8Primary())
        #else
        if let image = Share.renderer(object, style).nsImage {
            ShareLink(item: object.page.url, subject: Text(object.text), message: Text(object.text), preview: SharePreview(object.text, image: Image(nsImage: image))) {
                Label("Share", systemImage: "square.and.arrow.up").frame(maxWidth: .infinity)
            }
            .buttonStyle(D8Primary())
        }
        #endif
    }

    func copy() {
        #if os(iOS)
        UIPasteboard.general.url = object.page.url
        #else
        NSPasteboard.general.clearContents()
        NSPasteboard.general.setString(object.page.url.absoluteString, forType: .string)
        #endif
        copied = true
    }
}

struct ShareOption: Identifiable {
    let title: String
    let object: ShareObject
    var id: String { object.id }

    init(_ object: ShareObject) {
        title = object.sheetTitle
        self.object = object
    }
}

struct ShareObjectButton: View {
    let options: [ShareOption]
    var wide = false
    @State private var open: ShareObject?

    init(_ objects: ShareObject..., wide: Bool = false) {
        options = objects.map(ShareOption.init)
        self.wide = wide
    }

    var body: some View {
        control
            .sheet(item: $open) { ObjectShareSheet(object: $0) }
            #if DEBUG
            .task {
                let args = ProcessInfo.processInfo.arguments
                guard let i = args.firstIndex(of: "-openShare"), i + 1 < args.count else { return }
                open = options.first { $0.object.kind == args[i + 1] }?.object
            }
            #endif
    }

    @ViewBuilder var control: some View {
        if options.count > 1 {
            Menu {
                ForEach(options) { o in Button(o.title) { open = o.object } }
            } label: {
                icon
            }
            .accessibilityLabel(Text("Share"))
        } else if let only = options.first {
            if wide {
                Button { open = only.object } label: {
                    Label(only.title, systemImage: "square.and.arrow.up")
                }
                .buttonStyle(D8Option(align: .center))
            } else {
                Button { open = only.object } label: { icon }
                    .buttonStyle(.borderless)
                    .accessibilityLabel(Text(only.title))
            }
        }
    }

    var icon: some View {
        Image(systemName: "square.and.arrow.up").font(.headline)
    }
}

struct ShareMenu: ViewModifier {
    let object: ShareObject?
    @State private var open: ShareObject?

    func body(content: Content) -> some View {
        content
            .contextMenu {
                if let object {
                    Button(object.sheetTitle, systemImage: "square.and.arrow.up") { open = object }
                }
            }
            .sheet(item: $open) { ObjectShareSheet(object: $0) }
    }
}

extension View {
    func shareMenu(_ object: ShareObject?) -> some View { modifier(ShareMenu(object: object)) }
}
