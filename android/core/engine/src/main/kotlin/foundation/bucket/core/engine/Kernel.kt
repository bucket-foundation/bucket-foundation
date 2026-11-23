package foundation.bucket.core.engine

import java.util.ServiceLoader

interface DeckKernel {
    fun foils(word: GameWord, also: List<String>, count: Int, rng: SeededRandom): List<String>
    fun daily(count: Int, rng: SeededRandom): List<GameWord>
    fun dailyRound(day: String): List<GamePrompt>
    fun sameWord(words: List<GameWord>, rng: SeededRandom): List<GamePrompt>
}

interface CoreKernel {
    val name: String
    fun grade(state: CardState, correct: Boolean, now: Long): CardState
    fun streak(days: List<String>, today: String?): Int
    fun balanced(words: List<GameWord>): List<GameWord>
    fun deck(deck: GameDeck): DeckKernel
    fun distractors(lang: String, own: List<String>, excluding: Set<String>, count: Int, rng: SeededRandom): List<String>
    fun flags(words: List<GameWord>, own: List<String>, mode: PromptMode, count: Int, sameForm: (GameWord, String) -> Boolean, rng: SeededRandom): List<GamePrompt>
    fun wordGroups(words: List<GameWord>, day: String, root: String, targets: List<String>, theme: (GameWord) -> String?, sameForm: (GameWord, String) -> Boolean): WordGroupsPuzzle?
    fun mini(words: List<GameWord>, day: String, root: String, targets: List<String>): MiniPuzzle?
}

fun interface KernelProvider {
    fun kernel(): CoreKernel?
}

object Kernels {
    const val KOTLIN_FLAG = "polingual.core.kotlin"

    @Volatile
    var override: CoreKernel? = null

    private val discovered: CoreKernel by lazy {
        if (System.getProperty(KOTLIN_FLAG) == "true") return@lazy KotlinKernel
        runCatching { ServiceLoader.load(KernelProvider::class.java, KernelProvider::class.java.classLoader).firstNotNullOfOrNull { it.kernel() } }.getOrNull() ?: KotlinKernel
    }

    val active: CoreKernel get() = override ?: discovered
}
