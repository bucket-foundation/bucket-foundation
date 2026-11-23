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
import com.polingual.brand.D8
import foundation.bucket.core.ui.LocalPalette
import com.polingual.brand.Pill
import com.polingual.brand.PlainLink
import com.polingual.brand.PrimaryButton
import com.polingual.brand.Type
import com.polingual.brand.chunky
import androidx.compose.foundation.layout.Box
import androidx.compose.ui.Alignment
import kotlinx.coroutines.launch

fun ProductDetails.basePhase() = subscriptionOfferDetails?.firstOrNull { it.offerId == null }?.pricingPhases?.pricingPhaseList?.lastOrNull()
    ?: subscriptionOfferDetails?.firstOrNull()?.pricingPhases?.pricingPhaseList?.lastOrNull()

fun ProductDetails.perMonthText(): String? {
    if (productId != Plan.YEARLY) return null
    val phase = basePhase() ?: return null
    return PlanMath.perMonth(phase.priceAmountMicros, phase.priceCurrencyCode)
}


fun ProductDetails.priceText(): String =
    oneTimePurchaseOfferDetails?.formattedPrice
        ?: subscriptionOfferDetails?.firstOrNull { it.offerId == null }?.pricingPhases?.pricingPhaseList?.lastOrNull()?.formattedPrice
        ?: subscriptionOfferDetails?.firstOrNull()?.pricingPhases?.pricingPhaseList?.lastOrNull()?.formattedPrice
        ?: ""

@Composable
fun PaywallScreen(graph: Graph, back: () -> Unit) {
    androidx.activity.compose.BackHandler(onBack = back)
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
        com.polingual.brand.Hero {
            com.polingual.brand.Label(androidx.compose.ui.res.stringResource(R.string.d_polingual_pro), color = D8.ochre)
            com.polingual.brand.Heading(PaywallCopy.headline(strings, days), color = D8.parchment, size = 34)
            Text(androidx.compose.ui.res.stringResource(R.string.s_daily_sessions_every_language_set_and), style = Type.body, color = D8.parchment.copy(alpha = 0.9f))
        }
        if (access.unlocked) {
            Pill(if (access is Access.Beta) androidx.compose.ui.res.stringResource(R.string.s_free_beta_access) else androidx.compose.ui.res.stringResource(R.string.s_you_have_access), D8.malachite)
            if (access is Access.Beta) Text(androidx.compose.ui.res.stringResource(R.string.s_test_builds_open_everything_for_free), color = p.muted)
        }
        if (products.isEmpty()) Text(androidx.compose.ui.res.stringResource(R.string.s_the_plans_did_not_load_check), color = p.muted)
        products.forEach { product ->
            val on = product.productId == chosen
            Box {
                Column(
                    Modifier.fillMaxWidth().padding(top = 10.dp)
                        .chunky(D8.white, radius = 20.dp, depth = if (on) 4.dp else 0.dp, lip = D8.malachite, border = if (on) D8.malachite else D8.ochre)
                        .clip(RoundedCornerShape(20.dp)).clickable(role = Role.RadioButton) { chosen = product.productId }.padding(16.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                ) {
                    Text(androidx.compose.ui.res.stringResource(Plan.title(product.productId)), style = Type.title.copy(fontSize = 20.sp()), color = D8.tyrian)
                    Text(product.priceText(), style = Type.mono, color = D8.ink)
                    Text(androidx.compose.ui.res.stringResource(Plan.per(product.productId)), style = Type.strong, color = D8.ink2)
                    product.perMonthText()?.let { Text(androidx.compose.ui.res.stringResource(R.string.d_x_a_month, it), style = Type.strong, color = D8.malachite) }
                }
                if (product.productId == Plan.YEARLY) Box(Modifier.align(Alignment.TopCenter)) { Pill(androidx.compose.ui.res.stringResource(R.string.s_best_value), D8.vermilion) }
            }
        }
        products.firstOrNull { it.productId == chosen }?.let { product ->
            Text(PaywallCopy.disclosure(strings, graph.billing.trialDays(product), product.priceText(), Plan.period(product.productId), product.productId == Plan.FAMILY), color = p.muted)
            PrimaryButton(PaywallCopy.button(strings, product.productId, graph.billing.trialDays(product), buying = false)) { (context as? Activity)?.let { graph.billing.buy(it, product) } }
        }
        message?.let { Text(it, color = D8.lapis) }
        PlainLink(androidx.compose.ui.res.stringResource(R.string.d_not_now), Modifier.align(Alignment.CenterHorizontally), onClick = back)
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
