import BucketKit
import SwiftUI
import Testing
@testable import Polingual

struct TabTintTests {
    @Test func playTabUsesOchreOverTheTyrianGamesScreen() {
        #expect(TabTint.selected(.games) == PL.ochre)
    }

    @Test func paperTabsKeepTyrian() {
        for tab in [AppTab.today, .learn, .account] {
            #expect(TabTint.selected(tab) == PL.tyrian)
        }
    }
}
