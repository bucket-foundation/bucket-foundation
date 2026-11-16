import BucketKit
import SwiftUI

extension EnvironmentValues {
    @Entry var learnUpsell: (@MainActor () -> Void)?
}

enum SaveNudge {
    static let key = "polingual.saveProgress"

    @MainActor static func gameEnded(signedIn: Bool, defaults: UserDefaults = .standard) {
        if !signedIn { defaults.set(true, forKey: key) }
    }
}

struct LearnUpsell: View {
    @Environment(\.learnUpsell) private var upsell

    var body: some View {
        if let upsell {
            Button(action: upsell) {
                HStack(spacing: 12) {
                    Image(systemName: "book.fill").font(.title3).foregroundStyle(D8.parchment)
                        .frame(width: 40, height: 40).background(D8.lapis, in: .rect(cornerRadius: 10))
                    VStack(alignment: .leading, spacing: 2) {
                        Text("Learn these words for good").font(.headline).foregroundStyle(Palette.ink)
                        Text("Lessons and courses bring every word back at the right time.").font(.footnote).foregroundStyle(Palette.muted)
                    }
                    Spacer(minLength: 0)
                    Image(systemName: "chevron.right").foregroundStyle(Palette.muted)
                }
                .padding(14)
                .background(Palette.card, in: .rect(cornerRadius: 14))
            }
            .buttonStyle(.plain)
            .accessibilityIdentifier("learnUpsell")
        }
    }
}
