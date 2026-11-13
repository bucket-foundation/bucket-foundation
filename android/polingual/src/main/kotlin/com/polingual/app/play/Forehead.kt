package com.polingual.app.play

import foundation.bucket.core.engine.ItemKind
import foundation.bucket.core.engine.LangItem
import foundation.bucket.core.engine.Reading

data class ForeheadCard(val lang: String, val form: String, val meaning: String, val reading: Reading?, val itemId: String)

object ForeheadDeck {
    const val CARDS = 60
    const val SECONDS = 60

    fun deck(items: List<LangItem>, langs: List<String>, seed: String, root: String = "en", size: Int = CARDS): List<ForeheadCard> {
        val rand = WebRandom(seed)
        val pool = items.filter { i -> i.kind == ItemKind.Word && i.form(root) != null && langs.any { l -> i.form(l) != null && i.form(l) != i.form(root) } }
        val order = rand.shuffled(pool)
        val out = mutableListOf<ForeheadCard>()
        val used = HashSet<String>()
        for (item in order) {
            if (out.size >= size) break
            val r = item.form(root)!!
            if (r.lowercase() in used) continue
            val options = langs.filter { l -> item.form(l) != null && item.form(l) != r }
            val lang = options.getOrNull(kotlin.math.floor(rand.next() * options.size).toInt()) ?: continue
            if (item.form(lang)!!.length > 24) continue
            used += r.lowercase()
            out += ForeheadCard(lang, item.form(lang)!!, r, item.readings[lang], item.id)
        }
        return out
    }
}
