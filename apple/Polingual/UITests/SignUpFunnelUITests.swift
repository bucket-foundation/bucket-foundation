import XCTest

final class SignUpFunnelUITests: XCTestCase {
    override func setUp() {
        continueAfterFailure = false
    }

    func launch(_ args: [String]) -> XCUIApplication {
        let app = XCUIApplication()
        app.launchArguments = ["-AppleLanguages", "(en)", "-AppleLocale", "en_US"] + args
        app.launch()
        return app
    }

    func shot(_ name: String) {
        let a = XCTAttachment(screenshot: XCUIScreen.main.screenshot())
        a.name = name
        a.lifetime = .keepAlways
        add(a)
    }

    func testOnboardingReachesPaywallInTwoTaps() throws {
        let app = launch([])
        guard app.buttons["Get started"].waitForExistence(timeout: 30) else { throw XCTSkip("Onboarding already finished on this install") }
        app.buttons["Get started"].tap()
        XCTAssertTrue(app.buttons["Continue"].waitForExistence(timeout: 10))
        shot("onboarding-languages")
        app.buttons["Continue"].tap()
        XCTAssertTrue(app.buttons["Restore"].waitForExistence(timeout: 60))
        shot("paywall")
    }

    func testSaveProgressOffersAppleThenEmail() throws {
        let app = launch(["-polingual.onboarded", "YES", "-polingualOpen", "-saveProgress"])
        guard app.staticTexts["Save your progress"].waitForExistence(timeout: 30) else { throw XCTSkip("Signed in on this simulator") }
        let apple = app.buttons["Sign in with Apple"]
        let email = app.buttons["Use email instead"]
        XCTAssertTrue(apple.waitForExistence(timeout: 10))
        XCTAssertTrue(email.exists)
        XCTAssertLessThan(apple.frame.minY, email.frame.minY)
        shot("save-progress")
        email.tap()
        XCTAssertTrue(app.textFields["you@school.example"].waitForExistence(timeout: 10))
        app.buttons["Cancel"].firstMatch.tap()
        XCTAssertTrue(app.buttons["Not now"].waitForExistence(timeout: 10))
        app.buttons["Not now"].tap()
        XCTAssertTrue(app.buttons["Games, content and account"].waitForExistence(timeout: 20))
        XCTAssertFalse(app.staticTexts["Save your progress"].waitForExistence(timeout: 2))
    }

    func testAccountListsAppleFirst() throws {
        let app = launch(["-polingual.onboarded", "YES", "-polingualOpen"])
        let menu = app.buttons["Games, content and account"]
        XCTAssertTrue(menu.waitForExistence(timeout: 60))
        menu.tap()
        app.buttons["Account"].tap()
        let email = app.buttons["Sign in with email"]
        guard email.waitForExistence(timeout: 20) else { throw XCTSkip("Signed in on this simulator") }
        let apple = app.buttons["Sign in with Apple"]
        XCTAssertTrue(apple.exists)
        XCTAssertLessThan(apple.frame.minY, email.frame.minY)
        shot("account")
    }
}
