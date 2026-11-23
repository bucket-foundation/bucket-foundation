package com.polingual.app

import android.content.Context
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.glance.GlanceId
import androidx.glance.GlanceModifier
import androidx.glance.Image
import androidx.glance.ImageProvider
import androidx.glance.action.actionStartActivity
import androidx.glance.action.clickable
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.GlanceAppWidgetReceiver
import androidx.glance.appwidget.cornerRadius
import androidx.glance.appwidget.provideContent
import androidx.glance.appwidget.updateAll
import androidx.glance.background
import androidx.glance.color.ColorProvider
import androidx.glance.layout.Alignment
import androidx.glance.layout.Column
import androidx.glance.layout.Row
import androidx.glance.layout.Spacer
import androidx.glance.layout.fillMaxSize
import androidx.glance.layout.padding
import androidx.glance.layout.size
import androidx.glance.layout.width
import androidx.glance.text.FontWeight
import androidx.glance.text.Text
import androidx.glance.text.TextStyle
import foundation.bucket.core.data.PrefsKeyValue

data class WidgetModel(val streak: Int, val freezes: Int, val playedToday: Boolean, val xp: Int)

object WidgetData {
    fun read(context: Context): WidgetModel {
        val kv = PrefsKeyValue(context)
        val day = kv.get(Rewards.STREAK_DAY)
        val freezes = kv.get(Rewards.FREEZES)?.toIntOrNull() ?: 0
        return WidgetModel(
            streak = StreakRules.alive(day, kv.get(Rewards.STREAK)?.toIntOrNull() ?: 0, freezes, today()),
            freezes = freezes,
            playedToday = day == today(),
            xp = kv.get(Rewards.XP)?.toIntOrNull() ?: 0,
        )
    }

    fun line(m: WidgetModel): Int = when {
        m.playedToday -> R.string.w_done_today
        m.streak > 0 -> R.string.w_keep_it
        else -> R.string.w_start
    }
}

class StreakWidget : GlanceAppWidget() {
    override suspend fun provideGlance(context: Context, id: GlanceId) {
        val m = WidgetData.read(context)
        provideContent {
            val parchment = ColorProvider(Color(0xFFF6EEDC), Color(0xFFF6EEDC))
            val ochre = ColorProvider(Color(0xFFE9A23B), Color(0xFFE9A23B))
            Column(
                GlanceModifier.fillMaxSize().background(Color(0xFF5B1A4A)).cornerRadius(24.dp).padding(14.dp).clickable(actionStartActivity<MainActivity>()),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Image(ImageProvider(R.drawable.ic_stat_streak), contentDescription = null, modifier = GlanceModifier.size(26.dp))
                    Spacer(GlanceModifier.width(6.dp))
                    Text("${m.streak}", style = TextStyle(color = ochre, fontSize = 34.sp, fontWeight = FontWeight.Bold))
                }
                Text(context.getString(R.string.d_day_streak_lower), style = TextStyle(color = parchment, fontSize = 13.sp, fontWeight = FontWeight.Bold))
                Text(context.getString(WidgetData.line(m)) + when (m.freezes) { 0 -> ""; 1 -> ", " + context.getString(R.string.w_freeze); else -> ", " + context.getString(R.string.w_freezes, m.freezes) }, style = TextStyle(color = parchment, fontSize = 12.sp))
            }
        }
    }

    companion object {
        suspend fun refresh(context: Context) { runCatching { StreakWidget().updateAll(context) } }
    }
}

class StreakWidgetReceiver : GlanceAppWidgetReceiver() {
    override val glanceAppWidget: GlanceAppWidget = StreakWidget()
}
