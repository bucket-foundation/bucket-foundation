import AVFoundation
import BucketKit
import Speech
import SwiftUI

@MainActor
final class LangVoice: NSObject, AVSpeechSynthesizerDelegate {
    static let shared = LangVoice()
    static let startWait: Duration = .milliseconds(Int(SoundPolicy.tapBudget * 1000))
    private(set) var synth = AVSpeechSynthesizer()
    private var waiting: ObjectIdentifier?
    private var tapped: Date?
    private(set) var latency = TapLatency()

    private var player: AVPlayer?
    private var warmed = false
    private var cache = VoiceCache<AVSpeechSynthesisVoice>()
    private var preloading = false
    weak var store: LangStore?

    override private init() {
        super.init()
        synth.delegate = self
        NotificationCenter.default.addObserver(forName: AVSpeechSynthesizer.availableVoicesDidChangeNotification, object: nil, queue: .main) { [weak self] _ in
            MainActor.assumeIsolated { self?.forgetVoices() }
        }
    }

    private func forgetVoices() {
        cache.forget()
        preload()
    }

    var silent: Bool { UserDefaults.standard.bool(forKey: SoundPolicy.silentKey) }

    func allows(_ kind: SoundKind) -> Bool { SoundPolicy.allows(kind, silent: silent) }

    func preload() {
        guard !preloading, !cache.loaded else { return }
        preloading = true
        Task.detached(priority: .userInitiated) {
            let found = AVSpeechSynthesisVoice.speechVoices()
            await MainActor.run {
                LangVoice.shared.preloading = false
                LangVoice.shared.cache.fill(found)
            }
        }
    }

    func activate(_ kind: SoundKind = .tap) {
        #if os(iOS)
        guard !LangListener.shared.active else { return }
        if AppAudio.shared.active {
            AppAudio.shared.hold()
            return
        }
        let session = AVAudioSession.sharedInstance()
        let category: AVAudioSession.Category = SoundPolicy.honorsMuteSwitch(kind) ? .ambient : .playback
        if session.category != category || session.mode != .spokenAudio {
            try? session.setCategory(category, mode: .spokenAudio, options: [.mixWithOthers])
        }
        try? session.setActive(true)
        #endif
    }

    func warm() {
        guard !warmed else { return }
        warmed = true
        let u = AVSpeechUtterance(string: " ")
        u.volume = 0
        synth.speak(u)
    }

    func voice(_ lang: String) -> AVSpeechSynthesisVoice? {
        cache.pick(lang, load: { AVSpeechSynthesisVoice.speechVoices() }) { voices, lang in
            let choices = voices.map { LangAudio.Voice(id: $0.identifier, language: $0.language, quality: $0.quality.rawValue, novelty: Self.odd($0)) }
            return LangAudio.pickVoice(choices, lang).flatMap { c in voices.first { $0.identifier == c.id } }
        }
    }

    private static func odd(_ v: AVSpeechSynthesisVoice) -> Bool {
        v.voiceTraits.contains(.isNoveltyVoice) || v.voiceTraits.contains(.isPersonalVoice)
    }

    func canSpeak(_ text: String, _ lang: String) -> Bool {
        !text.isEmpty && (voice(lang) != nil || (store?.hasClip(lang, text) ?? false))
    }

    @discardableResult
    func speak(_ text: String, _ lang: String, slow: Bool = false, kind: SoundKind = .tap) -> Bool {
        guard !text.isEmpty, allows(kind) else { return false }
        activate(kind)
        guard let v = voice(lang) else {
            if playClip(text, lang) { return true }
            if kind == .tap { VoiceNotice.shared.missing(lang) }
            return false
        }
        start([utterance(text, v, rate: slow ? 0.45 : 0.9)])
        return true
    }

    private func start(_ us: [AVSpeechUtterance]) {
        player?.pause()
        if SoundPolicy.start(busy: synth.isSpeaking || synth.isPaused) == .renewThenSpeak { renew() }
        tapped = Date()
        say(us, retry: true)
    }

    private func utterance(_ text: String, _ v: AVSpeechSynthesisVoice, rate: Float = 0.9, gap: TimeInterval = 0) -> AVSpeechUtterance {
        let u = AVSpeechUtterance(string: text)
        u.voice = v
        u.rate = AVSpeechUtteranceDefaultSpeechRate * rate
        u.postUtteranceDelay = gap
        return u
    }

    private func say(_ us: [AVSpeechUtterance], retry: Bool) {
        guard let first = us.first else { return }
        let id = ObjectIdentifier(first)
        waiting = id
        us.forEach(synth.speak)
        Task { @MainActor [weak self] in
            try? await Task.sleep(for: Self.startWait)
            guard let self, self.waiting == id else { return }
            self.waiting = nil
            guard retry, !self.synth.isSpeaking else { return }
            self.renew()
            self.say(us.compactMap { $0.copy() as? AVSpeechUtterance }, retry: false)
        }
    }

    private func renew() {
        synth.delegate = nil
        synth.stopSpeaking(at: .immediate)
        synth = AVSpeechSynthesizer()
        synth.delegate = self
        #if os(iOS)
        try? AVAudioSession.sharedInstance().setActive(true)
        #endif
    }

    nonisolated func speechSynthesizer(_ synthesizer: AVSpeechSynthesizer, didStart utterance: AVSpeechUtterance) {
        let id = ObjectIdentifier(utterance)
        Task { @MainActor [weak self] in
            guard let self else { return }
            if self.waiting == id { self.waiting = nil }
            if let t = self.tapped {
                self.latency.record(Date().timeIntervalSince(t))
                self.tapped = nil
            }
        }
    }

    func speakTogether(_ lines: [VoiceLine], kind: SoundKind = .tap) {
        guard allows(kind) else { return }
        let voiced = lines.compactMap { l in voice(l.lang).map { (l.text, $0) } }
        guard voiced.count > 1 else {
            if let l = lines.first(where: { voice($0.lang) != nil }) ?? lines.first { speak(l.text, l.lang, kind: kind) }
            return
        }
        activate(kind)
        start(voiced.map { utterance($0.0, $0.1, gap: 0.3) })
    }

    func hush() {
        player?.pause()
        waiting = nil
        if synth.isSpeaking || synth.isPaused { synth.stopSpeaking(at: .immediate) }
    }

    func playClip(_ text: String, _ lang: String) -> Bool {
        guard let store, store.hasClip(lang, text) else { return false }
        activate()
        hush()
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
    @ObservationIgnored private var stopEarly = false
    @ObservationIgnored private var resumeAudio = false
    private(set) var live = ""
    var active: Bool { current != nil }

    func canHear(_ lang: String) -> Bool {
        supported && SFSpeechRecognizer(locale: Locale(identifier: Lang.info[lang]?.bcp47 ?? lang))?.isAvailable == true
    }

    var supported: Bool {
        #if os(iOS) || os(macOS)
        SFSpeechRecognizer.authorizationStatus() != .denied && SFSpeechRecognizer.authorizationStatus() != .restricted
        #else
        false
        #endif
    }

    var denied: Bool {
        #if os(iOS)
        if AVAudioApplication.shared.recordPermission == .denied { return true }
        #endif
        #if os(iOS) || os(macOS)
        return !supported
        #else
        return false
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

    nonisolated private static func tap(_ input: AVAudioInputNode, format: AVAudioFormat, into request: SFSpeechAudioBufferRecognitionRequest) {
        input.installTap(onBus: 0, bufferSize: 1024, format: format) { buf, _ in request.append(buf) }
    }

    nonisolated static func canTap(sampleRate: Double, channels: UInt32) -> Bool {
        sampleRate > 0 && channels > 0
    }

    private func restorePlayback() {
        if AppAudio.shared.active {
            AppAudio.shared.hold()
            if resumeAudio { AppAudio.shared.resume() }
            resumeAudio = false
            return
        }
        #if os(iOS)
        try? AVAudioSession.sharedInstance().setCategory(.playback, mode: .spokenAudio, options: [.mixWithOthers])
        #endif
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
        guard let run = current else {
            stopEarly = true
            return
        }
        run.request.endAudio()
        run.task?.finish()
        run.finish(run.heard.alts)
    }

    func listenOnce(_ lang: String, limit: TimeInterval = LangListener.maxListen) async -> [String] {
        stopEarly = false
        guard await authorize(), !stopEarly, let rec = SFSpeechRecognizer(locale: Locale(identifier: Lang.info[lang]?.bcp47 ?? lang)), rec.isAvailable else { return [] }
        let request = SFSpeechAudioBufferRecognitionRequest()
        request.shouldReportPartialResults = true
        request.requiresOnDeviceRecognition = rec.supportsOnDeviceRecognition
        resumeAudio = AppAudio.shared.active && !AppAudio.shared.paused
        AppAudio.shared.pause()
        #if os(iOS)
        try? AVAudioSession.sharedInstance().setCategory(.playAndRecord, mode: .measurement, options: [.duckOthers, .defaultToSpeaker])
        try? AVAudioSession.sharedInstance().setActive(true, options: .notifyOthersOnDeactivation)
        #endif
        let input = engine.inputNode
        input.removeTap(onBus: 0)
        let format = input.outputFormat(forBus: 0)
        guard Self.canTap(sampleRate: format.sampleRate, channels: format.channelCount) else {
            restorePlayback()
            return []
        }
        Self.tap(input, format: format, into: request)
        engine.prepare()
        guard (try? engine.start()) != nil else {
            input.removeTap(onBus: 0)
            restorePlayback()
            return []
        }
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
        if current === run { current = nil }
        live = result.first ?? live
        engine.stop()
        input.removeTap(onBus: 0)
        restorePlayback()
        return result
    }
}

struct PlayButton: View {
    let text: String
    let lang: String
    var label: String?
    var roomy = false

    var body: some View {
        if LangVoice.shared.canSpeak(text, lang) {
            Button {
                LangVoice.shared.speak(text, lang)
            } label: {
                Image(systemName: "speaker.wave.2.fill")
                    .frame(minWidth: roomy ? FitScale.naturalTarget : nil, minHeight: roomy ? FitScale.naturalTarget : nil)
                    .contentShape(.rect)
            }
            .buttonStyle(.borderless)
            .padding(.vertical, roomy ? -9 : 0)
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
