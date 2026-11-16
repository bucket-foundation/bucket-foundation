import Testing
@testable import BucketKit

@Suite struct ReadLangsTests {
    @Test func homeLanguageSitsBesideTheFirstTarget() {
        #expect(ContentCatalog.readLangs(["de", "nl", "sv"], roots: ["en"]) == ["de", "en", "nl", "sv"])
    }

    @Test func oneFilteredLanguageGetsTheHomeColumn() {
        #expect(ContentCatalog.readLangs(["fr"], roots: ["en"]) == ["fr", "en"])
    }

    @Test func homeLanguageAlreadyATargetIsNotRepeated() {
        #expect(ContentCatalog.readLangs(["en", "es"], roots: ["en"]) == ["en", "es"])
    }

    @Test func noSystemsFallsBackToEnglish() {
        #expect(ContentCatalog.readLangs(["es", "fr"], roots: []) == ["es", "en", "fr"])
    }

    @Test func everyRootAppearsOnce() {
        #expect(ContentCatalog.readLangs(["de", "it"], roots: ["en", "es"]) == ["de", "en", "es", "it"])
    }
}
