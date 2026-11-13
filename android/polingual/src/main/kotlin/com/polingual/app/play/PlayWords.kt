package com.polingual.app.play

import android.content.Context
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json

@Serializable
data class PlayForm(val lang: String, val word: String, val ipa: String? = null, val roman: String? = null, val kana: String? = null)

@Serializable
data class RootCluster(val root: String, val langs: List<String>)

@Serializable
data class PlayWord(
    val slug: String,
    val en: String,
    val gloss: String,
    val category: String = "",
    val tier: Double = 0.0,
    val note: String? = null,
    val roots: List<RootCluster> = emptyList(),
    val forms: List<PlayForm>,
) {
    fun form(lang: String): PlayForm? = forms.firstOrNull { it.lang == lang }
    fun root(lang: String): String? = roots.firstOrNull { lang in it.langs }?.root
}

@Serializable
data class HintForm(val word: String, val roman: String? = null)

@Serializable
data class BankWord(val gloss: String, val forms: Map<String, HintForm>)

@Serializable
data class PolywordBank(val targets: List<String>, val reveal: List<String>, val langs: Map<String, List<String>>, val words: Map<String, BankWord>)

object PlayAssets {
    val json = Json { ignoreUnknownKeys = true }
    @Volatile private var words: List<PlayWord>? = null
    @Volatile private var bank: PolywordBank? = null

    fun words(context: Context): List<PlayWord> = words ?: json.decodeFromString<List<PlayWord>>(read(context, "play/words.json")).also { words = it }
    fun bank(context: Context): PolywordBank = bank ?: json.decodeFromString<PolywordBank>(read(context, "play/polyword-bank.json")).also { bank = it }
    private fun read(context: Context, path: String) = context.assets.open(path).bufferedReader().use { it.readText() }
}
