import XCTest

@MainActor
final class SyncRoundTripUITests: XCTestCase {
    let out = URL(fileURLWithPath: ProcessInfo.processInfo.environment["SYNC_SHOTS"] ?? NSTemporaryDirectory())

    func shot(_ name: String) {
        try? XCUIScreen.main.screenshot().pngRepresentation.write(to: out.appendingPathComponent("\(name).png"))
    }

    func cardCounts(_ app: XCUIApplication) -> [String] {
        app.staticTexts.matching(NSPredicate(format: "label ENDSWITH %@", " cards")).allElementsBoundByIndex.map { $0.label }
    }

    func learn(_ walk: ReviewWalk, _ name: String) -> [String] {
        let app = walk.app
        walk.tap(app.tabBars.buttons["Learn"].firstMatch)
        let first = app.staticTexts.matching(NSPredicate(format: "label ENDSWITH %@", " cards")).firstMatch
        _ = first.waitForExistence(timeout: 30)
        Thread.sleep(forTimeInterval: 3)
        shot(name)
        let counts = cardCounts(app)
        XCTContext.runActivity(named: "\(name): \(counts)") { _ in }
        try? counts.joined(separator: "\n").write(to: out.appendingPathComponent("\(name).txt"), atomically: true, encoding: .utf8)
        return counts
    }

    func account(_ walk: ReviewWalk) {
        walk.tap(walk.app.tabBars.buttons["Account"].firstMatch)
    }

    func testSignOutSignInKeepsProgress() throws {
        let probe = ReviewWalk(app: XCUIApplication())
        guard !probe.demoEmail.isEmpty else { throw XCTSkip("REVIEW_DEMO_EMAIL unset") }
        let app = XCUIApplication()
        app.launchArguments = ["-AppleLanguages", "(en)", "-AppleLocale", "en_US", "-polingual.onboarded", "YES", "-polingualOpen"]
        app.launch()
        let walk = ReviewWalk(app: app)
        XCTAssertTrue(app.tabBars.firstMatch.waitForExistence(timeout: 30))
        account(walk)
        if app.buttons["Sign out"].waitForExistence(timeout: 5) { walk.signOut() }
        walk.scrollToTop()
        signInDemo(walk)
        let before = learn(walk, "1-signed-in")
        XCTAssertFalse(before.isEmpty, "Learn shows no language system after the first sign-in")
        account(walk)
        walk.signOut()
        _ = learn(walk, "2-signed-out")
        account(walk)
        walk.scrollToTop()
        signInDemo(walk)
        let after = learn(walk, "3-signed-in-again")
        XCTAssertEqual(before, after)
    }

    func signInDemo(_ walk: ReviewWalk) {
        let app = walk.app
        walk.tap(walk.emailSignIn)
        let field = app.textFields["you@school.example"]
        XCTAssertTrue(field.waitForExistence(timeout: 20))
        field.tap()
        field.typeText(walk.demoEmail)
        walk.tap(app.buttons["Send code"])
        let box = app.textFields["Code"]
        XCTAssertTrue(box.waitForExistence(timeout: 30))
        box.tap()
        box.typeText(walk.env["REVIEW_DEMO_CODE"] ?? "")
        walk.tap(app.buttons["Verify"])
        XCTAssertTrue(app.buttons["Sign out"].waitForExistence(timeout: 60))
        Thread.sleep(forTimeInterval: 5)
    }
}
