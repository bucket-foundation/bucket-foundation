import Foundation
import Testing

struct GameStyleTests {
    static let banned = [".headline", ".subheadline", ".footnote", ".caption", ".title2", ".title3", "Palette.", "Color(hex"]

    static var gameFiles: [URL] {
        let polingual = LocalizationTests.appleRoot.appendingPathComponent("Bucket/Sources/Polingual")
        let named = ["GamesView", "LiveGames", "GamePlay", "MiniGame", "WordGroupsGame"].map { polingual.appendingPathComponent("\($0).swift") }
        let play = (try? FileManager.default.contentsOfDirectory(at: polingual.appendingPathComponent("Play"), includingPropertiesForKeys: nil)) ?? []
        return named + play.filter { $0.pathExtension == "swift" }
    }

    @Test func gameScreensUseOnlyPLTokens() throws {
        let files = Self.gameFiles
        #expect(files.count > 10)
        for url in files {
            let text = try String(contentsOf: url, encoding: .utf8)
            for token in Self.banned {
                #expect(!text.contains(token), "\(url.lastPathComponent) uses \(token)")
            }
        }
    }
}
