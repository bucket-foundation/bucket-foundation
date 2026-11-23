package foundation.bucket.core.engine

import java.text.BreakIterator

object Graphemes {
    private val linkers = setOf(0x094D, 0x09CD, 0x0ACD, 0x0B4D, 0x0C4D, 0x0D4D)
    private val conjunctBlocks = listOf(0x0900..0x097F, 0x0980..0x09FF, 0x0A80..0x0AFF, 0x0B00..0x0B7F, 0x0C00..0x0C7F, 0x0D00..0x0D7F)

    private fun consonant(cp: Int) = Character.isLetter(cp) && conjunctBlocks.any { cp in it }

    private fun extend(cp: Int) = cp == 0x200D || Character.getType(cp).let { it == Character.NON_SPACING_MARK.toInt() || it == Character.ENCLOSING_MARK.toInt() }

    private fun endsInConjunct(cluster: String): Boolean {
        val cps = cluster.codePoints().toArray()
        var i = cps.size - 1
        var linked = false
        while (i >= 0 && (cps[i] in linkers || extend(cps[i]))) {
            if (cps[i] in linkers) linked = true
            i -= 1
        }
        return linked && i >= 0 && consonant(cps[i])
    }

    fun split(text: String): List<String> {
        val it = BreakIterator.getCharacterInstance()
        it.setText(text)
        val out = mutableListOf<String>()
        var start = it.first()
        var end = it.next()
        while (end != BreakIterator.DONE) {
            val piece = text.substring(start, end)
            if (out.isNotEmpty() && endsInConjunct(out.last()) && consonant(piece.codePointAt(0))) out[out.size - 1] = out.last() + piece else out += piece
            start = end
            end = it.next()
        }
        return out
    }

    fun count(text: String): Int = split(text).size

    fun first(text: String): String? = split(text).firstOrNull()
}
