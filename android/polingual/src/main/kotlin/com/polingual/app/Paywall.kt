package com.polingual.app

import android.app.Activity
import android.content.Intent
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.unit.dp
import androidx.core.net.toUri
import com.android.billingclient.api.ProductDetails
import foundation.bucket.core.ui.D8
import foundation.bucket.core.ui.LocalPalette
import foundation.bucket.core.ui.Pill
import foundation.bucket.core.ui.PlainLink
import foundation.bucket.core.ui.PrimaryButton
import foundation.bucket.core.ui.Type
import kotlinx.coroutines.launch

fun ProductDetails.priceText(): String =
    oneTimePurchaseOfferDetails?.formattedPrice
        ?: subscriptionOfferDetails?.firstOrNull { it.offerId == null }?.pricingPhases?.pricingPhaseList?.lastOrNull()?.formattedPrice
        ?: subscriptionOfferDetails?.firstOrNull()?.pricingPhases?.pricingPhaseList?.lastOrNull()?.formattedPrice
        ?: ""

@Composable
fun PaywallScreen(graph: Graph, back: () -> Unit) {
    val p = LocalPalette.current
    val products by graph.billing.products.collectAsState()
    val access by graph.billing.access.collectAsState()
    val message by graph.billing.message.collectAsState()
    var chosen by remember { mutableStateOf(Plan.YEARLY) }
    val scope = rememberCoroutineScope()
    val context = LocalContext.current
    LaunchedEffect(Unit) { graph.billing.refresh() }
    val days = products.firstOrNull { it.productId == chosen }?.let(graph.billing::trialDays) ?: products.firstNotNullOfOrNull(graph.billing::trialDays)
    Page(back = back) {
        val strings = rememberStrings()
        var student by remember { mutableStateOf(false) }
        Text(PaywallCopy.headline(strings, days), style = Type.display, color = p.ink)
        Text(androidx.compose.ui.res.stringResource(R.string.s_daily_sessions_every_language_set_and), color = p.muted)
        if (access.unlocked) {
            Pill(if (access is Access.Beta) androidx.compose.ui.res.stringResource(R.string.s_free_beta_access) else androidx.compose.ui.res.stringResource(R.string.s_you_have_access), D8.malachite)
            if (access is Access.Beta) Text(androidx.compose.ui.res.stringResource(R.string.s_test_builds_open_everything_for_free), color = p.muted)
        }
        if (products.isEmpty()) Text(androidx.compose.ui.res.stringResource(R.string.s_the_plans_did_not_load_check), color = p.muted)
        products.forEach { product ->
            val on = product.productId == chosen
            Column(
                Modifier.fillMaxWidth().clip(RoundedCornerShape(16.dp)).background(p.card).border(if (on) 3.dp else 1.dp, if (on) D8.vermilion else p.rule, RoundedCornerShape(16.dp))
                    .clickable(role = Role.RadioButton) { chosen = product.productId }.padding(16.dp),
            ) {
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text(androidx.compose.ui.res.stringResource(Plan.title(product.productId)), style = Type.title.copy(fontSize = 17.sp()), color = p.ink)
                    if (product.productId == Plan.YEARLY) Pill(androidx.compose.ui.res.stringResource(R.string.s_best_value), D8.malachite)
                }
                Text(product.priceText(), style = Type.title, color = p.ink)
                Text(androidx.compose.ui.res.stringResource(Plan.per(product.productId)), color = p.muted)
            }
        }
        products.firstOrNull { it.productId == chosen }?.let { product ->
            Text(PaywallCopy.disclosure(strings, graph.billing.trialDays(product), product.priceText(), Plan.period(product.productId), product.productId == Plan.FAMILY), color = p.muted)
            PrimaryButton(PaywallCopy.button(strings, product.productId, graph.billing.trialDays(product), buying = false)) { (context as? Activity)?.let { graph.billing.buy(it, product) } }
        }
        message?.let { Text(it, color = D8.lapis) }
        PlainLink(androidx.compose.ui.res.stringResource(R.string.student_plan)) { student = true }
        if (student) StudentPlanSheet(products.firstOrNull { it.productId == Plan.YEARLY }?.subscriptionOfferDetails?.firstOrNull()?.pricingPhases?.pricingPhaseList?.lastOrNull()?.priceCurrencyCode) { student = false }
        PlainLink(androidx.compose.ui.res.stringResource(R.string.s_restore_purchases)) { scope.launch { graph.billing.restore() } }
        PlainLink(androidx.compose.ui.res.stringResource(R.string.s_manage_subscription)) { context.startActivity(Intent(Intent.ACTION_VIEW, "https://play.google.com/store/account/subscriptions?package=${context.packageName}".toUri())) }
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            PlainLink(androidx.compose.ui.res.stringResource(R.string.s_terms)) { context.startActivity(Intent(Intent.ACTION_VIEW, Plan.TERMS.toUri())) }
            PlainLink(androidx.compose.ui.res.stringResource(R.string.s_privacy)) { context.startActivity(Intent(Intent.ACTION_VIEW, Plan.PRIVACY.toUri())) }
        }
    }
}
