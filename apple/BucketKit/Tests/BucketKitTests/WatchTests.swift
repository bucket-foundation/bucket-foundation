import Foundation
import Testing
@testable import BucketKit

@Suite struct WatchTests {
    let sample = "\u{FEFF}WEBVTT\r\n\r\nNOTE made by hand\r\n\r\n1\r\n00:00:23.000 --> 00:00:24.500\r\nYou're a jerk, Thom.\r\n\r\n2\r\n00:00:27.000 --> 00:00:30.500 align:start\r\n...you have your robotics, and I\r\njust want to be <i>awesome</i> in space.\r\n\r\n01:02.250 --> 01:03.000\r\nTom &amp; Celia\r\n"

    @Test func parsesCuesWithIdsSettingsAndShortStamps() {
        let cues = VTT.parse(sample)
        #expect(cues.count == 3)
        #expect(cues[0] == WatchCue(start: 23, end: 24.5, text: "You're a jerk, Thom."))
        #expect(cues[1].text == "...you have your robotics, and I\njust want to be awesome in space.")
        #expect(cues[1].end == 30.5)
        #expect(cues[2].start == 62.25)
        #expect(cues[2].text == "Tom & Celia")
    }

    @Test func skipsBrokenBlocks() {
        let cues = VTT.parse("WEBVTT\n\n00:00:05.000 --> 00:00:04.000\nbackwards\n\n00:00:06.000 --> nope\nbad\n\n00:00:07.000 --> 00:00:08.000\n\n00:00:09.000 --> 00:00:10.000\nkept")
        #expect(cues.map(\.text) == ["kept"])
    }

    @Test func secondsAcceptsCommaAndHours() {
        #expect(VTT.seconds("01:00:00,500") == 3600.5)
        #expect(VTT.seconds("00:10") == 10)
        #expect(VTT.seconds("x:10") == nil)
        #expect(VTT.seconds("10") == nil)
    }

    @Test func cueAtFindsTheActiveCue() {
        let cues = VTT.parse(sample)
        #expect(VTT.cue(at: 10, in: cues) == nil)
        #expect(VTT.cue(at: 23, in: cues)?.start == 23)
        #expect(VTT.cue(at: 24.5, in: cues) == nil)
        #expect(VTT.cue(at: 29, in: cues)?.start == 27)
        #expect(VTT.cue(at: 62.5, in: cues)?.start == 62.25)
        #expect(VTT.cue(at: 100, in: cues) == nil)
        #expect(VTT.cue(at: 1, in: []) == nil)
    }

    @Test func overlappingCueStaysActive() {
        let cues = [WatchCue(start: 0, end: 10, text: "long"), WatchCue(start: 2, end: 3, text: "short")]
        #expect(VTT.cue(at: 2.5, in: cues)?.text == "short")
        #expect(VTT.cue(at: 5, in: cues)?.text == "long")
    }

    static let index = """
    {"version":1,"films":[{"id":"sintel","title":{"en":"Sintel","ja":"シンテル"},"duration":888.064,"license":"CC BY 3.0","credit":"(CC) Blender Foundation | studio.blender.org","source":"https://studio.blender.org/films/sintel/","video":"https://example.org/s.mp4","poster":"https://example.org/s.png","langs":["en","es","ja"],"cues":26,"translation":"machine","updated":"2026-11-12"}]}
    """

    @Test func filmPicksLearnerLanguagesItHas() throws {
        let film = try JSONDecoder().decode(WatchIndex.self, from: Data(Self.index.utf8)).films[0]
        #expect(film.subtitleLangs(for: ["ja", "ko", "es"]) == ["ja", "es"])
        #expect(film.subtitleLangs(for: ["ko"]) == ["en"])
        #expect(film.title("ja") == "シンテル")
        #expect(film.title("ko") == "Sintel")
        #expect(film.minutes == 15)
    }

    @Test func apiFetchesIndexAndCues() async throws {
        let transport = StubTransport { r in
            switch r.url?.path() {
            case "/watch/index.json": (200, Data(Self.index.utf8))
            case "/watch/sintel/es.vtt": (200, Data("WEBVTT\n\n1\n00:01:47.250 --> 00:01:50.500\nEsta espada tiene un pasado oscuro.\n".utf8))
            default: (404, Data())
            }
        }
        let api = WatchAPI(transport: transport)
        #expect(try await api.index().films.map(\.id) == ["sintel"])
        let cues = try await api.cues(film: "sintel", lang: "es")
        #expect(cues == [WatchCue(start: 107.25, end: 110.5, text: "Esta espada tiene un pasado oscuro.")])
        await #expect(throws: BucketError.server(404, nil)) { try await api.cues(film: "sintel", lang: "xx") }
    }
}
