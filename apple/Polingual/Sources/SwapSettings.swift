#if os(iOS)
import FamilyControls
import SwiftUI

struct SwapSettings: View {
    @State private var picking = false
    @State private var selection = SwapStore.load()
    @State private var declined = false

    var chosen: Int { selection.applicationTokens.count + selection.categoryTokens.count + selection.webDomainTokens.count }

    var body: some View {
        Section {
            Button(chosen == 0 ? String(localized: "Choose apps to swap for Polingual") : String(localized: "Change swapped apps")) {
                Task {
                    do {
                        try await AuthorizationCenter.shared.requestAuthorization(for: .individual)
                        picking = true
                    } catch {
                        declined = true
                    }
                }
            }
            if chosen > 0 {
                LabeledContent("Swapping", value: "\(chosen)")
                Button("Turn off", role: .destructive) {
                    SwapStore.turnOff()
                    selection = FamilyActivitySelection()
                }
            }
            if declined {
                Text("Screen Time access is off for Polingual. Turn it on in Settings, Screen Time.").font(.footnote).foregroundStyle(Palette.muted)
            }
        } header: {
            Eyebrow(text: "Swap scrolling")
        } footer: {
            Text("Opening one of these apps shows a Polingual screen first: study for two minutes, or open the app for 15 minutes. Apple keeps your app list private to this phone.")
        }
        .familyActivityPicker(isPresented: $picking, selection: $selection)
        .onChange(of: selection) { _, s in SwapStore.save(s) }
    }
}
#endif
