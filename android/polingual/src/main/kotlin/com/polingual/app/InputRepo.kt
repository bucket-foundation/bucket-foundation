package com.polingual.app

import foundation.bucket.core.engine.InputBundle
import foundation.bucket.core.engine.InputStage
import io.ktor.client.HttpClient
import io.ktor.client.request.get
import io.ktor.client.statement.bodyAsText
import io.ktor.http.isSuccess
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.jsonPrimitive
import java.io.File

object InputManifest {
    private const val TAG = "[a-z]{2,3}(?:-[A-Za-z]{2,8})?"
    private val FILE = Regex("^$TAG\\.[0-9a-f]{8,64}\\.json$")
    private val BAND_FILE = Regex("^$TAG\\.b\\d{1,5}\\.p\\d{1,3}\\.[0-9a-f]{8,64}\\.json$")
    private val LOOPBACK = Regex("^https?://(localhost|127(?:\\.\\d{1,3}){3}|\\[::1]|0\\.0\\.0\\.0)(?::\\d+)?(?:/|$)", RegexOption.IGNORE_CASE)

    private fun langs(manifest: String): JsonObject? = runCatching { (Json.parseToJsonElement(manifest) as JsonObject)["langs"] as? JsonObject }.getOrNull()

    fun files(manifest: String): Set<String> {
        val ls = langs(manifest) ?: return emptySet()
        val bundles = ls.values.mapNotNull { ((it as? JsonObject)?.get("file") as? JsonPrimitive)?.content?.takeIf { f -> FILE.matches(f) } }
        return if (bundles.isEmpty()) emptySet() else (bundles + ls.keys.flatMap { bandFiles(manifest, it, InputStage.BAND_RANKS) }).toSet()
    }

    fun bandFiles(manifest: String, lang: String, bands: List<Int>): List<String> = runCatching {
        val files = ((langs(manifest)?.get(lang) as? JsonObject)?.get("graded") as? JsonObject)?.get("files") as? JsonObject ?: return emptyList()
        bands.flatMap { b -> (files[b.toString()] as? JsonArray).orEmpty().mapNotNull { ((it as? JsonObject)?.get("file") as? JsonPrimitive)?.content?.takeIf { f -> BAND_FILE.matches(f) } } }
    }.getOrDefault(emptyList())

    fun isBand(text: String, lang: String): Boolean = runCatching {
        val o = Json.parseToJsonElement(text) as JsonObject
        (o["format"] as JsonPrimitive).content == "polingual-input-band" && (o["lang"] as JsonPrimitive).content == lang && o["items"] is JsonArray && o["units"] is JsonArray
    }.getOrDefault(false)

    fun bandBase(config: String?, debug: Boolean): String? =
        config?.trim()?.takeIf { it.startsWith("https://") || (debug && LOOPBACK.containsMatchIn(it)) }?.trimEnd('/')

    fun file(manifest: String, lang: String): String? = runCatching {
        (((Json.parseToJsonElement(manifest) as JsonObject)["langs"] as JsonObject)[lang] as JsonObject)["file"]!!.jsonPrimitive.content
    }.getOrNull()?.takeIf { FILE.matches(it) }
}

class InputRepo(private val cacheDir: File, private val base: String, private val bandBase: String? = null, private val debug: Boolean = false, private val fetch: suspend (String) -> String?) {
    constructor(cacheDir: File, base: String, bandBase: String?, debug: Boolean, http: HttpClient) : this(cacheDir, base, bandBase, debug, { url ->
        runCatching { http.get(url).let { if (it.status.isSuccess()) it.bodyAsText() else null } }.getOrNull()
    })

    private fun cached(name: String): String? = File(cacheDir, name).takeIf { it.isFile }?.readText()

    private fun store(name: String, text: String) {
        cacheDir.mkdirs()
        val tmp = File(cacheDir, "$name.tmp")
        tmp.writeText(text)
        tmp.renameTo(File(cacheDir, name))
    }

    fun prune(manifest: String) {
        val keep = InputManifest.files(manifest)
        if (keep.isEmpty()) return
        cacheDir.listFiles()?.filter { it.isFile && it.name != "manifest.json" && it.name !in keep }?.forEach { it.delete() }
    }

    suspend fun bundle(lang: String, bands: List<Int> = emptyList()): InputBundle? = withContext(Dispatchers.IO) {
        val fresh = fetch("$base/manifest.json")?.takeIf { InputManifest.files(it).isNotEmpty() }
        if (fresh != null && fresh != cached("manifest.json")) {
            store("manifest.json", fresh)
            prune(fresh)
        }
        val manifest = fresh ?: cached("manifest.json") ?: return@withContext null
        val file = InputManifest.file(manifest, lang) ?: return@withContext null
        val text = cached(file) ?: fetch("$base/$file")?.takeIf { InputStage.parseBundle(it) != null }?.also { store(file, it) } ?: return@withContext null
        val bundle = InputStage.parseBundle(text) ?: return@withContext null
        val root = InputManifest.bandBase(bandBase, debug) ?: return@withContext bundle
        val parts = InputManifest.bandFiles(manifest, lang, bands).map { f ->
            cached(f) ?: fetch("$root/$f")?.takeIf { InputManifest.isBand(it, lang) }?.also { store(f, it) }
        }
        InputStage.mergeBands(bundle, parts)
    }
}
