import SwiftUI
import Testing
@testable import Polingual

struct PlacementPopTests {
    @Test func replaceTopOnEmptyPathPushesWithoutTrapping() {
        var path = NavigationPath()
        path.replaceTop(with: LangRoute.study("s"))
        #expect(path.count == 1)
    }

    @Test func doubleConfirmLeavesOneRouteOnTop() {
        var path = NavigationPath()
        path.append(LangRoute.place("s", nil))
        path.replaceTop(with: LangRoute.study("s"))
        path.replaceTop(with: LangRoute.study("s"))
        #expect(path.count == 1)
    }

    @Test func replaceTopKeepsTheStackBelow() {
        var path = NavigationPath()
        path.append(LangRoute.system("s"))
        path.append(LangRoute.place("s", nil))
        path.replaceTop(with: LangRoute.study("s"))
        #expect(path.count == 2)
    }
}
