import BucketKit
import SwiftUI

struct StreakGoalCard: View {
    @Environment(LangStore.self) private var store: LangStore?
    let streak: Double
    var pending = false
    var share = true
    var expected: ExpectedLearning?

    var body: some View {
        let g = StreakGoal(streak: streak, pending: pending)
        HStack(spacing: 12) {
            summary(g).accessibilityElement(children: .combine)
            if share && g.day > 0 {
                ShareObjectButton(.streak(days: g.day, langs: store?.gameLangs ?? [], root: store?.systems.first?.root ?? "en"))
            }
        }
        .padding(.vertical, 4)
    }

    func summary(_ g: StreakGoal) -> some View {
        HStack(spacing: 12) {
            PLArtView(.streakFlame).frame(height: 34).grayscale(g.lit ? 0 : 1).opacity(g.lit ? 1 : 0.55)
            VStack(alignment: .leading, spacing: 5) {
                Text(title(g)).font(PL.heading.font(scale: 19 / PL.heading.size)).foregroundStyle(g.pending ? PL.inkDim : PL.ink)
                ProgressView(value: g.fraction).tint(D8.vermilion)
                Text(detail(g)).font(PL.text(12, .semibold)).foregroundStyle(PL.inkDim)
                if g.day > 0, let line = expectedLine(expected) {
                    Text(line).font(PL.text(12)).foregroundStyle(PL.inkDim)
                }
            }
        }
    }

    func title(_ g: StreakGoal) -> String {
        if g.day == 0 { return String(localized: "Start your 100-day streak") }
        return g.todayReached ? String(localized: "Day \(g.today)") : String(localized: "Day \(g.today) of 100")
    }

    func detail(_ g: StreakGoal) -> String {
        if g.day == 0 { return String(localized: "Study today to count day 1.") }
        if g.pending { return String(localized: "Study today to count day \(g.today).") }
        if g.reached { return String(localized: "100 days reached. Keep it going.") }
        return g.left == 1 ? String(localized: "1 day to 100") : String(localized: "\(g.left) days to 100")
    }

    func expectedLine(_ e: ExpectedLearning?) -> String? {
        guard let e, !e.isEmpty else { return nil }
        if e.concepts == 0 { return String(localized: "Expected: about \(e.words) words learned") }
        if e.words == 0 { return String(localized: "Expected: about \(e.concepts) concepts learned") }
        return String(localized: "Expected: about \(e.words) words and \(e.concepts) concepts learned")
    }
}
