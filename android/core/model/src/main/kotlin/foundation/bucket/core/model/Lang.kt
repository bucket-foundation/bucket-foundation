package foundation.bucket.core.model

data class LangInfo(val name: String, val bcp47: String, val latin: Boolean, val rtl: Boolean)

object Lang {
    val codes = listOf("en", "es", "fr", "it", "pt", "de", "nl", "sv", "pl", "fi", "ru", "el", "ar", "hi", "ja", "zh", "ko", "he", "fa", "tr", "cs", "id", "vi", "th", "ta", "la", "grc", "sa", "ang")

    val info: Map<String, LangInfo> = mapOf(
        "en" to LangInfo("English", "en-US", true, false),
        "es" to LangInfo("Spanish", "es-ES", true, false),
        "fr" to LangInfo("French", "fr-FR", true, false),
        "it" to LangInfo("Italian", "it-IT", true, false),
        "pt" to LangInfo("Portuguese", "pt-PT", true, false),
        "de" to LangInfo("German", "de-DE", true, false),
        "nl" to LangInfo("Dutch", "nl-NL", true, false),
        "sv" to LangInfo("Swedish", "sv-SE", true, false),
        "pl" to LangInfo("Polish", "pl-PL", true, false),
        "fi" to LangInfo("Finnish", "fi-FI", true, false),
        "ru" to LangInfo("Russian", "ru-RU", false, false),
        "el" to LangInfo("Greek", "el-GR", false, false),
        "ar" to LangInfo("Arabic", "ar-SA", false, true),
        "hi" to LangInfo("Hindi", "hi-IN", false, false),
        "ja" to LangInfo("Japanese", "ja-JP", false, false),
        "zh" to LangInfo("Mandarin", "zh-CN", false, false),
        "ko" to LangInfo("Korean", "ko-KR", false, false),
        "he" to LangInfo("Hebrew", "he-IL", false, true),
        "fa" to LangInfo("Persian", "fa-IR", false, true),
        "tr" to LangInfo("Turkish", "tr-TR", true, false),
        "cs" to LangInfo("Czech", "cs-CZ", true, false),
        "id" to LangInfo("Indonesian", "id-ID", true, false),
        "vi" to LangInfo("Vietnamese", "vi-VN", true, false),
        "th" to LangInfo("Thai", "th-TH", false, false),
        "ta" to LangInfo("Tamil", "ta-IN", false, false),
        "la" to LangInfo("Latin", "la", true, false),
        "grc" to LangInfo("Ancient Greek", "grc", false, false),
        "sa" to LangInfo("Sanskrit", "sa-IN", false, false),
        "ang" to LangInfo("Old English", "ang", true, false),
    )

    val flags: Map<String, String> = mapOf(
        "en" to "🇬🇧", "es" to "🇪🇸", "fr" to "🇫🇷", "it" to "🇮🇹", "pt" to "🇵🇹", "de" to "🇩🇪", "nl" to "🇳🇱", "sv" to "🇸🇪",
        "pl" to "🇵🇱", "fi" to "🇫🇮", "ru" to "🇷🇺", "el" to "🇬🇷", "ar" to "🇸🇦", "hi" to "🇮🇳", "ja" to "🇯🇵", "zh" to "🇨🇳",
        "ko" to "🇰🇷", "he" to "🇮🇱", "fa" to "🇮🇷", "tr" to "🇹🇷", "cs" to "🇨🇿", "id" to "🇮🇩", "vi" to "🇻🇳", "th" to "🇹🇭",
        "ta" to "🇮🇳", "la" to "🏛", "grc" to "🏺", "sa" to "🪷", "ang" to "🛡",
    )

    data class Preset(val name: String, val targets: List<String>)

    val presets = listOf(
        Preset("Romance", listOf("fr", "es", "it")),
        Preset("East Asian", listOf("zh", "ja")),
        Preset("Germanic", listOf("de", "nl", "sv")),
        Preset("Iberian", listOf("es", "pt")),
    )

    const val MAX_TARGETS = 6

    fun name(code: String) = info[code]?.name ?: code
    fun flag(code: String) = flags[code] ?: "🏳"
    fun isRtl(code: String) = info[code]?.rtl ?: false
    fun bcp47(code: String) = info[code]?.bcp47 ?: code

    fun systemName(root: String, targets: List<String>): String {
        val preset = presets.firstOrNull { it.targets.size == targets.size && it.targets.all(targets::contains) }
        return if (preset != null) "${preset.name} from ${name(root)}" else "${targets.joinToString(" + ") { name(it) }} from ${name(root)}"
    }
}
