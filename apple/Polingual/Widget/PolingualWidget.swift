import BucketKit
import SwiftUI
import WidgetKit

struct SnapshotEntry: TimelineEntry {
    let date: Date
    let snapshot: WidgetSnapshot
}

struct SnapshotProvider: TimelineProvider {
    func placeholder(in context: Context) -> SnapshotEntry { SnapshotEntry(date: .now, snapshot: .placeholder) }

    func getSnapshot(in context: Context, completion: @escaping (SnapshotEntry) -> Void) {
        completion(SnapshotEntry(date: .now, snapshot: context.isPreview ? .placeholder : WidgetSnapshot.read() ?? .placeholder))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<SnapshotEntry>) -> Void) {
        let snapshot = WidgetSnapshot.read() ?? .placeholder
        let now = Date.now
        let times = [now] + snapshot.changes(after: now)
        let entries = times.map { SnapshotEntry(date: $0, snapshot: snapshot) }
        completion(Timeline(entries: entries, policy: .after(max(times.last ?? now, now).addingTimeInterval(3600))))
    }
}

enum WidgetBrand {
    #if os(iOS)
    static let families: [WidgetFamily] = [.systemSmall, .systemMedium, .accessoryCircular, .accessoryRectangular, .accessoryInline]
    #else
    static let families: [WidgetFamily] = [.systemSmall, .systemMedium]
    #endif

    #if BUCKET
    static let name = "Bucket"
    static let voice = URL(string: "bucket://voice")
    #else
    static let name = "Polingual"
    static let voice = URL(string: "polingual://voice")
    #endif
}

enum WidgetInk {
    static let parchment = Color(red: 0xF6 / 255, green: 0xEE / 255, blue: 0xDC / 255)
    static let ink = Color(red: 0x23 / 255, green: 0x1F / 255, blue: 0x20 / 255)
    static let vermilion = Color(red: 0xD9 / 255, green: 0x38 / 255, blue: 0x1E / 255)
    static let plum = Color(red: 0x5B / 255, green: 0x1A / 255, blue: 0x4A / 255)
}

struct PolingualWidgetView: View {
    @Environment(\.widgetFamily) private var family
    let entry: SnapshotEntry

    var s: WidgetSnapshot { entry.snapshot }
    var c: WidgetCounts { entry.snapshot.counts(at: entry.date) }

    var body: some View {
        switch family {
        #if os(iOS)
        case .accessoryCircular:
            Gauge(value: StreakGoal(streak: Double(c.streak)).fraction) {
                Image(systemName: "flame.fill")
            } currentValueLabel: {
                Text("\(c.streak)")
            }
            .gaugeStyle(.accessoryCircularCapacity)
        case .accessoryRectangular:
            VStack(alignment: .leading, spacing: 1) {
                Text(s.gloss).font(.caption2.weight(.semibold)).textCase(.uppercase).lineLimit(1).minimumScaleFactor(0.5)
                Text(s.words.map(\.form).joined(separator: " · ")).font(.headline).lineLimit(2).minimumScaleFactor(0.5)
            }
        case .accessoryInline:
            ViewThatFits {
                Text("\(goal) · \(c.due) due")
                Text(verbatim: "\(c.streak) · \(c.due)")
            }
        #endif
        case .systemSmall:
            VStack(alignment: .leading, spacing: 6) {
                tally
                Spacer(minLength: 0)
                if let w = s.words.first { WidgetTile(word: w.form, lang: w.lang) }
            }
            .foregroundStyle(WidgetInk.ink)
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        default:
            VStack(alignment: .leading, spacing: 8) {
                HStack(alignment: .firstTextBaseline, spacing: 10) {
                    HStack(alignment: .firstTextBaseline, spacing: 3) {
                        Image(systemName: "flame.fill").foregroundStyle(WidgetInk.vermilion)
                        Text("\(c.streak)").font(.system(size: 22, weight: .heavy, design: .rounded))
                        if c.streak < StreakGoal.target { Text(verbatim: "/100").font(.caption.weight(.bold)).foregroundStyle(WidgetInk.ink.opacity(0.55)) }
                    }
                    .layoutPriority(2)
                    Text("\(c.due) due").font(.subheadline.weight(.bold)).lineLimit(1).minimumScaleFactor(0.6).layoutPriority(1)
                    Text("\(c.new) new").font(.subheadline).foregroundStyle(WidgetInk.ink.opacity(0.6)).lineLimit(1).minimumScaleFactor(0.6)
                    Spacer(minLength: 4)
                    Text(s.gloss).font(.caption.weight(.heavy)).textCase(.uppercase).foregroundStyle(WidgetInk.plum).lineLimit(1).minimumScaleFactor(0.5)
                }
                HStack(spacing: 8) {
                    ForEach(s.words.prefix(4), id: \.lang) { w in WidgetTile(word: w.form, lang: w.lang) }
                }
                .frame(maxHeight: .infinity)
            }
            .foregroundStyle(WidgetInk.ink)
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        }
    }

    var goal: String {
        let g = StreakGoal(streak: Double(c.streak))
        if g.day == 0 { return String(localized: "Day 0 of 100") }
        return g.reached ? String(localized: "Day \(g.day)") : String(localized: "Day \(g.day) of 100")
    }

    var tally: some View {
        VStack(alignment: .leading, spacing: 2) {
            HStack(spacing: 4) {
                Image(systemName: "flame.fill").foregroundStyle(WidgetInk.vermilion)
                Text(goal).font(.system(size: 17, weight: .heavy, design: .rounded)).lineLimit(1).minimumScaleFactor(0.7)
            }
            ProgressView(value: StreakGoal(streak: Double(c.streak)).fraction).tint(WidgetInk.vermilion)
            Text("\(c.due) due · \(c.new) new").font(.caption.weight(.semibold)).lineLimit(1).minimumScaleFactor(0.6)
        }
    }
}

struct WidgetTile: View {
    let word: String
    let lang: String

    var name: String {
        guard Locale.current.language.languageCode?.identifier != "en", let tag = Lang.info[lang]?.bcp47,
              let n = Locale.current.localizedString(forLanguageCode: String(tag.prefix { $0 != "-" })) else { return Lang.name(lang) }
        return n.prefix(1).uppercased() + n.dropFirst()
    }

    var body: some View {
        GeometryReader { g in
            let side = min(g.size.width, g.size.height)
            ZStack {
                FlagFace(flag: D8Flag.of(lang), emblem: false)
                RoundedRectangle(cornerRadius: 4).fill(WidgetInk.parchment.opacity(0.82)).padding(side * 0.07)
                VStack(spacing: 2) {
                    Text(name.uppercased()).font(.system(size: max(7, side * 0.085), weight: .bold, design: .monospaced))
                        .foregroundStyle(WidgetInk.ink.opacity(0.65)).lineLimit(1).minimumScaleFactor(0.6)
                    Text(word).font(.system(size: side * 0.22, weight: .heavy, design: .rounded))
                        .foregroundStyle(WidgetInk.ink).lineLimit(1).minimumScaleFactor(0.2).allowsTightening(true)
                        .environment(\.layoutDirection, Lang.isRTL(lang) ? .rightToLeft : .leftToRight)
                }
                .padding(.horizontal, side * 0.11)
                Shine()
            }
            .frame(width: g.size.width, height: g.size.height)
            .modifier(Glaze(radius: max(8, side * 0.14)))
        }
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("\(name), \(word)")
    }
}

struct PolingualWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "PolingualToday", provider: SnapshotProvider()) { entry in
            PolingualWidgetView(entry: entry)
                .containerBackground(WidgetInk.parchment, for: .widget)
        }
        .configurationDisplayName(WidgetBrand.name)
        .description("Your streak, reviews due and the word of the day.")
        .supportedFamilies(WidgetBrand.families)
    }
}

struct VoiceWidgetView: View {
    @Environment(\.widgetFamily) private var family

    var mic: some View {
        Image(systemName: "mic.fill").font(.system(size: 40, weight: .bold)).foregroundStyle(WidgetInk.vermilion)
            .frame(width: 84, height: 84).background(WidgetInk.parchment, in: .circle)
    }

    var body: some View {
        switch family {
        #if os(iOS)
        case .accessoryCircular:
            ZStack {
                AccessoryWidgetBackground()
                Image(systemName: "mic.fill").font(.title2.weight(.bold))
            }
        #endif
        case .systemMedium:
            HStack(spacing: 18) {
                mic
                VStack(alignment: .leading, spacing: 2) {
                    Text("Translate").font(.system(size: 26, weight: .heavy, design: .rounded)).lineLimit(1).minimumScaleFactor(0.5)
                    Text("Tap and speak").font(.subheadline.weight(.semibold)).lineLimit(1).minimumScaleFactor(0.6)
                }
                .foregroundStyle(WidgetInk.parchment)
                Spacer(minLength: 0)
            }
        default:
            VStack(spacing: 8) {
                mic
                Text("Tap and speak").font(.system(size: 14, weight: .heavy, design: .rounded)).foregroundStyle(WidgetInk.parchment).lineLimit(1).minimumScaleFactor(0.7)
            }
        }
    }
}

struct VoiceWidget: Widget {
    var families: [WidgetFamily] {
        #if os(iOS)
        [.systemSmall, .systemMedium, .accessoryCircular]
        #else
        [.systemSmall, .systemMedium]
        #endif
    }

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "PolingualVoice", provider: SnapshotProvider()) { _ in
            VoiceWidgetView()
                .widgetURL(WidgetBrand.voice)
                .containerBackground(WidgetInk.vermilion, for: .widget)
        }
        .configurationDisplayName("Translate")
        .description("One tap, then speak.")
        .supportedFamilies(families)
    }
}

struct StreakWidgetView: View {
    @Environment(\.widgetFamily) private var family
    let entry: SnapshotEntry

    var streak: Int { entry.snapshot.counts(at: entry.date).streak }
    var lit: Bool { entry.snapshot.studiedToday(at: entry.date) }
    var ink: Color { lit ? WidgetInk.parchment : StreakInk.ash }
    var flame: String { lit ? "flame.fill" : "flame" }
    var line: String { lit ? String(localized: "On fire today") : String(localized: "Not yet today") }

    var body: some View {
        switch family {
        #if os(iOS)
        case .accessoryCircular:
            ZStack {
                AccessoryWidgetBackground()
                VStack(spacing: 0) {
                    Image(systemName: flame).font(.title3.weight(.bold))
                    Text(verbatim: "\(streak)").font(.system(size: 16, weight: .heavy, design: .rounded)).lineLimit(1).minimumScaleFactor(0.4)
                }
            }
            .widgetAccentable()
        #endif
        default:
            VStack(spacing: 4) {
                ZStack(alignment: .bottomTrailing) {
                    Image(systemName: flame).font(.system(size: 52, weight: .bold))
                        .foregroundStyle(lit ? WidgetInk.parchment : StreakInk.ash.opacity(0.7))
                    if !lit {
                        Text(verbatim: "😞").font(.system(size: 22)).grayscale(1)
                            .background(StreakInk.cold, in: .circle)
                    }
                }
                Text(verbatim: "\(streak)").font(.system(size: 40, weight: .heavy, design: .rounded)).lineLimit(1).minimumScaleFactor(0.4)
                Text(line).font(.system(size: 13, weight: .heavy, design: .rounded)).lineLimit(1).minimumScaleFactor(0.5)
            }
            .foregroundStyle(ink)
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .accessibilityElement(children: .ignore)
            .accessibilityLabel(Text("\(streak) day streak. \(line)"))
        }
    }
}

enum StreakInk {
    static let ash = Color(red: 0x6E / 255, green: 0x6A / 255, blue: 0x66 / 255)
    static let cold = Color(red: 0xD9 / 255, green: 0xD6 / 255, blue: 0xD1 / 255)
}

struct StreakWidget: Widget {
    var families: [WidgetFamily] {
        #if os(iOS)
        [.systemSmall, .accessoryCircular]
        #else
        [.systemSmall]
        #endif
    }

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "PolingualStreak", provider: SnapshotProvider()) { entry in
            StreakWidgetView(entry: entry)
                .containerBackground(entry.snapshot.studiedToday(at: entry.date) ? WidgetInk.vermilion : StreakInk.cold, for: .widget)
        }
        .configurationDisplayName("Streak")
        .description("Gray until you study today, then on fire.")
        .supportedFamilies(families)
    }
}

@main
struct PolingualWidgets: WidgetBundle {
    var body: some Widget {
        StreakWidget()
        VoiceWidget()
        PolingualWidget()
    }
}
