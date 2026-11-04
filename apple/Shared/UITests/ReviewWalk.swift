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
    var pace: TimeInterval { Self.onDevice ? 2 : 1 }
    var humanTimeout: TimeInterval { 240 }

    nonisolated(unsafe) static var recording = false

    func clearAlerts() {
        let board = XCUIApplication(bundleIdentifier: "com.apple.springboard")
        guard board.alerts.firstMatch.exists else { return }
        for name in ["Allow", "Allow While Using App", "OK", "Continue", "Not Now"] {
            let button = board.alerts.buttons[name]
            if button.exists {
                button.tap()
                hold()
                return
            }
        }
    }

    @discardableResult
    func toggleScreenRecording() -> Bool {
        guard Self.onDevice else { return false }
        let board = XCUIApplication(bundleIdentifier: "com.apple.springboard")
        board.coordinate(withNormalizedOffset: CGVector(dx: 0.9, dy: 0.002))
            .press(forDuration: 0.1, thenDragTo: board.coordinate(withNormalizedOffset: CGVector(dx: 0.9, dy: 0.7)))
        let toggle = board.buttons.matching(NSPredicate(format: "label CONTAINS[c] 'Screen Recording' OR label CONTAINS[c] 'Record Screen'")).firstMatch
        guard toggle.waitForExistence(timeout: 5) else {
            print(board.debugDescription)
            board.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.95)).tap()
            return false
        }
        toggle.tap()
        Thread.sleep(forTimeInterval: 4)
        board.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.95)).tap()
        Thread.sleep(forTimeInterval: 1)
        Self.recording.toggle()
        return true
    }

    func startRecording(file: StaticString = #filePath, line: UInt = #line) {
        guard Self.onDevice else { return Thread.sleep(forTimeInterval: lead) }
        XCTAssertTrue(toggleScreenRecording(), "Control Center has no Screen Recording button", file: file, line: line)
    }

    func stopRecording(file: StaticString = #filePath, line: UInt = #line) {
        guard Self.onDevice, Self.recording else { return }
        XCTAssertTrue(toggleScreenRecording(), "Screen recording may still be running, stop it from Control Center", file: file, line: line)
    }

    var emailSignIn: XCUIElement { app.buttons["Sign in with email"] }

    func hold() {
        if pace > 0 { Thread.sleep(forTimeInterval: pace) }
    }

    func tap(_ element: XCUIElement, timeout: TimeInterval = 20, file: StaticString = #filePath, line: UInt = #line) {
        if !element.waitForExistence(timeout: 3) { clearAlerts() }
        let found = element.waitForExistence(timeout: timeout)
        if !found { print(app.debugDescription) }
        XCTAssertTrue(found, "Missing \(element)", file: file, line: line)
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
        tap(emailSignIn)
        let field = app.textFields["you@school.example"]
        XCTAssertTrue(field.waitForExistence(timeout: 20))
        guard Self.onDevice else {
            tap(app.buttons["Cancel"].firstMatch)
            return
        }
        field.tap()
        field.typeText(email)
        tap(app.buttons["Send code"])
        if email == demoEmail, let demoCode = env["REVIEW_DEMO_CODE"], !demoCode.isEmpty {
            let box = app.textFields["Code"]
            XCTAssertTrue(box.waitForExistence(timeout: 30))
            box.tap()
            box.typeText(demoCode)
            tap(app.buttons["Verify"])
        }
        XCTAssertTrue(app.buttons["Sign out"].waitForExistence(timeout: humanTimeout), "Type the emailed code on the phone")
    }

    func signOut() {
        scrollToTop()
        tap(app.buttons["Sign out"])
        XCTAssertTrue(emailSignIn.waitForExistence(timeout: 30))
    }

    func scrollToTop() {
        var left = 12
        while !app.buttons["Sign out"].isHittable && !emailSignIn.isHittable && left > 0 {
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
        XCTAssertTrue(app.buttons["Leave group"].waitForExistence(timeout: 30))
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
        app.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.12)).tap()
        hold()
        var tries = 4
        while app.buttons["Leave group"].exists && tries > 0 {
            tap(app.buttons["BackButton"].firstMatch)
            hold()
            tries -= 1
        }

        scrollToTop()
        let blocked = labeled("Blocked")
        scrollTo(blocked)
        tap(blocked)
        tap(app.buttons["Unblock"])
        if Self.onDevice {
            XCTAssertFalse(app.buttons["Unblock"].waitForExistence(timeout: 2) && app.buttons["Unblock"].isHittable)
        }
        tap(app.buttons["BackButton"].firstMatch)
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
        XCTAssertTrue(emailSignIn.waitForExistence(timeout: 60))
        hold()
    }

    func threeTabs() {
        XCTAssertTrue(app.navigationBars["Today"].waitForExistence(timeout: 60))
        hold()
        tap(app.buttons["Learn"].firstMatch)
        XCTAssertTrue(app.navigationBars["Learn"].waitForExistence(timeout: 20))
        hold()
        XCTAssertFalse(app.buttons["Games"].exists)
        XCTAssertFalse(app.buttons["Content"].exists)
        tap(app.buttons["Account"].firstMatch)
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
