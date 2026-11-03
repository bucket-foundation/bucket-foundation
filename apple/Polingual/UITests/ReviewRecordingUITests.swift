import XCTest

final class ReviewRecordingUITests: XCTestCase {
    override func setUp() {
        continueAfterFailure = false
    }

    override func tearDown() {
        if ReviewWalk.recording { ReviewWalk(app: XCUIApplication()).toggleScreenRecording() }
    }

    func launch(_ args: [String]) -> ReviewWalk {
        let app = XCUIApplication()
        app.launchArguments = ["-AppleLanguages", "(en)", "-AppleLocale", "en_US"] + args
        app.launch()
        return ReviewWalk(app: app)
    }

    func onboarding(_ walk: ReviewWalk) {
        let app = walk.app
        guard app.buttons["Get started"].waitForExistence(timeout: 30) else { return }
        walk.tap(app.buttons["Get started"])
        walk.tap(app.buttons["Continue"])
        walk.tap(app.buttons["Continue"])
        walk.tap(app.buttons["Not now"])
        walk.tap(app.buttons["Start learning"])
    }

    func paywall(_ walk: ReviewWalk) {
        let app = walk.app
        let menu = app.buttons["Games, content and account"]
        let deadline = Date().addingTimeInterval(60)
        while !app.buttons["Restore"].exists && !menu.exists && Date() < deadline {
            walk.clearAlerts()
            Thread.sleep(forTimeInterval: 1)
        }
        if menu.exists { return }
        XCTAssertTrue(app.buttons["Restore"].exists)
        walk.hold()
        guard ReviewWalk.onDevice else { return }
        walk.tap(app.buttons["Start 3 days free"], timeout: 30)
        home(walk, timeout: walk.humanTimeout)
    }

    func home(_ walk: ReviewWalk, timeout: TimeInterval) {
        let app = walk.app
        let menu = app.buttons["Games, content and account"]
        let deadline = Date().addingTimeInterval(timeout)
        while !menu.exists && Date() < deadline {
            walk.clearAlerts()
            let back = app.navigationBars.buttons.firstMatch
            if back.exists && back.isHittable { back.tap() }
            Thread.sleep(forTimeInterval: 1)
        }
        XCTAssertTrue(menu.exists, "Confirm the sandbox purchase on the phone")
    }

    func signedOutStart() {
        guard ReviewWalk.onDevice else { return }
        let walk = launch([])
        let app = walk.app
        let menu = app.buttons["Games, content and account"]
        if menu.waitForExistence(timeout: 20) {
            menu.tap()
            walk.tap(app.buttons["Account"])
            if app.buttons["Sign out"].waitForExistence(timeout: 5) { walk.signOut() }
        }
        app.terminate()
    }

    func testRecordingFlow() {
        signedOutStart()
        ReviewWalk(app: XCUIApplication()).startRecording()
        let walk = launch([])
        onboarding(walk)
        paywall(walk)
        let inside = ReviewWalk.onDevice ? walk : launch(["-polingual.onboarded", "YES", "-polingualOpen", "-demoGroup", "joined"])
        let app = inside.app
        home(inside, timeout: 60)
        inside.tap(app.buttons["Games, content and account"])
        inside.tap(app.buttons["Account"])
        inside.accountFlows()
        inside.toggleScreenRecording()
    }

    func testScreenRecordingToggle() {
        let walk = ReviewWalk(app: XCUIApplication())
        XCTAssertTrue(walk.toggleScreenRecording())
        Thread.sleep(forTimeInterval: 3)
        XCTAssertTrue(walk.toggleScreenRecording())
    }
}
