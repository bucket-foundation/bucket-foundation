import XCTest

@MainActor
final class SocialClipsUITests: XCTestCase {
    private struct Entry {
        let lang: String
        let meaning: Set<String>
        let category: String
    }

    private var entries: [String: [Entry]] = [:]
    private var root = "en"
    private let names: [String: [String]] = ["en": ["inglés", "english"], "fr": ["francés", "french"], "it": ["italiano", "italian"], "es": ["español", "spanish"], "de": ["alemán", "german"], "pt": ["portugués", "portuguese"]]

    private var env: [String: String] { ProcessInfo.processInfo.environment }

    override func setUp() {
        continueAfterFailure = false
    }

    private func mark(_ name: String) {
        guard let path = env["CLIP_MARKS"] else { return }
        let line = "\(name) \(Date().timeIntervalSince1970)\n"
        if let handle = FileHandle(forWritingAtPath: path) {
            handle.seekToEndOfFile()
            handle.write(Data(line.utf8))
            try? handle.close()
        } else {
            try? Data(line.utf8).write(to: URL(fileURLWithPath: path))
        }
    }

    private func dump(_ app: XCUIApplication, _ name: String) {
        guard let dir = env["CLIP_DUMP"] else { return }
        try? Data(app.debugDescription.utf8).write(to: URL(fileURLWithPath: dir).appendingPathComponent("\(name).txt"))
    }

    private func hold(_ seconds: TimeInterval) {
        Thread.sleep(forTimeInterval: seconds)
    }

    private func loadCorpus(root: String) {
        self.root = root
        let corpus = URL(fileURLWithPath: #filePath).deletingLastPathComponent().deletingLastPathComponent().deletingLastPathComponent().appendingPathComponent("Shared/Corpus")
        for name in ["lang-core.json", "lang-cognates.json", "lang-phrases.json"] {
            guard let data = try? Data(contentsOf: corpus.appendingPathComponent(name)), let json = try? JSONSerialization.jsonObject(with: data) else { continue }
            collect(json)
        }
        XCTAssertFalse(entries.isEmpty, "The corpus did not load from \(corpus.path)")
    }

    private func collect(_ node: Any) {
        if let dict = node as? [String: Any] {
            if let forms = dict["forms"] as? [String: Any] {
                var words: [String: String] = [:]
                for (lang, value) in forms {
                    if let word = value as? String { words[lang] = word }
                    if let entry = value as? [String: Any], let word = entry["word"] as? String { words[lang] = word }
                }
                var meaning: Set<String> = []
                if let own = words[root] { meaning.insert(own.lowercased()) }
                if let gloss = dict["gloss"] as? String { meaning.insert(gloss.lowercased()) }
                let category = dict["category"] as? String ?? ""
                for (lang, word) in words { entries[word.lowercased(), default: []].append(Entry(lang: lang, meaning: meaning, category: category)) }
            }
            dict.values.forEach(collect)
        }
        if let list = node as? [Any] { list.forEach(collect) }
    }

    private func launch(language: String, locale: String, system: String, extra: [String] = []) -> XCUIApplication {
        loadCorpus(root: String(system.prefix(2)))
        let app = XCUIApplication()
        app.launchArguments = ["-AppleLanguages", "(\(language))", "-AppleLocale", locale, "-polingual.onboarded", "YES", "-polingualOpen", "-polingualOrientation", "portrait", "-startTab", "learn", "-openLang", "\(system):none", "-polingualDemo", "40", "-polingual.saveProgress", "NO", "-bucketBase", "http://127.0.0.1:9"] + extra
        app.launch()
        hold(8)
        let tabs = app.tabBars.buttons
        XCTAssertTrue(tabs.firstMatch.waitForExistence(timeout: 60))
        mark("tab")
        tabs.element(boundBy: 2).tap()
        hold(2)
        dump(app, "games")
        return app
    }

    private func reveal(_ app: XCUIApplication, _ element: XCUIElement) {
        let height = app.windows.firstMatch.frame.height
        for _ in 0..<14 {
            if element.exists, element.frame.minY > height * 0.2, element.frame.maxY < height * 0.62 { return }
            let from = app.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.64))
            let to = app.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.36))
            from.press(forDuration: 0.05, thenDragTo: to, withVelocity: 700, thenHoldForDuration: 0.3)
        }
        XCTAssertTrue(element.exists, "The card never came into view")
    }

    private func labels(_ app: XCUIApplication, _ type: XCUIElement.ElementType, id: String? = nil) -> [(label: String, frame: CGRect)] {
        guard let tree = try? app.snapshot() else { return [] }
        var out: [(label: String, frame: CGRect)] = []
        func walk(_ node: XCUIElementSnapshot) {
            if node.elementType == type, id == nil || node.identifier == id, !node.frame.isEmpty { out.append((node.label, node.frame)) }
            node.children.forEach(walk)
        }
        walk(tree)
        return out
    }

    private func tap(_ app: XCUIApplication, _ frame: CGRect) {
        app.coordinate(withNormalizedOffset: .zero).withOffset(CGVector(dx: frame.midX, dy: frame.midY)).tap()
    }

    private func means(_ form: String, _ gloss: String, lang: String? = nil) -> Bool {
        entries[form.lowercased()]?.contains { $0.meaning.contains(gloss.lowercased()) && (lang == nil || $0.lang == lang) } ?? false
    }

    private func answerQuiz(_ app: XCUIApplication, right: Bool, until end: XCUIElement) -> Bool {
        let choices = app.buttons.matching(identifier: "game-choice")
        let deadline = Date().addingTimeInterval(20)
        while Date() < deadline {
            if end.exists { return false }
            if let first = try? choices.firstMatch.snapshot(), first.isEnabled, !first.frame.isEmpty { break }
            usleep(100_000)
        }
        let options = labels(app, .button, id: "game-choice")
        guard !options.isEmpty else { return false }
        let taken = Set(options.map { $0.label.lowercased() })
        let shown = Set(labels(app, .staticText).map { $0.label.lowercased() }).subtracting(taken)
        let asked = names.first { entry in shown.contains { text in entry.value.contains { text.hasSuffix(" \($0)") } } }?.key
        let correct = options.first { option in shown.contains { means(option.label, $0, lang: asked) } } ?? options.first { option in shown.contains { means(option.label, $0) } }
        let pick = right ? correct ?? options[0] : options.first { $0.label != correct?.label } ?? options[0]
        mark("answer \(right ? "right" : "miss") found=\(correct != nil)")
        tap(app, pick.frame)
        return true
    }

    private func openCard(_ app: XCUIApplication, _ title: String) {
        let card = app.staticTexts[title].firstMatch
        mark("games")
        hold(2.6)
        reveal(app, card)
        hold(1.2)
        mark("tap")
        card.tap()
    }

    func testSameWord() {
        let app = launch(language: "en", locale: "en_US", system: "en:es,fr,it,pt")
        openCard(app, "Same Word")
        let end = app.buttons["game-share"]
        XCTAssertTrue(app.buttons["game-choice"].firstMatch.waitForExistence(timeout: 30))
        mark("play")
        dump(app, "same")
        hold(1.8)
        _ = answerQuiz(app, right: true, until: end)
        hold(2.8)
        _ = answerQuiz(app, right: false, until: end)
        hold(2.6)
        mark("fast")
        while answerQuiz(app, right: true, until: end) { hold(0.3) }
        XCTAssertTrue(end.waitForExistence(timeout: 10))
        mark("end")
        hold(6)
        mark("done")
    }

    func testSpeedMatch() {
        let app = launch(language: "en", locale: "en_US", system: "en:es,fr,it,pt")
        openCard(app, "Speed Match")
        let end = app.buttons["game-share"]
        XCTAssertTrue(app.buttons["game-meaning"].firstMatch.waitForExistence(timeout: 30))
        mark("play")
        dump(app, "match")
        let deadline = Date().addingTimeInterval(90)
        while !end.exists && Date() < deadline {
            let meanings = labels(app, .button, id: "game-meaning")
            let forms = labels(app, .button, id: "game-form")
            var pair: (CGRect, CGRect)?
            for form in forms {
                let word = form.label.split(separator: ",").last.map { $0.trimmingCharacters(in: .whitespaces) } ?? form.label
                if let meaning = meanings.first(where: { means(word, $0.label) || means(form.label, $0.label) }) {
                    pair = (meaning.frame, form.frame)
                    break
                }
            }
            guard let pair else {
                usleep(200_000)
                continue
            }
            tap(app, pair.0)
            usleep(250_000)
            tap(app, pair.1)
            usleep(450_000)
        }
        XCTAssertTrue(end.waitForExistence(timeout: 10))
        mark("end")
        hold(6)
        mark("done")
    }

    func testSetDiario() {
        let app = launch(language: "es", locale: "es_US", system: "es:en,fr,it,pt", extra: ["-freshDaily"])
        let start = app.staticTexts["Jugar el set de hoy"].firstMatch
        XCTAssertTrue(start.waitForExistence(timeout: 30))
        mark("games")
        hold(3)
        mark("tap")
        start.tap()
        let end = app.buttons["game-share"]
        XCTAssertTrue(app.buttons["game-choice"].firstMatch.waitForExistence(timeout: 30))
        mark("play")
        dump(app, "daily")
        for round in 0..<6 {
            hold(round == 0 ? 1.6 : 1.9)
            _ = answerQuiz(app, right: round != 2, until: end)
        }
        XCTAssertTrue(end.waitForExistence(timeout: 15))
        mark("end")
        dump(app, "daily-end")
        hold(4)
        mark("share")
        let card = app.buttons["Compartir la tarjeta"].firstMatch
        if card.exists { card.tap() } else { end.tap() }
        hold(7)
        dump(app, "daily-share")
        mark("done")
    }

    private func partition(_ options: [[String]]) -> [[Int]]? {
        var groups: [String: [Int]] = [:]
        func place(_ tile: Int) -> Bool {
            if tile == options.count { return groups.count == 4 && groups.values.allSatisfy { $0.count == 4 } }
            for key in options[tile] {
                let size = groups[key]?.count ?? 0
                if size == 4 || (size == 0 && groups.count == 4) { continue }
                groups[key, default: []].append(tile)
                if place(tile + 1) { return true }
                groups[key]?.removeLast()
                if groups[key]?.isEmpty ?? false { groups[key] = nil }
            }
            return false
        }
        guard options.count == 16, place(0) else { return nil }
        return groups.keys.sorted().compactMap { groups[$0] }
    }

    private func tiles(_ app: XCUIApplication) -> [String: CGRect] {
        Dictionary(labels(app, .button, id: "groups.tile").map { ($0.label, $0.frame) }, uniquingKeysWith: { first, _ in first })
    }

    private func pick(_ app: XCUIApplication, _ words: [String], pause: TimeInterval) {
        let frames = tiles(app)
        for word in words {
            guard let frame = frames[word] else { continue }
            tap(app, frame)
            hold(pause)
        }
    }

    func testGruposDePalabras() {
        let targets = ["en", "fr", "it", "pt"]
        let app = launch(language: "es", locale: "es_US", system: "es:en,fr,it,pt")
        let card = app.buttons.matching(NSPredicate(format: "label BEGINSWITH %@", "Grupos de palabras")).firstMatch
        XCTAssertTrue(card.waitForExistence(timeout: 30))
        mark("games")
        hold(3)
        mark("tap")
        card.tap()
        let end = app.buttons["game-share"]
        let submit = app.buttons["groups.submit"]
        XCTAssertTrue(app.buttons["groups.tile"].firstMatch.waitForExistence(timeout: 30))
        mark("play")
        dump(app, "groups")
        let words = labels(app, .button, id: "groups.tile").map(\.label)
        let known = words.map { word in (entries[word.lowercased()] ?? []).filter { targets.contains($0.lang) } }
        let keyings: [(Entry) -> String] = [{ $0.category }, { $0.lang }, { "\($0.lang):\($0.category)" }]
        var solved: [[String]] = []
        hold(1.2)
        for keying in keyings {
            guard let groups = partition(known.map { Array(Set($0.map(keying))).sorted() }) else { continue }
            let candidate = groups.map { $0.map { words[$0] } }
            pick(app, candidate[0], pause: 0.7)
            hold(0.5)
            submit.tap()
            hold(1.6)
            if tiles(app).count == 12 {
                solved = candidate
                break
            }
            mark("rejected")
            let clear = app.buttons["Quitar selección"]
            if clear.exists, clear.isEnabled { clear.tap() }
            hold(0.6)
        }
        XCTAssertEqual(solved.count, 4, "No grouping of the board was accepted")
        mark("first")
        pick(app, Array(solved[1].prefix(3)) + [solved[2][0]], pause: 0.7)
        hold(0.5)
        submit.tap()
        hold(2)
        let selected = app.buttons.matching(identifier: "groups.tile").matching(NSPredicate(format: "isSelected == YES")).count
        if selected == 4 {
            pick(app, [solved[2][0], solved[1][3]], pause: 0.7)
        } else {
            pick(app, solved[1], pause: 0.5)
        }
        hold(0.5)
        submit.tap()
        hold(1.6)
        mark("fast")
        for group in solved[2...] {
            pick(app, group, pause: 0.25)
            submit.tap()
            hold(1.2)
        }
        XCTAssertTrue(end.waitForExistence(timeout: 15))
        mark("end")
        dump(app, "groups-end")
        hold(6)
        mark("done")
    }
}
