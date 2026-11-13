package foundation.bucket.app

object CanonLinks {
    fun safe(url: String?): String? {
        val u = url?.trim() ?: return null
        if (u.startsWith("/") && !u.startsWith("//")) return "https://www.bucket.foundation$u"
        val uri = runCatching { java.net.URI(u) }.getOrNull() ?: return null
        return if (uri.scheme == "https" && (uri.host == "www.bucket.foundation" || uri.host == "bucket.foundation")) u else null
    }
}

object Lessons {
    fun plain(md: String): String = md.lines().joinToString("\n") { line ->
        line.replace(Regex("^#{1,6}\\s+"), "").replace(Regex("\\*\\*(.+?)\\*\\*"), "$1").replace(Regex("(?<![\\w*])\\*(\\S[^*]*?)\\*(?![\\w*])"), "$1").replace(Regex("`([^`]+)`"), "$1")
    }
}
