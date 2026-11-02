import XCTest

struct ReviewWalk {
    let app: XCUIApplication
    let env = ProcessInfo.processInfo.environment

    static var onDevice: Bool {
        #if targetEnvironment(simulator)
        false
        #else
        true
        #endif
    }

    var demoEmail: String { env["REVIEW_DEMO_EMAIL"] ?? "" }
    var newEmail: String { env["REVIEW_NEW_EMAIL"] ?? "" }
    var groupName: String { env["REVIEW_GROUP"] ?? "Rossi family" }
    var memberName: String { env["REVIEW_MEMBER"] ?? "Marco" }
    var lead: TimeInterval { env["REVIEW_LEAD_SECONDS"].flatMap(TimeInterval.init) ?? (Self.onDevice ? 20 : 0) }
    var pace: TimeInterval { Self.onDevice ? 2 : 0 }
    var humanTimeout: TimeInterval { 240 }

    func hold() {
        if pace > 0 { Thread.sleep(forTimeInterval: pace) }
    }

    func tap(_ element: XCUIElement, timeout: TimeInterval = 20, file: StaticString = #filePath, line: UInt = #line) {
        XCTAssertTrue(element.waitForExistence(timeout: timeout), "Missing \(element)", file: file, line: line)
        hold()
        element.tap()
    }

    func scrollTo(_ element: XCUIElement, file: StaticString = #filePath, line: UInt = #line) {
        var left = 12
        while !(element.exists && element.isHittable) && left > 0 {
            app.swipeUp()
            left -= 1
        }
        XCTAssertTrue(element.exists, "Missing \(element)", file: file, line: line)
    }

    func button(containing text: String) -> XCUIElement {
        app.buttons.containing(NSPredicate(format: "label CONTAINS %@", text)).firstMatch
    }

    func labeled(_ text: String) -> XCUIElement {
        app.buttons.matching(NSPredicate(format: "label BEGINSWITH %@", text)).firstMatch
    }

    func signIn(email: String) {
        tap(app.buttons["Sign in"].firstMatch)
        let field = app.textFields["you@school.example"]
        XCTAssertTrue(field.waitForExistence(timeout: 20))
        guard Self.onDevice else {
            tap(app.buttons["Cancel"].firstMatch)
            return
        }
        field.tap()
        field.typeText(email)
        tap(app.buttons["Send code"])
        XCTAssertTrue(app.buttons["Sign out"].waitForExistence(timeout: humanTimeout), "Type the emailed code on the phone")
    }

    func signOut() {
        scrollToTop()
        tap(app.buttons["Sign out"])
        XCTAssertTrue(app.buttons["Sign in"].firstMatch.waitForExistence(timeout: 30))
    }

    func scrollToTop() {
        var left = 12
        while !app.buttons["Sign out"].isHittable && !app.buttons["Sign in"].firstMatch.isHittable && left > 0 {
            app.swipeDown()
            left -= 1
        }
    }

    func reportAndBlock() {
        let group = labeled(groupName)
        scrollTo(group)
        tap(group)
        let member = labeled(memberName)
        tap(member)
        tap(app.buttons["Report or block"])
        tap(app.buttons["Report \(memberName)"])
        tap(app.buttons["Offensive name"])
        tap(app.alerts.buttons["OK"], timeout: 30)
        tap(app.buttons["Report or block"])
        tap(app.buttons["Block \(memberName)"])
        tap(app.buttons["Block"].firstMatch)
        XCTAssertTrue(app.staticTexts["Members"].waitForExistence(timeout: 30))
        hold()
        XCTAssertFalse(labeled(memberName).exists)

        let report = app.buttons["Report group name"]
        scrollTo(report)
        tap(report)
        tap(app.buttons["Offensive name"])
        tap(app.alerts.buttons["OK"], timeout: 30)
        let block = app.buttons["Block this group"]
        scrollTo(block)
        tap(block)
        XCTAssertTrue(app.staticTexts["Block \(groupName)?"].waitForExistence(timeout: 10))
        hold()
        tap(app.buttons["Cancel"].firstMatch)
        tap(app.navigationBars.buttons.firstMatch)

        let blocked = labeled("Blocked")
        scrollTo(blocked)
        tap(blocked)
        tap(app.buttons["Unblock"])
        if Self.onDevice {
            XCTAssertFalse(app.buttons["Unblock"].waitForExistence(timeout: 2) && app.buttons["Unblock"].isHittable)
        }
        tap(app.navigationBars.buttons.firstMatch)
    }

    func nameFilter() {
        guard Self.onDevice else { return }
        let invite = labeled("Invite friends")
        scrollTo(invite)
        tap(invite)
        let field = app.textFields["Name others see"]
        XCTAssertTrue(field.waitForExistence(timeout: 20))
        field.tap()
        field.typeText("shit")
        tap(app.buttons["Create and invite"])
        XCTAssertTrue(app.staticTexts["That name is not allowed. Try another."].waitForExistence(timeout: 30))
        hold()
        tap(app.buttons["Cancel"].firstMatch)
    }

    func deleteAccount() {
        guard Self.onDevice else { return }
        scrollToTop()
        tap(app.buttons["Delete account"])
        tap(app.buttons["Delete account and data"])
        XCTAssertTrue(app.buttons["Sign in"].firstMatch.waitForExistence(timeout: 60))
        hold()
    }

    func accountFlows() {
        if Self.onDevice { signIn(email: demoEmail) }
        reportAndBlock()
        if Self.onDevice {
            signOut()
            signIn(email: newEmail)
            nameFilter()
            deleteAccount()
        } else {
            scrollToTop()
            signIn(email: newEmail)
        }
    }
}
