import Foundation
import Testing

struct GameStyleTests {
    static let banned = [".headline", ".subheadline", ".footnote", ".caption", ".title2", ".title3", "Palette.", "Color(hex", "D8.", ".system(size", ".system(."]

    static var gameFiles: [URL] {
        let polingual = LocalizationTests.appleRoot.appendingPathComponent("Bucket/Sources/Polingual")
        let named = ["GamesView", "LiveGames", "GamePlay", "MiniGame", "WordGroupsGame", "Lobbies", "LobbyAds", "LetterGame", "GameAccess", "DailyLedger"].map { polingual.appendingPathComponent("\($0).swift") }
        let play = (try? FileManager.default.contentsOfDirectory(at: polingual.appendingPathComponent("Play"), includingPropertiesForKeys: nil)) ?? []
        return named + play.filter { $0.pathExtension == "swift" }
    }

    @Test func gameScreensUseOnlyPLTokens() throws {
        let files = Self.gameFiles
        #expect(files.count > 20)
        for url in files {
            let text = try String(contentsOf: url, encoding: .utf8)
            for token in Self.banned {
                #expect(!text.contains(token), "\(url.lastPathComponent) uses \(token)")
            }
        }
    }

    @Test func polingualSourcesUseOnlyPLTokens() throws {
        let root = LocalizationTests.appleRoot
        let files = ["Bucket/Sources/Polingual", "Polingual/Sources"].flatMap { dir -> [URL] in
            let all = FileManager.default.enumerator(at: root.appendingPathComponent(dir), includingPropertiesForKeys: nil)?.allObjects as? [URL] ?? []
            return all.filter { $0.pathExtension == "swift" }
        }
        #expect(files.count > 50)
        let banned = ["Palette.", "D8Option", ".system(size", ".serif(", "0x12326A", "0x8C5A1C", "0x5E3B10"]
        for url in files {
            let text = try String(contentsOf: url, encoding: .utf8)
            for token in banned {
                #expect(!text.contains(token), "\(url.lastPathComponent) uses \(token)")
            }
            #expect(text.range(of: #"cornerRadius: \d"#, options: .regularExpression) == nil, "\(url.lastPathComponent) hand-types a corner radius")
        }
    }
}
