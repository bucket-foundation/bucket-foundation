import BucketKit
import SwiftUI

struct ShareBrand: View {
    var mark: CGFloat = 56
    var color = D8.ink

    var body: some View {
        HStack(spacing: mark * 0.18) {
            Image(Feedback.isPolingual ? "PolingualMark" : "BucketMark")
                .resizable()
                .scaledToFit()
                .frame(width: mark, height: mark)
                .accessibilityHidden(true)
            Text(Feedback.isPolingual ? String(localized: "polingual") : String(localized: "bucket")).font(PL.script(mark * 0.54, .heavy)).foregroundStyle(color)
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
                    Image(systemName: "flame.fill").font(PL.text(44)).foregroundStyle(LinearGradient(colors: [PL.ochre, D8.vermilion], startPoint: .top, endPoint: .bottom))
                    Text("\(streak)").font(PL.script(72, .heavy)).foregroundStyle(D8.vermilion)
                    Text("DAY STREAK").font(D8.caps(18)).tracking(2).foregroundStyle(PL.inkDim)
                }
            }
            Text(learned > 0 ? String(localized: "\(learned) words in \(langs.map(langName).joined(separator: ", "))") : langs.map(langName).joined(separator: ", "))
                .font(PL.script(26, .bold))
                .foregroundStyle(D8.ink)
                .fixedSize(horizontal: false, vertical: true)
            Spacer(minLength: 0)
            Text(Feedback.isPolingual ? String(localized: "polingual.com") : String(localized: "bucket.foundation")).font(D8.caps(16)).tracking(1.5).foregroundStyle(PL.tyrian)
        }
        .padding(48)
        .frame(width: ShareCardView.size.width, height: ShareCardView.size.height, alignment: .leading)
        .background(D8.parchment)
        .overlay(alignment: .bottom) { Rectangle().fill(PL.tyrian).frame(height: 18) }
    }
}

struct WordShareCard: View {
    let gloss: String
    let words: [(lang: String, form: String)]

    var body: some View {
        VStack(alignment: .leading, spacing: 20) {
            Text(gloss).font(D8.caps(20)).tracking(2).foregroundStyle(PL.inkDim)
            Spacer(minLength: 0)
            ForEach(words.prefix(6), id: \.lang) { w in
                HStack(spacing: 14) {
                    FlagTile(lang: w.lang, size: 52)
                    Text(w.form).font(PL.script(40, .heavy)).foregroundStyle(D8.ink).lineLimit(1).minimumScaleFactor(0.5)
                }
            }
            Spacer(minLength: 0)
            Text(Feedback.isPolingual ? String(localized: "One word, every language. polingual.com") : String(localized: "One word, every language. bucket.foundation"))
                .font(D8.caps(15)).tracking(1.2).foregroundStyle(PL.tyrian)
        }
        .padding(48)
        .frame(width: ShareCardView.size.width, height: ShareCardView.size.height, alignment: .leading)
        .background(D8.parchment)
        .overlay(alignment: .bottom) { Rectangle().fill(PL.tyrian).frame(height: 18) }
    }
}

enum Share {
    static var appLink: URL {
        URL(string: Feedback.isPolingual ? "https://www.polingual.com/?utm_source=app_share" : "https://apps.apple.com/app/id\(Feedback.appID)")!
    }

    @MainActor
    static func renderer(_ object: ShareObject, _ style: ShareStyle) -> ImageRenderer<ShareCardView> {
        let r = ImageRenderer(content: ShareCardView(object: object, style: style))
        r.scale = 2
        return r
    }
}

struct InviteFriend: View {
    var body: some View {
        ShareLink(item: Share.appLink, subject: Text(Feedback.appName), message: Text("I'm learning languages together on \(Feedback.appName). Join me:")) {
            Label("Invite a friend", systemImage: "person.badge.plus")
        }
    }
}
