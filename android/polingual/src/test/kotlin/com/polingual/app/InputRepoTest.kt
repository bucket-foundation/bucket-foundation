package com.polingual.app

import kotlinx.coroutines.runBlocking
import java.io.File
import java.nio.file.Files
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNotNull
import kotlin.test.assertNull

class InputRepoTest {
    private val manifest = """{"format":"polingual-input","langs":{"es":{"coverage":{"tokens":1},"file":"es.0123456789ab.json"},"fr":{"file":"../x.json"}}}"""
    private val bundle = """{"format":"polingual-input","lang":"es","items":[{"id":"tatoeba:es:1","tokens":[{"surface":"Hola","lemma":"hola"}],"text":"Hola"}],"units":[]}"""

    @Test
    fun manifestPicksTheHashedFileAndRejectsPaths() {
        assertEquals("es.0123456789ab.json", InputManifest.file(manifest, "es"))
        assertNull(InputManifest.file(manifest, "fr"))
        assertNull(InputManifest.file("not json", "es"))
    }

    @Test
    fun aFetchedBundleIsCachedAndServedOffline() = runBlocking {
        val dir = Files.createTempDirectory("input").toFile()
        var online = true
        var calls = 0
        val repo = InputRepo(dir, "https://example.test/input") { url ->
            calls += 1
            if (!online) null else if (url.endsWith("manifest.json")) manifest else if (url.endsWith("es.0123456789ab.json")) bundle else null
        }
        assertEquals("es", assertNotNull(repo.bundle("es")).lang)
        online = false
        assertEquals("es", assertNotNull(repo.bundle("es")).lang)
        assertNull(repo.bundle("de"))
        assertEquals(true, File(dir, "es.0123456789ab.json").isFile)
        dir.deleteRecursively()
        Unit
    }

    @Test
    fun aBrokenBundleIsNeitherCachedNorServed() = runBlocking {
        val dir = Files.createTempDirectory("input").toFile()
        val repo = InputRepo(dir, "https://example.test/input") { url -> if (url.endsWith("manifest.json")) manifest else "{broken" }
        assertNull(repo.bundle("es"))
        assertEquals(false, File(dir, "es.0123456789ab.json").exists())
        dir.deleteRecursively()
        Unit
    }

    private val graded = """{"format":"polingual-input","bandBase":null,"langs":{"es":{"file":"es.0123456789ab.json","graded":{"files":{"500":[{"file":"es.b500.p0.76b9c85a128a.json"},{"file":"../x.json"}],"1000":[{"file":"es.b1000.p0.76b9c85a128b.json"}]}}}}}"""
    private val band = """{"format":"polingual-input-band","lang":"es","band":500,"items":[{"id":"t:2","kind":"sentence","text":"El gato","tok":[[0,2,"el"],[3,4]]}],"units":[{"id":"graded:es:500:gato","kind":"sentence_set","itemIds":["t:2"],"targetLemmas":["gato"]}]}"""

    @Test
    fun gradedBandsAreFetchedCachedAndMerged() = runBlocking {
        val dir = Files.createTempDirectory("input").toFile()
        var online = true
        val seen = mutableListOf<String>()
        val repo = InputRepo(dir, "https://example.test/input", "https://cdn.example.test/bands/") { url ->
            seen += url
            when {
                !online -> null
                url.endsWith("manifest.json") -> graded
                url.endsWith("es.0123456789ab.json") -> bundle
                url == "https://cdn.example.test/bands/es.b500.p0.76b9c85a128a.json" -> band
                else -> null
            }
        }
        val b = assertNotNull(repo.bundle("es", listOf(500, 1000)))
        assertEquals(listOf("graded:es:500:gato"), b.units.map { it.id })
        assertEquals(listOf("el", "gato"), b.byId.getValue("t:2").tokens.map { it.lemma })
        assertEquals(false, seen.any { it.contains("x.json") })
        assertEquals(true, File(dir, "es.b500.p0.76b9c85a128a.json").isFile)
        assertEquals(false, File(dir, "es.b1000.p0.76b9c85a128b.json").exists())
        online = false
        assertEquals(1, assertNotNull(repo.bundle("es", listOf(500))).units.size)
        assertEquals(0, assertNotNull(repo.bundle("es")).units.size)
        repo.prune(graded)
        assertEquals(true, File(dir, "es.b500.p0.76b9c85a128a.json").isFile)
        dir.deleteRecursively()
        Unit
    }

    @Test
    fun bandsLoadOnlyFromAnHttpsConfigBaseOrLoopbackInDebug() = runBlocking {
        val withManifestBase = graded.replace("\"bandBase\":null", "\"bandBase\":\"https://cdn.example.test/bands\"")
        val cases = listOf(
            Triple(null, false, 0), Triple("http://127.0.0.1:9000", false, 0), Triple("http://cdn.example.test", true, 0),
            Triple("ftp://cdn.example.test", true, 0), Triple("http://127.0.0.1:9000", true, 1), Triple("https://cdn.example.test/bands", false, 1),
        )
        for ((base, debug, units) in cases) {
            val dir = Files.createTempDirectory("input").toFile()
            val repo = InputRepo(dir, "https://example.test/input", base, debug) { url -> if (url.endsWith("manifest.json")) withManifestBase else if (url.endsWith("es.0123456789ab.json")) bundle else band }
            assertEquals(units, assertNotNull(repo.bundle("es", listOf(500))).units.size, "$base $debug")
            dir.deleteRecursively()
        }
        assertEquals(listOf("zh-Hans.b500.p0.76b9c85a128a.json"), InputManifest.bandFiles("""{"langs":{"zh-Hans":{"file":"zh-Hans.4e30a68e39ea.json","graded":{"files":{"500":[{"file":"zh-Hans.b500.p0.76b9c85a128a.json"}]}}}}}""", "zh-Hans", listOf(500)))
        Unit
    }

    @Test
    fun aNewManifestPrunesBundlesItNoLongerLists() = runBlocking {
        val dir = Files.createTempDirectory("input").toFile()
        var current = manifest
        val next = manifest.replace("es.0123456789ab.json", "es.fedcba987654.json")
        val repo = InputRepo(dir, "https://example.test/input") { url -> if (url.endsWith("manifest.json")) current else bundle }
        assertNotNull(repo.bundle("es"))
        assertEquals(true, File(dir, "es.0123456789ab.json").isFile)
        current = next
        assertNotNull(repo.bundle("es"))
        assertEquals(false, File(dir, "es.0123456789ab.json").exists())
        assertEquals(true, File(dir, "es.fedcba987654.json").isFile)
        dir.deleteRecursively()
        Unit
    }
}
