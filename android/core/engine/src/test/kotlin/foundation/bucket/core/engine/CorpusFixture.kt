package foundation.bucket.core.engine

import java.io.File

object CorpusFixture {
    val dir = File(System.getProperty("corpusDir"))
    val corpus: LangCorpus by lazy {
        fun read(name: String) = File(dir, name).takeIf { it.exists() }?.readText()
        CorpusLoader.parse(read("lang-core.json"), read("lang-cognates.json"), read("lang-phrases.json"), read("lang-layers.json"))
    }
    val shelf = LexiconShelf { File(dir, "lexicon/$it.tsv.z").takeIf(File::exists)?.readBytes() }
}
