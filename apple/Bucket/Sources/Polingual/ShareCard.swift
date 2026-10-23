import BucketKit
import SwiftUI

struct ShareCard: View {
    let langs: [String]
    let streak: Int
    let learned: Int

    var body: some View {
        VStack(alignment: .leading, spacing: 18) {
            HStack(spacing: 10) {
                Text(Feedback.isPolingual ? String(localized: "Po") : String(localized: "B"))
                    .font(.system(size: 26, weight: .heavy, design: .rounded))
                    .foregroundStyle(D8.parchment)
                    .frame(width: 56, height: 56)
                    .background(Color(hex: 0x5B1A4A), in: .rect(cornerRadius: 14))
                    .overlay(alignment: .topTrailing) { if Feedback.isPolingual { Circle().fill(D8.vermilion).frame(width: 11, height: 11).padding(7) } }
                Text(Feedback.isPolingual ? String(localized: "polingual") : String(localized: "bucket")).font(.system(size: 30, weight: .heavy, design: .rounded)).foregroundStyle(D8.ink)
            }
            HStack(spacing: 10) {
                ForEach(langs.prefix(5), id: \.self) { FlagTile(lang: $0, size: 64) }
            }
            HStack(alignment: .firstTextBaseline, spacing: 10) {
                Image(systemName: "flame.fill").font(.system(size: 44)).foregroundStyle(LinearGradient(colors: [Color(hex: 0xE9A23B), D8.vermilion], startPoint: .top, endPoint: .bottom))
                Text("\(streak)").font(.system(size: 72, weight: .heavy, design: .rounded)).foregroundStyle(D8.vermilion)
                Text("DAY STREAK").font(D8.caps(18)).tracking(2).foregroundStyle(Color(hex: 0x5d5650))
            }
            Text("\(learned) words in \(langs.map(langName).joined(separator: ", "))")
                .font(.system(size: 26, weight: .bold, design: .rounded))
                .foregroundStyle(D8.ink)
                .fixedSize(horizontal: false, vertical: true)
            Text(Feedback.isPolingual ? String(localized: "polingual.com") : String(localized: "bucket.foundation")).font(D8.caps(16)).tracking(1.5).foregroundStyle(Color(hex: 0x5B1A4A))
        }
        .padding(48)
        .frame(width: 1080 / 2, alignment: .leading)
        .background(D8.parchment)
        .overlay(alignment: .bottom) { Rectangle().fill(Color(hex: 0x5B1A4A)).frame(height: 18) }
    }
}

enum Share {
    static var appLink: URL { URL(string: "https://apps.apple.com/app/id\(Feedback.appID)")! }

    static func message(langs: [String], streak: Int) -> String {
        let set = langs.map(langName).joined(separator: ", ")
        let lead = streak > 1 ? "\(streak) days in a row" : "Today"
        return "\(lead) learning \(set) together on \(Feedback.appName). Try it: \(appLink.absoluteString)"
    }

    @MainActor
    static func image(langs: [String], streak: Int, learned: Int) -> Image? {
        let r = ImageRenderer(content: ShareCard(langs: langs, streak: streak, learned: learned))
        r.scale = 2
        #if os(iOS)
        return r.uiImage.map { Image(uiImage: $0) }
        #else
        return r.nsImage.map { Image(nsImage: $0) }
        #endif
    }
}

struct ShareProgress: View {
    let langs: [String]
    let streak: Int
    let learned: Int

    var body: some View {
        if let image = Share.image(langs: langs, streak: streak, learned: learned) {
            ShareLink(item: image, message: Text(Share.message(langs: langs, streak: streak)),
                      preview: SharePreview("\(Feedback.appName) progress", image: image)) {
                Label("Share your progress", systemImage: "square.and.arrow.up")
            }
            .buttonStyle(D8Option(align: .center))
        }
    }
}

struct InviteFriend: View {
    var body: some View {
        ShareLink(item: Share.appLink, message: Text("I'm learning languages together on \(Feedback.appName). Join me:")) {
            Label("Invite a friend", systemImage: "person.badge.plus")
        }
    }
}
