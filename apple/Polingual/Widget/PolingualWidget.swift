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
        let entry = SnapshotEntry(date: .now, snapshot: WidgetSnapshot.read() ?? .placeholder)
        completion(Timeline(entries: [entry], policy: .after(.now.addingTimeInterval(3600))))
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

    var body: some View {
        switch family {
        case .accessoryCircular:
            Gauge(value: 0) {
                Image(systemName: "flame.fill")
            } currentValueLabel: {
                Text("\(s.due)")
            }
            .gaugeStyle(.accessoryCircularCapacity)
        case .accessoryRectangular:
            VStack(alignment: .leading, spacing: 1) {
                Text(s.gloss).font(.caption2.weight(.semibold)).textCase(.uppercase)
                Text(s.words.map(\.form).joined(separator: " · ")).font(.headline).lineLimit(2)
            }
        case .accessoryInline:
            Text("\(s.due) due · \(s.words.first?.form ?? s.gloss)")
        case .systemSmall:
            VStack(alignment: .leading, spacing: 6) {
                HStack(spacing: 4) {
                    Image(systemName: "flame.fill").foregroundStyle(WidgetInk.vermilion)
                    Text("\(s.streak)").font(.system(size: 28, weight: .heavy, design: .rounded))
                }
                Text("\(s.due) due").font(.headline)
                Text("\(s.newToday) new").font(.subheadline).foregroundStyle(WidgetInk.ink.opacity(0.6))
                Spacer(minLength: 0)
                Text(s.words.first?.form ?? "").font(.system(size: 17, weight: .bold, design: .rounded)).foregroundStyle(WidgetInk.plum).lineLimit(1).minimumScaleFactor(0.6)
            }
            .foregroundStyle(WidgetInk.ink)
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        default:
            HStack(alignment: .top, spacing: 16) {
                VStack(alignment: .leading, spacing: 6) {
                    HStack(spacing: 4) {
                        Image(systemName: "flame.fill").foregroundStyle(WidgetInk.vermilion)
                        Text("\(s.streak)").font(.system(size: 28, weight: .heavy, design: .rounded))
                    }
                    Text("\(s.due) due").font(.headline)
                    Text("\(s.newToday) new").font(.subheadline).foregroundStyle(WidgetInk.ink.opacity(0.6))
                }
                VStack(alignment: .leading, spacing: 4) {
                    Text(s.gloss).font(.caption.weight(.bold)).textCase(.uppercase).foregroundStyle(WidgetInk.ink.opacity(0.6))
                    ForEach(s.words.prefix(4), id: \.lang) { w in
                        Text(w.form).font(.system(size: 17, weight: .bold, design: .rounded)).foregroundStyle(WidgetInk.plum).lineLimit(1).minimumScaleFactor(0.6)
                    }
                }
                .frame(maxWidth: .infinity, alignment: .leading)
            }
            .foregroundStyle(WidgetInk.ink)
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        }
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
