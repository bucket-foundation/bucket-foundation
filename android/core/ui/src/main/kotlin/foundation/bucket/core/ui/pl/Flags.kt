package foundation.bucket.core.ui.pl

class FlagLayer(val kind: Int, val colors: LongArray, val ends: FloatArray)

object FlagLibrary {
    val flags: Map<String, List<FlagLayer>> = mapOf(
        "en" to listOf(FlagLayer(0, longArrayOf(0xFF012169), floatArrayOf(1f)), FlagLayer(1, longArrayOf(0L, 0xFFFFFFFF, 0L), floatArrayOf(0.34f, 0.66f, 1f)), FlagLayer(2, longArrayOf(0L, 0xFFFFFFFF, 0L), floatArrayOf(0.38f, 0.62f, 1f)), FlagLayer(1, longArrayOf(0L, 0xFFC8102E, 0L), floatArrayOf(0.4f, 0.6f, 1f)), FlagLayer(2, longArrayOf(0L, 0xFFC8102E, 0L), floatArrayOf(0.42f, 0.58f, 1f))),
        "es" to listOf(FlagLayer(1, longArrayOf(0xFFAA151B, 0xFFF1BF00, 0xFFAA151B), floatArrayOf(0.25f, 0.75f, 1f))),
        "fr" to listOf(FlagLayer(2, longArrayOf(0xFF002654, 0xFFFFFFFF, 0xFFCE1126), floatArrayOf(0.333f, 0.666f, 1f))),
        "it" to listOf(FlagLayer(2, longArrayOf(0xFF008C45, 0xFFF4F5F0, 0xFFCD212A), floatArrayOf(0.333f, 0.666f, 1f))),
        "pt" to listOf(FlagLayer(2, longArrayOf(0xFF046A38, 0xFFDA291C), floatArrayOf(0.4f, 1f))),
        "de" to listOf(FlagLayer(1, longArrayOf(0xFF000000, 0xFFDD0000, 0xFFFFCE00), floatArrayOf(0.333f, 0.666f, 1f))),
        "nl" to listOf(FlagLayer(1, longArrayOf(0xFFAE1C28, 0xFFFFFFFF, 0xFF21468B), floatArrayOf(0.333f, 0.666f, 1f))),
        "sv" to listOf(FlagLayer(0, longArrayOf(0xFF006AA7), floatArrayOf(1f)), FlagLayer(1, longArrayOf(0L, 0xFFFECC02, 0L), floatArrayOf(0.42f, 0.58f, 1f)), FlagLayer(2, longArrayOf(0L, 0xFFFECC02, 0L), floatArrayOf(0.3f, 0.42f, 1f))),
        "ru" to listOf(FlagLayer(1, longArrayOf(0xFFFFFFFF, 0xFF0039A6, 0xFFD52B1E), floatArrayOf(0.333f, 0.666f, 1f))),
        "ja" to listOf(FlagLayer(4, longArrayOf(0xFFBC002D, 0xFFFFFFFF), floatArrayOf(0.22f, 1f))),
        "ar" to listOf(FlagLayer(1, longArrayOf(0xFFCE1126, 0xFFFFFFFF, 0xFF000000), floatArrayOf(0.333f, 0.666f, 1f))),
        "el" to listOf(FlagLayer(1, longArrayOf(0xFF0D5EAF, 0xFFFFFFFF, 0xFF0D5EAF, 0xFFFFFFFF, 0xFF0D5EAF, 0xFFFFFFFF, 0xFF0D5EAF, 0xFFFFFFFF, 0xFF0D5EAF, 0xFFFFFFFF), floatArrayOf(0.111f, 0.222f, 0.333f, 0.444f, 0.555f, 0.666f, 0.777f, 0.888f, 0.999f, 1f))),
        "fi" to listOf(FlagLayer(0, longArrayOf(0xFFFFFFFF), floatArrayOf(1f)), FlagLayer(1, longArrayOf(0L, 0xFF002F6C, 0L), floatArrayOf(0.42f, 0.58f, 1f)), FlagLayer(2, longArrayOf(0L, 0xFF002F6C, 0L), floatArrayOf(0.3f, 0.42f, 1f))),
        "hi" to listOf(FlagLayer(1, longArrayOf(0xFFFF9933, 0xFFFFFFFF, 0xFF138808), floatArrayOf(0.333f, 0.666f, 1f))),
        "ko" to listOf(FlagLayer(4, longArrayOf(0xFFCD2E3A, 0xFFFFFFFF), floatArrayOf(0.2f, 1f))),
        "pl" to listOf(FlagLayer(1, longArrayOf(0xFFFFFFFF, 0xFFDC143C), floatArrayOf(0.5f, 1f))),
        "zh" to listOf(FlagLayer(0, longArrayOf(0xFFEE1C25), floatArrayOf(1f))),
        "ang" to listOf(FlagLayer(3, longArrayOf(0xFF5B1A4A, 0xFF3A0F2F), floatArrayOf(0.5f, 1f))),
        "cs" to listOf(FlagLayer(1, longArrayOf(0xFFFFFFFF, 0xFFD7141A), floatArrayOf(0.5f, 1f))),
        "fa" to listOf(FlagLayer(1, longArrayOf(0xFF239F40, 0xFFFFFFFF, 0xFFDA0000), floatArrayOf(0.333f, 0.666f, 1f))),
        "grc" to listOf(FlagLayer(3, longArrayOf(0xFF26428B, 0xFF6FB7C2), floatArrayOf(0.5f, 1f))),
        "he" to listOf(FlagLayer(1, longArrayOf(0xFFFFFFFF, 0xFF0038B8, 0xFFFFFFFF, 0xFF0038B8, 0xFFFFFFFF), floatArrayOf(0.14f, 0.26f, 0.74f, 0.86f, 1f))),
        "id" to listOf(FlagLayer(1, longArrayOf(0xFFCE1126, 0xFFFFFFFF), floatArrayOf(0.5f, 1f))),
        "la" to listOf(FlagLayer(3, longArrayOf(0xFF8E2312, 0xFFE9A23B), floatArrayOf(0.5f, 1f))),
        "sa" to listOf(FlagLayer(3, longArrayOf(0xFFE9A23B, 0xFFD9381E), floatArrayOf(0.5f, 1f))),
        "ta" to listOf(FlagLayer(3, longArrayOf(0xFF1E7A5A, 0xFF6FB7C2), floatArrayOf(0.5f, 1f))),
        "th" to listOf(FlagLayer(1, longArrayOf(0xFFA51931, 0xFFF4F5F8, 0xFF2D2A4A, 0xFFF4F5F8, 0xFFA51931), floatArrayOf(0.16f, 0.33f, 0.66f, 0.83f, 1f))),
        "tr" to listOf(FlagLayer(0, longArrayOf(0xFFE30A17), floatArrayOf(1f)), FlagLayer(4, longArrayOf(0xFFFFFFFF, 0L), floatArrayOf(0.2f, 1f))),
        "vi" to listOf(FlagLayer(0, longArrayOf(0xFFDA251D), floatArrayOf(1f))),
        "ur" to listOf(FlagLayer(2, longArrayOf(0xFFFFFFFF, 0xFF01411C), floatArrayOf(0.25f, 1f))),
    )
}
