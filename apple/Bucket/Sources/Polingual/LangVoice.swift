import AVFoundation
import BucketKit
import Speech
import SwiftUI

@MainActor
final class LangVoice: NSObject {
    static let shared = LangVoice()
    private let synth = AVSpeechSynthesizer()

    private var player: AVPlayer?
    private var active = false
    private var warmed = false
    private lazy var voices = AVSpeechSynthesisVoice.speechVoices()
    private var picked: [String: AVSpeechSynthesisVoice?] = [:]
    weak var store: LangStore?

    func activate() {
        guard !active else { return }
        #if os(iOS)
        let session = AVAudioSession.sharedInstance()
        try? session.setCategory(.playback, mode: .spokenAudio, options: [.mixWithOthers])
        try? session.setActive(true)
        #endif
        active = true
    }

    func warm() {
        guard !warmed else { return }
        warmed = true
        let u = AVSpeechUtterance(string: " ")
        u.volume = 0
        synth.speak(u)
    }

    func voice(_ lang: String) -> AVSpeechSynthesisVoice? {
        if let hit = picked[lang] { return hit }
        let v = LangAudio.pickVoice(voices.map(\.language), lang).flatMap { tag in voices.first { $0.language == tag } }
        picked[lang] = v
        return v
    }

    func canSpeak(_ text: String, _ lang: String) -> Bool {
        !text.isEmpty && (voice(lang) != nil || (store?.hasClip(lang, text) ?? false))
    }

    @discardableResult
    func speak(_ text: String, _ lang: String) -> Bool {
        guard !text.isEmpty else { return false }
        activate()
        guard let v = voice(lang) else { return playClip(text, lang) }
        player?.pause()
        synth.stopSpeaking(at: .immediate)
        let u = AVSpeechUtterance(string: text)
        u.voice = v
        u.rate = AVSpeechUtteranceDefaultSpeechRate * 0.9
        synth.speak(u)
        return true
    }

    func playClip(_ text: String, _ lang: String) -> Bool {
        guard let store, store.hasClip(lang, text) else { return false }
        activate()
        synth.stopSpeaking(at: .immediate)
        player?.pause()
        player = AVPlayer(url: store.clipURL(lang, text))
        player?.play()
        return true
    }
}

@MainActor
final class LangListener {
    static let shared = LangListener()
    private let engine = AVAudioEngine()

    var supported: Bool {
        #if os(iOS) || os(macOS)
        SFSpeechRecognizer.authorizationStatus() != .denied && SFSpeechRecognizer.authorizationStatus() != .restricted
        #else
        false
        #endif
    }

    func authorize() async -> Bool {
        let speech = await Self.speechAuthorized()
        guard speech else { return false }
        #if os(iOS)
        return await AVAudioApplication.requestRecordPermission()
        #else
        return true
        #endif
    }

    nonisolated private static func speechAuthorized() async -> Bool {
        await withCheckedContinuation { c in SFSpeechRecognizer.requestAuthorization { c.resume(returning: $0 == .authorized) } }
    }

    nonisolated private static func tap(_ input: AVAudioInputNode, into request: SFSpeechAudioBufferRecognitionRequest) {
        input.installTap(onBus: 0, bufferSize: 1024, format: input.outputFormat(forBus: 0)) { buf, _ in request.append(buf) }
    }

    nonisolated private static func recognize(_ rec: SFSpeechRecognizer, _ request: SFSpeechAudioBufferRecognitionRequest, _ finish: @escaping @Sendable ([String]) -> Void) -> SFSpeechRecognitionTask {
        rec.recognitionTask(with: request) { r, err in
            if let r, r.isFinal { finish(r.transcriptions.prefix(5).map(\.formattedString)) } else if err != nil { finish([]) }
        }
    }

    func listenOnce(_ lang: String) async -> [String] {
        guard await authorize(), let rec = SFSpeechRecognizer(locale: Locale(identifier: Lang.info[lang]?.bcp47 ?? lang)), rec.isAvailable else { return [] }
        let request = SFSpeechAudioBufferRecognitionRequest()
        request.shouldReportPartialResults = false
        request.requiresOnDeviceRecognition = rec.supportsOnDeviceRecognition
        #if os(iOS)
        try? AVAudioSession.sharedInstance().setCategory(.playAndRecord, mode: .measurement, options: [.duckOthers, .defaultToSpeaker])
        try? AVAudioSession.sharedInstance().setActive(true, options: .notifyOthersOnDeactivation)
        #endif
        let input = engine.inputNode
        input.removeTap(onBus: 0)
        Self.tap(input, into: request)
        engine.prepare()
        guard (try? engine.start()) != nil else { return [] }
        let result: [String] = await withCheckedContinuation { c in
            var done = false
            let finish: @Sendable ([String]) -> Void = { xs in
                DispatchQueue.main.async {
                    if done { return }
                    done = true
                    c.resume(returning: xs)
                }
            }
            let task = Self.recognize(rec, request, finish)
            DispatchQueue.main.asyncAfter(deadline: .now() + 6) {
                request.endAudio()
                DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) {
                    task.cancel()
                    finish([])
                }
            }
        }
        engine.stop()
        input.removeTap(onBus: 0)
        #if os(iOS)
        try? AVAudioSession.sharedInstance().setCategory(.playback, mode: .spokenAudio, options: [.mixWithOthers])
        #endif
        return result
    }
}

struct PlayButton: View {
    let text: String
    let lang: String
    var label: String?

    var body: some View {
        if LangVoice.shared.canSpeak(text, lang) {
            Button {
                LangVoice.shared.speak(text, lang)
            } label: {
                Image(systemName: "speaker.wave.2.fill")
            }
            .buttonStyle(.borderless)
            .tint(Palette.green)
            .accessibilityLabel(label ?? "Hear it in \(langName(lang))")
        }
    }
}
