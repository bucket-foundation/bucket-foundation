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
