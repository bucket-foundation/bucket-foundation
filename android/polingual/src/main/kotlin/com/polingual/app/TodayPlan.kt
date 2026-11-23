package com.polingual.app

import androidx.compose.foundation.layout.Row
import androidx.compose.material3.Checkbox
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.pluralStringResource
import androidx.compose.ui.res.stringResource
import androidx.navigation.NavHostController
import foundation.bucket.core.auth.KeyValue
import foundation.bucket.core.model.Lang
import foundation.bucket.core.model.LangSystem
import foundation.bucket.core.ui.Card
import foundation.bucket.core.ui.D8
import foundation.bucket.core.ui.LocalPalette
import foundation.bucket.core.ui.PrimaryButton
import foundation.bucket.core.ui.Type
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import java.time.Duration
import java.time.ZoneId
import java.time.ZonedDateTime

@Serializable
enum class TodayItemKind { @SerialName("system") System, @SerialName("deck") Deck, @SerialName("game") Game, @SerialName("content") Content }

@Serializable
data class TodayItem(val kind: TodayItemKind, val ref: String, val title: String) {
    val id: String get() = "${kind.name.lowercase()}:$ref"
    val activity: TodayActivity? get() = if (kind == TodayItemKind.Content) TodayActivity.parse(ref) else null

    companion object {
        fun of(a: TodayActivity, title: String) = TodayItem(TodayItemKind.Content, a.ref, title)
    }
}

sealed interface TodayActivity {
    data object Listen : TodayActivity
    data object Watch : TodayActivity
    data class Alphabet(val lang: String) : TodayActivity

    val ref: String get() = PREFIX + when (this) { Listen -> "listen"; Watch -> "watch"; is Alphabet -> "alphabet:$lang" }

    companion object {
        const val PREFIX = "activity:"
        fun parse(ref: String): TodayActivity? {
            if (!ref.startsWith(PREFIX)) return null
            val parts = ref.removePrefix(PREFIX).split(":")
            return when {
                parts.size == 1 && parts[0] == "listen" -> Listen
                parts.size == 1 && parts[0] == "watch" -> Watch
                parts.size == 2 && parts[0] == "alphabet" -> Alphabet(parts[1])
                else -> null
            }
        }
    }
}

@Serializable
data class DoneMark(val on: Boolean, val at: Double)

@Serializable
data class TodayPlan(
    val items: List<TodayItem> = emptyList(),
    val customized: Boolean = false,
    val updatedAt: Double = 0.0,
    val doneDay: String? = null,
    val doneAt: Double = 0.0,
    val done: List<String> = emptyList(),
    val marks: Map<String, DoneMark>? = null,
) {
    fun adopt(defaults: List<TodayItem>) = if (customized) this else copy(items = defaults)
    fun contains(id: String) = items.any { it.id == id }
    fun add(item: TodayItem, now: Double) = if (contains(item.id)) this else copy(items = items + item).touch(now)
    fun remove(id: String, now: Double): TodayPlan {
        val m = if (id in done) (marks ?: emptyMap()) + (id to DoneMark(false, now)) else marks
        return copy(items = items.filterNot { it.id == id }, done = done - id, marks = m).touch(now)
    }
    fun order(ids: List<String>, now: Double): TodayPlan {
        val byId = items.associateBy { it.id }
        val seen = LinkedHashSet<String>()
        val listed = ids.mapNotNull { if (seen.add(it)) byId[it] else null }
        return copy(items = listed + items.filterNot { it.id in seen }).touch(now)
    }
    fun move(id: String, toTop: Boolean, now: Double): TodayPlan {
        val item = items.firstOrNull { it.id == id } ?: return this
        val rest = items.filterNot { it.id == id }
        return copy(items = if (toTop) listOf(item) + rest else rest + item).touch(now)
    }
    fun doneToday(day: String) = if (doneDay == day) done else emptyList()
    fun isDone(id: String, day: String) = id in doneToday(day)
    fun setDone(id: String, on: Boolean, day: String, now: Double): TodayPlan {
        val today = doneToday(day).filterNot { it == id } + (if (on) listOf(id) else emptyList())
        val stamped = (if (doneDay == day) marks ?: emptyMap() else emptyMap()) + (id to DoneMark(on, now))
        return copy(done = today, marks = stamped, doneDay = day, doneAt = now)
    }
    private fun touch(now: Double) = copy(customized = true, updatedAt = now)
    fun mark(id: String): DoneMark? = marks?.get(id) ?: if (id in done) DoneMark(true, doneAt) else null

    companion object {
        fun defaults(systems: List<TodayItem>, decks: List<TodayItem>, starter: List<TodayItem>) = (systems + decks).ifEmpty { starter }

        fun merge(a: TodayPlan, b: TodayPlan): TodayPlan {
            val out = if (b.updatedAt > a.updatedAt) b else a
            if (a.doneDay != b.doneDay) {
                val n = if (b.doneAt > a.doneAt) b else a
                return out.copy(doneDay = n.doneDay, doneAt = n.doneAt, done = n.done, marks = n.marks)
            }
            val order = a.done + b.done.filterNot { it in a.done }
            val ids = order.toSet() + a.marks.orEmpty().keys + b.marks.orEmpty().keys
            val winners = ids.mapNotNull { id -> latest(a.mark(id), b.mark(id))?.let { id to it } }.toMap()
            return out.copy(doneDay = a.doneDay, doneAt = maxOf(a.doneAt, b.doneAt), done = order.filter { winners[it]?.on == true }, marks = winners.ifEmpty { null })
        }

        fun latest(a: DoneMark?, b: DoneMark?): DoneMark? {
            if (a == null || b == null) return a ?: b
            if (a.at != b.at) return if (a.at > b.at) a else b
            return if (a.on) a else b
        }
    }
}

data class TimeLeft(val hours: Int, val minutes: Int) {
    companion object {
        fun between(now: ZonedDateTime, end: ZonedDateTime): TimeLeft {
            val total = maxOf(0L, (Duration.between(now, end).seconds + 59) / 60).toInt()
            return TimeLeft(total / 60, total % 60)
        }
    }
}

sealed interface TodayStatus {
    data object Empty : TodayStatus
    data object Start : TodayStatus
    data class Keep(val streak: Int, val left: TimeLeft) : TodayStatus
    data class AtRisk(val streak: Int, val left: TimeLeft) : TodayStatus
    data class Secured(val streak: Int, val itemsLeft: Int) : TodayStatus
    data class Done(val streak: Int) : TodayStatus

    companion object {
        const val RISK_HOUR = 20
        fun evaluate(streak: Int, studiedToday: Boolean, items: Int, itemsLeft: Int, now: ZonedDateTime): TodayStatus {
            if (studiedToday) return if (itemsLeft > 0) Secured(streak, itemsLeft) else Done(streak)
            if (streak == 0) return if (items == 0) Empty else Start
            val left = TimeLeft.between(now, now.toLocalDate().plusDays(1).atStartOfDay(now.zone))
            return if (now.hour >= RISK_HOUR) AtRisk(streak, left) else Keep(streak, left)
        }
    }
}

class TodayPlanStore(private val kv: KeyValue) {
    private val json = Json { ignoreUnknownKeys = true; encodeDefaults = true }
    fun load(): TodayPlan = kv.get(KEY)?.let { runCatching { json.decodeFromString(TodayPlan.serializer(), it) }.getOrNull() } ?: TodayPlan()
    fun save(plan: TodayPlan) = kv.set(KEY, json.encodeToString(TodayPlan.serializer(), plan))

    companion object {
        const val KEY = "today.plan"

        fun defaults(systems: List<LangSystem>): List<TodayItem> {
            val own = systems.map { TodayItem(TodayItemKind.System, it.id, it.name) }
            val letters = systems.flatMap { it.targets }.distinct().filter { Lang.info[it]?.latin == false }
                .map { TodayItem.of(TodayActivity.Alphabet(it), Lang.name(it)) }
            val starter = listOf(TodayItem.of(TodayActivity.Listen, "Listen"), TodayItem.of(TodayActivity.Watch, "Watch"))
            return TodayPlan.defaults(own, emptyList(), starter) + letters
        }
    }
}

@Composable
fun TodayPlanCard(graph: Graph, nav: NavHostController) {
    val app by graph.state.collectAsState()
    val p = LocalPalette.current
    val systems = app?.systems.orEmpty()
    var plan by remember(systems) { mutableStateOf(graph.todayPlan.load().adopt(TodayPlanStore.defaults(systems))) }
    val day = today()
    val study = app?.system?.let { app?.study?.get(it.id) }
    val streak = study?.streak ?: 0
    val left = plan.items.count { !plan.isDone(it.id, day) }
    val status = TodayStatus.evaluate(streak, ReminderPlan.studied(study), plan.items.size, left, ZonedDateTime.now(ZoneId.systemDefault()))
    val next = plan.items.firstOrNull { !plan.isDone(it.id, day) }
    fun open(item: TodayItem) {
        plan = plan.setDone(item.id, true, day, System.currentTimeMillis().toDouble()).also(graph.todayPlan::save)
        val route = when (val a = item.activity) {
            TodayActivity.Listen -> "listen"
            TodayActivity.Watch -> "videos"
            is TodayActivity.Alphabet -> "letters/${a.lang}"
            null -> if (item.kind == TodayItemKind.System) "study" else null
        }
        if (route != null) runCatching { nav.navigate(route) }
    }
    Card {
        Text(statusTitle(status), style = Type.title, color = if (status is TodayStatus.AtRisk) D8.vermilion else p.ink)
        Text(statusDetail(status), color = p.muted)
        if (plan.items.isNotEmpty()) Text(stringResource(R.string.today_progress, plan.items.size - left, plan.items.size), style = Type.caps, color = p.muted)
        plan.items.forEach { item ->
            Row(verticalAlignment = Alignment.CenterVertically) {
                Checkbox(plan.isDone(item.id, day), { on -> plan = plan.setDone(item.id, on, day, System.currentTimeMillis().toDouble()).also(graph.todayPlan::save) })
                Text(item.title, color = p.ink, modifier = Modifier.weight(1f))
            }
        }
        val action = when (status) {
            TodayStatus.Empty -> stringResource(R.string.today_build)
            is TodayStatus.AtRisk -> next?.let { stringResource(R.string.today_save_streak, it.title) }
            is TodayStatus.Done -> null
            else -> next?.let { stringResource(R.string.today_start_item, it.title) }
        }
        if (action != null) PrimaryButton(action) { if (next != null) open(next) else nav.navigate("system/new") }
        val sys = app?.system
        if (sys != null && streak == 0 && sys.targets.none { graph.kv.get("placement.${sys.id}.$it") != null }) {
            foundation.bucket.core.ui.PlainLink(stringResource(R.string.placement_test)) { nav.navigate("placement") }
        }
        sys?.targets?.firstOrNull()?.let { l -> foundation.bucket.core.ui.PlainLink("${stringResource(R.string.sounds)} · ${Lang.name(l)}") { nav.navigate("sounds/$l") } }
    }
}

@Composable
private fun clock(t: TimeLeft) = if (t.hours > 0) stringResource(R.string.today_left_hm, t.hours, t.minutes) else stringResource(R.string.today_left_m, t.minutes)

@Composable
fun statusTitle(s: TodayStatus): String = when (s) {
    TodayStatus.Empty -> stringResource(R.string.today_empty)
    TodayStatus.Start -> stringResource(R.string.today_start)
    is TodayStatus.Keep -> stringResource(R.string.today_keep, s.streak)
    is TodayStatus.AtRisk -> stringResource(R.string.notify_risk_title, s.streak)
    is TodayStatus.Secured -> stringResource(R.string.today_safe, s.streak)
    is TodayStatus.Done -> stringResource(R.string.today_done)
}

@Composable
fun statusDetail(s: TodayStatus): String = when (s) {
    TodayStatus.Empty -> stringResource(R.string.today_empty_detail)
    TodayStatus.Start -> stringResource(R.string.today_start_detail)
    is TodayStatus.Keep -> clock(s.left) + ". " + stringResource(R.string.today_keep_detail)
    is TodayStatus.AtRisk -> clock(s.left) + ". " + stringResource(R.string.notify_risk_body)
    is TodayStatus.Secured -> pluralStringResource(R.plurals.today_items_left, s.itemsLeft, s.itemsLeft)
    is TodayStatus.Done -> if (s.streak > 0) stringResource(R.string.today_done_safe, s.streak) else stringResource(R.string.today_see_you)
}
