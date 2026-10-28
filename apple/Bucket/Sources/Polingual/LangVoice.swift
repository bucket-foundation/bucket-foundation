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
@Observable
final class LangListener {
    static let shared = LangListener()
    @ObservationIgnored private let engine = AVAudioEngine()
    @ObservationIgnored private var current: SpeechRun?
    private(set) var live = ""

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

    nonisolated private static func recognize(_ rec: SFSpeechRecognizer, _ request: SFSpeechAudioBufferRecognitionRequest, _ heard: HeardBox, _ finish: @escaping @Sendable ([String]) -> Void) -> SFSpeechRecognitionTask {
        rec.recognitionTask(with: request) { r, err in
            if let r {
                let alts = Array(r.transcriptions.prefix(5).map(\.formattedString))
                if r.isFinal { finish(alts) } else { heard.update(alts) }
            } else if err != nil {
                finish(heard.alts)
            }
        }
    }

    nonisolated private static func watch(_ run: SpeechRun, started: Date, limit: TimeInterval) {
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.2) {
            if run.isDone { return }
            let quiet = run.heard.quietFor() ?? 0
            if (quiet >= silence && !run.heard.alts.isEmpty) || Date().timeIntervalSince(started) >= limit {
                run.request.endAudio()
                DispatchQueue.main.asyncAfter(deadline: .now() + 1.2) {
                    run.task?.cancel()
                    run.finish(run.heard.alts)
                }
                return
            }
            watch(run, started: started, limit: limit)
        }
    }

    nonisolated static let silence: TimeInterval = 0.7
    nonisolated static let maxListen: TimeInterval = 6
    nonisolated static let maxSentence: TimeInterval = 15

    func stop() {
        guard let run = current else { return }
        run.request.endAudio()
        run.task?.finish()
        run.finish(run.heard.alts)
    }

    func listenOnce(_ lang: String, limit: TimeInterval = LangListener.maxListen) async -> [String] {
        guard await authorize(), let rec = SFSpeechRecognizer(locale: Locale(identifier: Lang.info[lang]?.bcp47 ?? lang)), rec.isAvailable else { return [] }
        let request = SFSpeechAudioBufferRecognitionRequest()
        request.shouldReportPartialResults = true
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
        let run = SpeechRun(request: request)
        current = run
        live = ""
        let shown = Task { [weak self] in
            while !Task.isCancelled {
                self?.live = run.heard.alts.first ?? ""
                try? await Task.sleep(for: .milliseconds(120))
            }
        }
        let result: [String] = await withCheckedContinuation { c in
            run.onFinish = { xs in c.resume(returning: xs) }
            run.task = Self.recognize(rec, request, run.heard) { run.finish($0) }
            Self.watch(run, started: Date(), limit: limit)
        }
        shown.cancel()
        current = nil
        live = result.first ?? live
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

final class HeardBox: @unchecked Sendable {
    private let lock = NSLock()
    private var latest: [String] = []
    private var changed: Date?

    var alts: [String] { lock.withLock { latest } }

    func update(_ xs: [String]) {
        lock.withLock {
            if xs != latest { latest = xs; changed = Date() }
        }
    }

    func quietFor(now: Date = Date()) -> TimeInterval? {
        lock.withLock { changed.map { now.timeIntervalSince($0) } }
    }
}

final class SpeechRun: @unchecked Sendable {
    let request: SFSpeechAudioBufferRecognitionRequest
    let heard = HeardBox()
    var task: SFSpeechRecognitionTask?
    var onFinish: (([String]) -> Void)?
    private let lock = NSLock()
    private var done = false

    init(request: SFSpeechAudioBufferRecognitionRequest) { self.request = request }

    var isDone: Bool { lock.withLock { done } }

    func finish(_ xs: [String]) {
        let first = lock.withLock { () -> Bool in
            if done { return false }
            done = true
            return true
        }
        guard first else { return }
        DispatchQueue.main.async { self.onFinish?(xs) }
    }
}
