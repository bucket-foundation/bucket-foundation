import BucketKit
import SwiftUI

struct TranslateLanguageSheet: View {
    @Environment(\.dismiss) private var dismiss
    let chosen: [String]
    let recent: [String]
    let suggested: [String]
    let all: [String]
    let toggle: (String) -> Void
    @State private var query = ""

    func title(_ group: LangPicker.Group) -> String {
        switch group {
        case .recent: String(localized: "Recent")
        case .suggested: String(localized: "My languages")
        case .all: String(localized: "More languages")
        }
    }

    var body: some View {
        let sections = LangPicker.sections(query: query, recent: recent, suggested: suggested, all: all, alias: langName)
        NavigationStack {
            List {
                ForEach(sections, id: \.group) { section in
                    Section {
                        ForEach(section.codes, id: \.self) { row($0) }
                    } header: {
                        Eyebrow(text: title(section.group))
                    }
                }
                if sections.isEmpty {
                    Text("No language matches").foregroundStyle(Palette.muted)
                }
            }
            .paper()
            .navigationTitle(Text("Translate into"))
            .inlineTitle()
            .searchable(text: $query, prompt: Text("Search languages"))
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Done") { dismiss() }.accessibilityIdentifier("translate.pickerDone")
                }
            }
        }
        .presentationDetents([.medium, .large])
        .presentationDragIndicator(.visible)
    }

    func row(_ code: String) -> some View {
        let on = chosen.contains(code)
        let locked = on && chosen.count == 1
        return Button { toggle(code) } label: {
            HStack(spacing: 12) {
                FlagTile(lang: code, size: 28)
                VStack(alignment: .leading, spacing: 1) {
                    Text(LangPicker.nativeName(code))
                        .font(.system(size: 18, weight: .bold, design: .rounded))
                        .foregroundStyle(Palette.ink)
                    if langName(code) != LangPicker.nativeName(code) {
                        Text(langName(code)).font(.subheadline).foregroundStyle(Palette.muted)
                    }
                }
                Spacer(minLength: 8)
                Image(systemName: on ? "checkmark.circle.fill" : "circle")
                    .font(.system(size: 24, weight: .semibold))
                    .foregroundStyle(on ? D8.vermilion : D8.edge)
            }
            .frame(minHeight: 48)
            .contentShape(.rect)
        }
        .buttonStyle(.plain)
        .disabled(locked)
        .accessibilityElement(children: .combine)
        .accessibilityAddTraits(on ? .isSelected : [])
        .accessibilityIdentifier("translate.pick.\(code)")
    }
}
