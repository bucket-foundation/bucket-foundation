import BucketKit
import SwiftUI

struct QuestionCard: View {
    let presented: PresentedQuestion
    let onRate: (Int) -> Void

    @State private var choice: Int?
    @State private var typed = ""
    @State private var sequence: [Int] = []
    @State private var matches: [String: String] = [:]
    @State private var result: QuestionGrade?

    var q: Question { presented.question }

    var label: String {
        switch q.kind {
        case .pick: String(localized: "pick")
        case .calculate: String(localized: "calculate")
        case .order: String(localized: "order the steps")
        case .spotError: String(localized: "spot the error")
        case .match: String(localized: "match the terms")
        }
    }

    var ready: Bool {
        switch q.kind {
        case .pick, .spotError: choice != nil
        case .calculate: !typed.trimmingCharacters(in: .whitespaces).isEmpty
        case .order: sequence.count == (q.steps?.count ?? 0)
        case .match: matches.count == (q.pairs?.count ?? 0)
        }
    }

    var response: QuestionResponse {
        switch q.kind {
        case .pick: .pick(choice ?? -1)
        case .spotError: .spotError(choice ?? -1)
        case .calculate: .calculate(typed)
        case .order: .order(sequence)
        case .match: .match(matches)
        }
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            Text(label).font(.subheadline).foregroundStyle(Palette.muted)
            Text(LessonText.inline(superscripts(q.prompt))).font(.serif(.title3, weight: .semibold)).foregroundStyle(Palette.ink)
            content
            if let result {
                Label(result.correct ? String(localized: "Right") : result.score > 0 ? String(localized: "Partly right") : String(localized: "Not quite"),
                      systemImage: result.correct ? "checkmark.circle.fill" : "xmark.circle.fill")
                    .font(.headline)
                    .foregroundStyle(result.correct ? D8.malachite : D8.vermilion)
                if let reveal { Text(LessonText.inline(superscripts(reveal))).font(.subheadline).foregroundStyle(Palette.ink) }
                if let e = q.explain { Text(LessonText.inline(superscripts(e))).font(.subheadline).foregroundStyle(Palette.muted) }
                Button("Continue") { onRate(result.rating) }.buttonStyle(D8Primary())
            } else {
                Button("Check") {
                    let g = QuestionEngine.grade(q, response)
                    haptic(g.correct)
                    withAnimation(.snappy) { result = g }
                }
                .buttonStyle(D8Primary())
                .disabled(!ready)
            }
        }
    }

    var reveal: String? {
        guard let result, !result.correct else { return nil }
        switch q.kind {
        case .pick: return q.options.flatMap { o in q.answer.map { String(localized: "Answer: \(o[Int($0)])") } }
        case .calculate: return q.answer.map { String(localized: "Answer: \($0.formatted()) \(q.unit ?? "")") }
        case .spotError: return q.fix.map { String(localized: "Step \((q.error ?? 0) + 1) is wrong. \($0)") }
        case .order: return q.steps.map { $0.enumerated().map { "\($0.offset + 1). \($0.element)" }.joined(separator: "\n") }
        case .match: return q.pairs.map { $0.map { "\($0.term): \($0.meaning)" }.joined(separator: "\n") }
        }
    }

    @ViewBuilder var content: some View {
        switch q.kind {
        case .pick:
            ForEach(presented.order, id: \.self) { i in
                Button { if result == nil { choice = i; tap() } } label: {
                    Text(LessonText.inline(superscripts(q.options?[i] ?? ""))).frame(maxWidth: .infinity, alignment: .leading).padding(.vertical, 8)
                }
                .buttonStyle(D8Option(selected: choice == i))
            }
        case .spotError:
            ForEach(presented.order, id: \.self) { i in
                Button { if result == nil { choice = i; tap() } } label: {
                    HStack(alignment: .top, spacing: 10) {
                        Text("\(i + 1)").font(.headline.monospacedDigit()).foregroundStyle(Palette.muted)
                        Text(LessonText.inline(superscripts(q.steps?[i] ?? ""))).frame(maxWidth: .infinity, alignment: .leading)
                    }
                    .padding(.vertical, 6)
                }
                .buttonStyle(D8Option(selected: choice == i))
            }
        case .calculate:
            HStack {
                TextField("Your answer", text: $typed)
                    .font(.system(size: 18, weight: .semibold, design: .rounded))
                    #if os(iOS)
                    .keyboardType(.numbersAndPunctuation)
                    #endif
                if let u = q.unit { Text(u).font(.headline).foregroundStyle(Palette.muted) }
            }
            .padding(.horizontal, 16)
            .frame(minHeight: 52)
            .background(.white, in: .rect(cornerRadius: 12))
            .overlay { RoundedRectangle(cornerRadius: 12).strokeBorder(D8.keyline, lineWidth: 2) }
            .disabled(result != nil)
        case .order:
            Text("Tap the steps in order.").font(.caption).foregroundStyle(Palette.muted)
            ForEach(presented.order, id: \.self) { i in
                let place = sequence.firstIndex(of: i)
                Button {
                    guard result == nil else { return }
                    if let place { sequence.remove(at: place) } else { sequence.append(i) }
                    tap()
                } label: {
                    HStack(alignment: .top, spacing: 10) {
                        Text(place.map { "\($0 + 1)" } ?? "·").font(.headline.monospacedDigit()).foregroundStyle(D8.lapis).frame(width: 22)
                        Text(LessonText.inline(superscripts(q.steps?[i] ?? ""))).frame(maxWidth: .infinity, alignment: .leading)
                    }
                    .padding(.vertical, 6)
                }
                .buttonStyle(D8Option(selected: place != nil))
            }
        case .match:
            let pairs = q.pairs ?? []
            let meanings = (presented.meanings ?? Array(pairs.indices)).map { pairs[$0].meaning }
            ForEach(pairs, id: \.term) { p in
                HStack(spacing: 10) {
                    Text(LessonText.inline(superscripts(p.term))).font(.subheadline.weight(.semibold)).frame(maxWidth: .infinity, alignment: .leading)
                    Menu {
                        ForEach(meanings, id: \.self) { m in Button(m) { matches[p.term] = m; tap() } }
                    } label: {
                        Text(matches[p.term] ?? String(localized: "Choose")).font(.subheadline).foregroundStyle(matches[p.term] == nil ? Palette.muted : D8.ink)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .padding(10)
                            .background(.white, in: .rect(cornerRadius: 10))
                            .overlay { RoundedRectangle(cornerRadius: 10).strokeBorder(D8.keyline, lineWidth: 2) }
                    }
                    .disabled(result != nil)
                }
            }
        }
    }
}

func superscripts(_ s: String) -> String {
    let map: [Character: Character] = ["0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴", "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹", "-": "⁻"]
    var out = ""
    var chars = Array(s)[...]
    while let c = chars.first {
        chars = chars.dropFirst()
        if c == "^", let n = chars.first, n.isNumber || (n == "-" && chars.dropFirst().first?.isNumber == true) {
            while let d = chars.first, d.isNumber || (d == "-" && out.last != "⁻") {
                out.append(map[d] ?? d)
                chars = chars.dropFirst()
                if !(chars.first?.isNumber ?? false) { break }
            }
        } else {
            out.append(c)
        }
    }
    return out
}
