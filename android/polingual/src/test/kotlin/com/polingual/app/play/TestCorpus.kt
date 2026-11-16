package com.polingual.app.play

import foundation.bucket.core.engine.CorpusLoader
import foundation.bucket.core.engine.LangCorpus
import java.io.File

object TestCorpus {
    val repo: File = generateSequence(File("").absoluteFile) { it.parentFile }.first { File(it, "apple/Shared/Corpus/lang-core.json").exists() }
    val corpus: LangCorpus by lazy {
        fun f(n: String) = File(repo, "apple/Shared/Corpus/lang-$n.json").takeIf { it.exists() }?.readText()
        CorpusLoader.parse(f("core"), f("cognates"), f("phrases"), f("layers"))
    }
}
