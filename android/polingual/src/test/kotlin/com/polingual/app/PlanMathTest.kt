package com.polingual.app

import java.util.Locale
import kotlin.test.Test
import kotlin.test.assertEquals

class PlanMathTest {
    @Test fun yearlyPriceSplitsIntoMonths() {
        assertEquals("$4.17", PlanMath.perMonth(49_990_000, "USD", Locale.US))
        assertEquals("$0.00", PlanMath.perMonth(0, "USD", Locale.US))
    }

    @Test fun usesProductCurrency() {
        assertEquals("€4.17", PlanMath.perMonth(49_990_000, "EUR", Locale.US))
    }

    @Test fun unknownCurrencyKeepsLocaleCurrency() {
        assertEquals("$1.00", PlanMath.perMonth(12_000_000, "ZZZ", Locale.US))
    }
}
