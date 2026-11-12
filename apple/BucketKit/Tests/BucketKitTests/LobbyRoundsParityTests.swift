import Foundation
import Testing
@testable import BucketKit

struct LobbyRoundsParityTests {
    struct Case: Decodable {
        let game: String
        let root: String
        let targets: [String]
        let seed: String
        let rounds: Int
        let prompts: [String]
    }

    struct Vectors: Decodable {
        let rng: [String]
        let zero: String
        let hash: [String]
        let mixed: String
        let cases: [Case]
    }

    func vectors() throws -> Vectors {
        let url = try #require(Bundle.module.url(forResource: "lobby-rounds", withExtension: "json", subdirectory: "Fixtures"))
        return try JSONDecoder().decode(Vectors.self, from: Data(contentsOf: url))
    }

    func mode(_ m: GamePrompt.Mode) -> String {
        switch m {
        case .form: "form"
        case .flag: "flag"
        case .voice: "voice"
        }
    }

    func row(_ p: GamePrompt) -> String {
        [String(p.id), mode(p.mode), String(p.group), p.word.lang, p.word.itemId, p.word.form, p.answer, p.choices.joined(separator: "|")].joined(separator: "\t")
    }

    @Test func randomAndHashMatchTheWebPort() throws {
        let v = try vectors()
        var rng = SeededRandom(seed: 7)
        #expect((0..<4).map { _ in String(rng.next()) } == v.rng)
        var zero = SeededRandom(seed: 0)
        #expect(String(zero.next()) == v.zero)
        #expect(["", "lobby", "día|en|es,fr"].map { String(GameSeed.hash($0)) } == v.hash)
        var m = SeededRandom(seed: 99)
        #expect(mixed(Array(0..<10), using: &m).map(String.init).joined(separator: ",") == v.mixed)
    }

    @Test func lobbyPromptsMatchTheWebPort() throws {
        let v = try vectors()
        let corpus = buildLangCorpus(core: try langFixture("core"), cognates: try langFixture("cognates"), phrases: try langFixture("phrases"), layers: try langFixture("layers"))
        for c in v.cases {
            let game = try #require(LobbyGame(rawValue: c.game))
            let seed = UInt64(c.seed) ?? GameSeed.hash(c.seed)
            let got = GameRounds.lobby(game, corpus: corpus, root: c.root, targets: c.targets, seed: seed, count: c.rounds).map(row)
            #expect(got == c.prompts, "\(c.game) \(c.root) \(c.targets) \(c.seed)")
        }
    }
}
