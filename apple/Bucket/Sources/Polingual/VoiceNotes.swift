import AVFoundation
import BucketKit
import Speech
import SwiftUI

@MainActor
@Observable
final class VoiceNoteRecorder {
    enum Phase: Equatable { case idle, recording, sending }

    private(set) var phase: Phase = .idle
    private(set) var elapsed: TimeInterval = 0
    @ObservationIgnored private var recorder: AVAudioRecorder?
    @ObservationIgnored private var ticker: Task<Void, Never>?
    @ObservationIgnored private var file: URL?

    static let minSeconds: TimeInterval = 0.6
    static let settings: [String: Any] = [
        AVFormatIDKey: kAudioFormatMPEG4AAC,
        AVSampleRateKey: 22_050,
        AVNumberOfChannelsKey: 1,
        AVEncoderBitRateKey: 32_000,
        AVEncoderAudioQualityKey: AVAudioQuality.medium.rawValue,
    ]

    var remaining: TimeInterval { max(0, VoiceNote.maxSeconds - elapsed) }

    func start() async -> Bool {
        guard phase == .idle, await LangListener.shared.authorize() else { return false }
        guard phase == .idle else { return false }
        if AppAudio.shared.active { AppAudio.shared.pause() }
        #if os(iOS)
        let session = AVAudioSession.sharedInstance()
        try? session.setCategory(.playAndRecord, mode: .default, options: [.defaultToSpeaker, .allowBluetoothHFP])
        try? session.setActive(true)
        #endif
        let url = FileManager.default.temporaryDirectory.appending(path: "voice-\(UUID().uuidString).m4a")
        guard let r = try? AVAudioRecorder(url: url, settings: Self.settings), r.record(forDuration: VoiceNote.maxSeconds) else { return false }
        recorder = r
        file = url
        elapsed = 0
        phase = .recording
        ticker = Task { [weak self] in
            while !Task.isCancelled {
                try? await Task.sleep(for: .milliseconds(200))
                guard let self, let r = self.recorder else { return }
                if r.isRecording { self.elapsed = r.currentTime } else {
                    self.elapsed = VoiceNote.maxSeconds
                    return
                }
            }
        }
        return true
    }

    func stop() -> (URL, TimeInterval)? {
        guard phase == .recording, let r = recorder, let url = file else { return nil }
        let seconds = min(max(r.currentTime, elapsed), VoiceNote.maxSeconds)
        r.stop()
        ticker?.cancel()
        recorder = nil
        file = nil
        phase = .idle
        #if os(iOS)
        try? AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation)
        #endif
        guard seconds >= Self.minSeconds else {
            try? FileManager.default.removeItem(at: url)
            return nil
        }
        return (url, seconds)
    }

    func send(_ url: URL, seconds: TimeInterval, lang: String, groupId: String, store: GroupStore) async throws(BucketError) {
        phase = .sending
        defer {
            phase = .idle
            try? FileManager.default.removeItem(at: url)
        }
        guard let audio = try? Data(contentsOf: url) else { throw .server(0, nil) }
        if audio.count > VoiceNote.maxBytes { throw .voiceTooLong }
        let transcript = await Self.transcribe(url, lang: lang)
        try await store.sendVoice(VoiceNote(audio: audio, duration: seconds, lang: lang, transcript: transcript), to: groupId)
    }

    nonisolated static func transcribe(_ url: URL, lang: String) async -> String? {
        guard let rec = SFSpeechRecognizer(locale: Locale(identifier: Lang.info[lang]?.bcp47 ?? lang)), rec.isAvailable else { return nil }
        let request = SFSpeechURLRecognitionRequest(url: url)
        request.requiresOnDeviceRecognition = rec.supportsOnDeviceRecognition
        request.shouldReportPartialResults = false
        let box = TranscriptBox()
        return await withTaskCancellationHandler {
            await withCheckedContinuation { (c: CheckedContinuation<String?, Never>) in
                box.task = rec.recognitionTask(with: request) { result, error in
                    if let result, result.isFinal {
                        box.finish(c, result.bestTranscription.formattedString)
                    } else if error != nil {
                        box.finish(c, nil)
                    }
                }
            }
        } onCancel: {
            box.task?.cancel()
        }
    }
}

private final class TranscriptBox: @unchecked Sendable {
    private let lock = NSLock()
    private var done = false
    var task: SFSpeechRecognitionTask?

    func finish(_ c: CheckedContinuation<String?, Never>, _ text: String?) {
        lock.lock()
        defer { lock.unlock() }
        guard !done else { return }
        done = true
        let t = text?.trimmingCharacters(in: .whitespacesAndNewlines)
        c.resume(returning: t?.isEmpty == false ? t : nil)
    }
}

@MainActor
@Observable
final class VoiceNotePlayer: NSObject, AVAudioPlayerDelegate {
    static let shared = VoiceNotePlayer()

    private(set) var playing: String?
    private(set) var loading: String?
    @ObservationIgnored private var player: AVAudioPlayer?
    @ObservationIgnored private var cache: [String: Data] = [:]

    func toggle(_ item: SharedItem) {
        if playing == item.id {
            stop()
            return
        }
        stop()
        guard let url = item.audio else { return }
        loading = item.id
        Task {
            defer { if loading == item.id { loading = nil } }
            let data: Data
            if let hit = cache[item.id] {
                data = hit
            } else {
                guard let (d, r) = try? await URLSession.shared.data(from: url), (r as? HTTPURLResponse)?.statusCode == 200 else { return }
                data = d
                cache[item.id] = d
            }
            guard loading == item.id else { return }
            if AppAudio.shared.active { AppAudio.shared.pause() }
            #if os(iOS)
            try? AVAudioSession.sharedInstance().setCategory(.playback, mode: .spokenAudio)
            try? AVAudioSession.sharedInstance().setActive(true)
            #endif
            guard let p = try? AVAudioPlayer(data: data) else { return }
            p.delegate = self
            player = p
            if p.play() { playing = item.id }
        }
    }

    func stop() {
        player?.stop()
        player = nil
        playing = nil
        loading = nil
    }

    nonisolated func audioPlayerDidFinishPlaying(_ player: AVAudioPlayer, successfully flag: Bool) {
        Task { @MainActor in
            self.player = nil
            self.playing = nil
        }
    }
}

enum VoiceLangs {
    static let spoken: Set<String> = ["ar", "cs", "de", "el", "en", "es", "fa", "fi", "fr", "he", "hi", "id", "it", "ja", "ko", "nl", "pl", "pt", "ru", "sv", "ta", "th", "tr", "vi", "zh"]

    static func choices(_ group: LearningGroup, app: String) -> [String] {
        var out: [String] = []
        for code in (group.me?.languages.map(\.lang) ?? []) + [app] where spoken.contains(code) && !out.contains(code) {
            out.append(code)
        }
        return out.isEmpty ? ["en"] : out
    }

    static func name(_ code: String) -> String {
        Locale.current.localizedString(forLanguageCode: code)?.capitalized(with: .current) ?? Lang.info[code]?.name ?? code
    }
}

struct VoiceNoteComposer: View {
    let group: LearningGroup
    @Environment(GroupStore.self) private var groups
    @State private var recorder = VoiceNoteRecorder()
    @State private var lang: String?
    @State private var pressing = false
    @State private var failure: String?

    var choices: [String] { VoiceLangs.choices(group, app: groups.viewerLang) }
    var speaking: String { lang.flatMap { choices.contains($0) ? $0 : nil } ?? choices[0] }

    var body: some View {
        HStack(spacing: 12) {
            mic
            VStack(alignment: .leading, spacing: 2) {
                switch recorder.phase {
                case .recording:
                    Text("Recording… release to send").font(.callout.weight(.semibold))
                    Text("\(Int(recorder.remaining.rounded(.up))) s left").font(.caption.monospacedDigit()).foregroundStyle(Palette.muted)
                case .sending:
                    Text("Sending voice note…").font(.callout)
                case .idle:
                    Text("Hold to record a voice note").font(.callout)
                    Text("Up to 60 seconds").font(.caption).foregroundStyle(Palette.muted)
                }
            }
            Spacer(minLength: 8)
            Menu {
                Picker("Language you speak", selection: Binding(get: { speaking }, set: { lang = $0 })) {
                    ForEach(choices, id: \.self) { Text(VoiceLangs.name($0)).tag($0) }
                }
            } label: {
                Text(VoiceLangs.name(speaking)).font(.caption.weight(.semibold))
            }
            .disabled(recorder.phase != .idle)
            .accessibilityLabel(Text("Language you speak"))
        }
        .padding(.vertical, 4)
        .alert("That did not work", isPresented: Binding(get: { failure != nil }, set: { if !$0 { failure = nil } }), presenting: failure) { _ in
            Button("OK", role: .cancel) {}
        } message: { Text($0) }
    }

    var mic: some View {
        Image(systemName: recorder.phase == .recording ? "mic.fill" : "mic")
            .font(.title2)
            .foregroundStyle(recorder.phase == .recording ? Color.white : D8.vermilion)
            .frame(width: 48, height: 48)
            .background(Circle().fill(recorder.phase == .recording ? D8.vermilion : Palette.card))
            .scaleEffect(recorder.phase == .recording ? 1.12 : 1)
            .animation(.snappy, value: recorder.phase)
            .opacity(recorder.phase == .sending ? 0.4 : 1)
            .gesture(
                DragGesture(minimumDistance: 0)
                    .onChanged { _ in
                        guard !pressing, recorder.phase == .idle else { return }
                        pressing = true
                        Task {
                            let started = await recorder.start()
                            if !started {
                                pressing = false
                                failure = String(localized: "Allow the microphone and speech recognition in Settings to record a voice note.")
                            } else if !pressing {
                                finish()
                            }
                        }
                    }
                    .onEnded { _ in
                        pressing = false
                        finish()
                    }
            )
            .accessibilityLabel(Text("Hold to record a voice note"))
            .accessibilityAddTraits(.isButton)
            .onChange(of: recorder.remaining) { _, left in
                if left <= 0 { finish() }
            }
    }

    func finish() {
        guard let (url, seconds) = recorder.stop() else { return }
        let code = speaking
        Task {
            do { try await recorder.send(url, seconds: seconds, lang: code, groupId: group.id, store: groups) } catch { failure = shareMessage(asBucket(error)) }
        }
    }
}

struct VoiceNoteBody: View {
    let item: SharedItem
    @Environment(GroupStore.self) private var groups
    @State private var player = VoiceNotePlayer.shared
    @State private var translating = false
    @State private var failed = false

    var foreign: Bool { item.lang != nil && item.lang != groups.viewerLang }

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Button { player.toggle(item) } label: {
                HStack(spacing: 8) {
                    Image(systemName: player.playing == item.id ? "stop.circle.fill" : "play.circle.fill").font(.title2)
                    Text(Duration.seconds(item.duration.rounded(.up)).formatted(.time(pattern: .minuteSecond))).font(.callout.monospacedDigit())
                    if player.loading == item.id { ProgressView().controlSize(.small) }
                }
            }
            .buttonStyle(.borderless)
            .accessibilityLabel(Text(player.playing == item.id ? "Stop voice note" : "Play voice note"))
            if let text = item.text {
                Text(text).font(.callout)
                if foreign {
                    if let translation = item.translation {
                        Label { Text(translation).font(.callout) } icon: { Image(systemName: "character.bubble") }
                            .foregroundStyle(Palette.muted)
                    } else {
                        Button {
                            translating = true
                            Task {
                                do { try await groups.translate(item) } catch { failed = true }
                                translating = false
                            }
                        } label: {
                            Label(translating ? String(localized: "Translating…") : String(localized: "Translate"), systemImage: "character.bubble").font(.caption.weight(.semibold))
                        }
                        .buttonStyle(.borderless)
                        .disabled(translating)
                        if failed { Text("Translation is unavailable right now.").font(.caption).foregroundStyle(Palette.muted) }
                    }
                }
            } else {
                Text("No transcript").font(.caption).foregroundStyle(Palette.muted)
            }
        }
    }
}
