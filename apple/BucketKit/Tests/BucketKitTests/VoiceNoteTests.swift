import Foundation
import Testing
@testable import BucketKit

func anyBody(_ r: URLRequest) -> [String: Any] {
    guard let b = r.httpBody, let o = try? JSONSerialization.jsonObject(with: b) as? [String: Any] else { return [:] }
    return o
}

@Suite struct VoiceNoteTests {
    nonisolated(unsafe) static let item: [String: Any] = ["id": "v1", "groupId": "g1", "from": "me", "fromName": "Gia", "kind": "voice", "text": "ciao a tutti", "audioUrl": "https://signed/v1.m4a", "durationMs": 4200, "lang": "it", "at": "2026-11-12T10:00:00Z", "mine": true]

    @Test func noteClampsDurationAndNormalizesLanguage() {
        let n = VoiceNote(audio: Data([1, 2]), duration: 75, lang: "pt-BR", transcript: "  oi  ")
        #expect(n.durationMs == 60_000)
        #expect(n.lang == "pt")
        #expect(n.transcript == "oi")
        #expect(VoiceNote(audio: Data(), duration: 0, lang: "zh-Hans", transcript: " ").durationMs == 1)
        #expect(VoiceNote(audio: Data(), duration: 1, lang: "zh-Hans", transcript: " ").transcript == nil)
        #expect(VoiceNote.code("zh_Hans") == "zh")
    }

    @Test func voiceItemsDecode() throws {
        let item = try JSONDecoder().decode(SharedItem.self, from: json(Self.item))
        #expect(item.kind == .voice)
        #expect(item.duration == 4.2)
        #expect(item.audio?.lastPathComponent == "v1.m4a")
        #expect(item.lang == "it" && item.translation == nil)
    }

    @Test func sendAndTranslateUseTheContract() async throws {
        let seen = LockedBox<[URLRequest]>([])
        let api = BucketAPI(transport: StubTransport { r in
            seen.mutate { $0.append(r) }
            switch r.url!.path {
            case "/api/academy/groups/voice": return (200, json(["item": Self.item]))
            case "/api/academy/groups/voice/translate": return (200, json(["itemId": "v1", "lang": "fr", "text": "salut tout le monde"]))
            default: return (200, json(["items": [Self.item]]))
            }
        }, cacheDir: nil)
        let note = VoiceNote(audio: Data([0, 0, 0, 0x20]), duration: 4.2, lang: "it-IT", transcript: "ciao a tutti")
        let sent = try await api.sendVoiceNote(token: "t", groupId: "g1", note: note)
        #expect(sent.kind == .voice)
        let text = try await api.translateVoice(token: "t", itemId: "v1", lang: "fr")
        #expect(text == "salut tout le monde")
        _ = try await api.sharedItems(token: "t", groupId: "g1", lang: "fr")
        let r = seen.value
        let sendBody = anyBody(r[0])
        #expect(sendBody["groupId"] as? String == "g1")
        #expect(sendBody["audio"] as? String == "AAAAIA==")
        #expect(sendBody["durationMs"] as? Int == 4200)
        #expect(sendBody["lang"] as? String == "it")
        #expect(sendBody["transcript"] as? String == "ciao a tutti")
        #expect(body(r[1]) == ["itemId": "v1", "lang": "fr"])
        #expect(r[2].url!.query() == "groupId=g1&lang=fr&voice=1")
    }

    @Test func oversizedAudioNeverLeavesTheDevice() async {
        let api = BucketAPI(transport: StubTransport { _ in Issue.record("no request expected"); return (200, Data()) }, cacheDir: nil)
        let big = VoiceNote(audio: Data(count: VoiceNote.maxBytes + 1), duration: 10, lang: "en", transcript: nil)
        await #expect(throws: BucketError.voiceTooLong) { try await api.sendVoiceNote(token: "t", groupId: "g1", note: big) }
    }

    @Test func voiceErrorsMapToMessages() async {
        func failure(_ status: Int, _ error: String) async -> BucketError? {
            let api = BucketAPI(transport: StubTransport { _ in (status, json(["error": error])) }, cacheDir: nil)
            do {
                _ = try await api.sendVoiceNote(token: "t", groupId: "g1", note: VoiceNote(audio: Data([1]), duration: 1, lang: "en", transcript: nil))
                return nil
            } catch { return error as? BucketError }
        }
        #expect(await failure(413, "too_long") == .voiceTooLong)
        #expect(await failure(413, "audio_too_large") == .voiceTooLong)
        #expect(await failure(413, "image_too_large") == .imageTooLarge)
        #expect(await failure(503, "translate_unavailable") == .translateUnavailable)
        #expect(await failure(429, "share_limit") == .shareLimit)
    }
}

@Suite @MainActor struct VoiceStoreTests {
    @Test func sendingInsertsAndTranslatingFillsTheItem() async throws {
        let s = GroupStore(api: BucketAPI(transport: StubTransport { r in
            switch r.url!.path {
            case "/api/academy/groups/voice/translate": (200, json(["text": "salut tout le monde"]))
            default: (200, json(["item": VoiceNoteTests.item]))
            }
        }, cacheDir: nil), token: { "t" })
        s.viewerLang = "fr"
        let item = try await s.sendVoice(VoiceNote(audio: Data([1]), duration: 4.2, lang: "it", transcript: "ciao a tutti"), to: "g1")
        #expect(s.items["g1"]?.map(\.id) == ["v1"])
        try await s.translate(item)
        #expect(s.items["g1"]?.first?.translation == "salut tout le monde")
    }

    @Test func translateSkipsNotesWithoutTranscript() async throws {
        let s = GroupStore(api: BucketAPI(transport: StubTransport { _ in Issue.record("no request expected"); return (500, Data()) }, cacheDir: nil), token: { "t" })
        var silent = try JSONDecoder().decode(SharedItem.self, from: json(VoiceNoteTests.item))
        silent.text = nil
        try await s.translate(silent)
    }
}
