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

    func passConsent(_ app: XCUIApplication) {
        let consent = app.buttons["Continue"]
        if consent.waitForExistence(timeout: 15) { consent.tap() }
        let springboard = XCUIApplication(bundleIdentifier: "com.apple.springboard")
        let decline = springboard.buttons["Ask App Not to Track"]
        if decline.waitForExistence(timeout: 10) { decline.tap() }
    }

    func dismissStoreSignIn(_ app: XCUIApplication) {
        let springboard = XCUIApplication(bundleIdentifier: "com.apple.springboard")
        for owner in [app, springboard] {
            let cancel = owner.alerts.buttons["Cancel"]
            if cancel.waitForExistence(timeout: 5) { cancel.tap() }
        }
    }

    func testOnboardingQuizEndsOnPlanThenPaywall() throws {
        let app = launch([])
        guard app.buttons["Get started"].waitForExistence(timeout: 30) else { throw XCTSkip("Onboarding already finished on this install") }
        app.buttons["Get started"].tap()
        XCTAssertTrue(app.staticTexts["How did you hear about Polingual?"].waitForExistence(timeout: 10))
        shot("onboarding-heard")
        app.buttons["heard-friend"].tap()
        XCTAssertTrue(app.staticTexts["Which languages do you speak?"].waitForExistence(timeout: 10))
        shot("onboarding-speak")
        app.buttons["Continue"].tap()
        XCTAssertTrue(app.staticTexts["Which languages?"].waitForExistence(timeout: 10))
        shot("onboarding-languages")
        app.buttons["Continue"].tap()
        for (title, key) in [("Why are you learning?", "travel"), ("How much do you know already?", "words")] {
            XCTAssertTrue(app.staticTexts[title].waitForExistence(timeout: 10))
            shot("onboarding-\(key)")
            app.buttons["quiz-\(key)"].tap()
        }
        XCTAssertTrue(app.staticTexts["One word, every language"].waitForExistence(timeout: 10))
        shot("onboarding-motivation")
        app.buttons["Continue"].tap()
        for (title, key) in [("How many minutes a day?", "10"), ("When do you want to practice?", "evening"), ("When do you want to see results?", "quarter")] {
            XCTAssertTrue(app.staticTexts[title].waitForExistence(timeout: 10))
            shot("onboarding-\(title.prefix(12))")
            app.buttons["quiz-\(key)"].tap()
        }
        XCTAssertTrue(app.staticTexts["Your plan"].waitForExistence(timeout: 10))
        XCTAssertTrue(app.staticTexts["10 minutes a day"].exists)
        XCTAssertTrue(app.staticTexts["Practice time: Evening"].exists)
        shot("onboarding-plan")
        app.buttons["Start learning"].tap()
        let plans = app.buttons["Restore"]
        let home = app.buttons["Today"]
        let deadline = Date().addingTimeInterval(60)
        while !plans.exists && !home.exists && Date() < deadline { Thread.sleep(forTimeInterval: 1) }
        XCTAssertTrue(plans.exists || home.exists, "Onboarding did not reach the paywall or Today")
        shot(plans.exists ? "plan-paywall" : "home-already-subscribed")
        guard plans.exists else { return }
        dismissStoreSignIn(app)
        app.swipeDown(velocity: .fast)
        XCTAssertTrue(app.buttons["Play"].waitForExistence(timeout: 20))
        shot("games-free")
    }

    func testPlanPageFitsWithoutAnswers() throws {
        let app = launch(["-onboardingStep", "10"])
        guard app.staticTexts["Your plan"].waitForExistence(timeout: 30) else { throw XCTSkip("Onboarding already finished on this install") }
        XCTAssertTrue(app.staticTexts["10 minutes a day"].exists)
        XCTAssertTrue(app.buttons["Start learning"].isHittable)
        shot("plan-unanswered")
    }

    func testLockedTodayOpensPaywall() throws {
        let app = launch(["-polingual.onboarded", "YES", "-polingual.saveProgress", "NO", "-polingual.knownAskedOwners", "guest"])
        guard app.navigationBars["Games"].waitForExistence(timeout: 60) else { throw XCTSkip("Subscribed on this simulator") }
        passConsent(app)
        app.buttons["Today"].firstMatch.tap()
        let plans = app.buttons["See plans"]
        XCTAssertTrue(plans.waitForExistence(timeout: 20))
        plans.tap()
        XCTAssertTrue(app.buttons["Restore"].waitForExistence(timeout: 20))
        dismissStoreSignIn(app)
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
        let gone = XCTNSPredicateExpectation(predicate: NSPredicate(format: "exists == false"), object: app.staticTexts["Save your progress"])
        XCTAssertEqual(XCTWaiter().wait(for: [gone], timeout: 10), .completed)
    }

    func testAccountListsAppleFirst() throws {
        let app = launch(["-polingual.onboarded", "YES", "-polingualOpen"])
        let account = app.buttons["Account"].firstMatch
        XCTAssertTrue(account.waitForExistence(timeout: 60))
        account.tap()
        let email = app.buttons["Sign in with email"]
        guard email.waitForExistence(timeout: 20) else { throw XCTSkip("Signed in on this simulator") }
        let apple = app.buttons["Sign in with Apple"]
        XCTAssertTrue(apple.exists)
        XCTAssertLessThan(apple.frame.minY, email.frame.minY)
        shot("account")
    }
}
