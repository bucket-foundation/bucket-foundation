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
    #if BUCKET
    static let name = "Bucket"
    #else
    static let name = "Polingual"
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
        case .accessoryCircular:
            Gauge(value: StreakGoal(streak: Double(c.streak)).fraction) {
                Image(systemName: "flame.fill")
            } currentValueLabel: {
                Text("\(c.streak)")
            }
            .gaugeStyle(.accessoryCircularCapacity)
        case .accessoryRectangular:
            VStack(alignment: .leading, spacing: 1) {
                Text(s.gloss).font(.caption2.weight(.semibold)).textCase(.uppercase)
                Text(s.words.map(\.form).joined(separator: " · ")).font(.headline).lineLimit(2)
            }
        case .accessoryInline:
            Text("\(goal) · \(c.due) due")
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
                    Text("\(c.due) due").font(.subheadline.weight(.bold))
                    Text("\(c.new) new").font(.subheadline).foregroundStyle(WidgetInk.ink.opacity(0.6))
                    Spacer(minLength: 4)
                    Text(s.gloss).font(.caption.weight(.heavy)).textCase(.uppercase).foregroundStyle(WidgetInk.plum).lineLimit(1)
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
            Text("\(c.due) due · \(c.new) new").font(.caption.weight(.semibold))
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
                        .foregroundStyle(WidgetInk.ink).lineLimit(1).minimumScaleFactor(0.35)
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
        .supportedFamilies([.systemSmall, .systemMedium, .accessoryCircular, .accessoryRectangular, .accessoryInline])
    }
}

@main
struct PolingualWidgets: WidgetBundle {
    var body: some Widget { PolingualWidget() }
}
