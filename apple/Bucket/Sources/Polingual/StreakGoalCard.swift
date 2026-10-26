import BucketKit
import SwiftUI

struct StreakGoalCard: View {
    let streak: Double

    var body: some View {
        let g = StreakGoal(streak: streak)
        HStack(spacing: 12) {
            Image(systemName: "flame.fill")
                .font(.system(size: 30))
                .foregroundStyle(LinearGradient(colors: [Color(hex: 0xE9A23B), D8.vermilion], startPoint: .top, endPoint: .bottom))
            VStack(alignment: .leading, spacing: 5) {
                Text(title(g)).font(.system(size: 19, weight: .heavy, design: .rounded)).foregroundStyle(D8.ink)
                ProgressView(value: g.fraction).tint(D8.vermilion)
                Text(detail(g)).font(.caption.weight(.semibold)).foregroundStyle(Palette.muted)
            }
        }
        .padding(.vertical, 4)
        .accessibilityElement(children: .combine)
    }

    func title(_ g: StreakGoal) -> String {
        if g.day == 0 { return String(localized: "Start your 100-day streak") }
        return g.reached ? String(localized: "Day \(g.day)") : String(localized: "Day \(g.day) of 100")
    }

    func detail(_ g: StreakGoal) -> String {
        if g.day == 0 { return String(localized: "Study today to count day 1.") }
        if g.reached { return String(localized: "100 days reached. Keep it going.") }
        return g.left == 1 ? String(localized: "1 day to 100") : String(localized: "\(g.left) days to 100")
    }
}
