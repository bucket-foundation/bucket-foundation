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
                    Image(systemName: "book.fill").font(PL.heading.font(scale: 0.85)).foregroundStyle(PL.paper)
                        .frame(width: 40, height: 40).background(PL.lapis, in: .rect(cornerRadius: 10))
                    VStack(alignment: .leading, spacing: 2) {
                        Text("Learn these words for good").font(PL.heading.font(scale: 0.75)).foregroundStyle(PL.ink)
                        Text("Lessons and courses bring every word back at the right time.").font(PL.small.font()).foregroundStyle(PL.inkDim)
                    }
                    Spacer(minLength: 0)
                    Image(systemName: "chevron.right").foregroundStyle(PL.inkDim)
                }
                .padding(14)
                .background(PL.card, in: .rect(cornerRadius: 14))
            }
            .buttonStyle(.plain)
            .accessibilityIdentifier("learnUpsell")
        }
    }
}
