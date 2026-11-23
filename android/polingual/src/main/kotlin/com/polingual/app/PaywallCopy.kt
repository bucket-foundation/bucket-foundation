package com.polingual.app

import android.content.Intent
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.core.net.toUri
import foundation.bucket.core.ui.LocalPalette
import foundation.bucket.core.ui.PlainLink
import foundation.bucket.core.ui.PrimaryButton
import foundation.bucket.core.ui.Type

fun interface Strings {
    fun get(id: Int, vararg args: Any): String
}

object PaywallCopy {
    const val SUPPORT = "support@polingual.com"
    const val STUDENT_USD = "$29.99"

    fun headline(s: Strings, trial: Boolean) = if (trial) s.get(R.string.paywall_days_free, Plan.TRIAL_DAYS) else s.get(R.string.paywall_keep_learning)

    fun button(s: Strings, productId: String, trial: Boolean, buying: Boolean) = when {
        buying -> s.get(R.string.paywall_one_moment)
        productId == Plan.LIFETIME -> s.get(R.string.paywall_buy_once)
        trial && Plan.hasTrial(productId) -> s.get(R.string.paywall_start_free, Plan.TRIAL_DAYS)
        else -> s.get(R.string.paywall_subscribe)
    }

    fun disclosure(s: Strings, trial: Boolean, price: String, period: String, family: Boolean = false): String {
        if (period == "once") return s.get(R.string.paywall_once, price)
        val per = if (period == "year") s.get(R.string.paywall_a_year, price) else s.get(R.string.paywall_a_month, price)
        val lead = if (trial) s.get(R.string.paywall_trial_then, Plan.TRIAL_DAYS, per) else s.get(R.string.paywall_period, per)
        val share = if (family) " " + s.get(R.string.paywall_family_share) else ""
        return lead + " " + s.get(R.string.paywall_renews) + share
    }

    fun studentPrice(s: Strings, currency: String?) = if (currency == "USD") s.get(R.string.paywall_a_year, STUDENT_USD) else s.get(R.string.student_half)

    fun studentMail(s: Strings) = "mailto:$SUPPORT?subject=${enc(s.get(R.string.student_subject))}&body=${enc(s.get(R.string.student_body))}"

    private fun enc(v: String) = java.net.URLEncoder.encode(v, "UTF-8").replace("+", "%20")

    fun trialEnd(purchasedMs: Long) = purchasedMs + Plan.TRIAL_DAYS * ReminderPlan.DAY_MS
}

object TrialReminder {
    enum class Action { Schedule, Cancel }

    fun action(products: List<String>, trialProduct: String?): Action =
        if (trialProduct != null && trialProduct in products && Plan.hasTrial(trialProduct)) Action.Schedule else Action.Cancel
}

@Composable
fun rememberStrings(): Strings {
    val res = LocalContext.current.resources
    return Strings { id, args -> res.getString(id, *args) }
}

@OptIn(androidx.compose.material3.ExperimentalMaterial3Api::class)
@Composable
fun StudentPlanSheet(currency: String?, close: () -> Unit) {
    val context = LocalContext.current
    val s = rememberStrings()
    val p = LocalPalette.current
    ModalBottomSheet(onDismissRequest = close, containerColor = p.paper) {
        Column(Modifier.padding(24.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
            Text(stringResource(R.string.student_plan), style = Type.display, color = p.ink)
            Text(PaywallCopy.studentPrice(s, currency), style = Type.title, color = p.ink)
            Text(stringResource(R.string.student_how), color = p.muted)
            PrimaryButton(stringResource(R.string.student_email)) { runCatching { context.startActivity(Intent(Intent.ACTION_SENDTO, PaywallCopy.studentMail(s).toUri())) } }
            PlainLink(stringResource(R.string.student_code)) { runCatching { context.startActivity(Intent(Intent.ACTION_VIEW, "https://play.google.com/redeem".toUri())) } }
        }
    }
}
