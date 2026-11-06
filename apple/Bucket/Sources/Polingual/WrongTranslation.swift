import BucketKit
import SwiftUI

@MainActor
final class TranslationReporter {
    static let shared = TranslationReporter()

    let reports: TranslationReports

    init() {
        let dir = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
        reports = TranslationReports(file: dir.appending(path: "translation-reports.json"))
    }

    func send(_ subject: ReportSubject, reason: TranslationIssue, suggestion: String?) async -> ReportDelivery {
        let token = await Beta.shared.account?.freshToken()
        return await reports.submit(subject, reason: reason, suggestion: suggestion, token: token)
    }

    func flush() {
        Task {
            let token = await Beta.shared.account?.freshToken()
            await reports.flush(token: token)
        }
    }
}

extension TranslationIssue {
    var title: String {
        switch self {
        case .meaning: String(localized: "Meaning", table: "WrongTranslation")
        case .spelling: String(localized: "Spelling", table: "WrongTranslation")
        case .sound: String(localized: "Sound", table: "WrongTranslation")
        case .script: String(localized: "Script", table: "WrongTranslation")
        }
    }
}

extension ReportSubject {
    init(_ ex: Exercise, surface: String) {
        let ownLang = ex.answerLang == ex.lang
        let word = ownLang ? shownAnswer(ex) : ex.prompt
        let gloss = ownLang ? ex.prompt : shownAnswer(ex)
        self.init(lang: ex.lang, root: ex.root, itemId: ex.itemId, text: word, shown: gloss, context: "\(surface):\(ex.kind.rawValue)")
    }
}

struct WrongTranslationLink: View {
    let subject: ReportSubject?
    var visible = true
    @State private var open = false
    @ScaledMetric(relativeTo: .caption2) private var hitSlop: CGFloat = 13

    var live: Bool { visible && subject != nil }

    var body: some View {
        Button { open = true } label: {
            HStack(spacing: 3) {
                Image(systemName: "flag")
                Text("Wrong translation?", tableName: "WrongTranslation")
            }
            .font(.caption2.weight(.medium))
            .foregroundStyle(Palette.muted.opacity(0.75))
            .padding(.vertical, 3)
            .padding(.horizontal, 6)
            .frame(minWidth: 44)
            .contentShape(Rectangle().inset(by: -hitSlop))
        }
        .buttonStyle(.plain)
        .lineLimit(1)
        .fixedSize()
        .opacity(live ? 1 : 0)
        .allowsHitTesting(live)
        .accessibilityHidden(!live)
        .accessibilityLabel(Text("Report a wrong translation", tableName: "WrongTranslation"))
        .accessibilityIdentifier("wrong-translation")
        .sheet(isPresented: $open) {
            if let subject {
                WrongTranslationSheet(subject: subject)
                    .presentationDetents([.medium, .large])
                    .presentationBackground(Palette.card)
            }
        }
    }
}

extension View {
    func wrongTranslation(_ subject: ReportSubject?, visible: Bool = true, alignment: Alignment = .topTrailing, inset: CGFloat = 8) -> some View {
        overlay(alignment: alignment) {
            WrongTranslationLink(subject: subject, visible: visible).padding(inset)
        }
    }
}

struct WrongTranslationSheet: View {
    let subject: ReportSubject
    @Environment(\.dismiss) private var dismiss
    @State private var reason: TranslationIssue?
    @State private var fix = ""
    @State private var sending = false
    @State private var done: ReportDelivery?
    @FocusState private var typing: Bool

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                HStack {
                    Text("What is wrong?", tableName: "WrongTranslation")
                        .font(.system(size: 22, weight: .bold, design: .rounded))
                        .foregroundStyle(Palette.ink)
                    Spacer(minLength: 8)
                    Button { dismiss() } label: { Image(systemName: "xmark").font(.system(size: 15, weight: .bold)).foregroundStyle(Palette.muted).frame(width: 36, height: 36) }
                        .buttonStyle(.plain)
                        .accessibilityLabel(Text("Cancel", tableName: "WrongTranslation"))
                }
                HStack(spacing: 8) {
                    FlagTile(lang: subject.lang, size: 22)
                    Text([subject.text, subject.shown].compactMap { $0 }.joined(separator: "  →  "))
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(Palette.muted)
                        .lineLimit(2)
                }
                if let done {
                    Label {
                        switch done {
                        case .sent: Text("Thanks. We will check it.", tableName: "WrongTranslation")
                        case .queued: Text("Saved. It sends when you are back online.", tableName: "WrongTranslation")
                        case .rejected: Text("This report could not be sent.", tableName: "WrongTranslation")
                        }
                    } icon: {
                        Image(systemName: done.symbol)
                    }
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(done == .sent ? D8.malachite : done == .rejected ? Palette.ink : Palette.muted)
                } else {
                    LazyVGrid(columns: [GridItem(.flexible(), spacing: 10), GridItem(.flexible())], spacing: 10) {
                        ForEach(TranslationIssue.allCases) { r in
                            Button(r.title) { reason = r; tap() }
                                .buttonStyle(D8Option(selected: reason == r, align: .center, compact: true))
                                .accessibilityAddTraits(reason == r ? .isSelected : [])
                        }
                    }
                    TextField(String(localized: "Your fix, if you know it", table: "WrongTranslation"), text: $fix, axis: .vertical)
                        .lineLimit(1...3)
                        .font(.system(size: 17, weight: .semibold, design: .rounded))
                        .padding(.horizontal, 14)
                        .padding(.vertical, 12)
                        .background(D8.face, in: .rect(cornerRadius: 12))
                        .overlay { RoundedRectangle(cornerRadius: 12).strokeBorder(D8.edge, lineWidth: 2) }
                        .autocorrectionDisabled()
                        .langInput(subject.lang)
                        .focused($typing)
                    Button { send() } label: {
                        if sending { ProgressView() } else { Text("Send", tableName: "WrongTranslation") }
                    }
                    .buttonStyle(D8Primary())
                    .disabled(reason == nil || sending)
                }
            }
            .padding(20)
        }
        .scrollBounceBehavior(.basedOnSize)
    }

    func send() {
        guard let reason else { return }
        sending = true
        typing = false
        Task {
            let delivery = await TranslationReporter.shared.send(subject, reason: reason, suggestion: fix)
            sending = false
            done = delivery
            haptic(delivery != .rejected)
            if delivery == .rejected { return }
            try? await Task.sleep(for: .seconds(1.4))
            dismiss()
        }
    }
}

extension ReportDelivery {
    var symbol: String {
        switch self {
        case .sent: "checkmark.circle.fill"
        case .queued: "tray.and.arrow.up"
        case .rejected: "exclamationmark.triangle.fill"
        }
    }
}
