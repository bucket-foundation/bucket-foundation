package foundation.bucket.core.rust

import foundation.bucket.core.engine.CardState
import foundation.bucket.core.engine.CoreKernel
import foundation.bucket.core.engine.DeckKernel
import foundation.bucket.core.engine.GameDeck
import foundation.bucket.core.engine.GamePrompt
import foundation.bucket.core.engine.GameWord
import foundation.bucket.core.engine.GroupLink
import foundation.bucket.core.engine.KernelProvider
import foundation.bucket.core.engine.KotlinKernel
import foundation.bucket.core.engine.MiniEntry
import foundation.bucket.core.engine.MiniPuzzle
import foundation.bucket.core.engine.PromptMode
import foundation.bucket.core.engine.SeededRandom
import foundation.bucket.core.engine.WordGroup
import foundation.bucket.core.engine.WordGroupsPuzzle
import foundation.bucket.core.model.Lang
import uniffi.polingual_core.Deck as RDeck
import uniffi.polingual_core.CardState as RCard
import uniffi.polingual_core.DeckEntry as REntry
import uniffi.polingual_core.FlagWord as RFlagWord
import uniffi.polingual_core.GamePrompt as RPrompt
import uniffi.polingual_core.GameWord as RWord
import uniffi.polingual_core.GroupLink as RLink
import uniffi.polingual_core.GroupWord as RGroupWord
import uniffi.polingual_core.LangPool as RPool
import uniffi.polingual_core.PromptMode as RMode
import uniffi.polingual_core.balanced as rBalanced
import uniffi.polingual_core.coreVersion
import uniffi.polingual_core.distractors as rDistractors
import uniffi.polingual_core.flagsRound
import uniffi.polingual_core.grade as rGrade
import uniffi.polingual_core.miniDaily
import uniffi.polingual_core.streakCount
import uniffi.polingual_core.wordGroupsDaily

object RustKernel : CoreKernel {
    override val name = "rust"

    @Volatile
    var failures = 0
        private set

    private inline fun <T> guarded(fallback: () -> T, block: () -> T): T = try {
        block()
    } catch (t: Throwable) {
        failures += 1
        fallback()
    }

    private fun RCard.engine() = CardState(reps, lapses, intervalDays, due, last)
    private fun CardState.ffi() = RCard(reps, lapses, intervalDays, due, last)
    private fun GameWord.ffi() = RWord(itemId, lang, form, gloss, root, rank)
    private fun RWord.engine() = GameWord(itemId, lang, form, gloss, root, rank)
    private fun PromptMode.ffi() = when (this) { PromptMode.Form -> RMode.FORM; PromptMode.Flag -> RMode.FLAG; PromptMode.Voice -> RMode.VOICE }
    private fun RMode.engine() = when (this) { RMode.FORM -> PromptMode.Form; RMode.FLAG -> PromptMode.Flag; RMode.VOICE -> PromptMode.Voice }
    private fun RPrompt.engine() = GamePrompt(id, mode.engine(), word.engine(), choices, answer, group)
    private fun RLink.engine(): GroupLink = when (this) {
        is RLink.Language -> GroupLink.Language(lang)
        is RLink.Theme -> GroupLink.Theme(theme)
        is RLink.LanguageTheme -> GroupLink.LanguageTheme(lang, theme)
    }

    override fun grade(state: CardState, correct: Boolean, now: Long) = guarded({ KotlinKernel.grade(state, correct, now) }) { rGrade(state.ffi(), correct, now).engine() }

    override fun streak(days: List<String>, today: String?) = guarded({ KotlinKernel.streak(days, today) }) { streakCount(days, today) }

    override fun balanced(words: List<GameWord>) = guarded({ KotlinKernel.balanced(words) }) { rBalanced(words.map { it.ffi() }).map { it.engine() } }

    override fun deck(deck: GameDeck): DeckKernel = guarded({ KotlinKernel.deck(deck) }) {
        RustDeck(
            RDeck(deck.root, deck.targets, deck.targets.distinct().map { l -> RPool(l, deck.pool(l).map { REntry(it.itemId, it.form, it.gloss, it.category) }) }),
            KotlinKernel.deck(deck),
        )
    }

    private class RustDeck(private val deck: RDeck, private val kotlin: DeckKernel) : DeckKernel {
        override fun foils(word: GameWord, also: List<String>, count: Int, rng: SeededRandom): List<String> {
            val r = guarded({ return kotlin.foils(word, also, count, rng) }) { deck.foils(word.ffi(), also, count.toUInt(), rng.state) }
            rng.state = r.rng
            return r.values
        }

        override fun daily(count: Int, rng: SeededRandom): List<GameWord> {
            val r = guarded({ return kotlin.daily(count, rng) }) { deck.dailyWords(count.toUInt(), rng.state) }
            rng.state = r.rng
            return r.values.map { it.engine() }
        }

        override fun dailyRound(day: String) = guarded({ kotlin.dailyRound(day) }) { deck.dailyRound(day).map { it.engine() } }

        override fun sameWord(words: List<GameWord>, rng: SeededRandom): List<GamePrompt> {
            val r = guarded({ return kotlin.sameWord(words, rng) }) { deck.sameWordRound(words.map { it.ffi() }, rng.state) }
            rng.state = r.rng
            return r.values.map { it.engine() }
        }
    }

    override fun distractors(lang: String, own: List<String>, excluding: Set<String>, count: Int, rng: SeededRandom): List<String> {
        val r = guarded({ return KotlinKernel.distractors(lang, own, excluding, count, rng) }) { rDistractors(lang, own, excluding.toList(), count.toUInt(), rng.state) }
        rng.state = r.rng
        return r.values
    }

    override fun flags(words: List<GameWord>, own: List<String>, mode: PromptMode, count: Int, sameForm: (GameWord, String) -> Boolean, rng: SeededRandom): List<GamePrompt> {
        val input = words.map { w -> RFlagWord(w.ffi(), Lang.codes.filter { sameForm(w, it) }) }
        val r = guarded({ return KotlinKernel.flags(words, own, mode, count, sameForm, rng) }) { flagsRound(input, own, mode.ffi(), count.toUInt(), rng.state) }
        rng.state = r.rng
        return r.values.map { it.engine() }
    }

    override fun wordGroups(words: List<GameWord>, day: String, root: String, targets: List<String>, theme: (GameWord) -> String?, sameForm: (GameWord, String) -> Boolean): WordGroupsPuzzle? {
        val input = words.map { w -> RGroupWord(w.ffi(), theme(w), targets.filter { it != w.lang && sameForm(w, it) }) }
        val p = guarded({ return KotlinKernel.wordGroups(words, day, root, targets, theme, sameForm) }) { wordGroupsDaily(input, day, root, targets) } ?: return null
        return WordGroupsPuzzle(p.groups.map { g -> WordGroup(g.link.engine(), g.words.map { it.engine() }) }, p.tiles.map { it.engine() })
    }

    override fun mini(words: List<GameWord>, day: String, root: String, targets: List<String>): MiniPuzzle? {
        val p = guarded({ return KotlinKernel.mini(words, day, root, targets) }) { miniDaily(words.map { it.ffi() }, day, root, targets) } ?: return null
        return MiniPuzzle(p.lang, p.entries.map { MiniEntry(it.word.engine(), it.letters, it.row, it.col, it.across, it.number) }, p.keys)
    }

    fun load(): RustKernel? = runCatching { coreVersion(); this }.getOrNull()
}

class RustKernelProvider : KernelProvider {
    override fun kernel(): CoreKernel? = if (BuildConfig.RUST_CORE) RustKernel.load() else null
}
