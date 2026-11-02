import BucketKit
import SwiftUI

struct ShareBrand: View {
    var mark: CGFloat = 56
    var color = D8.ink

    var body: some View {
        HStack(spacing: mark * 0.18) {
            Text(Feedback.isPolingual ? String(localized: "Po") : String(localized: "B"))
                .font(.system(size: mark * 0.46, weight: .heavy, design: .rounded))
                .foregroundStyle(D8.parchment)
                .frame(width: mark, height: mark)
                .background(Color(hex: 0x5B1A4A), in: .rect(cornerRadius: mark * 0.25))
                .overlay(alignment: .topTrailing) { if Feedback.isPolingual { Circle().fill(D8.vermilion).frame(width: mark * 0.2, height: mark * 0.2).padding(mark * 0.12) } }
            Text(Feedback.isPolingual ? String(localized: "polingual") : String(localized: "bucket")).font(.system(size: mark * 0.54, weight: .heavy, design: .rounded)).foregroundStyle(color)
        }
    }
}

struct ShareCard: View {
    let langs: [String]
    let streak: Int
    let learned: Int

    var body: some View {
        VStack(alignment: .leading, spacing: 18) {
            ShareBrand()
            Spacer(minLength: 0)
            HStack(spacing: 10) {
                ForEach(langs.prefix(5), id: \.self) { FlagTile(lang: $0, size: 64) }
            }
            if streak > 0 {
                HStack(alignment: .firstTextBaseline, spacing: 10) {
                    Image(systemName: "flame.fill").font(.system(size: 44)).foregroundStyle(LinearGradient(colors: [Color(hex: 0xE9A23B), D8.vermilion], startPoint: .top, endPoint: .bottom))
                    Text("\(streak)").font(.system(size: 72, weight: .heavy, design: .rounded)).foregroundStyle(D8.vermilion)
                    Text("DAY STREAK").font(D8.caps(18)).tracking(2).foregroundStyle(Color(hex: 0x5d5650))
                }
            }
            Text(learned > 0 ? String(localized: "\(learned) words in \(langs.map(langName).joined(separator: ", "))") : langs.map(langName).joined(separator: ", "))
                .font(.system(size: 26, weight: .bold, design: .rounded))
                .foregroundStyle(D8.ink)
                .fixedSize(horizontal: false, vertical: true)
            Spacer(minLength: 0)
            Text(Feedback.isPolingual ? String(localized: "polingual.com") : String(localized: "bucket.foundation")).font(D8.caps(16)).tracking(1.5).foregroundStyle(Color(hex: 0x5B1A4A))
        }
        .padding(48)
        .frame(width: ShareCardView.size.width, height: ShareCardView.size.height, alignment: .leading)
        .background(D8.parchment)
        .overlay(alignment: .bottom) { Rectangle().fill(Color(hex: 0x5B1A4A)).frame(height: 18) }
    }
}

struct WordShareCard: View {
    let gloss: String
    let words: [(lang: String, form: String)]

    var body: some View {
        VStack(alignment: .leading, spacing: 20) {
            Text(gloss).font(D8.caps(20)).tracking(2).foregroundStyle(Color(hex: 0x5d5650))
            Spacer(minLength: 0)
            ForEach(words.prefix(6), id: \.lang) { w in
                HStack(spacing: 14) {
                    FlagTile(lang: w.lang, size: 52)
                    Text(w.form).font(.system(size: 40, weight: .heavy, design: .rounded)).foregroundStyle(D8.ink).lineLimit(1).minimumScaleFactor(0.5)
                }
            }
            Spacer(minLength: 0)
            Text(Feedback.isPolingual ? String(localized: "One word, every language. polingual.com") : String(localized: "One word, every language. bucket.foundation"))
                .font(D8.caps(15)).tracking(1.2).foregroundStyle(Color(hex: 0x5B1A4A))
        }
        .padding(48)
        .frame(width: ShareCardView.size.width, height: ShareCardView.size.height, alignment: .leading)
        .background(D8.parchment)
        .overlay(alignment: .bottom) { Rectangle().fill(Color(hex: 0x5B1A4A)).frame(height: 18) }
    }
}

enum Share {
    static var appLink: URL { URL(string: "https://apps.apple.com/app/id\(Feedback.appID)")! }

    @MainActor
    static func renderer(_ object: ShareObject, _ style: ShareStyle) -> ImageRenderer<ShareCardView> {
        let r = ImageRenderer(content: ShareCardView(object: object, style: style))
        r.scale = 2
        return r
    }
}

struct InviteFriend: View {
    var body: some View {
        ShareLink(item: Share.appLink, message: Text("I'm learning languages together on \(Feedback.appName). Join me:")) {
            Label("Invite a friend", systemImage: "person.badge.plus")
        }
    }
}
