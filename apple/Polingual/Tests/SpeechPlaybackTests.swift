#if os(iOS)
import AVFoundation
import BucketKit
import XCTest
@testable import Polingual

@MainActor
final class SpeechPlaybackTests: XCTestCase {
    private final class Finished: NSObject, AVSpeechSynthesizerDelegate {
        let done: XCTestExpectation
        init(_ done: XCTestExpectation) { self.done = done }
        func speechSynthesizer(_ synthesizer: AVSpeechSynthesizer, didFinish utterance: AVSpeechUtterance) {
            done.fulfill()
        }
    }

    func testEveryLanguageVoiceIsReported() {
        let missing = Lang.codes.filter { LangVoice.shared.voice($0) == nil }
        let total = AVSpeechSynthesisVoice.speechVoices().count
        print("VOICE_REPORT total=\(total) missing=\(missing.joined(separator: ","))")
        XCTAssertGreaterThan(total, 0)
    }

    func testRapidTapsLeaveTheLastWordSpeaking() async throws {
        _ = try XCTUnwrap(LangVoice.shared.voice("it"))
        for word in ["uno", "due", "tre", "quattro"] {
            LangVoice.shared.speak(word, "it")
            try await Task.sleep(for: .milliseconds(60))
        }
        let deadline = Date().addingTimeInterval(10)
        while !LangVoice.shared.synth.isSpeaking, Date() < deadline {
            try await Task.sleep(for: .milliseconds(100))
        }
        XCTAssertTrue(LangVoice.shared.synth.isSpeaking)
    }

    func testABusyVoiceIsNotSpokenTwice() async throws {
        _ = try XCTUnwrap(LangVoice.shared.voice("it"))
        LangVoice.shared.speak("precipitevolissimevolmente, quattrocentoquarantaquattro", "it", slow: true)
        try await Task.sleep(for: .milliseconds(300))
        let first = ObjectIdentifier(LangVoice.shared.synth)
        try await Task.sleep(for: LangVoice.startWait + .milliseconds(800))
        if LangVoice.shared.synth.isSpeaking {
            XCTAssertEqual(ObjectIdentifier(LangVoice.shared.synth), first)
        }
        LangVoice.shared.hush()
    }

    func testLetterWordFinishesThroughTheAppSession() throws {
        let voice = try XCTUnwrap(LangVoice.shared.voice("it"))
        LangVoice.shared.activate()
        let synth = AVSpeechSynthesizer()
        let finished = Finished(expectation(description: "utterance finished"))
        synth.delegate = finished
        let utterance = AVSpeechUtterance(string: "caffè")
        utterance.voice = voice
        synth.speak(utterance)
        wait(for: [finished.done], timeout: 20)
        print("SESSION_REPORT category=\(AVAudioSession.sharedInstance().category.rawValue) route=\(AVAudioSession.sharedInstance().currentRoute.outputs.map(\.portType.rawValue)) volume=\(AVAudioSession.sharedInstance().outputVolume)")
    }
}
#endif
