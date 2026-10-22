import BucketKit
import SwiftUI

struct DrillRating: Identifiable {
    let value: Int
    let label: String
    let hint: String
    let color: Color
    var id: Int { value }

    static let all = [
        DrillRating(value: 1, label: "Again", hint: "did not have it", color: .red),
        DrillRating(value: 2, label: "Hard", hint: "had it, slowly", color: Palette.gold),
        DrillRating(value: 3, label: "Good", hint: "had it", color: Palette.green),
        DrillRating(value: 4, label: "Easy", hint: "had it at once", color: .blue),
    ]
}

struct ScienceDrill: View {
    let atom: Atom
    let level: String
    let onRate: (Int, String) -> Void
    var onSkip: (() -> Void)?
    @State private var revealed = Launch.flag("-revealAnswer")
    @State private var picked: Int?

    var quiz: QuizItem? { atom.quiz.first { $0.level == level } ?? atom.quiz.first }

    var body: some View {
        if let quiz {
            VStack(alignment: .leading, spacing: 14) {
                Eyebrow(text: "Retrieve · \(quiz.level)")
                Text(LessonText.inline(quiz.prompt)).font(.serif(.title3, weight: .medium)).foregroundStyle(Palette.ink)
                if revealed {
                    Divider().overlay(Palette.rule)
                    Text("ANSWER").font(.caption2.weight(.semibold)).tracking(1.4).foregroundStyle(Palette.muted)
                    Text(LessonText.inline(quiz.answer)).font(.serif(.body)).foregroundStyle(Palette.ink).lineSpacing(4)
                        .transition(.opacity.combined(with: .move(edge: .bottom)))
                    if let picked {
                        Text(feedback(picked)).font(.subheadline).foregroundStyle(Palette.muted)
                            .accessibilityAddTraits(.updatesFrequently)
                    } else {
                        LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 10) {
                            ForEach(DrillRating.all) { r in rateButton(r) }
                        }
                        .accessibilityLabel("How well did you recall it")
                    }
                } else {
                    HStack {
                        Button {
                            withAnimation(.snappy) { revealed = true }
                        } label: {
                            Text("Show the answer").frame(maxWidth: .infinity)
                        }
                        .buttonStyle(.borderedProminent)
                        .controlSize(.large)
                        .keyboardShortcut(.space, modifiers: [])
                        if let onSkip {
                            Button("Skip", action: onSkip).buttonStyle(.bordered).controlSize(.large)
                        }
                    }
                }
            }
            .padding(18)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Palette.card, in: .rect(cornerRadius: 16))
            .overlay(RoundedRectangle(cornerRadius: 16).stroke(Palette.rule))
            .task(id: picked) {
                guard let picked else { return }
                try? await Task.sleep(for: .milliseconds(picked == 1 ? 1100 : 600))
                guard !Task.isCancelled else { return }
                onRate(picked, level)
            }
        } else {
            Button {
                onRate(3, level)
            } label: {
                Text("Got it").frame(maxWidth: .infinity)
            }
            .buttonStyle(.borderedProminent)
            .controlSize(.large)
        }
    }

    func rateButton(_ r: DrillRating) -> some View {
        Button {
            picked = r.value
            #if os(iOS)
            UIImpactFeedbackGenerator(style: .light).impactOccurred()
            #endif
        } label: {
            VStack(alignment: .leading, spacing: 2) {
                Text(r.label).font(.subheadline.weight(.semibold))
                Text(r.hint).font(.caption).foregroundStyle(Palette.muted)
            }
            .frame(maxWidth: .infinity, minHeight: 48, alignment: .leading)
        }
        .buttonStyle(.bordered)
        .tint(r.color)
        .keyboardShortcut(KeyEquivalent(Character(String(r.value))), modifiers: [])
    }

    func feedback(_ rating: Int) -> String {
        switch rating {
        case 1:
            if let note = atom.note, note.count < 220 { return "Worth another pass. \(note)" }
            return "Worth another pass. Read the answer once more before moving on."
        case 4: return "Locked in."
        case 3: return "Good recall."
        default: return "Noted. It comes back sooner."
        }
    }
}

struct AtomLesson: View {
    let atom: Atom

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            if !atom.summary.isEmpty {
                Text(atom.summary).font(.serif(.title3)).foregroundStyle(Palette.ink.opacity(0.85))
            }
            if let eq = atom.equation, !eq.isEmpty { EquationView(tex: eq) }
            if let lesson = atom.lesson, !lesson.isEmpty { LessonText(markdown: lesson) }
        }
    }
}

struct DeckStats: View {
    let summary: ScienceSummary

    var body: some View {
        let tiles = [
            ("Started", "\(summary.introduced) / \(summary.total)"),
            ("Mastered", "\(summary.mastered)"),
            ("Due now", "\(summary.dueCount)"),
            ("XP", "\(Int(summary.xp))"),
            ("Streak", streakText(summary.streak)),
        ]
        LazyVGrid(columns: [GridItem(.adaptive(minimum: 96), spacing: 8)], spacing: 8) {
            ForEach(tiles, id: \.0) { k, v in
                VStack(alignment: .leading, spacing: 4) {
                    Text(k.uppercased()).font(.caption2.weight(.semibold)).tracking(1.2).foregroundStyle(Palette.muted)
                    Text(v).font(.serif(.title3, weight: .semibold)).foregroundStyle(Palette.ink).monospacedDigit()
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(10)
                .background(Palette.paper, in: .rect(cornerRadius: 10))
            }
        }
    }
}

func streakText(_ days: Double) -> String { Int(days) == 1 ? "1 day" : "\(Int(days)) days" }

func nextDue(_ state: EngineState, _ deck: PreparedDeck, after now: Double) -> Date? {
    let dues = deck.atoms.compactMap { state.cards[$0.id]?.due }.filter { $0 > now }
    return dues.min().map { Date(timeIntervalSince1970: $0 / 1000) }
}

struct MasteryBar: View {
    let value: Double

    var body: some View {
        GeometryReader { g in
            ZStack(alignment: .leading) {
                Capsule().fill(Palette.rule)
                Capsule().fill(Palette.gold).frame(width: g.size.width * max(0, min(1, value)))
            }
        }
        .frame(width: 64, height: 4)
        .accessibilityLabel("Mastery \(Int((value * 100).rounded())) percent")
    }
}

struct StudyLaunch: Identifiable {
    let entry: DeckEntry
    let deck: PreparedDeck
    var id: String { entry.id }
}

struct StudySession: View {
    @Environment(Reminders.self) private var reminders
    @Environment(ScienceStore.self) private var store
    @Environment(\.dismiss) private var dismiss
    let entry: DeckEntry
    let deck: PreparedDeck
    @State private var queue: [RouteItem]?
    @State private var position = 0
    @State private var showLesson = false
    @State private var graded = 0

    var body: some View {
        NavigationStack {
            Group {
                if let queue {
                    if queue.isEmpty {
                        nothingDue
                    } else if position < queue.count, let atom = deck.byId[queue[position].id] {
                        card(queue[position], atom, count: queue.count)
                    } else {
                        done
                    }
                } else {
                    ProgressView("Preparing today's route")
                }
            }
            .frame(maxWidth: 680)
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .background(Palette.paper.ignoresSafeArea())
            .navigationTitle(entry.title)
            .inlineTitle()
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Done") { dismiss() } }
            }
        }
        .onAppear { if queue == nil { queue = store.route(deck) } }
        .onDisappear { Task { await store.flush() } }
    }

    func card(_ item: RouteItem, _ atom: Atom, count: Int) -> some View {
        let isNew = item.kind == .new
        return ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                HStack(alignment: .top) {
                    SubjectTile(subject: .branch(entry), caption: isNew ? "New" : "Review")
                    Text("\(position + 1) / \(count)").font(.footnote).foregroundStyle(Palette.muted).monospacedDigit()
                }
                ProgressView(value: Double(position), total: Double(count)).tint(Palette.gold)
                Text(atom.title).font(.serif(.title, weight: .semibold)).foregroundStyle(Palette.ink)
                if isNew || showLesson {
                    AtomLesson(atom: atom)
                } else {
                    Button("Read the lesson first") { withAnimation(.snappy) { showLesson = true } }
                        .font(.footnote.weight(.semibold))
                        .tint(Palette.muted)
                }
                ScienceDrill(atom: atom, level: pickLevel(store.state(deck.branch), atom), onRate: { rating, level in
                    store.grade(deck, id: item.id, rating: rating, level: level)
                    graded += 1
                    advance()
                }, onSkip: advance)
                .id(item.id)
            }
            .padding(20)
        }
    }

    func advance() {
        showLesson = false
        withAnimation(.snappy) { position += 1 }
    }

    var nextLine: String? {
        nextDue(store.state(deck.branch), deck, after: Date().timeIntervalSince1970 * 1000)
            .map { "Next review \($0.formatted(.relative(presentation: .named)))." }
    }

    var nothingDue: some View {
        VStack(spacing: 14) {
            Image(systemName: "checkmark.seal").font(.system(size: 48)).foregroundStyle(Palette.green)
            Text("Nothing due in \(entry.title)").font(.serif(.title2, weight: .semibold)).foregroundStyle(Palette.ink)
            Text("Every card is scheduled ahead and today's new atoms are done. Read any atom from the deck, or pick another branch.")
                .font(.subheadline).foregroundStyle(Palette.muted).multilineTextAlignment(.center)
            if let nextLine { Text(nextLine).font(.subheadline.weight(.medium)).foregroundStyle(Palette.ink) }
        }
        .padding(24)
    }

    var done: some View {
        let s = store.summary(deck)
        return ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                Eyebrow(text: entry.title)
                Text("Route done").onAppear { reminders.noteStudy() }.font(.serif(.largeTitle, weight: .semibold)).foregroundStyle(Palette.ink)
                Text("\(graded) card\(graded == 1 ? "" : "s") recorded. \(s.introduced) of \(s.total) atoms started, \(s.mastered) mastered.")
                    .font(.serif(.body)).foregroundStyle(Palette.ink)
                DeckStats(summary: s)
                if let nextLine { Text(nextLine).font(.subheadline.weight(.medium)).foregroundStyle(Palette.ink) }
                ReminderPrompt()
                SyncLine(state: store.saveState)
                Button {
                    dismiss()
                } label: {
                    Text("Done").frame(maxWidth: .infinity)
                }
                .buttonStyle(.borderedProminent)
                .controlSize(.large)
            }
            .padding(20)
        }
    }
}

struct SyncLine: View {
    @Environment(Account.self) private var account
    let state: SaveResult

    var body: some View {
        if account.stage != .signedIn {
            Label("Saved on this device. Sign in to keep it on bucket.foundation too.", systemImage: "iphone")
                .font(.footnote).foregroundStyle(Palette.muted)
        } else if state == .needsProfile {
            Label("Saved on this device. Finish your profile on bucket.foundation to sync it.", systemImage: "person.crop.circle.badge.exclamationmark")
                .font(.footnote).foregroundStyle(Palette.muted)
        }
    }
}

struct AtomDrillSheet: View {
    @Environment(ScienceStore.self) private var store
    @Environment(\.dismiss) private var dismiss
    let deck: PreparedDeck
    let atom: Atom

    var body: some View {
        NavigationStack {
            ScrollView {
                ScienceDrill(atom: atom, level: pickLevel(store.state(deck.branch), atom)) { rating, level in
                    store.grade(deck, id: atom.id, rating: rating, level: level)
                    dismiss()
                }
                .padding(20)
            }
            .frame(maxWidth: 680)
            .frame(maxWidth: .infinity)
            .background(Palette.paper.ignoresSafeArea())
            .navigationTitle(atom.title)
            .inlineTitle()
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Done") { dismiss() } }
            }
        }
        .onDisappear { Task { await store.flush() } }
    }
}
