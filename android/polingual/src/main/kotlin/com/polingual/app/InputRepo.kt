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
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.jsonPrimitive
import java.io.File

object InputManifest {
    private val FILE = Regex("^[a-z]{2,3}\\.[0-9a-f]{8,64}\\.json$")

    fun files(manifest: String): Set<String> = runCatching {
        ((Json.parseToJsonElement(manifest) as JsonObject)["langs"] as JsonObject).values.mapNotNull { ((it as? JsonObject)?.get("file"))?.jsonPrimitive?.content?.takeIf { f -> FILE.matches(f) } }.toSet()
    }.getOrDefault(emptySet())

    fun file(manifest: String, lang: String): String? = runCatching {
        (((Json.parseToJsonElement(manifest) as JsonObject)["langs"] as JsonObject)[lang] as JsonObject)["file"]!!.jsonPrimitive.content
    }.getOrNull()?.takeIf { FILE.matches(it) }
}

class InputRepo(private val cacheDir: File, private val base: String, private val fetch: suspend (String) -> String?) {
    constructor(cacheDir: File, base: String, http: HttpClient) : this(cacheDir, base, { url ->
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

    suspend fun bundle(lang: String): InputBundle? = withContext(Dispatchers.IO) {
        val fresh = fetch("$base/manifest.json")?.takeIf { InputManifest.files(it).isNotEmpty() }
        if (fresh != null && fresh != cached("manifest.json")) {
            store("manifest.json", fresh)
            prune(fresh)
        }
        val manifest = fresh ?: cached("manifest.json") ?: return@withContext null
        val file = InputManifest.file(manifest, lang) ?: return@withContext null
        val text = cached(file) ?: fetch("$base/$file")?.takeIf { InputStage.parseBundle(it) != null }?.also { store(file, it) } ?: return@withContext null
        InputStage.parseBundle(text)
    }
}
