import BucketKit
import SwiftUI

struct PracticeCard: Identifiable, Hashable {
    let id: String
    let eyebrow: String
    let prompt: String
    let answer: String

    static func cards(from atoms: [Atom]) -> [PracticeCard] {
        atoms.flatMap { a in
            a.quiz.enumerated().map { PracticeCard(id: "\(a.id)#\($0.offset)", eyebrow: "\($0.element.level) · \(a.title)", prompt: $0.element.prompt, answer: $0.element.answer) }
        }
    }
}

struct PracticeHome: View {
    @Environment(Library.self) private var library
    @Environment(LangStore.self) private var langs
    @State private var path = NavigationPath()
    @State private var session: PracticeLaunch?

    var body: some View {
        NavigationStack(path: $path) {
            List {
                Section {
                    ForEach(library.scienceDecks) { entry in
                        Button {
                            Task {
                                if let deck = await library.deck(entry) {
                                    session = PracticeLaunch(title: entry.title, cards: PracticeCard.cards(from: deck.atoms).shuffled())
                                }
                            }
                        } label: {
                            DeckRow(entry: entry)
                        }
                        .listRowBackground(Palette.card)
                    }
                } header: {
                    Eyebrow(text: "Pick a deck")
                }
                Section {
                    if langs.systems.isEmpty {
                        Button("Build a language system") { path.append(LangRoute.home) }
                    }
                    ForEach(langs.systems) { s in
                        Button {
                            path.append(LangRoute.study(s.id))
                        } label: {
                            LangSystemRow(system: s)
                        }
                    }
                    .listRowBackground(Palette.card)
                } header: {
                    Eyebrow(text: "Language systems")
                } footer: {
                    Text("Practice runs on this device. Synced reviews and spaced repetition arrive in the next build.")
                        .foregroundStyle(Palette.muted)
                }
            }
            .paper()
            .navigationTitle("Practice")
            .sheet(item: $session) { PracticeSession(title: $0.title, cards: $0.cards) }
            .langDestinations(path: $path)
            .task { await langs.load() }
        }
    }
}

struct PracticeLaunch: Identifiable {
    let id = UUID()
    let title: String
    let cards: [PracticeCard]
}

struct PracticeSession: View {
    @Environment(\.dismiss) private var dismiss
    let title: String
    let cards: [PracticeCard]
    @State private var position = 0
    @State private var revealed = false
    @State private var tally: [Int: Int] = [:]

    var body: some View {
        NavigationStack {
            VStack(spacing: 20) {
                if position < cards.count {
                    ProgressView(value: Double(position), total: Double(cards.count))
                    card(cards[position])
                    Spacer(minLength: 0)
                    controls
                } else {
                    summary
                }
            }
            .padding(20)
            .frame(maxWidth: 640)
            .frame(maxWidth: .infinity)
            .background(Palette.paper.ignoresSafeArea())
            .navigationTitle(title)
            .inlineTitle()
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Done") { dismiss() } }
            }
        }
    }

    func card(_ c: PracticeCard) -> some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 14) {
                Eyebrow(text: c.eyebrow)
                Text(LessonText.inline(c.prompt)).font(.serif(.title2, weight: .medium)).foregroundStyle(Palette.ink)
                if revealed {
                    Divider().overlay(Palette.rule)
                    Text(LessonText.inline(c.answer)).font(.serif(.body)).foregroundStyle(Palette.ink).lineSpacing(4)
                        .transition(.opacity.combined(with: .move(edge: .bottom)))
                }
            }
            .padding(20)
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .background(Palette.card, in: .rect(cornerRadius: 16))
        .overlay(RoundedRectangle(cornerRadius: 16).stroke(Palette.rule))
        .contentShape(.rect)
        .onTapGesture { withAnimation(.snappy) { revealed = true } }
        .accessibilityAction(named: "Show answer") { revealed = true }
    }

    @ViewBuilder var controls: some View {
        if revealed {
            HStack(spacing: 10) {
                rate(1, "Again", .red)
                rate(2, "Hard", Palette.gold)
                rate(3, "Good", Palette.green)
                rate(4, "Easy", .blue)
            }
        } else {
            Button {
                withAnimation(.snappy) { revealed = true }
            } label: {
                Text("Show answer").frame(maxWidth: .infinity)
            }
            .buttonStyle(.borderedProminent)
            .controlSize(.large)
            .keyboardShortcut(.space, modifiers: [])
        }
    }

    func rate(_ value: Int, _ label: String, _ color: Color) -> some View {
        Button {
            tally[value, default: 0] += 1
            revealed = false
            withAnimation(.snappy) { position += 1 }
            #if os(iOS)
            UIImpactFeedbackGenerator(style: .light).impactOccurred()
            #endif
        } label: {
            Text(label).font(.subheadline.weight(.semibold)).frame(maxWidth: .infinity, minHeight: 44)
        }
        .buttonStyle(.bordered)
        .tint(color)
        .keyboardShortcut(KeyEquivalent(Character(String(value))), modifiers: [])
    }

    var summary: some View {
        VStack(spacing: 16) {
            Image(systemName: "checkmark.seal.fill").font(.system(size: 56)).foregroundStyle(Palette.green)
            Text("Session complete").font(.serif(.title, weight: .semibold))
            Text("\(cards.count) cards. Good or Easy on \(tally[3, default: 0] + tally[4, default: 0]).")
                .foregroundStyle(Palette.muted)
            Button("Done") { dismiss() }.buttonStyle(.borderedProminent).controlSize(.large)
        }
        .frame(maxHeight: .infinity)
    }
}
