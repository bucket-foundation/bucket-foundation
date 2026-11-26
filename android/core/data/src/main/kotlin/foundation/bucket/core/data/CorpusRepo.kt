package foundation.bucket.core.data

import android.content.Context
import foundation.bucket.core.engine.CorpusLoader
import foundation.bucket.core.engine.FrequencyRank
import foundation.bucket.core.engine.InputBundle
import foundation.bucket.core.engine.InputStage
import foundation.bucket.core.engine.LangCorpus
import foundation.bucket.core.engine.LexiconShelf
import kotlinx.coroutines.Dispatchers
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.jsonPrimitive
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.coroutines.withContext

private val FILE = Regex("^[a-z]{2,3}\\.[0-9a-f]{8,64}\\.json$")

class CorpusRepo(private val context: Context) {
    private val lock = Mutex()
    private var corpus: LangCorpus? = null

    val shelf = LexiconShelf { lang -> runCatching { context.assets.open("Corpus/lexicon/$lang.tsv.z").use { it.readBytes() } }.getOrNull() }

    private fun read(name: String): String? = runCatching { context.assets.open("Corpus/$name").bufferedReader().use { it.readText() } }.getOrNull()

    suspend fun load(): LangCorpus = lock.withLock {
        corpus ?: withContext(Dispatchers.IO) {
            CorpusLoader.parse(read("lang-core.json"), read("lang-cognates.json"), read("lang-phrases.json"), read("lang-layers.json"))
        }.also { corpus = it }
    }

    suspend fun input(lang: String): InputBundle? = withContext(Dispatchers.IO) {
        val manifest = read("input/manifest.json") ?: return@withContext null
        val file = runCatching {
            (((Json.parseToJsonElement(manifest) as JsonObject)["langs"] as JsonObject)[lang] as JsonObject)["file"]!!.jsonPrimitive.content
        }.getOrNull()?.takeIf { FILE.matches(it) } ?: return@withContext null
        read("input/$file")?.let { InputStage.parseBundle(it) }
    }

    suspend fun frequency(langs: List<String>): FrequencyRank = withContext(Dispatchers.IO) {
        FrequencyRank.parse(langs.mapNotNull { l -> read("top1000/$l.json")?.let { l to it } }.toMap())
    }
}
