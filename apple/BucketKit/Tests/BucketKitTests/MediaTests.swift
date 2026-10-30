import Foundation
import Testing
@testable import BucketKit

@Test func youTubeResultsReadIdsAndTitles() {
    let html = #"var ytInitialData = {"contents":[{"videoRenderer":{"videoId":"abcDEF12_-x","thumbnail":{},"title":{"runs":[{"text":"La gravité \"expliquée\""}]}}},{"videoRenderer":{"videoId":"abcDEF12_-x","title":{"runs":[{"text":"dup"}]}}},{"videoRenderer":{"videoId":"zzzzzzzzzz9","title":{"runs":[{"text":"Second"}]}}}]}"#
    let found = YouTubeResults.parse(html)
    #expect(found == [FoundVideo(id: "abcDEF12_-x", title: "La gravité \"expliquée\""), FoundVideo(id: "zzzzzzzzzz9", title: "Second")])
    #expect(found[0].embed.absoluteString.contains("youtube-nocookie.com/embed/abcDEF12_-x"))
    #expect(YouTubeResults.parse("<html>nothing</html>").isEmpty)
}

@Test func immersionCountsPerDayAndRollsOver() {
    var cal = Calendar(identifier: .gregorian)
    cal.timeZone = TimeZone(identifier: "UTC")!
    let night = Date(timeIntervalSince1970: 86400 * 100 - 60)
    var log = ImmersionLog()
    log.add(600, at: night, calendar: cal)
    log.add(120, at: night.addingTimeInterval(120), calendar: cal)
    #expect(log.minutes(on: night, calendar: cal) == 10)
    #expect(log.minutes(on: night.addingTimeInterval(120), calendar: cal) == 2)
    log.add(60, at: night.addingTimeInterval(86400 * 30), calendar: cal)
    #expect(log.seconds.count == 1)
}

@Test func youTubeSearchAsksInTheLearnersLanguage() {
    let fr = YouTubeResults.search("Gravitation", lang: "fr").absoluteString
    #expect(fr.contains("search_query=Gravitation%20fran%C3%A7ais"))
    #expect(fr.contains("hl=fr") && fr.contains("gl=FR"))
    #expect(!YouTubeResults.search("Gravity", lang: "en").absoluteString.contains("English"))
}

@Test func nearbyRadioSendsARoundedPlaceOrTheCountry() {
    let near = ContentAPI.place(near: (40.7128, -74.006), country: "US")
    #expect(near.map(\.value) == ["40.7", "-74.0", "80000"])
    #expect(ContentAPI.place(near: nil, country: "US").map(\.name) == ["countrycode"])
    #expect(ContentAPI.place(near: nil, country: nil).isEmpty)
}
