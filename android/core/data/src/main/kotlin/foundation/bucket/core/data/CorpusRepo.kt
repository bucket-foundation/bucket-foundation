package foundation.bucket.core.data

import android.content.Context
import foundation.bucket.core.engine.CorpusLoader
import foundation.bucket.core.engine.LangCorpus
import foundation.bucket.core.engine.LexiconShelf
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.coroutines.withContext

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
}
