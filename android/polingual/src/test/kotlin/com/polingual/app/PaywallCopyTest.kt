package com.polingual.app

import java.io.File
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

object EnglishStrings : Strings {
    private val names: Map<String, String> = Regex("""<string name="([^"]+)">(.*?)</string>""").findAll(File("src/main/res/values/strings.xml").readText())
        .associate { it.groupValues[1] to it.groupValues[2].replace("\\'", "'").replace("&amp;", "&") }
    private val byId: Map<Int, String> = R.string::class.java.fields.associate { it.getInt(null) to (names[it.name] ?: "") }
    override fun get(id: Int, vararg args: Any) = String.format(byId.getValue(id), *args)
}

class PaywallCopyTest {
    private val s = EnglishStrings

    @Test
    fun headlineMatchesIos() {
        assertEquals("3 days free", PaywallCopy.headline(s, true))
        assertEquals("Keep learning", PaywallCopy.headline(s, false))
    }

    @Test
    fun buttonCopy() {
        assertEquals("Start 3 days free", PaywallCopy.button(s, Plan.YEARLY, trial = true, buying = false))
        assertEquals("Subscribe", PaywallCopy.button(s, Plan.FAMILY, trial = true, buying = false))
        assertEquals("Buy once", PaywallCopy.button(s, Plan.LIFETIME, trial = true, buying = false))
        assertEquals("One moment", PaywallCopy.button(s, Plan.YEARLY, trial = true, buying = true))
    }

    @Test
    fun disclosureShapes() {
        assertTrue(PaywallCopy.disclosure(s, true, "$59.99", "year").startsWith("3 days free, then $59.99 a year. Charged"))
        assertTrue(PaywallCopy.disclosure(s, false, "$9.99", "month").startsWith("$9.99 a month. Charged"))
        assertTrue(PaywallCopy.disclosure(s, false, "$99", "year", family = true).endsWith("family group."))
        assertTrue(PaywallCopy.disclosure(s, false, "$149", "once").startsWith("$149 once."))
    }

    @Test
    fun studentPlan() {
        assertEquals("$29.99 a year", PaywallCopy.studentPrice(s, "USD"))
        assertEquals("Half the yearly price", PaywallCopy.studentPrice(s, "EUR"))
        assertTrue(PaywallCopy.studentMail(s).startsWith("mailto:support@polingual.com?subject=Polingual%20student%20plan&body="))
    }

    @Test
    fun trialReminderOnlyForTrialPurchase() {
        assertEquals(TrialReminder.Action.Schedule, TrialReminder.action(listOf(Plan.YEARLY), Plan.YEARLY))
        assertEquals(TrialReminder.Action.Cancel, TrialReminder.action(listOf(Plan.YEARLY), null))
        assertEquals(TrialReminder.Action.Cancel, TrialReminder.action(listOf(Plan.LIFETIME), Plan.YEARLY))
        assertEquals(3 * ReminderPlan.DAY_MS, PaywallCopy.trialEnd(0))
    }
}
